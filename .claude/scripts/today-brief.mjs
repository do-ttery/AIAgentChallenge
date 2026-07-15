#!/usr/bin/env node
// 빨래집사 — 세션 시작 "오늘 할 일" 브리핑
// docs/backlog.md의 상태 열을 읽어 서원(swlog)이 이어서 할 일을 골라 출력한다.
// SessionStart 훅과 /오늘 스킬이 같은 이 스크립트를 쓴다 (단일 진실 원천).
//
// 사용법: node .claude/scripts/today-brief.mjs [담당] [--hook]
//   담당 기본값은 "서원". "도경"을 넘기면 도경 기준으로 뽑는다.
//   --hook: SessionStart 훅용. 브리핑을 additionalContext JSON으로 감싸 출력한다.

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const argv = process.argv.slice(2);
const HOOK_MODE = argv.includes("--hook");

// 담당: ① 인자로 준 이름 > ② git 사용자명 매핑 > ③ 기본 "서원"
// git user.name swlog → 서원, do-ttery → 도경.
const GIT_TO_OWNER = { swlog: "서원", "do-ttery": "도경" };
const detectOwner = () => {
  try {
    const name = execSync("git config user.name", { encoding: "utf8" }).trim();
    return GIT_TO_OWNER[name] || null;
  } catch {
    return null;
  }
};
const OWNER = argv.find((a) => !a.startsWith("--")) || detectOwner() || "서원";

// 최종 출력 — 훅 모드면 additionalContext JSON으로 감싼다.
const emit = (text) => {
  if (!HOOK_MODE) {
    console.log(text);
    return;
  }
  const context =
    "세션 시작 브리핑입니다. 아래 '오늘 할 일'을 사용자에게 집사 말투로 가볍게 먼저 전하세요 " +
    "(CLAUDE.md 집사 말투 규칙). 근거는 docs/backlog.md입니다.\n\n" +
    text;
  console.log(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: context,
      },
    }),
  );
};
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const backlogPath = join(root, "docs", "backlog.md");

let md;
try {
  md = readFileSync(backlogPath, "utf8");
} catch {
  console.log("🧺 백로그(docs/backlog.md)를 찾지 못했습니다. 경로를 확인해 주세요.");
  process.exit(0);
}

// 현재 주차 — 로드맵 코드블록의 "N주차 ... ← 지금" 표식에서 뽑는다.
const nowWeek = (md.match(/(\d)\s*주차[^\n]*←\s*지금/) || [])[1] || null;

// 상태 이모지
const DONE = "✅", DOING = "🟡", TODO = "⬜", DROP = "➖";

// 표 행 파싱: | T-01 | Task | 우선 | 담당 | 주차 | 의존 | 상태 |
const rows = [];
for (const line of md.split("\n")) {
  const m = line.match(/^\|\s*(T-\d+)\s*\|(.+)\|\s*$/);
  if (!m) continue;
  const cells = line.split("|").slice(1, -1).map((c) => c.trim());
  if (cells.length < 7) continue;
  const [id, task, pri, owner, week, dep, status] = cells;
  rows.push({ id, task, pri, owner, week, dep, status });
}

const mine = rows.filter((r) => r.owner.includes(OWNER) || r.owner.includes("공동"));
const priRank = (p) => ({ P0: 0, P1: 1, P2: 2 }[p] ?? 9);

const doing = mine
  .filter((r) => r.status.startsWith(DOING))
  .sort((a, b) => priRank(a.pri) - priRank(b.pri));

const todo = mine
  .filter((r) => r.status.startsWith(TODO))
  .filter((r) => (nowWeek ? r.week === nowWeek : r.pri === "P0"))
  .sort((a, b) => priRank(a.pri) - priRank(b.pri));

// 사람이 읽는 짧은 상태(뒤에 붙은 메모까지 살림)
const short = (r) => {
  const note = r.status.replace(/^(?:✅|🟡|⬜|➖)\s*/u, "").trim();
  const label = r.status.startsWith(DOING) ? "진행" : "대기";
  return note ? `${label} · ${note}` : label;
};

const today = new Date().toISOString().slice(0, 10);
const out = [];
out.push(`🧺 안녕하세요 ${OWNER}님. 오늘(${today}) 할 일 정리해 두었습니다.`);
out.push(nowWeek ? `지금 ${nowWeek}주차입니다.` : "");
out.push("");

if (doing.length) {
  out.push("▶ 이어서 진행 (🟡)");
  for (const r of doing) out.push(`  · ${r.id}  ${r.task}  [${r.pri}] — ${short(r)}`);
  out.push("");
}
if (todo.length) {
  out.push(nowWeek ? `▷ ${nowWeek}주차 대기 (⬜)` : "▷ 남은 P0 (⬜)");
  for (const r of todo) out.push(`  · ${r.id}  ${r.task}  [${r.pri}]`);
  out.push("");
}
if (!doing.length && !todo.length) {
  out.push(`${OWNER}님 몫으로 열려 있는 일이 없습니다. 백로그를 재정렬할 때가 됐는지도 모르겠습니다.`);
}

const top = doing[0] || todo[0];
if (top) out.push(`가장 급한 건 ${top.id}입니다. 무엇부터 도와드릴까요?`);

emit(out.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n"));
