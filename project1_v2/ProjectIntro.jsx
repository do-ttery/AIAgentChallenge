import { useState } from "react";

// 프로젝트 소개 컴포넌트 — "안개 (Fog)"
// 외부 라이브러리 없이 React만 사용. 스타일은 인라인.

const MODULES = [
  { name: "App.jsx", fog: false },
  { name: "api/client.js", fog: true },
  { name: "auth/login.py", fog: true },
  { name: "components/Map.jsx", fog: false },
  { name: "utils/parser.py", fog: true },
  { name: "hooks/useRepo.js", fog: true },
  { name: "db/models.py", fog: true },
  { name: "styles.css", fog: false },
];

const STATS = [
  {
    value: "42%",
    label: "개발자가 커밋하는 코드의 42%가 AI 보조로 생성 — 그런데 96%는 AI 코드를 완전히 신뢰하지 않는다",
    source: "Sonar, State of Code 2026 (개발자 1,100명)",
    url: "https://www.sonarsource.com/blog/state-of-code-developer-survey-report-the-current-reality-of-ai-coding/",
  },
  {
    value: "59%",
    label: "개발자 59%가 이해하지 못한 AI 코드를 그대로 사용",
    source: "Clutch 설문 2025.06 (전문가 800명)",
    url: "https://clutch.co/resources/devs-use-ai-generated-code-they-dont-understand",
  },
  {
    value: "-17%",
    label: "AI 보조를 받은 개발자는 자기 코드 이해도 퀴즈에서 17% 낮은 점수 (무작위 대조 실험)",
    source: "Anthropic Research, 2026.02",
    url: "https://www.anthropic.com/research/AI-assistance-coding-skills",
  },
];

const LOOP = [
  { step: "감지", desc: "AI 코딩 도구의 세션 로그와 git 이력을 읽어, AI가 썼지만 내가 접촉한 적 없는 코드를 찾아낸다" },
  { step: "지도", desc: "레포를 모듈 지도로 그리고, 이해하지 못한 영역을 안개로 표시한다" },
  { step: "탐험", desc: "안개를 클릭하면 3분 설명 세션·퀴즈로 걷어낸다. 지도가 밝아지는 게 보인다" },
];

export default function ProjectIntro() {
  const [revealed, setRevealed] = useState(() => MODULES.map((m) => !m.fog));

  const clearFog = (i) => {
    setRevealed((prev) => prev.map((r, idx) => (idx === i ? true : r)));
  };

  const clearedCount = revealed.filter(Boolean).length;
  const percent = Math.round((clearedCount / MODULES.length) * 100);
  const allClear = clearedCount === MODULES.length;

  return (
    <div style={styles.page}>
      <p style={styles.badge}>AI-Agent-Challenge · 최서원</p>
      <h1 style={styles.title}>내 코드의 fog of war를 걷어내는 에이전트</h1>
      <p style={styles.lead}>
        AI는 코드를 빠르게 만들어주지만, 화면이 작동하는 순간 우리는 이해를 건너뛴다.
        에러는 빨간 줄로 표시되지만, <b>이해하지 못함은 초록 화면 뒤에 숨는다.</b> 업계는
        이것을 comprehension debt(이해 부채)라 부른다. 나는 안개라 부르고, 걷어낼 수 있게
        만든다.
      </p>

      <div style={styles.statRow}>
        {STATS.map((s) => (
          <div key={s.value} style={styles.statCard}>
            <div style={styles.statValue}>{s.value}</div>
            <div style={styles.statLabel}>{s.label}</div>
            <a href={s.url} target="_blank" rel="noreferrer" style={styles.statSource}>
              {s.source} ↗
            </a>
          </div>
        ))}
      </div>

      <h2 style={styles.h2}>직접 걷어내 보세요</h2>
      <p style={styles.hint}>
        아래는 어느 바이브 코더의 프로젝트 지도입니다. 안개 낀 모듈(❓)은 AI가 썼지만 주인이
        한 번도 열어보지 않은 코드 — 클릭해서 안개를 걷어내 보세요.
      </p>

      <div style={styles.mapGrid}>
        {MODULES.map((m, i) =>
          revealed[i] ? (
            <div key={m.name} style={styles.tileClear}>
              <span style={styles.tileCheck}>✓</span>
              <span style={styles.tileName}>{m.name}</span>
            </div>
          ) : (
            <button key={m.name} style={styles.tileFog} onClick={() => clearFog(i)}>
              <span style={styles.tileQ}>❓</span>
              <span style={styles.tileNameFog}>{"█".repeat(Math.min(m.name.length, 10))}</span>
            </button>
          )
        )}
      </div>

      <div style={styles.progressWrap}>
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${percent}%` }} />
        </div>
        <p style={styles.progressText}>
          {allClear
            ? "안개 0% — 이 프로젝트는 온전히 당신의 것입니다."
            : `이 프로젝트의 ${100 - percent}%가 아직 안개 속입니다.`}
        </p>
      </div>

      <h2 style={styles.h2}>에이전트의 핵심 루프</h2>
      <div style={styles.loopRow}>
        {LOOP.map((l, i) => (
          <div key={l.step} style={styles.loopCard}>
            <div style={styles.loopStep}>
              {i + 1}. {l.step}
            </div>
            <div style={styles.loopDesc}>{l.desc}</div>
          </div>
        ))}
      </div>

      <p style={styles.footer}>
        설계 원칙: 사용자의 성실함에 기대지 않는다. 에이전트가 먼저 개입하고, 탐험 비용을
        3분 이내로 만든다. 죄책감이 아니라 호기심으로 매일 열게 한다.
      </p>
    </div>
  );
}

const styles = {
  page: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "40px 24px",
    fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
    color: "#1a1f2e",
    lineHeight: 1.7,
  },
  badge: {
    fontSize: 13,
    color: "#6b7280",
    letterSpacing: "0.05em",
    margin: 0,
  },
  title: { fontSize: 32, fontWeight: 700, margin: "8px 0 4px" },
  titleSub: { fontSize: 18, fontWeight: 500, color: "#6b7280" },
  lead: { fontSize: 16, color: "#374151", margin: "16px 0 28px" },
  statRow: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 36 },
  statCard: {
    flex: "1 1 180px",
    background: "#f3f4f6",
    borderRadius: 12,
    padding: "16px 18px",
  },
  statValue: { fontSize: 26, fontWeight: 700, color: "#1d4ed8" },
  statLabel: { fontSize: 13, color: "#4b5563", marginTop: 4 },
  statSource: {
    display: "inline-block",
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 8,
    textDecoration: "none",
  },
  h2: { fontSize: 20, fontWeight: 600, margin: "8px 0 4px" },
  hint: { fontSize: 14, color: "#6b7280", margin: "0 0 16px" },
  mapGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: 10,
    marginBottom: 16,
  },
  tileClear: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "14px 12px",
    borderRadius: 10,
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    fontSize: 13,
  },
  tileFog: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "14px 12px",
    borderRadius: 10,
    background: "#e5e7eb",
    border: "1px dashed #9ca3af",
    fontSize: 13,
    cursor: "pointer",
    textAlign: "left",
  },
  tileCheck: { color: "#059669", fontWeight: 700 },
  tileQ: { fontSize: 14 },
  tileName: { fontFamily: "monospace", fontSize: 12, color: "#065f46" },
  tileNameFog: { fontFamily: "monospace", fontSize: 12, color: "#9ca3af", letterSpacing: 1 },
  progressWrap: { marginBottom: 36 },
  progressBar: {
    height: 10,
    borderRadius: 5,
    background: "#e5e7eb",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 5,
    background: "#1d4ed8",
    transition: "width 0.5s ease",
  },
  progressText: { fontSize: 14, color: "#374151", marginTop: 8 },
  loopRow: { display: "flex", gap: 12, flexWrap: "wrap", margin: "12px 0 28px" },
  loopCard: {
    flex: "1 1 200px",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "16px 18px",
  },
  loopStep: { fontSize: 15, fontWeight: 600, color: "#1d4ed8" },
  loopDesc: { fontSize: 13, color: "#4b5563", marginTop: 6 },
  footer: {
    fontSize: 13,
    color: "#6b7280",
    borderTop: "1px solid #e5e7eb",
    paddingTop: 16,
  },
};
