import {nodeResolve} from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";

export default {
	input: "src/cli/index.ts",
	output: {
		file: "dist/nudj.js",
		format: "esm",
	},
	plugins: [
		nodeResolve(),
		typescript({
			tsconfig: "./src/cli/tsconfig.json",
			outDir: undefined,
			declaration: false,
			declarationMap: false,
			// Explicitly set to avoid TS5110 warning about module/moduleResolution mismatch
			module: "NodeNext",
			moduleResolution: "NodeNext",
			// Disable sourcemaps for distribution - no .map file will be shipped
			sourceMap: false,
		}),
	],
	external: [/^node:/],
	onwarn(warning, warn) {
		// Suppress TS2878: cross-project import path rewrite warning.
		// Safe to ignore because Rollup handles module resolution during bundling.
		if (warning.message?.includes("TS2878"))
			return;
		warn(warning);
	},
};
