import styles from "./StatusBadge.module.css";

/* 상태 → 이름·색 매핑은 여기 한 곳에만 둔다.
   화면마다 따로 색을 칠하면 고객 화면에 빨강이 새어 들어가는 사고가 난다.

   6상태 — CLAUDE.md State Machine. 여기 없는 상태는 존재하지 않는다.
   색은 UI Rule의 고정 상태색(tokens.css의 --state-*)을 그대로 쓴다.

   COLLECTED에는 지정된 상태색이 없어 완료색(#4CAF50)을 함께 쓴다.
   이미 끝난 세션이라 시선을 끌 필요가 없으므로 점만 옅게 처리해 완료와 구분한다.

   라벨은 보는 사람에 따라 다르다. ABANDONED를 고객에게 "방치"라고 부르면 비난이 된다
   (CLAUDE.md Notification Rule). 그래서 audience의 기본값을 "customer"로 둔다 —
   깜빡하고 안 넘겨도 고객 화면에 비난 문구가 새지 않는 쪽이 안전하다. */
const STATUS = {
  IDLE: { label: "대기", tone: "idle" },
  RUNNING: { label: "세탁 중", tone: "running", live: true },
  SPIN: { label: "탈수", tone: "spin", live: true },
  DONE: { label: "완료", tone: "done" },
  COLLECTED: { label: "수거 완료", tone: "collected" },
  ABANDONED: { label: "수거 대기", ownerLabel: "방치", tone: "abandoned" },
};

/* status   — 6상태 중 하나
   detail   — 배지 안에 덧붙일 짧은 수치. "방치" + "32분" → "방치 32분"
   audience — "customer"(기본) | "owner". 사장님 화면에서만 운영 용어를 쓴다
   onDark   — 진한 배경(랜딩 히어로) 위에 얹을 때. 상태색 대신 흰색으로 뒤집는다
   solid    — 상태색으로 꽉 채운다. 카드 배경을 칠하는 대신 배지 하나를 진하게 쓰는 방식.
              배경을 칠하면 그 위 글씨의 대비가 깎여 읽기 어려워진다 */
export default function StatusBadge({
  status,
  detail,
  audience = "customer",
  onDark = false,
  solid = false,
}) {
  const meta = STATUS[status];
  if (!meta) return null; // 정의되지 않은 상태는 무시한다 (CLAUDE.md State Machine)

  const label = audience === "owner" && meta.ownerLabel ? meta.ownerLabel : meta.label;
  const tone = onDark ? styles.onDark : styles[meta.tone];

  return (
    <span className={`${styles.badge} ${tone} ${solid ? styles.solid : ""}`}>
      <span className={`${styles.dot} ${meta.live ? styles.live : ""}`} />
      {label}
      {detail && <span className={styles.detail}>{detail}</span>}
    </span>
  );
}
