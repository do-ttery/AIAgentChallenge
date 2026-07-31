// 전력 임계값 (T-05, 2026-07-20 CSV 실측으로 확정 — CLAUDE.md State Machine 참고)
export const START_W = 100; // IDLE → RUNNING
export const SPIN_W = 500; // RUNNING → SPIN
export const DONE_W = 20; // SPIN → DONE (이 값 이하)

// 테스트 전용 env로만 재정의 가능한 값들 — 기본값(제품 스펙)은 바꾸지 않는다.
// env가 없으면 실측/제품 결정 그대로의 기본값이 쓰인다. 운영 .env 키 목록
// (CLAUDE.md Environment 섹션)에는 넣지 않는다 — 로컬 셸/배포 환경변수로 그
// 프로세스에만 적용하는 용도.
function testOverrideMinutes(envVarName, defaultMin) {
  const raw = Number(process.env[envVarName]);
  return Number.isFinite(raw) && raw > 0 ? raw : defaultMin;
}
function testOverrideSeconds(envVarName, defaultSec) {
  const raw = Number(process.env[envVarName]);
  return Number.isFinite(raw) && raw > 0 ? raw : defaultSec;
}

// DONE_HOLD_SEC 기본값 60초는 실측(텀블 휴지기 최대 8초 → 안전마진 7배 이상)으로
// 확정된 값이다 (2026-07-31: 부스 데모 진행 속도를 위해 TEST_DONE_HOLD_SEC로만
// 단축 가능하게 열어둠 — 운영 기본값은 그대로 60).
export const DONE_HOLD_SEC = testOverrideSeconds("TEST_DONE_HOLD_SEC", 60); // DONE_W 이하가 이만큼 유지돼야 진짜 종료

// 방치 대응 (T-11) — 2026-07-27 결정: 30분 → 15분으로 단축(제품 결정, CLAUDE.md State Machine 반영)
export const ABANDONED_AFTER_MIN = testOverrideMinutes("TEST_ABANDONED_AFTER_MIN", 15); // DONE 이후 수거 신호 없으면 방치
export const COLLECT_REMINDER_INTERVAL_MIN = testOverrideMinutes("TEST_COLLECT_REMINDER_INTERVAL_MIN", 15); // 1차 이후 2차 알림 간격

// eta 계산 (T-13 조회 API에서 사용)
// 2026-07-31: 부스 데모에서 시뮬레이터 사이클(수십 초)이 35분 코스 기준 eta 대비 너무 짧아
// 고객 화면 진행바가 거의 안 차 보이는 문제(서원 리포트) — TEST_ 로만 단축 가능하게 열어둠.
// 코스(STANDARD_COURSE_MIN) > 범위(ETA_RANGE_MIN) 비율이 깨지면 etaFrom이 과거로 뜨고
// abandonment.js의 출발 알림 타이밍(코스-범위 시점)도 어긋나므로, 두 값은 항상 같은 비율로
// 같이 줄인다 (기본 35:5=7:1, 데모 예시 1.5:0.5도 동일 비율).
export const STANDARD_COURSE_MIN = testOverrideMinutes("TEST_STANDARD_COURSE_MIN", 35);
export const ETA_RANGE_MIN = testOverrideMinutes("TEST_ETA_RANGE_MIN", 5); // etaFrom/etaTo 반폭 — 2026-07-21 결정, 표준 코스(35분) 중심 ±5분

// 대시보드 최근 처리 내역 (T-13 조회 API에서 사용)
export const RECENT_NOTIFICATIONS_LIMIT = 20; // sentAt 내림차순 상위 N개
