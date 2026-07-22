// 알림 5종 문구 (T-12)
// CLAUDE.md Notification Rule: 고객 비난 금지, 시간은 점이 아니라 범위로.
// 여기 문구는 payload.title/body로 그대로 Web Push에 실린다 (client Service Worker가 T-18에서 렌더링).
//
// COMPLETED는 2026-07-22 stateMachine.js(SPIN→DONE)에 트리거 연결 완료.
// DEPARTURE("곧 끝나요")도 연결 완료 — 처음엔 SPIN 진입(탈수 감지) 시점에 걸었으나,
// 실기기 확인 결과 표준 코스는 탈수 스파이크가 4번(헹굼 3회 + 최종탈수)이라 첫 탈수는
// 코스 초반이었다. 몇 번째 탈수인지 상태머신이 구분 못 해(SPIN→RUNNING 역전이 없음),
// abandonment.js의 scheduleDepartureAlert가 eta 계산(STANDARD_COURSE_MIN - ETA_RANGE_MIN)
// 기반 타이머로 대신 건다.
//
// 2026-07-22 추가: payload.url — 알림을 탭했을 때 sw.js가 이동시킬 주소. 이게 없으면
// 알림 탭 시 항상 사이트 루트("/")로만 가서 손님이 자기 세탁기 화면을 다시 못 찾는
// 딥링크 문제가 있었다(실기기 테스트로 발견). 고객용 알림은 그 기계 화면으로, 사장님
// 알림은 대시보드로 보낸다.

export function buildNotificationPayload(type, { etaFrom, etaTo, machineName, machineId } = {}) {
  const machineUrl = machineId ? `/m/${machineId}` : undefined;

  switch (type) {
    case "DEPARTURE":
      return {
        title: "빨래집사 — 곧 끝나요",
        body:
          etaFrom && etaTo
            ? `${machineName ?? "세탁물"}이 ${etaFrom}~${etaTo}쯤 끝날 예정이에요.`
            : "세탁이 곧 끝날 예정이에요.",
        url: machineUrl,
      };
    case "COMPLETED":
      return {
        title: "빨래집사 — 세탁 완료",
        body: `${machineName ?? "세탁물"} 세탁이 끝났어요. 찾아가 주세요.`,
        url: machineUrl,
      };
    case "COLLECT_1":
      return {
        title: "빨래집사 — 찾아가 주세요",
        body: `${machineName ?? "세탁물"}이 다 됐는데 아직 찾아가지 않으셨어요. 편하실 때 들러주세요.`,
        url: machineUrl,
      };
    case "COLLECT_2":
      return {
        title: "빨래집사 — 아직 기다리고 있어요",
        body: `찾아가지 않은 세탁물이 있어요. 다른 손님이 기다릴 수 있으니 가능하면 빨리 찾아가 주세요.`,
        url: machineUrl,
      };
    case "OWNER_ALERT":
      return {
        title: "빨래집사 — 사장님 확인 필요",
        body: `${machineName ?? "세탁기"}에 오래 찾아가지 않은 세탁물이 있어요. 알림 채널이 없는 고객이에요.`,
        url: "/owner",
      };
    default:
      return { title: "빨래집사", body: "알림이 도착했어요." };
  }
}
