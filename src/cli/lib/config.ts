import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type {Config, ReceiverConfig} from "./types.ts";

/**
 * Get the config directory path following XDG Base Directory Specification.
 */
export function getConfigDir(): string {
	if (process.env["NUDJ_CONFIG"])
		return path.dirname(process.env["NUDJ_CONFIG"]);

	if (process.platform === "win32") {
		const appData = process.env["APPDATA"];
		if (appData)
			return path.join(appData, "nudj");

		return path.join(os.homedir(), "AppData", "Roaming", "nudj");
	}

	const xdgConfig = process.env["XDG_CONFIG_HOME"];
	if (xdgConfig)
		return path.join(xdgConfig, "nudj");

	return path.join(os.homedir(), ".config", "nudj");
}

/**
 * Get the config file path.
 */
export function getConfigPath(): string {
	if (process.env["NUDJ_CONFIG"])
		return process.env["NUDJ_CONFIG"];

	return path.join(getConfigDir(), "config.json");
}

/**
 * Read the config file.
 */
export function readConfig(): Config {
	const configPath = getConfigPath();

	if (!fs.existsSync(configPath))
		return {receivers: []};

	try {
		const content = fs.readFileSync(configPath, "utf-8");
		const config = JSON.parse(content) as Config;

		// Ensure receivers array exists
		if (!config.receivers)
			config.receivers = [];

		return config;
	}
	catch {
		// If config is malformed, return empty config
		return {receivers: []};
	}
}

/**
 * Write the config file atomically (write to temp file, then rename).
 * This prevents data loss if the process crashes during write.
 */
export function writeConfig(config: Config): void {
	const configPath = getConfigPath();
	const configDir = path.dirname(configPath);

	// Ensure config directory exists
	if (!fs.existsSync(configDir))
		fs.mkdirSync(configDir, {recursive: true});

	// Write to a temporary file first, then rename for atomicity
	const tempPath = `${configPath}.tmp.${process.pid}`;
	fs.writeFileSync(tempPath, JSON.stringify(config, null, "\t"), "utf-8");
	fs.renameSync(tempPath, configPath);
}

/**
 * Get a receiver by name.
 */
export function getReceiver(name: string): ReceiverConfig | undefined {
	const config = readConfig();
	return config.receivers.find((receiver: ReceiverConfig) => receiver.name === name);
}

/**
 * Get all receivers.
 */
export function getReceivers(): ReceiverConfig[] {
	return readConfig().receivers;
}

/**
 * Add a receiver to the config.
 */
export function addReceiver(receiver: ReceiverConfig): void {
	const config = readConfig();
	config.receivers.push(receiver);
	writeConfig(config);
}

/**
 * Remove a receiver by name.
 */
export function removeReceiver(name: string): boolean {
	const config = readConfig();
	const index = config.receivers.findIndex((receiver: ReceiverConfig) => receiver.name === name);

	if (index === -1)
		return false;

	config.receivers.splice(index, 1);
	writeConfig(config);
	return true;
}

/**
 * Rename a receiver.
 */
export function renameReceiver(oldName: string, newName: string): boolean {
	const config = readConfig();
	const receiver = config.receivers.find((r: ReceiverConfig) => r.name === oldName);

	if (!receiver)
		return false;

	receiver.name = newName;
	writeConfig(config);
	return true;
}

/**
 * Update a receiver's lastUsedAt timestamp.
 */
export function updateReceiverLastUsed(name: string): void {
	const config = readConfig();
	const receiver = config.receivers.find((r: ReceiverConfig) => r.name === name);

	if (receiver) {
		receiver.lastUsedAt = new Date().toISOString();
		writeConfig(config);
	}
}
