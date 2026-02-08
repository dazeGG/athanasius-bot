import type TelegramBot from 'node-telegram-bot-api';

import { ORM } from '~/db';
import { playersList } from '~/shared/ui';
import type { RoomSchema } from '~/db';

import * as ui from './ui';
import type { CallbackContext, MessageContext } from '~/core';

export const getRoomsListOptions = (me: TelegramBot.User) => {
	return { text: ui.txt.roomsList, keyboard: ui.gkb.roomsList(ORM.Rooms.getWithMe(me.id)) };
};

export const getRoomText = (room: RoomSchema) => {
	return `Комната ${room.name}\n` +
        `Код подключения: <code>${room.settings.joinCode}</code>\n\n` +
        'Список игроков:\n' +
        `${playersList(room.players)}\n\n` +
        'Настройки игры:\n' +
        `Количество колод: ${room.settings.decksCount}`;
};

export const getRoomOptions = (me: TelegramBot.User, room: RoomSchema) => {
	return { text: getRoomText(room), keyboard: ui.gkb.room(me.id, room) };
};

export const getRoomFromMeta = (ctx: CallbackContext): RoomSchema => {
	const { data: { meta: roomId } } = ctx.callback;

	if (!roomId) {
		throw new Error('Room id required');
	}

	return ORM.Rooms.getById(roomId ?? '');
};

export const getSettingsStartOptions = (ctx: MessageContext | CallbackContext, room: RoomSchema) => {
	return {
		ctx,
		text: getRoomText(room) + '\n\nВыбери что хочешь изменить',
		keyboard: ui.gkb.settings(room),
	};
};
