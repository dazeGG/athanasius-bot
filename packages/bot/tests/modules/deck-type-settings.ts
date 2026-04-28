/**
 * deck-type-settings.ts — room settings: deck type selection (36/52/54) via SettingsHandlers.
 */
import { describe, it } from 'vitest';
import { ORM } from '../../src/db';

import { SESSIONS, resetLog, getLog, clearDB, seedDB, withCallbackMethods } from '../bootstrap';
import { assert, assertSent, assertNotSent, assertKeyboardButton } from '../runner';
import type { CallbackData } from '../../src/core';

const PLAYERS = [
	{ id: 2001, username: 'owner_sim', name: 'Ольга' },
	{ id: 2002, username: 'member_sim', name: 'Максим' },
] as const;

const [OWNER, MEMBER] = PLAYERS;

const makeCallbackCtx = (player: typeof PLAYERS[number], data: CallbackData, messageId = 1) =>
	withCallbackMethods({
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
			data: `${data.module}:${data.action ?? ''}:${data.meta ?? ''}`,
		},
	});

const resetDeckTypeCase = async (): Promise<void> => {
	resetLog();
	await clearDB();
	PLAYERS.forEach(p => SESSIONS.clear(p.id));
};

const seedRoomWithMembers = async () => {
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
				id: 'room-dt',
				name: 'Комната типа колоды',
				owner: OWNER.id,
				players: [OWNER.id, MEMBER.id],
				settings: {
					joinCode: 'TEST-DT',
					deckType: 52 as 52 | 36 | 54,
					decksCount: 1,
					towHands: false,
					allowMailing: false,
				},
			},
		],
		games: [],
	});
	resetLog();
};

describe('deckTypeSettingsModule', async () => {
	const { SettingsHandlers } = await import('../../src/modules/rooms/settings.handlers');

	it('Settings screen includes "Тип колоды" button', async () => {
		await resetDeckTypeCase();
		await seedRoomWithMembers();

		await SettingsHandlers.start(makeCallbackCtx(OWNER, { module: 'room', action: 'settings', meta: 'room-dt' }));
		const log = getLog();
		assertSent(log, OWNER.id, 'Тип колоды');
	});

	it('Opening changeDeckType without a value shows the selection keyboard', async () => {
		await resetDeckTypeCase();
		await seedRoomWithMembers();

		await SettingsHandlers.changeDeckType(makeCallbackCtx(OWNER, { module: 'room', action: 'cdt', meta: 'room-dt' }));
		const log = getLog();
		assertSent(log, OWNER.id, '36 карт');
		assertSent(log, OWNER.id, '52 карты');
		assertSent(log, OWNER.id, '54 карты (с джокерами)');
		assertSent(log, OWNER.id, 'Выбери тип колоды');
		assertKeyboardButton(log, OWNER.id, '36 карт', 'room:cdt:room-dt:36');
		assertKeyboardButton(log, OWNER.id, '✅ 52 карты', 'room:cdt:room-dt:52');
		assertKeyboardButton(log, OWNER.id, '54 карты (с джокерами)', 'room:cdt:room-dt:54');
	});

	it('Currently selected deck type shows a checkmark in the selection keyboard', async () => {
		await resetDeckTypeCase();
		await seedRoomWithMembers();

		await SettingsHandlers.changeDeckType(makeCallbackCtx(OWNER, { module: 'room', action: 'cdt', meta: 'room-dt' }));
		const log = getLog();
		assertSent(log, OWNER.id, '✅ 52 карты');
		assertNotSent(log, OWNER.id, '✅ 36 карт');
		assertNotSent(log, OWNER.id, '✅ 54 карты');
		assertKeyboardButton(log, OWNER.id, '✅ 52 карты', 'room:cdt:room-dt:52');
	});

	it('Changing deck type to 36 persists the new setting', async () => {
		await resetDeckTypeCase();
		await seedRoomWithMembers();

		await SettingsHandlers.changeDeckType(makeCallbackCtx(OWNER, { module: 'room', action: 'cdt', meta: 'room-dt:36' }));
		const room = ORM.Rooms.getById('room-dt');
		assert(room.settings.deckType === 36, `deckType should be 36, got ${room.settings.deckType}`);
	});

	it('Changing deck type to 54 persists the new setting', async () => {
		await resetDeckTypeCase();
		await seedRoomWithMembers();

		await SettingsHandlers.changeDeckType(makeCallbackCtx(OWNER, { module: 'room', action: 'cdt', meta: 'room-dt:54' }));
		const room = ORM.Rooms.getById('room-dt');
		assert(room.settings.deckType === 54, `deckType should be 54, got ${room.settings.deckType}`);
	});

	it('Changing deck type to 52 persists the new setting', async () => {
		await resetDeckTypeCase();
		await seedRoomWithMembers();

		// First change to 36, then back to 52
		await SettingsHandlers.changeDeckType(makeCallbackCtx(OWNER, { module: 'room', action: 'cdt', meta: 'room-dt:36' }));
		resetLog();
		await SettingsHandlers.changeDeckType(makeCallbackCtx(OWNER, { module: 'room', action: 'cdt', meta: 'room-dt:52' }));
		const room = ORM.Rooms.getById('room-dt');
		assert(room.settings.deckType === 52, `deckType should be 52, got ${room.settings.deckType}`);
	});

	it('After changing deck type the settings screen reflects the new value', async () => {
		await resetDeckTypeCase();
		await seedRoomWithMembers();

		await SettingsHandlers.changeDeckType(makeCallbackCtx(OWNER, { module: 'room', action: 'cdt', meta: 'room-dt:36' }));
		const log = getLog();
		assertSent(log, OWNER.id, '36 карт');
	});

	it('Room base text shows "36 карт" label for 36-deck rooms', async () => {
		await resetDeckTypeCase();
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
					id: 'room-36',
					name: 'Комната 36',
					owner: OWNER.id,
					players: [OWNER.id],
					settings: {
						joinCode: 'TEST-36',
						deckType: 36 as 52 | 36 | 54,
						decksCount: 1,
						towHands: false,
						allowMailing: false,
					},
				},
			],
			games: [],
		});
		resetLog();

		await SettingsHandlers.start(makeCallbackCtx(OWNER, { module: 'room', action: 'settings', meta: 'room-36' }));
		const log = getLog();
		assertSent(log, OWNER.id, '36 карт');
	});

	it('Room base text shows "54 карты" label for 54-deck rooms', async () => {
		await resetDeckTypeCase();
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
					id: 'room-54',
					name: 'Комната 54',
					owner: OWNER.id,
					players: [OWNER.id],
					settings: {
						joinCode: 'TEST-54',
						deckType: 54 as 52 | 36 | 54,
						decksCount: 1,
						towHands: false,
						allowMailing: false,
					},
				},
			],
			games: [],
		});
		resetLog();

		await SettingsHandlers.start(makeCallbackCtx(OWNER, { module: 'room', action: 'settings', meta: 'room-54' }));
		const log = getLog();
		assertSent(log, OWNER.id, '54 карты');
	});

	it('Non-owner cannot change the deck type', async () => {
		await resetDeckTypeCase();
		await seedRoomWithMembers();

		const roomBefore = ORM.Rooms.getById('room-dt');
		const deckTypeBefore = roomBefore.settings.deckType;

		await SettingsHandlers.changeDeckType(makeCallbackCtx(MEMBER, { module: 'room', action: 'cdt', meta: 'room-dt:36' }));
		const log = getLog();
		const roomAfter = ORM.Rooms.getById('room-dt');

		assertSent(log, MEMBER.id, 'Только владелец');
		assert(roomAfter.settings.deckType === deckTypeBefore, 'Non-owner must not change deck type');
	});

	it('Selection keyboard marks 36 as selected after room is set to 36', async () => {
		await resetDeckTypeCase();
		await seedRoomWithMembers();

		await SettingsHandlers.changeDeckType(makeCallbackCtx(OWNER, { module: 'room', action: 'cdt', meta: 'room-dt:36' }));
		resetLog();

		await SettingsHandlers.changeDeckType(makeCallbackCtx(OWNER, { module: 'room', action: 'cdt', meta: 'room-dt' }));
		const log = getLog();
		assertSent(log, OWNER.id, '✅ 36 карт');
		assertNotSent(log, OWNER.id, '✅ 52 карты');
		assertKeyboardButton(log, OWNER.id, '✅ 36 карт', 'room:cdt:room-dt:36');
		assertKeyboardButton(log, OWNER.id, '52 карты', 'room:cdt:room-dt:52');
	});
});
