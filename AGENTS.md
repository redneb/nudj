## Project context
- nudj is a tool that sends push notifications from a CLI to phones/tablets via a PWA.
- Uses the Web Push API with a "receiver-owned keys" model (PWA generates VAPID keys).
- Consists of two parts: CLI (Node.js) and PWA (Solid.js).
- See `README.md` for user-facing documentation and `docs/architecture.md` for architecture details.

## Global
- Do not use default exports.
- Communication: Keep responses brief and technical; assume senior-level context and avoid hand-holding or narrating routine operations.
- Always respect the repository ESLint config at `eslint.config.js`. Treat ESLint as the single source of truth for style and quality.
- Do not introduce any new ESLint errors. Use the IDE ESLint diagnostics to fix issues in the files you touch.
- Use tabs for indentation. Never use spaces for indentation.
- Use double quotes for strings and include semicolons.
- Use Stroustrup brace style. Keep one statement per line. No trailing spaces. Use Unix line endings.
- Do not reformat unrelated code. Make the smallest necessary edits to satisfy the linter and the task.
- This project uses Node ESM + TypeScript with `module: nodenext`.
- Within `src`, use `.ts`/`.tsx` extensions in relative imports (never `.js`), leveraging `rewriteRelativeImportExtensions`.
- Import Node.js builtin modules using the `node:` prefix (e.g., `node:fs`, `node:path`).

## When generating code
- Before returning code, mentally validate it against the ESLint rules and TypeScript settings.
- When editing `*.ts`/`*.tsx`, ensure all new/modified indentation uses tabs (never spaces).
- Prefer readability and explicit naming. Avoid single-letter identifiers.
- For integer literals, use `_` as thousands separators (e.g., `30_000` instead of `30000`).
- When `if`/`else` branches are significantly uneven, put the short branch first. This is especially important when the shorter branch is just a couple of lines long.

## Commands to use (non-interactive)
Prefer IDE ESLint and TypeScript diagnostics for per-file feedback. Use these commands sparingly:
- `npm run check:lint` for final verification or full-project scans.
- `npm run check:types` for final type-check verification.
- `npm run check` to run both type-checking and linting together.

## Project structure
- `src/cli/` — CLI code (Node.js, citty for argument parsing)
- `src/web/` — PWA code (Solid.js, runs in browser)
- `src/common/` — Shared type definitions (no DOM or Node types)
- Each directory has its own `tsconfig.json` with appropriate type definitions.

## Files
- `src/cli/**/*.ts`: Node.js environment. Import from `node:` prefix.
- `src/web/**/*.{ts,tsx}`: Browser environment. Use Solid.js patterns.
- `src/common/**/*.ts`: Environment-agnostic. No DOM or Node imports.
