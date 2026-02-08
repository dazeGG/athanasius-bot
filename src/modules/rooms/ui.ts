import type { RawButtons } from '~/core';
import type { RoomSchema, UserId } from '~/db';

/* TEXTS */
export const txt = {
	noRooms: 'У тебя пока нет комнат',
	roomsList: 'Вот список твоих комнат',
	createdRoom: 'Создал комнату',
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

		if (room.leader === myId) {
			// TODO: Сделать настройку игры
			// kb.push([{ text: 'Настроить', callback_data: { module: 'room', action: 'settings' } }]);
			//
			if (room.players.length >= 3) {
				kb.push([{ text: 'Начать игру', callback_data: { module: 'room', action: 'start' } }]);
			}
		} else {
			kb.push([{ text: 'Выйти', callback_data: { module: 'room', action: 'leave', meta: room.id } }]);
		}

		kb.push([{ text: 'Назад', callback_data: { module: 'rooms', back: true, meta: 'list' } }]);

		return kb;
	},
} as const;
