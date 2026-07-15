#!/usr/bin/env node
// 빨래집사 — 동료(상대 담당)가 뭘 했는지 한눈에
// ① docs/backlog.md에서 상대 담당의 진행/완료/대기  ② 상대의 최근 git 커밋
//
// 사용법: node .claude/scripts/team-activity.mjs [담당]
//   기본은 git 사용자명으로 "나"를 정하고, 상대(동료)를 자동으로 고른다.
//   담당을 직접 주면 그 사람을 동료로 본다.

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// 두 팀원 정보 (git 로그인 ↔ 담당 이름)
const MEMBERS = {
  서원: { login: "swlog" },
  도경: { login: "do-ttery" },
};
const GIT_TO_OWNER = { swlog: "서원", "do-ttery": "도경" };

const git = (cmd) => {
  try {
    return execSync(cmd, { encoding: "utf8", cwd: root }).trim();
  } catch {
    return "";
  }
};

// 나 → 동료
const argOwner = process.argv[2];
const me = GIT_TO_OWNER[git("git config user.name")] || "서원";
const mate = argOwner || (me === "서원" ? "도경" : "서원");
const mateLogin = MEMBERS[mate]?.login;

// --- 백로그에서 동료 담당 태스크 뽑기 ---
const DOING = "🟡", DONE = "✅", TODO = "⬜";
let rows = [];
try {
  const md = readFileSync(join(root, "docs", "backlog.md"), "utf8");
  for (const line of md.split("\n")) {
    if (!/^\|\s*T-\d+\s*\|/.test(line)) continue;
    const c = line.split("|").slice(1, -1).map((x) => x.trim());
    if (c.length < 7) continue;
    rows.push({ id: c[0], task: c[1], owner: c[3], status: c[6] });
  }
} catch {}

const mine = rows.filter((r) => r.owner.includes(mate) || r.owner.includes("공동"));
const byStatus = (emoji) => mine.filter((r) => r.status.startsWith(emoji));
const short = (r) => `${r.id}  ${r.task.replace(/\*\*/g, "").slice(0, 46)}`;

// --- 동료의 최근 커밋 (모든 브랜치) ---
const commits = mateLogin
  ? git(`git log --all --author=${mateLogin} --pretty=format:'%h|%cr|%s' -n 12`)
  : "";

// --- 출력 ---
const out = [];
out.push(`🧺 ${mate}님이 하고 있는 일, 정리해 두었습니다.`);
out.push("");

const doing = byStatus(DOING);
if (doing.length) {
  out.push("▶ 진행 중 (🟡)");
  for (const r of doing) out.push(`  · ${short(r)}`);
  out.push("");
}
const done = byStatus(DONE);
if (done.length) {
  out.push("✅ 완료");
  for (const r of done) out.push(`  · ${short(r)}`);
  out.push("");
}
const todo = byStatus(TODO);
if (todo.length) {
  out.push("⬜ 대기");
  for (const r of todo) out.push(`  · ${short(r)}`);
  out.push("");
}

out.push(`🔨 최근 커밋 (${mate})`);
if (commits) {
  for (const line of commits.split("\n")) {
    const [h, when, ...msg] = line.split("|");
    out.push(`  · ${h}  ${msg.join("|")}  (${when})`);
  }
} else {
  out.push("  · 커밋 기록 없음 (아직 푸시 전이거나 브랜치 미공유)");
}

console.log(out.join("\n"));
