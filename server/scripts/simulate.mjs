#!/usr/bin/env node
/**
 * 빨래집사 전력 시뮬레이터 (T-21, T-22 통합 테스트 보강)
 *
 * 실제 매장에서는 `power_poll.py`(T-04, 도경 담당)가 Tapo P110M에서 읽은 W값을
 * `POST /ingest/:machineId` 로 5초 간격 전송한다. 이 스크립트는 같은 엔드포인트로
 * 가짜 데이터를 주입해 상태머신(T-10)·방치 대응(T-11)·알림(T-12) 흐름을 눈으로
 * 확인하기 위한 것이다.
 *
 * 개발 경로 == 운영 경로. 시뮬레이터도 별도 API 없이 같은
 * POST /ingest/:machineId 를 쓴다. subscription 생성도 화면(T-18)이 실제로
 * 호출하는 POST /api/subscriptions 그대로 쓴다 — DB에 직접 쓰지 않는다.
 *
 * 임계값은 CLAUDE.md/실측 문서(server/scripts/실측_20260715.md)에 확정된 값을
 * services/constants.js 에서 그대로 가져와 쓴다. 시뮬레이터가 값을 따로 정의하거나
 * 임의로 바꾸지 않는다.
 *   IDLE 대기        ~7W (문서 참고용, 상수화 안 됨 — 상태 판정에 쓰이지 않는 표시값)
 *   IDLE → RUNNING   START_W(100W) 이상 지속
 *   RUNNING → SPIN   SPIN_W(500W) 이상 스파이크
 *   SPIN → DONE      DONE_W(20W) 이하가 DONE_HOLD_SEC(60초) 유지
 *
 * 표준 코스는 실제로 35분 걸리지만, 시뮬레이터는 그만큼 기다리지 않는다.
 * IDLE→RUNNING·RUNNING→SPIN은 hold 조건이 없는 즉시 전이라(CLAUDE.md
 * 2026-07-20 결정) 압축된 시간으로 빠르게 흘려보낸다.
 *
 * 단 SPIN→DONE은 상태머신이 실제 벽시계 시간(Date.now())으로 60초 유지를
 * 재므로 압축할 수 없다 — 이 구간(donePhase)만 실제 5초 간격으로 약
 * 65초를 기다린 뒤 DONE 전이를 확인한다.
 *
 * DONE 이후 방치(ABANDONED) 판정도 마찬가지로 서버(abandonment.js, T-11)가 실제
 * 시간으로 30분을 잰다. 이 스크립트는 그 시간을 앞당기지 않는다 — 필요하면
 * 서버 프로세스를 띄울 때 테스트 전용 env로 재정의한다 (아래 ABANDON GUIDE, 또는
 * `--help` 참고). 기본값(30분/30분)은 CLAUDE.md 그대로다.
 *
 * ────────────────────────────────────────────────────────────────
 * 사용법
 *   node server/scripts/simulate.mjs --list
 *   node server/scripts/simulate.mjs --scenario normal --machine-id <uuid>
 *   node server/scripts/simulate.mjs --scenario abandoned --machine-name "세탁기 3"
 *   node server/scripts/simulate.mjs --scenario no-qr --machine-name "세탁기 3"
 *   node server/scripts/simulate.mjs --scenario sensor-error --machine-name "세탁기 3"
 * ────────────────────────────────────────────────────────────────
 */

import { START_W, SPIN_W, DONE_W, DONE_HOLD_SEC } from "../services/constants.js";

const DEFAULT_SERVER = "http://localhost:3000";

// 폴링 간격을 그대로 쓰면 35분짜리 코스를 기다려야 하니, 신호 사이 실제
// 대기 시간만 압축한다(배속). 신호 "개수"는 임계값의 지속·유지 조건을
// 만족하도록 그대로 둔다 — 즉 값·개수는 실측/스펙 그대로, 시간만 빠르게.
//
// 단, SPIN → DONE 만은 이 배속이 통하지 않는다. 상태머신(stateMachine.js
// trackDoneHold)이 실제 벽시계 Date.now()로 DONE_HOLD_SEC(60초) 경과를 재기
// 때문에, 신호를 아무리 많이 보내도 실제 시간이 흐르지 않으면 DONE에 영영
// 도달하지 못한다. 이 구간의 "유지 시간"을 지어내서 압축하면 검증 자체가
// 거짓이 되므로(실측 없이 숫자를 만들지 않는다는 프로젝트 원칙과도 배치),
// donePhase()만 예외적으로 실제 시간을 기다린다.
const SIM_INTERVAL_MS = 300; // 운영 5초 폴링 1회 = 시뮬레이터 300ms (hold 없는 전이용)
const DONE_REAL_INTERVAL_MS = 5000; // SPIN → DONE 구간은 운영과 동일한 5초 간격을 실제로 기다림
const DONE_TICKS = Math.ceil(DONE_HOLD_SEC / (DONE_REAL_INTERVAL_MS / 1000)) + 1; // 60초 → 13틱

const SCENARIOS = ["normal", "abandoned", "no-qr", "sensor-error"];

function parseArgs(argv) {
  const args = { scenario: null, machineId: null, machineName: null, server: DEFAULT_SERVER, list: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--scenario") args.scenario = argv[++i];
    else if (arg === "--machine-id") args.machineId = argv[++i];
    else if (arg === "--machine-name") args.machineName = argv[++i];
    else if (arg === "--server") args.server = argv[++i];
    else if (arg === "--list") args.list = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
  }
  return args;
}

function printUsage() {
  console.log(`
빨래집사 전력 시뮬레이터 (T-21 / T-22)

사용법:
  node server/scripts/simulate.mjs --list [--server http://localhost:3000]
  node server/scripts/simulate.mjs --scenario <시나리오> (--machine-id <uuid> | --machine-name "세탁기 3") [--server http://localhost:3000]

기계 지정 (둘 중 하나 필수 — 실 서버는 Supabase uuid만 받는다. "m1" 같은 리터럴은 더 이상 통하지 않는다):
  --machine-id <uuid>        GET /api/machines 로 확인한 실제 machine.id
  --machine-name "세탁기 3"   machine.name 으로 조회해 uuid를 대신 찾는다
  --list                     서버에 등록된 기계 목록(id·name·status)만 출력하고 종료

시나리오:
  normal        ① 정상 수거   — IDLE → RUNNING → SPIN → DONE → door_open(수거) → COLLECTED
  abandoned     ② QR 신청 방치 — 위와 동일하게 진행하되 DONE 진입 "전" 세션에 POST /api/subscriptions로
                  QR 알림 신청을 걸어두고, 수거 신호 없이 DONE으로 끝낸다.
                  서버의 실제 30분 방치 타이머(abandonment.js)가 지나면 ABANDONED → COLLECT_1
                  (→ 다시 30분 후 COLLECT_2)이 자동 발생한다. 이 스크립트는 그 시간을 대신 기다리지 않는다.
  no-qr         ③ QR 미신청 방치 — subscription을 만들지 않고 DONE까지만 진행, 수거 신호 없이 종료.
                  서버 방치 타이머가 지나면 ABANDONED → OWNER_ALERT가 발생한다(구독 채널이 없으므로).
  sensor-error  센서 오류   — 음수 watt · 값 끊김 · 이상치 스파이크

④ 대시보드 확인은 별도 시나리오가 아니라, 위 ①~③을 돌린 뒤
   GET /api/machines · GET /api/machines/:id · GET /api/notifications/recent 로 조회해서 확인한다.

방치 타이머(30분)를 실제로 기다리기 어려우면, 서버를 띄울 때 테스트 전용 env로만 앞당길 수 있다
(기본값 30/30분은 CLAUDE.md 그대로 유지되고, 이 env가 있을 때만 재정의된다 — services/constants.js 참고):
  TEST_ABANDONED_AFTER_MIN=1 TEST_COLLECT_REMINDER_INTERVAL_MIN=1 node server/index.js

예시:
  node server/scripts/simulate.mjs --list
  node server/scripts/simulate.mjs --scenario normal --machine-name "세탁기 3"
  node server/scripts/simulate.mjs --scenario abandoned --machine-id 3f6b1a2e-....
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

// QR 알림 신청 재현 (T-18이 실제로 부르는 POST /api/subscriptions 그대로 사용).
// endpoint/keys는 실제 Web Push 자격이 아니라 가짜 값이다 — 이 스크립트의 목적은
// "subscription row가 생겨서 DONE→ABANDONED 분기가 QR 신청 쪽으로 타는지"만 확인하는 것.
// 실제 push 수신까지 보려면 client/의 실 브라우저 구독이 필요하다(범위 밖).
async function subscribeSession(server, sessionId, scenario) {
  const url = `${server.replace(/\/$/, "")}/api/subscriptions`;
  const body = {
    sessionId,
    endpoint: `https://fake-push.simulate.local/${sessionId}`,
    keys: { p256dh: "simulated-p256dh", auth: "simulated-auth" },
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.error(`  [subscribe 실패] HTTP ${res.status} ${JSON.stringify(data)}`);
      return null;
    }
    log(scenario, `QR 알림 신청 완료 (session ${sessionId}) — 방치 시 COLLECT_1/2 대상이 됩니다`);
    return data;
  } catch (err) {
    console.error(`  [subscribe 실패] ${err.message} — 서버가 떠 있는지 확인하세요 (${server})`);
    return null;
  }
}

async function fetchMachines(server) {
  const url = `${server.replace(/\/$/, "")}/api/machines`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET /api/machines 실패: HTTP ${res.status}`);
  return res.json();
}

function formatMachineList(machines) {
  if (!machines.length) return "  (등록된 기계 없음 — server/db/schema.sql 시드가 실행됐는지 확인하세요)";
  return machines.map((m) => `  ${m.id}  ${m.name}  (${m.status})`).join("\n");
}

// --machine-id / --machine-name 중 하나로 실제 uuid를 확정한다.
// 기본값 "m1"(SQLite 시절 리터럴)은 더 이상 두지 않는다 — 실 서버(Supabase)에 쏘면
// uuid 형식 검증에서 걸려 404/500이 나므로, 반드시 GET /api/machines로 확인한 값을 쓰게 한다.
async function resolveMachineId(server, args) {
  if (args.machineId) return args.machineId;

  const machines = await fetchMachines(server);

  if (args.machineName) {
    const found = machines.find((m) => m.name === args.machineName);
    if (!found) {
      throw new Error(
        `--machine-name "${args.machineName}" 과 일치하는 기계가 없습니다.\n사용 가능한 기계:\n${formatMachineList(machines)}`,
      );
    }
    return found.id;
  }

  throw new Error(
    `--machine-id 또는 --machine-name 이 필요합니다 (기본값 "m1"은 더 이상 지원하지 않습니다 — 실 서버는 uuid만 받습니다).\n` +
      `사용 가능한 기계:\n${formatMachineList(machines)}\n\n` +
      `--machine-id <uuid> 또는 --machine-name "세탁기 3" 로 지정하세요.\n` +
      `(CLAUDE.md 2026-07-27 결정: MVP 검증 대상은 20kg인 세탁기 3·4 — --list로 확인 후 그 uuid를 쓰세요)`,
  );
}

function log(scenario, message) {
  console.log(`[${scenario}] ${message}`);
}

async function sendWatt(server, machineId, scenario, watt, note, intervalMs = SIM_INTERVAL_MS) {
  const result = await ingest(server, machineId, { type: "watt", value: watt });
  log(scenario, `watt ${watt}W${note ? ` (${note})` : ""}`);
  await sleep(intervalMs);
  return result;
}

async function sendDoor(server, machineId, scenario, type, note) {
  await ingest(server, machineId, { type });
  log(scenario, `${type}${note ? ` (${note})` : ""}`);
  await sleep(SIM_INTERVAL_MS);
}

// IDLE(~7W) 몇 틱 유지 — 대기 상태를 눈으로 확인. 이 값은 상태 판정에 쓰이지
// 않는 표시용 대기 전력이라 constants.js에 상수화돼 있지 않다(문서 참고치).
async function idlePhase(server, machineId, scenario, ticks = 3) {
  log(scenario, "IDLE 대기 (~7W)");
  for (let i = 0; i < ticks; i += 1) {
    await sendWatt(server, machineId, scenario, 7);
  }
}

// IDLE → RUNNING: START_W 이상 지속. 세탁 대역(실측 200~300W)을 여러 틱 유지.
// 상태머신은 이 중 첫 틱(status=IDLE → RUNNING 전이)에서만 session을 생성하고
// 응답에 sessionId를 실어준다 — 이후 QR 구독을 걸 때 그 값을 그대로 쓴다.
async function runningPhase(server, machineId, scenario, ticks = 5) {
  log(scenario, `IDLE → RUNNING (${START_W}W 이상 지속 시작)`);
  let sessionId;
  for (let i = 0; i < ticks; i += 1) {
    const watt = START_W + 100 + Math.round(Math.random() * 100); // START_W 이상, 실측 세탁 대역 재현
    const result = await sendWatt(server, machineId, scenario, watt, i === 0 ? "started" : undefined);
    if (i === 0 && result?.data?.sessionId) {
      sessionId = result.data.sessionId;
      log(scenario, `세션 생성 확인 (sessionId=${sessionId})`);
    }
  }
  return sessionId;
}

// RUNNING → SPIN: SPIN_W 이상 스파이크
async function spinPhase(server, machineId, scenario) {
  const watt = SPIN_W + 150 + Math.round(Math.random() * 150); // SPIN_W 이상, 실측 탈수 대역 재현
  log(scenario, `RUNNING → SPIN (탈수 스파이크, ${watt}W)`);
  await sendWatt(server, machineId, scenario, watt);
}

// SPIN → DONE: DONE_W 이하가 DONE_HOLD_SEC(60초) 유지. 상태머신이 실제 시간을 재므로
// 이 구간은 압축하지 않고 운영과 동일한 5초 간격으로 실제로 기다린다.
async function donePhase(server, machineId, scenario) {
  const totalSec = Math.round((DONE_TICKS * DONE_REAL_INTERVAL_MS) / 1000);
  log(
    scenario,
    `SPIN → DONE (${DONE_W}W 이하 ${DONE_HOLD_SEC}초 유지 판정 — 상태머신이 실제 시간을 측정하므로 ` +
      `이 구간은 압축 없이 실제로 기다립니다, 약 ${totalSec}초 소요)`,
  );
  for (let i = 0; i < DONE_TICKS; i += 1) {
    const watt = 5 + Math.round(Math.random() * (DONE_W - 10)); // DONE_W 이하, 실측 종료 안착값 재현
    await sendWatt(server, machineId, scenario, watt, `${i + 1}/${DONE_TICKS}`, DONE_REAL_INTERVAL_MS);
  }
  log(scenario, `SPIN → DONE (${DONE_W}W 이하 유지 확인)`);
}

// IDLE → RUNNING → SPIN 까지 진행하고 session id를 반환한다 (DONE 이전에 QR
// 구독을 걸어야 하는 시나리오 ②를 위해 donePhase와 분리해뒀다).
async function runThroughSpin(server, machineId, scenario) {
  await idlePhase(server, machineId, scenario);
  const sessionId = await runningPhase(server, machineId, scenario);
  await spinPhase(server, machineId, scenario);
  return sessionId;
}

// DONE 도달 후 방치 시나리오(②③) 공통 안내. 이 스크립트는 서버의 실제 30분
// 타이머(abandonment.js ABANDONED_AFTER_MIN)를 앞당기지 않는다 — 실측 없이 시간을
// 지어내지 않는다는 원칙, 그리고 방치 판정 자체가 "실제 30분 경과"라는 스펙이라서다.
function logAbandonGuidance(scenario, { hasSubscription }) {
  console.log(`
[${scenario}] DONE 도달 — 수거 신호(door_open) 없이 여기서 멈춥니다.
서버는 DONE 진입 시점에 이미 방치 타이머를 걸어뒀습니다 (services/abandonment.js scheduleAbandonCheck).
기본값은 CLAUDE.md 그대로 30분(ABANDONED_AFTER_MIN)이고, 이 스크립트는 그 시간을 대신 기다리지 않습니다.

확인 방법 (둘 중 하나):
  1) 실제 시간으로 기다린 뒤 확인
     - 30분 후: GET /api/machines/:id 의 status/session.state 가 ABANDONED 인지
     - notification 테이블/GET /api/notifications/recent 에 ${hasSubscription ? "COLLECT_1" : "OWNER_ALERT"} 이 찍혔는지
     ${hasSubscription ? "- 다시 30분 후(COLLECT_REMINDER_INTERVAL_MIN): COLLECT_2 도 찍히는지" : ""}
  2) 서버를 테스트 전용 env로 띄워 앞당겨 확인 (기본 30분은 그대로 두고, 이 env가 있을 때만 재정의됨)
     TEST_ABANDONED_AFTER_MIN=1 TEST_COLLECT_REMINDER_INTERVAL_MIN=1 node server/index.js
`);
}

async function scenarioNormal(server, machineId) {
  const label = "정상 수거";
  await runThroughSpin(server, machineId, label);
  await donePhase(server, machineId, label);
  await sendDoor(server, machineId, label, "door_open", "고객이 수거 — DONE → COLLECTED 예상");
  log(label, "종료 (수거 완료)");
}

async function scenarioAbandoned(server, machineId) {
  const label = "QR 신청 방치";
  const sessionId = await runThroughSpin(server, machineId, label);
  if (sessionId) {
    await subscribeSession(server, sessionId, label);
  } else {
    log(
      label,
      "경고: ingest 응답에서 sessionId를 받지 못해 subscription을 만들 수 없습니다 " +
        "(IDLE → RUNNING 전이가 실제로 일어났는지 서버 로그를 확인하세요)",
    );
  }
  await donePhase(server, machineId, label);
  logAbandonGuidance(label, { hasSubscription: Boolean(sessionId) });
}

async function scenarioNoQr(server, machineId) {
  const label = "QR 미신청 방치";
  log(label, "QR 미신청 상황 재현 — subscription 없이 진행합니다 (알림 채널 없음 → 방치 시 OWNER_ALERT 예상)");
  await runThroughSpin(server, machineId, label);
  await donePhase(server, machineId, label);
  logAbandonGuidance(label, { hasSubscription: false });
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

  if (args.help) {
    printUsage();
    process.exit(0);
  }

  if (args.list) {
    try {
      const machines = await fetchMachines(args.server);
      console.log(`등록된 기계 (server=${args.server}):\n${formatMachineList(machines)}`);
      process.exit(0);
    } catch (err) {
      console.error(`[list] 실패: ${err.message}`);
      process.exit(1);
    }
  }

  if (!args.scenario) {
    printUsage();
    process.exit(1);
  }

  if (!SCENARIOS.includes(args.scenario)) {
    console.error(`알 수 없는 시나리오: ${args.scenario} (사용 가능: ${SCENARIOS.join(", ")})`);
    printUsage();
    process.exit(1);
  }

  let machineId;
  try {
    machineId = await resolveMachineId(args.server, args);
  } catch (err) {
    console.error(`\n${err.message}\n`);
    process.exit(1);
  }

  console.log(
    `빨래집사 전력 시뮬레이터 → server=${args.server} machine=${machineId} scenario=${args.scenario}\n`,
  );

  const runners = {
    normal: scenarioNormal,
    abandoned: scenarioAbandoned,
    "no-qr": scenarioNoQr,
    "sensor-error": scenarioSensorError,
  };

  await runners[args.scenario](args.server, machineId);

  console.log("\n시뮬레이션 종료.");
}

main();
