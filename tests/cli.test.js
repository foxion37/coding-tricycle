import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
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
