/**
 * VAPID key generation using Web Crypto API.
 */

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
 * Generate ECDSA P-256 VAPID key pair.
 * Returns base64url-encoded public and private keys.
 */
export async function generateVapidKeys(): Promise<{publicKey: string, privateKey: string}> {
	const keyPair = await crypto.subtle.generateKey(
		{name: "ECDSA", namedCurve: "P-256"},
		true,
		["sign", "verify"],
	);

	// Export public key in raw format (uncompressed point)
	const publicKeyBuffer = await crypto.subtle.exportKey("raw", keyPair.publicKey);

	// Export private key in PKCS#8 format
	const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

	return {
		publicKey: arrayBufferToBase64Url(publicKeyBuffer),
		privateKey: arrayBufferToBase64Url(privateKeyBuffer),
	};
}

/**
 * Convert base64url-encoded public key to Uint8Array for applicationServerKey.
 */
export function base64UrlToUint8Array(base64Url: string): Uint8Array {
	// Convert base64url to base64
	let base64 = base64Url
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
