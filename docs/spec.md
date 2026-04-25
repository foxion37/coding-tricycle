# Spec — Coding Tricycle v1

## CLI 명령

```bash
ct init
ct layout --mode compact
pbpaste | ct explain --stdin
ct plan "작업 설명" --scope "가장 작은 유용한 범위" --acceptance "테스트 통과" --verification "npm test"
ct run --preview "npm test"
ct run --safe "git status"
ct review --status pass --next "다음 작은 변경 계속"
ct resume
```

## 로컬 workspace

`ct init`은 `.tricycle/` 아래에 다음 파일과 폴더를 만듭니다.

- `config.json`
- `events.jsonl`
- `state.json`
- `plans/`

## 명령 동작

### `ct layout`

터미널에서 CT 맥락 번역 레이어가 어디에 나타날지 비교하는 read-only 미리보기입니다. 실제 에이전트 응답을 읽거나 `.tricycle/` workspace를 만들지 않습니다.

지원 mode:

- `compact`: 에이전트 응답 아래에 thin card 컬러 힌트 박스를 붙입니다. 에러, 개념, 커맨드, 학습 후보를 구분해 보여줍니다.
- `compact --style soft`: 구분선 없는 footer 스타일을 보여줍니다.
- `panel`: 에이전트 원문과 CT 번역/개념장 영역을 분리한 패널형 시안을 보여줍니다.
- `on-demand`: 평소에는 숨기고 사용자가 필요할 때만 호출하는 방식을 보여줍니다.
- `all`: 세 가지 시안을 모두 보여줍니다.

### `ct explain --stdin`

에이전트 응답을 stdin으로 받아 짧은 CT thin card 힌트를 출력하는 read-only 명령입니다. 실제 LLM API를 호출하지 않고 deterministic keyword rule만 사용합니다. `.tricycle/` workspace를 만들지 않습니다.

지원 style:

- `card`: 기본 thin card 출력
- `soft`: 구분선 없는 footer 출력

초기 MVP가 구분하는 신호:

- module/path alias/tsconfig 문제
- TypeScript typecheck 문제
- 테스트 실패
- 권한 또는 파일 없음 문제
- refactor 요청

### `ct plan`

Markdown 계획 파일을 만듭니다. 선택 flag를 쓰면 TODO placeholder 대신 계획 내용을 미리 채울 수 있습니다.

- 목표
- 범위
- 비범위
- 완료 기준
- 검증 명령
- 다음 액션

지원하는 plan flag는 `--scope`, `--non-goals`, `--acceptance`, `--verification`, `--next`입니다.

### `ct run --preview`

명령을 실행하지 않습니다. 파싱된 명령, 현재 cwd, 위험도, safe-run 가능 여부를 보여줍니다.

### `ct run --safe`

classifier 검사를 통과한 allowlisted low-risk 명령만 실행합니다. stdout/stderr는 로그 저장 전에 redaction됩니다.

### `ct review`

검토 상태와 다음 액션을 checkpoint로 기록합니다. 지원 상태는 `pass`, `fail`, `note`입니다.

### `ct resume`

`.tricycle/state.json`의 최신 상태와 `.tricycle/events.jsonl`의 최근 5개 readable event를 출력합니다.

`ct resume`은 read-only 명령입니다. workspace가 아직 없으면 새 `.tricycle/` 파일을 만들지 않고 `(none)` 상태와 빈 recent events 섹션을 보여줍니다.

출력 필드:

- goal
- plan
- last command
- last result
- verification
- next action
- recent events
- workspace path
