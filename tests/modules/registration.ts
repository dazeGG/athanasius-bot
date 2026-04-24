/**
 * registration.ts — /reg flow coverage split into explicit cases.
 */

import { DB, SESSIONS, resetLog, getLog, clearDB, seedDB, withMessageMethods } from '../bootstrap';
import { assert, assertSent } from '../runner';
import type { ModuleTools } from '../runner';

const GLOBAL_KEYBOARD_LABELS = 'Настройки · Комнаты · Заметки · Рука';

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

const ALL_TEST_PLAYERS = [
	...PLAYERS,
	RECOVERY_PLAYER,
	MIN_NAME_PLAYER,
	MAX_NAME_PLAYER,
	DASH_NAME_PLAYER,
	UNDERSCORE_NAME_PLAYER,
] as const;

type PlayerFixture = (typeof ALL_TEST_PLAYERS)[number];
type MessageCtx = ReturnType<typeof makeMessageCtx>;
type RegistrationHandlers = {
	regStartMessageHandler: (ctx: MessageCtx) => Promise<void>;
	regNameStateMessageHandler: (ctx: MessageCtx) => Promise<void>;
};

const makeMessageCtx = (playerId: number, text: string, username?: string) => withMessageMethods({
	chat: { id: playerId, type: 'private' as const },
	from: { id: playerId, is_bot: false, first_name: String(playerId), username },
	message: {
		message_id: 1,
		chat: { id: playerId, type: 'private' as const },
		date: Math.floor(Date.now() / 1000),
		text,
		from: { id: playerId, is_bot: false, first_name: String(playerId), username },
	},
});

const resetRegistrationCase = async (): Promise<void> => {
	resetLog();
	await clearDB();
	ALL_TEST_PLAYERS.forEach(player => {
		SESSIONS.clear(player.id);
	});
};

const assertRegisteredUser = (player: PlayerFixture, expectedName = player.name): void => {
	const dbUser = DB.data.users.find(u => u.id === player.id);
	assert(dbUser !== undefined, `${player.name}: should exist in DB`);
	assert(dbUser!.name === expectedName, `${player.name}: name should match`);
	assert(dbUser!.username === player.username, `${player.name}: username should match`);
	assert(dbUser!.settings.updatesView === 'instant', `${player.name}: default updatesView should be instant`);
	assert(Array.isArray(dbUser!.achievements), `${player.name}: achievements array should exist`);
};

const startRegistration = async (
	player: PlayerFixture,
	{ regStartMessageHandler }: RegistrationHandlers,
): Promise<void> => {
	await regStartMessageHandler(makeMessageCtx(player.id, '/reg', player.username));

	const log = getLog();
	assertSent(log, player.id, 'Напиши мне своё имя');
	assert(SESSIONS.get(player.id).flow.name === 'REGISTRATION', `${player.name}: state should be REGISTRATION`);
	resetLog();
};

const completeRegistration = async (
	player: PlayerFixture,
	{ regNameStateMessageHandler }: RegistrationHandlers,
	expectedName = player.name,
): Promise<void> => {
	await regNameStateMessageHandler(makeMessageCtx(player.id, expectedName, player.username));

	const log = getLog();
	assertSent(log, player.id, 'Поздравляю');
	assertSent(log, player.id, 'успешно зарегистрирован');
	assertSent(log, player.id, GLOBAL_KEYBOARD_LABELS);
	assert(SESSIONS.get(player.id).flow.name === undefined, `${player.name}: state should be cleared after registration`);
	assertRegisteredUser(player, expectedName);
	resetLog();
};

const registerFreshPlayer = async (
	player: PlayerFixture,
	handlers: RegistrationHandlers,
): Promise<void> => {
	await startRegistration(player, handlers);
	await completeRegistration(player, handlers);
};

const seedRegisteredPlayers = async (
	players: readonly PlayerFixture[],
	handlers: RegistrationHandlers,
): Promise<void> => {
	for (const player of players) {
		await registerFreshPlayer(player, handlers);
	}
};

const assertInvalidPendingName = async (
	player: PlayerFixture,
	name: string,
	expectedMessage: string,
	{ regNameStateMessageHandler }: RegistrationHandlers,
	expectedUsersCount: number,
): Promise<void> => {
	await regNameStateMessageHandler(makeMessageCtx(player.id, name, player.username));

	const log = getLog();
	assertSent(log, player.id, expectedMessage);
	assert(SESSIONS.get(player.id).flow.name === 'REGISTRATION', `${player.name}: state should stay REGISTRATION after "${name}"`);
	assert(DB.data.users.length === expectedUsersCount, `${player.name}: DB count should stay ${expectedUsersCount} after "${name}"`);
	assert(DB.data.users.find(u => u.id === player.id) === undefined, `${player.name}: user should not be created after "${name}"`);
	resetLog();
};

/**
 * Runs tests coverage for the registration command and name validation flow.
 */
export async function registrationModule ({ runCase }: ModuleTools): Promise<void> {
	const handlers = await import('../../src/modules/reg/handlers');

	await runCase('Prompts new users for a name and stores REGISTRATION state', async () => {
		await resetRegistrationCase();

		for (const player of PLAYERS) {
			await startRegistration(player, handlers);
		}
	});

	await runCase('Registers users with default profile data and global keyboard', async () => {
		await resetRegistrationCase();

		await seedRegisteredPlayers(PLAYERS, handlers);
		assert(DB.data.users.length === PLAYERS.length, `DB should have ${PLAYERS.length} registered users`);
	});

	await runCase('Repeated /reg keeps registered users untouched', async () => {
		await resetRegistrationCase();
		await seedRegisteredPlayers(PLAYERS, handlers);

		for (const player of PLAYERS) {
			const usersBefore = DB.data.users.length;
			await handlers.regStartMessageHandler(makeMessageCtx(player.id, '/reg', player.username));

			const log = getLog();
			assertSent(log, player.id, 'Ты уже зарегистрирован');
			assertSent(log, player.id, GLOBAL_KEYBOARD_LABELS);
			assert(SESSIONS.get(player.id).flow.name === undefined, `${player.name}: state should stay cleared after repeated /reg`);
			assert(DB.data.users.length === usersBefore, `${player.name}: repeated /reg should not change DB count`);
			assertRegisteredUser(player);
			resetLog();
		}
	});

	await runCase('Rejects invalid names while keeping the registration pending', async () => {
		await resetRegistrationCase();
		await seedRegisteredPlayers([PLAYERS[1]], handlers);
		await startRegistration(RECOVERY_PLAYER, handlers);

		await assertInvalidPendingName(RECOVERY_PLAYER, 'АБВГДЕЖЗИЙКЛМНОПР', 'Имя не должно быть длиннее 16 символов', handlers, 1);
		await assertInvalidPendingName(RECOVERY_PLAYER, 'ab', 'Имя может содержать только русские буквы', handlers, 1);
		await assertInvalidPendingName(RECOVERY_PLAYER, 'б', 'Имя не должно быть короче 2 символов', handlers, 1);
		await assertInvalidPendingName(RECOVERY_PLAYER, 'Имя', 'Это имя нельзя взять', handlers, 1);
		await assertInvalidPendingName(RECOVERY_PLAYER, PLAYERS[1].name, 'Это имя уже используется', handlers, 1);
	});

	await runCase('Rejects names that differ only by case', async () => {
		await resetRegistrationCase();
		await seedRegisteredPlayers([PLAYERS[1]], handlers);
		await startRegistration(RECOVERY_PLAYER, handlers);

		await assertInvalidPendingName(RECOVERY_PLAYER, 'бОрИс', 'Это имя уже используется', handlers, 1);
	});

	await runCase('Allows finishing registration after previous invalid attempts', async () => {
		await resetRegistrationCase();
		await seedRegisteredPlayers([PLAYERS[1]], handlers);
		await startRegistration(RECOVERY_PLAYER, handlers);

		await assertInvalidPendingName(RECOVERY_PLAYER, 'ab', 'Имя может содержать только русские буквы', handlers, 1);
		await assertInvalidPendingName(RECOVERY_PLAYER, 'бОрИс', 'Это имя уже используется', handlers, 1);

		await completeRegistration(RECOVERY_PLAYER, handlers);
		assert(DB.data.users.length === 2, 'DB should contain Bob and the recovered player after successful registration');
	});

	await runCase('Accepts names with 2 and 16 characters', async () => {
		await resetRegistrationCase();

		await registerFreshPlayer(MIN_NAME_PLAYER, handlers);
		await registerFreshPlayer(MAX_NAME_PLAYER, handlers);

		assert(DB.data.users.length === 2, 'DB should contain players with valid boundary-length names');
	});

	await runCase('Accepts names with dash and underscore', async () => {
		await resetRegistrationCase();

		await registerFreshPlayer(DASH_NAME_PLAYER, handlers);
		await registerFreshPlayer(UNDERSCORE_NAME_PLAYER, handlers);

		assert(DB.data.users.length === 2, 'DB should contain players with separator-based names');
	});

	await runCase('Updates name for already-registered user in REGISTRATION flow', async () => {
		await resetRegistrationCase();
		const player = PLAYERS[0];
		await seedDB({
			users: [{ id: player.id, username: player.username, name: player.name, settings: { updatesView: 'instant' as const }, achievements: [] }],
			rooms: [],
			games: [],
		});
		SESSIONS.setFlow(player.id, { name: 'REGISTRATION' });
		resetLog();

		const newName = 'Антонина';
		await handlers.regNameStateMessageHandler(makeMessageCtx(player.id, newName, player.username));

		const log = getLog();
		assertSent(log, player.id, 'Поздравляю');
		assertSent(log, player.id, GLOBAL_KEYBOARD_LABELS);
		assert(SESSIONS.get(player.id).flow.name === undefined, 'Session should be cleared after rename');
		const dbUser = DB.data.users.find(u => u.id === player.id);
		assert(dbUser?.name === newName, `Name should be updated to "${newName}" in DB`);
		assert(DB.data.users.length === 1, 'No duplicate user should be created on rename');
	});

	await runCase('Rejects reserved name "вовощ" during registration flow', async () => {
		await resetRegistrationCase();
		await startRegistration(RECOVERY_PLAYER, handlers);

		await assertInvalidPendingName(RECOVERY_PLAYER, 'вовощ', 'Это имя нельзя взять', handlers, 0);
	});
}
