/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

// Offline fallback page (embedded to avoid caching complexity)
const OFFLINE_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>nudj - Offline</title>
	<style>
		* { box-sizing: border-box; margin: 0; padding: 0; }
		body {
			font-family: system-ui, -apple-system, sans-serif;
			background: #1a1a1a;
			color: #e8e8e8;
			min-height: 100vh;
			display: flex;
			justify-content: center;
			align-items: center;
			text-align: center;
			padding: 2rem;
		}
		@media (prefers-color-scheme: light) {
			body { background: #fafafa; color: #1a1a1a; }
		}
		h1 { color: #f5a623; margin-bottom: 1rem; }
		p { margin-bottom: 0.5rem; opacity: 0.8; }
		small { opacity: 0.6; }
	</style>
</head>
<body>
	<div>
		<h1>You're offline</h1>
		<p>Connect to the internet to use nudj.</p>
		<p><small>Don't worry — push notifications will still be delivered when you're back online.</small></p>
	</div>
</body>
</html>`;

// Install: activate immediately (no caching needed)
self.addEventListener("install", () => {
	void self.skipWaiting();
});

// Activate: take control immediately
self.addEventListener("activate", (event) => {
	event.waitUntil(self.clients.claim());
});

// Fetch: pass through to network, show offline page if network fails
self.addEventListener("fetch", (event) => {
	// Only handle GET requests
	if (event.request.method !== "GET") return;

	event.respondWith(
		fetch(event.request).catch(() => {
			// If navigation request fails (user is offline), show offline page
			if (event.request.mode === "navigate") {
				return new Response(OFFLINE_PAGE, {
					headers: {"Content-Type": "text/html"},
				});
			}
			// For other requests (images, etc.), just return network error
			return Response.error();
		}),
	);
});

// Push: show notification
self.addEventListener("push", (event) => {
	if (!event.data) return;

	let payload: {title?: string, body?: string, timestamp?: number};
	try {
		payload = event.data.json();
	}
	catch {
		// If not JSON, use raw text as body
		payload = {body: event.data.text()};
	}

	const {title = "nudj", body = "", timestamp = Date.now()} = payload;

	const options: NotificationOptions = {
		body,
		icon: "/icon-192.png",
		badge: "/icon-192.png",
		tag: `nudj-${timestamp}`,
	};
	// Experimental: action buttons (ignored by browsers that don't support it).
	// TypeScript's DOM lib doesn't include `actions` in NotificationOptions yet.
	// Remove the `as any` cast when lib.dom.d.ts adds the property.
	(options as any).actions = [{action: "open", title: "Open App"}];
	event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click: close, and optionally open app
self.addEventListener("notificationclick", (event) => {
	event.notification.close();

	if (event.action !== "open") return;

	event.waitUntil(
		self.clients.matchAll({type: "window", includeUncontrolled: true})
			.then((windowClients) => {
				// Focus existing window if found
				for (const client of windowClients) {
					if (client.url.startsWith(self.location.origin) && "focus" in client)
						return client.focus();
				}
				// Otherwise open new window
				return self.clients.openWindow("/");
			}),
	);
});
