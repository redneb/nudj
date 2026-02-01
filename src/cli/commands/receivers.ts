import {defineCommand} from "citty";
import * as readline from "node:readline";
import {getReceivers, renameReceiver, removeReceiver} from "../lib/config.ts";

const renameCommand = defineCommand({
	meta: {
		name: "rename",
		description: "Rename a receiver",
	},
	args: {
		oldName: {
			type: "positional",
			description: "Current name of the receiver",
			required: true,
		},
		newName: {
			type: "positional",
			description: "New name for the receiver",
			required: true,
		},
	},
	run({args}) {
		const receivers = getReceivers();

		// Check if old name exists
		if (!receivers.some(r => r.name === args.oldName)) {
			console.error(`✗ No receiver named '${args.oldName}' found.`);
			process.exit(1);
		}

		// Check if new name is already taken
		if (receivers.some(r => r.name === args.newName)) {
			console.error(`✗ A receiver named '${args.newName}' already exists.`);
			process.exit(1);
		}

		const success = renameReceiver(args.oldName, args.newName);
		if (success)
			console.log(`✓ Renamed '${args.oldName}' → '${args.newName}'`);

		else {
			console.error(`✗ Failed to rename receiver.`);
			process.exit(1);
		}
	},
});

const removeCommand = defineCommand({
	meta: {
		name: "remove",
		description: "Remove a receiver",
	},
	args: {
		name: {
			type: "positional",
			description: "Name of the receiver to remove",
			required: true,
		},
		force: {
			type: "boolean",
			alias: "f",
			description: "Skip confirmation prompt",
			default: false,
		},
	},
	async run({args}) {
		const receivers = getReceivers();

		// Check if name exists
		if (!receivers.some(r => r.name === args.name)) {
			console.error(`✗ No receiver named '${args.name}' found.`);
			process.exit(1);
		}

		// Confirm removal
		if (!args.force) {
			const confirmed = await confirm(`Remove receiver '${args.name}'? [y/N] `);
			if (!confirmed) {
				console.log("Cancelled.");
				return;
			}
		}

		const success = removeReceiver(args.name);
		if (success)
			console.log(`✓ Removed '${args.name}'`);

		else {
			console.error(`✗ Failed to remove receiver.`);
			process.exit(1);
		}
	},
});

export const receiversCommand = defineCommand({
	meta: {
		name: "receivers",
		description: "List and manage paired receivers",
	},
	args: {
		json: {
			type: "boolean",
			description: "Output as JSON",
			default: false,
		},
	},
	subCommands: {
		rename: renameCommand,
		remove: removeCommand,
	},
	run({args}) {
		const receivers = getReceivers();

		if (receivers.length === 0) {
			console.log("No receivers configured. Run 'nudj pair' to add one.");
			return;
		}

		if (args.json) {
			const output = receivers.map(receiver => ({
				name: receiver.name,
				addedAt: receiver.addedAt,
				lastUsedAt: receiver.lastUsedAt,
			}));
			console.log(JSON.stringify(output, null, 2));
			return;
		}

		// Table output
		const header = "NAME          ADDED                 LAST USED";
		console.log(header);

		for (const receiver of receivers) {
			const name = receiver.name.padEnd(14);
			const added = formatDate(receiver.addedAt).padEnd(22);
			const lastUsed = receiver.lastUsedAt
				? formatDate(receiver.lastUsedAt)
				: "(never)";

			console.log(`${name}${added}${lastUsed}`);
		}
	},
});

/**
 * Format an ISO date string for display.
 */
function formatDate(isoString: string): string {
	const date = new Date(isoString);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Prompt for confirmation.
 */
async function confirm(prompt: string): Promise<boolean> {
	return new Promise((resolve) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		rl.question(prompt, (answer) => {
			rl.close();
			resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
		});
	});
}
