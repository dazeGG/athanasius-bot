# CLAUDE.md

This file is a Claude-specific overlay on top of [AGENTS.md](./AGENTS.md). Read AGENTS.md first — it is the authoritative reference for game rules, architecture, code style, and agent expectations. This file only adds or overrides where Claude's behavior differs from the general agent contract.

## Decision Policy

When sources conflict, resolve in this order:

1. The user's current instruction.
2. This file.
3. [AGENTS.md](./AGENTS.md).
4. [README.md](./README.md).
5. Current code — only when it does not conflict with documented intended behavior.

If the codebase violates a documented rule, prefer moving the implementation toward the documented rule, not patching the docs to match the code.

## Working Approach

When implementing a change:

1. Read the full module chain before editing — a one-file patch is almost never enough for gameplay work.
2. Decide whether the task changes product rules or only implementation details; the answer determines the blast radius.
3. Prefer minimal, coherent patches over scattered fixes.
4. Preserve persisted data compatibility unless the user explicitly asks for a breaking change.
5. Update docs when user-facing rules or setup instructions change.
6. Known deferred issues live in [TOFIX.md](./TOFIX.md) — check it when picking up polish work or touching the listed areas.

When making gameplay changes, explicitly sanity-check before calling the task done:

- who can be targeted (empty-hand players must not appear);
- what ranks are askable (only ranks the active player currently holds);
- when the turn advances (failure or active player's hand empties after steal);
- when an Athanasius is formed and logged;
- when the game ends (all hands empty).

## What To Protect

These invariants are easy to break silently because the project compiles fine without them:

- The target-selection keyboard must never show players with empty hands.
- Every turn resolution must produce a log entry: failures at any declaration stage, and every successful suits-stage outcome.
- Keyboard constraints and server-side validation must describe the same rules — keyboard-only enforcement is not enough.
- Notification text must match actual game behavior; a mismatch is an information leak.
- A change in any turn stage usually requires updates in parsing, keyboard generation, stage text, `Game` aggregate, `Hand` validation, notifications, and log formatting.

## Deployment Assumptions

The current deployment story (not covered in AGENTS.md):

- Ubuntu server.
- `nvm` for Node version management.
- `pm2` for process supervision.
- Local writable `db.json`.
- Local writable `logs/`.

Documented deployment commands live in [README.md](./README.md).
