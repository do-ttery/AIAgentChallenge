import { Router } from "express";

// 센서 데이터 단일 입구 (T-08)
//   POST /ingest/:machineId
//     { "type": "watt", "value": 512 }   # 전력 (5초 간격)
//     { "type": "door_open"  }            # 문 열림
//     { "type": "door_close" }            # 문 닫힘
//
// 개발(시뮬레이터 T-21)·운영(폴링 스크립트 T-04)이 같은 이 엔드포인트를 쓴다.
// T-08 은 "받기"까지만 한다. 저장(T-09)·상태 판정(T-10)은 아직 붙이지 않는다.

const VALID_TYPES = ["watt", "door_open", "door_close"];

const router = Router();

router.post("/:machineId", (req, res) => {
  const { machineId } = req.params;
  const { type, value } = req.body ?? {};

  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({
      ok: false,
      error: `type 은 ${VALID_TYPES.join(" | ")} 중 하나여야 합니다`,
      received: type ?? null,
    });
  }

  // watt 는 숫자 value 가 필수. door 이벤트는 value 없음.
  if (type === "watt" && typeof value !== "number") {
    return res.status(400).json({
      ok: false,
      error: "watt 는 숫자 value 가 필요합니다",
      received: value ?? null,
    });
  }

  // 저장·상태 판정은 다음 Task. 지금은 받았다는 로그만 남긴다.
  const detail = type === "watt" ? `${value}W` : type;
  console.log(`[ingest] ${machineId} ← ${detail}`);

  return res.status(202).json({ ok: true, machineId, type });
});

export default router;
