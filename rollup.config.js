import {readFileSync} from "node:fs";
import {nodeResolve} from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import typescript from "@rollup/plugin-typescript";

const pkg = JSON.parse(readFileSync("package.json", "utf-8"));

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
		// Runs after TypeScript so it operates on compiled JS, not raw .ts.
		// Replaces the readVersionFromPackageJson() call with a string literal,
		// turning the function into dead code that rollup tree-shakes away.
		replace({
			include: ["src/cli/version.ts"],
			preventAssignment: true,
			delimiters: ["", ""],
			values: {
				// Includes the trailing semicolon to avoid matching the
				// function declaration (`function readVersionFromPackageJson() {`).
				"readVersionFromPackageJson();": `${JSON.stringify(pkg.version)};`,
			},
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
