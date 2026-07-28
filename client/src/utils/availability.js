/* T-27 고객용 매장 현황이 쓰는 판단 함수.
   IDLE만 "사용 가능"이다 — DONE·ABANDONED는 세탁물이 안에 있어 자리가 비지 않았다
   (CLAUDE.md State Machine: DONE→COLLECTED에서만 machine.status가 IDLE로 리셋된다). */
export function getMachineAvailability(machine) {
  if (machine?.status === "IDLE") return { available: true, freeAt: null };
  return { available: false, freeAt: machine?.session?.etaTo ?? null };
}
