/**
 * rooms.ts — room creation, joining, settings, and membership flows split into explicit cases.
 */

import { describe, it } from 'vitest';
import type { CallbackData } from '../../src/core';
import { ORM, DB } from '../../src/db';
import { txt as roomTxt } from '../../src/modules/rooms/ui';
import { escapeHtml } from '../../src/shared/lib';
import { txt as gameTxt } from '../../src/shared/ui/game';
import type {
	createRoomCallbackHandler,
	createRoomNameMessageHandler,
	joinRoomCallbackHandler,
	joinRoomCodeMessageHandler,
} from '../../src/modules/rooms/handlers';

import { SESSIONS, resetLog, getLog, clearDB, seedDB, withCallbackMethods, withMessageMethods } from '../bootstrap';
import { assert, assertDeleted, assertKeyboardButton, assertSent, assertNotSent } from '../runner';

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

const makeCallbackCtx = (
	player: PlayerFixture,
	data: CallbackData,
	messageId = 1,
) => withCallbackMethods({
	chat: { id: player.id, type: 'private' as const },
	from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
	callbackData: data,
	callbackQuery: {
		id: `cb-${player.id}`,
		from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
		message: {
			message_id: messageId,
			chat: { id: player.id, type: 'private' as const },
			date: Math.floor(Date.now() / 1000),
		},
		chat_instance: '',
		data: `${data.module}:${data.back ? 'back' : (data.action ?? '')}:${data.meta ?? ''}`,
	},
});

type RoomsHandlersModule = {
	createRoomCallbackHandler: typeof createRoomCallbackHandler;
	createRoomNameMessageHandler: typeof createRoomNameMessageHandler;
	joinRoomCallbackHandler: typeof joinRoomCallbackHandler;
	joinRoomCodeMessageHandler: typeof joinRoomCodeMessageHandler;
};

interface ActiveRoomOptions {
	allowMailing?: boolean;
	mailedThisTurn?: number[];
	players?: readonly PlayerFixture[];
	roomName?: string;
}

const resetRoomsCase = async (): Promise<void> => {
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

const assertExactlyOnePlayerReceived = (
	log: ReturnType<typeof getLog>,
	playerIds: readonly number[],
	text: string,
): number => {
	const matchedPlayerIds = playerIds.filter(playerId => {
		return log.some(message => message.to === playerId && message.type !== 'delete' && message.text.includes(text));
	});

	assert(
		matchedPlayerIds.length === 1,
		`Exactly one player should receive "${text}", but got ${matchedPlayerIds.join(', ') || 'nobody'}`,
	);

	return matchedPlayerIds[0]!;
};

const startCreateRoomFlow = async (
	owner: PlayerFixture,
	handlers: RoomsHandlersModule,
): Promise<void> => {
	await handlers.createRoomCallbackHandler(makeCallbackCtx(owner, { module: 'rooms', action: 'create' }));

	const log = getLog();
	assertSent(log, owner.id, 'Напиши название комнаты');
	assert(SESSIONS.get(owner.id).flow.name === 'ROOMS_CREATE', `${owner.name}: state should be ROOMS_CREATE`);
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
	assertSent(log, owner.id, escapeHtml(roomName));
	assertSent(log, owner.id, 'Вот список твоих комнат');
	assertSent(log, owner.id, roomName);
	assert(SESSIONS.get(owner.id).flow.name === undefined, `${owner.name}: state should be cleared after room creation`);

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
	assert(SESSIONS.get(player.id).flow.name === 'ROOMS_JOIN', `${player.name}: state should be ROOMS_JOIN`);
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
	assertSent(log, player.id, `Ты зашел в комнату ${escapeHtml(roomName)}`);
	assertSent(log, player.id, 'Вот список твоих комнат');
	assert(SESSIONS.get(player.id).flow.name === undefined, `${player.name}: state should be cleared after successful join`);
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

const seedActiveRoom = async ({
	allowMailing = true,
	mailedThisTurn,
	players = [ALICE, BOB, CAROL],
	roomName = DEFAULT_ROOM_NAME,
}: ActiveRoomOptions = {}) => {
	await resetRoomsCase();
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
		rooms: [
			{
				id: 'room-mailing',
				name: roomName,
				owner: ALICE.id,
				players: players.map(player => player.id),
				settings: {
					joinCode: 'MAIL-TEST',
					deckType: 52 as const,
					decksCount: 1,
					towHands: false,
					allowMailing,
				},
			},
		],
		games: [
			{
				id: 'game-mailing',
				roomId: 'room-mailing',
				name: roomName,
				started: Date.now(),
				players: players.map(player => player.id),
				hands: Object.fromEntries(players.map((player, index) => [player.id, [index + 1]])),
				athanasiuses: Object.fromEntries(players.map(player => [player.id, []])),
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

	return ORM.Rooms.getById('room-mailing');
};

const { SettingsHandlers } = await import('../../src/modules/rooms/settings.handlers');

describe('rooms', async () => {
	const handlers = await import('../../src/modules/rooms/handlers');
	it('Shows empty rooms view with default actions', async () => {
		await resetRoomsCase();
		await seedRegisteredUsers();

		await handlers.roomsMessageHandler(makeMessageCtx(ALICE, 'Комнаты'));

		const log = getLog();
		assertDeleted(log, ALICE.id, 1);
		assertSent(log, ALICE.id, 'У тебя пока нет комнат');
		assertSent(log, ALICE.id, 'Зайти по коду · Создать комнату');
	});

	it('Shows existing rooms list with room buttons', async () => {
		const room = await setupRoomWithPlayers([BOB], handlers);

		await handlers.roomsMessageHandler(makeMessageCtx(BOB, 'Комнаты'));

		const log = getLog();
		assertDeleted(log, BOB.id, 1);
		assertSent(log, BOB.id, 'Вот список твоих комнат');
		assertSent(log, BOB.id, room.name);
		assertSent(log, BOB.id, 'Зайти по коду · Создать комнату');
	});

	it('Creates a room from callback and name input', async () => {
		await resetRoomsCase();
		await seedRegisteredUsers();

		const room = await createRoom(ALICE, handlers);
		assert(room.settings.decksCount === 4, 'New room should start with 4 decks');
	});

	it('Escapes unsafe room names in room headers, confirmations, and join mailings', async () => {
		await resetRoomsCase();
		await seedRegisteredUsers();

		const unsafeRoomName = '<b>Зал & Co</b>';
		const escapedRoomName = '&lt;b&gt;Зал &amp; Co&lt;/b&gt;';
		const room = await createRoom(ALICE, handlers, unsafeRoomName);

		await handlers.openRoomCallbackHandler(makeCallbackCtx(ALICE, { module: 'rooms', action: 'open', meta: room.id }));
		let log = getLog();
		assertSent(log, ALICE.id, `Комната ${escapedRoomName}`);
		resetLog();

		await startJoinRoomFlow(BOB, handlers);
		await handlers.joinRoomCodeMessageHandler(makeMessageCtx(BOB, room.settings.joinCode));
		log = getLog();

		assertSent(log, BOB.id, `Ты зашел в комнату ${escapedRoomName}`);
		assertSent(log, ALICE.id, `Комната ${escapedRoomName} | Борис зашел`);
		assertRoomPlayers(room.id, [ALICE.id, BOB.id]);
	});

	it('Rejects duplicate room name and keeps creation state', async () => {
		await resetRoomsCase();
		await seedRegisteredUsers();
		await createRoom(ALICE, handlers);

		await startCreateRoomFlow(ALICE, handlers);
		await handlers.createRoomNameMessageHandler(makeMessageCtx(ALICE, DEFAULT_ROOM_NAME));

		const log = getLog();
		assertSent(log, ALICE.id, 'Комната Комната Алисы уже есть');
		assert(SESSIONS.get(ALICE.id).flow.name === 'ROOMS_CREATE', 'Alice should stay in ROOMS_CREATE after duplicate room name');
		assert(ORM.Rooms.getAll().filter(room => room.name === DEFAULT_ROOM_NAME).length === 1, 'Only one room with duplicate name should exist');
	});

	it('Rejects wrong join code and clears join state', async () => {
		await resetRoomsCase();
		await seedRegisteredUsers();
		await createRoom(ALICE, handlers);

		await startJoinRoomFlow(BOB, handlers);
		await handlers.joinRoomCodeMessageHandler(makeMessageCtx(BOB, 'XXXX-XXXX'));

		const log = getLog();
		assertSent(log, BOB.id, 'Неправильный код подключения');
		assertSent(log, BOB.id, 'Вот список твоих комнат');
		assert(SESSIONS.get(BOB.id).flow.name === undefined, 'Bob state should be cleared after wrong code');
		assert(ORM.Rooms.getAll()[0].players.length === 1, 'Wrong code should not change room players');
	});

	it('Allows joining by code and notifies existing players', async () => {
		const room = await setupRoomWithPlayers([BOB], handlers);
		assertRoomPlayers(room.id, [ALICE.id, BOB.id]);
	});

	it('Rejects joining the same room twice', async () => {
		const room = await setupRoomWithPlayers([BOB], handlers);

		await startJoinRoomFlow(BOB, handlers);
		await handlers.joinRoomCodeMessageHandler(makeMessageCtx(BOB, room.settings.joinCode));

		const log = getLog();
		assertSent(log, BOB.id, `Ты уже в комнате ${room.name}`);
		assert(SESSIONS.get(BOB.id).flow.name === undefined, 'Bob state should be cleared after duplicate join');
		assertRoomPlayers(room.id, [ALICE.id, BOB.id]);
	});

	it('Shows different room controls for owner and member', async () => {
		const room = await setupRoomWithPlayers([BOB, CAROL], handlers);

		await handlers.openRoomCallbackHandler(makeCallbackCtx(ALICE, { module: 'rooms', action: 'open', meta: room.id }));
		let log = getLog();
		assertSent(log, ALICE.id, 'Комната Алисы');
		assertSent(log, ALICE.id, 'Код подключения');
		assertSent(log, ALICE.id, 'Алиса');
		assertSent(log, ALICE.id, 'Борис');
		assertSent(log, ALICE.id, 'Каролина');
		assertSent(log, ALICE.id, 'Выгнать игроков · Начать игру · Удалить комнату · Назад');
		assertNotSent(log, ALICE.id, 'Выйти');
		resetLog();

		await handlers.openRoomCallbackHandler(makeCallbackCtx(BOB, { module: 'rooms', action: 'open', meta: room.id }));
		log = getLog();
		assertSent(log, BOB.id, 'Комната Алисы');
		assertSent(log, BOB.id, 'Выйти · Назад');
		assertNotSent(log, BOB.id, 'Выгнать игроков');
		assertNotSent(log, BOB.id, 'Начать игру');
	});

	it('Supports back navigation to rooms list and room details', async () => {
		const room = await setupRoomWithPlayers([BOB, CAROL], handlers);

		await handlers.backCallbackHandler(makeCallbackCtx(ALICE, { module: 'rooms', back: true, meta: 'list' }));
		let log = getLog();
		assertSent(log, ALICE.id, 'Вот список твоих комнат');
		assertSent(log, ALICE.id, room.name);
		resetLog();

		await handlers.backCallbackHandler(makeCallbackCtx(ALICE, { module: 'rooms', back: true, meta: `room:${room.id}` }));
		log = getLog();
		assertSent(log, ALICE.id, 'Комната Алисы');
		assertSent(log, ALICE.id, 'Код подключения');
		assertSent(log, ALICE.id, 'Выгнать игроков · Начать игру · Удалить комнату · Назад');
	});

	it('Blocks stale room access for non-members', async () => {
		const room = await setupRoomWithPlayers([BOB], handlers);

		await handlers.openRoomCallbackHandler(makeCallbackCtx(DAVE, { module: 'rooms', action: 'open', meta: room.id }));
		let log = getLog();
		assertSent(log, DAVE.id, `Ты не в комнате ${room.name}`);
		assertNotSent(log, DAVE.id, 'Код подключения');
		resetLog();

		await handlers.backCallbackHandler(makeCallbackCtx(DAVE, { module: 'rooms', back: true, meta: `room:${room.id}` }));
		log = getLog();
		assertSent(log, DAVE.id, `Ты не в комнате ${room.name}`);
		assertNotSent(log, DAVE.id, 'Код подключения');
		assertRoomPlayers(room.id, [ALICE.id, BOB.id]);
	});

	it('Allows owner to kick a player and ignores stale leave callback safely', async () => {
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

	it('Protects kick flow from stale player callbacks', async () => {
		const room = await setupRoomWithPlayers([BOB, CAROL], handlers);

		await handlers.kickCallbackHandler(makeCallbackCtx(ALICE, { module: 'room', action: 'kick', meta: `${room.id}:${BOB.id}` }));
		resetLog();

		await handlers.kickCallbackHandler(makeCallbackCtx(ALICE, { module: 'room', action: 'kick', meta: `${room.id}:${BOB.id}` }));
		const log = getLog();

		assertSent(log, ALICE.id, `Игрока уже нет в комнате ${room.name}`);
		assertSent(log, ALICE.id, 'Выбери кого хочешь выгнать');
		assertRoomPlayers(room.id, [ALICE.id, CAROL.id]);
	});

	it('Prevents non-owners from kicking players', async () => {
		const room = await setupRoomWithPlayers([BOB, CAROL], handlers);

		await handlers.kickCallbackHandler(makeCallbackCtx(BOB, { module: 'room', action: 'kick', meta: `${room.id}:` }));
		const log = getLog();

		assertSent(log, BOB.id, roomTxt.ownerOnly);
		assertNotSent(log, BOB.id, 'Выбери кого хочешь выгнать');
		assertRoomPlayers(room.id, [ALICE.id, BOB.id, CAROL.id]);
	});

	it('Allows a member to leave room and notifies remaining players', async () => {
		const room = await setupRoomWithPlayers([BOB, CAROL], handlers);

		await handlers.leaveRoomCallbackHandler(makeCallbackCtx(BOB, { module: 'room', action: 'leave', meta: room.id }));
		const log = getLog();

		assertSent(log, BOB.id, `Ты вышел из комнаты ${room.name}`);
		assertSent(log, BOB.id, 'Вот список твоих комнат');
		assertSent(log, ALICE.id, 'вышел');
		assertSent(log, CAROL.id, 'вышел');
		assertRoomPlayers(room.id, [ALICE.id, CAROL.id]);
	});

	it('Prevents the owner from leaving or being kicked', async () => {
		const room = await setupRoomWithPlayers([BOB, CAROL], handlers);

		await handlers.leaveRoomCallbackHandler(makeCallbackCtx(ALICE, { module: 'room', action: 'leave', meta: room.id }));
		let log = getLog();
		assertSent(log, ALICE.id, roomTxt.ownerCannotLeave);
		assertRoomPlayers(room.id, [ALICE.id, BOB.id, CAROL.id]);
		resetLog();

		await handlers.kickCallbackHandler(makeCallbackCtx(ALICE, { module: 'room', action: 'kick', meta: `${room.id}:${ALICE.id}` }));
		log = getLog();
		assertSent(log, ALICE.id, roomTxt.cannotKickOwner);
		assertRoomPlayers(room.id, [ALICE.id, BOB.id, CAROL.id]);
	});

	it('Changes join code and accepts only the new one', async () => {
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
		assert(SESSIONS.get(EVE.id).flow.name === undefined, 'Eve state should be cleared after wrong join code');
		resetLog();

		await joinRoomSuccessfully(EVE, room.id, handlers);
		assertRoomPlayers(room.id, [ALICE.id, CAROL.id, EVE.id]);
	});

	it('Prevents non-owners from changing room settings', async () => {
		const room = await setupRoomWithPlayers([BOB], handlers);
		const oldJoinCode = room.settings.joinCode;

		await SettingsHandlers.start(makeCallbackCtx(BOB, { module: 'room', action: 'settings', meta: room.id }));
		let log = getLog();
		assertSent(log, BOB.id, roomTxt.ownerOnly);
		assertNotSent(log, BOB.id, 'Выбери что хочешь изменить');
		resetLog();

		await SettingsHandlers.changeJoinCode(makeCallbackCtx(BOB, { module: 'room', action: 'cjc', meta: room.id }));
		log = getLog();
		assertSent(log, BOB.id, roomTxt.ownerOnly);
		assert(ORM.Rooms.getById(room.id).settings.joinCode === oldJoinCode, 'Member should not be able to change join code');
		resetLog();

		await SettingsHandlers.changeDecksCount(makeCallbackCtx(BOB, { module: 'room', action: 'cdc', meta: room.id }));
		log = getLog();
		assertSent(log, BOB.id, roomTxt.ownerOnly);
		assert(SESSIONS.get(BOB.id).flow.name === undefined, 'Member should not enter ROOM_CDC state');
		assert(ORM.Rooms.getById(room.id).settings.decksCount === 4, 'Member should not be able to change decks count');
	});

	it('Settings screen exposes the per-turn mailing toggle state', async () => {
		const room = await setupRoomWithPlayers([BOB], handlers);

		await SettingsHandlers.start(makeCallbackCtx(ALICE, { module: 'room', action: 'settings', meta: room.id }));
		const log = getLog();

		assertSent(log, ALICE.id, 'Сообщения в ход: выкл');
		assertKeyboardButton(log, ALICE.id, 'Сообщения в ход: ❌', `room:cam:${room.id}`);
	});

	it('Owner can toggle per-turn mailing on and off before a game starts', async () => {
		const room = await setupRoomWithPlayers([BOB], handlers);

		await SettingsHandlers.toggleAllowMailing(makeCallbackCtx(ALICE, { module: 'room', action: 'cam', meta: room.id }));
		let log = getLog();
		let updatedRoom = ORM.Rooms.getById(room.id);

		assert(updatedRoom.settings.allowMailing, 'allowMailing should turn on after owner toggle');
		assertSent(log, ALICE.id, 'Сообщения в ход: вкл');
		assertKeyboardButton(log, ALICE.id, 'Сообщения в ход: ✅', `room:cam:${room.id}`);
		resetLog();

		await SettingsHandlers.toggleAllowMailing(makeCallbackCtx(ALICE, { module: 'room', action: 'cam', meta: room.id }));
		log = getLog();
		updatedRoom = ORM.Rooms.getById(room.id);

		assert(!updatedRoom.settings.allowMailing, 'allowMailing should turn off after a second owner toggle');
		assertSent(log, ALICE.id, 'Сообщения в ход: выкл');
		assertKeyboardButton(log, ALICE.id, 'Сообщения в ход: ❌', `room:cam:${room.id}`);
	});

	it('Non-owners cannot toggle per-turn mailing', async () => {
		const room = await setupRoomWithPlayers([BOB], handlers);

		await SettingsHandlers.toggleAllowMailing(makeCallbackCtx(BOB, { module: 'room', action: 'cam', meta: room.id }));
		const log = getLog();

		assertSent(log, BOB.id, roomTxt.ownerOnly);
		assert(!ORM.Rooms.getById(room.id).settings.allowMailing, 'Member should not be able to enable allowMailing');
	});

	it('Room settings callbacks are blocked after the game has started', async () => {
		const room = await seedActiveRoom({ allowMailing: false });
		const oldJoinCode = room.settings.joinCode;

		await SettingsHandlers.start(makeCallbackCtx(ALICE, { module: 'room', action: 'settings', meta: room.id }));
		assertDeleted(getLog(), ALICE.id, 1);
		assertNotSent(getLog(), ALICE.id, 'Выбери что хочешь изменить');
		resetLog();

		await SettingsHandlers.changeJoinCode(makeCallbackCtx(ALICE, { module: 'room', action: 'cjc', meta: room.id }));
		assertDeleted(getLog(), ALICE.id, 1);
		assert(ORM.Rooms.getById(room.id).settings.joinCode === oldJoinCode, 'Join code should stay unchanged during an active game');
		resetLog();

		await SettingsHandlers.changeDecksCount(makeCallbackCtx(ALICE, { module: 'room', action: 'cdc', meta: room.id }));
		assertDeleted(getLog(), ALICE.id, 1);
		assert(SESSIONS.get(ALICE.id).flow.name !== 'ROOM_CDC', 'Deck count flow should not open during an active game');
		resetLog();

		await SettingsHandlers.changeDeckType(makeCallbackCtx(ALICE, { module: 'room', action: 'cdt', meta: `${room.id}:36` }));
		assertDeleted(getLog(), ALICE.id, 1);
		assert(ORM.Rooms.getById(room.id).settings.deckType === 52, 'Deck type should stay unchanged during an active game');
		resetLog();

		await SettingsHandlers.toggleAllowMailing(makeCallbackCtx(ALICE, { module: 'room', action: 'cam', meta: room.id }));
		assertDeleted(getLog(), ALICE.id, 1);
		assert(!ORM.Rooms.getById(room.id).settings.allowMailing, 'allowMailing should stay unchanged during an active game');
	});

	it('Validates decks count changes in room settings', async () => {
		const room = await setupRoomWithPlayers([], handlers);

		await SettingsHandlers.changeDecksCount(makeCallbackCtx(ALICE, { module: 'room', action: 'cdc', meta: room.id }));
		let log = getLog();
		assertSent(log, ALICE.id, 'Напиши новое количество колод');
		assert(SESSIONS.get(ALICE.id).flow.name === 'ROOM_CDC', 'Alice state should be ROOM_CDC after opening decks count change');
		const flow = SESSIONS.get(ALICE.id).flow;
		assert(
			flow.name === 'ROOM_CDC' && flow.roomId === room.id,
			'Deck count flow should persist the room id in state context',
		);
		resetLog();

		await SettingsHandlers.changeDecksCountMessage(makeMessageCtx(ALICE, '101'));
		log = getLog();
		assertSent(log, ALICE.id, 'Количество колод должно быть целым числом в диапазоне от 1 до 100');
		assert(SESSIONS.get(ALICE.id).flow.name === 'ROOM_CDC', 'Alice state should stay ROOM_CDC after invalid decks count');
		assert(ORM.Rooms.getById(room.id).settings.decksCount === 4, 'Invalid decks count should not change room settings');
		resetLog();

		await SettingsHandlers.changeDecksCountMessage(makeMessageCtx(ALICE, '7'));
		log = getLog();
		assertSent(log, ALICE.id, 'Количество колод: 7');
		assert(SESSIONS.get(ALICE.id).flow.name === undefined, 'Alice state should be cleared after valid decks count');
		assert(!('roomId' in SESSIONS.get(ALICE.id).flow), 'Alice context should be cleared after valid decks count');
		assert(ORM.Rooms.getById(room.id).settings.decksCount === 7, 'Valid decks count should update room settings');
	});

	it('Rejects fractional decks count values', async () => {
		const room = await setupRoomWithPlayers([], handlers);

		await SettingsHandlers.changeDecksCount(makeCallbackCtx(ALICE, { module: 'room', action: 'cdc', meta: room.id }));
		resetLog();

		await SettingsHandlers.changeDecksCountMessage(makeMessageCtx(ALICE, '7.5'));
		const log = getLog();

		assertSent(log, ALICE.id, 'Количество колод должно быть целым числом в диапазоне от 1 до 100');
		assert(SESSIONS.get(ALICE.id).flow.name === 'ROOM_CDC', 'Alice state should stay ROOM_CDC after fractional decks count');
		assert(ORM.Rooms.getById(room.id).settings.decksCount === 4, 'Fractional decks count should not change room settings');
	});

	it('Shows start-game error when there are fewer than three players', async () => {
		const room = await setupRoomWithPlayers([BOB], handlers);

		await handlers.gameStartCallbackHandler(makeCallbackCtx(ALICE, { module: 'room', action: 'start', meta: room.id }));
		const log = getLog();

		assertSent(log, ALICE.id, 'Чтобы начать игру, необходимо как минимум 3 игрока');
		assert(DB.data.games.length === 0, 'Game should not start with fewer than three players');
	});

	it('Prevents non-owners from starting the game', async () => {
		const room = await setupRoomWithPlayers([BOB, CAROL], handlers);

		await handlers.gameStartCallbackHandler(makeCallbackCtx(BOB, { module: 'room', action: 'start', meta: room.id }));
		const log = getLog();

		assertSent(log, BOB.id, roomTxt.ownerOnly);
		assert(DB.data.games.length === 0, 'Member should not be able to start the game');
	});

	it('Starts a game with three players and sends initial messages', async () => {
		const room = await setupRoomWithPlayers([BOB, CAROL], handlers);

		await handlers.gameStartCallbackHandler(makeCallbackCtx(ALICE, { module: 'room', action: 'start', meta: room.id }));
		const log = getLog();

		assertDeleted(log, ALICE.id, 1);
		assert(DB.data.games.length === 1, 'Game should be created for a room with three players');
		assert(DB.data.games[0]!.roomId === room.id, 'Created game should belong to the started room');
		[ALICE, BOB, CAROL].forEach(player => {
			assertSent(log, player.id, gameTxt.gameStarted);
		});
		assertExactlyOnePlayerReceived(log, [ALICE.id, BOB.id, CAROL.id], gameTxt.firstTurnMessage);
	});

	it('Allows room members to inspect ongoing game info', async () => {
		const room = await setupRoomWithPlayers([BOB, CAROL], handlers);
		await handlers.gameStartCallbackHandler(makeCallbackCtx(ALICE, { module: 'room', action: 'start', meta: room.id }));
		resetLog();

		await handlers.gameWhoseTurnCallbackHandler(makeCallbackCtx(BOB, { module: 'room', action: 'whoseturn', meta: room.id }));
		let log = getLog();
		assertSent(log, BOB.id, 'Сейчас ход');
		assertSent(log, BOB.id, 'Обновить · Назад');
		resetLog();

		await handlers.gameGetAthanasiusesCallbackHandler(makeCallbackCtx(CAROL, { module: 'room', action: 'getath', meta: room.id }));
		log = getLog();
		assertSent(log, CAROL.id, `Комната ${room.name}`);
		assertSent(log, CAROL.id, 'Обновить · Назад');
	});

	it('Active room keyboard shows the resend-turn-message button for the owner when a game is active', async () => {
		const room = await seedActiveRoom({ allowMailing: true });

		await handlers.openRoomCallbackHandler(makeCallbackCtx(ALICE, { module: 'rooms', action: 'open', meta: room.id }));
		const log = getLog();
		assertSent(log, ALICE.id, 'Сообщения в ход: вкл');
		assertKeyboardButton(log, ALICE.id, 'Отправить сообщение хода', `room:sendturnmsg:${room.id}`);
	});

	it('Active room keyboard does not show the resend-turn-message button to non-owners', async () => {
		const room = await seedActiveRoom({ allowMailing: true });

		await handlers.openRoomCallbackHandler(makeCallbackCtx(BOB, { module: 'rooms', action: 'open', meta: room.id }));
		const log = getLog();
		assertNotSent(log, BOB.id, 'Отправить сообщение хода');
	});

	it('Active room keyboard shows resend-turn-message button regardless of mailing setting', async () => {
		const room = await seedActiveRoom({ allowMailing: false });

		await handlers.openRoomCallbackHandler(makeCallbackCtx(ALICE, { module: 'rooms', action: 'open', meta: room.id }));
		const log = getLog();
		assertKeyboardButton(log, ALICE.id, 'Отправить сообщение хода', `room:sendturnmsg:${room.id}`);
	});

	it('gameSendTurnMessageCallbackHandler resends turn message to active player', async () => {
		const room = await setupRoomWithPlayers([BOB, CAROL], handlers);
		await handlers.gameStartCallbackHandler(makeCallbackCtx(ALICE, { module: 'room', action: 'start', meta: room.id }));
		resetLog();

		await handlers.gameSendTurnMessageCallbackHandler(makeCallbackCtx(ALICE, { module: 'room', action: 'sendturnmsg', meta: room.id }));
		const log = getLog();

		assertExactlyOnePlayerReceived(log, [ALICE.id, BOB.id, CAROL.id], gameTxt.turnMessage);
		assertSent(log, ALICE.id, gameTxt.gameMessageResendSuccess);
	});

	it('gameSendTurnMessageCallbackHandler silently rejects non-owners', async () => {
		const room = await seedActiveRoom({ allowMailing: true });

		await handlers.gameSendTurnMessageCallbackHandler(makeCallbackCtx(BOB, { module: 'room', action: 'sendturnmsg', meta: room.id }));
		const log = getLog();

		assertNotSent(log, BOB.id, gameTxt.gameMessageResendSuccess);
		assertNotSent(log, ALICE.id, gameTxt.firstTurnMessage);
		assertNotSent(log, BOB.id, gameTxt.firstTurnMessage);
	});

	it('gameSendTurnMessageCallbackHandler falls back gracefully when no active game', async () => {
		const room = await setupRoomWithPlayers([BOB, CAROL], handlers);

		await handlers.gameSendTurnMessageCallbackHandler(makeCallbackCtx(ALICE, { module: 'room', action: 'sendturnmsg', meta: room.id }));
		const log = getLog();

		assertSent(log, ALICE.id, `Комната ${room.name}`);
		assertKeyboardButton(log, ALICE.id, 'Начать игру', `room:start:${room.id}`);
		assertKeyboardButton(log, ALICE.id, 'Удалить комнату', `room:delete:${room.id}`);
		assertNotSent(log, ALICE.id, gameTxt.gameMessageResendSuccess);
	});

	it('Shows delete button for owner when no active game', async () => {
		const room = await setupRoomWithPlayers([BOB], handlers);

		await handlers.openRoomCallbackHandler(makeCallbackCtx(ALICE, { module: 'rooms', action: 'open', meta: room.id }));
		const log = getLog();

		assertSent(log, ALICE.id, 'Удалить комнату');
	});

	it('Does not show delete button for non-owner', async () => {
		const room = await setupRoomWithPlayers([BOB], handlers);

		await handlers.openRoomCallbackHandler(makeCallbackCtx(BOB, { module: 'rooms', action: 'open', meta: room.id }));
		const log = getLog();

		assertNotSent(log, BOB.id, 'Удалить комнату');
	});

	it('Does not show delete button for owner with active game', async () => {
		const room = await setupRoomWithPlayers([BOB, CAROL], handlers);
		await handlers.gameStartCallbackHandler(makeCallbackCtx(ALICE, { module: 'room', action: 'start', meta: room.id }));
		resetLog();

		await handlers.openRoomCallbackHandler(makeCallbackCtx(ALICE, { module: 'rooms', action: 'open', meta: room.id }));
		const log = getLog();

		assertNotSent(log, ALICE.id, 'Удалить комнату');
	});

	it('Owner deletes room, all members notified, room removed from DB', async () => {
		const room = await setupRoomWithPlayers([BOB, CAROL], handlers);

		await handlers.deleteRoomCallbackHandler(makeCallbackCtx(ALICE, { module: 'room', action: 'delete', meta: room.id }));
		const log = getLog();

		assert(ORM.Rooms.getAll().find(r => r.id === room.id) === undefined, 'Room should be removed from DB');
		assertSent(log, ALICE.id, 'Комната удалена');
		assertSent(log, BOB.id, `Комната ${room.name} была удалена`);
		assertSent(log, CAROL.id, `Комната ${room.name} была удалена`);
		assertNotSent(log, ALICE.id, `Комната ${room.name} была удалена`);
	});

	it('Prevents non-owner from deleting room', async () => {
		const room = await setupRoomWithPlayers([BOB], handlers);

		await handlers.deleteRoomCallbackHandler(makeCallbackCtx(BOB, { module: 'room', action: 'delete', meta: room.id }));
		const log = getLog();

		assertSent(log, BOB.id, roomTxt.ownerOnly);
		assert(ORM.Rooms.getAll().find(r => r.id === room.id) !== undefined, 'Room should not be deleted by non-owner');
	});

	it('Prevents deleting room with active game', async () => {
		const room = await setupRoomWithPlayers([BOB, CAROL], handlers);
		await handlers.gameStartCallbackHandler(makeCallbackCtx(ALICE, { module: 'room', action: 'start', meta: room.id }));
		resetLog();

		await handlers.deleteRoomCallbackHandler(makeCallbackCtx(ALICE, { module: 'room', action: 'delete', meta: room.id }));
		const log = getLog();

		assertSent(log, ALICE.id, 'Нельзя удалить комнату с активной игрой');
		assert(ORM.Rooms.getAll().find(r => r.id === room.id) !== undefined, 'Room with active game should not be deleted');
	});
});
