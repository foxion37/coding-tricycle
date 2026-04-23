export type RiskLevel = "safe" | "dangerous";

export interface CommandAnalysis {
  command: string;
  args: string[];
  cwd: string;
  risk: RiskLevel;
  reasons: string[];
  safeRunEligible: boolean;
}

const destructiveCommands = new Set([
  "rm",
  "mv",
  "chmod",
  "chown",
  "deploy",
  "publish",
  "release"
]);

const shellMetaPattern = /[|;&<>`]|\$\(|\|\||&&/;
const secretTargetPattern = /(^|[/\\.\-_])(env|secret|secrets|credential|credentials|token|password|apikey|api-key)([/\\.\-_]|$)/i;
const secretAssignmentPattern = /\b[A-Z0-9_]*(TOKEN|SECRET|PASSWORD|API_KEY|ACCESS_KEY|PRIVATE_KEY)[A-Z0-9_]*\s*=\s*[^\s]+/gi;
const longCredentialPattern = /\b[A-Za-z0-9_\-]{32,}\b/g;

export function tokenizeCommand(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quote) {
      if (char === quote) {
        quote = null;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current.length > 0) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

export function analyzeCommand(commandText: string, cwd = process.cwd()): CommandAnalysis {
  const tokens = tokenizeCommand(commandText.trim());
  const command = tokens[0] ?? "";
  const args = tokens.slice(1);
  const reasons: string[] = [];

  if (!command) {
    reasons.push("empty command");
  }

  if (shellMetaPattern.test(commandText)) {
    reasons.push("shell metacharacters are not allowed in safe-run");
  }

  if (destructiveCommands.has(command)) {
    reasons.push(`destructive command: ${command}`);
  }

  if (command === "git" && args[0] === "reset" && args.includes("--hard")) {
    reasons.push("destructive git reset --hard");
  }

  if (command === "git" && args[0] === "clean") {
    reasons.push("destructive git clean");
  }

  if (command === "git" && args.includes("--force")) {
    reasons.push("force git operation");
  }

  if (command === "npm" && ["uninstall", "remove", "rm"].includes(args[0] ?? "")) {
    reasons.push("package removal is not safe-run eligible");
  }

  if (command === "npm" && args.includes("-g")) {
    reasons.push("global package mutation is not safe-run eligible");
  }

  if (tokens.some((token) => secretTargetPattern.test(token))) {
    reasons.push("secret/env/credential path or token detected");
  }

  const risk: RiskLevel = reasons.length > 0 ? "dangerous" : "safe";
  const safeRunEligible = risk === "safe" && isAllowlisted(tokens);

  if (risk === "safe" && !safeRunEligible) {
    reasons.push("not in safe-run allowlist");
  }

  return {
    command,
    args,
    cwd,
    risk,
    reasons,
    safeRunEligible
  };
}

export function isAllowlisted(tokens: string[]): boolean {
  const [command, first, second] = tokens;
  if (!command) return false;

  if (command === "git" && first === "status" && tokens.length === 2) return true;
  if (command === "git" && first === "diff" && second === "--stat" && tokens.length === 3) return true;
  if (command === "npm" && first === "test" && tokens.length === 2) return true;
  if (command === "npm" && first === "run" && second === "build" && tokens.length === 3) return true;
  if (["pwd", "ls"].includes(command)) return tokens.length <= 2;

  return false;
}

export function redactSecrets(input: string): string {
  return input
    .replace(secretAssignmentPattern, (match) => {
      const [key] = match.split("=");
      return `${key}=<redacted>`;
    })
    .replace(longCredentialPattern, (match) => {
      if (/^[a-f0-9]{32,}$/i.test(match) || /[A-Z]/.test(match) || /[_-]/.test(match)) {
        return "<redacted>";
      }
      return match;
    });
}
