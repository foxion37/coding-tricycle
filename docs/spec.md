# Spec — Coding Tricycle v1

## CLI commands

```bash
ct init
ct plan "Task description"
ct run --preview "npm test"
ct run --safe "git status"
ct review --status pass --next "Continue with the next small change"
ct resume
```

## Local workspace

`ct init` creates `.tricycle/` with:

- `config.json`
- `events.jsonl`
- `state.json`
- `plans/`

## Command behavior

### `ct plan`

Creates a markdown plan containing:

- goal
- scope
- non-goals
- acceptance criteria
- verification
- next action

### `ct run --preview`

Does not execute the command. It reports parsed command, cwd, risk, and whether it would be eligible for safe-run.

### `ct run --safe`

Runs only allowlisted low-risk commands after classifier checks. Output is redacted before logging.

### `ct review`

Writes a review checkpoint with status and next action.

### `ct resume`

Prints the latest state from `.tricycle/state.json`.
