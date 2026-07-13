import cors from "cors";
import express from "express";

const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "빨래집사" });
});

// 센서 데이터 입구는 POST /ingest/:machineId 하나로 통일한다 (T-08)
// 라우트는 routes/, 상태 머신·방치 대응·알림은 services/ 아래에 둔다

app.listen(PORT, () => {
  console.log(`빨래집사 server → http://localhost:${PORT}`);
});
