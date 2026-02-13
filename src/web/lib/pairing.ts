/**
 * Pairing code generation for Web Push subscription.
 */

import type {PairingData} from "../../common/types.ts";

/**
 * Convert ArrayBuffer to base64url string.
 */
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < bytes.length; i++)
		binary += String.fromCharCode(bytes[i]!);

	const base64 = btoa(binary);
	return base64
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

/**
 * Generate a pairing code from a push subscription and VAPID private key.
 */
export function generatePairingCode(
	subscription: PushSubscription,
	vapidPrivateKey: string,
): string {
	const p256dhKey = subscription.getKey("p256dh");
	const authKey = subscription.getKey("auth");

	if (!p256dhKey || !authKey)
		throw new Error("Failed to get subscription keys");

	const pairingData: PairingData = {
		endpoint: subscription.endpoint,
		keys: {
			p256dh: arrayBufferToBase64Url(p256dhKey),
			auth: arrayBufferToBase64Url(authKey),
		},
		vapid: {
			privateKey: vapidPrivateKey,
		},
	};

	// Encode to base64url
	const json = JSON.stringify(pairingData);
	const bytes = new TextEncoder().encode(json);
	return arrayBufferToBase64Url(bytes.buffer);
}
