# 제품 요구사항 — Coding Tricycle

## 제품 정의

Coding Tricycle은 AI 에이전트가 쏟아내는 개발 맥락을 사용자가 이해 가능한 말로 압축 번역하고, 배운 개념을 축적하게 돕는 **CLI-first context translation sidecar**입니다.

핵심은 “AI가 대신 코딩한다”가 아니라 “사용자가 에이전트의 말을 이해하고 자기 말로 개발 개념을 익히게 돕는다”입니다. 기존 plan, preview, safe-run, review, resume은 번역된 맥락을 검증하고 이어가기 위한 보조 루프입니다.

## 목표

1. 에이전트 응답의 개발 언어와 숨은 전제를 짧게 번역합니다.
2. 사용자가 현재 작업 맥락을 놓치지 않도록 compact CT 레이어를 제공합니다.
3. 사용자가 배운 단어와 개발 개념을 저장하고 반복 학습할 수 있게 합니다.
4. 공개 GitHub 프로젝트로도 이해 가능한 작은 CLI-first 도구 구조를 유지합니다.

## 비목표

- 완전 자율 코딩 에이전트
- IDE 대체 플랫폼
- 감성형 챗봇 또는 coach-first 제품
- 팀 협업 SaaS
- 필수 LLM provider 연동

## 대상 사용자

- AI 도구를 쓰지만 실행 주도권을 더 명확히 유지하고 싶은 개인 개발자
- 계획, 검증, 기록을 분리해서 관리하고 싶은 파워유저
- 조용한 로컬 CLI 도구를 선호하는 개발자

## v1 기능 범위

- `ct init`: 로컬 `.tricycle/` workspace 생성
- `ct layout`: 에이전트 응답 아래/옆/온디맨드에 맥락 번역 레이어가 나타나는 방식을 터미널에서 preview
- `ct explain --stdin`: 에이전트 응답을 stdin으로 받아 deterministic CT thin card 힌트 생성
- `ct plan`: 작업 목표, 범위, 완료 기준, 검증 명령, 다음 액션 기록
- `ct run --preview`: 명령을 실행하지 않고 의도와 위험도 확인
- `ct run --safe`: allowlisted low-risk 명령만 실행하고 결과 기록
- `ct review`: 검토 상태와 다음 액션 기록
- `ct resume`: 최신 상태와 최근 이벤트 요약

## v1 완료 기준

1. README가 context translation sidecar 문맥으로 Coding Tricycle을 설명합니다.
2. 명령 흐름에 `ct init`, `ct layout`, `ct explain --stdin`, `ct plan`, `ct run --preview`, `ct run --safe`, `ct review`, `ct resume`이 포함됩니다.
3. dangerous command classification, cwd guard, redaction 규칙이 문서화됩니다.
4. `ct run --safe`는 allowlisted low-risk 명령만 실행합니다.
5. session log에는 goal, commands, results, verification, next action, recent events가 남습니다.
6. `ct layout`, `ct explain --stdin`, `ct resume`은 read-only로 동작하며 workspace가 없어도 새 파일을 만들지 않습니다.
