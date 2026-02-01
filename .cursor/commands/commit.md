# Commit (staged only)

Create a git commit for the **already-staged** changes in this repo.

## Guardrails
- **Assume the changes to commit are already staged.** Do **not** stage anything (`git add`, `git commit -a`, etc.).
- **Do not report** unstaged changes or untracked files. Avoid `git status` and avoid `git diff` without `--cached`.
- If there are **no staged changes**, stop and say so.

## Figure out what's being committed
- First, infer the staged changes from the **current chat history**:
	- If the chat included a **previous commit**, only commit the changes made **after that commit**.
	- If there was **no previous commit** mentioned, assume the commit includes **all changes made in this chat**.
- Only if you are **not sure** what's staged, run **exactly**: `git diff --cached` to confirm.

## Commit message format (use what this repo actually uses)
Use **Conventional Commits** in the subject line:
- **Subject**: `type(scope): summary`
	- `type` examples used here: `feat`, `fix`, `refactor`, `chore`
	- `scope` is common (e.g. `cli`, `web`, `common`, `deps`), but optional when it adds no value
	- Write an imperative, concise summary; no trailing period
- Blank line.
- **Body**: Markdown paragraphs and/or bullet lists. Wrap identifiers, symbols, file paths, and code-ish terms in backticks (e.g. `sendPush`, `src/cli/commands/push.ts`).
	- Prefer "what/why"; include a short "Rationale"/"Overview" section if it helps.

## Execute the commit
- Create the commit using the staged changes only.
- Use a 2-part message:
	- `git commit -m "<subject>" -m "<body>"`
	- Treat the commit message as Markdown (use backticks for identifiers/keywords).
