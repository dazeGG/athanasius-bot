/**
 * mailing.ts — per-turn in-game message flow (GAME_MAILING).
 */

import { describe, it } from 'vitest';
import type { CallbackData } from '../../src/core';
import { DB } from '../../src/db';
import { txt } from '../../src/modules/mailing/ui';
import { escapeHtml } from '../../src/shared/lib';

import { SESSIONS, resetLog, getLog, clearDB, seedDB, withCallbackMethods, withMessageMethods } from '../bootstrap';
import { assert, assertSent, assertNotSent } from '../runner';

const PLAYERS = [
	{ id: 2001, username: 'alice_m', name: 'Алиса' },
	{ id: 2002, username: 'bob_m', name: 'Борис' },
	{ id: 2003, username: 'carol_m', name: 'Каролина' },
] as const;

const [ALICE, BOB, CAROL] = PLAYERS;

type PlayerFixture = (typeof PLAYERS)[number];

const makeMessageCtx = (player: PlayerFixture, text: string) => withMessageMethods({
	chat: { id: player.id, type: 'private' as const },
	from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
	message: {
		message_id: 1,
		chat: { id: player.id, type: 'private' as const },
		date: Math.floor(Date.now() / 1000),
		text,
		from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
	},
});

const makeCallbackCtx = (player: PlayerFixture, data: CallbackData) => withCallbackMethods({
	chat: { id: player.id, type: 'private' as const },
	from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
	callbackData: data,
	callbackQuery: {
		id: `cb-${player.id}`,
		from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
		message: {
			message_id: 1,
			chat: { id: player.id, type: 'private' as const },
			date: Math.floor(Date.now() / 1000),
		},
		chat_instance: '',
		data: `${data.module}:${data.back ? 'back' : (data.action ?? '')}:${data.meta ?? ''}`,
	},
});

interface SeedOptions {
	allowMailing?: boolean;
	mailedThisTurn?: number[];
	roomName?: string;
}

const seedMailingGame = async ({
	allowMailing = true,
	mailedThisTurn,
	roomName = 'Комната Алисы',
}: SeedOptions = {}) => {
	await clearDB();
	PLAYERS.forEach(p => SESSIONS.clear(p.id));
	await seedDB({
		users: PLAYERS.map(p => ({
			id: p.id,
			username: p.username,
			name: p.name,
			settings: { updatesView: 'instant' as const },
			achievements: [],
		})),
		rooms: [
			{
				id: 'room-m',
				name: roomName,
				owner: ALICE.id,
				players: PLAYERS.map(p => p.id),
				settings: {
					joinCode: 'M-TEST',
					deckType: 52 as const,
					decksCount: 1,
					towHands: false,
					allowMailing,
				},
			},
		],
		games: [
			{
				id: 'game-m',
				roomId: 'room-m',
				name: roomName,
				started: Date.now(),
				players: PLAYERS.map(p => p.id),
				hands: Object.fromEntries(PLAYERS.map((p, i) => [p.id, [i + 1]])),
				athanasiuses: Object.fromEntries(PLAYERS.map(p => [p.id, []])),
				utils: {
					cardsToAthanasius: 4,
					jokerCardsToAthanasius: 2,
					logs: [],
					mailedThisTurn,
				},
			},
		],
	});
	resetLog();
};

describe('mailingModule', async () => {
	const handlers = await import('../../src/modules/mailing/handlers');

	// ── Global keyboard button ────────────────────────────────────────────────

	it('Сообщение button replies with no-games message when player has no active mailing games', async () => {
		await clearDB();
		PLAYERS.forEach(p => SESSIONS.clear(p.id));
		await seedDB({
			users: PLAYERS.map(p => ({
				id: p.id,
				username: p.username,
				name: p.name,
				settings: { updatesView: 'instant' as const },
				achievements: [],
			})),
			rooms: [],
			games: [],
		});
		resetLog();

		await handlers.mailingMessageHandler(makeMessageCtx(ALICE, 'Сообщение'));
		assertSent(getLog(), ALICE.id, txt.noAvailableGames);
	});

	it('Сообщение button opens prompt directly when player has exactly one eligible game', async () => {
		await seedMailingGame({ allowMailing: true });

		await handlers.mailingMessageHandler(makeMessageCtx(ALICE, 'Сообщение'));
		const log = getLog();

		assertSent(log, ALICE.id, txt.sendMessagePrompt('Комната Алисы'));
		assert(SESSIONS.get(ALICE.id).flow.name === 'GAME_MAILING', 'Should enter GAME_MAILING flow directly');
		const flow = SESSIONS.get(ALICE.id).flow;
		assert(flow.name === 'GAME_MAILING' && flow.roomId === 'room-m', 'Flow should carry the roomId');
	});

	it('Сообщение button shows no games when mailing setting is disabled', async () => {
		await seedMailingGame({ allowMailing: false });

		await handlers.mailingMessageHandler(makeMessageCtx(ALICE, 'Сообщение'));
		const log = getLog();

		assertSent(log, ALICE.id, txt.noAvailableGames);
		assert(SESSIONS.get(ALICE.id).flow.name === undefined, 'Should not enter flow when mailing is disabled');
	});

	it('Сообщение button shows no games after the player already mailed this turn', async () => {
		await seedMailingGame({ allowMailing: true, mailedThisTurn: [ALICE.id] });

		await handlers.mailingMessageHandler(makeMessageCtx(ALICE, 'Сообщение'));
		const log = getLog();

		assertSent(log, ALICE.id, txt.noAvailableGames);
		assert(SESSIONS.get(ALICE.id).flow.name === undefined, 'Should not enter flow after already mailing');
	});

	// ── mailing:select callback ───────────────────────────────────────────────

	it('mailing:select opens the text prompt and sets GAME_MAILING flow', async () => {
		await seedMailingGame({ allowMailing: true });

		await handlers.mailingSelectCallbackHandler(makeCallbackCtx(BOB, { module: 'mailing', action: 'select', meta: 'room-m' }));
		const log = getLog();

		assertSent(log, BOB.id, txt.sendMessagePrompt('Комната Алисы'));
		assert(SESSIONS.get(BOB.id).flow.name === 'GAME_MAILING', 'Should enter GAME_MAILING flow');
		const flow = SESSIONS.get(BOB.id).flow;
		assert(flow.name === 'GAME_MAILING' && flow.roomId === 'room-m', 'Flow should carry the roomId');
	});

	it('mailing:select rejects when mailing setting is disabled', async () => {
		await seedMailingGame({ allowMailing: false });

		await handlers.mailingSelectCallbackHandler(makeCallbackCtx(ALICE, { module: 'mailing', action: 'select', meta: 'room-m' }));
		const log = getLog();

		assertNotSent(log, ALICE.id, txt.sendMessagePrompt);
		assert(SESSIONS.get(ALICE.id).flow.name === undefined, 'Should not enter flow when setting is disabled');
	});

	it('mailing:select rejects when the player already mailed this turn', async () => {
		await seedMailingGame({ allowMailing: true, mailedThisTurn: [BOB.id] });

		await handlers.mailingSelectCallbackHandler(makeCallbackCtx(BOB, { module: 'mailing', action: 'select', meta: 'room-m' }));
		const log = getLog();

		assertNotSent(log, BOB.id, txt.sendMessagePrompt);
		assert(SESSIONS.get(BOB.id).flow.name === undefined, 'Should not enter flow after already mailing');
	});

	it('mailing:select shows no-games message when the game no longer exists', async () => {
		await seedMailingGame({ allowMailing: true });
		DB.data.games = [];

		await handlers.mailingSelectCallbackHandler(makeCallbackCtx(ALICE, { module: 'mailing', action: 'select', meta: 'room-m' }));
		const log = getLog();

		assertSent(log, ALICE.id, txt.noAvailableGames);
		assert(SESSIONS.get(ALICE.id).flow.name === undefined, 'Should not enter flow when game is gone');
	});

	// ── mailingTextHandler ────────────────────────────────────────────────────

	it('Valid message is sent to all other players and marks the turn', async () => {
		await seedMailingGame({ allowMailing: true, roomName: '<b>Зал & ход</b>' });
		SESSIONS.setFlow(ALICE.id, { name: 'GAME_MAILING', roomId: 'room-m' });

		await handlers.mailingTextHandler(makeMessageCtx(ALICE, '  Всем <b>привет</b> & ходим!  '));
		const log = getLog();

		assertSent(log, BOB.id, `${escapeHtml('<b>Зал & ход</b>')} | Алиса`);
		assertSent(log, BOB.id, 'Всем &lt;b&gt;привет&lt;/b&gt; &amp; ходим!');
		assertSent(log, CAROL.id, 'Всем &lt;b&gt;привет&lt;/b&gt; &amp; ходим!');
		assertNotSent(log, ALICE.id, 'Всем &lt;b&gt;привет&lt;/b&gt; &amp; ходим!');
		assertSent(log, ALICE.id, txt.sendMessageSuccess);
		assert(SESSIONS.get(ALICE.id).flow.name === undefined, 'Flow should clear after successful send');
		assert(DB.data.games[0]!.utils.mailedThisTurn?.includes(ALICE.id) === true, 'Should mark player as mailed this turn');
	});

	it('Blank message keeps the player in GAME_MAILING flow without sending', async () => {
		await seedMailingGame({ allowMailing: true });
		SESSIONS.setFlow(ALICE.id, { name: 'GAME_MAILING', roomId: 'room-m' });

		await handlers.mailingTextHandler(makeMessageCtx(ALICE, '   '));
		const log = getLog();

		assertSent(log, ALICE.id, txt.sendMessagePrompt('Комната Алисы'));
		assert(SESSIONS.get(ALICE.id).flow.name === 'GAME_MAILING', 'Flow should stay open after blank message');
		assert(DB.data.games[0]!.utils.mailedThisTurn === undefined, 'Blank message must not mark player as mailed');
		assertNotSent(log, BOB.id, '');
	});

	it('Overlong message keeps the player in GAME_MAILING flow without sending', async () => {
		await seedMailingGame({ allowMailing: true });
		SESSIONS.setFlow(ALICE.id, { name: 'GAME_MAILING', roomId: 'room-m' });

		await handlers.mailingTextHandler(makeMessageCtx(ALICE, 'x'.repeat(301)));
		const log = getLog();

		assertSent(log, ALICE.id, txt.sendMessagePrompt('Комната Алисы'));
		assert(SESSIONS.get(ALICE.id).flow.name === 'GAME_MAILING', 'Flow should stay open after overlong message');
		assert(DB.data.games[0]!.utils.mailedThisTurn === undefined, 'Overlong message must not mark player as mailed');
		assertNotSent(log, BOB.id, 'xxx');
	});

	it('Stale GAME_MAILING flow is cleared silently when game no longer exists', async () => {
		await seedMailingGame({ allowMailing: true });
		SESSIONS.setFlow(ALICE.id, { name: 'GAME_MAILING', roomId: 'room-m' });
		DB.data.games = [];

		await handlers.mailingTextHandler(makeMessageCtx(ALICE, 'Поздно'));
		const log = getLog();

		assert(log.length === 0, 'No messages should be sent when game is gone');
		assert(SESSIONS.get(ALICE.id).flow.name === undefined, 'Stale flow should be cleared');
	});

	it('Text handler ignores messages outside GAME_MAILING flow', async () => {
		await seedMailingGame({ allowMailing: true });
		SESSIONS.clear(ALICE.id);

		await handlers.mailingTextHandler(makeMessageCtx(ALICE, 'Привет'));
		const log = getLog();

		assert(log.length === 0, 'No messages should be sent when flow is not active');
		assert(SESSIONS.get(ALICE.id).flow.name === undefined, 'Flow should remain empty');
	});

	it('Text handler notifies player when mailing setting was disabled mid-flow', async () => {
		await seedMailingGame({ allowMailing: true });
		SESSIONS.setFlow(ALICE.id, { name: 'GAME_MAILING', roomId: 'room-m' });
		DB.data.rooms[0]!.settings.allowMailing = false;

		await handlers.mailingTextHandler(makeMessageCtx(ALICE, 'Привет'));
		const log = getLog();

		assertSent(log, ALICE.id, txt.mailingDisabled);
		assertNotSent(log, BOB.id, 'Привет');
		assert(SESSIONS.get(ALICE.id).flow.name === undefined, 'Flow should be cleared');
	});
});
