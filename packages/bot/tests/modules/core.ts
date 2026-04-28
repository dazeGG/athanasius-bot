/**
 * core.ts — cross-cutting regression coverage for core infrastructure.
 */

import type { ApiCallFn } from 'grammy';
import { describe, it } from 'vitest';

import { SESSIONS, BOT, clearDB, getLog, resetLog, seedDB } from '../bootstrap';
import { assert, assertSent } from '../runner';

import {
	ALICE,
	BOB,
	CAROL,
	cardIds,
	createUsers,
	makeGame,
	makeTurnCallbackCtx,
	resetGameFlowCase,
	seedGameState,
	turnMeta,
	STALE_GAME_MESSAGE_TEXT,
} from '../flow/game/helpers';

const seedUser = async (id: number, name: string) => {
	await seedDB({
		users: [{ id, username: undefined, name, settings: { updatesView: 'instant' as const }, achievements: [] }],
		rooms: [],
		games: [],
	});
};

describe('core', async () => {
	it('Clears both state and context, and drops stale context when state changes', async () => {
		resetLog();
		await clearDB();

		SESSIONS.setFlow(ALICE.id, { name: 'ROOM_CDC', roomId: 'room-1' });
		assert(SESSIONS.get(ALICE.id).flow.name === 'ROOM_CDC', 'Alice state should be stored');
		const roomFlow = SESSIONS.get(ALICE.id).flow;
		assert(
			roomFlow.name === 'ROOM_CDC' && roomFlow.roomId === 'room-1',
			'Alice context should be stored',
		);

		SESSIONS.setFlow(ALICE.id, { name: 'REGISTRATION' });
		assert(!('roomId' in SESSIONS.get(ALICE.id).flow), 'Setting a new state without context should clear the previous context');

		SESSIONS.clear(ALICE.id);
		assert(SESSIONS.get(ALICE.id).flow.name === undefined, 'Alice state should be cleared');
		assert(!('roomId' in SESSIONS.get(ALICE.id).flow), 'Alice context should be cleared');
	});

	it('Publishes user-facing Telegram commands alongside keyboard helpers', async () => {
		const { commands } = await import('../../src/commands');

		assert(commands.some(command => command.command === 'start'), 'Commands list should include /start');
		assert(commands.some(command => command.command === 'reg'), 'Commands list should include /reg');
		assert(commands.some(command => command.command === 'addglobalkeyboard'), 'Commands list should keep keyboard helper commands');
	});

	it('Installs an HTML parse mode transformer for text messages', async () => {
		const transformer = BOT.api.config.installedTransformers().at(-1);
		assert(transformer !== undefined, 'Bot API should install at least one transformer');

		let capturedMethod = '';
		let capturedPayload: Record<string, unknown> | undefined;

		const prev: ApiCallFn = async (method, payload) => {
			capturedMethod = method;
			capturedPayload = payload as Record<string, unknown>;
			return {
				ok: true,
				result: true,
			} as never;
		};

		await transformer!(
			prev,
			'sendMessage',
			{
				chat_id: ALICE.id,
				text: '<b>Привет</b>',
			},
			undefined,
		);

		assert(capturedMethod === 'sendMessage', 'Transformer should preserve the method');
		assert(capturedPayload?.parse_mode === 'HTML', 'Transformer should inject HTML parse mode for text messages');
	});

	it('Escapes HTML-sensitive user content before rendering it into messages', async () => {
		const { escapeHtml } = await import('../../src/shared/lib');

		assert(
			escapeHtml('<b>Зал & Co</b>') === '&lt;b&gt;Зал &amp; Co&lt;/b&gt;',
			'escapeHtml should neutralize angle brackets and ampersands',
		);
		assert(escapeHtml('Комната Алисы') === 'Комната Алисы', 'escapeHtml should keep plain text unchanged');
	});

	it('Routes invalid game callbacks through the composer and returns a stale-message reply', async () => {
		await resetGameFlowCase();
		await seedGameState({
			users: createUsers(),
			game: makeGame({
				players: [ALICE.id, BOB.id, CAROL.id],
				hands: {
					[ALICE.id]: [...cardIds('A', 'Diamonds')],
					[BOB.id]: [...cardIds('K', 'Clubs')],
					[CAROL.id]: [...cardIds('3', 'Clubs')],
				},
			}),
		});

		const { default: gameComposer } = await import('../../src/modules/game');
		const middleware = gameComposer.middleware();

		await middleware(
			makeTurnCallbackCtx(BOB, turnMeta.player('game-flow', CAROL.id)),
			async () => undefined,
		);

		assertSent(getLog(), BOB.id, STALE_GAME_MESSAGE_TEXT);
	});

	// ─── validateName ────────────────────────────────────────────────────────────

	describe('validateName — name validation rules', async () => {
		it('Rejects name shorter than 2 characters', async () => {
			const { validateName } = await import('../../src/shared/lib');
			await clearDB();
			const result = validateName('а');
			assert(!result.success, 'Single-char name must be rejected');
			assert(result.message.includes('короче 2'), 'Should mention minimum length');
		});

		it('Accepts 2-character Cyrillic name (minimum boundary)', async () => {
			const { validateName } = await import('../../src/shared/lib');
			await clearDB();
			const result = validateName('аб');
			assert(result.success, '2-char Cyrillic name must be accepted');
		});

		it('Accepts 16-character Cyrillic name (maximum boundary)', async () => {
			const { validateName } = await import('../../src/shared/lib');
			await clearDB();
			const result = validateName('АБВГДЕЖЗИЙКЛМНОП');
			assert(result.success, '16-char Cyrillic name must be accepted');
		});

		it('Rejects name longer than 16 characters', async () => {
			const { validateName } = await import('../../src/shared/lib');
			await clearDB();
			const result = validateName('АБВГДЕЖЗИЙКЛМНОПР');
			assert(!result.success, '17-char name must be rejected');
			assert(result.message.includes('длиннее 16'), 'Should mention maximum length');
		});

		it('Rejects name with Latin letters', async () => {
			const { validateName } = await import('../../src/shared/lib');
			await clearDB();
			const result = validateName('Alice');
			assert(!result.success, 'Latin-only name must be rejected');
			assert(result.message.includes('русские буквы'), 'Should explain charset restriction');
		});

		it('Rejects name with digits', async () => {
			const { validateName } = await import('../../src/shared/lib');
			await clearDB();
			const result = validateName('Имя123');
			assert(!result.success, 'Name with digits must be rejected');
		});

		it('Rejects name containing a space', async () => {
			const { validateName } = await import('../../src/shared/lib');
			await clearDB();
			const result = validateName('Анна Иванова');
			assert(!result.success, 'Name with space must be rejected');
		});

		it('Accepts name with dash', async () => {
			const { validateName } = await import('../../src/shared/lib');
			await clearDB();
			const result = validateName('Анна-Юг');
			assert(result.success, 'Name with Cyrillic and dash must be accepted');
		});

		it('Accepts name with underscore', async () => {
			const { validateName } = await import('../../src/shared/lib');
			await clearDB();
			const result = validateName('Анна_Юг');
			assert(result.success, 'Name with Cyrillic and underscore must be accepted');
		});

		it('Rejects reserved name "имя" (exact case)', async () => {
			const { validateName } = await import('../../src/shared/lib');
			await clearDB();
			const result = validateName('имя');
			assert(!result.success, '"имя" must be rejected');
			assert(result.message.includes('нельзя взять'), 'Should say name is reserved');
		});

		it('Rejects reserved name "ИМЯ" (uppercase — case-insensitive check)', async () => {
			const { validateName } = await import('../../src/shared/lib');
			await clearDB();
			const result = validateName('ИМЯ');
			assert(!result.success, '"ИМЯ" must be rejected as a reserved name regardless of case');
		});

		it('Rejects reserved name "вовощ"', async () => {
			const { validateName } = await import('../../src/shared/lib');
			await clearDB();
			const result = validateName('вовощ');
			assert(!result.success, '"вовощ" must be rejected as reserved');
		});

		it('Rejects name already taken by another user', async () => {
			const { validateName } = await import('../../src/shared/lib');
			await clearDB();
			await seedUser(1001, 'Алиса');
			const result = validateName('Алиса', 9999);
			assert(!result.success, 'Name taken by another user must be rejected');
			assert(result.message.includes('уже используется'), 'Should say name is taken');
		});

		it('Rejects taken name regardless of case (case-insensitive duplicate check)', async () => {
			const { validateName } = await import('../../src/shared/lib');
			await clearDB();
			await seedUser(1001, 'Алиса');
			const result = validateName('алиса', 9999);
			assert(!result.success, 'Lowercase variant of existing name must be rejected');
		});

		it('Allows user to keep their own name (self-rename exclusion)', async () => {
			const { validateName } = await import('../../src/shared/lib');
			await clearDB();
			await seedUser(1001, 'Алиса');
			const result = validateName('Алиса', 1001);
			assert(result.success, 'User renaming to their own existing name must be allowed');
		});
	});

	// ─── shuffleArray ─────────────────────────────────────────────────────────────

	describe('shuffleArray — Fisher-Yates shuffle', async () => {
		it('Empty array returns empty array', async () => {
			const { shuffleArray } = await import('../../src/shared/lib');
			const result = shuffleArray([]);
			assert(result.length === 0, 'Shuffled empty array must be empty');
		});

		it('Single-element array returns same single element', async () => {
			const { shuffleArray } = await import('../../src/shared/lib');
			const result = shuffleArray([42]);
			assert(result.length === 1, 'Length must be 1');
			assert(result[0] === 42, 'Single element must be preserved');
		});

		it('Shuffled array contains exactly the same elements', async () => {
			const { shuffleArray } = await import('../../src/shared/lib');
			const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
			const result = shuffleArray(input);
			assert(result.length === input.length, 'Length must be preserved');
			const sortedInput = [...input].sort((a, b) => a - b);
			const sortedResult = [...result].sort((a, b) => a - b);
			assert(
				sortedInput.every((v, i) => v === sortedResult[i]),
				'All original elements must be present exactly once',
			);
		});

		it('Does not mutate the original array', async () => {
			const { shuffleArray } = await import('../../src/shared/lib');
			const input = [10, 20, 30, 40, 50];
			const copy = [...input];
			shuffleArray(input);
			assert(
				input.every((v, i) => v === copy[i]),
				'Original array must not be modified',
			);
		});
	});

	// ─── stringifyCallbackData / getCallbackMeta ─────────────────────────────────

	describe('stringifyCallbackData / getCallbackMeta — callback encoding', async () => {
		it('Basic format: module:action:meta', async () => {
			const { stringifyCallbackData } = await import('../../src/core/lib');
			const data = stringifyCallbackData({ module: 'hand', action: 'show', meta: 'game123' });
			assert(data === 'hand:show:game123', `Expected "hand:show:game123", got "${data}"`);
		});

		it('Back action produces module:back:meta', async () => {
			const { stringifyCallbackData } = await import('../../src/core/lib');
			const data = stringifyCallbackData({ module: 'hand', back: true, meta: 'game123' });
			assert(data === 'hand:back:game123', `Expected "hand:back:game123", got "${data}"`);
		});

		it('Empty meta produces trailing colon', async () => {
			const { stringifyCallbackData } = await import('../../src/core/lib');
			const data = stringifyCallbackData({ module: 'notes', action: 'exit' });
			assert(data === 'notes:exit:', `Expected "notes:exit:", got "${data}"`);
		});

		it('getCallbackMeta extracts meta after second colon', async () => {
			const { getCallbackMeta } = await import('../../src/core/lib');
			const meta = getCallbackMeta('hand:show:game123');
			assert(meta === 'game123', `Expected "game123", got "${meta}"`);
		});

		it('getCallbackMeta preserves colons inside meta', async () => {
			const { getCallbackMeta } = await import('../../src/core/lib');
			const meta = getCallbackMeta('notes:grid:gameABC:A');
			assert(meta === 'gameABC:A', `Expected "gameABC:A", got "${meta}"`);
		});

		it('getCallbackMeta returns undefined for empty meta', async () => {
			const { getCallbackMeta } = await import('../../src/core/lib');
			const meta = getCallbackMeta('notes:exit:');
			assert(meta === undefined, `Expected undefined for empty meta, got "${meta}"`);
		});

		it('Round-trip: stringify then parse gives back the same meta', async () => {
			const { stringifyCallbackData, getCallbackMeta } = await import('../../src/core/lib');
			const original = 'ng1:K:3:2';
			const data = stringifyCallbackData({ module: 'notes', action: 'cycle', meta: original });
			const parsed = getCallbackMeta(data);
			assert(parsed === original, `Round-trip failed: expected "${original}", got "${parsed}"`);
		});
	});

	// ─── isRegistered ────────────────────────────────────────────────────────────

	describe('isRegistered — registration guard', async () => {
		it('Returns true for a user that exists in DB', async () => {
			const { isRegistered } = await import('../../src/shared/lib');
			await clearDB();
			await seedUser(ALICE.id, ALICE.name);
			const ctx = { from: { id: ALICE.id } } as never;
			assert(isRegistered(ctx), 'Should return true for registered user');
		});

		it('Returns false for a user that does not exist in DB', async () => {
			const { isRegistered } = await import('../../src/shared/lib');
			await clearDB();
			const ctx = { from: { id: 99999 } } as never;
			assert(!isRegistered(ctx), 'Should return false for unregistered user');
		});

		it('Returns false when ctx.from is absent', async () => {
			const { isRegistered } = await import('../../src/shared/lib');
			await clearDB();
			await seedUser(ALICE.id, ALICE.name);
			const ctx = {} as never;
			assert(!isRegistered(ctx), 'Should return false when from is absent');
		});
	});
});
