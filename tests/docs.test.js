import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("README keeps the agreed positioning and command flow", () => {
  const readme = read("README.md");
  assert.match(readme, /CLI-first coding sidecar/);
  assert.match(readme, /Less autopilot, more balance/);
  for (const command of ["ct init", "ct plan", "ct run --preview", "ct run --safe", "ct review", "ct resume"]) {
    assert.match(readme, new RegExp(command));
  }
});

test("safety docs state destructive execution is out of scope", () => {
  const safety = read("docs/safety-model.md");
  assert.match(safety, /Destructive execute/);
  assert.match(safety, /not part of v1/);
});
