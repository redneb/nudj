import {describe, it, expect, beforeEach, afterEach} from "vitest";
import {generateVapidKeys, base64UrlToUint8Array} from "./lib/vapid.ts";
import {getVapidKeys, setVapidKeys, clearVapidKeys} from "./lib/storage.ts";

describe("vapid", () => {
	it("should generate valid VAPID key pair", async () => {
		const keys = await generateVapidKeys();

		expect(keys.publicKey).toBeDefined();
		expect(keys.privateKey).toBeDefined();

		// Public key should be 65 bytes (uncompressed point) when decoded
		const publicKeyBytes = base64UrlToUint8Array(keys.publicKey);
		expect(publicKeyBytes.length).toBe(65);

		// Should start with 0x04 (uncompressed point format)
		expect(publicKeyBytes[0]).toBe(0x04);
	});

	it("should convert base64url to Uint8Array", () => {
		const base64url = "SGVsbG8gV29ybGQh"; // "Hello World!" in base64
		const bytes = base64UrlToUint8Array(base64url);

		const decoded = new TextDecoder().decode(bytes);
		expect(decoded).toBe("Hello World!");
	});

	it("should handle base64url padding", () => {
		// Test various lengths that require different padding
		const testCases = [
			{input: "YQ", expected: "a"}, // 1 byte, needs 2 padding
			{input: "YWI", expected: "ab"}, // 2 bytes, needs 1 padding
			{input: "YWJj", expected: "abc"}, // 3 bytes, no padding
		];

		for (const {input, expected} of testCases) {
			const bytes = base64UrlToUint8Array(input);
			const decoded = new TextDecoder().decode(bytes);
			expect(decoded).toBe(expected);
		}
	});
});

describe("storage", () => {
	// 65-byte uncompressed P-256 public key (0x04 prefix + 64 zero bytes), base64url-encoded
	const fakePublicKey = "B" + "A".repeat(86);
	const fakePrivateKey = "dGVzdC1wcml2YXRlLWtleQ";

	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		localStorage.clear();
	});

	it("should return null when no keys are stored", () => {
		const keys = getVapidKeys();
		expect(keys).toBeNull();
	});

	it("should store and retrieve keys", () => {
		const testKeys = {
			publicKey: fakePublicKey,
			privateKey: fakePrivateKey,
		};

		setVapidKeys(testKeys);
		const retrieved = getVapidKeys();

		expect(retrieved).not.toBeNull();
		expect(retrieved?.publicKey).toBe(testKeys.publicKey);
		expect(retrieved?.privateKey).toBe(testKeys.privateKey);
	});

	it("should clear keys", () => {
		setVapidKeys({
			publicKey: fakePublicKey,
			privateKey: fakePrivateKey,
		});

		clearVapidKeys();
		const keys = getVapidKeys();

		expect(keys).toBeNull();
	});
});
