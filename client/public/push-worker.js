// T-18 — Web Push 수신용 Service Worker. 알림 문구·이동 경로는 서버(notificationMessages.js)가 만들어 보낸다.
// skipWaiting/clients.claim — 이 파일을 고칠 때마다 새 버전이 바로 적용되게 한다.
// 이게 없으면 브라우저가 옛 버전을 계속 쓰다가 모든 탭을 완전히 닫아야 갱신된다.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = { title: "빨래집사", body: "알림이 도착했어요." };
  try {
    if (event.data) data = event.data.json();
  } catch {
    // JSON이 아니면 기본 문구로 대체
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/favicon.svg",
      data: { url: data.url ?? "/" },
    })
  );
});

// 알림을 탭하면 그 알림이 실어 온 url(예: /m/:machineId, 사장님 알림이면 /owner)로 이동한다.
// 2026-07-22 수정: 예전엔 항상 "/"(사이트 루트)로만 보내서 손님이 자기 세탁기 화면을
// 다시 못 찾는 딥링크 문제가 있었다 — 실기기 테스트로 발견. 같은 origin의 열린 탭이
// 있으면 그 탭을 이 url로 이동시키고, 없으면 그 url로 새로 연다.
self.addEventListener("notificationclick", (event) => {
  const url = event.notification.data?.url ?? "/";
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => "navigate" in c);
      if (existing) return existing.navigate(url).then((c) => c.focus());
      return self.clients.openWindow(url);
    })
  );
});
