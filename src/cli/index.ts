#!/usr/bin/env node
import {defineCommand, runMain} from "citty";
import {pushCommand} from "./commands/push.ts";
import {pairCommand} from "./commands/pair.ts";
import {receiversCommand} from "./commands/receivers.ts";
import {configCommand} from "./commands/config.ts";

const main = defineCommand({
	meta: {
		name: "nudj",
		version: "0.1.0",
		description: "Send push notifications from your CLI to your phone",
	},
	subCommands: {
		push: pushCommand,
		pair: pairCommand,
		receivers: receiversCommand,
		config: configCommand,
	},
});

void runMain(main);
