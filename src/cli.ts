#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { analyzeCommand, redactSecrets, tokenizeCommand } from "./safety.js";
import { appendEvent, ensureWorkspace, readState, updateState, workspaceDir } from "./workspace.js";

const helpText = `Coding Tricycle (ct)

Usage:
  ct init
  ct plan "Task description" [--scope "..."] [--acceptance "..."]
  ct run --preview "npm test"
  ct run --safe "git status"
  ct review [--status pass|fail|note] [--next "Next action"]
  ct resume

v1 is limited to planning, preview, allowlisted safe-run, review, and resume.
Destructive execution is intentionally out of scope.
`;

function main(argv = process.argv.slice(2)): number {
  const [command, ...rest] = argv;

  try {
    switch (command) {
      case undefined:
      case "--help":
      case "-h":
      case "help":
        process.stdout.write(helpText);
        return 0;
      case "init":
        return initCommand();
      case "plan":
        return planCommand(rest);
      case "run":
        return runCommand(rest);
      case "review":
        return reviewCommand(rest);
      case "resume":
        return resumeCommand();
      default:
        process.stderr.write(`Unknown command: ${command}\n\n${helpText}`);
        return 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`ct error: ${message}\n`);
    return 1;
  }
}

function initCommand(): number {
  const dir = ensureWorkspace();
  appendEvent({ type: "init", workspace: basename(dir) });
  process.stdout.write(`Initialized Coding Tricycle workspace at ${dir}\n`);
  return 0;
}

function planCommand(args: string[]): number {
  const parsed = parseArgs({
    args,
    allowPositionals: true,
    options: {
      scope: { type: "string" },
      "non-goals": { type: "string" },
      acceptance: { type: "string" },
      verification: { type: "string" },
      next: { type: "string" }
    }
  });

  const goal = parsed.positionals.join(" ").trim();
  if (!goal) {
    process.stderr.write('Usage: ct plan "Task description" [--scope "..."] [--acceptance "..."] [--verification "..."] [--next "..."]\n');
    return 1;
  }

  const scope = String(parsed.values.scope ?? "TODO: define the smallest useful slice.");
  const nonGoals = String(parsed.values["non-goals"] ?? "TODO: list what should not be done now.");
  const acceptance = String(parsed.values.acceptance ?? "TODO: define how completion will be checked.");
  const verification = String(parsed.values.verification ?? "TODO: add the command or manual check that proves the result.");
  const nextAction = String(parsed.values.next ?? "Choose the next small step.");

  const dir = ensureWorkspace();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const planPath = join(dir, "plans", `${timestamp}.md`);
  const content = `# Coding Tricycle Plan

## Goal

${goal}

## Scope

- ${scope}

## Non-goals

- ${nonGoals}

## Acceptance Criteria

- ${acceptance}

## Verification

- ${verification}

## Next Action

- ${nextAction}
`;

  writeFileSync(planPath, content);
  appendEvent({ type: "plan", goal, planPath, scope, nonGoals, acceptance, verification, nextAction });
  updateState({ goal, planPath, verification, nextAction });
  process.stdout.write(`Created plan: ${planPath}\n`);
  return 0;
}

function runCommand(args: string[]): number {
  const parsed = parseArgs({
    args,
    allowPositionals: true,
    options: {
      preview: { type: "boolean", default: false },
      safe: { type: "boolean", default: false },
      cwd: { type: "string" }
    }
  });

  const commandText = parsed.positionals.join(" ").trim();
  const preview = parsed.values.preview === true;
  const safe = parsed.values.safe === true;
  const requestedCwd = typeof parsed.values.cwd === "string" ? resolve(parsed.values.cwd) : process.cwd();

  if (requestedCwd !== process.cwd()) {
    process.stderr.write("Blocked cwd override: v1 only runs previews and safe-run commands in the current project directory.\n");
    return 2;
  }

  if (!commandText || preview === safe) {
    process.stderr.write('Usage: ct run --preview "npm test" OR ct run --safe "git status"\n');
    return 1;
  }

  ensureWorkspace();
  const analysis = analyzeCommand(commandText);

  if (preview) {
    appendEvent({ type: "preview", command: commandText, analysis });
    updateState({ lastCommand: commandText, lastResult: "previewed", verification: describeAnalysis(analysis) });
    process.stdout.write(formatPreview(commandText, analysis));
    return 0;
  }

  if (!analysis.safeRunEligible) {
    appendEvent({ type: "safe-run-blocked", command: commandText, analysis });
    updateState({ lastCommand: commandText, lastResult: "blocked", verification: describeAnalysis(analysis) });
    process.stderr.write(`Blocked unsafe or non-allowlisted command: ${commandText}\n${describeAnalysis(analysis)}\n`);
    return 2;
  }

  const tokens = tokenizeCommand(commandText);
  const result = spawnSync(tokens[0], tokens.slice(1), {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: false
  });

  const stdout = redactSecrets(result.stdout ?? "");
  const stderr = redactSecrets(result.stderr ?? "");
  const exitCode = typeof result.status === "number" ? result.status : 1;
  const summary = { exitCode, stdout, stderr };

  appendEvent({ type: "safe-run", command: commandText, analysis, result: summary });
  updateState({
    lastCommand: commandText,
    lastResult: `safe-run exit ${exitCode}`,
    verification: exitCode === 0 ? "safe-run command completed successfully" : "safe-run command completed with non-zero exit code"
  });

  process.stdout.write(`Safe-run: ${commandText}\nExit code: ${exitCode}\n`);
  if (stdout) process.stdout.write(`\nstdout:\n${stdout}`);
  if (stderr) process.stderr.write(`\nstderr:\n${stderr}`);
  return exitCode;
}

function reviewCommand(args: string[]): number {
  const parsed = parseArgs({
    args,
    allowPositionals: true,
    options: {
      status: { type: "string", default: "note" },
      next: { type: "string", default: "Choose the next small step." }
    }
  });

  const status = String(parsed.values.status ?? "note");
  if (!["pass", "fail", "note"].includes(status)) {
    process.stderr.write("Usage: ct review --status pass|fail|note [--next \"Next action\"]\n");
    return 1;
  }
  const nextAction = String(parsed.values.next ?? "Choose the next small step.");
  appendEvent({ type: "review", status, nextAction });
  updateState({ verification: `review status: ${status}`, nextAction });
  process.stdout.write(`Review recorded: ${status}\nNext action: ${nextAction}\n`);
  return 0;
}

function resumeCommand(): number {
  ensureWorkspace();
  const state = readState();
  process.stdout.write(`Coding Tricycle resume\n\n`);
  process.stdout.write(`Goal: ${state.goal ?? "(none)"}\n`);
  process.stdout.write(`Plan: ${state.planPath ?? "(none)"}\n`);
  process.stdout.write(`Last command: ${state.lastCommand ?? "(none)"}\n`);
  process.stdout.write(`Last result: ${state.lastResult ?? "(none)"}\n`);
  process.stdout.write(`Verification: ${state.verification ?? "(none)"}\n`);
  process.stdout.write(`Next action: ${state.nextAction ?? "(none)"}\n`);
  process.stdout.write(`Workspace: ${workspaceDir()}\n`);
  return 0;
}

function describeAnalysis(analysis: ReturnType<typeof analyzeCommand>): string {
  const reasons = analysis.reasons.length > 0 ? analysis.reasons.join("; ") : "no risk reasons";
  return `risk=${analysis.risk}; safeRunEligible=${analysis.safeRunEligible}; reasons=${reasons}`;
}

function formatPreview(commandText: string, analysis: ReturnType<typeof analyzeCommand>): string {
  return [
    `Preview: ${commandText}`,
    `cwd: ${analysis.cwd}`,
    `command: ${analysis.command}`,
    `args: ${JSON.stringify(analysis.args)}`,
    describeAnalysis(analysis),
    "executed: false",
    ""
  ].join("\n");
}

const exitCode = main();
process.exitCode = exitCode;
