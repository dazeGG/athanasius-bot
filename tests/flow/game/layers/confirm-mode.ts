/**
 * confirm-mode.ts — confirmMode game turn flow coverage.
 */
import { describe, it } from 'vitest';
import { getLog, resetLog } from '../../../bootstrap';
import { assertKeyboardButton, assertNotSent, assertSent } from '../../../runner';
import type { CallbackCtx } from '../../../../src/core';

import { withCallbackMethods } from '../../../bootstrap';

import {
	ALICE,
	BOB,
	CAROL,
	cardIds,
	createUsers,
	makeGame,
	resetGameFlowCase,
	runTurn,
	seedGameState,
	turnMeta,
	STALE_GAME_MESSAGE_TEXT,
} from '../helpers';
import type { PlayerFixture } from '../helpers';

// ── Additional callback helpers ───────────────────────────────────────────────

const makeConfirmCallbackCtx = (player: PlayerFixture, meta: string, messageId = 1): CallbackCtx =>
	withCallbackMethods({
		chat: { id: player.id, type: 'private' as const },
		from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
		callbackData: { module: 'g', action: 'tc', meta },
		callbackQuery: {
			id: `cb-${player.id}-tc-${messageId}`,
			from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
			message: {
				message_id: messageId,
				chat: { id: player.id, type: 'private' as const },
				date: Math.floor(Date.now() / 1000),
			},
			chat_instance: '',
			data: `g:tc:${meta}`,
		},
	}) as unknown as CallbackCtx;

const makeBackCallbackCtx = (player: PlayerFixture, meta: string, messageId = 1): CallbackCtx =>
	withCallbackMethods({
		chat: { id: player.id, type: 'private' as const },
		from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
		callbackData: { module: 'g', action: 'tb', meta },
		callbackQuery: {
			id: `cb-${player.id}-tb-${messageId}`,
			from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
			message: {
				message_id: messageId,
				chat: { id: player.id, type: 'private' as const },
				date: Math.floor(Date.now() / 1000),
			},
			chat_instance: '',
			data: `g:tb:${meta}`,
		},
	}) as unknown as CallbackCtx;

const runConfirm = async (player: PlayerFixture, meta: string, messageId = 1): Promise<void> => {
	const handlers = await import('../../../../src/modules/game/handlers');
	await handlers.gameTurnConfirmCallbackHandler(makeConfirmCallbackCtx(player, meta, messageId));
};

const runBack = async (player: PlayerFixture, meta: string, messageId = 1): Promise<void> => {
	const handlers = await import('../../../../src/modules/game/handlers');
	await handlers.gameTurnBackCallbackHandler(makeBackCallbackCtx(player, meta, messageId));
};

// ── Seed helpers ──────────────────────────────────────────────────────────────

import type { ConfirmModeSettings } from '../../../../src/db';

const seedConfirmGame = async (confirmMode?: ConfirmModeSettings): Promise<void> => {
	await seedGameState({
		users: createUsers().map(u => {
			if (u.id !== ALICE.id) {
				return u;
			}

			return { ...u, settings: { ...u.settings, ...(confirmMode !== undefined ? { confirmMode } : {}) } };
		}),
		game: makeGame({
			players: [ALICE.id, BOB.id, CAROL.id],
			hands: {
				[ALICE.id]: [...cardIds('A', 'Diamonds'), ...cardIds('K', 'Clubs')],
				[BOB.id]: [...cardIds('A', 'Hearts'), ...cardIds('A', 'Spades')],
				[CAROL.id]: [...cardIds('3', 'Clubs')],
			},
		}),
	});
};

// ── Layer ─────────────────────────────────────────────────────────────────────

describe('ConfirmMode', async () => {

	// ── No confirm when confirmMode is undefined ──────────────────────────────

	it('card stage: turn processed normally when confirmMode is undefined', async () => {
		await resetGameFlowCase();
		await seedConfirmGame(undefined);

		await runTurn(ALICE, turnMeta.card('game-flow', BOB.id, 'A'));

		const log = getLog();
		assertNotSent(log, ALICE.id, 'Спрашиваем?');
		// Should advance to count stage
		assertSent(log, ALICE.id, 'Выбери сколько карт');
	});

	it('count select: processed normally when confirmMode is undefined', async () => {
		await resetGameFlowCase();
		await seedConfirmGame(undefined);

		await runTurn(ALICE, turnMeta.count('game-flow', BOB.id, 'A', 1, 'select'));

		const log = getLog();
		assertNotSent(log, ALICE.id, 'Спрашиваем?');
	});

	it('colors select: processed normally when confirmMode is undefined', async () => {
		await resetGameFlowCase();
		await seedConfirmGame(undefined);

		await runTurn(ALICE, turnMeta.colors('game-flow', BOB.id, 'A', 2, 1, 'select'));

		const log = getLog();
		assertNotSent(log, ALICE.id, 'Спрашиваем?');
	});

	it('suits select: processed normally when confirmMode is undefined', async () => {
		await resetGameFlowCase();
		await seedConfirmGame(undefined);

		await runTurn(ALICE, turnMeta.suits('game-flow', BOB.id, 'A', 2, 1, {
			hearts: 1, diamonds: 0, spades: 1, clubs: 0, action: 'select',
		}));

		const log = getLog();
		assertNotSent(log, ALICE.id, 'Спрашиваем?');
	});

	// ── No confirm when stage flag is false ───────────────────────────────────

	it('card stage with confirmMode.card = false: processed normally', async () => {
		await resetGameFlowCase();
		await seedConfirmGame({ card: false, count: false, colors: false, suits: false });

		await runTurn(ALICE, turnMeta.card('game-flow', BOB.id, 'A'));

		const log = getLog();
		assertNotSent(log, ALICE.id, 'Спрашиваем?');
		assertSent(log, ALICE.id, 'Выбери сколько карт');
	});

	// ── Confirm triggered ─────────────────────────────────────────────────────

	it('card stage with confirmMode.card = true: shows confirm dialog', async () => {
		await resetGameFlowCase();
		await seedConfirmGame({ card: true, count: false, colors: false, suits: false });

		await runTurn(ALICE, turnMeta.card('game-flow', BOB.id, 'A'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Спрашиваем?');
		assertSent(log, ALICE.id, 'Да · Нет');
		assertKeyboardButton(log, ALICE.id, 'Да', 'g:tc:1#game-flow#1002#A');
		assertKeyboardButton(log, ALICE.id, 'Нет', 'g:tb:c#game-flow#1002');
		// Should NOT advance to count stage
		assertNotSent(log, ALICE.id, 'Выбери сколько карт');
	});

	it('count select with confirmMode.count = true: shows confirm dialog', async () => {
		await resetGameFlowCase();
		await seedConfirmGame({ card: false, count: true, colors: false, suits: false });

		await runTurn(ALICE, turnMeta.count('game-flow', BOB.id, 'A', 1, 'select'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Спрашиваем?');
		assertSent(log, ALICE.id, 'Да · Нет');
	});

	it('colors select with confirmMode.colors = true: shows confirm dialog', async () => {
		await resetGameFlowCase();
		await seedConfirmGame({ card: false, count: false, colors: true, suits: false });

		await runTurn(ALICE, turnMeta.colors('game-flow', BOB.id, 'A', 2, 1, 'select'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Спрашиваем?');
		assertSent(log, ALICE.id, 'Да · Нет');
	});

	it('suits select with confirmMode.suits = true: shows confirm dialog', async () => {
		await resetGameFlowCase();
		await seedConfirmGame({ card: false, count: false, colors: false, suits: true });

		await runTurn(ALICE, turnMeta.suits('game-flow', BOB.id, 'A', 2, 1, {
			hearts: 1, diamonds: 0, spades: 1, clubs: 0, action: 'select',
		}));

		const log = getLog();
		assertSent(log, ALICE.id, 'Спрашиваем?');
		assertSent(log, ALICE.id, 'Да · Нет');
	});

	it('count +/- with confirmMode.count = true: NOT intercepted, updates count', async () => {
		await resetGameFlowCase();
		await seedConfirmGame({ card: false, count: true, colors: false, suits: false });

		await runTurn(ALICE, turnMeta.count('game-flow', BOB.id, 'A', 1, '+'));

		const log = getLog();
		assertNotSent(log, ALICE.id, 'Спрашиваем?');
		// Should re-render count keyboard
		assertSent(log, ALICE.id, 'Выбери сколько карт');
	});

	// ── Confirm flow — "Да" ───────────────────────────────────────────────────

	it('After confirm for card stage, pressing Да processes the turn', async () => {
		await resetGameFlowCase();
		await seedConfirmGame({ card: true, count: false, colors: false, suits: false });

		// First trigger confirm dialog
		const meta = turnMeta.card('game-flow', BOB.id, 'A');
		await runTurn(ALICE, meta);

		const afterConfirmLog = getLog();
		assertSent(afterConfirmLog, ALICE.id, 'Спрашиваем?');

		// Now press Да
		resetLog();

		await runConfirm(ALICE, meta);

		const log = getLog();
		assertNotSent(log, ALICE.id, 'Спрашиваем?');
		// Should advance to count stage (or complete the turn)
		assertSent(log, ALICE.id, 'Выбери сколько карт');
	});

	// ── Confirm flow — "Нет" (back) ───────────────────────────────────────────

	it('From card confirm: g:tb:c#gameId#playerId restores card select keyboard', async () => {
		await resetGameFlowCase();
		await seedConfirmGame({ card: true, count: false, colors: false, suits: false });

		resetLog();

		// Back meta from card stage is c#<gameId>#<playerId>
		await runBack(ALICE, `c#game-flow#${BOB.id}`);

		const log = getLog();
		// Should restore card select — shows Alice's ranks
		assertSent(log, ALICE.id, 'K · A');
		assertNotSent(log, ALICE.id, 'Спрашиваем?');
	});

	it('From count confirm: back restores count keyboard', async () => {
		await resetGameFlowCase();
		await seedConfirmGame({ card: false, count: true, colors: false, suits: false });

		resetLog();

		// Back meta from count stage: 2#<gameId>#<playerId>#<cardName>#<count>+
		await runBack(ALICE, `2#game-flow#${BOB.id}#A#1+`);

		const log = getLog();
		assertSent(log, ALICE.id, 'Выбери сколько карт');
		assertNotSent(log, ALICE.id, 'Спрашиваем?');
	});

	it('From colors confirm: back restores colors keyboard', async () => {
		await resetGameFlowCase();
		await seedConfirmGame({ card: false, count: false, colors: true, suits: false });

		resetLog();

		// Back meta from colors stage: 3#<gameId>#<playerId>#<cardName>#<count>#<redCount>+
		await runBack(ALICE, `3#game-flow#${BOB.id}#A#2#1+`);

		const log = getLog();
		assertSent(log, ALICE.id, 'красных');
		assertNotSent(log, ALICE.id, 'Спрашиваем?');
	});

	it('From suits confirm: back restores suits keyboard', async () => {
		await resetGameFlowCase();
		await seedConfirmGame({ card: false, count: false, colors: false, suits: true });

		resetLog();

		// Back meta from suits stage: 4#<gameId>#<playerId>#<cardName>#<count>#<redCount>#h!d!s!c!mode!m
		await runBack(ALICE, `4#game-flow#${BOB.id}#A#2#1#1!0!0!0!+!m`);

		const log = getLog();
		assertSent(log, ALICE.id, 'количество мастей');
		assertNotSent(log, ALICE.id, 'Спрашиваем?');
	});

	// ── Back button on card select (always present) ───────────────────────────

	it('Back button on card select restores player select keyboard', async () => {
		await resetGameFlowCase();
		await seedConfirmGame(undefined);

		resetLog();

		// Back from card select sends p#<gameId>
		await runBack(ALICE, 'p#game-flow');

		const log = getLog();
		assertSent(log, ALICE.id, 'Твой ход');
		// Player select keyboard should list targets with cards
		assertSent(log, ALICE.id, BOB.name);
		assertNotSent(log, ALICE.id, 'Спрашиваем?');
	});

	it('Back button on card select works even when confirmMode is disabled', async () => {
		await resetGameFlowCase();
		await seedConfirmGame({ card: false, count: false, colors: false, suits: false });

		resetLog();

		await runBack(ALICE, 'p#game-flow');

		const log = getLog();
		assertSent(log, ALICE.id, 'Твой ход');
		assertSent(log, ALICE.id, BOB.name);
	});

	it('Card select keyboard always has a Назад button', async () => {
		await resetGameFlowCase();
		await seedConfirmGame(undefined);

		await runTurn(ALICE, turnMeta.player('game-flow', BOB.id));

		const log = getLog();
		// The card select keyboard should include "Назад"
		assertSent(log, ALICE.id, 'Назад');
	});

	// ── Back rejected for non-active player ───────────────────────────────────

	it('g:tb: p# rejected when caller is not the active player', async () => {
		await resetGameFlowCase();
		await seedConfirmGame(undefined);

		resetLog();

		// BOB tries to navigate back while ALICE is the active player
		await runBack(BOB, 'p#game-flow');

		const log = getLog();
		assertSent(log, BOB.id, STALE_GAME_MESSAGE_TEXT, { exact: true, latest: true });
		assertNotSent(log, BOB.id, 'Твой ход');
	});

	it('g:tb: c# rejected when caller is not the active player', async () => {
		await resetGameFlowCase();
		await seedConfirmGame(undefined);

		resetLog();

		// BOB tries to navigate back to card select while ALICE is the active player
		await runBack(BOB, `c#game-flow#${CAROL.id}`);

		const log = getLog();
		assertSent(log, BOB.id, STALE_GAME_MESSAGE_TEXT, { exact: true, latest: true });
	});

	// ── Stale game during confirm ─────────────────────────────────────────────

	it('Pressing Да when game has already ended returns stale message', async () => {
		await resetGameFlowCase();
		await seedGameState({
			users: createUsers().map(u => {
				if (u.id !== ALICE.id) {
					return u;
				}

				return { ...u, settings: { ...u.settings, confirmMode: { card: true, count: false, colors: false, suits: false } } };
			}),
			game: makeGame({
				players: [ALICE.id, BOB.id, CAROL.id],
				hands: {
					[ALICE.id]: [...cardIds('A', 'Diamonds')],
					[BOB.id]: [...cardIds('A', 'Hearts')],
					[CAROL.id]: [...cardIds('3', 'Clubs')],
				},
				ended: Date.now() - 1000,
			}),
		});

		const meta = turnMeta.card('game-flow', BOB.id, 'A');
		resetLog();

		await runConfirm(ALICE, meta);

		const log = getLog();
		assertSent(log, ALICE.id, STALE_GAME_MESSAGE_TEXT, { exact: true, latest: true });
	});
});
