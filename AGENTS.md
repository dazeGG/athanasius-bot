# AGENTS.md

## Purpose

This file describes the intended product behavior and engineering conventions for AI coding agents working on `athanasius-bot`.

Use this document as the project-level guide for understanding the game, the architecture, and the expected implementation style.

## Priority Of Truth

When sources disagree, use this order:

1. Explicit user instruction in the current task.
2. This file.
3. [README.md](./README.md).
4. Current implementation details in code.

Important: this repository should be documented and evolved toward the intended product behavior, not merely the current behavior. If code conflicts with the rules below, prefer the target product rules and fix the implementation carefully.

## Product Overview

`athanasius-bot` is a Telegram bot for the card game Athanasius.

Core product capabilities:

- user registration with unique in-game names;
- room creation and joining by invite code;
- room-level game setup before match start;
- active match management;
- per-player hand inspection;
- turn notifications and game summary messaging.

The bot currently uses Telegram long polling, not webhooks.

## Active Domain Model

The project has three main persistent domains:

- `users`
- `rooms`
- `games`

Data is stored in `lowdb` inside the root [db.json](./db.json) file.

Active room settings:

- `joinCode`
- `decksCount`

The following room settings exist in the schema but are not active product features — do not treat them as gameplay unless the user explicitly asks: `deckType`, `towHands`, `allowMailing`, `allowMailingAtTurn`.

Active user settings:

- `updatesView`: controls how in-game notifications are delivered. `'instant'` sends each event (steal, fail, Athanasius) as it happens. `'composed'` suppresses real-time events for that player and instead delivers a summary of the last round at the start of their next turn. Players with `composed` view are excluded from broadcast mailings in the notification service — preserve this exclusion whenever adding new game notifications. Exception: when a player is the direct victim of a steal, they always receive an instant notification about their own card being taken, regardless of `updatesView`. The composed exclusion applies to observer broadcasts, not to the victim's own event.

## Target Game Rules

The following rules are the intended product behavior and should guide implementation decisions.

### Match Setup

1. A room needs at least 3 players to start a game.
2. The game uses `decksCount` standard 52-card decks.
3. All decks are merged, shuffled, and dealt round-robin to all players.
4. Turn order is randomized once when the game starts.

### Turn Flow

Each turn is a staged declaration:

1. Choose a target player.
2. Choose a rank.
3. Choose the total number of cards of that rank in the target hand.
4. Choose the red/black split.
5. Choose the exact suit distribution.

The declaration is only successful if the full statement is exact.

### Mandatory Restrictions

1. The active player may only ask for a rank that already exists in their own hand.
2. The active player may only target players who still have cards in hand.
3. Players with empty hands must not appear in the target selection keyboard.
4. Players with empty hands are skipped in turn order.

### Successful Turn

1. On success, all cards of the declared rank are moved from the target player to the active player.
2. The active player keeps the turn.
3. Exception: if the active player's hand becomes empty after the successful steal and the game is not over, the turn must pass to the next player who still has cards.

### Failed Turn

1. If the active player is wrong at any stage of the declaration, the turn fails.
2. On failure, the turn passes to the next player who still has cards.

### Athanasius Composition

1. An Athanasius is a complete set of one rank across all active decks.
2. The required count is `decksCount * 4`.
3. When a player completes an Athanasius, that full set is removed from the hand automatically.
4. Completed Athanasius sets are stored separately and count toward the final score.

### End Of Game

1. The game ends when no player has cards left in hand.
2. Final ranking is based on the number of completed Athanasius sets.
3. The end-game summary always awards: 🥇 first place, 🥈 second place, 🥉 third place (only when third place is not also the last place), numeric `N.` markers for any remaining middle positions (4th, 5th, …), and 🦧 the last-placed player — regardless of total player count. The monkey emoji is always present and always belongs to the last player only. The bronze medal belongs to third place only and must never be awarded to more than one player.

## Architecture Map

Use the existing structure unless the task explicitly asks for refactoring.

- [src/index.ts](./src/index.ts): process entrypoint.
- [src/core](./src/core): bot bootstrap, handler registries, state storage, logger, utility plumbing.
- [src/modules](./src/modules): user-facing Telegram modules.
- [src/entities/deck](./src/entities/deck): cards, deck config, sorting, display helpers.
- [src/entities/game](./src/entities/game): game aggregate, hand model, queue model, turn services, game logs.
- [src/shared](./src/shared): shared keyboards, UI texts, reusable helpers.
- [src/db](./src/db): lowdb setup, schemas, ORM-like access layer.

## Main Runtime Flow

High-level runtime:

1. The bot starts in [src/index.ts](./src/index.ts).
2. Commands are registered.
3. Modules register message handlers and callback handlers.
4. A callback from the game UI is parsed into staged turn metadata.
5. The game service processes the stage and updates Telegram UI.
6. On the last stage, the game aggregate validates the declaration, applies card movement, handles Athanasius creation, advances turn state, and persists the result.

## Critical Invariants For Game Changes

When you change gameplay, do not patch only one layer.

Turn-related changes usually require coordinated updates across:

- callback metadata shape and parsing;
- inline keyboards;
- game stage texts and confirmation messages;
- turn-processing services;
- `Game.turn()` and state persistence;
- `Hand.has()` and related validation logic;
- logs and player notifications.

If you change one of these and ignore the rest, the bot will often remain compile-safe while becoming behaviorally inconsistent.

## Code Style

Follow repository conventions:

- TypeScript with `strict` mode.
- ESM imports.
- Path aliases based on `~`.
- Tabs for indentation.
- Semicolons required.
- Single quotes required.
- Trailing commas in multiline structures.
- Curly braces on all control blocks.
- Prefer `import type` for type-only imports.

The project lint rules are defined in [eslint.config.js](./eslint.config.js).

## Commit Convention

Recent history establishes the default commit style for this repository.

Use semantic commits in the form:

```text
type(scope): imperative summary
```

Default expectations:

- prefer lowercase commit types such as `refactor`, `fix`, `feat`, `test`, `docs`, `chore`;
- prefer a scope when the change is localized, for example `core`, `modules`, `game`, `tests`, `db`, `deps`;
- keep the summary short, in English, and action-oriented;
- keep each commit behaviorally coherent — do not mix unrelated refactors and test rewrites in one commit unless they are inseparable;
- avoid `wip` and vague subjects such as `misc changes` or `fix stuff`.

Examples aligned with recent commits:

- `refactor(modules): migrate rooms module to grammY InlineKeyboard and ctx methods`
- `refactor(game): migrate game module and notifications to ctx.api and InlineKeyboard`
- `refactor: update bootstrap and shared modules after ctx.reply migration`

## Coding Preferences

- Preserve the current modular separation between `core`, `modules`, `entities`, `shared`, and `db`.
- Put pure domain logic in `entities`, not in Telegram handler files.
- Keep Telegram transport concerns in `modules`, `shared/ui`, and `core`.
- Prefer extending existing helpers instead of duplicating formatting or callback composition logic.
- Keep user-facing copy consistent across all stages of the flow.

## Data And Persistence

- Persistent state lives in [db.json](./db.json).
- Runtime logs are written under [logs](./logs).
- Changes that alter saved schemas should be made deliberately and kept backward-compatible when possible.

## Local Run Commands

Use:

```bash
nvm install
nvm use
corepack enable
pnpm install
pnpm dev
```

The bot requires:

```env
BOT_TOKEN=your_telegram_bot_token
```

## Agent Expectations

When acting as an AI contributor:

- optimize for target product behavior, not accidental current behavior;
- preserve gameplay invariants;
- avoid hidden rule changes;
- keep docs aligned when user-facing behavior changes;
- explain tradeoffs when a requested change impacts turn fairness or information leakage.
