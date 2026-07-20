import { Router } from "express";

import { getDb } from "../services/db.js";

// 조회 API 중 GET /api/machines 만 구현한다 (T-13 최소 범위).
//   GET /api/machines → Machine[]
//
// machine 테이블 + 현재 session 조인 형태로 응답한다 (CLAUDE.md API Spec 참고).
// 상태머신(T-10)이 아직 없어 session 테이블이 비어 있으므로, 지금은 모든 기계의
// session이 자연스럽게 null이다 — 조인 로직은 T-10 이후에 추가한다.
// needsAttention/attentionReason도 판정 로직이 없어 지금은 false/null 고정이다.
// plugId/doorSensorId는 내부 센서 매핑이라 응답에 담지 않는다.

const router = Router();

router.get("/", async (req, res) => {
  const db = getDb();

  const { data, error } = await db.from("machine").select("id, name, status");

  if (error) {
    console.error("[machines] 조회 실패", error);
    return res.status(500).json({ ok: false, error: error.message });
  }

  const machines = data.map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    needsAttention: false,
    attentionReason: null,
    session: null,
  }));

  return res.json(machines);
});

export default router;
