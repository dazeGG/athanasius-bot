/**
 * settings.ts — user settings coverage split into explicit cases.
 */

import { DB } from '../../src/db';

import { SESSIONS, resetLog, getLog, clearDB, seedDB, withCallbackMethods, withMessageMethods } from '../bootstrap';
import { assert, assertDeleted, assertSent, assertNotSent } from '../runner';
import type { ModuleTools } from '../runner';

const PLAYERS = [
	{ id: 1001, username: 'alice_sim', name: 'Алиса', updatesView: 'instant' as const },
	{ id: 1002, username: 'bob_sim', name: 'Борис', updatesView: 'instant' as const },
	{ id: 1003, username: 'carol_sim', name: 'Каролина', updatesView: 'composed' as const },
] as const;

const [ALICE, , CAROL] = PLAYERS;
const SETTINGS_KEYBOARD_LABELS = 'Имя · Вид обновлений · Режим подтверждения · Выход';

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

const makeCallbackCtx = (player: PlayerFixture, action: 'name' | 'updatesView' | 'exit') => withCallbackMethods({
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

const resetSettingsCase = async (): Promise<void> => {
	resetLog();
	await clearDB();
	PLAYERS.forEach(player => {
		SESSIONS.clear(player.id);
	});
};

const seedRegisteredUsers = async (): Promise<void> => {
	await seedDB({
		users: PLAYERS.map(player => ({
			id: player.id,
			username: player.username,
			name: player.name,
			settings: {
				updatesView: player.updatesView,
			},
			achievements: [],
		})),
		rooms: [],
		games: [],
	});
	resetLog();
};

const seedActiveGameFor = async (player: PlayerFixture): Promise<void> => {
	await seedDB({
		users: PLAYERS.map(item => ({
			id: item.id,
			username: item.username,
			name: item.name,
			settings: {
				updatesView: item.updatesView,
			},
			achievements: [],
		})),
		rooms: [],
		games: [
			{
				id: 'game1',
				roomId: 'room1',
				name: 'Комната активной игры',
				started: Date.now(),
				players: [player.id],
				hands: { [player.id]: [] },
				athanasiuses: { [player.id]: [] },
				utils: {
					cardsToAthanasius: 4,
					jokerCardsToAthanasius: 2,
					logs: [],
				},
			},
		],
	});
	resetLog();
};

const getUser = (playerId: number) => {
	const user = DB.data.users.find(item => item.id === playerId);
	assert(user !== undefined, `User ${playerId} should exist`);
	return user!;
};

/**
 * Runs tests coverage for user settings navigation and mutations.
 */
export async function settingsModule ({ runCase }: ModuleTools): Promise<void> {
	const handlers = await import('../../src/modules/settings/handlers');

	await runCase('Shows current settings and actions for idle user', async () => {
		await resetSettingsCase();
		await seedRegisteredUsers();

		await handlers.settingsStartMessageHandler(makeMessageCtx(ALICE, 'Настройки'));

		const log = getLog();
		assertDeleted(log, ALICE.id, 1);
		assertSent(log, ALICE.id, 'Твои настройки');
		assertSent(log, ALICE.id, `Имя: ${ALICE.name}`);
		assertSent(log, ALICE.id, 'Вид обновлений: instant');
		assertSent(log, ALICE.id, SETTINGS_KEYBOARD_LABELS);
	});

	await runCase('Blocks settings changes during an active game', async () => {
		await resetSettingsCase();
		await seedActiveGameFor(ALICE);

		await handlers.settingsStartMessageHandler(makeMessageCtx(ALICE, 'Настройки'));

		const log = getLog();
		assertDeleted(log, ALICE.id, 1);
		assertSent(log, ALICE.id, 'Нельзя менять настройки во время игры');
		assertNotSent(log, ALICE.id, 'Твои настройки');
	});

	await runCase('Toggles updates view from instant to composed', async () => {
		await resetSettingsCase();
		await seedRegisteredUsers();

		await handlers.settingsCallbackHandler(makeCallbackCtx(ALICE, 'updatesView'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Твои настройки');
		assertSent(log, ALICE.id, 'Вид обновлений: composed');
		assertSent(log, ALICE.id, SETTINGS_KEYBOARD_LABELS);
		assert(getUser(ALICE.id).settings.updatesView === 'composed', 'Alice updatesView should become composed');
	});

	await runCase('Toggles updates view from composed back to instant', async () => {
		await resetSettingsCase();
		await seedRegisteredUsers();

		await handlers.settingsCallbackHandler(makeCallbackCtx(CAROL, 'updatesView'));

		const log = getLog();
		assertSent(log, CAROL.id, 'Твои настройки');
		assertSent(log, CAROL.id, 'Вид обновлений: instant');
		assert(getUser(CAROL.id).settings.updatesView === 'instant', 'Carol updatesView should become instant');
	});

	await runCase('Opens rename flow and stores SETTINGS_CHANGE_NAME state', async () => {
		await resetSettingsCase();
		await seedRegisteredUsers();

		await handlers.settingsCallbackHandler(makeCallbackCtx(ALICE, 'name'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Отлично, напиши мне новое имя');
		assertSent(log, ALICE.id, 'Имя должно быть уникальным независимо от регистра');
		assert(SESSIONS.get(ALICE.id).flow.name === 'SETTINGS_CHANGE_NAME', 'Alice state should be SETTINGS_CHANGE_NAME');
	});

	await runCase('Rejects invalid renamed value and keeps rename state', async () => {
		await resetSettingsCase();
		await seedRegisteredUsers();
		SESSIONS.setFlow(ALICE.id, { name: 'SETTINGS_CHANGE_NAME' });

		await handlers.settingsChangeNameStateMessageHandler(makeMessageCtx(ALICE, 'ab'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Имя может содержать только русские буквы');
		assert(SESSIONS.get(ALICE.id).flow.name === 'SETTINGS_CHANGE_NAME', 'Alice state should remain SETTINGS_CHANGE_NAME after invalid rename');
		assert(getUser(ALICE.id).name === ALICE.name, 'Alice name should stay unchanged after invalid rename');
	});

	await runCase('Rejects duplicate renamed value ignoring case', async () => {
		await resetSettingsCase();
		await seedRegisteredUsers();
		SESSIONS.setFlow(ALICE.id, { name: 'SETTINGS_CHANGE_NAME' });

		await handlers.settingsChangeNameStateMessageHandler(makeMessageCtx(ALICE, 'бОрИс'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Это имя уже используется');
		assert(SESSIONS.get(ALICE.id).flow.name === 'SETTINGS_CHANGE_NAME', 'Alice state should remain SETTINGS_CHANGE_NAME after duplicate rename');
		assert(getUser(ALICE.id).name === ALICE.name, 'Alice name should stay unchanged after duplicate rename');
	});

	await runCase('Renames user successfully after previous invalid attempt', async () => {
		await resetSettingsCase();
		await seedRegisteredUsers();
		SESSIONS.setFlow(ALICE.id, { name: 'SETTINGS_CHANGE_NAME' });

		await handlers.settingsChangeNameStateMessageHandler(makeMessageCtx(ALICE, 'ab'));
		resetLog();

		await handlers.settingsChangeNameStateMessageHandler(makeMessageCtx(ALICE, 'Алевтина'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Применил изменения');
		assertSent(log, ALICE.id, 'Твои настройки');
		assertSent(log, ALICE.id, 'Имя: Алевтина');
		assertSent(log, ALICE.id, 'Вид обновлений: instant');
		assert(SESSIONS.get(ALICE.id).flow.name === undefined, 'Alice state should be cleared after successful rename');
		assert(getUser(ALICE.id).name === 'Алевтина', 'Alice name should be updated after successful rename');
	});

	await runCase('Exit callback closes settings without sending extra messages', async () => {
		await resetSettingsCase();
		await seedRegisteredUsers();

		await handlers.settingsCallbackHandler(makeCallbackCtx(ALICE, 'exit'));

		const log = getLog();
		assertDeleted(log, ALICE.id, 1);
		assert(log.length === 1, 'Exit callback should only delete the settings message');
	});

	await runCase('Blocks rename callback during an active game', async () => {
		await resetSettingsCase();
		await seedActiveGameFor(ALICE);

		await handlers.settingsCallbackHandler(makeCallbackCtx(ALICE, 'name'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Нельзя менять настройки во время игры');
		assertNotSent(log, ALICE.id, 'напиши мне новое имя');
		assert(SESSIONS.get(ALICE.id).flow.name === undefined, 'Rename flow must not be set when blocked by an active game');
	});

	await runCase('Blocks updatesView callback during an active game', async () => {
		await resetSettingsCase();
		await seedActiveGameFor(ALICE);

		await handlers.settingsCallbackHandler(makeCallbackCtx(ALICE, 'updatesView'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Нельзя менять настройки во время игры');
		assert(getUser(ALICE.id).settings.updatesView === ALICE.updatesView, 'updatesView must not change when blocked by an active game');
	});

	await runCase('Exit callback still closes settings during an active game', async () => {
		await resetSettingsCase();
		await seedActiveGameFor(ALICE);

		await handlers.settingsCallbackHandler(makeCallbackCtx(ALICE, 'exit'));

		const log = getLog();
		assertDeleted(log, ALICE.id, 1);
		assertNotSent(log, ALICE.id, 'Нельзя менять настройки во время игры');
	});

	await runCase('Blocks rename state message during an active game', async () => {
		await resetSettingsCase();
		await seedActiveGameFor(ALICE);
		SESSIONS.setFlow(ALICE.id, { name: 'SETTINGS_CHANGE_NAME' });

		await handlers.settingsChangeNameStateMessageHandler(makeMessageCtx(ALICE, 'Алевтина'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Нельзя менять настройки во время игры');
		assert(getUser(ALICE.id).name === ALICE.name, 'Name must not change when rename message is blocked by an active game');
	});
}
