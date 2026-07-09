import { useState } from "react";

// 무인 빨래방 AI 점장 에이전트 — 프로젝트 주제 소개 컴포넌트
// 사용법: <ProjectIntro />  (React 외 의존성 없음, 인라인 스타일)

const LAYERS = [
  {
    key: "sense",
    emoji: "📡",
    name: "감각 · 센서 레이어",
    desc: "스마트플러그 전력 패턴 + 도어 센서로 기계 상태를 사람 입력 없이 감지해요. 세탁 시작 / 탈수 / 종료, 그리고 방치 여부까지.",
  },
  {
    key: "think",
    emoji: "🧠",
    name: "판단 · 에이전트 레이어",
    desc: "코스 분류와 종료 시각 예측, 방치 판정과 단계적 대응, 고객 문의 시 전력 데이터 대조 후 처리. 애매한 건만 사장님께 에스컬레이션해요.",
  },
  {
    key: "act",
    emoji: "🔔",
    name: "행동 · 인터페이스 레이어",
    desc: "고객에게는 QR 기반 '지금 출발하세요' 푸시, 사장님에게는 처리 결과 보고와 일일 운영 리포트를 보내요.",
  },
];

const WEEKS = [
  { week: "1주차", goal: "스마트플러그 로깅 + 전력 곡선 검증" },
  { week: "2주차", goal: "상태 감지 상태머신 + QR 알림 플로우" },
  { week: "3주차", goal: "방치 대응 · 고객 문의 처리 에이전트" },
  { week: "4주차", goal: "실제 매장 배포 + 데모 데이 준비" },
];

const styles = {
  card: {
    maxWidth: 720,
    margin: "40px auto",
    padding: "36px 32px",
    borderRadius: 16,
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
    fontFamily:
      "'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
    color: "#1f2937",
    lineHeight: 1.6,
  },
  badge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#4338ca",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: 800, margin: "0 0 8px" },
  pitch: {
    fontSize: 16,
    color: "#4b5563",
    borderLeft: "4px solid #6366f1",
    paddingLeft: 14,
    margin: "16px 0 28px",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#6b7280",
    letterSpacing: "0.08em",
    margin: "28px 0 12px",
  },
  layerButton: (active) => ({
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "12px 14px",
    marginBottom: 8,
    borderRadius: 10,
    border: active ? "1px solid #6366f1" : "1px solid #e5e7eb",
    background: active ? "#eef2ff" : "#fafafa",
    cursor: "pointer",
    fontSize: 15,
    fontWeight: 600,
    color: "#1f2937",
  }),
  layerDesc: {
    padding: "4px 14px 14px",
    fontSize: 14,
    color: "#4b5563",
  },
  weekRow: {
    display: "flex",
    gap: 12,
    padding: "10px 0",
    borderBottom: "1px dashed #e5e7eb",
    fontSize: 14,
  },
  weekLabel: { minWidth: 56, fontWeight: 700, color: "#6366f1" },
  risk: {
    marginTop: 24,
    padding: "14px 16px",
    borderRadius: 10,
    background: "#fff7ed",
    border: "1px solid #fdba74",
    fontSize: 14,
    color: "#7c2d12",
  },
};

export default function ProjectIntro() {
  const [openLayer, setOpenLayer] = useState("sense");

  return (
    <div style={styles.card}>
      <span style={styles.badge}>AI Agent Challenge · 소상공인 문제 해결</span>

      <h1 style={styles.title}>무인 빨래방 AI 점장 에이전트</h1>

      <p style={styles.pitch}>
        “무인매장은 사실 무인이 아니다. 사장님이 원격으로 24시간 일하고 있다.
        <br />
        그 보이지 않는 노동을 AI 에이전트에게 넘긴다.”
      </p>

      <p>
        고객은 빨래가 언제 끝나는지 몰라 세탁물을 방치하고, 사장님은 문의 전화와
        CCTV 확인, 환불 처리를 떠안습니다. 이 에이전트는 기계 연동 없이 센서만으로
        매장 상태를 스스로 감지하고, 판단하고, 행동합니다 — 챗봇이 아니라
        에이전트인 이유입니다.
      </p>

      <h2 style={styles.sectionTitle}>에이전트 3층 구조 (눌러서 보기)</h2>
      {LAYERS.map((layer) => (
        <div key={layer.key}>
          <button
            style={styles.layerButton(openLayer === layer.key)}
            onClick={() => setOpenLayer(layer.key)}
          >
            {layer.emoji} {layer.name}
          </button>
          {openLayer === layer.key && (
            <p style={styles.layerDesc}>{layer.desc}</p>
          )}
        </div>
      ))}

      <h2 style={styles.sectionTitle}>4주 로드맵</h2>
      {WEEKS.map((w) => (
        <div key={w.week} style={styles.weekRow}>
          <span style={styles.weekLabel}>{w.week}</span>
          <span>{w.goal}</span>
        </div>
      ))}

      <div style={styles.risk}>
        <strong>⚠️ 검증 중인 리스크:</strong> 세탁기 정격 전류가 16A를 넘거나
        직결 배선이면 플러그 방식이 불가 → 이번 주 명판 확인으로 검증, 막히면
        CT 센서로 우회합니다.
      </div>
    </div>
  );
}
