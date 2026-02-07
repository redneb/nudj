import {defineCommand} from "citty";
import {text} from "node:stream/consumers";
import {getReceivers, updateReceiverLastUsed, removeReceiver} from "../lib/config.ts";
import {sendPush, fitPayload} from "../lib/push.ts";

export const pushCommand = defineCommand({
	meta: {
		name: "push",
		description: "Send a push notification to receivers",
	},
	args: {
		message: {
			type: "positional",
			description: "The notification body text (use '-' to read from stdin)",
			required: true,
		},
		title: {
			type: "string",
			alias: "t",
			description: "Notification title",
			default: "nudj",
		},
		to: {
			type: "string",
			// Can be repeated to send to multiple specific receivers, e.g.:
			// nudj push --to iPhone --to iPad 'Meeting starting'
			description: "Send only to this receiver (repeat for multiple)",
		},
		quiet: {
			type: "boolean",
			alias: "q",
			description: "Suppress output on success",
			default: false,
		},
	},
	async run({args}) {
		// Get message (handle stdin)
		let message = args.message;
		if (message === "-")
			message = (await text(process.stdin)).trimEnd();

		// Get receivers
		const allReceivers = getReceivers();
		if (allReceivers.length === 0) {
			console.error("No receivers configured. Run 'nudj pair' to add one.");
			process.exit(2);
		}

		// Filter receivers if --to is specified
		let targetReceivers = allReceivers;
		if (args.to) {
			// Handle both single and multiple --to values
			const targetNames = Array.isArray(args.to) ? args.to : [args.to];
			targetReceivers = allReceivers.filter(r => targetNames.includes(r.name));

			if (targetReceivers.length === 0) {
				const names = targetNames.join(", ");
				console.error(`No receivers found matching: ${names}`);
				console.error("Run 'nudj receivers' to see available receivers.");
				process.exit(2);
			}
		}

		// Create payload, truncating if it would exceed the push size limit
		const {payload, truncated} = fitPayload({
			title: args.title,
			body: message,
			timestamp: Date.now(),
		});

		if (truncated)
			console.error("\u26a0 Message truncated to fit push notification size limit");

		// Send notifications, processing each result as it completes
		let hasFailure = false;
		await Promise.all(targetReceivers.map(async (receiver) => {
			const result = await sendPush(receiver, payload);
			if (result.success) {
				updateReceiverLastUsed(result.name);
				if (!args.quiet)
					console.log(`✓ ${result.name}: delivered`);
			}
			else {
				hasFailure = true;
				if (result.expired) {
					removeReceiver(result.name);
					console.error(`✗ ${result.name}: subscription expired (removed)`);
				}
				else
					console.error(`✗ ${result.name}: ${result.error}`);
			}
		}));

		if (hasFailure)
			process.exit(1);
	},
});
