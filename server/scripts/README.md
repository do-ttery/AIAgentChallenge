# 센서 폴링 · 실측 (T-03 ~ T-05)

무인빨래방 세탁기 전력을 Tapo P110M 에서 읽어 **CSV 곡선**과 **`POST /ingest`** 두 곳으로 보낸다.
개발(시뮬레이터)·운영(이 스크립트)이 같은 엔드포인트를 쓰므로 실측 데이터가 곧 운영 데이터 형태다.

## 매장 가기 전 (집에서)

```bash
cd server/scripts
python -m venv .venv && source .venv/bin/activate   # 선택
pip install -r requirements.txt
```

- [ ] Tapo 앱 설치 · 계정 생성 (매장에선 **플러그 등록만**)
- [ ] TAPO 계정 이메일/비번을 환경변수로 준비 — P110M 은 KLAP 이라 자격증명 필수
  ```bash
  export TAPO_USERNAME="your@email.com"
  export TAPO_PASSWORD="********"
  ```
- [ ] 세탁 **표준 코스 소요 시간** 확인 (예: 표준 45분) → T-05 코스 소요시간 기준
- [ ] `pip install` 까지 끝내 스크립트가 로컬에서 `--help` 로 뜨는지 확인

## 매장에서 (IP 한 줄만)

```bash
# 1) 플러그 IP 찾기
kasa discover --username "$TAPO_USERNAME" --password "$TAPO_PASSWORD"

# 2) 실측 시작 — 1초 간격, 서버 없이 CSV 만
python power_poll.py --host 192.168.0.xx --interval 1 --no-post
```

`Ctrl-C` 로 멈추면 `power_<타임스탬프>.csv` 가 남는다. (매 줄 flush 하므로 중간에 꺼져도 그때까지는 보존)

### 왜 실측은 1초인가 (T-05 핵심)

운영 폴링은 **5초**(CLAUDE.md)지만, 대상 세탁기는 20kg·1.1kW 로 **전기 히터가 없다.**
세탁 중 전력이 모터 텀블(돌다-멈추다)만 따라가 **주기적으로 0W 근처까지 떨어진다.**
이 **텀블 휴지기가 몇 초인지**를 먼저 재야 종료 판정 "유지" 시간을 정한다.
5초 폴링이 휴지기보다 성기면 통째로 놓치므로, 실측만큼은 1초로 찍어 휴지기 실제 길이를 확인한다.
→ 그 결과로 운영 5초가 충분한지 판단한다.

## 실측 손기록 양식 (반드시 병행)

전력 곡선만으로는 "이 스파이크가 탈수인지 헹굼인지" 모른다. **귀로 들은 시각을 종이에 적어** CSV 와 대조한다.

| 시각 (HH:MM:SS) | 무슨 일 | 메모 |
|---|---|---|
|  | 전원 켬 (대기 전력) |  |
|  | 시작 버튼 |  |
|  | 물 받는 소리 |  |
|  | 세탁(텀블) 시작 |  |
|  | 헹굼처럼 들림 |  |
|  | 탈수처럼 들림 (고속 회전) |  |
|  | 종료음 |  |
|  | 문 열고 꺼냄 |  |

> 채워야 할 숫자 (T-05 산출물)
> - 대기 W / 세탁 W 대역 / 탈수 스파이크 W
> - **세탁 중 텀블 휴지기 최대 길이(초)** ← 가장 중요
> - 종료 후 0W 유지 시작 시각 → "유지" 판정 시간 도출

## 운영 전송까지 확인 (서버 뜬 뒤)

`POST /ingest/:machineId` (T-08) 가 준비되면 `--no-post` 를 빼고 돌린다.

```bash
python power_poll.py --host 192.168.0.xx --interval 5 --machine-id m1 --server http://localhost:3000
```

전송 실패는 로그만 남기고 CSV 기록은 계속된다.

## 옵션

| 옵션 | 기본 | 뜻 |
|---|---|---|
| `--host` | 파일 상단 `HOST` | 플러그 IP (매장에서 채우는 단 한 줄) |
| `--interval` | 5.0 | 폴링 간격 초. 실측은 1 |
| `--machine-id` | m1 | 기계 ID |
| `--server` | http://localhost:3000 | `/ingest` 대상 |
| `--no-post` | off | CSV 만, 서버 전송 안 함 |
| `--csv` | `power_<타임스탬프>.csv` | 출력 경로 |
| `--username` / `--password` | env `TAPO_USERNAME` / `TAPO_PASSWORD` | TAPO 자격증명 |

## 커밋 주의

`.csv` 실측 파일과 자격증명은 커밋하지 않는다. (`server/data/`·`.env` 규칙과 동일)

---

# 도어 이벤트 폴링 · 실측 (T-06 ~ T-07)

T110(문열림 센서) 상태를 H100(허브) 경유로 읽어 **문 열림/닫힘 엣지**를 감지하고
`POST /ingest`(`door_open`/`door_close`)로 보낸다. 전력 폴링과 같은 원칙 — 개발·운영 경로 동일.

## T-06: Tapo 앱 등록 · 부착 (물리 작업 — 코드 아님)

1. Tapo 앱에서 **H100(허브)** 를 매장 Wi-Fi 에 페어링
2. 같은 앱에서 **T110** 을 H100 의 자식 기기로 페어링하고, 알아보기 쉬운 **별명**을 붙인다
   (예: `세탁기1 문열림`, `세탁기2 문열림` …)
3. T110 의 자석 두 짝을 세탁기 문에 부착 — **문이 열리면 두 짝이 벌어지도록** (문틀 쪽 1개 + 문짝 쪽 1개)
4. 허브(H100) 의 IP 확인 — 플러그와 동일하게 `kasa discover` 또는 Tapo 앱의 기기 설정에서 확인
5. `machine.door_sensor_id` 컬럼(현재 NULL, `schema.sql` 참고)에 별명 또는 기기 ID 를 채운다 — 서버가 어떤 기계가 어떤 센서인지 매핑하는 값

## T-07: 폴링 스크립트

```bash
cd server/scripts
python door_poll.py --host 192.168.0.yy --nickname "세탁기1 문열림" --no-post
```

- `--host` 는 **H100 허브의 IP** (P110M 플러그와는 다른 IP)
- `--nickname` 은 Tapo 앱에서 붙인 T110 별명 그대로. 별명 대신 `--device-id` 로도 지정 가능
- 최초 1회 읽은 상태는 "초기 상태"로만 기록하고 이벤트를 쏘지 않는다 (엣지 감지라 기준점이 필요)
- 상태가 바뀔 때만 `door_open`/`door_close` 를 `/ingest` 로 전송, CSV 에는 매 폴링을 다 남긴다

### 탈수 진동 오탐 확인 (T-07 핵심)

CLAUDE.md 규칙상 `RUNNING`/`SPIN` 중 `door_open` 은 상태 머신이 무시하도록 이미 되어 있지만(오탐 방어),
그 방어가 실제로 필요한지는 **T110 이 탈수 진동으로 open 을 오인식하는지 먼저 확인**해야 안다.

```bash
# 세탁 1회 내내 --no-post 로 CSV 만 남기고, 탈수 스파이크 구간에 open 이 찍히는지 확인
python door_poll.py --host 192.168.0.yy --nickname "세탁기1 문열림" --interval 5 --no-post
```

power_poll.py 로 같은 세탁 사이클의 전력 곡선도 같이 찍어두면, 탈수 스파이크 시각과
door CSV 의 `open=True` 시각을 겹쳐봐서 오탐 여부·빈도를 판단할 수 있다.

## 옵션

| 옵션 | 기본 | 뜻 |
|---|---|---|
| `--host` | 파일 상단 `HOST` | 허브(H100) IP |
| `--nickname` | 파일 상단 `NICKNAME` | Tapo 앱에서 페어링한 T110 별명 |
| `--device-id` | — | 별명 대신 기기 ID 로 지정 |
| `--interval` | 5.0 | 폴링 간격 초 |
| `--machine-id` | m1 | 기계 ID |
| `--server` | http://localhost:3000 | `/ingest` 대상 |
| `--no-post` | off | CSV 만, 서버 전송 안 함 |
| `--csv` | `door_<타임스탬프>.csv` | 출력 경로 |
| `--username` / `--password` | env `TAPO_USERNAME` / `TAPO_PASSWORD` | TAPO 자격증명 (P110M 과 동일 계정) |
