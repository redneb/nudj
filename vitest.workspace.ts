import { defineWorkspace } from "vitest/config";
import solid from "vite-plugin-solid";

export default defineWorkspace([
	{
		test: {
			name: "cli",
			include: ["src/cli/**/*.test.ts"],
			environment: "node",
		},
	},
	{
		plugins: [solid()],
		test: {
			name: "web",
			include: ["src/web/**/*.test.{ts,tsx}"],
			environment: "jsdom",
		},
	},
]);
