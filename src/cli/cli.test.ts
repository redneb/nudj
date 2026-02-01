import {describe, it, expect, beforeEach, afterEach} from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {decodePairingCode} from "./lib/pairing.ts";
import {
	readConfig,
	writeConfig,
	addReceiver,
	removeReceiver,
	renameReceiver,
	getConfigPath,
} from "./lib/config.ts";
import type {PairingData} from "../common/types.ts";
import type {ReceiverConfig} from "./lib/types.ts";

describe("pairing", () => {
	it("should decode a valid pairing code", () => {
		const pairingData: PairingData = {
			endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
			keys: {
				p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA",
				auth: "tBHItJI5svbpez7KI4CCXg",
			},
			vapid: {
				privateKey: "dGhpcyBpcyBhIHRlc3Qga2V5Li4u",
			},
		};

		// Encode to base64url
		const json = JSON.stringify(pairingData);
		const base64 = btoa(json);
		const base64url = base64
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/, "");

		// Decode and verify
		const result = decodePairingCode(base64url);
		expect(result).not.toBeNull();
		expect(result?.endpoint).toBe(pairingData.endpoint);
		expect(result?.keys.p256dh).toBe(pairingData.keys.p256dh);
		expect(result?.keys.auth).toBe(pairingData.keys.auth);
		expect(result?.vapid.privateKey).toBe(pairingData.vapid.privateKey);
	});

	it("should return null for invalid pairing code", () => {
		expect(decodePairingCode("invalid")).toBeNull();
		expect(decodePairingCode("")).toBeNull();
		expect(decodePairingCode("{}")).toBeNull();
	});

	it("should return null for missing required fields", () => {
		const incomplete = {endpoint: "https://example.com"};
		const json = JSON.stringify(incomplete);
		const base64url = btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

		expect(decodePairingCode(base64url)).toBeNull();
	});
});

describe("config", () => {
	let tempDir: string;
	const originalEnv = process.env["NUDJ_CONFIG"];

	beforeEach(() => {
		// Create temp directory for test config
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nudj-test-"));
		process.env["NUDJ_CONFIG"] = path.join(tempDir, "config.json");
	});

	afterEach(() => {
		// Restore original env and clean up temp dir
		if (originalEnv)
			process.env["NUDJ_CONFIG"] = originalEnv;

		else
			delete process.env["NUDJ_CONFIG"];

		fs.rmSync(tempDir, {recursive: true, force: true});
	});

	it("should return empty config when file does not exist", () => {
		const config = readConfig();
		expect(config.receivers).toEqual([]);
	});

	it("should write and read config", () => {
		const config = {receivers: []};
		writeConfig(config);

		const read = readConfig();
		expect(read.receivers).toEqual([]);
	});

	it("should add a receiver", () => {
		const receiver: ReceiverConfig = {
			name: "Test Phone",
			endpoint: "https://example.com/push",
			keys: {p256dh: "abc", auth: "def"},
			vapid: {privateKey: "ghi"},
			addedAt: new Date().toISOString(),
			lastUsedAt: null,
		};

		addReceiver(receiver);

		const config = readConfig();
		expect(config.receivers).toHaveLength(1);
		expect(config.receivers[0]?.name).toBe("Test Phone");
	});

	it("should remove a receiver", () => {
		const receiver: ReceiverConfig = {
			name: "Test Phone",
			endpoint: "https://example.com/push",
			keys: {p256dh: "abc", auth: "def"},
			vapid: {privateKey: "ghi"},
			addedAt: new Date().toISOString(),
			lastUsedAt: null,
		};

		addReceiver(receiver);
		expect(readConfig().receivers).toHaveLength(1);

		const removed = removeReceiver("Test Phone");
		expect(removed).toBe(true);
		expect(readConfig().receivers).toHaveLength(0);
	});

	it("should return false when removing non-existent receiver", () => {
		const removed = removeReceiver("Non-existent");
		expect(removed).toBe(false);
	});

	it("should rename a receiver", () => {
		const receiver: ReceiverConfig = {
			name: "Old Name",
			endpoint: "https://example.com/push",
			keys: {p256dh: "abc", auth: "def"},
			vapid: {privateKey: "ghi"},
			addedAt: new Date().toISOString(),
			lastUsedAt: null,
		};

		addReceiver(receiver);
		const renamed = renameReceiver("Old Name", "New Name");

		expect(renamed).toBe(true);
		const config = readConfig();
		expect(config.receivers[0]?.name).toBe("New Name");
	});

	it("should return false when renaming non-existent receiver", () => {
		const renamed = renameReceiver("Non-existent", "New Name");
		expect(renamed).toBe(false);
	});

	it("should use NUDJ_CONFIG env var for config path", () => {
		const configPath = getConfigPath();
		expect(configPath).toBe(path.join(tempDir, "config.json"));
	});
});
