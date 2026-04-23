/**
 * registration.ts — /reg flow for 5 players.
 *
 * Each player:
 *   1. Sends /reg  → expects "Напиши мне своё имя"
 *   2. Sends valid name → expects "Поздравляю..." and global keyboard
 *   3. Sends /reg again → expects "Ты уже зарегистрирован..."
 */

import { DB, STATES, resetLog, getLog, clearDB } from '../bootstrap';
import { assert, assertSent } from '../runner';

// ─── Fixture IDs ──────────────────────────────────────────────────────────────
const PLAYERS = [
	{ id: 1001, username: 'alice_sim',   name: 'Алиса'    },
	{ id: 1002, username: 'bob_sim',     name: 'Борис'    },
	{ id: 1003, username: 'carol_sim',   name: 'Каролина' },
	{ id: 1004, username: 'dave_sim',    name: 'Дмитрий'  },
	{ id: 1005, username: 'eve_sim',     name: 'Евгения'  },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const makeMessageCtx = (playerId: number, text: string) => ({
	chatId: playerId,
	message: {
		message_id: 1,
		chat: { id: playerId, type: 'private' as const },
		date: Math.floor(Date.now() / 1000),
		text,
		from: { id: playerId, is_bot: false, first_name: String(playerId) },
	},
});

// ─── Scenario ──────────────────────────────────────────────────────────────────
export async function scenarioRegistration (): Promise<void> {
	resetLog();
	await clearDB();

	// Import handlers dynamically (after bootstrap)
	const { regStartMessageHandler, regNameStateMessageHandler } = await import('~/modules/reg/handlers');

	// ── Step 1: /reg for each player ───────────────────────────────────────────
	for (const player of PLAYERS) {
		const ctx = makeMessageCtx(player.id, '/reg');
		await regStartMessageHandler(ctx);

		const log = getLog();
		assertSent(log, player.id, 'Напиши мне своё имя');
		assert(STATES.getState(player.id) === 'REGISTRATION', `${player.name}: state should be REGISTRATION`);
		resetLog();
	}

	// ── Step 2: valid names ────────────────────────────────────────────────────
	for (const player of PLAYERS) {
		const ctx = makeMessageCtx(player.id, player.name);
		await regNameStateMessageHandler(ctx);

		const log = getLog();
		assertSent(log, player.id, 'Поздравляю');
		assertSent(log, player.id, 'успешно зарегистрирован');
		assert(STATES.getState(player.id) === undefined, `${player.name}: state should be cleared after registration`);

		const dbUser = DB.data.users.find(u => u.id === player.id);
		assert(dbUser !== undefined, `${player.name}: should exist in DB`);
		assert(dbUser!.name === player.name, `${player.name}: name should match`);
		assert(dbUser!.settings.updatesView === 'instant', `${player.name}: default updatesView should be instant`);
		assert(dbUser!.achievements !== undefined, `${player.name}: achievements array should exist`);

		resetLog();
	}

	// ── Step 3: duplicate /reg → already registered ──────────────────────────
	for (const player of PLAYERS) {
		const ctx = makeMessageCtx(player.id, '/reg');
		await regStartMessageHandler(ctx);

		const log = getLog();
		assertSent(log, player.id, 'Ты уже зарегистрирован');
		resetLog();
	}

	// ── Step 4: invalid names in validateName order ───────────────────────────
	// order in validateName: length<2 → length>16 → regex → duplicate → reserved
	{
		// length > 16
		STATES.setState(PLAYERS[0].id, 'REGISTRATION');
		const ctx = makeMessageCtx(PLAYERS[0].id, 'АлисаДлиннющееИмяТут');
		await regNameStateMessageHandler(ctx);
		const log = getLog();
		assertSent(log, PLAYERS[0].id, 'Имя не должно быть длиннее 16 символов');
		resetLog();
	}

	{
		// regex fail (Latin chars) — user stays in REGISTRATION
		STATES.setState(PLAYERS[0].id, 'REGISTRATION');
		const ctx = makeMessageCtx(PLAYERS[0].id, 'ab');
		await regNameStateMessageHandler(ctx);
		const log = getLog();
		assertSent(log, PLAYERS[0].id, 'Имя может содержать только русские буквы');
		assert(STATES.getState(PLAYERS[0].id) === 'REGISTRATION', 'Alice should stay in REGISTRATION after invalid name');
		resetLog();
	}

	{
		// length < 2 — needs Cyrillic single letter to pass regex first
		STATES.setState(PLAYERS[0].id, 'REGISTRATION');
		const ctx = makeMessageCtx(PLAYERS[0].id, 'б');
		await regNameStateMessageHandler(ctx);
		const log = getLog();
		assertSent(log, PLAYERS[0].id, 'Имя не должно быть короче 2 символов');
		resetLog();
	}

	{
		// reserved name
		STATES.setState(PLAYERS[0].id, 'REGISTRATION');
		const ctx = makeMessageCtx(PLAYERS[0].id, 'Имя');
		await regNameStateMessageHandler(ctx);
		const log = getLog();
		assertSent(log, PLAYERS[0].id, 'Это имя нельзя взять');
		resetLog();
	}

	// ── Step 5: re-registration with new name (Alice already has АлисаНовая) ──
	{
		STATES.setState(PLAYERS[0].id, 'REGISTRATION');
		const ctx = makeMessageCtx(PLAYERS[0].id, 'АлисаОбновлённая');
		await regNameStateMessageHandler(ctx);
		const log = getLog();
		assertSent(log, PLAYERS[0].id, 'Поздравляю');
		assert(DB.data.users.find(u => u.id === PLAYERS[0].id)!.name === 'АлисаОбновлённая', 'Alice name should be updated');
	}

	// ── Step 6: duplicate name (another player's name) ───────────────────────
	{
		// Bob's name is taken — Alice tries to take it
		STATES.setState(PLAYERS[0].id, 'REGISTRATION');
		const ctx = makeMessageCtx(PLAYERS[0].id, PLAYERS[1].name);
		await regNameStateMessageHandler(ctx);
		const log = getLog();
		assertSent(log, PLAYERS[0].id, 'Это имя уже используется');
		resetLog();
	}

	// ── Final DB count ────────────────────────────────────────────────────────
	assert(DB.data.users.length === PLAYERS.length, `DB should have ${PLAYERS.length} users`);
}
