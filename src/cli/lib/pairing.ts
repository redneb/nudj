import type {PairingData} from "../../common/types.ts";

/**
 * Decode a base64url-encoded string to a buffer.
 */
function base64UrlDecode(input: string): Uint8Array {
	// Convert base64url to base64
	let base64 = input
		.replace(/-/g, "+")
		.replace(/_/g, "/");

	// Add padding if needed
	const padding = base64.length % 4;
	if (padding)
		base64 += "=".repeat(4 - padding);

	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++)
		bytes[i] = binary.charCodeAt(i);

	return bytes;
}

/**
 * Decode and validate a pairing code.
 * Returns the parsed PairingData or null if invalid.
 */
export function decodePairingCode(code: string): PairingData | null {
	try {
		// Remove whitespace
		const cleanCode = code.trim().replace(/\s/g, "");

		// Decode base64url
		const bytes = base64UrlDecode(cleanCode);
		const jsonString = new TextDecoder().decode(bytes);

		// Parse JSON
		const data = JSON.parse(jsonString) as unknown;

		// Validate structure
		if (!isValidPairingData(data))
			return null;

		return data;
	}
	catch {
		return null;
	}
}

/**
 * Type guard to validate PairingData structure.
 */
function isValidPairingData(data: unknown): data is PairingData {
	if (typeof data !== "object" || data === null)
		return false;

	const obj = data as Record<string, unknown>;

	// Check endpoint
	if (typeof obj["endpoint"] !== "string" || !obj["endpoint"])
		return false;

	// Check keys
	if (typeof obj["keys"] !== "object" || obj["keys"] === null)
		return false;

	const keys = obj["keys"] as Record<string, unknown>;
	if (typeof keys["p256dh"] !== "string" || !keys["p256dh"])
		return false;

	if (typeof keys["auth"] !== "string" || !keys["auth"])
		return false;

	// Check vapid
	if (typeof obj["vapid"] !== "object" || obj["vapid"] === null)
		return false;

	const vapid = obj["vapid"] as Record<string, unknown>;
	if (typeof vapid["privateKey"] !== "string" || !vapid["privateKey"])
		return false;

	return true;
}
