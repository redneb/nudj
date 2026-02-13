---
name: release
description: Release (version bump)
disable-model-invocation: true
---

# Release (version bump)

Cut a new release by bumping the **SemVer** version and committing the bump.

## Input parsing
- Parse one release target from the chat message:
	- explicit version: `1.2.3` or `v1.2.3`
	- explicit bump type: **patch**, **minor**, or **major**
	- inferred bump type: **auto**
- Use this precedence:
	1. explicit version
	2. explicit bump type
	3. **auto**
	4. none specified:
		- if **auto** can be evaluated, compute **patch**, **minor**, and **major**, then ask the user to choose with a recommendation:
			- `Recommended: <auto bump type> (<computed auto version>)`
		- if **auto** cannot be evaluated safely, compute **patch**, **minor**, and **major** and ask the user to choose with no recommendation
- If prompting the user, show:
	- **patch**: `<computed patch version>`
	- **minor**: `<computed minor version>`
	- **major**: `<computed major version>`

## Determine previous version
- Read `package.json` `version` as `packageVersion`.
- Find the latest SemVer release tag reachable from `HEAD` matching `v<MAJOR>.<MINOR>.<PATCH>`. Use it as `tagVersion`.
- Baseline selection:
	- if `tagVersion` exists: use `tagVersion` as `previousVersion`
	- else:
		- warn the user that no previous release tag exists
		- set `previousVersion = packageVersion`
		- disable **auto** bump detection for this run (manual `patch|minor|major` only)
- If `tagVersion` exists and `tagVersion != packageVersion`, stop and ask the user which baseline to trust before continuing.

## Compute the next version
- Treat `previousVersion` as \(MAJOR.MINOR.PATCH\).
- Next versions:
	- **patch**: increment PATCH by 1; keep MAJOR and MINOR
	- **minor**: increment MINOR by 1; set PATCH to 0; keep MAJOR
	- **major**: increment MAJOR by 1; set MINOR and PATCH to 0

## Decide bump type for `auto`
- Determine commit range:
	- if `tagVersion` exists: `v<tagVersion>..HEAD`
	- else: **auto is unavailable** for this run; ask the user to choose an explicit bump type
- If there are no commits in range, stop and ask the user (nothing to release).
- Parse commit subjects and bodies in range using Conventional Commits cues.
- Decision order:
	1. **major** if any commit has `BREAKING CHANGE:` in body/footer, or `type(scope)!:` / `type!:` in subject
	2. **minor** if no major and any commit subject starts with `feat` (for example `feat:` or `feat(scope):`)
	3. **patch** otherwise
- Ambiguity guardrail:
	- if no commit matches any Conventional Commits cue, ask the user to choose **patch**, **minor**, or **major** instead of guessing.
- Before applying the bump, print the detected bump type and the matching commit evidence, then allow user override.

## Guardrails (don't mix unrelated changes)
- If there are **staged changes**, stop and ask the user to commit/stash/clean them first.
- If there are **unstaged changes to tracked files**, stop and ask the user to commit/stash/clean them first.
- **Do not** stop for **untracked files**.

## Apply the version bump
- Bump the version, create the commit, and create the git tag using:
	- `npm version <newVersion> -m 'chore(release): v%s'`
- This updates `package.json` and `package-lock.json`, commits them, and creates a git tag (e.g. `v<newVersion>`).

## Output summary
When finished, print a short summary:
- Previous version: `<previousVersion>`
- New version: `<newVersion>`
- Bump type: `<patch|minor|major|explicit>`
- Bump source: `<explicit-version|explicit-type|auto>`
