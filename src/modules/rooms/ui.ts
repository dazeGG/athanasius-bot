import { InlineKeyboard } from 'grammy';

import { ORM } from '~/db';
import { stringifyCallbackData } from '~/core/lib';
import type { RoomSchema, RoomId } from '~/db';

/* TEXTS */
export const txt = {
	noRooms: 'У тебя пока нет комнат',
	roomsList: 'Вот список твоих комнат',
	createdRoom: 'Создал комнату',
	kickPlayer: 'Выбери кого хочешь выгнать',
	sendTurnMessage: 'Отправить сообщение хода',
	ownerOnly: 'Только владелец комнаты может управлять комнатой',
	ownerCannotLeave: 'Владелец комнаты не может выйти из своей комнаты',
	cannotKickOwner: 'Нельзя выгнать владельца комнаты',
	roomDeleted: 'Комната удалена',
} as const;

/* DEFAULT KEYBOARD */
export const defaultKeyboard = new InlineKeyboard()
	.text('Зайти по коду', stringifyCallbackData({ module: 'rooms', action: 'join' }))
	.row()
	.text('Создать комнату', stringifyCallbackData({ module: 'rooms', action: 'create' }));

/* GENERABLE KEYBOARDS */
export const gkb = {
	athanasiuses: (roomId: RoomId): InlineKeyboard => {
		return new InlineKeyboard()
			.text('Обновить', stringifyCallbackData({ module: 'room', action: 'getath', meta: roomId }))
			.row()
			.text('Назад', stringifyCallbackData({ module: 'rooms', back: true, meta: `room:${roomId}` }));
	},

	whoseTurn: (roomId: RoomId): InlineKeyboard => {
		return new InlineKeyboard()
			.text('Обновить', stringifyCallbackData({ module: 'room', action: 'whoseturn', meta: roomId }))
			.row()
			.text('Назад', stringifyCallbackData({ module: 'rooms', back: true, meta: `room:${roomId}` }));
	},

	kickList: (myId: number, room: RoomSchema): InlineKeyboard => {
		const keyboard = new InlineKeyboard();

		room.players
			.filter(p => p !== myId)
			.forEach(playerId => {
				keyboard.text(ORM.Users.get(playerId).name, stringifyCallbackData({ module: 'room', action: 'kick', meta: `${room.id}:${playerId}` }));
				keyboard.row();
			});

		keyboard.text('Назад', stringifyCallbackData({ module: 'rooms', back: true, meta: `room:${room.id}` }));

		return keyboard;
	},
} as const;
