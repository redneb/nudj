# Release (version bump)

Cut a new release by bumping the **SemVer** version and committing the bump.

## Input parsing
- If the chat message includes an explicit version like `1.2.3` (or `v1.2.3`), use that version.
- Else if the message mentions **patch**, compute the next patch version and use it.
- Else if the message mentions **minor**, compute the next minor version and use it.
- Else if the message mentions **major**, compute the next major version and use it.
- Else compute **patch**, **minor**, and **major** next versions and ask the user to choose:
	- **patch**: `<computed patch version>`
	- **minor**: `<computed minor version>`
	- **major**: `<computed major version>`

## Compute the next version
- Read the current version from `package.json` (`version`).
- Treat it as \(MAJOR.MINOR.PATCH\).
- Next versions:
	- **patch**: increment PATCH by 1; keep MAJOR and MINOR
	- **minor**: increment MINOR by 1; set PATCH to 0; keep MAJOR
	- **major**: increment MAJOR by 1; set MINOR and PATCH to 0

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
