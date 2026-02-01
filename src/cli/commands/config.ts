import {defineCommand} from "citty";
import {getConfigPath, getReceivers} from "../lib/config.ts";

export const configCommand = defineCommand({
	meta: {
		name: "config",
		description: "Show configuration file location",
	},
	args: {
		path: {
			type: "boolean",
			description: "Print only the path (for scripting)",
			default: false,
		},
	},
	run({args}) {
		const configPath = getConfigPath();

		if (args.path) {
			console.log(configPath);
			return;
		}

		const receivers = getReceivers();
		console.log(`Configuration file: ${configPath}`);
		console.log(`Receivers configured: ${receivers.length}`);
	},
});
