import type TelegramBot from 'node-telegram-bot-api';

import { BOT, STATES } from '~/core';
import { ORM } from '~/db';
import type { MessageContext, CallbackContext } from '~/core';

import * as ui from './ui';
import { playersList } from '~/modules/game/ui';

const getRoomsListOptions = (me: TelegramBot.User) => {
	return { text: ui.txt.roomsList, keyboard: ui.gkb.roomsList(ORM.Rooms.getWithMe(me.id)) };
};

export const roomsMessageHandler = async (ctx: MessageContext) => {
	await BOT.deleteMessage(ctx);

	const { from: me } = ctx.message;

	const roomsWithMe = ORM.Rooms.getWithMe(me.id);

	if (roomsWithMe.length === 0) {
		await BOT.sendMessage({ ctx, text: ui.txt.noRooms, keyboard: ui.kb.default });
	} else {
		await BOT.sendMessage({ ctx, ...getRoomsListOptions(me) });
	}
};

export const joinRoomCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);
	const { from: me } = ctx.callback;

	await BOT.editMessage({ ctx, text: 'Напиши код подключения' });
	STATES.setState(me.id, 'ROOMS_JOIN');
};

export const joinRoomNameMessageHandler = async (ctx: MessageContext) => {
	const { from: me, text: joinCode } = ctx.message;

	try {
		const room = await ORM.Rooms.joinRoom(me.id, joinCode);
		const meUser = ORM.Users.get(me.id);

		await BOT.sendMessage({ ctx, text: `Ты успешно подключился к комнате ${room.name}` });
		await BOT.sendMessage({ ctx, ...getRoomsListOptions(me) });

		for (const playerId of room.players) {
			if (playerId !== me.id) {
				await BOT.sendMessageByChatId({
					chatId: playerId,
					text: `Комната ${room.name} | ${meUser.name} подключился`,
				});
			}
		}
	} catch (e) {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
		await BOT.sendMessage({ ctx, text: e.message });
	}

	STATES.clearState(me.id);
};

export const createRoomCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);
	const { from: me } = ctx.callback;

	await BOT.editMessage({ ctx, text: 'Напиши название комнаты' });
	STATES.setState(me.id, 'ROOMS_CREATE');
};

export const createRoomNameMessageHandler = async (ctx: MessageContext) => {
	const { from: me, text: roomName } = ctx.message;

	try {
		await ORM.Rooms.createRoom(roomName, me.id);
		await BOT.sendMessage({ ctx, text: ui.txt.createdRoom + ' ' + roomName });
		STATES.clearState(me.id);

		await BOT.sendMessage({ ctx, ...getRoomsListOptions(me) });
	} catch (e) {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
		await BOT.sendMessage({ ctx, text: e.message });
	}
};

export const openRoomCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);
	const { data: { meta: roomId } } = ctx.callback;

	if (!roomId) {
		throw new Error('Room id required');
	}

	const room = ORM.Rooms.getById(roomId);

	if (!room) {
		throw new Error('Room not found');
	}

	await BOT.editMessage({
		ctx,
		text:
			`Комната ${room.name}\n` +
			`Код подключения: <code>${room.settings.joinCode}</code>\n\n` +
			'Список игроков:\n' +
			`${playersList(room.players)}\n\n` +
			'Настройки игры:\n' +
			`Количество колод: ${room.settings.decksCount}`,
		keyboard: ui.gkb.room(room),
	});
};

export const backToRoomsListCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);
	const { from: me, data: { meta: to } } = ctx.callback;

	switch (to) {
	case 'list':
		await BOT.editMessage({ ctx, ...getRoomsListOptions(me) });
		break;
	}
};
