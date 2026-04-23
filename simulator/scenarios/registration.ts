/**
 * registration.ts — /reg flow coverage.
 *
 * Covers:
 *   - initial /reg prompt and state
 *   - successful registration and default user fields
 *   - global keyboard after success and repeated /reg
 *   - repeated /reg does not change state or DB
 *   - invalid names keep player in REGISTRATION and do not create DB records
 *   - recovery after invalid input without sending /reg again
 *   - valid boundary names (2 and 16 chars)
 *   - valid names with '-' and '_'
 *   - case-insensitive uniqueness for names
 */

import { DB, STATES, resetLog, getLog, clearDB } from '../bootstrap';
import { assert, assertSent } from '../runner';

const GLOBAL_KEYBOARD_LABELS = 'Настройки · Комнаты · Рука';

const PLAYERS = [
	{ id: 1001, username: 'alice_sim', name: 'Алиса' },
	{ id: 1002, username: 'bob_sim', name: 'Борис' },
	{ id: 1003, username: 'carol_sim', name: 'Каролина' },
	{ id: 1004, username: 'dave_sim', name: 'Дмитрий' },
	{ id: 1005, username: 'eve_sim', name: 'Евгения' },
] as const;

const RECOVERY_PLAYER = { id: 1006, username: 'frank_sim', name: 'Жанна' } as const;
const MIN_NAME_PLAYER = { id: 1007, username: 'grace_sim', name: 'Яя' } as const;
const MAX_NAME_PLAYER = { id: 1008, username: 'heidi_sim', name: 'АБВГДЕЖЗИЙКЛМНОП' } as const;
const DASH_NAME_PLAYER = { id: 1009, username: 'ivan_sim', name: 'Анна-Юг' } as const;
const UNDERSCORE_NAME_PLAYER = { id: 1010, username: 'judy_sim', name: 'Анна_Юг' } as const;

const makeMessageCtx = (playerId: number, text: string, username?: string) => ({
	chatId: playerId,
	message: {
		message_id: 1,
		chat: { id: playerId, type: 'private' as const },
		date: Math.floor(Date.now() / 1000),
		text,
		from: { id: playerId, is_bot: false, first_name: String(playerId), username },
	},
});

const assertRegisteredUser = (
	player: { id: number; username: string; name: string },
	expectedName = player.name,
): void => {
	const dbUser = DB.data.users.find(u => u.id === player.id);
	assert(dbUser !== undefined, `${player.name}: should exist in DB`);
	assert(dbUser!.name === expectedName, `${player.name}: name should match`);
	assert(dbUser!.username === player.username, `${player.name}: username should match`);
	assert(dbUser!.settings.updatesView === 'instant', `${player.name}: default updatesView should be instant`);
	assert(Array.isArray(dbUser!.achievements), `${player.name}: achievements array should exist`);
};

const assertSuccessWithKeyboard = (
	player: { id: number; username: string; name: string },
	expectedName = player.name,
): void => {
	const log = getLog();
	assertSent(log, player.id, 'Поздравляю');
	assertSent(log, player.id, 'успешно зарегистрирован');
	assertSent(log, player.id, GLOBAL_KEYBOARD_LABELS);
	assert(STATES.getState(player.id) === undefined, `${player.name}: state should be cleared after registration`);
	assertRegisteredUser(player, expectedName);
	resetLog();
};

const registerFreshPlayer = async (
	player: { id: number; username: string; name: string },
	regStartMessageHandler: (ctx: ReturnType<typeof makeMessageCtx>) => Promise<void>,
	regNameStateMessageHandler: (ctx: ReturnType<typeof makeMessageCtx>) => Promise<void>,
): Promise<void> => {
	await regStartMessageHandler(makeMessageCtx(player.id, '/reg', player.username));

	let log = getLog();
	assertSent(log, player.id, 'Напиши мне своё имя');
	assert(STATES.getState(player.id) === 'REGISTRATION', `${player.name}: state should be REGISTRATION`);
	resetLog();

	await regNameStateMessageHandler(makeMessageCtx(player.id, player.name, player.username));

	log = getLog();
	assertSent(log, player.id, 'Поздравляю');
	assertSent(log, player.id, 'успешно зарегистрирован');
	assertSent(log, player.id, GLOBAL_KEYBOARD_LABELS);
	assert(STATES.getState(player.id) === undefined, `${player.name}: state should be cleared after registration`);
	assertRegisteredUser(player);
	resetLog();
};

export async function scenarioRegistration (): Promise<void> {
	resetLog();
	await clearDB();

	const { regStartMessageHandler, regNameStateMessageHandler } = await import('~/modules/reg/handlers');

	for (const player of PLAYERS) {
		await regStartMessageHandler(makeMessageCtx(player.id, '/reg', player.username));

		const log = getLog();
		assertSent(log, player.id, 'Напиши мне своё имя');
		assert(STATES.getState(player.id) === 'REGISTRATION', `${player.name}: state should be REGISTRATION`);
		resetLog();
	}

	for (const player of PLAYERS) {
		await regNameStateMessageHandler(makeMessageCtx(player.id, player.name, player.username));
		assertSuccessWithKeyboard(player);
	}

	for (const player of PLAYERS) {
		const usersBefore = DB.data.users.length;
		await regStartMessageHandler(makeMessageCtx(player.id, '/reg', player.username));

		const log = getLog();
		assertSent(log, player.id, 'Ты уже зарегистрирован');
		assertSent(log, player.id, GLOBAL_KEYBOARD_LABELS);
		assert(STATES.getState(player.id) === undefined, `${player.name}: state should stay cleared after repeated /reg`);
		assert(DB.data.users.length === usersBefore, `${player.name}: repeated /reg should not change DB count`);
		assertRegisteredUser(player);
		resetLog();
	}

	await regStartMessageHandler(makeMessageCtx(RECOVERY_PLAYER.id, '/reg', RECOVERY_PLAYER.username));
	let log = getLog();
	assertSent(log, RECOVERY_PLAYER.id, 'Напиши мне своё имя');
	assert(STATES.getState(RECOVERY_PLAYER.id) === 'REGISTRATION', 'Recovery player: state should be REGISTRATION');
	resetLog();

	const assertInvalidPendingName = async (name: string, expectedMessage: string): Promise<void> => {
		const usersBefore = DB.data.users.length;
		await regNameStateMessageHandler(makeMessageCtx(RECOVERY_PLAYER.id, name, RECOVERY_PLAYER.username));

		const currentLog = getLog();
		assertSent(currentLog, RECOVERY_PLAYER.id, expectedMessage);
		assert(STATES.getState(RECOVERY_PLAYER.id) === 'REGISTRATION', `Recovery player: state should stay REGISTRATION after "${name}"`);
		assert(DB.data.users.length === usersBefore, `Recovery player: DB count should not change after "${name}"`);
		assert(DB.data.users.find(u => u.id === RECOVERY_PLAYER.id) === undefined, `Recovery player: user should not be created after "${name}"`);
		resetLog();
	};

	await assertInvalidPendingName('АБВГДЕЖЗИЙКЛМНОПР', 'Имя не должно быть длиннее 16 символов');
	await assertInvalidPendingName('ab', 'Имя может содержать только русские буквы');
	await assertInvalidPendingName('б', 'Имя не должно быть короче 2 символов');
	await assertInvalidPendingName('Имя', 'Это имя нельзя взять');
	await assertInvalidPendingName(PLAYERS[1].name, 'Это имя уже используется');
	await assertInvalidPendingName('бОрИс', 'Это имя уже используется');

	await regNameStateMessageHandler(makeMessageCtx(RECOVERY_PLAYER.id, RECOVERY_PLAYER.name, RECOVERY_PLAYER.username));
	assertSuccessWithKeyboard(RECOVERY_PLAYER);

	await registerFreshPlayer(MIN_NAME_PLAYER, regStartMessageHandler, regNameStateMessageHandler);
	await registerFreshPlayer(MAX_NAME_PLAYER, regStartMessageHandler, regNameStateMessageHandler);
	await registerFreshPlayer(DASH_NAME_PLAYER, regStartMessageHandler, regNameStateMessageHandler);
	await registerFreshPlayer(UNDERSCORE_NAME_PLAYER, regStartMessageHandler, regNameStateMessageHandler);

	assert(DB.data.users.length === 10, 'DB should have 10 registered users after all registration checks');
}
