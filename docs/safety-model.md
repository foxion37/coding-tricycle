# Safety Model

Coding Tricycle treats command handling as a safety boundary.

## Modes

1. **Preview**: never executes the command.
2. **Safe-run**: executes only allowlisted low-risk commands.
3. **Native dry-run**: only for commands with their own dry-run support.
4. **Destructive execute**: not part of v1.

## Safe-run allowlist

Initial safe-run candidates:

- `git status`
- `git diff --stat`
- `npm test`
- `npm run build`
- read-only commands such as `pwd` and `ls`

Allowlisted commands are still blocked if they include shell metacharacters, secret/env access, repo-outside cwd, or destructive tokens. v1 does not support `--cwd` overrides; command handling stays in the current project directory.

## Dangerous command examples

- `rm`, `mv`, `chmod`, `chown`
- `git reset --hard`, `git clean`, force push
- package uninstall or global package mutation
- deploy, publish, release
- commands that read `.env`, token, password, API key, or credential material

## Log redaction

Before writing command output, Coding Tricycle masks obvious secret-like values, including token/password/API key assignments and long credential-like strings.
