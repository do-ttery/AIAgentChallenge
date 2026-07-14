/* mock이 CLAUDE.md의 State Machine · Notification Rule과 어긋나지 않는지 검사한다.
   TypeScript를 쓰지 않기로 했으므로(4주 일정), 계약이 깨지는 걸 막는 건 이 스크립트다.

   실행: npm run check:mocks

   mock을 고치면 반드시 돌린다. 여기서 통과 못 하는 mock은 화면을 거짓말하게 만든다.
   예를 들어 QR 미신청 세션에 완료 알림이 붙어 있으면,
   3주차 "알림 채널 없음 → 사장님 알림" 분기가 mock에서부터 틀린 걸 보여주게 된다. */

import { MACHINES, getMachine } from "./machines.js";
import { RECENT_NOTIFICATIONS, NOTIFICATION_TYPE } from "./notifications.js";

const STATES = ["IDLE", "RUNNING", "SPIN", "DONE", "COLLECTED", "ABANDONED"];
const ENDED_STATES = ["DONE", "COLLECTED", "ABANDONED"];
const ABANDON_AFTER_MIN = 30; // CLAUDE.md — DONE → ABANDONED 타이머

const minutesSince = (iso) => Math.round((Date.now() - new Date(iso)) / 60_000);

const failures = [];
const fail = (message) => failures.push(message);

for (const machine of MACHINES) {
  const { id, status, session, needsAttention, attentionReason } = machine;

  if (!STATES.includes(status)) fail(`${id} — 정의 밖 상태 "${status}"`);
  if (needsAttention !== Boolean(attentionReason)) {
    fail(`${id} — needsAttention과 attentionReason이 따로 논다`);
  }
  if (!session) continue;

  if (session.machineId !== id) fail(`${id} — session.machineId 불일치`);
  if (session.state !== status) fail(`${id} — machine.status와 session.state 불일치`);

  const ended = ENDED_STATES.includes(session.state);
  if (ended && !session.endedAt) fail(`${id} — 종료 상태인데 endedAt이 없다`);
  if (!ended && session.endedAt) fail(`${id} — 진행 중인데 endedAt이 있다`);
  if (minutesSince(session.startedAt) < 0) fail(`${id} — startedAt이 미래다`);
  if (session.endedAt && minutesSince(session.startedAt) < minutesSince(session.endedAt)) {
    fail(`${id} — 종료가 시작보다 빠르다`);
  }

  // 방치 판정은 타이머가 결정한다. 30분이 안 지났는데 ABANDONED거나, 넘겼는데 DONE이면 mock이 틀렸다
  const sinceEnd = session.endedAt ? minutesSince(session.endedAt) : null;
  if (session.state === "ABANDONED" && sinceEnd <= ABANDON_AFTER_MIN) {
    fail(`${id} — ABANDONED인데 종료 후 ${sinceEnd}분밖에 안 됐다`);
  }
  if (session.state === "DONE" && sinceEnd > ABANDON_AFTER_MIN) {
    fail(`${id} — DONE인데 종료 후 ${sinceEnd}분이다. 방치여야 한다`);
  }
}

/* 알림은 세션에 붙는다. 이미 끝난 과거 세션의 알림도 남으므로,
   현재 세션을 참조하는 알림에 대해서만 세션과의 정합성을 본다. */
const currentSessions = new Map(
  MACHINES.filter((machine) => machine.session).map((machine) => [machine.session.id, machine.session]),
);
const machineNames = new Map(MACHINES.map((machine) => [machine.id, machine.name]));

let previousSentAt = Infinity;
for (const notification of RECENT_NOTIFICATIONS) {
  const { id, type, sentAt, machineId, machineName, sessionId, sessionState } = notification;

  if (!Object.values(NOTIFICATION_TYPE).includes(type)) fail(`${id} — 정의 밖 알림 종류 "${type}"`);
  if (!STATES.includes(sessionState)) fail(`${id} — 정의 밖 sessionState "${sessionState}"`);
  if (machineNames.get(machineId) !== machineName) fail(`${id} — machineName이 기계와 다르다`);

  const sentAtMs = new Date(sentAt).getTime();
  if (sentAtMs > previousSentAt) fail(`${id} — sentAt 내림차순이 아니다`);
  previousSentAt = sentAtMs;

  const session = currentSessions.get(sessionId);
  if (!session) continue; // 과거 세션 — 대조할 대상이 없다

  if (sessionState !== session.state) fail(`${id} — sessionState가 실제 세션과 다르다`);
  if (session.subscriberCount === 0 && type !== NOTIFICATION_TYPE.OWNER_ALERT) {
    fail(`${id} — QR 미신청 세션인데 고객 알림(${type})이 붙어 있다`);
  }
  if (type === NOTIFICATION_TYPE.COLLECT_1 && minutesSince(session.endedAt) - minutesSince(sentAt) !== ABANDON_AFTER_MIN) {
    fail(`${id} — 1차 수거 알림이 종료 ${ABANDON_AFTER_MIN}분 시점이 아니다`);
  }
}

if (getMachine(MACHINES[0].id) === null || getMachine("없는-기계") !== null) {
  fail("getMachine이 제대로 동작하지 않는다");
}

if (failures.length > 0) {
  console.error(`mock 검증 실패 ${failures.length}건\n`);
  failures.forEach((message) => console.error(`  ✗ ${message}`));
  process.exit(1);
}

const summary = MACHINES.map((machine) => `${machine.name}=${machine.status}`).join(" · ");
console.log(`mock 검증 통과 — 기계 ${MACHINES.length}대 (${summary}), 알림 ${RECENT_NOTIFICATIONS.length}건`);
