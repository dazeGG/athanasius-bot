import type { CallbackData, RawButtons } from '~/core';
import type { RoomSchema } from '~/db';

/* TEXTS */
export const txt = {
	noRooms: 'У тебя пока нет комнат',
	roomsList: 'Вот список твоих комнат',
	createdRoom: 'Создал комнату',
} as const;

/* KEYBOARDS */
export const kb: ModuleKeyboards = {
	noRooms: [
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
			[{ text: 'Создать комнату', callback_data: { module: 'rooms', action: 'create' } }],
		];
	},
} as const;
