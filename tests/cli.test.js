import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const cli = new URL("../dist/cli.js", import.meta.url).pathname;

function run(args, cwd) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: "utf8"
  });
}

function tmpProject() {
  return mkdtempSync(join(tmpdir(), "ct-test-"));
}

test("init creates workspace files", () => {
  const cwd = tmpProject();
  const result = run(["init"], cwd);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(join(cwd, ".tricycle", "config.json")), true);
  assert.equal(existsSync(join(cwd, ".tricycle", "events.jsonl")), true);
  assert.equal(existsSync(join(cwd, ".tricycle", "state.json")), true);
});

test("plan creates a plan and updates resume state", () => {
  const cwd = tmpProject();
  const result = run([
    "plan",
    "Add docs",
    "--scope",
    "docs only",
    "--acceptance",
    "README updated",
    "--verification",
    "npm test",
    "--next",
    "review docs"
  ], cwd);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Created plan/);
  const state = JSON.parse(readFileSync(join(cwd, ".tricycle", "state.json"), "utf8"));
  assert.equal(state.goal, "Add docs");
  assert.equal(state.verification, "npm test");
  assert.equal(state.nextAction, "review docs");
  assert.equal(existsSync(state.planPath), true);
  const plan = readFileSync(state.planPath, "utf8");
  assert.match(plan, /docs only/);
  assert.match(plan, /README updated/);
});

test("layout previews compact terminal translation placement", () => {
  const cwd = tmpProject();
  const result = run(["layout", "--mode", "compact"], cwd);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Layout A - Compact footer/);
  assert.match(result.stdout, /thin card default/);
  assert.match(result.stdout, /friendly hints/);
  assert.match(result.stdout, /✦ ct context/);
  assert.match(result.stdout, /──/);
  assert.match(result.stdout, /│/);
  assert.match(result.stdout, /⚠ 에러/);
  assert.match(result.stdout, /커맨드 힌트/);
  assert.match(result.stdout, /학습 후보/);
  assert.equal(existsSync(join(cwd, ".tricycle")), false);
});

test("layout compact can still preview the softer footer style", () => {
  const cwd = tmpProject();
  const result = run(["layout", "--mode", "compact", "--style", "soft"], cwd);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /soft footer/);
  assert.match(result.stdout, /✦ ct context/);
  assert.doesNotMatch(result.stdout, /──/);
});

test("layout can preview all terminal placement options", () => {
  const cwd = tmpProject();
  const result = run(["layout"], cwd);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Layout A - Compact footer/);
  assert.match(result.stdout, /Layout B - Separate side panel/);
  assert.match(result.stdout, /Layout C - On-demand skill call/);
});

test("layout rejects unknown modes", () => {
  const cwd = tmpProject();
  const result = run(["layout", "--mode", "floating"], cwd);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /compact\|panel\|on-demand\|all/);
});

test("layout rejects unknown styles", () => {
  const cwd = tmpProject();
  const result = run(["layout", "--mode", "compact", "--style", "boxy"], cwd);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /card\|soft/);
});

test("run --preview does not execute command", () => {
  const cwd = tmpProject();
  run(["init"], cwd);
  const result = run(["run", "--preview", "npm test"], cwd);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /executed: false/);
});

test("run --safe blocks dangerous commands", () => {
  const cwd = tmpProject();
  run(["init"], cwd);
  const result = run(["run", "--safe", "rm -rf ."], cwd);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Blocked unsafe/);
});

test("run --safe captures allowlisted command", () => {
  const cwd = tmpProject();
  run(["init"], cwd);
  const result = run(["run", "--safe", "pwd"], cwd);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Safe-run: pwd/);
  const state = JSON.parse(readFileSync(join(cwd, ".tricycle", "state.json"), "utf8"));
  assert.equal(state.lastResult, "safe-run exit 0");
});

test("review and resume expose next action", () => {
  const cwd = tmpProject();
  run(["plan", "Ship skeleton"], cwd);
  const review = run(["review", "--status", "pass", "--next", "Write tests"], cwd);
  assert.equal(review.status, 0, review.stderr);
  const resume = run(["resume"], cwd);
  assert.equal(resume.status, 0, resume.stderr);
  assert.match(resume.stdout, /Goal: Ship skeleton/);
  assert.match(resume.stdout, /Next action: Write tests/);
});

test("resume stays read-only when workspace is missing", () => {
  const cwd = tmpProject();
  const resume = run(["resume"], cwd);
  assert.equal(resume.status, 0, resume.stderr);
  assert.match(resume.stdout, /Goal: \(none\)/);
  assert.match(resume.stdout, /Recent events \(last 5\):/);
  assert.equal(existsSync(join(cwd, ".tricycle")), false);
});

test("resume shows the latest five events in compact form", () => {
  const cwd = tmpProject();
  mkdirSync(join(cwd, ".tricycle"));
  writeFileSync(join(cwd, ".tricycle", "state.json"), `${JSON.stringify({
    goal: "Improve resume",
    lastCommand: "git status",
    lastResult: "safe-run exit 0",
    verification: "safe-run command completed successfully",
    nextAction: "Review output"
  }, null, 2)}\n`);
  const events = [
    { type: "init", createdAt: "2026-04-23T00:00:00.000Z" },
    { type: "plan", createdAt: "2026-04-23T00:01:00.000Z", goal: "Improve resume" },
    { type: "preview", createdAt: "2026-04-23T00:02:00.000Z", command: "npm test" },
    { type: "safe-run", createdAt: "2026-04-23T00:03:00.000Z", command: "git status" },
    { type: "review", createdAt: "2026-04-23T00:04:00.000Z", status: "pass", nextAction: "Review output" },
    { type: "preview", createdAt: "2026-04-23T00:05:00.000Z", command: "npm run build" }
  ];
  writeFileSync(join(cwd, ".tricycle", "events.jsonl"), `${events.map((event) => JSON.stringify(event)).join("\n")}\n`);

  const resume = run(["resume"], cwd);
  assert.equal(resume.status, 0, resume.stderr);
  assert.match(resume.stdout, /Goal: Improve resume/);
  assert.match(resume.stdout, /Recent events \(last 5\):/);
  assert.doesNotMatch(resume.stdout, /00:00:00\.000Z init/);
  assert.match(resume.stdout, /00:01:00\.000Z plan .*Improve resume/);
  assert.match(resume.stdout, /00:05:00\.000Z preview .*npm run build/);
  assert.match(resume.stdout, /status=pass; next=Review output/);
});

test("run blocks cwd override", () => {
  const cwd = tmpProject();
  run(["init"], cwd);
  const result = run(["run", "--safe", "--cwd", tmpdir(), "pwd"], cwd);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Blocked cwd override/);
});


test("review rejects invalid status", () => {
  const cwd = tmpProject();
  run(["init"], cwd);
  const result = run(["review", "--status", "maybe"], cwd);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /pass\|fail\|note/);
});
