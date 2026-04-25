#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { analyzeCommand, redactSecrets, tokenizeCommand } from "./safety.js";
import { appendEvent, ensureWorkspace, readRecentEvents, readState, updateState, workspaceDir } from "./workspace.js";

const helpText = `Coding Tricycle (ct)

Usage:
  ct init
  ct plan "Task description" [--scope "..."] [--acceptance "..."]
  ct layout [--mode compact|panel|on-demand|all] [--style card|soft]
  ct explain --stdin [--style card|soft]
  ct run --preview "npm test"
  ct run --safe "git status"
  ct review [--status pass|fail|note] [--next "Next action"]
  ct resume

v1 is limited to deterministic context translation, layout, planning, preview, allowlisted safe-run, review, and resume.
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
      case "layout":
        return layoutCommand(rest);
      case "explain":
        return explainCommand(rest);
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

function layoutCommand(args: string[]): number {
  const parsed = parseArgs({
    args,
    allowPositionals: false,
    options: {
      mode: { type: "string", default: "all" },
      style: { type: "string", default: "card" }
    }
  });

  const mode = String(parsed.values.mode ?? "all");
  const layoutStyle = String(parsed.values.style ?? "card");
  const validModes = ["compact", "panel", "on-demand", "all"];
  if (!validModes.includes(mode)) {
    process.stderr.write("Usage: ct layout [--mode compact|panel|on-demand|all] [--style card|soft]\n");
    return 1;
  }

  if (!["card", "soft"].includes(layoutStyle)) {
    process.stderr.write("Usage: ct layout [--mode compact|panel|on-demand|all] [--style card|soft]\n");
    return 1;
  }

  const sections: string[] = [];
  if (mode === "compact" || mode === "all") sections.push(formatCompactFooterLayout(layoutStyle));
  if (mode === "panel" || mode === "all") sections.push(formatSidePanelLayout());
  if (mode === "on-demand" || mode === "all") sections.push(formatOnDemandLayout());

  process.stdout.write(`${sections.join("\n\n")}\n`);
  return 0;
}

function explainCommand(args: string[]): number {
  const parsed = parseArgs({
    args,
    allowPositionals: false,
    options: {
      stdin: { type: "boolean", default: false },
      style: { type: "string", default: "card" }
    }
  });

  if (parsed.values.stdin !== true) {
    process.stderr.write("Usage: ct explain --stdin [--style card|soft]\n");
    return 1;
  }

  const layoutStyle = String(parsed.values.style ?? "card");
  if (!["card", "soft"].includes(layoutStyle)) {
    process.stderr.write("Usage: ct explain --stdin [--style card|soft]\n");
    return 1;
  }

  const input = readFileSync(0, "utf8").trim();
  if (!input) {
    process.stderr.write("ct explain --stdin needs piped agent output.\n");
    return 1;
  }

  process.stdout.write(`${formatExplainResult(input, layoutStyle)}\n`);
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
  const state = readState();
  const recentEventLimit = 5;
  const recentEvents = readRecentEvents(recentEventLimit);
  process.stdout.write(`Coding Tricycle resume\n\n`);
  process.stdout.write(`Goal: ${state.goal ?? "(none)"}\n`);
  process.stdout.write(`Plan: ${state.planPath ?? "(none)"}\n`);
  process.stdout.write(`Last command: ${state.lastCommand ?? "(none)"}\n`);
  process.stdout.write(`Last result: ${state.lastResult ?? "(none)"}\n`);
  process.stdout.write(`Verification: ${state.verification ?? "(none)"}\n`);
  process.stdout.write(`Next action: ${state.nextAction ?? "(none)"}\n`);
  process.stdout.write(`\nRecent events (last ${recentEventLimit}):\n`);
  if (recentEvents.length === 0) {
    process.stdout.write(`- (none)\n`);
  } else {
    for (const event of recentEvents) {
      process.stdout.write(`- ${formatEventSummary(event)}\n`);
    }
  }
  process.stdout.write(`Workspace: ${workspaceDir()}\n`);
  return 0;
}

function formatCompactFooterLayout(layoutStyle: string): string {
  const header = `${style("✦ ct context", "cyan", "bold")} ${style("(｡•̀ᴗ-)✧", "gray")}`;
  const rows = formatContextRows({
    error: `코드 로직보다 ${style("파일 경로 설정", "yellow")} 문제일 가능성이 큽니다.`,
    concept: `${style("path alias", "magenta", "bold")} = 긴 파일 경로를 짧은 별명으로 부르는 설정.`,
    command: `${style("tsconfig.json", "yellow")}의 ${style("paths", "yellow")}와 실제 파일 위치를 비교하세요.`,
    study: `${style("TypeScript", "blue")}, ${style("import", "cyan")}, ${style("compiler", "gray")}`
  });

  return [
    `Layout A - Compact footer (${style(layoutStyle === "card" ? "thin card default" : "soft footer", "green")}, ${style("friendly hints", "cyan")})`,
    "",
    "[Agent]",
    `The build failed because ${style("TypeScript", "blue")} cannot resolve the ${style("module path alias", "magenta")}.`,
    `Check ${style("tsconfig.json", "yellow")} paths and the import target before changing runtime code.`,
    "",
    ...formatContextBlock(header, rows, layoutStyle)
  ].join("\n");
}

interface ExplainHints {
  error: string;
  concept: string;
  command: string;
  study: string;
}

function formatExplainResult(input: string, layoutStyle: string): string {
  const hints = inferExplainHints(input);
  const header = `${style("✦ ct context", "cyan", "bold")} ${style("(｡•̀ᴗ-)✧", "gray")}`;
  return [
    `CT explain (${style("deterministic stdin MVP", "green")})`,
    "",
    ...formatContextBlock(header, formatContextRows(hints), layoutStyle)
  ].join("\n");
}

function inferExplainHints(input: string): ExplainHints {
  const normalized = input.toLowerCase();
  const terms = collectStudyTerms(input);

  if (/(cannot find module|cannot resolve|module not found|path alias|tsconfig|paths)/i.test(input)) {
    return {
      error: "파일을 못 찾는 문제일 가능성이 큽니다. 코드 내용보다 import 경로와 설정을 먼저 보세요.",
      concept: "path alias = 긴 파일 경로를 짧은 별명으로 부르는 설정입니다.",
      command: "tsconfig.json의 paths와 실제 파일 위치가 서로 맞는지 비교하세요.",
      study: terms.join(", ")
    };
  }

  if (/(type error|typecheck|tsc|typescript|assignable|property .* does not exist)/i.test(input)) {
    return {
      error: "타입 약속이 실제 코드와 어긋난 상태일 가능성이 큽니다.",
      concept: "typecheck = 실행 전에 값의 모양이 약속과 맞는지 검사하는 단계입니다.",
      command: "에러가 가리키는 타입 정의와 실제 값을 나란히 비교하세요.",
      study: terms.join(", ")
    };
  }

  if (/(test failed|failing test|assert|expected|actual|node --test|jest|vitest|npm test)/i.test(input)) {
    return {
      error: "기능 전체보다 테스트가 기대한 출력과 실제 출력의 차이를 먼저 좁혀보세요.",
      concept: "assertion = 코드 결과가 기대값과 같은지 확인하는 약속입니다.",
      command: "실패한 테스트 이름, expected, actual을 순서대로 읽어보세요.",
      study: terms.join(", ")
    };
  }

  if (/(permission denied|eacces|enoent|not found|no such file or directory)/i.test(input)) {
    return {
      error: "실행 권한이나 파일 위치 문제일 가능성이 큽니다.",
      concept: "runtime path = 프로그램이 실제로 파일을 찾는 위치입니다.",
      command: "현재 cwd, 파일 존재 여부, 실행 권한을 차례대로 확인하세요.",
      study: terms.join(", ")
    };
  }

  if (normalized.includes("refactor")) {
    return {
      error: "당장 고장보다 구조를 더 읽기 쉽게 나누려는 요청입니다.",
      concept: "refactor = 동작은 유지하고 코드 구조를 정리하는 작업입니다.",
      command: "먼저 기존 테스트로 동작을 잠근 뒤 작은 단위로 바꾸세요.",
      study: terms.join(", ")
    };
  }

  return {
    error: "지금은 원문 전체보다 다음 행동을 정리하는 단계로 보면 됩니다.",
    concept: "context translation = 긴 에이전트 출력을 지금 필요한 판단 단서로 줄이는 일입니다.",
    command: "원문에서 에러, 바꿀 파일, 검증 명령을 각각 한 줄씩 표시하세요.",
    study: terms.join(", ")
  };
}

function collectStudyTerms(input: string): string[] {
  const candidates: Array<[RegExp, string]> = [
    [/typescript|tsc|tsconfig/i, "TypeScript"],
    [/import|module|path alias|paths/i, "import"],
    [/compiler|compile|build/i, "compiler"],
    [/test|assert|expected|actual/i, "test"],
    [/refactor/i, "refactor"],
    [/permission|eacces|chmod/i, "permission"],
    [/enoent|not found|file|directory/i, "file path"],
    [/stdin|pipe|pbpaste/i, "stdin"]
  ];
  const terms = candidates.filter(([pattern]) => pattern.test(input)).map(([, term]) => term);
  return terms.length > 0 ? [...new Set(terms)].slice(0, 4) : ["error", "command", "context"];
}

function formatContextRows(hints: ExplainHints): string[] {
  return [
    `${style("⚠ 에러", "red")}: ${hints.error}`,
    `${style("◆ 개념", "magenta")}: ${hints.concept}`,
    `${style("› 커맨드 힌트", "blue")}: ${hints.command}`,
    `${style("☘ 학습 후보", "green")}: ${hints.study}`
  ];
}

function formatContextBlock(header: string, rows: string[], layoutStyle: string): string[] {
  return layoutStyle === "card" ? formatThinCard(header, rows) : formatSoftFooter(header, rows);
}

function formatThinCard(header: string, rows: string[]): string[] {
  return [
    `  ${style("──", "gray")} ${header} ${style("────────────────────────────", "gray")}`,
    ...rows.map((row) => `  ${style("│", "gray")} ${row}`),
    `  ${style("└────────────────────────────────────────", "gray")}`
  ];
}

function formatSoftFooter(header: string, rows: string[]): string[] {
  return [
    `  ${header}`,
    ...rows.map((row) => `  ${row}`)
  ];
}

function formatSidePanelLayout(): string {
  const left = [
    "Agent output",
    "The test runner cannot find the setup file.",
    "It may be caused by a config path mismatch.",
    "Open the test config before editing tests."
  ];
  const right = [
    "CT panel",
    "쉽게 말하면: 테스트 준비 파일 경로가 틀렸을 수 있어요.",
    "확인할 것: test config, setup file path.",
    "저장 개념: setup file, config path.",
    "복습 후보: '설정 파일은 왜 실행 전에 중요할까?'"
  ];

  const rows = Math.max(left.length, right.length);
  const output = ["Layout B - Separate side panel / web desk", ""];
  output.push("+--------------------------------------+--------------------------------------+");
  for (let index = 0; index < rows; index += 1) {
    output.push(`| ${padCell(left[index] ?? "", 36)} | ${padCell(right[index] ?? "", 36)} |`);
  }
  output.push("+--------------------------------------+--------------------------------------+");
  output.push("Use when the user wants deeper context, accumulated concepts, and study mode.");
  return output.join("\n");
}

function formatOnDemandLayout(): string {
  return [
    "Layout C - On-demand skill call",
    "",
    "[Agent]",
    "Refactor the validation boundary so the parser rejects invalid states earlier.",
    "",
    "[CT]",
    "No automatic translation is shown.",
    "User calls: ct explain --last / ct translate / '이거 쉽게 설명해줘'",
    "",
    "Best for long agent sessions where context window pressure matters most."
  ].join("\n");
}

function padCell(value: string, width: number): string {
  const trimmed = truncateDisplayWidth(value, width);
  return `${trimmed}${" ".repeat(Math.max(0, width - displayWidth(trimmed)))}`;
}

function truncateDisplayWidth(value: string, width: number): string {
  if (displayWidth(value) <= width) return value;

  const suffix = "...";
  const target = Math.max(0, width - suffix.length);
  let output = "";
  let used = 0;

  for (const char of value) {
    const charWidth = displayWidth(char);
    if (used + charWidth > target) break;
    output += char;
    used += charWidth;
  }

  return `${output}${suffix}`;
}

function displayWidth(value: string): number {
  let width = 0;
  for (const char of value) {
    const codePoint = char.codePointAt(0) ?? 0;
    width += isWideCodePoint(codePoint) ? 2 : 1;
  }
  return width;
}

function isWideCodePoint(codePoint: number): boolean {
  return (
    (codePoint >= 0x1100 && codePoint <= 0x115f) ||
    (codePoint >= 0x2329 && codePoint <= 0x232a) ||
    (codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
    (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
    (codePoint >= 0xff00 && codePoint <= 0xff60) ||
    (codePoint >= 0xffe0 && codePoint <= 0xffe6)
  );
}

function shouldUseColor(): boolean {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR && process.env.FORCE_COLOR !== "0") return true;
  return Boolean(process.stdout.isTTY);
}

type StyleName = "bold" | "gray" | "red" | "green" | "yellow" | "blue" | "magenta" | "cyan";

function style(value: string, ...styles: StyleName[]): string {
  if (!shouldUseColor()) return value;
  const open = styles.map((name) => ansiStyles[name][0]).join("");
  const close = styles
    .slice()
    .reverse()
    .map((name) => ansiStyles[name][1])
    .join("");
  return `${open}${value}${close}`;
}

const ansiStyles: Record<StyleName, readonly [string, string]> = {
  bold: ["\u001B[1m", "\u001B[22m"],
  gray: ["\u001B[90m", "\u001B[39m"],
  red: ["\u001B[31m", "\u001B[39m"],
  green: ["\u001B[32m", "\u001B[39m"],
  yellow: ["\u001B[33m", "\u001B[39m"],
  blue: ["\u001B[34m", "\u001B[39m"],
  magenta: ["\u001B[35m", "\u001B[39m"],
  cyan: ["\u001B[36m", "\u001B[39m"]
};

function formatEventSummary(event: ReturnType<typeof readRecentEvents>[number]): string {
  const details: string[] = [];
  if (typeof event.goal === "string") details.push(event.goal);
  if (typeof event.command === "string") details.push(event.command);
  if (typeof event.status === "string") details.push(`status=${event.status}`);
  if (typeof event.nextAction === "string") details.push(`next=${event.nextAction}`);

  const suffix = details.length > 0 ? ` - ${details.join("; ")}` : "";
  return `${event.createdAt} ${event.type}${suffix}`;
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
