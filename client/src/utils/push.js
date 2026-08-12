/* T-18 — VAPID 공개키(base64url)를 PushManager가 요구하는 Uint8Array로 바꾼다.
   web-push 생태계의 표준 변환 방식. 고객(LandingPage)·사장님(OwnerDashboard) 구독이 함께 쓴다. */
export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

/* 권한 요청 → Service Worker 등록 → 구독 → 서버 저장까지 한 번에 처리한다.
   sessionId를 주면 그 세탁 세션 알림(고객 QR), 안 주면 사장님(매장) 채널로 저장된다
   (CLAUDE.md Notification Rule — subscription.session_id nullable).
   호출부는 항상 실제 사용자 클릭(제스처) 안에서 불러야 한다 — Notification.requestPermission()은
   브라우저 정책상 제스처 밖에서 부르면 조용히 막히거나 무시된다. */
export async function subscribeToPush(sessionId) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, error: "이 브라우저는 알림을 지원하지 않아요." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, error: "알림 권한이 거부됐어요. 브라우저 설정에서 허용 후 다시 시도해 주세요." };
  }

  await navigator.serviceWorker.register("/push-worker.js");
  const registration = await navigator.serviceWorker.ready;
  const pushSubscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC),
  });
  const { endpoint, keys } = pushSubscription.toJSON();

  const res = await fetch("/api/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, endpoint, keys }),
  });
  if (!res.ok) throw new Error(`구독 저장 실패 (HTTP ${res.status})`);

  return { ok: true };
}
