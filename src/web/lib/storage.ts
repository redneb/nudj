/**
 * LocalStorage helpers for storing VAPID keys.
 */

const KEYS = {
	VAPID_PUBLIC: "nudj:vapid:publicKey",
	VAPID_PRIVATE: "nudj:vapid:privateKey",
} as const;

export interface VapidKeyPair {
	publicKey: string;
	privateKey: string;
}

/**
 * Get stored VAPID keys, or null if not found.
 */
export function getVapidKeys(): VapidKeyPair | null {
	const publicKey = localStorage.getItem(KEYS.VAPID_PUBLIC);
	const privateKey = localStorage.getItem(KEYS.VAPID_PRIVATE);

	if (!publicKey || !privateKey)
		return null;

	return {publicKey, privateKey};
}

/**
 * Store VAPID keys in LocalStorage.
 */
export function setVapidKeys(keys: VapidKeyPair): void {
	localStorage.setItem(KEYS.VAPID_PUBLIC, keys.publicKey);
	localStorage.setItem(KEYS.VAPID_PRIVATE, keys.privateKey);
}

/**
 * Clear stored VAPID keys.
 */
export function clearVapidKeys(): void {
	localStorage.removeItem(KEYS.VAPID_PUBLIC);
	localStorage.removeItem(KEYS.VAPID_PRIVATE);
}
