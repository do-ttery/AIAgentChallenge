// 알림 5종 문구 (T-12)
// CLAUDE.md Notification Rule: 고객 비난 금지, 시간은 점이 아니라 범위로.
// 여기 문구는 payload.title/body로 그대로 Web Push에 실린다 (client Service Worker가 T-18에서 렌더링).
//
// DEPARTURE/COMPLETED는 이번 T-12에서 실제 트리거를 연결하지 않는다 (README/작업 요약 참고).
// 문구만 미리 정해 두고, eta(etaFrom/etaTo)가 준비되면 T-13 이후 stateMachine.js에서 그대로 재사용한다.

export function buildNotificationPayload(type, { etaFrom, etaTo, machineName } = {}) {
  switch (type) {
    case "DEPARTURE":
      return {
        title: "빨래집사 — 곧 끝나요",
        body:
          etaFrom && etaTo
            ? `${machineName ?? "세탁물"}이 ${etaFrom}~${etaTo}쯤 끝날 예정이에요.`
            : "세탁이 곧 끝날 예정이에요.",
      };
    case "COMPLETED":
      return {
        title: "빨래집사 — 세탁 완료",
        body: `${machineName ?? "세탁물"} 세탁이 끝났어요. 찾아가 주세요.`,
      };
    case "COLLECT_1":
      return {
        title: "빨래집사 — 찾아가 주세요",
        body: `${machineName ?? "세탁물"}이 다 됐는데 아직 찾아가지 않으셨어요. 편하실 때 들러주세요.`,
      };
    case "COLLECT_2":
      return {
        title: "빨래집사 — 아직 기다리고 있어요",
        body: `찾아가지 않은 세탁물이 있어요. 다른 손님이 기다릴 수 있으니 가능하면 빨리 찾아가 주세요.`,
      };
    case "OWNER_ALERT":
      return {
        title: "빨래집사 — 사장님 확인 필요",
        body: `${machineName ?? "세탁기"}에 오래 찾아가지 않은 세탁물이 있어요. 알림 채널이 없는 고객이에요.`,
      };
    default:
      return { title: "빨래집사", body: "알림이 도착했어요." };
  }
}
