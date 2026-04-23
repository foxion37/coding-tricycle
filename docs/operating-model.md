# 운영 모델

## 공개 프로젝트 경계

공개 문서는 일반 개발자가 이해할 수 있는 제품 설명, 사용법, 안전 모델, spec 중심으로 작성합니다. 개인 경로, 내부 planning note, 로컬 machine 상태, 내부 session log는 공개 문서에 직접 복사하지 않습니다.

## 권장 workflow

1. 다음 작은 작업을 계획합니다.
2. 명령을 실행하기 전에 preview합니다.
3. 낮은 위험도의 검증 명령만 safe-run으로 기록합니다.
4. 결과를 review합니다.
5. 다음 세션에서 resume으로 최신 상태와 최근 이벤트를 확인합니다.

## 공개 / 내부 분리 기준

공개 repo에 둘 수 있는 것:

- 일반 사용자에게도 유효한 제품 결정
- CLI 사용법
- 안전 모델과 제한 사항
- 공개 가능한 예시 workflow

공개 repo에 직접 두지 않는 것:

- 개인 Obsidian/Q 경로
- 내부 session handoff 원문
- OMX runtime state
- 다른 비공개 프로젝트 맥락

## 권장 repo 구조

```text
README.md
CHANGELOG.md
docs/
examples/
src/
tests/
.tricycle/        # 로컬 생성 workspace; gitignore 대상
```
