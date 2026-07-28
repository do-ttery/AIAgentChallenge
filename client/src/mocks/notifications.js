/* T-13 조회 API 응답 형태 그대로의 mock — 대시보드 "최근 처리 내역".

   GET /api/notifications/recent → RECENT_NOTIFICATIONS (sentAt 내림차순)

   notification 테이블(sessionId, type, sentAt)에 화면이 쓸 조인 필드
   (machineName, sessionState) 두 개를 얹은 형태다.
   "자동 해결 / 자동 안내" 같은 표시 문구는 저장하지 않는다 — type과 sessionState로 화면이 판단한다.
   (예: COLLECT_1을 보냈고 sessionState가 COLLECTED면 "자동 해결")

   기계의 "확인 필요"는 알림이 아니라 machine.needsAttention 플래그다. 여기 들어오지 않는다.

   알림은 세션에 붙는다. 기계의 현재 세션뿐 아니라 이미 끝난 과거 세션(s-099, s-100)의 알림도 남는다.
   machines.js의 세션과 시각이 맞물려 있으므로 한쪽만 고치면 이야기가 깨진다.
   - s-103(세탁기 3)은 subscriberCount가 0이라 고객 알림이 없고 OWNER_ALERT만 있다
   - COLLECT_1은 종료 15분 뒤에만 찍힌다 (방치 판정 시각, 2026-07-27 30분 → 15분) */

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();

/* 알림 5종 — CLAUDE.md Notification Rule */
export const NOTIFICATION_TYPE = {
  DEPARTURE: "DEPARTURE", // 출발 (종료 임박)
  COMPLETED: "COMPLETED", // 완료
  COLLECT_1: "COLLECT_1", // 1차 수거
  COLLECT_2: "COLLECT_2", // 2차 수거
  OWNER_ALERT: "OWNER_ALERT", // 사장님 알림
};

export const RECENT_NOTIFICATIONS = [
  {
    id: "n-205",
    sessionId: "s-102",
    machineId: "m2",
    machineName: "세탁기 2",
    sessionState: "DONE",
    type: NOTIFICATION_TYPE.COMPLETED,
    sentAt: minutesAgo(12),
  },
  {
    id: "n-206",
    sessionId: "s-103",
    machineId: "m3",
    machineName: "세탁기 3",
    sessionState: "ABANDONED",
    type: NOTIFICATION_TYPE.OWNER_ALERT,
    sentAt: minutesAgo(17), // 종료(32분 전) + 방치 15분. QR 미신청이라 사장님에게만 갔다
  },
  {
    id: "n-204",
    sessionId: "s-102",
    machineId: "m2",
    machineName: "세탁기 2",
    sessionState: "DONE",
    type: NOTIFICATION_TYPE.DEPARTURE,
    sentAt: minutesAgo(22),
  },
  {
    id: "n-203",
    sessionId: "s-100", // 세탁기 1의 직전 세션 (지금은 새 세션이 돌고 있다)
    machineId: "m1",
    machineName: "세탁기 1",
    sessionState: "COLLECTED",
    type: NOTIFICATION_TYPE.COLLECT_1,
    sentAt: minutesAgo(55), // 종료(70분 전) + 방치 15분 → 이후 도어 열림으로 수거 확인
  },
  {
    id: "n-202",
    sessionId: "s-100",
    machineId: "m1",
    machineName: "세탁기 1",
    sessionState: "COLLECTED",
    type: NOTIFICATION_TYPE.COMPLETED,
    sentAt: minutesAgo(70),
  },
  {
    id: "n-201",
    sessionId: "s-099", // 세탁기 4의 직전 세션 (지금은 대기 중)
    machineId: "m4",
    machineName: "세탁기 4",
    sessionState: "COLLECTED",
    type: NOTIFICATION_TYPE.COMPLETED,
    sentAt: minutesAgo(118),
  },
];
