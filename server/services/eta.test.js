import { test, expect } from "vitest";
import { computeEta } from "./eta.js";

test("표준 코스 35분 기준, ±5분 범위를 돌려준다", () => {
  const { etaFrom, etaTo } = computeEta("2026-07-23T10:00:00.000Z");
  expect(etaFrom).toBe("2026-07-23T10:30:00.000Z");
  expect(etaTo).toBe("2026-07-23T10:40:00.000Z");
});

test("자정을 넘어가는 시작 시각도 날짜가 정상적으로 넘어간다", () => {
  const { etaFrom, etaTo } = computeEta("2026-07-23T23:50:00.000Z");
  expect(etaFrom).toBe("2026-07-24T00:20:00.000Z");
  expect(etaTo).toBe("2026-07-24T00:30:00.000Z");
});

// 잘못된 startedAt은 이 함수가 방어하지 않는다 — 호출부(machines.js 라우트)의
// try/catch가 500으로 잡는다는 전제. eta.js는 순수 계산만 맡는다는 범위를 지키기 위해
// 여기서 방어 로직을 추가하지 않기로 함 (2026-07-23 결정).
test("파싱 불가능한 startedAt은 throw한다 (호출부가 잡는다는 전제)", () => {
  expect(() => computeEta("not-a-date")).toThrow();
});
