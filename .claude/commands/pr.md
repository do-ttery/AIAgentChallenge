---
description: PR 올릴 때 백로그 상태를 갱신하고 6섹션 PR 문구를 준비 (커밋·PR은 사용자가 직접)
allowed-tools: Bash(git branch:*), Bash(git log:*), Bash(git diff:*), Bash(git status:*)
---

브랜치 작업을 PR로 올릴 때, 백로그 진행도를 함께 맞춘다.
**커밋·`gh pr create`를 대신 실행하지 않는다 — backlog.md 파일 수정까지만 하고 git/gh는 문구로만 준다. (서원은 PR을 직접 올린다)**

## 1. Observe — 무엇을 올리는지
!`git branch --show-current`
!`git log dev..HEAD --oneline 2>/dev/null || git log main..HEAD --oneline`
!`git diff --stat dev...HEAD 2>/dev/null || git diff --stat main...HEAD`

그리고 `docs/backlog.md`를 읽는다.

## 2. Think — 어느 T-번호인가
1. 브랜치명·커밋 메시지의 `T-\d+`
2. 변경 파일 경로 ↔ 백로그 Task (예: `client/src/pages/m/` → T-14)
3. 애매하면 임의로 정하지 말고 후보를 제시하고 사용자에게 확인받는다.

## 3. Act — 백로그 수정 + 6섹션 초안
- **backlog.md 상태 갱신**: 해당 T-번호 행 `상태` 열을 `✅`로. 뒤 메모가 있으면 정리.
  로드맵·2주차 DoD·주차 표에도 같은 Task가 이모지로 나오면 함께 맞춘다(backlog.md 안에서만).
  PR이 일부만 끝낸 거면 ✅ 대신 🟡 + 메모. 완료가 애매하면 사용자에게 묻는다.
- **PR 본문은 항상 아래 6개 섹션을 채운다** (학습 로그형 — 순서·제목 고정, 예외 없이 전부 포함).
  각 섹션은 실제 커밋·diff에서 근거를 뽑고, 빈 섹션은 "없음"이라 적되 헤더는 남긴다.
  뒤 3개 섹션(새로 알게 된 것/설명 가능/아직 미이해)은 사용자 학습 기록이라 초안만 넣고 본인이 고치게 안내한다.

  ```markdown
  ## 주요 작업 리스트
  ## 오늘 나의 작업
  ## 협업한 부분
  ## 새로 알게 된 것
  ## 내가 설명할 수 있는 부분
  ## 아직 이해 못 한 부분
  ```

- **초안 제시** (실행은 사용자):
  ```
  git add docs/backlog.md
  git commit -m "docs: 백로그 T-XX 완료 반영"
  gh pr create --base dev --title "feat: <T-XX 한 줄> (T-XX)" --body "<위 6섹션 초안>"
  ```

마무리는 집사 말투로 가볍게: "백로그 T-XX를 완료로 올려두었습니다. PR은 아래 명령으로 직접 올리시면 됩니다, 서원님."
