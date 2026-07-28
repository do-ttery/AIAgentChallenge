import { STANDARD_COURSE_MIN, ETA_RANGE_MIN } from "./constants.js";

export function computeEta(startedAtIso) {
  const startedAtMs = new Date(startedAtIso).getTime();
  const etaFrom = new Date(
    startedAtMs + (STANDARD_COURSE_MIN - ETA_RANGE_MIN) * 60_000
  ).toISOString();
  const etaTo = new Date(
    startedAtMs + (STANDARD_COURSE_MIN + ETA_RANGE_MIN) * 60_000
  ).toISOString();
  return { etaFrom, etaTo };
}
