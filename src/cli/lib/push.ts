import {buildPushPayload} from "@block65/webcrypto-web-push";
import type {NotificationPayload} from "../../common/types.ts";
import type {ReceiverConfig} from "./types.ts";

export interface PushResult {
	name: string;
	success: boolean;
	error?: string;
	expired?: boolean;
}

/**
 * Send a push notification to a receiver.
 */
export async function sendPush(
	receiver: ReceiverConfig,
	payload: NotificationPayload,
): Promise<PushResult> {
	try {
		// Build the encrypted payload
		const pushPayload = await buildPushPayload(
			{
				data: {
					title: payload.title,
					body: payload.body,
					timestamp: payload.timestamp,
				},
				options: {ttl: 86_400},
			},
			{
				endpoint: receiver.endpoint,
				expirationTime: null,
				keys: {
					p256dh: receiver.keys.p256dh,
					auth: receiver.keys.auth,
				},
			},
			{
				subject: "https://github.com/redneb/nudj",
				...(await deriveVapidKeys(receiver.vapid.privateKey)),
			},
		);

		// Send the push notification
		const response = await fetch(receiver.endpoint, {
			method: "POST",
			headers: pushPayload.headers,
			body: pushPayload.body,
		});

		if (response.ok || response.status === 201)
			return {name: receiver.name, success: true};

		// Check for subscription expiration (410 Gone)
		if (response.status === 410) {
			return {
				name: receiver.name,
				success: false,
				error: "subscription expired",
				expired: true,
			};
		}

		// Other errors
		const errorText = await response.text().catch(() => "");
		return {
			name: receiver.name,
			success: false,
			error: `HTTP ${response.status}${errorText ? `: ${errorText}` : ""}`,
		};
	}
	catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		return {
			name: receiver.name,
			success: false,
			error: errorMessage,
		};
	}
}

function base64UrlToBytes(base64Url: string): Uint8Array {
	let base64 = base64Url
		.replace(/-/g, "+")
		.replace(/_/g, "/");

	const padding = base64.length % 4;
	if (padding)
		base64 += "=".repeat(4 - padding);

	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++)
		bytes[i] = binary.charCodeAt(i);

	return bytes;
}

function bytesToBase64Url(bytes: Uint8Array): string {
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
 * Derive the public key from a private key.
 * The private key is in PKCS#8 format (base64url encoded).
 */
async function deriveVapidKeys(
	privateKeyBase64url: string,
): Promise<{publicKey: string, privateKey: string}> {
	const privateKey = await crypto.subtle.importKey(
		"pkcs8",
		base64UrlToBytes(privateKeyBase64url),
		{name: "ECDSA", namedCurve: "P-256"},
		true,
		["sign"],
	);

	const jwk = await crypto.subtle.exportKey("jwk", privateKey);
	if (!jwk.d || !jwk.x || !jwk.y)
		throw new Error("VAPID private key missing required components.");

	const xBytes = base64UrlToBytes(jwk.x);
	const yBytes = base64UrlToBytes(jwk.y);
	const publicKeyBytes = new Uint8Array(1 + xBytes.length + yBytes.length);
	publicKeyBytes[0] = 0x04;
	publicKeyBytes.set(xBytes, 1);
	publicKeyBytes.set(yBytes, 1 + xBytes.length);

	return {
		publicKey: bytesToBase64Url(publicKeyBytes),
		privateKey: bytesToBase64Url(base64UrlToBytes(jwk.d)),
	};
}
