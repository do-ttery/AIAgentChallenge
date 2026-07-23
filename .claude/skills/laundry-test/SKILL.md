---
name: laundry-test
description: 빨래집사 client/·server/ 공통 TDD(red→green→refactor) 절차 — 케이스 표 확인·스텁·describe 4분류(정상/빈 값·기본값/경계값/실패)·용어집은 두 워크스페이스 어디서나 적용. CSS Module mock·Testing Library는 client 컴포넌트 전용 섹션으로 따로 표시돼 있다. server도 vitest로 정해짐(도경, 2026-07-23 설치 진행 중) — Supabase mock 레시피는 실제 테스트 작성되면서 "server 순수 함수 테스트" 섹션에 채워진다.
---

# 빨래집사 Test Skill

## Goal

`client/`든 `server/`든, 새 함수·컴포넌트를 추가하거나 고칠 때 테스트를 구현보다 먼저 쓰고
red(실패)를 실제로 본 뒤 green(통과)으로 만든다. red를 건너뛰면 "테스트가 통과하는 이유가
구현이 맞아서인지, 테스트가 아무것도 검증 안 해서인지" 구분이 안 된다.

**적용 범위** — 절차·describe 4분류·용어집(아래)은 두 워크스페이스 공통이다. "컴포넌트 테스트"
섹션만 client 전용이니, server 로직(`stateMachine.js`·`abandonment.js`류)을 테스트할 때는
그 섹션을 참고하지 않는다 — 대신 "server 순수 함수 테스트" 섹션을 본다.

---

## 절차 (항상 이 순서)

1. **대상 하나를 작게 자른다.** 화면 전체·API 전체가 아니라 순수 함수 하나, 컴포넌트 하나
   단위로 쪼갠다. 오늘 여러 개를 하려 하지 않는다 — 하나를 red→green까지 끝내는 게 우선이다.
2. **케이스 목록부터 표로 정리하고, 작업자(서원 또는 도경) 확인을 받는다.** 코드를 쓰기
   전에 "입력 → 기대 결과 → 이유" 표를 먼저 만든다. 정상·빈 값·경계값·실패 케이스가 골고루
   들어갔는지 담당자가 직접 훑어보고 빠진 케이스를 짚어낼 수 있어야 한다 — **이 확인을
   건너뛰고 바로 테스트 코드를 쓰지 않는다.** 표가 곧 다음 단계 테스트 코드의 설계도다.
3. **스텁(stub)을 먼저 만든다.** 구현 파일이 아예 없으면 테스트 실행이 import 오류로 죽어서
   "어느 케이스가 왜 실패하는지"가 안 보인다. 함수는 존재하되 항상 틀린 값을 돌려주는
   껍데기를 만든다 (예: `return false` / `return null`).
4. **테스트 파일을 쓴다.** 대상 파일 옆에 `이름.test.js`(순수 함수) 또는
   `이름.test.jsx`(컴포넌트)로 만든다. 2번 표의 케이스를 그대로 옮긴다.
5. **`npx vitest run <파일>`로 red를 확인한다.** 대상 파일이 속한 워크스페이스 안에서
   실행한다 — `client/`면 `client/` 안에서, `server/`면 `server/` 안에서 (server는 아직
   러너가 없으니 이 단계 전에 먼저 세팅이 필요하다). 스텁 덕분에 "import 실패"가 아니라
   케이스별 assertion 실패(기대값 vs 실제값)가 나란히 보여야 한다. 이 단계를 생략하지
   않는다 — red를 안 보면 이후 green이 우연인지 실력인지 알 수 없다.
6. **테스트를 통과시킬 만큼만 구현한다.** 스텁을 진짜 로직으로 바꾼다. 테스트에 없는 기능을
   미리 만들지 않는다.
7. **`npx vitest run <파일>`로 green을 확인한다.**
8. **전체 스위트(`npx vitest run`, 인자 없이)를 같은 워크스페이스 안에서 한 번 더 돌려
   회귀를 확인한다.** client·server는 워크스페이스가 분리돼 있어 스위트도 따로 돈다 —
   한쪽만 고쳤다고 다른 쪽까지 같이 돌 필요는 없다.
9. **refactor.** 동작(테스트 결과)을 유지한 채 코드를 정리할 곳이 있으면 정리한다. 지금
   테스트가 green으로 지키고 있으니 안심하고 고칠 수 있다. 정리한 뒤에는 다시 8번으로
   돌아가 전체 스위트를 돌린다. 고칠 게 없으면 이 단계는 그냥 넘어간다.

---

## describe 4분류

이 프로젝트 테스트는 아래 네 그룹으로 나눈다 (`StatusBadge.test.jsx`, `availability.test.js` 참고).
그룹 이름은 그대로 쓴다 — 다른 파일과 리듬이 맞아야 검증 Agent가 빠짐을 기계적으로 찾을 수 있다.

| describe | 무엇을 넣나 |
|---|---|
| `— 정상 케이스` | 스펙에 명시된 주요 입력·분기를 전부 한 번씩 |
| `— 빈 값 / 기본값` | 인자 생략, `null`/`undefined`/빈 문자열, 옵션 파라미터 기본값 |
| `— 경계값` | 스펙 경계(대소문자, falsy인데 유효한 값 `0`/`""`, 정의 안 된 enum 값) |
| `— 실패(비정상 입력) 케이스` | 잘못된 입력에도 에러를 던지지 않고 안전한 기본값을 돌려주는지 |

CLAUDE.md의 "AI는 임의 판단하지 않는다" 원칙이 테스트에도 적용된다 — 스펙에 없는 케이스를
지어내 검증하지 않는다. 스펙에 없는 분기가 필요해 보이면 테스트를 쓰기 전에 질문한다.

---

## 무엇을 테스트하나 — 전부 하지 않는다

골라서 한다. 아래 셋이 우선순위다.

- **핵심 로직** — 상태 판정, 시간·진행률 계산처럼 서비스 중심이 되는 규칙
- **조건이 갈리는 곳** — 빈 값, 경계값, 실패하는 경우 (그래서 describe 4분류가 이 모양)
- **버그가 났던 곳** — 같은 버그가 다시 오는지 감시하는 회귀(regression) 테스트

DB 요청 함수·외부 API 호출처럼 느리거나 의존이 큰 코드는 지금 단계에서 건너뛴다.

## TDD 적용 범위

- **잘 맞는 곳** — `utils/`의 계산·변환·판정 함수, 검증(validate) 로직. 규칙이 말로 분명히
  설명되는 곳
- **안 맞는 곳** — 화면(UI)·레이아웃·색. 여기는 눈으로 확인하는 게 더 빠르고 정확하다 —
  `laundry-design` Skill의 체크리스트로 검증한다

---

## client 컴포넌트 테스트 — CSS Module mock (client 전용)

**이 섹션은 client React 컴포넌트에만 해당한다.** server 로직 테스트는 CSS도 DOM도 없으니
이 섹션을 참고하지 않는다 — 아래 "server 순수 함수 테스트" 섹션으로 간다.

`*.module.css`를 import하는 컴포넌트는 클래스명이 해시돼서 그대로 비교할 수 없다.
`StatusBadge.jsx`가 "어떤 클래스 키를 골랐는지"만 확인하면 되므로, 프로퍼티 키를 그대로
돌려주는 Proxy로 mock한다.

```js
vi.mock("./ComponentName.module.css", () => ({
  default: new Proxy({}, { get: (_target, prop) => prop }),
}));
```

vitest는 `globals: true`가 아니면(이 프로젝트 설정) Testing Library 자동 cleanup이 안 걸린다.
파일 상단에 `afterEach(cleanup)`을 반드시 넣는다 — 없으면 이전 테스트의 DOM이 다음 테스트에
남아 있어서, 실패해야 할 assertion이 우연히 통과하는 거짓 green이 생긴다.

```js
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

afterEach(cleanup);
```

---

## 순수 함수 테스트 (client·server 공통)

컴포넌트가 아니면 mock·cleanup이 필요 없다. 함수를 import해서 입력→출력만 검증한다.
`Date.now()`에 의존하는 함수(`time.js`류)는 고정된 ISO 문자열을 인자로 넘겨서, 테스트
실행 시각에 따라 결과가 흔들리지 않게 한다.

---

## server 순수 함수 테스트 (러너: vitest — 도경 담당, 2026-07-23 설치 진행 중)

client와 같은 vitest로 정해졌다 (도경). `server/`는 `type: "module"`(ESM)이라 client처럼
jsdom 환경 없이 Node 환경 그대로 쓰면 된다 — `vitest.config`에서 client의 `jsdom`
대신 environment를 지정하지 않거나 `node`로 둔다.

`stateMachine.js`·`abandonment.js`는 조건 분기가 많은 순수 로직이라 TDD 후보로 좋다.

**mock 대상이 client와 다르다.** client는 CSS Module을 목업하지만, server는 실제
Supabase 호출(`db.js`)을 목업해야 상태 머신 로직만 떼어 테스트할 수 있다. 구체적인
mock 레시피(어느 함수를 어떻게 목업하는지)는 도경이 실제 테스트를 쓰면서 이 섹션에
채운다 — 아직 예시 코드는 없음.

나머지(케이스 표 확인 → 스텁 → red → green → refactor, describe 4분류)는 위 절차
그대로 적용한다.

---

## 용어

| 용어 | 예 | 의미 |
|---|---|---|
| 테스트 케이스 | `it('이름', 함수)` | 검사 하나. `test()`라고 써도 같다 |
| 단언 (assertion) | `expect(실제값).toBe(기대값)` | "이 값은 이래야 한다"는 선언 한 줄 |
| 매처 (matcher) | `.toBe()` `.toEqual()` `.toBeInTheDocument()` | 단언의 조건을 표현. 어떻게 같아야 하는지를 정함 |
| 테스트 스위트 | `describe('묶음이름', () => {...})` | 관련 테스트를 하나로 묶는 단위 |
| 목 (Mock) | `vi.mock(".../*.module.css", ...)` | 느리거나 다루기 힘든 의존(CSS 해시, DB, 외부 API)을 가짜로 대체 |
| 스텁 (Stub) | `return false`만 있는 껍데기 함수 | 정해진 값만 돌려주는 가장 단순한 가짜 구현. red를 assertion 실패로 보이게 하는 용도 |
| 픽스처 (Fixture) | `machines.js`의 `MACHINES` | 테스트에 반복해서 쓰는 고정 데이터 |
| 커버리지 (Coverage) | — | 테스트가 실행한 코드 비율(%). 100%가 목표가 아니라 판단 기준 |
| 단위 테스트 | `getMachineAvailability`가 옳게 판정하는가 | 함수·부품 하나만 검사. 빠르다 |
| 통합 테스트 | `GET /api/machines`가 DB 데이터를 응답하는가 | 부품을 연결한 흐름 전체. 느리다 — T-22 |
| 회귀 테스트 (Regression) | `npx vitest run`(전체) | 고친 뒤 기존 기능이 깨지지 않는지 확인 |

**`toBe` vs `toEqual`** — 숫자·문자열·불리언 같은 원시값은 `toBe`. 객체·배열은 `toEqual`을 쓴다
(`toBe`로 객체를 비교하면 참조가 달라서 항상 실패한다). `getMachineAvailability`가
`{ available, freeAt }` 객체를 돌려주므로 `availability.test.js`는 전부 `toEqual`을 쓴다.

---

## 검증

테스트를 다 쓴 뒤에는 `rule-reviewer` 대신 **검증 Agent**(별도)로 아래를 점검한다.

- 케이스 목록을 먼저 표로 정리해 확인받은 흔적이 있는가
- red를 실제로 본 흔적이 있는가 (스텁 → assertion 실패, 또는 최소한 구현보다 테스트가 먼저
  존재했는가)
- describe 4분류가 스펙 대비 빠짐없는가
- 테스트가 구현 세부사항이 아니라 스펙에 쓰인 동작을 검증하는가
- refactor할 곳을 정리했다면, 정리 후에도 전체 스위트가 green인가
