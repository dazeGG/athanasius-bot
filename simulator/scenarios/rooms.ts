/**
 * rooms.ts — room creation, joining, settings, and membership flows split into explicit cases.
 */

import { ORM, DB } from '~/db';
import type { CallbackData } from '~/core';

import { STATES, resetLog, getLog, clearDB, seedDB } from '../bootstrap';
import { assert, assertSent, assertNotSent } from '../runner';
import type { ScenarioTools } from '../runner';

const PLAYERS = [
	{ id: 1001, username: 'alice_sim', name: 'Алиса' },
	{ id: 1002, username: 'bob_sim', name: 'Борис' },
	{ id: 1003, username: 'carol_sim', name: 'Каролина' },
	{ id: 1004, username: 'dave_sim', name: 'Дмитрий' },
	{ id: 1005, username: 'eve_sim', name: 'Евгения' },
] as const;

const [ALICE, BOB, CAROL, DAVE, EVE] = PLAYERS;
const DEFAULT_ROOM_NAME = 'Комната Алисы';

type PlayerFixture = (typeof PLAYERS)[number];
type MessageCtx = ReturnType<typeof makeMessageCtx>;
type RoomsHandlersModule = typeof import('~/modules/rooms/handlers');

const makeMessageCtx = (player: PlayerFixture, text: string) => ({
	chatId: player.id,
	message: {
		message_id: 1,
		chat: { id: player.id, type: 'private' as const },
		date: Math.floor(Date.now() / 1000),
		text,
		from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
	},
});

const makeCallbackCtx = (
	player: PlayerFixture,
	data: CallbackData,
	messageId = 1,
) => ({
	chatId: player.id,
	callback: {
		id: `cb-${player.id}`,
		from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
		message: {
			message_id: messageId,
			chat: { id: player.id, type: 'private' as const },
			date: Math.floor(Date.now() / 1000),
		},
		data,
	},
});

const resetRoomsCase = async (): Promise<void> => {
	resetLog();
	await clearDB();
	PLAYERS.forEach(player => {
		STATES.clearState(player.id);
	});
};

const seedRegisteredUsers = async (): Promise<void> => {
	await seedDB({
		users: PLAYERS.map(player => ({
			id: player.id,
			username: player.username,
			name: player.name,
			settings: {
				updatesView: 'instant' as const,
			},
			achievements: [],
		})),
		rooms: [],
		games: [],
	});
	resetLog();
};

const getRoomByName = (roomName = DEFAULT_ROOM_NAME) => {
	const room = ORM.Rooms.getAll().find(item => item.name === roomName);
	assert(room !== undefined, `Room "${roomName}" should exist`);
	return room!;
};

const assertRoomPlayers = (roomId: string, expectedPlayers: readonly number[]): void => {
	const room = ORM.Rooms.getById(roomId);
	assert(
		JSON.stringify(room.players) === JSON.stringify([...expectedPlayers]),
		`Room players should be ${expectedPlayers.join(', ')} but got ${room.players.join(', ')}`,
	);
};

const startCreateRoomFlow = async (
	owner: PlayerFixture,
	handlers: RoomsHandlersModule,
): Promise<void> => {
	await handlers.createRoomCallbackHandler(makeCallbackCtx(owner, { module: 'rooms', action: 'create' }));

	const log = getLog();
	assertSent(log, owner.id, 'Напиши название комнаты');
	assert(STATES.getState(owner.id) === 'ROOMS_CREATE', `${owner.name}: state should be ROOMS_CREATE`);
	resetLog();
};

const createRoom = async (
	owner: PlayerFixture,
	handlers: RoomsHandlersModule,
	roomName = DEFAULT_ROOM_NAME,
) => {
	await startCreateRoomFlow(owner, handlers);
	await handlers.createRoomNameMessageHandler(makeMessageCtx(owner, roomName));

	const log = getLog();
	assertSent(log, owner.id, 'Создал комнату');
	assertSent(log, owner.id, roomName);
	assertSent(log, owner.id, 'Вот список твоих комнат');
	assertSent(log, owner.id, roomName);
	assert(STATES.getState(owner.id) === undefined, `${owner.name}: state should be cleared after room creation`);

	const room = getRoomByName(roomName);
	assert(room.owner === owner.id, `${owner.name}: should be room owner`);
	assertRoomPlayers(room.id, [owner.id]);
	assert(room.settings.joinCode !== undefined, `${owner.name}: room should have join code`);
	resetLog();

	return room;
};

const startJoinRoomFlow = async (
	player: PlayerFixture,
	handlers: RoomsHandlersModule,
): Promise<void> => {
	await handlers.joinRoomCallbackHandler(makeCallbackCtx(player, { module: 'rooms', action: 'join' }));

	const log = getLog();
	assertSent(log, player.id, 'Напиши код подключения');
	assert(STATES.getState(player.id) === 'ROOMS_JOIN', `${player.name}: state should be ROOMS_JOIN`);
	resetLog();
};

const joinRoomSuccessfully = async (
	player: PlayerFixture,
	roomId: string,
	handlers: RoomsHandlersModule,
): Promise<void> => {
	const roomBefore = ORM.Rooms.getById(roomId);
	const playersBefore = [...roomBefore.players];
	const roomName = roomBefore.name;
	const joinCode = roomBefore.settings.joinCode;

	await startJoinRoomFlow(player, handlers);
	await handlers.joinRoomCodeMessageHandler(makeMessageCtx(player, joinCode));

	const log = getLog();
	assertSent(log, player.id, `Ты зашел в комнату ${roomName}`);
	assertSent(log, player.id, 'Вот список твоих комнат');
	assert(STATES.getState(player.id) === undefined, `${player.name}: state should be cleared after successful join`);
	assertRoomPlayers(roomId, [...playersBefore, player.id]);
	playersBefore.forEach(playerId => {
		assertSent(log, playerId, 'зашел');
	});
	resetLog();
};

const setupRoomWithPlayers = async (
	members: readonly PlayerFixture[],
	handlers: RoomsHandlersModule,
	roomName = DEFAULT_ROOM_NAME,
) => {
	await resetRoomsCase();
	await seedRegisteredUsers();

	const room = await createRoom(ALICE, handlers, roomName);

	for (const member of members) {
		await joinRoomSuccessfully(member, room.id, handlers);
	}

	return ORM.Rooms.getById(room.id);
};

export async function scenarioRooms ({ runCase }: ScenarioTools): Promise<void> {
	const handlers = await import('~/modules/rooms/handlers');
	const { SettingsHandlers } = await import('~/modules/rooms/settings.handlers');

	await runCase('Shows empty rooms view with default actions', async () => {
		await resetRoomsCase();
		await seedRegisteredUsers();

		await handlers.roomsMessageHandler(makeMessageCtx(ALICE, 'Комнаты'));

		const log = getLog();
		assertSent(log, ALICE.id, 'У тебя пока нет комнат');
		assertSent(log, ALICE.id, 'Зайти по коду · Создать комнату');
	});

	await runCase('Creates a room from callback and name input', async () => {
		await resetRoomsCase();
		await seedRegisteredUsers();

		const room = await createRoom(ALICE, handlers);
		assert(room.settings.decksCount === 4, 'New room should start with 4 decks');
	});

	await runCase('Rejects duplicate room name and keeps creation state', async () => {
		await resetRoomsCase();
		await seedRegisteredUsers();
		await createRoom(ALICE, handlers);

		await startCreateRoomFlow(ALICE, handlers);
		await handlers.createRoomNameMessageHandler(makeMessageCtx(ALICE, DEFAULT_ROOM_NAME));

		const log = getLog();
		assertSent(log, ALICE.id, 'Комната Комната Алисы уже есть');
		assert(STATES.getState(ALICE.id) === 'ROOMS_CREATE', 'Alice should stay in ROOMS_CREATE after duplicate room name');
		assert(ORM.Rooms.getAll().filter(room => room.name === DEFAULT_ROOM_NAME).length === 1, 'Only one room with duplicate name should exist');
	});

	await runCase('Rejects wrong join code and clears join state', async () => {
		await resetRoomsCase();
		await seedRegisteredUsers();
		await createRoom(ALICE, handlers);

		await startJoinRoomFlow(BOB, handlers);
		await handlers.joinRoomCodeMessageHandler(makeMessageCtx(BOB, 'XXXX-XXXX'));

		const log = getLog();
		assertSent(log, BOB.id, 'Неправильный код подключения');
		assertSent(log, BOB.id, 'Вот список твоих комнат');
		assert(STATES.getState(BOB.id) === undefined, 'Bob state should be cleared after wrong code');
		assert(ORM.Rooms.getAll()[0].players.length === 1, 'Wrong code should not change room players');
	});

	await runCase('Allows joining by code and notifies existing players', async () => {
		const room = await setupRoomWithPlayers([BOB], handlers);
		assertRoomPlayers(room.id, [ALICE.id, BOB.id]);
	});

	await runCase('Rejects joining the same room twice', async () => {
		const room = await setupRoomWithPlayers([BOB], handlers);

		await startJoinRoomFlow(BOB, handlers);
		await handlers.joinRoomCodeMessageHandler(makeMessageCtx(BOB, room.settings.joinCode));

		const log = getLog();
		assertSent(log, BOB.id, `Ты уже в комнате ${room.name}`);
		assert(STATES.getState(BOB.id) === undefined, 'Bob state should be cleared after duplicate join');
		assertRoomPlayers(room.id, [ALICE.id, BOB.id]);
	});

	await runCase('Shows different room controls for owner and member', async () => {
		const room = await setupRoomWithPlayers([BOB, CAROL], handlers);

		await handlers.openRoomCallbackHandler(makeCallbackCtx(ALICE, { module: 'rooms', action: 'open', meta: room.id }));
		let log = getLog();
		assertSent(log, ALICE.id, 'Комната Алисы');
		assertSent(log, ALICE.id, 'Код подключения');
		assertSent(log, ALICE.id, 'Алиса');
		assertSent(log, ALICE.id, 'Борис');
		assertSent(log, ALICE.id, 'Каролина');
		assertSent(log, ALICE.id, 'Выгнать игроков · Начать игру · Назад');
		assertNotSent(log, ALICE.id, 'Выйти');
		resetLog();

		await handlers.openRoomCallbackHandler(makeCallbackCtx(BOB, { module: 'rooms', action: 'open', meta: room.id }));
		log = getLog();
		assertSent(log, BOB.id, 'Комната Алисы');
		assertSent(log, BOB.id, 'Выйти · Назад');
		assertNotSent(log, BOB.id, 'Выгнать игроков');
		assertNotSent(log, BOB.id, 'Начать игру');
	});

	await runCase('Allows owner to kick a player and ignores stale leave callback safely', async () => {
		const room = await setupRoomWithPlayers([BOB, CAROL], handlers);

		await handlers.kickCallbackHandler(makeCallbackCtx(ALICE, { module: 'room', action: 'kick', meta: `${room.id}:` }));
		let log = getLog();
		assertSent(log, ALICE.id, 'Выбери кого хочешь выгнать');
		assertSent(log, ALICE.id, 'Борис');
		assertSent(log, ALICE.id, 'Каролина');
		resetLog();

		await handlers.kickCallbackHandler(makeCallbackCtx(ALICE, { module: 'room', action: 'kick', meta: `${room.id}:${BOB.id}` }));
		log = getLog();
		assertSent(log, BOB.id, 'Тебя выгнали');
		assertSent(log, ALICE.id, 'был выгнан');
		assertRoomPlayers(room.id, [ALICE.id, CAROL.id]);
		resetLog();

		await handlers.leaveRoomCallbackHandler(makeCallbackCtx(BOB, { module: 'room', action: 'leave', meta: room.id }));
		log = getLog();
		assertSent(log, BOB.id, 'Ты уже не в комнате');
		assertNotSent(log, ALICE.id, 'вышел');
		assertNotSent(log, CAROL.id, 'вышел');
		assertRoomPlayers(room.id, [ALICE.id, CAROL.id]);
	});

	await runCase('Allows a member to leave room and notifies remaining players', async () => {
		const room = await setupRoomWithPlayers([BOB, CAROL], handlers);

		await handlers.leaveRoomCallbackHandler(makeCallbackCtx(BOB, { module: 'room', action: 'leave', meta: room.id }));
		const log = getLog();

		assertSent(log, BOB.id, `Ты вышел из комнаты ${room.name}`);
		assertSent(log, BOB.id, 'Вот список твоих комнат');
		assertSent(log, ALICE.id, 'вышел');
		assertSent(log, CAROL.id, 'вышел');
		assertRoomPlayers(room.id, [ALICE.id, CAROL.id]);
	});

	await runCase('Changes join code and accepts only the new one', async () => {
		const room = await setupRoomWithPlayers([CAROL], handlers);
		const oldCode = room.settings.joinCode;

		await SettingsHandlers.start(makeCallbackCtx(ALICE, { module: 'room', action: 'settings', meta: room.id }));
		let log = getLog();
		assertSent(log, ALICE.id, 'Код подключения');
		assertSent(log, ALICE.id, 'Количество колод');
		resetLog();

		await SettingsHandlers.changeJoinCode(makeCallbackCtx(ALICE, { module: 'room', action: 'cjc', meta: room.id }));
		log = getLog();
		assertSent(log, ALICE.id, 'Выбери что хочешь изменить');
		const roomAfterCodeChange = ORM.Rooms.getById(room.id);
		assert(roomAfterCodeChange.settings.joinCode !== oldCode, 'Join code should change');
		resetLog();

		await startJoinRoomFlow(EVE, handlers);
		await handlers.joinRoomCodeMessageHandler(makeMessageCtx(EVE, oldCode));
		log = getLog();
		assertSent(log, EVE.id, 'Неправильный код подключения');
		assert(STATES.getState(EVE.id) === undefined, 'Eve state should be cleared after wrong join code');
		resetLog();

		await joinRoomSuccessfully(EVE, room.id, handlers);
		assertRoomPlayers(room.id, [ALICE.id, CAROL.id, EVE.id]);
	});

	await runCase('Validates decks count changes in room settings', async () => {
		const room = await setupRoomWithPlayers([], handlers);

		await SettingsHandlers.changeDecksCount(makeCallbackCtx(ALICE, { module: 'room', action: 'cdc', meta: room.id }));
		let log = getLog();
		assertSent(log, ALICE.id, 'Напиши новое количество колод');
		assert(STATES.getState(ALICE.id) === 'ROOM_CDC', 'Alice state should be ROOM_CDC after opening decks count change');
		resetLog();

		await SettingsHandlers.changeDecksCountMessage(makeMessageCtx(ALICE, '101'));
		log = getLog();
		assertSent(log, ALICE.id, 'Количество колод должно быть целым числом в диапазоне от 1 до 100');
		assert(STATES.getState(ALICE.id) === 'ROOM_CDC', 'Alice state should stay ROOM_CDC after invalid decks count');
		assert(ORM.Rooms.getById(room.id).settings.decksCount === 4, 'Invalid decks count should not change room settings');
		resetLog();

		await SettingsHandlers.changeDecksCountMessage(makeMessageCtx(ALICE, '7'));
		log = getLog();
		assertSent(log, ALICE.id, 'Количество колод: 7');
		assert(STATES.getState(ALICE.id) === undefined, 'Alice state should be cleared after valid decks count');
		assert(ORM.Rooms.getById(room.id).settings.decksCount === 7, 'Valid decks count should update room settings');
	});

	await runCase('Shows start-game error when there are fewer than three players', async () => {
		const room = await setupRoomWithPlayers([BOB], handlers);

		await handlers.gameStartCallbackHandler(makeCallbackCtx(ALICE, { module: 'room', action: 'start', meta: room.id }));
		const log = getLog();

		assertSent(log, ALICE.id, 'Чтобы начать игру, необходимо как минимум 3 игрока');
		assert(DB.data.games.length === 0, 'Game should not start with fewer than three players');
	});
}
