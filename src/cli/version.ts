import {createRequire} from "node:module";

/**
 * Reads the version from the nearest package.json at runtime.
 *
 * In the rollup bundle, `@rollup/plugin-replace` substitutes the call below
 * with a string literal, turning this function into dead code that rollup
 * tree-shakes away.
 */
function readVersionFromPackageJson(): string {
	const pkg = createRequire(import.meta.url)("../../package.json") as {version: string};
	return pkg.version;
}

// CAUTION: @rollup/plugin-replace matches the exact string
// "readVersionFromPackageJson();" below. If you rename the function or
// restructure this line, update rollup.config.js to match.
export const VERSION: string = readVersionFromPackageJson();
