import {buildPushPayload} from "@block65/webcrypto-web-push";
import type {NotificationPayload} from "../../common/types.ts";
import type {ReceiverConfig} from "./types.ts";

export interface PushResult {
	name: string;
	success: boolean;
	error?: string;
	expired?: boolean;
}

const encoder = new TextEncoder();

/** Maximum encrypted payload size accepted by push services (RFC 8030). */
const MAX_ENCRYPTED_BYTES = 4_096;

/**
 * aes128gcm encryption overhead (RFC 8188 / 8291):
 * 16 (salt) + 4 (record size) + 1 (key ID len) + 65 (key ID) + 1 (padding) + 16 (AEAD tag)
 */
const ENCRYPTION_OVERHEAD = 103;

/** Maximum plaintext bytes available for the JSON payload. */
const MAX_PLAINTEXT_BYTES = MAX_ENCRYPTED_BYTES - ENCRYPTION_OVERHEAD;

const TRUNCATION_MARKER = "…";

/**
 * Ensure the payload fits within the Web Push encrypted-payload size limit.
 * Truncates body first, then title if needed, appending "…" to indicate truncation.
 */
export function fitPayload(
	payload: NotificationPayload,
): {payload: NotificationPayload, truncated: boolean} {
	if (payloadByteSize(payload) <= MAX_PLAINTEXT_BYTES)
		return {payload, truncated: false};

	// Stage 1: truncate body (keep original title)
	const truncatedBody = binarySearchTruncate(
		payload.body,
		candidate => payloadByteSize({...payload, body: candidate + TRUNCATION_MARKER}),
	);

	if (truncatedBody !== null) {
		return {
			payload: {...payload, body: truncatedBody + TRUNCATION_MARKER},
			truncated: true,
		};
	}

	// Stage 2: body fully removed and still too large — truncate title too
	const truncatedTitle = binarySearchTruncate(
		payload.title,
		candidate => payloadByteSize({
			...payload,
			title: candidate + TRUNCATION_MARKER,
			body: "",
		}),
	);

	if (truncatedTitle !== null) {
		return {
			payload: {
				...payload,
				title: truncatedTitle + TRUNCATION_MARKER,
				body: "",
			},
			truncated: true,
		};
	}

	// Unreachable in practice — even an empty title + body is well under the limit.
	throw new Error("Notification payload exceeds push size limit even when empty.");
}

/** Compute the UTF-8 byte length of the JSON-serialized payload data. */
function payloadByteSize(payload: NotificationPayload): number {
	return encoder.encode(JSON.stringify({
		title: payload.title,
		body: payload.body,
		timestamp: payload.timestamp,
	})).byteLength;
}

/**
 * Binary-search for the longest prefix of `text` where `measure(prefix) <= MAX_PLAINTEXT_BYTES`.
 * Returns the prefix, or `null` if even an empty string exceeds the limit.
 */
function binarySearchTruncate(
	text: string,
	measure: (candidate: string) => number,
): string | null {
	if (measure("") > MAX_PLAINTEXT_BYTES)
		return null;

	let lo = 0;
	let hi = text.length;

	while (lo < hi) {
		const mid = Math.ceil((lo + hi) / 2);
		if (measure(text.slice(0, mid)) <= MAX_PLAINTEXT_BYTES)
			lo = mid;
		else
			hi = mid - 1;
	}

	return text.slice(0, lo);
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

		// Surface a clear message for payload-too-large rejections
		if (
			response.status === 413
			|| (response.status === 400 && /size|too large|4096/i.test(errorText))
		) {
			return {
				name: receiver.name,
				success: false,
				error: "payload too large for push service",
			};
		}

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
