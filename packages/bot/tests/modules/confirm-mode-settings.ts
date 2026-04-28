/**
 * confirm-mode-settings.ts — confirmMode settings submenu coverage.
 */

import { describe, it } from 'vitest';
import { DB } from '../../src/db';
import type { ConfirmModeSettings } from '../../src/db';

import { SESSIONS, resetLog, getLog, clearDB, seedDB, withCallbackMethods } from '../bootstrap';
import { assert, assertSent, assertNotSent } from '../runner';

const PLAYERS = [
	{ id: 1001, username: 'alice_sim', name: 'Алиса', updatesView: 'instant' as const },
	{ id: 1002, username: 'bob_sim', name: 'Борис', updatesView: 'instant' as const },
	{ id: 1003, username: 'carol_sim', name: 'Каролина', updatesView: 'instant' as const },
] as const;

const [ALICE] = PLAYERS;

type PlayerFixture = (typeof PLAYERS)[number];
type CmAction = 'confirmMode' | 'cm:card' | 'cm:count' | 'cm:colors' | 'cm:suits' | 'cm:back';

const makeCallbackCtx = (player: PlayerFixture, action: CmAction | 'name' | 'updatesView' | 'exit') =>
	withCallbackMethods({
		chat: { id: player.id, type: 'private' as const },
		from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
		callbackData: { module: 'settings' as const, action },
		callbackQuery: {
			id: `cb-${player.id}-${action}`,
			from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
			message: {
				message_id: 1,
				chat: { id: player.id, type: 'private' as const },
				date: Math.floor(Date.now() / 1000),
			},
			chat_instance: '',
			data: `settings:${action}:`,
		},
	});

const resetCase = async (): Promise<void> => {
	resetLog();
	await clearDB();
	PLAYERS.forEach(p => SESSIONS.clear(p.id));
};

const seedUsers = async (confirmMode?: ConfirmModeSettings): Promise<void> => {
	await seedDB({
		users: PLAYERS.map(p => ({
			id: p.id,
			username: p.username,
			name: p.name,
			settings: {
				updatesView: p.updatesView,
				...(confirmMode !== undefined ? { confirmMode } : {}),
			},
			achievements: [],
		})),
		rooms: [],
		games: [],
	});
	resetLog();
};

const seedUsersWithConfirm = async (confirmMode: ConfirmModeSettings): Promise<void> => {
	await seedUsers(confirmMode);
};

const seedUsersNoConfirm = async (): Promise<void> => {
	await seedUsers(undefined);
};

const seedActiveGame = async (): Promise<void> => {
	await seedDB({
		users: PLAYERS.map(p => ({
			id: p.id,
			username: p.username,
			name: p.name,
			settings: { updatesView: p.updatesView },
			achievements: [],
		})),
		rooms: [],
		games: [
			{
				id: 'game1',
				roomId: 'room1',
				name: 'Комната активной игры',
				started: Date.now(),
				players: [ALICE.id, 1002, 1003],
				hands: { [ALICE.id]: [], 1002: [], 1003: [] },
				athanasiuses: { [ALICE.id]: [], 1002: [], 1003: [] },
				utils: { cardsToAthanasius: 4, jokerCardsToAthanasius: 2, logs: [] },
			},
		],
	});
	resetLog();
};

const getUser = (id: number) => {
	const user = DB.data.users.find(u => u.id === id);
	assert(user !== undefined, `User ${id} should exist`);
	return user!;
};

describe('confirmModeSettingsModule', async () => {
	const handlers = await import('../../src/modules/settings/handlers');

	// ── Base settings text ────────────────────────────────────────────────────

	it('Base settings shows "выкл" when confirmMode is undefined', async () => {
		await resetCase();
		await seedUsersNoConfirm();

		await handlers.settingsCallbackHandler(makeCallbackCtx(ALICE, 'cm:back'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Режим подтверждения: выкл');
	});

	it('Base settings shows "выкл" when all stages are false', async () => {
		await resetCase();
		await seedUsersWithConfirm({ card: false, count: false, colors: false, suits: false });

		await handlers.settingsCallbackHandler(makeCallbackCtx(ALICE, 'cm:back'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Режим подтверждения: выкл');
	});

	it('Base settings shows active stage names when some are enabled', async () => {
		await resetCase();
		await seedUsersWithConfirm({ card: true, count: true, colors: false, suits: false });

		await handlers.settingsCallbackHandler(makeCallbackCtx(ALICE, 'cm:back'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Карта, Количество');
		assertNotSent(log, ALICE.id, 'выкл');
	});

	it('Base settings shows all stage names when all are enabled', async () => {
		await resetCase();
		await seedUsersWithConfirm({ card: true, count: true, colors: true, suits: true });

		await handlers.settingsCallbackHandler(makeCallbackCtx(ALICE, 'cm:back'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Карта, Количество, Цвета, Масти');
	});

	// ── Submenu open ──────────────────────────────────────────────────────────

	it('Clicking "Режим подтверждения" opens submenu with correct text', async () => {
		await resetCase();
		await seedUsersNoConfirm();

		await handlers.settingsCallbackHandler(makeCallbackCtx(ALICE, 'confirmMode'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Режим подтверждения');
		assertSent(log, ALICE.id, 'Выбери на каких стадиях');
	});

	it('Submenu shows ☐ for all disabled stages when confirmMode is undefined', async () => {
		await resetCase();
		await seedUsersNoConfirm();

		await handlers.settingsCallbackHandler(makeCallbackCtx(ALICE, 'confirmMode'));

		const log = getLog();
		// All four toggles should show the off marker in the keyboard labels
		assertSent(log, ALICE.id, '☐ Карта');
		assertSent(log, ALICE.id, '☐ Количество');
		assertSent(log, ALICE.id, '☐ Цвета');
		assertSent(log, ALICE.id, '☐ Масти');
	});

	it('Submenu shows ✅ for enabled stages and ☐ for disabled', async () => {
		await resetCase();
		await seedUsersWithConfirm({ card: true, count: false, colors: true, suits: false });

		await handlers.settingsCallbackHandler(makeCallbackCtx(ALICE, 'confirmMode'));

		const log = getLog();
		assertSent(log, ALICE.id, '✅ Карта');
		assertSent(log, ALICE.id, '☐ Количество');
		assertSent(log, ALICE.id, '✅ Цвета');
		assertSent(log, ALICE.id, '☐ Масти');
	});

	// ── Toggle cm:card ────────────────────────────────────────────────────────

	it('Toggling cm:card enables card stage and persists to DB', async () => {
		await resetCase();
		await seedUsersNoConfirm();

		await handlers.settingsCallbackHandler(makeCallbackCtx(ALICE, 'cm:card'));

		const log = getLog();
		assertSent(log, ALICE.id, '✅ Карта');
		assert(getUser(ALICE.id).settings.confirmMode?.card === true, 'card should be true after toggle');
	});

	it('Toggling cm:card again disables it', async () => {
		await resetCase();
		await seedUsersWithConfirm({ card: true, count: false, colors: false, suits: false });

		await handlers.settingsCallbackHandler(makeCallbackCtx(ALICE, 'cm:card'));

		const log = getLog();
		assertSent(log, ALICE.id, '☐ Карта');
		assert(getUser(ALICE.id).settings.confirmMode?.card === false, 'card should be false after second toggle');
	});

	// ── Toggle other stages ───────────────────────────────────────────────────

	it('Toggling cm:count works independently', async () => {
		await resetCase();
		await seedUsersNoConfirm();

		await handlers.settingsCallbackHandler(makeCallbackCtx(ALICE, 'cm:count'));

		const log = getLog();
		assertSent(log, ALICE.id, '✅ Количество');
		assertSent(log, ALICE.id, '☐ Карта');
		assert(getUser(ALICE.id).settings.confirmMode?.count === true, 'count should be true');
		assert(getUser(ALICE.id).settings.confirmMode?.card === false, 'card should remain false');
	});

	it('Toggling cm:colors works independently', async () => {
		await resetCase();
		await seedUsersNoConfirm();

		await handlers.settingsCallbackHandler(makeCallbackCtx(ALICE, 'cm:colors'));

		const log = getLog();
		assertSent(log, ALICE.id, '✅ Цвета');
		assertSent(log, ALICE.id, '☐ Карта');
		assert(getUser(ALICE.id).settings.confirmMode?.colors === true, 'colors should be true');
	});

	it('Toggling cm:suits works independently', async () => {
		await resetCase();
		await seedUsersNoConfirm();

		await handlers.settingsCallbackHandler(makeCallbackCtx(ALICE, 'cm:suits'));

		const log = getLog();
		assertSent(log, ALICE.id, '✅ Масти');
		assertSent(log, ALICE.id, '☐ Карта');
		assert(getUser(ALICE.id).settings.confirmMode?.suits === true, 'suits should be true');
	});

	// ── Multiple stages ───────────────────────────────────────────────────────

	it('Multiple stages can be enabled simultaneously', async () => {
		await resetCase();
		await seedUsersNoConfirm();

		await handlers.settingsCallbackHandler(makeCallbackCtx(ALICE, 'cm:card'));
		resetLog();
		await handlers.settingsCallbackHandler(makeCallbackCtx(ALICE, 'cm:count'));

		const cm = getUser(ALICE.id).settings.confirmMode;
		assert(cm?.card === true, 'card should remain true');
		assert(cm?.count === true, 'count should be true');
		assert(cm?.colors === false, 'colors should remain false');
		assert(cm?.suits === false, 'suits should remain false');
	});

	// ── cm:back ───────────────────────────────────────────────────────────────

	it('cm:back returns to base settings showing updated summary', async () => {
		await resetCase();
		await seedUsersWithConfirm({ card: true, count: false, colors: false, suits: false });

		await handlers.settingsCallbackHandler(makeCallbackCtx(ALICE, 'cm:back'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Твои настройки');
		assertSent(log, ALICE.id, 'Режим подтверждения: Карта');
		// Main settings keyboard should be present
		assertSent(log, ALICE.id, 'Режим подтверждения');
	});

	// ── Blocked during active game ────────────────────────────────────────────

	it('confirmMode toggle is blocked during active game', async () => {
		await resetCase();
		await seedActiveGame();

		await handlers.settingsCallbackHandler(makeCallbackCtx(ALICE, 'cm:card'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Нельзя менять настройки во время игры');
		assertNotSent(log, ALICE.id, 'Карта');
		assert(getUser(ALICE.id).settings.confirmMode === undefined, 'confirmMode should not be set when blocked');
	});

	it('confirmMode submenu open is blocked during active game', async () => {
		await resetCase();
		await seedActiveGame();

		await handlers.settingsCallbackHandler(makeCallbackCtx(ALICE, 'confirmMode'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Нельзя менять настройки во время игры');
		assertNotSent(log, ALICE.id, 'Выбери на каких стадиях');
	});
});
