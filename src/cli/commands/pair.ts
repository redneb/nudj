import {defineCommand} from "citty";
import * as readline from "node:readline";
import {decodePairingCode} from "../lib/pairing.ts";
import {addReceiver, getReceivers} from "../lib/config.ts";
import type {ReceiverConfig} from "../lib/types.ts";

export const pairCommand = defineCommand({
	meta: {
		name: "pair",
		description: "Add a new receiver by entering a pairing code",
	},
	args: {},
	async run() {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		const question = (prompt: string): Promise<string> => {
			return new Promise((resolve) => {
				rl.question(prompt, resolve);
			});
		};

		try {
			// Get pairing code
			const code = await question("Paste pairing code: ");
			const pairingData = decodePairingCode(code);

			if (!pairingData) {
				console.error("\n✗ Invalid pairing code. Make sure you copied the entire code from the nudj app.");
				process.exit(1);
			}

			// Get receiver name
			let name = "";
			const existingReceivers = getReceivers();

			while (!name) {
				const inputName = await question("Name for this receiver: ");
				const trimmedName = inputName.trim();

				if (!trimmedName) {
					console.error("Name cannot be empty.");
					continue;
				}

				// Check for duplicate name
				if (existingReceivers.some(r => r.name === trimmedName)) {
					console.error(`✗ A receiver named '${trimmedName}' already exists. Choose a different name.`);
					continue;
				}

				name = trimmedName;
			}

			// Create receiver config
			const receiver: ReceiverConfig = {
				name,
				endpoint: pairingData.endpoint,
				keys: pairingData.keys,
				vapid: pairingData.vapid,
				addedAt: new Date().toISOString(),
				lastUsedAt: null,
			};

			// Save receiver
			addReceiver(receiver);

			const totalReceivers = existingReceivers.length + 1;
			console.log(`\n✓ Receiver '${name}' added successfully`);
			console.log(`\nYou now have ${totalReceivers} receiver(s) configured.`);
		}
		finally {
			rl.close();
		}
	},
});
