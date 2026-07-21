// 전력 임계값 (T-05, 2026-07-20 CSV 실측으로 확정 — CLAUDE.md State Machine 참고)
export const START_W = 100; // IDLE → RUNNING
export const SPIN_W = 500; // RUNNING → SPIN
export const DONE_W = 20; // SPIN → DONE (이 값 이하)
export const DONE_HOLD_SEC = 60; // DONE_W 이하가 이만큼 유지돼야 진짜 종료

// 방치 대응 (T-11)
export const ABANDONED_AFTER_MIN = 30; // DONE 이후 수거 신호 없으면 방치
export const COLLECT_REMINDER_INTERVAL_MIN = 30; // 1차 이후 2차 알림 간격

// eta 계산 (T-13 조회 API에서 사용)
export const STANDARD_COURSE_MIN = 35;
export const ETA_RANGE_MIN = 5; // etaFrom/etaTo 반폭 — 2026-07-21 결정, 표준 코스(35분) 중심 ±5분

// 대시보드 최근 처리 내역 (T-13 조회 API에서 사용)
export const RECENT_NOTIFICATIONS_LIMIT = 20; // sentAt 내림차순 상위 N개
