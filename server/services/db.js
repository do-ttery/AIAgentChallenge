import { createClient } from "@supabase/supabase-js";

// 5개 테이블만 사용한다 (machine / session / subscription / reading / notification).
// 임의로 테이블·컬럼을 추가하지 않는다. CLAUDE.md Data Model 참고.
// 테이블 스키마는 여기서 만들지 않는다 — server/db/schema.sql을 Supabase SQL Editor에서 1회 실행한다.

let client = null;

// Supabase 클라이언트를 초기화한다. SUPABASE_URL·SUPABASE_SERVICE_ROLE_KEY는 .env 필수.
export function initDb() {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "[db] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY가 .env에 없습니다."
    );
  }

  client = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  console.log(`[db] Supabase 연결 완료 → ${url}`);
  return client;
}

// 이미 초기화된 client를 가져온다. 초기화 전이면 initDb()를 호출한다.
export function getDb() {
  if (!client) return initDb();
  return client;
}
