# Coding Tricycle

Coding Tricycle is a CLI-first coding sidecar for planning, previewing, reviewing, and resuming coding work without giving up control.

Less autopilot, more balance — a small workbench that helps your coding workflow stay upright.

## Why this exists

Many coding assistants make it easy to jump straight into execution, but harder to keep a clear plan, a safe command boundary, a review checkpoint, and a resumable record. Coding Tricycle keeps those pieces together in a small local workflow.

## v1 scope

Coding Tricycle v1 is intentionally small:

- `ct init` creates a local `.tricycle/` workspace.
- `ct plan` records a focused task plan.
- `ct run --preview` shows command intent and risk without executing it.
- `ct run --safe` runs only allowlisted low-risk commands and captures the result.
- `ct review` records a short review checkpoint.
- `ct resume` summarizes the latest goal, command result, verification, and next action.

## Quickstart

```bash
npm install
npm run build
node dist/cli.js init
node dist/cli.js plan "Add a small test" --scope "one focused change" --acceptance "tests pass" --verification "npm test"
node dist/cli.js run --preview "npm test"
node dist/cli.js run --safe "git status"
node dist/cli.js review --status pass --next "Implement the next small change"
node dist/cli.js resume
```

When installed as a package, the same commands are exposed as `ct`:

```bash
ct init
ct plan "Add a small test" --scope "one focused change" --acceptance "tests pass" --verification "npm test"
ct run --preview "npm test"
ct run --safe "git status"
ct review
ct resume
```

## Safety model

Coding Tricycle does not provide destructive execution in v1. It separates command handling into:

1. **Preview** — inspect command, cwd, risk, and log shape without running anything.
2. **Safe-run** — execute only allowlisted low-risk commands such as `git status`, `git diff --stat`, `npm test`, or `npm run build`.
3. **Native dry-run** — reserved for tools that provide their own dry-run behavior.
4. **Destructive execute** — out of scope for v1.

See [`docs/safety-model.md`](docs/safety-model.md) for classifier, cwd, and redaction rules. v1 does not support `--cwd` overrides; run commands from the project directory you want to inspect.

## Non-goals

Coding Tricycle is not:

- a full autonomous coding agent,
- an IDE replacement,
- a chat persona,
- a team SaaS product,
- or a wrapper that silently runs risky commands for you.

## Documentation

- [`docs/prd.md`](docs/prd.md)
- [`docs/spec.md`](docs/spec.md)
- [`docs/safety-model.md`](docs/safety-model.md)
- [`docs/operating-model.md`](docs/operating-model.md)
