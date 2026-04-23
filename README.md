# Coding Tricycle

Coding Tricycle은 코딩 작업을 계획하고, 명령을 실행 전에 미리 확인하고, 안전한 명령만 캡처하고, 결과를 검토하고, 다음 세션에서 이어갈 수 있게 돕는 **CLI-first coding sidecar**입니다.

완전 자동 조종보다는 균형에 가깝습니다. 사용자의 주도권을 유지하면서 코딩 흐름이 넘어지지 않도록 받쳐주는 작은 workbench입니다.

## 왜 필요한가

많은 코딩 도구는 바로 실행으로 뛰어들기 쉽지만, 계획, 안전한 명령 경계, 검토 지점, 재개 가능한 기록을 한 흐름으로 유지하기는 어렵습니다. Coding Tricycle은 이 네 가지를 작은 로컬 CLI workflow 안에 묶어 둡니다.

## v1 범위

Coding Tricycle v1은 의도적으로 작게 시작합니다.

- `ct init`은 로컬 `.tricycle/` workspace를 만듭니다.
- `ct plan`은 집중할 작업 계획을 기록합니다.
- `ct run --preview`는 명령을 실제로 실행하지 않고 의도와 위험도를 보여줍니다.
- `ct run --safe`는 allowlist를 통과한 low-risk 명령만 실행하고 결과를 캡처합니다.
- `ct review`는 짧은 검토 체크포인트를 기록합니다.
- `ct resume`은 최신 목표, 명령 결과, 검증, 다음 액션, 최근 이벤트를 요약합니다.

## 빠른 시작

```bash
npm install
npm run build
node dist/cli.js init
node dist/cli.js plan "작은 테스트 추가" --scope "작은 변경 하나" --acceptance "테스트 통과" --verification "npm test"
node dist/cli.js run --preview "npm test"
node dist/cli.js run --safe "git status"
node dist/cli.js review --status pass --next "다음 작은 변경 구현"
node dist/cli.js resume
```

패키지로 설치하면 같은 명령을 `ct`로 사용할 수 있습니다.

```bash
ct init
ct plan "작은 테스트 추가" --scope "작은 변경 하나" --acceptance "테스트 통과" --verification "npm test"
ct run --preview "npm test"
ct run --safe "git status"
ct review
ct resume
```

## 안전 모델

Coding Tricycle v1은 파괴적인 실행 기능을 제공하지 않습니다. 명령 처리는 다음 네 가지 층으로 나눕니다.

1. **Preview**: 명령, cwd, 위험도, 로그 형태를 실제 실행 없이 확인합니다.
2. **Safe-run**: `git status`, `git diff --stat`, `npm test`, `npm run build` 같은 allowlisted low-risk 명령만 실행합니다.
3. **Native dry-run**: 명령 자체가 dry-run 동작을 제공할 때만 후속 범위로 다룹니다.
4. **Destructive execute**: v1 범위 밖입니다.

classifier, cwd, redaction 규칙은 [`docs/safety-model.md`](docs/safety-model.md)를 참고하세요. v1은 `--cwd` override를 지원하지 않습니다. 확인하려는 프로젝트 디렉터리에서 명령을 실행해야 합니다.

## 비목표

Coding Tricycle은 다음을 목표로 하지 않습니다.

- 완전 자율 코딩 에이전트
- IDE 대체 플랫폼
- 채팅 persona 중심 도구
- 팀 SaaS 제품
- 위험한 명령을 조용히 실행하는 wrapper

## 문서

- [`docs/prd.md`](docs/prd.md)
- [`docs/spec.md`](docs/spec.md)
- [`docs/safety-model.md`](docs/safety-model.md)
- [`docs/operating-model.md`](docs/operating-model.md)
