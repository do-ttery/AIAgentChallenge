import { useState, useEffect } from "react";

export default function ExamCastIntro() {
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % 5), 1600);
    return () => clearInterval(t);
  }, []);

  const loop = ["관찰", "진단", "행동", "검증", "재판단"];

  return (
    <div className="ec">
      <style>{`
        .ec {
          --paper: #FBFBF7; --ink: #16202E; --soft: #5A6472; --line: #E2E1D6;
          --hl: #FFE34D; --hl2: #FFF3B0; --red: #E0472F; --green: #2E7D5B;
          background: var(--paper); color: var(--ink); min-height: 100vh;
          font-family: "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .ec * { box-sizing: border-box; margin: 0; }
        .w { max-width: 960px; margin: 0 auto; padding: 0 24px; }

        .top { display: flex; justify-content: space-between; align-items: baseline; padding: 24px 0; }
        .top b { font-size: 16px; font-weight: 800; letter-spacing: -0.01em; }
        .top span { font-size: 11px; letter-spacing: 0.12em; color: var(--soft); font-weight: 600; }

        /* HERO */
        .hero { padding: 68px 0 52px; }
        .hero h1 {
          font-size: clamp(40px, 7.5vw, 76px); font-weight: 900;
          line-height: 1.18; letter-spacing: -0.03em; word-break: keep-all;
        }
        .mk { position: relative; white-space: nowrap; }
        .mk::before {
          content: ""; position: absolute; z-index: -1;
          left: -0.06em; right: -0.06em; bottom: 0.05em; height: 0.5em;
          background: var(--hl);
          transform: scaleX(${loaded ? 1 : 0}); transform-origin: left;
          transition: transform 0.8s cubic-bezier(0.22,1,0.36,1) 0.3s;
        }
        .hero-sub {
          margin-top: 26px; max-width: 640px; font-size: 16px; line-height: 1.75;
          color: var(--soft); font-weight: 500; word-break: keep-all;
        }
        .hero-sub b { color: var(--ink); font-weight: 800; }
        .hero-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 30px; }
        .htag {
          font-size: 13px; font-weight: 700; padding: 7px 14px; border-radius: 999px;
          border: 1.5px solid var(--ink); background: #fff;
        }
        .htag.y { background: var(--hl); border-color: var(--hl); }

        /* strip: input formula */
        .strip {
          border-top: 1.5px solid var(--ink); border-bottom: 1.5px solid var(--ink);
          padding: 22px 0; overflow-x: auto;
        }
        .strip-in { display: flex; align-items: center; gap: 10px; white-space: nowrap; font-weight: 800; font-size: 15px; }
        .cell { border: 1.5px solid var(--ink); background: #fff; border-radius: 8px; padding: 8px 14px; }
        .op { color: var(--soft); font-weight: 400; font-size: 18px; }
        .cell.out { background: var(--ink); color: var(--hl); }

        /* section base */
        .sec { padding: 70px 0; }
        .sec + .sec { border-top: 1px solid var(--line); }
        .lb {
          display: inline-block; font-size: 11px; font-weight: 800; letter-spacing: 0.18em;
          color: var(--soft); margin-bottom: 14px;
        }
        .h2 { font-size: clamp(26px, 4vw, 40px); font-weight: 900; letter-spacing: -0.02em; line-height: 1.3; word-break: keep-all; }
        .h2 .u { background: linear-gradient(transparent 58%, var(--hl) 58%); }
        .lead { margin-top: 16px; max-width: 560px; font-size: 15px; line-height: 1.7; color: var(--soft); font-weight: 600; word-break: keep-all; }

        /* shared quote pill */
        .q {
          display: inline-block; background: #fff; border: 1.5px solid var(--ink);
          border-radius: 999px; padding: 10px 20px; font-size: 15px; font-weight: 700;
          word-break: keep-all; line-height: 1.5;
        }

        /* PROBLEM: student-voice cards */
        .xgrid { margin-top: 40px; display: grid; gap: 14px; }
        @media (min-width: 720px) { .xgrid { grid-template-columns: repeat(3, 1fr); } }
        .xcard {
          background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 24px 22px;
        }
        .xcard .xm { font-family: Georgia, serif; color: var(--red); font-size: 34px; font-weight: 800; line-height: 1; }
        .xcard h3 { margin-top: 14px; font-size: 18px; font-weight: 800; word-break: keep-all; line-height: 1.4; }
        .xcard p { margin-top: 9px; font-size: 13.5px; color: var(--soft); font-weight: 600; line-height: 1.6; word-break: keep-all; }

        /* ENGINES */
        .eng { margin-top: 40px; display: grid; gap: 16px; }
        @media (min-width: 760px) { .eng { grid-template-columns: 1fr 1fr; } }
        .eng-b { border-radius: 14px; padding: 28px 26px; }
        .eng-b.a { background: var(--hl2); border: 1.5px solid var(--hl); }
        .eng-b.b { background: var(--ink); color: #F3F4F0; }
        .eng-b .no { font-size: 12px; font-weight: 800; letter-spacing: 0.14em; opacity: 0.7; }
        .eng-b h3 { font-size: 24px; font-weight: 900; margin: 8px 0 14px; letter-spacing: -0.01em; }
        .eng-b .desc { font-size: 13.5px; font-weight: 600; line-height: 1.6; margin-bottom: 18px; word-break: keep-all; }
        .eng-b.a .desc { color: var(--soft); }
        .eng-b.b .desc { color: #C7CBD0; }
        .kw { display: flex; flex-wrap: wrap; gap: 8px; }
        .kw span {
          font-size: 13px; font-weight: 700; padding: 6px 12px; border-radius: 6px;
          background: #fff; border: 1px solid var(--line);
        }
        .eng-b.b .kw span { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); color: #F3F4F0; }
        .eng-b.b .kw span.y { background: var(--hl); border-color: var(--hl); color: var(--ink); }
        .eng-foot { margin-top: 20px; font-size: 13px; font-weight: 700; }
        .eng-b.a .eng-foot { color: var(--ink); }
        .eng-b.b .eng-foot { color: var(--hl); }

        /* RESULT: 근거 카드 */
        .rcards { margin-top: 40px; display: grid; gap: 14px; }
        @media (min-width: 720px) { .rcards { grid-template-columns: 1fr 1fr; } }
        .rcard { background: #fff; border: 1px solid var(--line); border-left-width: 5px; border-radius: 12px; padding: 22px; }
        .rcard.p1 { border-left-color: #EAB300; }
        .rcard.p2 { border-left-color: var(--red); }
        .rcard.p3 { border-left-color: var(--green); }
        .rcard.p4 { border-left-color: var(--soft); }
        .rchip { display: inline-block; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 6px; margin-bottom: 12px; }
        .rchip.p1 { background: var(--hl); color: #6B5300; }
        .rchip.p2 { background: #F7DED8; color: var(--red); }
        .rchip.p3 { background: #D6EDE1; color: var(--green); }
        .rchip.p4 { background: #ECEBE3; color: var(--soft); }
        .rcard h3 { font-size: 18px; font-weight: 800; word-break: keep-all; line-height: 1.4; }
        .rcard p { margin-top: 9px; font-size: 13.5px; color: var(--soft); font-weight: 600; line-height: 1.6; word-break: keep-all; }
        .rcard .why { color: var(--ink); font-weight: 800; }
        .note { margin-top: 26px; font-size: 14px; font-weight: 600; color: var(--soft); line-height: 1.65; word-break: keep-all; }
        .note b { color: var(--ink); background: linear-gradient(transparent 58%, var(--hl) 58%); }

        /* LOOP */
        .cyc { margin-top: 40px; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px; }
        .cs {
          font-size: clamp(16px, 2.6vw, 24px); font-weight: 900; letter-spacing: -0.01em;
          padding: 12px 20px; border-radius: 999px; border: 1.5px solid var(--line);
          background: #fff; transition: all 0.35s ease; color: var(--soft);
        }
        .cs.on { background: var(--hl); border-color: var(--ink); color: var(--ink); transform: scale(1.08); }
        .ca { color: var(--soft); font-size: 18px; }
        .loop-ex { margin-top: 34px; text-align: center; font-size: 15px; font-weight: 700; color: var(--ink); word-break: keep-all; line-height: 1.7; }
        .loop-ex .q { margin: 12px 0; }
        .loop-ex .after { display: block; margin-top: 6px; color: var(--soft); font-weight: 600; font-size: 14px; }
        .cyc-cap { text-align: center; margin-top: 30px; font-size: 15px; font-weight: 700; }
        .cyc-cap .q { margin-top: 10px; }

        /* FEATURES */
        .feat { margin-top: 40px; display: grid; gap: 14px; }
        @media (min-width: 720px) { .feat { grid-template-columns: 1fr 1fr; } }
        .fcard { background: #fff; border: 1px solid var(--line); border-radius: 12px; padding: 22px; display: flex; gap: 15px; align-items: flex-start; }
        .fcard .ic { font-size: 24px; line-height: 1.1; flex: none; }
        .fcard h4 { font-size: 16px; font-weight: 800; }
        .fcard p { margin-top: 6px; font-size: 13px; color: var(--soft); font-weight: 600; line-height: 1.55; word-break: keep-all; }

        /* VS table */
        .vs { margin-top: 40px; border: 1.5px solid var(--ink); border-radius: 14px; overflow: hidden; }
        .vs-h { display: grid; grid-template-columns: 1fr 1fr; background: var(--ink); color: #fff; font-weight: 900; font-size: 15px; }
        .vs-h div { padding: 14px 20px; }
        .vs-h div:last-child { background: var(--hl); color: var(--ink); }
        .vs-r { display: grid; grid-template-columns: 1fr 1fr; border-top: 1px solid var(--line); background: #fff; }
        .vs-r div { padding: 16px 20px; font-size: 14px; font-weight: 700; word-break: keep-all; }
        .vs-r div:first-child { color: var(--soft); }
        .vs-r div:last-child { border-left: 1px solid var(--line); }

        .foot { border-top: 1.5px solid var(--ink); padding: 56px 0 72px; text-align: center; }
        .foot .h2 { justify-content: center; }
        .foot .lead { margin: 16px auto 0; }
        .foot small { display: block; margin-top: 28px; font-size: 11px; letter-spacing: 0.14em; color: var(--soft); font-weight: 700; }

        @media (prefers-reduced-motion: reduce) { .mk::before, .cs { transition: none; } }
      `}</style>

      <div className="w top">
        <b>ExamCast</b>
        <span>AI AGENT CHALLENGE · 4W · SOLO</span>
      </div>

      {/* HERO */}
      <header className="w hero">
        <h1>
          요약 말고,
          <br />
          <span className="mk">시험 전략.</span>
        </h1>
        <p className="hero-sub">
          시험 3일 전, 기출이랑 PPT는 잔뜩 쌓여 있는데 뭐부터 봐야 할지 막막할 때.
          ExamCast는 내가 가진 <b>기출·강의 PPT·시험 공지·후기</b>를 교차 분석해
          <b> “이 교수님 시험”에 맞는 공부 우선순위</b>를 근거와 함께 정해주고,
          틀린 문제는 <b>약점으로 진단</b>해 극복할 때까지 다시 풀리는 AI 학습 Agent예요.
        </p>
        <div className="hero-tags">
          <span className="htag y">내 시험을 아는 AI Agent</span>
          <span className="htag">근거 기반 우선순위</span>
          <span className="htag">오답 루프</span>
        </div>
      </header>

      {/* INPUT FORMULA */}
      <div className="strip">
        <div className="w strip-in">
          <span className="cell">기출 3개년</span>
          <span className="op">×</span>
          <span className="cell">강의 PPT</span>
          <span className="op">×</span>
          <span className="cell">시험 공지</span>
          <span className="op">×</span>
          <span className="cell">시험 후기</span>
          <span className="op">=</span>
          <span className="cell out">공부 우선순위 + 근거</span>
        </div>
      </div>

      {/* PROBLEM */}
      <section className="w sec">
        <span className="lb">PROBLEM</span>
        <h2 className="h2">자료는 있다. <span className="u">전략이 없다.</span></h2>
        <p className="lead">시험 준비가 힘든 건 자료가 없어서가 아니라, 그 자료들을 조합해 “어디부터 볼지” 정하는 걸 전부 혼자 해야 해서예요.</p>
        <div className="xgrid">
          <div className="xcard">
            <div className="xm">✗</div>
            <h3>기출 3년치는 받았는데…</h3>
            <p>이번 학기 PPT랑 하나하나 대조하는 건 결국 내 몫. AI에 넣어 봐야 요약만 돌아온다.</p>
          </div>
          <div className="xcard">
            <div className="xm">✗</div>
            <h3>기출 따로, PPT 따로, 후기 따로</h3>
            <p>“2023년 3번 개념이 올해 7주차에 그대로 있다” 같은 교차 정보가 진짜 우선순위인데, 손으로 맞추긴 어렵다.</p>
          </div>
          <div className="xcard">
            <div className="xm">✗</div>
            <h3>틀린 문제를 또 틀린다</h3>
            <p>오답이 “어떤 개념이 약한지”로 이어지지 않는다. 챗봇은 어제 내가 뭘 틀렸는지 기억하지 못한다.</p>
          </div>
        </div>
      </section>

      {/* ENGINES */}
      <section className="w sec">
        <span className="lb">TWO ENGINES</span>
        <h2 className="h2">엔진은 <span className="u">두 개</span>다</h2>
        <p className="lead">하나는 시험 전 전략을 짜고, 하나는 문제를 풀 때 약점을 잡는다. 이 두 개가 ExamCast의 전부다.</p>
        <div className="eng">
          <div className="eng-b a">
            <span className="no">ENGINE 01 · 시험 전</span>
            <h3>교차 분석</h3>
            <p className="desc">기출·PPT·공지·후기를 서로 대조해 “뭐부터 공부할지”를 근거와 함께 정해준다. 기출이 있으면 가장 강력하고, 없으면 알아서 전략을 바꾼다.</p>
            <div className="kw">
              <span>최우선 개념</span>
              <span>변형 주의</span>
              <span>신규 후보</span>
              <span>근거 카드</span>
              <span>기출 유무 자동 분기</span>
            </div>
            <p className="eng-foot">↓ 결과는 아래처럼 근거 카드로</p>
          </div>
          <div className="eng-b b">
            <span className="no">ENGINE 02 · 문제풀이 중</span>
            <h3>오답 루프</h3>
            <p className="desc">예상 문제를 풀면 틀린 걸 관찰해 약점으로 진단하고, 복습·재시험으로 극복까지 끌고 간다. 이 루프는 자료가 PPT뿐이어도 그대로 동작한다.</p>
            <div className="kw">
              <span>약점 진단</span>
              <span>3분 TTS 복습</span>
              <span>재시험</span>
              <span>숙련도 누적</span>
              <span className="y">상태가 쌓인다</span>
            </div>
            <p className="eng-foot">기출 없어도 절반의 가치는 여기</p>
          </div>
        </div>
      </section>

      {/* RESULT */}
      <section className="w sec">
        <span className="lb">RESULT · 교차 분석</span>
        <h2 className="h2">그래서, <span className="u">이렇게 정리해줘요</span></h2>
        <p className="lead">모든 제안에는 “어느 기출·어느 슬라이드·어느 후기에서 나온 결론인지” 근거가 붙어요. 최종 결정은 내가 하되, 결정할 재료를 Agent가 정리해주는 거죠.</p>
        <div className="rcards">
          <div className="rcard p1">
            <span className="rchip p1">최우선</span>
            <h3>페이지 교체 알고리즘</h3>
            <p><span className="why">근거 —</span> 기출 3년 연속 출제 + 올해 PPT 9주차에 그대로 존재</p>
          </div>
          <div className="rcard p2">
            <span className="rchip p2">변형 주의</span>
            <h3>2024년 5번 문제 유형</h3>
            <p><span className="why">근거 —</span> 교수님이 알려준 유형과 일치, 숫자만 바꿔 재출제 가능</p>
          </div>
          <div className="rcard p3">
            <span className="rchip p3">신규 후보</span>
            <h3>‘가상화’ 단원</h3>
            <p><span className="why">근거 —</span> 올해 PPT에 새로 추가, 기출엔 없음 → 신규 출제 가능</p>
          </div>
          <div className="rcard p4">
            <span className="rchip p4">후기 참고</span>
            <h3>“서술형 위주” 후기</h3>
            <p><span className="why">근거 —</span> 기출 문항 구성과 일치 → 참고 가중치 높음</p>
          </div>
        </div>
        <p className="note">기출이 없어도 괜찮아요 — <b>시험 공지·PPT 구조·후기</b>로 우선순위를 잡고, 확신도는 낮춰서 솔직하게 표시해요.</p>
      </section>

      {/* LOOP */}
      <section className="w sec">
        <span className="lb">오답 루프 · 문제풀이 중</span>
        <h2 className="h2">틀리면? <span className="u">거기서 끝이 아니다</span></h2>
        <div className="cyc" aria-label="오답 루프 5단계">
          {loop.map((s, i) => (
            <span key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className={`cs ${step === i ? "on" : ""}`}>{s}</span>
              {i < loop.length - 1 ? <span className="ca">→</span> : <span className="ca">↺</span>}
            </span>
          ))}
        </div>
        <div className="loop-ex">
          틀린 문제를 개념 단위 약점으로 진단해요
          <br />
          <span className="q">“TLB miss와 page fault 혼동 → 주소 변환 흐름 이해 부족”</span>
          <span className="after">그 개념만 3분 오디오로 복습하고, 유사 문제로 극복까지 확인.</span>
        </div>
        <div className="cyc-cap">
          다음에 다시 켜면, Agent가 먼저 —
          <br />
          <span className="q">“지난번에 틀린 ‘세마포어’부터 복습할까요?”</span>
        </div>
      </section>

      {/* FEATURES */}
      <section className="w sec">
        <span className="lb">MORE</span>
        <h2 className="h2">이런 것도 <span className="u">챙겨요</span></h2>
        <div className="feat">
          <div className="fcard">
            <span className="ic">🎧</span>
            <div>
              <h4>통학길 오디오 복습</h4>
              <p>버스 20분이면 약점 개념 3개를 골라 오디오로 연속 재생. 화면 안 봐도 귀로 복습돼요.</p>
            </div>
          </div>
          <div className="fcard">
            <span className="ic">💾</span>
            <div>
              <h4>공부가 쌓인다</h4>
              <p>오답과 개념별 숙련도가 저장돼, 다음에 켜면 틀린 것부터 이어서 복습해요.</p>
            </div>
          </div>
          <div className="fcard">
            <span className="ic">⏳</span>
            <div>
              <h4>남은 시간 맞춤</h4>
              <p>시험까지 남은 시간에 맞춰 ‘볼 부분 / 버릴 부분’을 정리해줘요.</p>
            </div>
          </div>
          <div className="fcard">
            <span className="ic">📄</span>
            <div>
              <h4>기출 없어도 OK</h4>
              <p>공지·강의 구조·후기만으로도 공부 시작점을 잡아줘요.</p>
            </div>
          </div>
        </div>
      </section>

      {/* VS */}
      <section className="w sec">
        <span className="lb">VS CHATBOT</span>
        <h2 className="h2">&ldquo;그냥 챗봇에 물어보면 되잖아&rdquo;?</h2>
        <div className="vs">
          <div className="vs-h"><div>범용 챗봇</div><div>ExamCast</div></div>
          <div className="vs-r"><div>분석 프롬프트를 학생이 직접 설계</div><div>분석 프레임이 이미 제품에 들어있음</div></div>
          <div className="vs-r"><div>답이 텍스트 한 덩어리로 나옴</div><div>풀고 · 채점되고 · 오답이 기록되는 화면</div></div>
          <div className="vs-r"><div>대화가 끝나면 기억도 끝</div><div>오답 · 숙련도가 쌓여 다음 제안이 된다</div></div>
        </div>
      </section>

      {/* FOOT */}
      <footer className="w foot">
        <h2 className="h2">내 시험을 아는 <span className="u">단 하나의 Agent</span></h2>
        <p className="lead">뭐부터 공부할지 근거와 함께 정해주고, 그 도움이 공부 기록과 함께 점점 더 정확해집니다.</p>
        <small>EXAMCAST · NAVER CONNECT AI AGENT CHALLENGE · 2026</small>
      </footer>
    </div>
  );
}
