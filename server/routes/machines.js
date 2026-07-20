import { Router } from "express";

import { getDb } from "../services/db.js";

// 조회 API 중 기계 목록·단건 조회를 구현한다 (T-13).
//   GET /api/machines → Machine[]
//   GET /api/machines/:id → Machine
//
// machine 테이블 + 현재 session 조인 형태로 응답한다 (CLAUDE.md API Spec 참고).
// 상태머신(T-10) 전이므로 session은 null로 고정한다.
// 현재 세션 조인 로직은 T-10 이후에 추가한다.
// needsAttention/attentionReason도 판정 로직이 없어 지금은 false/null 고정이다.
// plugId/doorSensorId는 내부 센서 매핑이라 응답에 담지 않는다.

const router = Router();

function toMachine(row) {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    needsAttention: false,
    attentionReason: null,
    session: null,
  };
}

router.get("/", async (req, res) => {
  const db = getDb();

  const { data, error } = await db.from("machine").select("id, name, status");

  if (error) {
    console.error("[machines] 조회 실패", error);
    return res.status(500).json({ ok: false, error: error.message });
  }

  const machines = data.map(toMachine);

  return res.json(machines);
});

router.get("/:id", async (req, res) => {
  const db = getDb();

  const { data, error } = await db
    .from("machine")
    .select("id, name, status")
    .eq("id", req.params.id)
    .maybeSingle();

  if (error) {
    console.error(`[machines] ${req.params.id} 조회 실패`, error);
    return res.status(500).json({ ok: false, error: error.message });
  }

  if (!data) {
    return res.status(404).json({ ok: false, error: "기계를 찾을 수 없습니다." });
  }

  return res.json(toMachine(data));
});

export default router;
