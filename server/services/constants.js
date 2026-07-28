// 전력 임계값 (T-05, 2026-07-20 CSV 실측으로 확정 — CLAUDE.md State Machine 참고)
export const START_W = 100; // IDLE → RUNNING
export const SPIN_W = 500; // RUNNING → SPIN
export const DONE_W = 20; // SPIN → DONE (이 값 이하)
export const DONE_HOLD_SEC = 60; // DONE_W 이하가 이만큼 유지돼야 진짜 종료

// 방치 대응 (T-11) — 2026-07-27 결정: 30분 → 15분으로 단축(제품 결정, CLAUDE.md State Machine 반영)
// 기본값은 15분/15분이다. T-22 수동 통합 테스트에서 이 15분(+2차 15분)을 실제로 매번
// 기다리기 어려워, 서버 프로세스를 띄울 때만 쓰는 테스트 전용 env로 재정의할 수 있게
// 열어둔다 — env가 없으면 아래 15 리터럴이 그대로 쓰인다(제품 기본값 15는 바꾸지 않는다).
// 운영 .env 키 목록(CLAUDE.md Environment 섹션)에는 넣지 않는다 — 로컬 셸에서 한 번 export
// 하고 그 프로세스에만 적용하는 용도.
function testOverrideMinutes(envVarName, defaultMin) {
  const raw = Number(process.env[envVarName]);
  return Number.isFinite(raw) && raw > 0 ? raw : defaultMin;
}

export const ABANDONED_AFTER_MIN = testOverrideMinutes("TEST_ABANDONED_AFTER_MIN", 15); // DONE 이후 수거 신호 없으면 방치
export const COLLECT_REMINDER_INTERVAL_MIN = testOverrideMinutes("TEST_COLLECT_REMINDER_INTERVAL_MIN", 15); // 1차 이후 2차 알림 간격

// eta 계산 (T-13 조회 API에서 사용)
export const STANDARD_COURSE_MIN = 35;
export const ETA_RANGE_MIN = 5; // etaFrom/etaTo 반폭 — 2026-07-21 결정, 표준 코스(35분) 중심 ±5분

// 대시보드 최근 처리 내역 (T-13 조회 API에서 사용)
export const RECENT_NOTIFICATIONS_LIMIT = 20; // sentAt 내림차순 상위 N개
