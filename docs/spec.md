# Spec — Coding Tricycle v1

## CLI commands

```bash
ct init
ct plan "Task description" --scope "smallest useful slice" --acceptance "tests pass" --verification "npm test"
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

Creates a markdown plan. Optional flags prefill the plan instead of leaving TODO placeholders:

- goal
- scope
- non-goals
- acceptance criteria
- verification
- next action

Supported plan flags: `--scope`, `--non-goals`, `--acceptance`, `--verification`, `--next`.

### `ct run --preview`

Does not execute the command. It reports parsed command, cwd, risk, and whether it would be eligible for safe-run.

### `ct run --safe`

Runs only allowlisted low-risk commands after classifier checks. Output is redacted before logging.

### `ct review`

Writes a review checkpoint with status and next action.

### `ct resume`

Prints the latest state from `.tricycle/state.json`.
