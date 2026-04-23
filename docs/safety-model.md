# 안전 모델

Coding Tricycle은 명령 실행을 편의 기능이 아니라 안전 경계로 다룹니다. v1은 destructive execution을 제공하지 않고, 사용자가 명령의 의도와 위험도를 먼저 확인할 수 있게 합니다.

## 실행 모드

1. **Preview**: 명령을 절대 실행하지 않습니다. 명령, cwd, 위험도, safe-run 가능 여부만 보여줍니다.
2. **Safe-run**: allowlist와 classifier를 통과한 low-risk 명령만 실행합니다.
3. **Native dry-run**: 명령 자체가 dry-run 동작을 제공할 때만 후속 범위로 다룹니다.
4. **Destructive execute**: v1 범위가 아닙니다.

## Safe-run allowlist

초기 safe-run 후보는 다음과 같습니다.

- `git status`
- `git diff --stat`
- `npm test`
- `npm run build`
- `pwd`, `ls` 같은 읽기 중심 명령

allowlist 후보라도 shell metacharacter, secret/env 접근, repo 밖 cwd, destructive token이 포함되면 차단됩니다. v1은 `--cwd` override를 지원하지 않으며, 명령 처리는 현재 프로젝트 디렉터리 안에서만 이뤄집니다.

## 위험 명령 예시

- `rm`, `mv`, `chmod`, `chown`
- `git reset --hard`, `git clean`, force push
- package uninstall 또는 global package mutation
- deploy, publish, release
- `.env`, token, password, API key, credential material을 읽는 명령

## Log redaction

명령 출력이 저장되기 전에 Coding Tricycle은 명백한 secret-like 값을 마스킹합니다.

- token/password/API key assignment
- 길고 무작위성이 높은 credential-like string
- `.env` 또는 credential 파일 출력으로 의심되는 내용

## v1 안전 원칙

- preview는 실행하지 않습니다.
- safe-run은 allowlist와 classifier를 모두 통과해야 합니다.
- 위험 명령은 조용히 실행되지 않습니다.
- resume은 read-only이며 workspace를 새로 만들지 않습니다.
