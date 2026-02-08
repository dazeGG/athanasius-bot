import { ORM } from '~/db';
import type { RawButtons } from '~/core';
import type { RoomSchema, UserId } from '~/db';

/* TEXTS */
export const txt = {
	noRooms: 'У тебя пока нет комнат',
	roomsList: 'Вот список твоих комнат',
	createdRoom: 'Создал комнату',
	kickPlayer: 'Выбери кого хочешь выгнать',
} as const;

/* KEYBOARDS */
export const kb: ModuleKeyboards = {
	default: [
		[{ text: 'Зайти по коду', callback_data: { module: 'rooms', action: 'join' } }],
		[{ text: 'Создать комнату', callback_data: { module: 'rooms', action: 'create' } }],
	],
} as const;

/* GENERABLE KEYBOARDS */
export const gkb = {
	roomsList: (rooms: RoomSchema[]): RawButtons => {
		return [
			...rooms.map(r => {
				return [{ text: r.name, callback_data: { module: 'rooms', action: 'open', meta: r.id } }];
			}),
			...kb.default,
		];
	},

	room: (myId: UserId, room: RoomSchema): RawButtons => {
		const kb = [];

		if (room.owner === myId) {
			kb.push([{ text: 'Настройки', callback_data: { module: 'room', action: 'settings', meta: room.id } }]);

			if (room.players.length > 1) {
				kb.push([{ text: 'Выгнать игроков', callback_data: { module: 'room', action: 'kick', meta: `${room.id}:` } }]);
			}

			if (room.players.length >= 2) {
				kb.push([{ text: 'Начать игру', callback_data: { module: 'room', action: 'start', meta: room.id } }]);
			}
		} else {
			kb.push([{ text: 'Выйти', callback_data: { module: 'room', action: 'leave', meta: room.id } }]);
		}

		kb.push([{ text: 'Назад', callback_data: { module: 'rooms', back: true, meta: 'list' } }]);

		return kb;
	},

	roomOngoing: (myId: UserId, room: RoomSchema): RawButtons => {
		const kb = [];

		// if (room.owner === myId) {
		// 	kb.push([{ text: 'Завершить игру', callback_data: { module: 'room', action: 'end', meta: room.id } }]);
		// }

		kb.push([
			{ text: 'Афанасии', callback_data: { module: 'room', action: 'getathanasiuses', meta: room.id } },
			{ text: 'Чей ход', callback_data: { module: 'room', action: 'whoseturn', meta: room.id } },
		]);

		kb.push([{ text: 'Назад', callback_data: { module: 'rooms', back: true, meta: 'list' } }]);

		return kb;
	},

	kickList: (myId: UserId, room: RoomSchema): RawButtons => {
		return [
			...room.players.filter(p => p !== myId).map(playerId => {
				return [{
					text: ORM.Users.get(playerId).name,
					callback_data: { module: 'room', action: 'kick', meta: `${room.id}:${playerId}` },
				}];
			}),
			[{ text: 'Назад', callback_data: { module: 'rooms', back: true, meta: `room:${room.id}` } }],
		];
	},

	settings: (room: RoomSchema): RawButtons => {
		return [
			[{ text: 'Код подключения', callback_data: { module: 'room', action: 'cjc', meta: room.id } }],
			[{ text: 'Количество колод', callback_data: { module: 'room', action: 'cdc', meta: room.id } }],
			[{ text: 'Назад', callback_data: { module: 'rooms', back: true, meta: `room:${room.id}` } }],
		];
	},
} as const;
