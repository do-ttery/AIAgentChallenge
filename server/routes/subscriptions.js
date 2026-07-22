import { Router } from "express";

import { getDb } from "../services/db.js";

// QR 랜딩에서 고객이 알림을 신청할 때 프론트(T-18)가 호출하는 엔드포인트 (T-12).
//
// 경로를 POST /api/subscriptions 로 정한 이유:
//   - CLAUDE.md API Spec의 조회 API가 전부 GET /api/... 형태라 리소스 네임스페이스를 맞췄다.
//   - 센서 입구(POST /ingest/:machineId)와 달리 이건 "구독"이라는 리소스를 새로 만드는
//     행위라 REST 컨벤션대로 POST + 복수형 컬렉션 경로(/api/subscriptions)로 뒀다.
//   - subscription은 sessionId에 종속되므로 URL에 넣는 방법(/api/sessions/:id/subscriptions)도
//     가능했지만, 브라우저 PushSubscription 객체(endpoint/keys)를 그대로 body에 실어 보내는 게
//     자연스럽고 session 리소스 자체를 이번 범위에서 다루지 않아 단순한 평면 경로를 골랐다.
//
// body: { sessionId, endpoint, keys: { p256dh, auth } }  (PushSubscription.toJSON() 그대로)
// 같은 (session_id, endpoint) 조합으로 이미 구독이 있으면 새로 넣지 않고 기존 것을 반환한다
// (같은 기기가 버튼을 두 번 눌러도 중복 저장 안 되게).
//
// 2026-07-22 수정: 예전엔 session_id만 보고 중복을 판단해서, 같은 세션을 다른 기기(예: 맥
// 브라우저로 먼저 열어봤다가 나중에 실제 손님 폰으로 구독)에서 구독하면 두 번째 기기의
// 구독이 조용히 무시되고 첫 번째 기기로만 알림이 갔다 — 실기기 테스트로 발견한 버그.
// endpoint까지 같이 봐야 "같은 기기의 중복 신청"과 "다른 기기의 새 신청"이 구분된다.
//
// sessionId가 없으면 "사장님(매장) 구독"으로 처리한다 (2026-07-21 결정).
// subscription.session_id는 nullable이고, NULL row가 세션에 묶이지 않은 사장님 채널이다.

const router = Router();

router.post("/", async (req, res) => {
  const { sessionId, endpoint, keys } = req.body ?? {};

  if (!endpoint || !keys || typeof keys !== "object") {
    return res.status(400).json({
      ok: false,
      error: "endpoint, keys({p256dh, auth})가 필요합니다 (sessionId는 선택 — 없으면 사장님 구독)",
    });
  }

  try {
    const db = getDb();

    let findQuery = db.from("subscription").select("id, endpoint, created_at").eq("endpoint", endpoint);
    findQuery = sessionId ? findQuery.eq("session_id", sessionId) : findQuery.is("session_id", null);
    const { data: existing, error: findErr } = await findQuery.limit(1).maybeSingle();
    if (findErr) throw new Error(findErr.message);

    if (existing) {
      const who = sessionId ? `session ${sessionId}` : "사장님(매장)";
      console.log(`[subscriptions] ${who} 이미 구독 있음 — 중복 저장 건너뜀`);
      return res.status(200).json({ ok: true, subscription: existing, created: false });
    }

    const { data: inserted, error: insertErr } = await db
      .from("subscription")
      .insert({ session_id: sessionId ?? null, endpoint, keys: JSON.stringify(keys) })
      .select("id, endpoint, created_at")
      .single();
    if (insertErr) throw new Error(insertErr.message);

    const who = sessionId ? `session ${sessionId}` : "사장님(매장)";
    console.log(`[subscriptions] ${who} 구독 저장 완료`);
    return res.status(201).json({ ok: true, subscription: inserted, created: true });
  } catch (err) {
    console.error(`[subscriptions] 저장 실패:`, err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
