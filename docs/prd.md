# Product Requirements — Coding Tricycle

## Product definition

Coding Tricycle is a CLI-first coding sidecar that helps developers plan a task, preview or safely capture command results, review outcomes, and resume later without giving up control.

## Goals

1. Stabilize the flow from plan to command preview, review, log, and resume.
2. Keep the user in control of command intent and verification.
3. Make the project understandable as a public GitHub repository.
4. Use sidecar/workbench/balance/stability/control as the core vocabulary.

## Non-goals

- Full autonomous coding agent.
- IDE replacement.
- Emotional chatbot or coach-first product.
- Team collaboration SaaS.
- Required LLM provider integration.

## Target users

- Individual developers using AI tools but wanting clearer control.
- Power users who separate planning, verification, and logging.
- Developers who prefer quiet local CLI tools.

## v1 acceptance criteria

1. README explains Coding Tricycle with sidecar/stability/control language.
2. The command flow includes `ct init`, `ct plan`, `ct run --preview`, `ct run --safe`, `ct review`, and `ct resume`.
3. Dangerous command classification, cwd guard expectations, and redaction rules are documented.
4. `ct run --safe` only runs allowlisted low-risk commands.
5. Session logs include goal, commands, results, verification, and next action.
