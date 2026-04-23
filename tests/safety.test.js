import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeCommand, redactSecrets, tokenizeCommand } from "../dist/safety.js";

test("tokenizeCommand keeps quoted args together", () => {
  assert.deepEqual(tokenizeCommand('npm run "build docs"'), ["npm", "run", "build docs"]);
});

test("preview-safe command is allowlisted", () => {
  const analysis = analyzeCommand("git status", process.cwd());
  assert.equal(analysis.risk, "safe");
  assert.equal(analysis.safeRunEligible, true);
});

test("dangerous command is not safe-run eligible", () => {
  const analysis = analyzeCommand("rm -rf .", process.cwd());
  assert.equal(analysis.risk, "dangerous");
  assert.equal(analysis.safeRunEligible, false);
  assert.match(analysis.reasons.join(";"), /destructive command/);
});

test("secret paths are blocked", () => {
  const analysis = analyzeCommand("cat .env", process.cwd());
  assert.equal(analysis.risk, "dangerous");
  assert.equal(analysis.safeRunEligible, false);
});

test("redactSecrets masks token-like assignments", () => {
  const output = redactSecrets("OPENAI_API_KEY=sk-abcdefghijklmnopqrstuvwxyz1234567890");
  assert.equal(output, "OPENAI_API_KEY=<redacted>");
});
