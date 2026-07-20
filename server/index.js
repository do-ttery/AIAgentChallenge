import "dotenv/config";

import cors from "cors";
import express from "express";

import machinesRouter from "./routes/machines.js";
import ingestRouter from "./routes/ingest.js";
import { initDb } from "./services/db.js";

const PORT = process.env.PORT || 3000;

// 서버 시작 시 Supabase 클라이언트를 초기화한다 (T-09).
// 테이블 자체는 server/db/schema.sql을 Supabase SQL Editor에서 미리 실행해둬야 한다.
initDb();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "빨래집사" });
});

// 센서 데이터 입구는 POST /ingest/:machineId 하나로 통일한다 (T-08)
// 라우트는 routes/, 상태 머신·방치 대응·알림은 services/ 아래에 둔다
app.use("/ingest", ingestRouter);

// 조회 API — 지금은 GET /api/machines 만 구현한다 (T-13 최소 범위)
app.use("/api/machines", machinesRouter);

app.listen(PORT, () => {
  console.log(`빨래집사 server → http://localhost:${PORT}`);
});
