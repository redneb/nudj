/**
 * Push subscription management.
 */

/**
 * Check if push notifications are supported.
 */
export function isPushSupported(): boolean {
	return "serviceWorker" in navigator && "PushManager" in window;
}

/**
 * Get the current notification permission state.
 */
export function getPermissionState(): NotificationPermission {
	if (!("Notification" in window))
		return "denied";

	return Notification.permission;
}

/**
 * Request notification permission.
 */
export async function requestPermission(): Promise<NotificationPermission> {
	if (!("Notification" in window))
		return "denied";

	return Notification.requestPermission();
}

/**
 * Get existing push subscription.
 */
export async function getSubscription(): Promise<PushSubscription | null> {
	if (!isPushSupported())
		return null;

	const registration = await navigator.serviceWorker.ready;
	return registration.pushManager.getSubscription();
}

/**
 * Create a new push subscription with the given VAPID public key.
 */
export async function createSubscription(vapidPublicKey: string): Promise<PushSubscription> {
	const registration = await navigator.serviceWorker.ready;

	const subscription = await registration.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey: vapidPublicKey,
	});

	return subscription;
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribe(): Promise<boolean> {
	const subscription = await getSubscription();
	if (subscription)
		return subscription.unsubscribe();

	return false;
}

/**
 * Register the service worker.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
	if (!("serviceWorker" in navigator)) {
		console.warn("Service workers not supported");
		return null;
	}

	try {
		const registration = await navigator.serviceWorker.register(import.meta.env.BASE_URL + "service-worker.js");
		console.log("SW registered:", registration.scope);
		return registration;
	}
	catch (error) {
		console.error("SW registration failed:", error);
		return null;
	}
}
