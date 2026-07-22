#!/usr/bin/env python3
"""
빨래집사 도어 이벤트 폴링 스크립트  (T-06 / T-07)

Tapo T110(문열림 센서) 상태를 H100(허브) 경유로 읽어
  1) 상태 변화(open ↔ closed)를 감지하고
  2) POST /ingest 로 door_open / door_close 를 운영과 동일한 경로로 전송한다

개발 경로 == 운영 경로. power_poll.py 와 동일한 원칙.

라이브러리: `tapo` (P110M 실측 때 이미 설치됨 — T110/H100 도 같은 라이브러리로 지원).

────────────────────────────────────────────────────────────────
TAPO 계정(이메일)·비번은 필수. 매장에서 할 일:
  1) Tapo 앱에서 H100(허브) 페어링 → 같은 앱에서 T110 을 허브의 자식 기기로 페어링
  2) T110 을 세탁기 문에 부착 (자석 두 짝이 문이 열리면 떨어지도록)
  3) 허브의 IP 를 --host 에, 페어링한 T110 의 별명(닉네임)을 --nickname 에 넣는다
     (Tapo 앱에서 기기 이름 그대로 — 예: "세탁기1 문열림")

    export TAPO_USERNAME="이메일"  TAPO_PASSWORD="비번"
    python door_poll.py --host 192.168.0.xx --nickname "세탁기1 문열림" --no-post
────────────────────────────────────────────────────────────────

실측 주의 (backlog T-07):
  RUNNING/SPIN 중 door_open 은 상태 머신이 무시한다 (탈수 진동 오탐 방어, CLAUDE.md).
  하지만 이 스크립트는 감지된 그대로 전송한다 — 오탐 방어는 서버 쪽 책임이다.
  실측 목적은 "탈수 중 진동으로 T110 이 open 을 오인식하는가"를 눈으로 확인하는 것.
  세탁 중(특히 탈수 스파이크 구간)에도 --no-post 로 로그를 남겨 오탐 여부를 먼저 확인한다.
"""

import argparse
import asyncio
import csv
import os
import signal
import sys
from datetime import datetime, timezone

try:
    from tapo import ApiClient
except ImportError:
    sys.exit("tapo 라이브러리가 없습니다.  pip install -r requirements.txt")

import json as _json
import urllib.request


# ── 매장에서 채울 두 줄 ─────────────────────────────────────────
# 허브(H100) IP. --host 로 넘기면 이 값은 무시된다.
HOST = ""
# Tapo 앱에서 페어링한 T110 의 별명(닉네임). --nickname 으로 넘기면 이 값은 무시된다.
NICKNAME = ""
# ───────────────────────────────────────────────────────────────

DEFAULT_MACHINE_ID = "m1"
DEFAULT_SERVER = "http://localhost:3000"
DEFAULT_INTERVAL = 5.0          # 운영 기본값(CLAUDE.md 폴링 5초). 실측 시 더 좁혀도 됨
RETRY_BACKOFF = [1, 2, 5, 10]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def default_csv_path() -> str:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"door_{stamp}.csv"


async def connect_t110(host: str, username: str, password: str, nickname: str, device_id: str):
    """H100 허브에 연결한 뒤, 자식 기기(T110)의 핸들러를 가져온다."""
    client = ApiClient(username, password)
    hub = await client.h100(host)
    if device_id:
        return hub, await hub.t110(device_id=device_id)
    return hub, await hub.t110(nickname=nickname)


async def read_open(t110) -> bool:
    """현재 문 열림 여부. T110Result.open == True 면 열림."""
    info = await t110.get_device_info()
    return bool(info.open)


def post_ingest(server: str, machine_id: str, is_open: bool) -> None:
    """운영과 동일한 입구로 전송. 실패해도 예외를 삼켜 폴링을 끊지 않는다."""
    event_type = "door_open" if is_open else "door_close"
    url = f"{server.rstrip('/')}/ingest/{machine_id}"
    body = _json.dumps({"type": event_type}).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=3).read()
    except Exception as e:
        print(f"  [ingest 실패] {e}  (CSV 는 계속 기록됨)", file=sys.stderr)


async def run(args) -> None:
    host = args.host or HOST
    nickname = args.nickname or NICKNAME
    if not host:
        sys.exit("허브 IP 가 비어 있습니다.  --host 로 넘기세요.")
    if not (nickname or args.device_id):
        sys.exit("T110 별명(--nickname) 또는 기기 ID(--device-id) 가 필요합니다.")

    username = args.username or os.environ.get("TAPO_USERNAME", "")
    password = args.password or os.environ.get("TAPO_PASSWORD", "")
    if not (username and password):
        sys.exit("TAPO 계정이 필요합니다.  --username/--password 또는 env TAPO_USERNAME/TAPO_PASSWORD")

    csv_path = args.csv or default_csv_path()
    stop = asyncio.Event()

    def _sig(*_):
        print("\n중단 요청. 파일을 닫습니다…")
        stop.set()

    signal.signal(signal.SIGINT, _sig)
    signal.signal(signal.SIGTERM, _sig)

    print(f"host={host}  nickname={nickname or args.device_id}  machine={args.machine_id}"
          f"  interval={args.interval}s  csv={csv_path}"
          f"  post={'off' if args.no_post else args.server}")

    t110 = None
    backoff_i = 0
    last_open = None  # 최초 1회는 상태와 무관하게 기록만 하고 이벤트는 안 쏜다 (엣지 감지)

    with open(csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["iso_ts", "epoch", "open", "event"])

        while not stop.is_set():
            loop_start = asyncio.get_event_loop().time()
            try:
                if t110 is None:
                    _, t110 = await connect_t110(host, username, password, nickname, args.device_id)
                    print(f"연결됨: {host} / {nickname or args.device_id}")
                    backoff_i = 0

                is_open = await read_open(t110)
                ts = now_iso()
                epoch = datetime.now(timezone.utc).timestamp()

                event = ""
                if last_open is None:
                    print(f"{ts}  open={is_open}  (초기 상태, 이벤트 전송 안 함)")
                elif is_open != last_open:
                    event = "door_open" if is_open else "door_close"
                    print(f"{ts}  open={is_open}  → {event}")
                    if not args.no_post:
                        post_ingest(args.server, args.machine_id, is_open)
                else:
                    print(f"{ts}  open={is_open}")

                writer.writerow([ts, f"{epoch:.3f}", is_open, event])
                f.flush()
                last_open = is_open

            except Exception as e:
                wait = RETRY_BACKOFF[min(backoff_i, len(RETRY_BACKOFF) - 1)]
                print(f"  [연결/읽기 실패] {e} → {wait}s 후 재시도", file=sys.stderr)
                t110 = None
                backoff_i += 1
                try:
                    await asyncio.wait_for(stop.wait(), timeout=wait)
                except asyncio.TimeoutError:
                    pass
                continue

            elapsed = asyncio.get_event_loop().time() - loop_start
            try:
                await asyncio.wait_for(stop.wait(), timeout=max(0, args.interval - elapsed))
            except asyncio.TimeoutError:
                pass

    print(f"저장 완료: {csv_path}")


def parse_args():
    p = argparse.ArgumentParser(description="빨래집사 도어 이벤트 폴링 (T110 + H100, tapo)")
    p.add_argument("--host", help="허브(H100) IP. 비우면 파일 상단 HOST 사용")
    p.add_argument("--nickname", help="Tapo 앱에서 페어링한 T110 별명. 비우면 파일 상단 NICKNAME 사용")
    p.add_argument("--device-id", default="", help="별명 대신 기기 ID 로 지정하고 싶을 때")
    p.add_argument("--machine-id", default=DEFAULT_MACHINE_ID, help=f"기계 ID (기본 {DEFAULT_MACHINE_ID})")
    p.add_argument("--interval", type=float, default=DEFAULT_INTERVAL,
                   help=f"폴링 간격 초 (기본 {DEFAULT_INTERVAL})")
    p.add_argument("--server", default=DEFAULT_SERVER, help=f"서버 주소 (기본 {DEFAULT_SERVER})")
    p.add_argument("--csv", help="CSV 경로 (기본 door_<타임스탬프>.csv)")
    p.add_argument("--no-post", action="store_true", help="서버 전송 없이 CSV 만 (실측용)")
    p.add_argument("--username", help="TAPO 계정 이메일 (또는 env TAPO_USERNAME)")
    p.add_argument("--password", help="TAPO 계정 비번 (또는 env TAPO_PASSWORD)")
    return p.parse_args()


if __name__ == "__main__":
    try:
        asyncio.run(run(parse_args()))
    except KeyboardInterrupt:
        pass
