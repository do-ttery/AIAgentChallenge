# 빨래집사 Design System

> Version 1.1

---

# Brand Identity

서비스명 : 빨래집사

슬로건
무인빨래방을 관리하는 AI 운영 에이전트

브랜드 키워드
- Smart
- Friendly
- Reliable
- Clean
- Minimal

---

# Design Philosophy

빨래집사는
"AI가 어렵게 느껴지지 않는 서비스"를 목표로 한다.

귀여운 마스코트를 사용하지만
관리 서비스로서 신뢰감을 유지한다.

사용자는
1초 안에 현재 상태를 이해할 수 있어야 한다.

---

# Color

| 토큰 | 값 |
|---|---|
| Primary | #2E9CC5 |
| Primary Dark | #1C769C |
| Primary Light | #DDF5FB |
| Success | #4CAF50 |
| Warning | #F4B400 |
| Danger | #E84D4D |
| Background | #F8FAFC |
| Card | #FFFFFF |
| Text | #1E293B |
| Sub Text | #64748B |
| Border | #E2E8F0 |

---

# Status Color (고정 — 임의 변경 금지)

| 상태 | Hex | 비고 |
|---|---|---|
| 대기 | #94A3B8 | 회색 |
| 세탁중 | #2E9CC5 | Primary와 동일 |
| 탈수 | #7C6FD8 | 보라 |
| 완료 | #4CAF50 | Success와 동일 |
| 방치 | #F08C00 | Warning(#F4B400, 노랑)과 구분되는 진한 주황 |
| 오류 | #E84D4D | 관리자 화면 전용 |

## 빨강 정책

- **고객 화면의 상태 표시에 빨강 금지** — 방치 포함. 고객을 비난하는 인상을 주지 않는다
- 빨강(#E84D4D)은 **관리자 화면의 시스템 오류·파괴적 액션(삭제 등)에만** 허용한다

## 의미 색 규칙

- 에이전트가 **자동 처리한 것** = Success 계열
- **사장님 개입이 필요한 것** = 방치/Warning 계열
- 이 구분은 대시보드 처리 내역·기계 카드 전반에 일관 적용한다

---

# Typography

Font : Pretendard

| 단계 | 크기 | Weight | Line Height |
|---|---|---|---|
| Display | 32 | 800 | 1.3 |
| Title | 28 | 800 | 1.3 |
| Heading | 24 | 700 | 1.4 |
| Subtitle | 20 | 700 | 1.4 |
| Body | 16 | 400 | 1.6 |
| Caption | 14 | 400 | 1.5 |
| Small | 12 | 500 | 1.5 |

숫자(예상 시각·통계)는 본문보다 한 단계 크고 굵게 — 상태·시간이 화면의 주인공이다.

---

# Border Radius

| 요소 | 값 |
|---|---|
| Card | 24px |
| Button | 18px |
| Input | 16px |
| Badge | 999px |

---

# Shadow

| 요소 | 값 |
|---|---|
| Card | 0 8px 24px rgba(0,0,0,0.08) |
| Floating | 0 12px 32px rgba(0,0,0,0.12) |

그림자는 카드·플로팅 요소에만. 텍스트·아이콘에 금지.

---

# Grid

8pt Grid

Spacing : 8 / 12 / 16 / 24 / 32 / 48 / 64

---

# Domain Rules (빨래집사 고유 규칙)

1. **예상 시각은 점이 아니라 범위로 표기한다** — "18:49" 단독 ❌ → "18:45~18:55" ⭕ (점 시각을 크게 쓰고 범위를 보조로 붙이는 것은 허용)
2. **자동 처리 = Success색 / 사장님 개입 필요 = 방치·Warning색** — 색만 보고 "내가 할 일인지" 구분되게 한다
3. **소비자 화면과 관리자 화면은 성격이 다르다** — 소비자: 정보 1가지(내 세탁 상태)만 크고 단순하게 / 관리자: 정보 + 의사결정(확인·승인)
4. **알림·안내 문구는 고객을 비난하지 않는다** — "방치하셨습니다" ❌ → "찾아가지 않은 세탁물이 있어요" ⭕

---

# Button

| 종류 | 스타일 |
|---|---|
| Primary | Filled (#2E9CC5) |
| Secondary | Outlined |
| Ghost | Text Only |
| Danger | Red Filled — **관리자 화면 전용** |

화면당 Primary 버튼은 1개.

---

# Input

Default / Focused / Disabled / Error

---

# Card

Machine Card / Notification Card / Statistics Card / Dashboard Card

---

# Icon

Material Symbols Rounded
Line Style 2px

---

# Illustration

Flat Style / Minimal / Soft Shadow / Friendly
마스코트 규칙은 `빨래집사 Design Skill`을 따른다.

---

# Animation

200~300ms
Ease-in-out
Bounce 사용 금지
과한 Motion 금지
