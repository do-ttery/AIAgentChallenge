import { describe, it, expect } from "vitest";

import { getMachineAvailability } from "./availability.js";

describe("getMachineAvailability — 정상 케이스", () => {
  it("IDLE(세션 없음) → 사용 가능, freeAt 없음", () => {
    const machine = { id: "m1", status: "IDLE", session: null };
    expect(getMachineAvailability(machine)).toEqual({ available: true, freeAt: null });
  });

  it("RUNNING → 사용 불가, freeAt은 session.etaTo", () => {
    const machine = {
      id: "m1",
      status: "RUNNING",
      session: { etaFrom: "2026-07-23T09:00:00.000Z", etaTo: "2026-07-23T09:10:00.000Z" },
    };
    expect(getMachineAvailability(machine)).toEqual({
      available: false,
      freeAt: "2026-07-23T09:10:00.000Z",
    });
  });

  it("SPIN → 사용 불가, freeAt은 session.etaTo", () => {
    const machine = {
      id: "m1",
      status: "SPIN",
      session: { etaFrom: "2026-07-23T09:00:00.000Z", etaTo: "2026-07-23T09:05:00.000Z" },
    };
    expect(getMachineAvailability(machine)).toEqual({
      available: false,
      freeAt: "2026-07-23T09:05:00.000Z",
    });
  });

  it("DONE(수거 전) → 사용 불가 — 세탁물이 아직 안에 있다", () => {
    const machine = {
      id: "m1",
      status: "DONE",
      session: { etaFrom: "2026-07-23T09:00:00.000Z", etaTo: "2026-07-23T09:05:00.000Z" },
    };
    expect(getMachineAvailability(machine)).toEqual({
      available: false,
      freeAt: "2026-07-23T09:05:00.000Z",
    });
  });

  it("ABANDONED → 사용 불가 — 방치 중에도 자리는 비지 않았다", () => {
    const machine = {
      id: "m1",
      status: "ABANDONED",
      session: { etaFrom: "2026-07-23T09:00:00.000Z", etaTo: "2026-07-23T09:05:00.000Z" },
    };
    expect(getMachineAvailability(machine)).toEqual({
      available: false,
      freeAt: "2026-07-23T09:05:00.000Z",
    });
  });
});

describe("getMachineAvailability — 빈 값 / 기본값", () => {
  it("session이 없는데 status가 IDLE이 아님 → freeAt은 null (방어)", () => {
    const machine = { id: "m1", status: "RUNNING", session: null };
    expect(getMachineAvailability(machine)).toEqual({ available: false, freeAt: null });
  });

  it("session.etaTo가 없음 → freeAt은 null", () => {
    const machine = { id: "m1", status: "RUNNING", session: { etaFrom: null, etaTo: null } };
    expect(getMachineAvailability(machine)).toEqual({ available: false, freeAt: null });
  });
});

describe("getMachineAvailability — 경계값", () => {
  it("정의되지 않은 status('FOO') → 사용 불가로 안전하게 간주", () => {
    const machine = { id: "m1", status: "FOO", session: null };
    expect(getMachineAvailability(machine)).toEqual({ available: false, freeAt: null });
  });
});

describe("getMachineAvailability — 실패(비정상 입력) 케이스", () => {
  it("machine이 undefined → 사용 불가, 에러 없음", () => {
    expect(getMachineAvailability(undefined)).toEqual({ available: false, freeAt: null });
  });

  it("machine이 null → 사용 불가, 에러 없음", () => {
    expect(getMachineAvailability(null)).toEqual({ available: false, freeAt: null });
  });

  it("status 자체가 없음 → 사용 불가로 안전하게 간주", () => {
    expect(getMachineAvailability({ id: "m1", session: null })).toEqual({
      available: false,
      freeAt: null,
    });
  });
});
