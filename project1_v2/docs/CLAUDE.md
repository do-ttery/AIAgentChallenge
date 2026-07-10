# CLAUDE.md

## 프로젝트

AI가 짠 코드 중 사용자가 이해하지 못한 부분(안개)을 감지해 지도로 보여주고, 3분 탐험(요약+퀴즈)으로 걷어내게 하는 로컬 웹 앱. 4주 캠프 MVP, 1인 개발.

## 기술 스택

- FE: React + TypeScript (Vite)
- BE: Express + TypeScript (Node)
- DB 없음 — 탐험 기록은 로컬 JSON 파일
- LLM: Anthropic API (요약·퀴즈 생성에만 사용)

## 디렉토리 구조

```
client/          # React 앱
server/
  src/adapters/  # AI 도구별 세션 로그 파서 (claudeCode.ts — 어댑터 구조 유지)
  src/services/  # 안개 판정, git 이력, 탐험 기록
  src/routes/    # API 엔드포인트
docs/            # plan.md, checklist.md, design.md
```

## 컨벤션

- 컴포넌트: PascalCase, 함수·변수: camelCase
- 커밋: feat / fix / refactor / docs / chore — "타입: 한 줄 설명" 형식
- 한 커밋 = checklist.md의 체크박스 한 개 단위

## 하지 말 것

- any 타입 금지 — 타입을 모르겠으면 unknown + 좁히기
- 외부 UI 라이브러리 금지 (직접 CSS + 디자인 스킬 적용)
- checklist.md에 없는 기능 임의 추가 금지 — 필요하면 먼저 제안하고 합의
- 탐험하지 않은 코드 조각을 LLM API로 보내지 말 것 (프라이버시 원칙: 클릭한 조각만 전송)
- 코드를 한 번에 큰 덩어리로 생성하지 말 것 — 체크박스 한 개 분량씩, 검증 방법과 함께

## 도메인 규칙 (중요)

- 안개 판정: "AI가 썼고(세션 로그) + 이후 내가 접촉 안 함(git 수정 없음 && 탐험 통과 없음)"
- 재안개: 내 마지막 접촉 시각 < AI 마지막 수정 시각이면 다시 안개
- 스캔은 앱 실행 시 자동 — 사용자에게 부가 행동을 요구하는 설계 금지

## 참고

- 기획서: @docs/plan.md
- 작업 분해: @docs/checklist.md
- 디자인 규칙: fog-design 스킬 (.claude/skills/fog-design/SKILL.md)
- 디자인 레퍼런스: @docs/prototype.html
