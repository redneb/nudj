import {defineConfig} from "vitest/config";
import solid from "vite-plugin-solid";
import {resolve} from "node:path";

const __dirname = import.meta.dirname;

export default defineConfig({
	root: "src/web",
	cacheDir: resolve(__dirname, "node_modules/.vite"),
	plugins: [solid()],
	build: {
		outDir: "../../dist/web",
		emptyOutDir: true,
		rollupOptions: {
			input: {
				"main": resolve(__dirname, "src/web/index.html"),
				"service-worker": resolve(__dirname, "src/web/service-worker.ts"),
			},
			output: {
				entryFileNames: (chunkInfo) => {
					// Service worker must have a stable name (not hashed) for registration
					if (chunkInfo.name === "service-worker")
						return "service-worker.js";
					return "assets/[name]-[hash].js";
				},
			},
		},
	},
	publicDir: "../../public",
	test: {
		projects: [
			{
				test: {
					name: "cli",
					root: __dirname,
					include: ["src/cli/**/*.test.ts"],
					environment: "node",
				},
			},
			{
				plugins: [solid()],
				test: {
					name: "web",
					root: __dirname,
					include: ["src/web/**/*.test.{ts,tsx}"],
					environment: "jsdom",
				},
			},
		],
	},
});
