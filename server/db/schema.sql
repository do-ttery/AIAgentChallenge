-- 빨래집사 Supabase 스키마 (T-09)
-- Supabase 프로젝트 SQL Editor에서 1회 실행한다. 5개 테이블만 사용한다 (CLAUDE.md Data Model 참고).
-- SQLite와 달리 앱 실행 시 자동 생성되지 않으므로, 스키마 변경 시 이 파일도 같이 갱신하고 다시 실행한다.

create extension if not exists "pgcrypto";

create table if not exists machine (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  status         text not null default 'IDLE'
                   check (status in ('IDLE','RUNNING','SPIN','DONE','COLLECTED','ABANDONED')),
  plug_id        text,
  door_sensor_id text
);

create table if not exists session (
  id          uuid primary key default gen_random_uuid(),
  machine_id  uuid not null references machine(id),
  started_at  timestamptz not null,
  ended_at    timestamptz,
  state       text not null
                check (state in ('IDLE','RUNNING','SPIN','DONE','COLLECTED','ABANDONED'))
);

create index if not exists idx_session_machine_id on session(machine_id);

create table if not exists subscription (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid references session(id), -- nullable: NULL이면 사장님(매장) 구독 (2026-07-21 결정)
  endpoint   text not null,
  keys       text not null, -- Web Push {p256dh, auth}를 JSON.stringify한 문자열 (2026-07-16 결정)
  created_at timestamptz not null default now()
);

-- 2026-07-21: OWNER_ALERT가 실제로 발송되려면 특정 세션에 묶이지 않는 사장님용 구독 채널이
-- 필요해 session_id를 nullable로 바꿨다. create table if not exists는 이미 배포된 테이블에는
-- 반영되지 않으므로, not null 제약이 남아있는 기존 배포 환경에서도 안전하게 적용되도록
-- alter table을 별도로 둔다(이미 nullable이면 아무 일도 하지 않는다 — idempotent).
alter table subscription alter column session_id drop not null;

create index if not exists idx_subscription_session_id on subscription(session_id);

create table if not exists reading (
  id         bigint generated always as identity primary key,
  machine_id uuid not null references machine(id),
  ts         timestamptz not null,
  type       text not null check (type in ('watt','door_open','door_close')),
  value      real
);

create index if not exists idx_reading_machine_id_ts on reading(machine_id, ts);

create table if not exists notification (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references session(id),
  type       text not null
               check (type in ('DEPARTURE','COMPLETED','COLLECT_1','COLLECT_2','OWNER_ALERT')),
  sent_at    timestamptz not null default now()
);

create index if not exists idx_notification_session_id_type on notification(session_id, type);

-- 시드 데이터: 실제 매장 세탁기 4대 (T-09 범위, 2026-07-16 결정)
-- session/reading은 machine이 먼저 있어야 FK가 성립하므로, T-10·T-21 착수 전에 이 시드가 있어야 한다.
-- plug_id/door_sensor_id는 실제 Tapo 기기 등록 후(T-03·T-06) 채운다 — 지금은 NULL.
insert into machine (name, status)
select name, 'IDLE'
from (values ('세탁기 1'), ('세탁기 2'), ('세탁기 3'), ('세탁기 4')) as seed(name)
where not exists (select 1 from machine where machine.name = seed.name);
