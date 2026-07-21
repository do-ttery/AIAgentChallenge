import { getDb } from "./db.js";
import { ABANDONED_AFTER_MIN, COLLECT_REMINDER_INTERVAL_MIN } from "./constants.js";
import { sendPush } from "./push.js";
import { buildNotificationPayload } from "./notificationMessages.js";

// 방치 자동 대응 (T-11)
// CLAUDE.md State Machine 섹션: DONE → ABANDONED는 "종료 후 30분 수거 신호 없음"이라는
// 시간 기반 전이라, ingest 이벤트가 들어올 때만 도는 stateMachine.js와 달리 별도의
// 타이머 메커니즘이 필요하다. 세션 하나가 이 서버 프로세스 안에서만 진행된다는 전제는
// stateMachine.js의 doneCandidateSince와 동일하므로, 여기서도 setTimeout을 메모리에
// 들고 있는 방식을 그대로 따른다 (재시작 시 리셋되는 제약도 동일).
const MIN_MS = 60 * 1000;

const abandonTimers = new Map(); // sessionId -> Timeout (DONE → ABANDONED 판정)
const reminderTimers = new Map(); // sessionId -> Timeout (1차 → 2차 수거 알림)

function log(sessionId, message) {
  console.log(`[abandonment] session ${sessionId} ${message}`);
}

// DONE 진입 시 호출한다 (stateMachine.js SPIN→DONE). doneAt은 DONE 전이 시각(epoch ms).
// 이미 이 세션에 타이머가 있으면(있을 수 없지만 방어적으로) 먼저 취소하고 새로 건다.
export function scheduleAbandonCheck(machineId, sessionId, doneAt = Date.now()) {
  clearAbandonTimer(sessionId);

  const elapsed = Date.now() - doneAt;
  const delay = Math.max(ABANDONED_AFTER_MIN * MIN_MS - elapsed, 0);

  const timer = setTimeout(() => {
    abandonTimers.delete(sessionId);
    handleAbandonTimeout(machineId, sessionId).catch((err) => {
      console.error(`[abandonment] session ${sessionId} 방치 판정 처리 실패:`, err.message);
    });
  }, delay);

  abandonTimers.set(sessionId, timer);
  log(sessionId, `${ABANDONED_AFTER_MIN}분 방치 타이머 시작 (지연 ${Math.round(delay / 1000)}s)`);
}

// DONE→COLLECTED가 먼저 일어나면(도어 열림·다음 세탁 시작·고객 탭) 방치 타이머와
// 2차 수거 알림 타이머를 모두 취소한다. stateMachine.js가 COLLECTED로 전이시키는
// 모든 경로(handleDoorOpen, 소급 처리)에서 호출한다.
export function cancelAbandonTimers(sessionId) {
  const hadAbandon = clearAbandonTimer(sessionId);
  const hadReminder = clearReminderTimer(sessionId);
  if (hadAbandon || hadReminder) {
    log(sessionId, "방치 관련 타이머 취소(수거 확인)");
  }
}

function clearAbandonTimer(sessionId) {
  const timer = abandonTimers.get(sessionId);
  if (!timer) return false;
  clearTimeout(timer);
  abandonTimers.delete(sessionId);
  return true;
}

function clearReminderTimer(sessionId) {
  const timer = reminderTimers.get(sessionId);
  if (!timer) return false;
  clearTimeout(timer);
  reminderTimers.delete(sessionId);
  return true;
}

async function getSessionState(db, sessionId) {
  const { data, error } = await db.from("session").select("id, state").eq("id", sessionId).maybeSingle();
  if (error) throw new Error(`[abandonment] session 조회 실패: ${error.message}`);
  return data;
}

async function hasNotificationChannel(db, sessionId) {
  const { data, error } = await db
    .from("subscription")
    .select("id")
    .eq("session_id", sessionId)
    .limit(1);
  if (error) throw new Error(`[abandonment] subscription 조회 실패: ${error.message}`);
  return Boolean(data && data.length > 0);
}

// 같은 세션에 같은 종류의 알림은 1회만 (notification 테이블로 중복 방지, CLAUDE.md Notification Rule).
async function notificationAlreadySent(db, sessionId, type) {
  const { data, error } = await db
    .from("notification")
    .select("id")
    .eq("session_id", sessionId)
    .eq("type", type)
    .limit(1);
  if (error) throw new Error(`[abandonment] notification 조회 실패: ${error.message}`);
  return Boolean(data && data.length > 0);
}

async function getSubscriptions(db, sessionId) {
  const { data, error } = await db
    .from("subscription")
    .select("id, endpoint, keys")
    .eq("session_id", sessionId);
  if (error) throw new Error(`[abandonment] subscription 조회 실패: ${error.message}`);
  return data ?? [];
}

// session_id IS NULL인 row = 사장님(매장) 구독 (2026-07-21 결정, CLAUDE.md Data Model 참고).
async function getOwnerSubscriptions(db) {
  const { data, error } = await db.from("subscription").select("id, endpoint, keys").is("session_id", null);
  if (error) throw new Error(`[abandonment] 사장님 subscription 조회 실패: ${error.message}`);
  return data ?? [];
}

async function getMachineName(db, machineId) {
  const { data, error } = await db.from("machine").select("name").eq("id", machineId).maybeSingle();
  if (error) {
    log(machineId, `machine 이름 조회 실패(${error.message}) — 문구에서 생략`);
    return undefined;
  }
  return data?.name;
}

// notification 테이블에 기록하고(중복이면 건너뜀), 기록에 성공한 경우에만 실제 Web Push를
// 발송한다. OWNER_ALERT는 정의상 그 세션에 subscription이 없을 때만 발생하므로(hasNotificationChannel
// === false), 세션 구독 대신 session_id IS NULL인 사장님(매장) 구독으로 발송한다(2026-07-21 결정).
// 발송 실패는 sendPush 내부에서 로그만 남기고 여기로 예외를 던지지 않는다 — 상태 머신 흐름을
// 막지 않기 위함(CLAUDE.md 지시).
async function recordNotification(db, sessionId, type, machineId) {
  if (await notificationAlreadySent(db, sessionId, type)) {
    log(sessionId, `${type} 알림 중복 방지(이미 발송됨) — 건너뜀`);
    return false;
  }
  const { error } = await db.from("notification").insert({ session_id: sessionId, type });
  if (error) throw new Error(`[abandonment] notification 기록 실패: ${error.message}`);
  log(sessionId, `${type} 알림 기록`);

  const subscriptions = type === "OWNER_ALERT" ? await getOwnerSubscriptions(db) : await getSubscriptions(db, sessionId);
  if (subscriptions.length === 0) {
    log(sessionId, `${type} 발송 대상 subscription 없음 — 기록만 남김`);
    return true;
  }

  const machineName = machineId ? await getMachineName(db, machineId) : undefined;
  const payload = buildNotificationPayload(type, { machineName });

  for (const sub of subscriptions) {
    const ok = await sendPush(sub, payload);
    log(sessionId, `${type} 발송 ${ok ? "성공" : "실패"} → subscription ${sub.id}`);
  }

  return true;
}

// 30분 타이머 만료 시 실행. 그 사이 이미 수거(COLLECTED)됐으면 취소된 타이머라
// 여기까지 오지 않는 게 정상이지만, 방어적으로 한 번 더 현재 상태를 확인한다.
async function handleAbandonTimeout(machineId, sessionId) {
  const db = getDb();
  const session = await getSessionState(db, sessionId);

  if (!session || session.state !== "DONE") {
    log(sessionId, `방치 판정 취소(현재 state=${session?.state ?? "없음"}, 이미 수거됨)`);
    return;
  }

  const { error: sessionErr } = await db.from("session").update({ state: "ABANDONED" }).eq("id", sessionId);
  if (sessionErr) throw new Error(`[abandonment] session ABANDONED 갱신 실패: ${sessionErr.message}`);

  const { error: machineErr } = await db.from("machine").update({ status: "ABANDONED" }).eq("id", machineId);
  if (machineErr) throw new Error(`[abandonment] machine ABANDONED 갱신 실패: ${machineErr.message}`);

  log(sessionId, `DONE → ABANDONED (${ABANDONED_AFTER_MIN}분 수거 신호 없음)`);

  // 방치 후 분기: 알림 채널 있음 → 1차 수거 알림(→ 2차 예약). 없음 → 사장님 알림.
  // (QR 랜딩 방치 안내 모드 전환은 화면 쪽 책임이라 서버는 여기서 관여하지 않는다.)
  const channelAvailable = await hasNotificationChannel(db, sessionId);

  if (channelAvailable) {
    await recordNotification(db, sessionId, "COLLECT_1", machineId);
    log(sessionId, "알림 채널 있음 → 1차 수거 알림");
    scheduleSecondReminder(machineId, sessionId, Date.now());
  } else {
    // OWNER_ALERT는 이 세션에 subscription이 없을 때만 발생한다(hasNotificationChannel === false).
    // recordNotification은 이 타입일 때 session_id IS NULL인 사장님(매장) 구독으로 push를 보낸다
    // (2026-07-21 결정 — subscription.session_id를 nullable로 바꿔 사장님 채널을 저장할 자리를 만들었다).
    // 사장님이 실제로 이 채널을 구독하는 UI(대시보드에서 알림 받기 버튼 등)는 client/ 쪽 범위다.
    // 그 전까지는 대시보드 조회(GET /api/notifications/recent, T-13)가 보조 경로로 남는다.
    await recordNotification(db, sessionId, "OWNER_ALERT", machineId);
    log(sessionId, "알림 채널 없음 → 사장님 알림 (QR 랜딩 방치 안내 모드 전환은 화면 책임)");
  }
}

// 1차 수거 알림 이후 +30분에도 여전히 ABANDONED면 2차 수거 알림을 남긴다.
function scheduleSecondReminder(machineId, sessionId, firstReminderAt = Date.now()) {
  clearReminderTimer(sessionId);

  const elapsed = Date.now() - firstReminderAt;
  const delay = Math.max(COLLECT_REMINDER_INTERVAL_MIN * MIN_MS - elapsed, 0);

  const timer = setTimeout(() => {
    reminderTimers.delete(sessionId);
    handleSecondReminder(machineId, sessionId).catch((err) => {
      console.error(`[abandonment] session ${sessionId} 2차 수거 알림 처리 실패:`, err.message);
    });
  }, delay);

  reminderTimers.set(sessionId, timer);
  log(sessionId, `${COLLECT_REMINDER_INTERVAL_MIN}분 후 2차 수거 알림 예약`);
}

async function handleSecondReminder(machineId, sessionId) {
  const db = getDb();
  const session = await getSessionState(db, sessionId);

  if (!session || session.state !== "ABANDONED") {
    log(sessionId, `2차 수거 알림 취소(현재 state=${session?.state ?? "없음"}, 이미 수거됨)`);
    return;
  }

  await recordNotification(db, sessionId, "COLLECT_2", machineId);
  log(sessionId, "2차 수거 알림 처리 완료");
}
