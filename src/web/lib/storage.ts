/**
 * LocalStorage helpers for storing VAPID keys.
 */

import {base64UrlToUint8Array} from "./vapid.ts";

const KEYS = {
	VAPID_PUBLIC: "nudj:vapid:publicKey",
	VAPID_PRIVATE: "nudj:vapid:privateKey",
} as const;

const BASE64URL_RE = /^[A-Za-z0-9_-]+$/;
const UNCOMPRESSED_P256_PUBLIC_KEY_LENGTH = 65;

export interface VapidKeyPair {
	publicKey: string;
	privateKey: string;
}

/**
 * Get stored VAPID keys, or null if not found or invalid.
 * Automatically clears corrupted values from LocalStorage.
 */
export function getVapidKeys(): VapidKeyPair | null {
	const publicKey = localStorage.getItem(KEYS.VAPID_PUBLIC);
	const privateKey = localStorage.getItem(KEYS.VAPID_PRIVATE);

	if (!publicKey || !privateKey)
		return null;

	if (!BASE64URL_RE.test(publicKey) || !BASE64URL_RE.test(privateKey)) {
		clearVapidKeys();
		return null;
	}

	// Validate public key is a 65-byte uncompressed P-256 point
	try {
		const decoded = base64UrlToUint8Array(publicKey);
		if (decoded.length !== UNCOMPRESSED_P256_PUBLIC_KEY_LENGTH || decoded[0] !== 0x04) {
			clearVapidKeys();
			return null;
		}
	}
	catch {
		clearVapidKeys();
		return null;
	}

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
