import { Router } from "express";

import { getDb } from "../services/db.js";
import { STANDARD_COURSE_MIN, ETA_RANGE_MIN } from "../services/constants.js";

// 조회 API 중 기계 목록·단건 조회를 구현한다 (T-13).
//   GET /api/machines → Machine[]
//   GET /api/machines/:id → Machine
//
// machine 테이블 + 현재 session 조인 형태로 응답한다 (CLAUDE.md API Spec 참고).
// 진행 중 세션 판단: machine.status가 IDLE이면 session: null.
// (COLLECTED 전이 시 machine.status는 IDLE로 리셋되므로, 그 시점 이후 남은 session
//  레코드는 이력일 뿐 "진행 중"이 아니다 — CLAUDE.md State Machine 2026-07-20 결정 참고)
// needsAttention/attentionReason은 이상 감지 로직이 아직 없어 false/null 고정이다.
// plugId/doorSensorId는 내부 센서 매핑이라 응답에 담지 않는다.

const router = Router();

function computeEta(startedAtIso) {
  const startedAtMs = new Date(startedAtIso).getTime();
  const etaFrom = new Date(
    startedAtMs + (STANDARD_COURSE_MIN - ETA_RANGE_MIN) * 60_000
  ).toISOString();
  const etaTo = new Date(
    startedAtMs + (STANDARD_COURSE_MIN + ETA_RANGE_MIN) * 60_000
  ).toISOString();
  return { etaFrom, etaTo };
}

async function countSubscribers(db, sessionId) {
  const { count, error } = await db
    .from("subscription")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  if (error) throw new Error(`[machines] subscription 조회 실패: ${error.message}`);

  return count ?? 0;
}

async function getCurrentSessionRow(db, machineId) {
  const { data, error } = await db
    .from("session")
    .select("id, state, started_at, ended_at")
    .eq("machine_id", machineId)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`[machines] session 조회 실패: ${error.message}`);

  return data;
}

async function buildSession(machineId, sessionRow, subscriberCount) {
  const { etaFrom, etaTo } = computeEta(sessionRow.started_at);

  return {
    id: sessionRow.id,
    machineId,
    startedAt: sessionRow.started_at,
    endedAt: sessionRow.ended_at ?? null,
    state: sessionRow.state,
    etaFrom,
    etaTo,
    subscriberCount,
  };
}

async function toMachine(db, row) {
  let session = null;

  if (row.status !== "IDLE") {
    const sessionRow = await getCurrentSessionRow(db, row.id);
    if (sessionRow) {
      const subscriberCount = await countSubscribers(db, sessionRow.id);
      session = await buildSession(row.id, sessionRow, subscriberCount);
    }
  }

  return {
    id: row.id,
    name: row.name,
    status: row.status,
    needsAttention: false,
    attentionReason: null,
    session,
  };
}

router.get("/", async (req, res) => {
  const db = getDb();

  const { data, error } = await db.from("machine").select("id, name, status");

  if (error) {
    console.error("[machines] 조회 실패", error);
    return res.status(500).json({ ok: false, error: error.message });
  }

  try {
    const machines = await Promise.all(data.map((row) => toMachine(db, row)));
    return res.json(machines);
  } catch (err) {
    console.error("[machines] session 조인 실패", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
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

  try {
    return res.json(await toMachine(db, data));
  } catch (err) {
    console.error(`[machines] ${req.params.id} session 조인 실패`, err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
