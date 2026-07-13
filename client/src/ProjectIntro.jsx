import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./ProjectIntro.module.css";

// 마스코트: 공식 이미지(assets/mascot.png) 확정 전이라 🐱 이모지를 임시로 사용한다.
// 확정 스펙 = 크림색 얼굴 · 주황 귀 · 오른쪽 눈 AI 렌즈 · 남색 앞치마 · 작은 미소.
// 이미지가 확정되면 이모지를 <img>로 교체할 것. (docs/prototype.html과 동일한 규약)

const LAYERS = [
  {
    key: "observe",
    emoji: "📡",
    name: "감지 · Observe",
    desc: "스마트플러그의 전력 패턴과 도어 센서로 기계 상태를 사람 입력 없이 감지해요. 세탁 시작 · 탈수 · 종료, 그리고 수거 여부까지.",
  },
  {
    key: "think",
    emoji: "🧠",
    name: "판단 · Think",
    desc: "세션을 6가지 상태로 관리해요. 종료 후 30분간 수거 신호가 없으면 스스로 방치로 판단합니다.",
  },
  {
    key: "act",
    emoji: "🔔",
    name: "행동 · Act",
    desc: "알림을 신청한 고객에게는 단계적 수거 알림을, 신청하지 않은 경우에는 사장님에게 안내를 보내요.",
  },
];

const WEEKS = [
  { week: "1주차", goal: "기획 · 프로토타입 · Agent 지침", state: "done" },
  { week: "2주차", goal: "모노레포 뼈대 · 전력 곡선 실측 · 화면 3개(mock)", state: "now" },
  { week: "3주차", goal: "상태 머신 · 방치 자동 대응 · Web Push" },
  { week: "4주차", goal: "통합 테스트 · 실매장 검증 · 배포 · 데모" },
];

export default function ProjectIntro() {
  const [openLayer, setOpenLayer] = useState("observe");

  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <span className={styles.badge}>AI Agent Challenge · 소상공인 문제 해결</span>

        <h1 className={styles.title}>
          <span className={styles.mascot} aria-hidden="true">
            🐱
          </span>
          빨래집사
        </h1>
        <p className={styles.tagline}>
          무인빨래방의 방치 세탁물을 스스로 감지하고 대응하는 AI 운영 에이전트
        </p>

        <blockquote className={styles.pitch}>
          “무인매장은 사실 무인이 아니다. 사장님이 원격으로 24시간 일하고 있다.
          <br />그 보이지 않는 노동을 AI 에이전트에게 넘긴다.”
        </blockquote>

        <p>
          세탁이 끝나도 찾아가지 않은 세탁물은 다음 손님의 기계를 막고, 사장님은 CCTV
          확인과 연락을 떠안습니다. 빨래집사는 기계 연동 없이 센서만으로 매장 상태를
          스스로 감지하고, 판단하고, 행동합니다 — 챗봇이 아니라 에이전트인 이유입니다.
        </p>

        <h2 className={styles.sectionTitle}>에이전트 3층 구조 (눌러서 보기)</h2>
        {LAYERS.map((layer) => (
          <div key={layer.key}>
            <button
              type="button"
              className={styles.layerButton}
              aria-expanded={openLayer === layer.key}
              onClick={() => setOpenLayer(layer.key)}
            >
              {layer.emoji} {layer.name}
            </button>
            {openLayer === layer.key && (
              <p className={styles.layerDesc}>{layer.desc}</p>
            )}
          </div>
        ))}

        <h2 className={styles.sectionTitle}>4주 로드맵</h2>
        {WEEKS.map((w) => (
          <div key={w.week} className={styles.weekRow}>
            <span className={styles.weekLabel}>{w.week}</span>
            <span className={styles.weekGoal}>{w.goal}</span>
            {w.state === "done" && <span className={styles.weekDone}>완료</span>}
            {w.state === "now" && <span className={styles.weekNow}>진행 중</span>}
          </div>
        ))}

        <p className={styles.risk}>
          <strong>검증 중인 리스크</strong> — 세탁기 정격 전류가 16A를 넘거나 직결
          배선이면 스마트플러그 방식을 쓸 수 없습니다. 2주차에 명판을 확인해 검증하고,
          막히면 CT 센서로 우회합니다.
        </p>

        <nav className={styles.links}>
          <Link className={styles.link} to="/m/A-1">
            QR 랜딩 화면
          </Link>
          <Link className={styles.link} to="/m/A-1/progress">
            진행 화면
          </Link>
          <Link className={styles.link} to="/owner">
            사장님 대시보드
          </Link>
        </nav>
      </main>
    </div>
  );
}
