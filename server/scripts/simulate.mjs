#!/usr/bin/env node
/**
 * 빨래집사 전력 시뮬레이터 (T-21)
 *
 * 실제 매장에서는 `power_poll.py`(T-04, 도경 담당)가 Tapo P110M에서 읽은 W값을
 * `POST /ingest/:machineId` 로 5초 간격 전송한다. 서버·상태머신(T-09/T-10)이
 * 아직 없는 개발 단계에서, 같은 엔드포인트로 가짜 데이터를 주입해 흐름을 눈으로
 * 확인하기 위한 스크립트다.
 *
 * 개발 경로 == 운영 경로. 시뮬레이터도 별도 API 없이 같은
 * POST /ingest/:machineId 를 쓴다.
 *
 * 임계값은 실측 문서(server/scripts/실측_20260715.md, CLAUDE.md 2026-07-15 1차 반영)를 그대로 쓴다.
 *   IDLE 대기        ~7W
 *   IDLE → RUNNING   100W 이상 지속 (세탁 대역 200~300W)
 *   RUNNING → SPIN   500W 이상 스파이크 (탈수 ~800W)
 *   SPIN → DONE      20W 이하가 60초 유지
 *
 * 표준 코스는 실제로 35분 걸리지만, 시뮬레이터는 그만큼 기다리지 않는다.
 * 각 구간을 압축된 시간으로 빠르게 흘려보내되, 전력값은 임계값을 실제로
 * 넘고("500W 이상 스파이크") 그 조건이 요구하는 "지속/유지"는 실제 신호
 * 개수·간격으로 재현한다 (예: 20W 이하를 5초 간격 신호 여러 개로 60초 유지).
 *
 * ────────────────────────────────────────────────────────────────
 * 사용법
 *   node server/scripts/simulate.mjs --scenario normal
 *   node server/scripts/simulate.mjs --scenario abandoned --machine-id m2
 *   node server/scripts/simulate.mjs --scenario no-qr --server http://localhost:3000
 *   node server/scripts/simulate.mjs --scenario sensor-error
 * ────────────────────────────────────────────────────────────────
 */

const DEFAULT_MACHINE_ID = "m1";
const DEFAULT_SERVER = "http://localhost:3000";

// 폴링 간격을 그대로 쓰면 35분짜리 코스를 기다려야 하니, 신호 사이 실제
// 대기 시간만 압축한다(배속). 신호 "개수"는 임계값의 지속·유지 조건을
// 만족하도록 그대로 둔다 — 즉 값·개수는 실측/스펙 그대로, 시간만 빠르게.
const SIM_INTERVAL_MS = 300; // 운영 5초 폴링 1회 = 시뮬레이터 300ms

const SCENARIOS = ["normal", "abandoned", "no-qr", "sensor-error"];

function parseArgs(argv) {
  const args = { scenario: null, machineId: DEFAULT_MACHINE_ID, server: DEFAULT_SERVER };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--scenario") args.scenario = argv[++i];
    else if (arg === "--machine-id") args.machineId = argv[++i];
    else if (arg === "--server") args.server = argv[++i];
    else if (arg === "--help" || arg === "-h") args.help = true;
  }
  return args;
}

function printUsage() {
  console.log(`
빨래집사 전력 시뮬레이터 (T-21)

사용법:
  node server/scripts/simulate.mjs --scenario <시나리오> [--machine-id m1] [--server http://localhost:3000]

시나리오:
  normal        정상 수거   — IDLE → RUNNING → SPIN → DONE → door_open(수거)
  abandoned     방치        — 정상 수거와 동일하게 DONE까지 가되 수거 신호 없이 종료
  no-qr         QR 미신청 방치 — 방치와 동일한 전력 패턴 (QR 신청 여부는 subscription 문제라 서버 미구현, 이름/로그로만 구분)
  sensor-error  센서 오류   — 음수 watt · 값 끊김 · 이상치 스파이크

예시:
  node server/scripts/simulate.mjs --scenario normal
  node server/scripts/simulate.mjs --scenario abandoned --machine-id m2
`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ingest(server, machineId, body) {
  const url = `${server.replace(/\/$/, "")}/ingest/${machineId}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.error(`  [ingest 실패] HTTP ${res.status} ${JSON.stringify(data)}`);
    }
    return { status: res.status, data };
  } catch (err) {
    console.error(`  [ingest 실패] ${err.message} — 서버가 떠 있는지 확인하세요 (${server})`);
    return null;
  }
}

function log(scenario, message) {
  console.log(`[${scenario}] ${message}`);
}

async function sendWatt(server, machineId, scenario, watt, note) {
  await ingest(server, machineId, { type: "watt", value: watt });
  log(scenario, `watt ${watt}W${note ? ` (${note})` : ""}`);
  await sleep(SIM_INTERVAL_MS);
}

async function sendDoor(server, machineId, scenario, type, note) {
  await ingest(server, machineId, { type });
  log(scenario, `${type}${note ? ` (${note})` : ""}`);
  await sleep(SIM_INTERVAL_MS);
}

// IDLE(~7W) 몇 틱 유지 — 대기 상태를 눈으로 확인
async function idlePhase(server, machineId, scenario, ticks = 3) {
  log(scenario, "IDLE 대기 (~7W)");
  for (let i = 0; i < ticks; i += 1) {
    await sendWatt(server, machineId, scenario, 7);
  }
}

// IDLE → RUNNING: 100W 이상 지속. 세탁 대역 200~300W를 여러 틱 유지
async function runningPhase(server, machineId, scenario, ticks = 5) {
  log(scenario, "IDLE → RUNNING (100W 이상 지속 시작)");
  for (let i = 0; i < ticks; i += 1) {
    const watt = 200 + Math.round(Math.random() * 100); // 200~300W, 실측 오르내림 재현
    await sendWatt(server, machineId, scenario, watt, i === 0 ? "started" : undefined);
  }
}

// RUNNING → SPIN: 500W 이상 스파이크
async function spinPhase(server, machineId, scenario) {
  const watt = 650 + Math.round(Math.random() * 150); // 500W 이상, 실측 탈수 ~800W 대역
  log(scenario, `RUNNING → SPIN (탈수 스파이크, ${watt}W)`);
  await sendWatt(server, machineId, scenario, watt);
}

// SPIN → DONE: 20W 이하가 60초 유지. 운영 5초 폴링 기준 60초 = 12틱 필요.
async function donePhase(server, machineId, scenario) {
  const TICKS_FOR_60S = 12; // 5초 간격 폴링 12회 = 60초
  log(scenario, `SPIN → DONE (20W 이하 ${TICKS_FOR_60S}회 연속 = 60초 유지 재현)`);
  for (let i = 0; i < TICKS_FOR_60S; i += 1) {
    const watt = 5 + Math.round(Math.random() * 10); // 5~15W, 실측 종료 안착값 7~9W대
    await sendWatt(server, machineId, scenario, watt);
  }
  log(scenario, "SPIN → DONE (20W 이하 유지 확인)");
}

async function runNormal(server, machineId, label) {
  await idlePhase(server, machineId, label);
  await runningPhase(server, machineId, label);
  await spinPhase(server, machineId, label);
  await donePhase(server, machineId, label);
}

async function scenarioNormal(server, machineId) {
  const label = "정상 수거";
  await runNormal(server, machineId, label);
  await sendDoor(server, machineId, label, "door_open", "고객이 수거 — DONE → COLLECTED 예상");
  log(label, "종료 (수거 완료)");
}

async function scenarioAbandoned(server, machineId) {
  const label = "방치";
  await runNormal(server, machineId, label);
  log(
    label,
    "DONE 이후 수거 신호(door_open) 없이 종료 — 서버 30분 방치 타이머는 아직 미구현이라 " +
      "여기까지만 재현 (실제 방치 판정은 T-10 이후)",
  );
}

async function scenarioNoQr(server, machineId) {
  const label = "QR 미신청 방치";
  console.log(
    `[${label}] QR 미신청 상황 가정 — subscription 테이블·QR 신청 여부는 서버(T-09) 미구현이라 ` +
      "시뮬레이터는 전력·도어 이벤트만 보낸다. 전력 패턴은 '방치' 시나리오와 동일하다.",
  );
  await runNormal(server, machineId, label);
  log(
    label,
    "DONE 이후 수거 신호 없이 종료 — QR 미신청이므로 서버 구현 후에는 " +
      "사장님 알림 + QR 랜딩 방치 안내 모드로 분기될 상황",
  );
}

async function scenarioSensorError(server, machineId) {
  const label = "센서 오류";
  await idlePhase(server, machineId, label, 2);

  log(label, "이상치 1 — 음수 watt (센서 오작동 가정)");
  await sendWatt(server, machineId, label, -42, "음수 watt, 비정상");

  log(label, "이상치 2 — 정상 범위를 벗어난 급격한 스파이크 (전력 패턴상 세탁·탈수 어느 쪽도 아님)");
  await sendWatt(server, machineId, label, 9999, "명백한 이상치");

  log(label, "이상치 3 — 신호 끊김 시뮬레이션 (일정 시간 아무 것도 보내지 않음)");
  await sleep(SIM_INTERVAL_MS * 4); // 값이 뚝 끊기는 상황 — 이 구간은 ingest 호출 자체가 없다

  log(label, "복구 — 정상 대기 전력으로 돌아옴 (7W)");
  await sendWatt(server, machineId, label, 7, "복구");

  log(
    label,
    "종료 — 이 패턴(음수/이상치 스파이크/끊김)은 향후 needsAttention 판정에 쓰일 이상 신호 재현",
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.scenario) {
    printUsage();
    process.exit(args.scenario ? 0 : 1);
  }

  if (!SCENARIOS.includes(args.scenario)) {
    console.error(`알 수 없는 시나리오: ${args.scenario} (사용 가능: ${SCENARIOS.join(", ")})`);
    printUsage();
    process.exit(1);
  }

  console.log(
    `빨래집사 전력 시뮬레이터 → server=${args.server} machine=${args.machineId} scenario=${args.scenario}\n`,
  );

  const runners = {
    normal: scenarioNormal,
    abandoned: scenarioAbandoned,
    "no-qr": scenarioNoQr,
    "sensor-error": scenarioSensorError,
  };

  await runners[args.scenario](args.server, args.machineId);

  console.log("\n시뮬레이션 종료.");
}

main();
