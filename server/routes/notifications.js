import { Router } from "express";

import { getDb } from "../services/db.js";
import { RECENT_NOTIFICATIONS_LIMIT } from "../services/constants.js";

// 조회 API 중 최근 처리 내역을 구현한다 (T-13).
//   GET /api/notifications/recent → Notification[] (sentAt 내림차순)
//
// notification 테이블(sessionId, type, sentAt)만으로는 화면이 못 그린다.
// session을 거쳐 machineId·machineName·sessionState까지 조인해야
// CLAUDE.md API Spec의 Notification 응답 모양이 나온다.
// notification → session → machine 순서로 필요한 id만 모아 배치 조회한다
// (machines.js처럼 건별 조회하면 N+1이 되므로 여기서는 IN 절로 묶는다).

const router = Router();

async function fetchRecentNotifications(db) {
  const { data, error } = await db
    .from("notification")
    .select("id, session_id, type, sent_at")
    .order("sent_at", { ascending: false })
    .limit(RECENT_NOTIFICATIONS_LIMIT);

  if (error) throw new Error(`[notifications] notification 조회 실패: ${error.message}`);

  return data;
}

async function fetchSessionsByIds(db, sessionIds) {
  if (sessionIds.length === 0) return new Map();

  const { data, error } = await db
    .from("session")
    .select("id, machine_id, state")
    .in("id", sessionIds);

  if (error) throw new Error(`[notifications] session 조회 실패: ${error.message}`);

  return new Map(data.map((row) => [row.id, row]));
}

async function fetchMachineNamesByIds(db, machineIds) {
  if (machineIds.length === 0) return new Map();

  const { data, error } = await db.from("machine").select("id, name").in("id", machineIds);

  if (error) throw new Error(`[notifications] machine 조회 실패: ${error.message}`);

  return new Map(data.map((row) => [row.id, row.name]));
}

router.get("/recent", async (req, res) => {
  const db = getDb();

  try {
    const notifications = await fetchRecentNotifications(db);

    const sessionIds = [...new Set(notifications.map((n) => n.session_id))];
    const sessionById = await fetchSessionsByIds(db, sessionIds);

    const machineIds = [...new Set([...sessionById.values()].map((s) => s.machine_id))];
    const machineNameById = await fetchMachineNamesByIds(db, machineIds);

    const result = notifications.map((n) => {
      const session = sessionById.get(n.session_id);
      return {
        id: n.id,
        sessionId: n.session_id,
        machineId: session.machine_id,
        machineName: machineNameById.get(session.machine_id),
        sessionState: session.state,
        type: n.type,
        sentAt: n.sent_at,
      };
    });

    return res.json(result);
  } catch (err) {
    console.error("[notifications] recent 조회 실패", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
