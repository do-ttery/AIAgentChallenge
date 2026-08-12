#!/usr/bin/env bash
# 부스 데모용 — 세탁기 4대를 동시에, 서로 다른 시각에 끝나도록 어긋나게 반복 실행한다.
# 세탁기 1~2는 정상(normal: 세탁→탈수→완료→수거)을 반복하고, 세탁기 3~4는 방치
# (no-qr: 완료 후 수거 신호 없음 → "사장님 손이 필요해요")를 반복한 뒤 자동으로
# 수거(door_open)를 보내 IDLE로 되돌리고 다시 돈다. QR은 세탁기 3에 걸려 있으므로
# 관람객이 QR로 들어오면 방치 사이클(완료→방치→사장님 알림)까지 볼 수 있다
# (2026-07-31 결정: 세탁기 3도 매번 방치 포함 — 정상 전용 데모는 세탁기 1~2가 대신함).
#
# 전체 사이클(세탁→탈수→완료판정→방치→수거)을 1분 안팎으로 넣기 위해 완료판정 시간과
# 방치 타이머를 둘 다 압축한다. 서버(로컬 또는 Render)를 반드시 아래 env로 띄워야 한다
# (기본값은 CLAUDE.md 그대로 60초/15분이라 이 압축 없인 부스 루프가 너무 김. Render는
# 대시보드 Environment 탭에 같은 키·값을 등록):
#   TEST_DONE_HOLD_SEC=30 TEST_ABANDONED_AFTER_MIN=0.1 TEST_COLLECT_REMINDER_INTERVAL_MIN=0.1 node server/index.js
#
# 이 스크립트를 실행하는 셸에도 TEST_DONE_HOLD_SEC를 같은 값으로 export해둬야 한다 —
# simulate.mjs가 완료판정 신호 개수를 이 값 기준으로 계산하기 때문이다 (서버와 값이
# 다르면 신호를 더 많이/적게 보내 타이밍이 어긋난다).
#
# ABANDON_WAIT_SEC(아래)는 "방치 타이머(초) + 배너를 화면에 보여줄 여유 시간"이다.
# 기본값 15초 = 6초(TEST_ABANDONED_AFTER_MIN=0.1 기준 방치 전이) + 9초(배너 노출).
# 서버를 다른 TEST_ABANDONED_AFTER_MIN 값으로 띄웠으면 이 스크립트 실행 시
# ABANDON_WAIT_SEC=<초>로 맞춰준다.
#
# 사용법: bash server/scripts/booth-demo.sh [--server <url>]
# 중지: Ctrl+C (4개 반복문 전부 같이 멈춘다)

server_url="http://localhost:3000"
if [[ "$1" == "--server" ]]; then
  server_url="$2"
fi

machines=("세탁기 1" "세탁기 2" "세탁기 3" "세탁기 4")
scenarios=("normal" "normal" "no-qr" "no-qr")
offsets=(0 15 30 45)
abandon_wait_sec="${ABANDON_WAIT_SEC:-15}"
pids=()

cleanup() {
  echo ""
  echo "부스 데모 중지 중..."
  kill "${pids[@]}" 2>/dev/null
  exit 0
}
trap cleanup INT TERM

for i in "${!machines[@]}"; do
  (
    sleep "${offsets[$i]}"
    while true; do
      node server/scripts/simulate.mjs --scenario "${scenarios[$i]}" --machine-name "${machines[$i]}" --server "$server_url"
      if [[ "${scenarios[$i]}" == "no-qr" ]]; then
        echo "[${machines[$i]}] 방치 배너 노출 대기 ${abandon_wait_sec}초..."
        sleep "$abandon_wait_sec"
        node server/scripts/simulate.mjs --scenario collect --machine-name "${machines[$i]}" --server "$server_url"
      fi
      sleep $(( (RANDOM % 10) + 5 ))
    done
  ) &
  pids+=($!)
done

echo "부스 데모 시작 — 세탁기 1~2 정상 / 세탁기 3~4 방치, 어긋나게 반복 중 (Ctrl+C로 중지)"
echo "서버=$server_url, 방치 대기=${abandon_wait_sec}초 (서버가 TEST_ABANDONED_AFTER_MIN=0.1로 떠 있어야 함, 필요시 ABANDON_WAIT_SEC로 조정)"
wait
