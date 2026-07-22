import { getDb } from "./db.js";
import { START_W, SPIN_W, DONE_W, DONE_HOLD_SEC } from "./constants.js";
import { scheduleAbandonCheck, cancelAbandonTimers, recordNotification } from "./abandonment.js";

// 상태 머신 (T-10)
// POST /ingest/:machineId 로 들어온 이벤트 하나를 6상태 전이 규칙에 따라 처리한다.
// CLAUDE.md State Machine 섹션이 유일한 근거다 — 여기 없는 전이는 만들지 않는다.
//
// SPIN → DONE(20W 이하 60초 유지)만 "지속" 판정이 필요하다. 세션 하나가 이 서버
// 프로세스 안에서만 진행되므로(재시작 시 리셋), machineId별 진입 시각을 메모리에 둔다.
const doneCandidateSince = new Map(); // machineId -> epoch ms | undefined

function log(machineId, from, to, reason) {
  console.log(`[stateMachine] ${machineId} ${from} → ${to} (${reason})`);
}

async function getMachine(db, machineId) {
  const { data, error } = await db
    .from("machine")
    .select("id, status")
    .eq("id", machineId)
    .single();
  if (error) throw new Error(`[stateMachine] machine 조회 실패: ${error.message}`);
  return data;
}

// machine.status가 그 기계의 현재 국면을 이미 말해주므로, ended_at으로 거르지 않고
// 가장 최근 세션 하나만 가져온다. DONE 세션은 종료(ended_at)됐지만 수거 대기 중이라
// door_open·소급 처리 핸들러가 여전히 이 세션을 찾아야 한다.
async function getLatestSession(db, machineId) {
  const { data, error } = await db
    .from("session")
    .select("id, state, started_at")
    .eq("machine_id", machineId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`[stateMachine] session 조회 실패: ${error.message}`);
  return data;
}

async function setMachineStatus(db, machineId, status) {
  const { error } = await db.from("machine").update({ status }).eq("id", machineId);
  if (error) throw new Error(`[stateMachine] machine 갱신 실패: ${error.message}`);
}

async function createSession(db, machineId, state, startedAt) {
  const { data, error } = await db
    .from("session")
    .insert({ machine_id: machineId, started_at: startedAt, state })
    .select("id")
    .single();
  if (error) throw new Error(`[stateMachine] session 생성 실패: ${error.message}`);
  return data;
}

async function updateSessionState(db, sessionId, state, endedAt = undefined) {
  const patch = { state };
  if (endedAt !== undefined) patch.ended_at = endedAt;
  const { error } = await db.from("session").update(patch).eq("id", sessionId);
  if (error) throw new Error(`[stateMachine] session 갱신 실패: ${error.message}`);
}

async function insertReading(db, machineId, ts, type, value) {
  const { error } = await db
    .from("reading")
    .insert({ machine_id: machineId, ts, type, value: value ?? null });
  if (error) throw new Error(`[stateMachine] reading 기록 실패: ${error.message}`);
}

// SPIN → DONE 후보 타이머. 20W 이하가 아니면 리셋(휴지기였을 뿐 종료 아님).
function trackDoneHold(machineId, isBelowDoneW, now) {
  if (!isBelowDoneW) {
    doneCandidateSince.delete(machineId);
    return false;
  }
  const since = doneCandidateSince.get(machineId);
  if (since === undefined) {
    doneCandidateSince.set(machineId, now);
    return false;
  }
  return (now - since) / 1000 >= DONE_HOLD_SEC;
}

async function handleWatt(db, machine, session, machineId, value, now) {
  const status = machine.status;

  if (status === "IDLE" && value >= START_W) {
    const startedAt = new Date(now).toISOString();
    const newSession = await createSession(db, machineId, "RUNNING", startedAt);
    await setMachineStatus(db, machineId, "RUNNING");
    log(machineId, "IDLE", "RUNNING", `${value}W ≥ ${START_W}W`);
    return { transitioned: true, sessionId: newSession.id };
  }

  if (status === "RUNNING" && value >= SPIN_W) {
    await updateSessionState(db, session.id, "SPIN");
    await setMachineStatus(db, machineId, "SPIN");
    log(machineId, "RUNNING", "SPIN", `${value}W ≥ ${SPIN_W}W`);
    // 2026-07-22: DEPARTURE("곧 끝나요") 트리거 연결. 정확한 종료 시각은 몰라도
    // 마지막 탈수 시작이 코스 막바지라, 이 시점을 "슬슬 출발하세요" 신호로 쓴다
    // (LandingPage 구독 완료 문구가 이미 이렇게 약속하고 있었음 — 그동안 실제로는
    // 안 보내던 부분).
    recordNotification(db, session.id, "DEPARTURE", machineId).catch((err) => {
      console.error(`[stateMachine] session ${session.id} DEPARTURE 알림 실패:`, err.message);
    });
    return { transitioned: true };
  }

  if (status === "SPIN") {
    const shouldFinish = trackDoneHold(machineId, value <= DONE_W, now);
    if (shouldFinish) {
      const endedAt = new Date(now).toISOString();
      await updateSessionState(db, session.id, "DONE", endedAt);
      await setMachineStatus(db, machineId, "DONE");
      doneCandidateSince.delete(machineId);
      log(machineId, "SPIN", "DONE", `${DONE_W}W 이하가 ${DONE_HOLD_SEC}초 유지`);
      // DONE → ABANDONED는 시간 기반 전이라(T-11) 방치 타이머를 여기서 건다.
      scheduleAbandonCheck(machineId, session.id, now);
      // 2026-07-22: COMPLETED 알림 트리거 연결(T-12 작업 요약에 "트리거 미연결"로
      // 남아있던 부분). 구독자가 없으면 recordNotification 내부에서 기록만 하고
      // 조용히 끝난다 — 방치 알림(OWNER_ALERT)과 달리 구독 없다고 사장님에게 갈 필요는 없다.
      recordNotification(db, session.id, "COMPLETED", machineId).catch((err) => {
        console.error(`[stateMachine] session ${session.id} COMPLETED 알림 실패:`, err.message);
      });
      return { transitioned: true };
    }
    return { transitioned: false };
  }

  if (status === "DONE" && value >= START_W) {
    // 동일 기계 다음 세탁 시작 — 이전 세션을 소급으로 수거 처리한다.
    await updateSessionState(db, session.id, "COLLECTED");
    cancelAbandonTimers(session.id);
    log(machineId, "DONE", "COLLECTED", "다음 세탁 시작 감지(소급 처리)");

    const startedAt = new Date(now).toISOString();
    const newSession = await createSession(db, machineId, "RUNNING", startedAt);
    await setMachineStatus(db, machineId, "RUNNING");
    log(machineId, "IDLE", "RUNNING", `${value}W ≥ ${START_W}W (다음 세탁)`);
    return { transitioned: true, sessionId: newSession.id };
  }

  // COLLECTED/ABANDONED 상태에서 온 watt는 어떤 전이표에도 없다 — 무시하되 기록.
  if (status === "COLLECTED" || status === "ABANDONED") {
    log(machineId, status, status, `watt(${value}W) 무시(정의된 전이 없음)`);
    return { transitioned: false };
  }

  // 그 외(IDLE 대기 전력, RUNNING 중 임계값 미만 등)는 정상 진행 중 샘플이라
  // 매 폴링(5초)마다 로그를 남기면 스팸이 되므로 기록하지 않는다.
  return { transitioned: false };
}

async function handleDoorOpen(db, machine, session, machineId) {
  const status = machine.status;

  // RUNNING/SPIN 중 door_open은 탈수 진동 오탐 방어를 위해 무시한다.
  if (status !== "DONE" && status !== "ABANDONED") {
    log(machineId, status, status, "door_open 무시(수거 대상 상태 아님)");
    return { transitioned: false };
  }

  if (!session) {
    log(machineId, status, status, "door_open 무시(활성 세션 없음)");
    return { transitioned: false };
  }

  await updateSessionState(db, session.id, "COLLECTED");
  await setMachineStatus(db, machineId, "IDLE");
  cancelAbandonTimers(session.id);
  log(machineId, status, "COLLECTED", "door_open");
  return { transitioned: true };
}

// POST /ingest/:machineId 이벤트 하나를 처리한다.
// reading 기록은 상태 판정과 무관하게 항상 남긴다 (Data Model: reading = 전력·도어 이벤트 로그).
export async function handleIngestEvent(machineId, type, value) {
  const db = getDb();
  const now = Date.now();
  const ts = new Date(now).toISOString();

  await insertReading(db, machineId, ts, type, value);

  const machine = await getMachine(db, machineId);
  const session = await getLatestSession(db, machineId);

  if (type === "watt") {
    return handleWatt(db, machine, session, machineId, value, now);
  }

  if (type === "door_open") {
    return handleDoorOpen(db, machine, session, machineId);
  }

  // door_close: 전이 규칙 없음 — 기록만 하고 무시.
  log(machineId, machine.status, machine.status, "door_close 무시(정의된 전이 없음)");
  return { transitioned: false };
}
