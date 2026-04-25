# Coding Tricycle

Coding Tricycle은 AI 에이전트가 쏟아내는 개발 맥락을 사용자가 이해 가능한 말로 압축 번역하고, 배운 개념을 축적하게 돕는 **CLI-first context translation sidecar**입니다.

완전 자동 조종보다는 맥락 통역에 가깝습니다. 사용자가 에이전트의 말을 이해하고, 자기 말로 개념을 익히고, 다음 행동을 판단할 수 있게 받쳐주는 작은 workbench입니다.

## 왜 필요한가

AI 에이전트는 빠르게 많은 말을 쏟아내지만, 바이브코더나 초보 개발자는 그 말의 숨은 전제, 개발 용어, 다음 행동의 이유를 놓치기 쉽습니다. Coding Tricycle은 전체 응답을 다시 길게 설명하지 않고, 사용자가 지금 놓치기 쉬운 맥락만 짧게 번역하는 것을 목표로 합니다.

## v1 범위

Coding Tricycle v1은 의도적으로 작게 시작합니다.

- `ct init`은 로컬 `.tricycle/` workspace를 만듭니다.
- `ct layout`은 에이전트 응답 아래/옆/온디맨드에 CT 맥락 번역 레이어가 어떻게 보일지 미리 보여줍니다.
- `ct explain --stdin`은 복사한 에이전트 출력을 stdin으로 받아 짧은 CT thin card 힌트로 바꿉니다.
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
node dist/cli.js layout
printf "TypeScript cannot resolve module path alias" | node dist/cli.js explain --stdin
node dist/cli.js plan "작은 테스트 추가" --scope "작은 변경 하나" --acceptance "테스트 통과" --verification "npm test"
node dist/cli.js run --preview "npm test"
node dist/cli.js run --safe "git status"
node dist/cli.js review --status pass --next "다음 작은 변경 구현"
node dist/cli.js resume
```

패키지로 설치하면 같은 명령을 `ct`로 사용할 수 있습니다.

```bash
ct init
ct layout --mode compact
pbpaste | ct explain --stdin
ct plan "작은 테스트 추가" --scope "작은 변경 하나" --acceptance "테스트 통과" --verification "npm test"
ct run --preview "npm test"
ct run --safe "git status"
ct review
ct resume
```

## 터미널 맥락 번역 레이아웃

`ct layout`은 실제 번역 엔진을 실행하지 않고, CT가 에이전트 응답 주변에 나타나는 위치만 비교하는 read-only 미리보기입니다. 터미널 컨텍스트를 잡아먹지 않기 위해 기본 원칙은 "전체 번역이 아니라 짧은 맥락 압축"입니다.

- `compact`: 에이전트 응답 아래에 3~4줄짜리 thin card 컬러 힌트 박스를 붙입니다. 에러, 개념, 커맨드, 학습 후보를 구분해 초보자가 덜 무섭게 읽도록 돕는 기본 추천안입니다.
- `compact --style soft`: 구분선 없이 더 조용한 footer로 보여줍니다.
- `panel`: 긴 설명, 개념장, 복습 문제를 별도 패널이나 웹앱으로 분리하는 형태입니다.
- `on-demand`: 평소에는 숨기고 사용자가 필요할 때만 `ct explain`/`ct translate`류 명령으로 호출하는 형태입니다.
- `all`: 세 가지 시안을 한 번에 보여줍니다.

## stdin 맥락 번역

`ct explain --stdin`은 에이전트 응답을 pipe로 받아 deterministic 규칙만으로 짧은 CT 카드를 만듭니다. 아직 LLM API를 호출하지 않으며, `.tricycle/` workspace를 만들지 않는 read-only 명령입니다.

```bash
pbpaste | ct explain --stdin
printf "npm test failed: expected true but actual false" | ct explain --stdin --style soft
```

현재 MVP는 파일 경로/module 문제, TypeScript typecheck 문제, 테스트 실패, 권한/파일 없음 문제, refactor 요청을 구분해 에러, 개념, 커맨드 힌트, 학습 후보를 3~4줄로 압축합니다.

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
