import webpush from "web-push";

// Web Push 발송 (T-12)
// VAPID_PUBLIC/VAPID_PRIVATE는 .env 필수 (CLAUDE.md Environment 섹션).
// db.js의 initDb()/getDb() 패턴과 동일하게 lazy 초기화한다 — 서버 시작 시 index.js에서 한 번 호출.

let configured = false;

export function initPush() {
  if (configured) return;

  const publicKey = process.env.VAPID_PUBLIC;
  const privateKey = process.env.VAPID_PRIVATE;

  if (!publicKey || !privateKey) {
    console.warn(
      "[push] VAPID_PUBLIC / VAPID_PRIVATE가 .env에 없습니다. Web Push 발송을 건너뜁니다."
    );
    return;
  }

  // subject는 mailto: 또는 https: 형식이어야 하는 web-push 라이브러리 요구사항.
  // 팀 연락처가 별도로 없어 임시로 mailto 형식만 맞춰 둔다.
  webpush.setVapidDetails("mailto:do252425@gmail.com", publicKey, privateKey);
  configured = true;
  console.log("[push] VAPID 설정 완료");
}

// subscription 테이블 row({endpoint, keys})를 받아 실제 발송한다.
// 실패(구독 만료 등)는 에러를 던지지 않고 로그만 남긴다 — 상태 머신 흐름을 막지 않기 위해 (CLAUDE.md 지시).
export async function sendPush(subscriptionRow, payload) {
  if (!configured) {
    console.warn("[push] VAPID 미설정 — 발송 건너뜀");
    return false;
  }

  const pushSubscription = {
    endpoint: subscriptionRow.endpoint,
    keys: JSON.parse(subscriptionRow.keys),
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error(
      `[push] 발송 실패 (endpoint=${subscriptionRow.endpoint.slice(0, 40)}...):`,
      err.message
    );
    return false;
  }
}
