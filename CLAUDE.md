# 빨래집사

## Project

무인빨래방 운영을 자동화하는 AI Agent

MVP 목표
방치 세탁물 자동 대응

상세 기획: `docs/plan.md`
Task·우선순위·4주 로드맵: `docs/backlog.md`
작업 단위(커밋 1개 = 체크박스 1개): `docs/checklist.md`

역할
서원(`swlog`) — `client/` 화면 · 시뮬레이터
도경(`do-ttery`) — `server/` 상태머신 · 알림 · 센서

---

# Architecture

Frontend
React + Vite + react-router-dom

Backend
Express + cors

Monorepo
npm workspaces + concurrently

Database
SQLite (better-sqlite3)

Sensor
Tapo P110M (스마트플러그, 전력)
Tapo T110 (문열림 센서)
Tapo H100 (허브 — T110 연결에 필수)

Sensor 수집
python-kasa 폴링 스크립트 → 서버로 전송

Notification
Web Push API + Service Worker + VAPID

---

# Folder

npm workspaces 모노레포. 루트에서 `npm install` 한 번, `npm run dev`로 둘 다 실행.

```
client/             # React (Vite) — 5173
  src/
    App.jsx         # 라우팅
    pages/          # 고객(m/*), 사장님(owner/*)
    components/
    styles/         # tokens.css (디자인 토큰)
    mocks/          # mock 데이터 (구조는 아래 Data Model과 동일)
server/             # Express — 3000
  index.js
  routes/
  services/         # 상태머신, 방치 대응, 알림
  scripts/          # 센서 폴링, 시뮬레이터
  data/             # app.db (커밋 금지)
docs/               # plan.md, backlog.md, checklist.md, prototype.html
assets/             # 마스코트, 로고
```

client의 `/api`·`/ingest` 요청은 Vite 프록시가 server로 넘긴다. 프론트는 상대 경로로 호출한다.

---

# Git Flow

feature/* → dev → main

---

# Commit

feat:
fix:
docs:
style:
refactor:
test:
chore:

---

# Coding Convention

camelCase
PascalCase

Hooks
useXXX

Component
PascalCase

Constant
UPPER_CASE

---

# Environment

`.env`는 3주차 Web Push 도입 시 생성 (VAPID 키 발급 시점)

`.env`에 보관
- VAPID_PUBLIC / VAPID_PRIVATE
- OWNER_PASSCODE
- PORT

비밀키·실제 값 커밋 금지.
`.env`, `server/data/`는 `.gitignore`에 포함.

---

# Development Rule

UI를 먼저 구현한다.
화면은 mock 데이터로 완성하고, 기능은 나중에 연결한다.
mock 데이터의 구조는 아래 Data Model·API Spec과 동일하게 맞춘다.
(구조가 같아야 mock → 실제 API 교체가 갈아끼우기만으로 끝난다)

기능 구현 단계에서는 상태 머신을 우선 구현한다.

QR은 선택 기능이다.
전력 데이터가 기준이다.
문열림은 보조 데이터이다.

AI는 임의 판단하지 않는다.
아래 스펙에 없는 결정이 필요하면 임의로 정하지 말고 질문한다.
새로 확정된 결정은 이 문서에 반영한다.

---

# API Spec

센서 데이터 입구는 하나로 통일한다.

```
POST /ingest/:machineId
{ "type": "watt",      "value": 512 }   # 전력 (5초 간격)
{ "type": "door_open"  }                # 문 열림
{ "type": "door_close" }                # 문 닫힘
```

- 개발 중: 시뮬레이터가 이 엔드포인트로 가짜 데이터 주입
- 운영: 센서 폴링 스크립트가 동일 엔드포인트로 전송
- 개발·운영 경로는 항상 일치시킨다

---

# Data Model

테이블은 5개만 사용한다. 임의로 추가하지 않는다.

| 테이블 | 주요 컬럼 | 용도 |
|---|---|---|
| `machine` | id, name, status, plugId, doorSensorId | 기계 목록·현재 상태·센서 매핑 |
| `session` | id, machineId, startedAt, endedAt, state | 세탁 1회 = 세션 (익명 허용, QR 무관 생성) |
| `subscription` | id, sessionId, endpoint, keys, createdAt | QR 알림 신청 (opt-in) |
| `reading` | id, machineId, ts, type, value | 전력·도어 이벤트 로그 |
| `notification` | id, sessionId, type, sentAt | 발송 이력 (중복 방지 근거) |

---

# State Machine

상태는 6가지만 사용한다.

```
IDLE → RUNNING → SPIN → DONE
DONE → COLLECTED    (수거)
DONE → ABANDONED    (방치)
```

전이 조건

| 전이 | 트리거 |
|---|---|
| IDLE → RUNNING | 전력 급상승 (시작 패턴) + 세션 자동 생성 |
| RUNNING → SPIN | 탈수 스파이크 패턴 |
| SPIN → DONE | 전력 0W 복귀 유지 |
| DONE → COLLECTED | ① 도어 열림 ② 동일 기계 다음 세탁 시작(소급 처리) ③ 고객 "수거했어요" 탭 — 이 우선순위 |
| DONE → ABANDONED | 종료 후 **30분** 수거 신호 없음 (타이머) |

규칙
- 세션은 QR 신청과 무관하게 전력 감지만으로 생성한다 (익명 세션)
- RUNNING / SPIN 중 door_open은 무시한다 (탈수 진동 오탐 방어)
- 방치 시간(30분), 2차 알림 간격(+30분)은 상수로 분리한다
- 중복 전이 금지, 정의되지 않은 이벤트는 무시하고 로그만 남긴다

방치 후 분기
- 알림 채널 있음 → 1차 수거 알림 → 2차 수거 알림
- 알림 채널 없음 → 사장님 알림 + QR 랜딩 방치 안내 모드 전환

---

# Notification Rule

종류
출발(종료 임박) / 완료 / 1차 수거 / 2차 수거 / 사장님 알림

문구 톤
- 고객 비난 금지: "방치하셨습니다" ❌ → "찾아가지 않은 세탁물이 있어요" ⭕
- 시간은 점이 아니라 범위로: "18:45~18:55"
- 같은 세션에 같은 종류의 알림은 1회만 (notification 테이블로 중복 방지)

---

# Agent Rule

항상
Observe → Think → Act
순서를 유지한다.

상태는
IDLE / RUNNING / SPIN / DONE / COLLECTED / ABANDONED
6가지만 사용한다.

---

# UI Rule

Pretendard
8pt Grid
Radius 24 (카드) / 18 (버튼)
Primary #6366F1

상태 색 (고정)

| 상태 | 색 |
|---|---|
| 대기 | #94A3B8 |
| 세탁중 | #6366F1 |
| 탈수 | #2E9CC5 |
| 완료 | #4CAF50 |
| 방치 | #F08C00 |
| 오류 | #E84D4D |

빨강 정책
- 고객 화면의 상태 표시에 빨강 금지 (방치 포함 — 비난 인상 금지)
- 빨강(#E84D4D)은 관리자 화면의 시스템 오류·파괴적 액션에만 허용

화면 작업 시 `빨래집사 Design Skill`을 반드시 적용하고,
작업 후 스킬의 검증 체크리스트로 자가 검증한다.

---

# Design Rule

항상
빨래집사 마스코트를 사용한다.

새 캐릭터 생성 금지.
마스코트 비율 변경 금지.
캐릭터의 AI 렌즈는 항상 오른쪽 눈에 유지한다.

---

# MVP Scope

기계 상태 감지
방치 판단
QR 알림
사장님 알림
Dashboard

여기까지만 구현한다.

재고관리
발주
환불
매출 분석

구현 금지.
(승인 대기함은 Dashboard에 UI 자리만 둔다 — 기능 구현 금지)
