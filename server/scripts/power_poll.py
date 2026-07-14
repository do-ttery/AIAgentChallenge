#!/usr/bin/env python3
"""
빨래집사 전력 폴링 스크립트  (T-04 / T-05 실측)

Tapo P110M 스마트플러그에서 전력(W)을 읽어
  1) CSV로 기록      — 전력 곡선 실측. T-05 임계값의 원본 데이터 (서버 없어도 남는다)
  2) POST /ingest    — 운영과 동일한 경로로 전송 (best-effort, 실패해도 CSV는 계속 쌓인다)

개발 경로 == 운영 경로. 시뮬레이터도, 이 스크립트도 같은 POST /ingest/:machineId 를 쓴다.

────────────────────────────────────────────────────────────────
매장에서 할 일은 딱 하나: kasa discover 로 찾은 IP 를 --host 에 넣는다.
    kasa discover --username <TAPO_이메일> --password <TAPO_비번>
    python power_poll.py --host 192.168.0.xx --interval 1 --no-post   # 실측(1초)
────────────────────────────────────────────────────────────────

실측 주의 (backlog T-05):
  운영 폴링은 5초지만, 실측만큼은 --interval 1 로 찍는다.
  20kg·1.1kW(히터 없음) 세탁기는 세탁 중 텀블 휴지기에 전력이 0W 근처로 떨어진다.
  이 휴지기가 몇 초인지 먼저 재야 종료 판정 "유지" 시간을 정할 수 있다.
  5초 폴링이 휴지기보다 성기면 통째로 놓친다 → 1초로 먼저 확인.
"""

import argparse
import asyncio
import csv
import os
import signal
import sys
from datetime import datetime, timezone

try:
    import kasa  # noqa: F401
    from kasa import Discover
except ImportError:
    sys.exit("python-kasa 가 없습니다.  pip install -r requirements.txt")

try:
    import urllib.request
    import json as _json
except ImportError:  # 표준 라이브러리라 사실상 없음
    urllib = None


# ── 매장에서 채울 단 한 줄 ─────────────────────────────────────
# kasa discover 로 찾은 IP. --host 로 넘기면 이 값은 무시된다.
HOST = ""
# ───────────────────────────────────────────────────────────────

DEFAULT_MACHINE_ID = "m1"
DEFAULT_SERVER = "http://localhost:3000"
DEFAULT_INTERVAL = 5.0          # 운영 기본값. 실측은 --interval 1
RETRY_BACKOFF = [1, 2, 5, 10]   # 재연결 실패 시 대기(초). 마지막 값 반복


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def default_csv_path() -> str:
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"power_{stamp}.csv"


async def read_watts(dev) -> float:
    """python-kasa 버전 차이를 흡수해 현재 소비전력(W)을 돌려준다."""
    await dev.update()
    # kasa >= 0.7 : Energy 모듈
    try:
        from kasa import Module
        energy = dev.modules[Module.Energy]
        if energy.current_consumption is not None:
            return float(energy.current_consumption)
    except Exception:
        pass
    # 구버전 폴백
    em = getattr(dev, "emeter_realtime", None)
    if em:
        if em.get("power") is not None:
            return float(em["power"])
        if em.get("power_mw") is not None:
            return float(em["power_mw"]) / 1000.0
    raise RuntimeError("전력값을 읽지 못했습니다 (emeter 미지원 기기?)")


async def connect(host: str, username: str, password: str):
    """P110M 은 KLAP 프로토콜이라 TAPO 계정 자격증명이 필요하다."""
    if username and password:
        return await Discover.discover_single(host, username=username, password=password)
    return await Discover.discover_single(host)


def post_ingest(server: str, machine_id: str, watt: float) -> None:
    """운영과 동일한 입구로 전송. 실패해도 예외를 삼켜 폴링을 끊지 않는다."""
    url = f"{server.rstrip('/')}/ingest/{machine_id}"
    body = _json.dumps({"type": "watt", "value": round(watt, 1)}).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=3).read()
    except Exception as e:
        print(f"  [ingest 실패] {e}  (CSV 는 계속 기록됨)", file=sys.stderr)


async def run(args) -> None:
    host = args.host or HOST
    if not host:
        sys.exit("IP 가 비어 있습니다.  kasa discover 로 찾아 --host 로 넘기세요.")

    username = args.username or os.environ.get("TAPO_USERNAME", "")
    password = args.password or os.environ.get("TAPO_PASSWORD", "")

    csv_path = args.csv or default_csv_path()
    stop = asyncio.Event()

    def _sig(*_):
        print("\n중단 요청. 파일을 닫습니다…")
        stop.set()

    signal.signal(signal.SIGINT, _sig)
    signal.signal(signal.SIGTERM, _sig)

    print(f"host={host}  machine={args.machine_id}  interval={args.interval}s  csv={csv_path}"
          f"  post={'off' if args.no_post else args.server}")

    dev = None
    backoff_i = 0
    with open(csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["iso_ts", "epoch", "watt"])  # 헤더

        while not stop.is_set():
            loop_start = asyncio.get_event_loop().time()
            try:
                if dev is None:
                    dev = await connect(host, username, password)
                    print(f"연결됨: {getattr(dev, 'alias', host)}")
                    backoff_i = 0

                watt = await read_watts(dev)
                ts = now_iso()
                epoch = datetime.now(timezone.utc).timestamp()
                writer.writerow([ts, f"{epoch:.3f}", f"{watt:.1f}"])
                f.flush()  # 정전·강제종료에도 지금까지는 남게
                print(f"{ts}  {watt:6.1f} W")

                if not args.no_post:
                    post_ingest(args.server, args.machine_id, watt)

            except Exception as e:
                wait = RETRY_BACKOFF[min(backoff_i, len(RETRY_BACKOFF) - 1)]
                print(f"  [연결/읽기 실패] {e} → {wait}s 후 재시도", file=sys.stderr)
                dev = None
                backoff_i += 1
                try:
                    await asyncio.wait_for(stop.wait(), timeout=wait)
                except asyncio.TimeoutError:
                    pass
                continue

            # interval 만큼 대기하되, 처리 시간을 빼서 주기를 지킨다
            elapsed = asyncio.get_event_loop().time() - loop_start
            try:
                await asyncio.wait_for(stop.wait(), timeout=max(0, args.interval - elapsed))
            except asyncio.TimeoutError:
                pass

    print(f"저장 완료: {csv_path}")


def parse_args():
    p = argparse.ArgumentParser(description="빨래집사 전력 폴링 (P110M)")
    p.add_argument("--host", help="플러그 IP (kasa discover 로 확인). 비우면 파일 상단 HOST 사용")
    p.add_argument("--machine-id", default=DEFAULT_MACHINE_ID, help=f"기계 ID (기본 {DEFAULT_MACHINE_ID})")
    p.add_argument("--interval", type=float, default=DEFAULT_INTERVAL,
                   help=f"폴링 간격 초 (기본 {DEFAULT_INTERVAL}, 실측은 1)")
    p.add_argument("--server", default=DEFAULT_SERVER, help=f"서버 주소 (기본 {DEFAULT_SERVER})")
    p.add_argument("--csv", help="CSV 경로 (기본 power_<타임스탬프>.csv)")
    p.add_argument("--no-post", action="store_true", help="서버 전송 없이 CSV 만 (실측용)")
    p.add_argument("--username", help="TAPO 계정 이메일 (또는 env TAPO_USERNAME)")
    p.add_argument("--password", help="TAPO 계정 비번 (또는 env TAPO_PASSWORD)")
    return p.parse_args()


if __name__ == "__main__":
    try:
        asyncio.run(run(parse_args()))
    except KeyboardInterrupt:
        pass
