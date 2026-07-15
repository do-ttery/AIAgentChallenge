import { useState } from "react";
import { useParams } from "react-router-dom";
import { getMachine } from "../../mocks/machines.js";
import StatusBadge from "../../components/StatusBadge.jsx";
import { formatElapsed, formatRange, formatTime, progressPercent } from "../../utils/time.js";
import styles from "./LandingPage.module.css";

/* T-14 + T-15 — 고객 화면. QR을 찍으면 열리는 단 하나의 화면이다.
   T-17에서 getMachine을 fetch로 바꾸고 5초 폴링을 붙인다.

   고객은 QR을 한 번 찍는다. 신청도 여기서, 진행 확인도 여기서, 수거 확인도 여기서 한다.
   페이지를 옮겨 다니게 하지 않는다 — 화면은 하나고, 상태에 따라 내용이 갈린다.

   지켜야 할 것 (CLAUDE.md UI Rule · 빨래집사 Design Skill):
   - 빨강 금지 (방치 포함). 비난하는 인상을 주면 안 된다
   - "방치"라는 단어를 고객에게 쓰지 않는다 — "찾아가지 않은 세탁물"
   - 정보는 1가지(내 세탁 상태)만 크게
   - 종료 예상은 점이 아니라 범위로
   - Primary Action은 화면당 1개

   진행 단계는 상태 머신에 있는 것만 그린다.
   프로토타입에는 "헹굼"이 있었지만 상태 머신에 없는 단계다 —
   전력으로 감지하지 않는 단계를 화면에 그리면 채울 방법이 없다.

   알림 신청 여부는 지금 이 브라우저의 상태다. 실제 구독(Web Push)은 T-18에서 붙인다. */

const STEPS = [
  { state: "RUNNING", label: "세탁" },
  { state: "SPIN", label: "탈수" },
  { state: "DONE", label: "완료" },
];

const RUNNING_STATES = ["RUNNING", "SPIN"];

function stepIndex(status) {
  if (status === "RUNNING") return 0;
  if (status === "SPIN") return 1;
  return 2; // 끝난 세션(DONE·COLLECTED·ABANDONED)은 전부 마지막 단계다
}

export default function LandingPage() {
  const { machineId } = useParams();
  const machine = getMachine(machineId);
  const [subscribed, setSubscribed] = useState(false);

  if (!machine) {
    return (
      <Shell>
        <div className={styles.card}>
          <h1 className={styles.cardTitle}>기계를 찾지 못했어요</h1>
          <p className={styles.sub}>QR을 다시 찍어 주세요. 계속 안 되면 사장님께 알려 주세요.</p>
        </div>
      </Shell>
    );
  }

  const { name, status, session } = machine;
  const isRunning = RUNNING_STATES.includes(status);

  /* 알림을 신청한 사람이 없는 채로 찾아가지 않은 세탁물 — 이 QR을 찍은 사람은 다음 손님이다.
     CLAUDE.md: 알림 채널 없음 → 사장님 알림 + QR 랜딩 방치 안내 모드 전환 */
  if (status === "ABANDONED" && session.subscriberCount === 0) {
    return (
      <Shell>
        <NextCustomerGuide machine={machine} />
      </Shell>
    );
  }

  return (
    <Shell>
      <section className={styles.hero}>
        <p className={styles.machineNo}>
          MACHINE {machineId.replace(/\D/g, "").padStart(2, "0")}
        </p>
        <div className={styles.heroTop}>
          <h1 className={styles.machineName}>{name}</h1>
          <StatusBadge status={status} onDark />
        </div>
        {session && isRunning && (
          <p className={styles.detect}>
            집사가 전력 데이터로 세탁 시작을 감지했어요 ({formatTime(session.startedAt)})
          </p>
        )}
      </section>

      {status === "IDLE" && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>지금은 돌고 있는 세탁이 없어요</h2>
          <p className={styles.sub}>
            세탁을 시작하면 집사가 자동으로 감지해요. 그때 이 QR을 다시 찍으면 알림을 신청할 수
            있어요.
          </p>
        </div>
      )}

      {isRunning && (
        <>
          <Progress session={session} status={status} />
          {subscribed ? (
            <p className={`${styles.tile} ${styles.tileOn}`}>
              <span className={styles.tileIcon}>🔔</span>
              <span>
                <b>알림 신청 완료</b> — 마지막 탈수가 감지되면 "지금 출발하세요" 알림을, 끝나면 완료
                알림을 보내드릴게요.
              </span>
            </p>
          ) : (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>세탁 알림 받기</h2>
              <p className={styles.sub}>
                출발할 시점과 완료 시점에 알려드려요. 연락처 입력도, 앱 설치도 없어요.
              </p>
              <button
                type="button"
                className={styles.button}
                onClick={() => setSubscribed(true)}
              >
                이 세탁기 알림 신청
              </button>
              <p className={styles.fineprint}>
                신청하지 않아도 이 화면에서 진행 상황은 계속 볼 수 있어요. 다만 완료·수거 알림은
                보내드릴 수 없어요.
              </p>
            </div>
          )}
          <ButlerTip>
            세탁이 끝나고 오래 찾아가지 않으면, 집사가 대신 챙기고 사장님께 알려요.
          </ButlerTip>
        </>
      )}

      {(status === "DONE" || status === "ABANDONED") && (
        <Finished
          name={name}
          session={session}
          waiting={status === "ABANDONED"}
          subscribed={session.subscriberCount > 0}
        />
      )}

      {status === "COLLECTED" && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>수거가 확인됐어요</h2>
          <p className={styles.sub}>
            {formatTime(session.endedAt)}에 세탁이 끝났고, 문이 열린 걸 확인했어요. 이용해 주셔서
            고마워요.
          </p>
        </div>
      )}
    </Shell>
  );
}

/* 진행 — 종료 예상(범위)과 단계. 이 화면에서 가장 크게 읽혀야 하는 정보다 */
function Progress({ session, status }) {
  const current = stepIndex(status);

  return (
    <section className={styles.card}>
      <div className={styles.eta}>
        <p className={styles.etaLabel}>종료 예상</p>
        {/* 시간은 점이 아니라 범위로 알려준다. 점으로 띄우면 약속처럼 읽힌다 */}
        <p className={styles.etaRange}>{formatRange(session.etaFrom, session.etaTo)}</p>
        <p className={styles.etaNote}>진행되면서 범위가 점점 좁혀져요</p>
      </div>

      <div className={styles.bar}>
        <div
          className={styles.barFill}
          style={{ width: `${progressPercent(session.startedAt, session.etaTo)}%` }}
        />
      </div>

      <ol className={styles.steps}>
        {STEPS.map((step, index) => (
          <li
            key={step.state}
            className={`${styles.step} ${index <= current ? styles.stepDone : ""}`}
          >
            <span className={styles.stepDot} />
            {step.label}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* 완료 · 수거 대기. waiting이면 30분을 넘긴 상태지만 문구는 똑같이 비난하지 않는다.

   subscribed(subscriberCount > 0)로 한 번 더 갈린다 — "미신청" 상태(T-14의 3번 상태).
   알림 채널이 없으면 "수거 안내를 보내드려요"라는 약속을 할 수 없다 (CLAUDE.md:
   알림 채널 없음 → 사장님 알림 + QR 랜딩 방치 안내 모드 전환). 못 지킬 약속 대신
   지금 바로 찾아가 달라고 안내한다. waiting(=ABANDONED)일 때는 subscriberCount 0이면
   이 컴포넌트 대신 NextCustomerGuide로 빠지므로 그 조합은 실제로는 나타나지 않는다. */
function Finished({ name, session, waiting, subscribed }) {
  const tileText = waiting
    ? "다음 손님을 위해 세탁물을 찾아가 주세요. 오래 두면 집사가 사장님께 보관을 부탁드려요."
    : subscribed
      ? "30분이 지나면 다음 손님을 위해 수거 안내를 한 번 더 보내드려요."
      : "지금은 알림을 보내드릴 방법이 없어요. 잊지 말고 빨리 찾아가 주세요 — 오래 걸리면 사장님께 도움을 요청드릴게요.";

  return (
    <>
      <div className={styles.card}>
        <div className={styles.doneHero}>
          <span className={styles.doneIcon}>🧺</span>
          <h2 className={styles.doneTitle}>세탁이 끝났어요</h2>
          <p className={styles.sub}>
            {name} · {formatTime(session.endedAt)} 종료
          </p>
          <span className={styles.waitChip}>{formatElapsed(session.endedAt)}째 기다리는 중</span>
        </div>

        <button type="button" className={styles.button}>
          수거했어요
        </button>
        <p className={styles.fineprint}>
          문이 열리면 자동으로 확인되니, 버튼은 안 눌러도 괜찮아요.
        </p>
      </div>

      <p className={`${styles.tile} ${waiting || !subscribed ? styles.tileWarn : ""}`}>
        <span className={styles.tileIcon}>{waiting ? "🧺" : subscribed ? "⏱️" : "🔕"}</span>
        <span>{tileText}</span>
      </p>
    </>
  );
}

/* 방치 안내 모드 — 이 화면을 보는 사람은 세탁물 주인이 아니라 다음 손님이다.
   주인을 탓하지 않으면서, 다음 손님이 기계를 쓸 수 있게 하는 게 목적이다. */
function NextCustomerGuide({ machine }) {
  const { name, session } = machine;

  return (
    <>
      <section className={styles.card}>
        <div className={styles.heroTop}>
          <h1 className={styles.machineName}>{name}</h1>
          <StatusBadge status="ABANDONED" detail={formatElapsed(session.endedAt)} />
        </div>
        <p className={styles.sub}>
          이 세탁기에는 <b>아직 찾아가지 않은 세탁물</b>이 있어요. 집사가 안내를 보냈지만 아직
          수거되지 않아 사장님께도 알렸어요.
        </p>
      </section>

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>지금 이 세탁기를 쓰고 싶다면</h2>
        <ol className={styles.guide}>
          <li>
            <span className={styles.stepNo}>1</span>
            안의 세탁물을 꺼내 <b>옆 선반 위에</b> 올려 주세요
          </li>
          <li>
            <span className={styles.stepNo}>2</span>
            바로 사용하시면 돼요 — 매장 규칙상 괜찮아요
          </li>
          <li>
            <span className={styles.stepNo}>3</span>
            원래 주인에게는 보관 위치가 자동으로 안내돼요
          </li>
        </ol>
        <button type="button" className={styles.button}>
          선반으로 옮기고 사용할게요
        </button>
      </section>
    </>
  );
}

function Shell({ children }) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.head}>
          {/* 마스코트 공식 이미지(assets/mascot.png) 확정 전이라 🐱을 임시로 쓴다 */}
          <p className={styles.brand}>
            <span className={styles.mascot}>🐱</span> 빨래집사
          </p>
          <p className={styles.store}>○○빨래방 역삼점</p>
        </header>
        {children}
      </div>
    </main>
  );
}

function ButlerTip({ children }) {
  return (
    <p className={styles.tip}>
      <span className={styles.mascot}>🐱</span>
      <span>{children}</span>
    </p>
  );
}
