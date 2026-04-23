import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("README keeps the agreed positioning and command flow", () => {
  const readme = read("README.md");
  assert.match(readme, /CLI-first coding sidecar/);
  assert.match(readme, /완전 자동 조종보다는 균형/);
  assert.match(readme, /사용자의 주도권을 유지/);
  for (const command of ["ct init", "ct plan", "ct run --preview", "ct run --safe", "ct review", "ct resume"]) {
    assert.match(readme, new RegExp(command));
  }
});

test("safety docs state destructive execution is out of scope", () => {
  const safety = read("docs/safety-model.md");
  assert.match(safety, /Destructive execute/);
  assert.match(safety, /v1 범위가 아닙니다/);
  assert.match(safety, /resume은 read-only/);
});

test("public docs are Korean-first and keep the public boundary", () => {
  const prd = read("docs/prd.md");
  const operating = read("docs/operating-model.md");
  assert.match(prd, /제품 요구사항/);
  assert.match(prd, /사용자가 주도권을 잃지 않도록/);
  assert.match(operating, /공개 문서/);
  assert.match(operating, /내부 session handoff 원문/);
});
