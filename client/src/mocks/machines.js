/* T-13 조회 API 응답 형태 그대로의 mock.
   T-17에서 이 파일의 import를 fetch로 갈아끼우면 끝나야 한다.
   화면에서 이 구조를 변형해 쓰지 말 것 — 변형하는 순간 교체가 안 된다.

   GET /api/machines      → MACHINES
   GET /api/machines/:id  → getMachine(id)

   machine.plugId / doorSensorId는 센서 매핑용 내부 컬럼이라 응답에 담지 않는다.
   진행률·경과 시간·방치 경과 분은 startedAt / endedAt / etaTo에서 화면이 계산한다.

   실제 매장 세탁기는 4대다. 한 기계는 한 순간에 한 상태이므로 이 스냅샷에 6상태가 다 나오지는 않는다.
   방치 분기 두 갈래가 다 보이는 장면으로 잡았다 — 알림 있음(세탁기 2) / 알림 없음(세탁기 3).
   SPIN · COLLECTED 배지는 진행 화면·랜딩에서 확인한다. */

const minutesAgo = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();
const minutesLater = (minutes) => new Date(Date.now() + minutes * 60_000).toISOString();

export const MACHINES = [
  {
    id: "m1",
    name: "세탁기 1",
    status: "RUNNING",
    needsAttention: false,
    attentionReason: null,
    session: {
      id: "s-101",
      machineId: "m1",
      startedAt: minutesAgo(28),
      endedAt: null,
      state: "RUNNING",
      etaFrom: minutesLater(12),
      etaTo: minutesLater(22),
      subscriberCount: 1,
    },
  },
  {
    id: "m2",
    name: "세탁기 2",
    status: "DONE",
    needsAttention: false,
    attentionReason: null,
    session: {
      id: "s-102",
      machineId: "m2",
      startedAt: minutesAgo(64),
      endedAt: minutesAgo(12),
      state: "DONE",
      etaFrom: minutesAgo(17),
      etaTo: minutesAgo(7),
      subscriberCount: 1,
    },
  },
  {
    id: "m3",
    name: "세탁기 3",
    status: "ABANDONED",
    needsAttention: false,
    attentionReason: null,
    session: {
      id: "s-103",
      machineId: "m3",
      startedAt: minutesAgo(85),
      endedAt: minutesAgo(32),
      state: "ABANDONED",
      etaFrom: minutesAgo(37),
      etaTo: minutesAgo(27),
      subscriberCount: 0, // QR 미신청 — 알림 채널 없음 → 사장님 알림 + 랜딩 방치 안내 모드
    },
  },
  {
    id: "m4",
    name: "세탁기 4",
    status: "IDLE",
    needsAttention: true,
    attentionReason: "전력 패턴 이상 — 사이클 중단 의심",
    session: null,
  },
];

export function getMachine(machineId) {
  return MACHINES.find((machine) => machine.id === machineId) ?? null;
}
