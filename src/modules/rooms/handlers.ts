import type TelegramBot from 'node-telegram-bot-api';

import { BOT, STATES } from '~/core';
import type { RoomSchema } from '~/db';
import { ORM } from '~/db';
import type { MessageContext, CallbackContext } from '~/core';

import * as ui from './ui';
import { playersList } from '~/modules/game/ui';

const getRoomsListOptions = (me: TelegramBot.User) => {
	return { text: ui.txt.roomsList, keyboard: ui.gkb.roomsList(ORM.Rooms.getWithMe(me.id)) };
};

const getRoomOptions = (me: TelegramBot.User, room: RoomSchema) => {
	return {
		text:
			`Комната ${room.name}\n` +
			`Код подключения: <code>${room.settings.joinCode}</code>\n\n` +
			'Список игроков:\n' +
			`${playersList(room.players)}\n\n` +
			'Настройки игры:\n' +
			`Количество колод: ${room.settings.decksCount}`,
		keyboard: ui.gkb.room(me.id, room),
	};
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

export const joinRoomCodeMessageHandler = async (ctx: MessageContext) => {
	const { from: me, text: joinCode } = ctx.message;

	try {
		const room = await ORM.Rooms.joinRoom(me.id, joinCode);
		const meUser = ORM.Users.get(me.id);

		await BOT.sendMessage({ ctx, text: `Ты зашел в комнату ${room.name}` });
		await BOT.sendMessage({ ctx, ...getRoomsListOptions(me) });

		for (const playerId of room.players) {
			if (playerId !== me.id) {
				await BOT.sendMessageByChatId({
					chatId: playerId,
					text: `Комната ${room.name} | ${meUser.name} зашел`,
				});
			}
		}
	} catch (e) {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
		await BOT.sendMessage({ ctx, text: e.message });
		await BOT.sendMessage({ ctx, ...getRoomsListOptions(me) });
	}

	STATES.clearState(me.id);
};

export const leaveRoomCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);
	const { from: me, data: { meta: roomId } } = ctx.callback;

	if (!roomId) {
		throw new Error('Room id required');
	}

	const room = await ORM.Rooms.removePlayer(me.id, roomId);
	const meUser = ORM.Users.get(me.id);

	await BOT.editMessage({ ctx, text: `Ты вышел из комнаты ${room.name}` });
	await BOT.sendMessage({ ctx, ...getRoomsListOptions(me) });

	for (const playerId of room.players) {
		if (playerId !== me.id) {
			await BOT.sendMessageByChatId({
				chatId: playerId,
				text: `Комната ${room.name} | ${meUser.name} вышел`,
			});
		}
	}
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
	const { from: me, data: { meta: roomId } } = ctx.callback;

	if (!roomId) {
		throw new Error('Room id required');
	}

	const room = ORM.Rooms.getById(roomId);

	if (!room) {
		throw new Error('Room not found');
	}

	await BOT.editMessage({ ctx, ...getRoomOptions(me, room) });
};

export const kickCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);
	const { from: me, data: { meta } } = ctx.callback;

	if (!meta) {
		throw new Error('Meta is required');
	}

	const [roomId, playerId] = meta.split(':');
	const room = ORM.Rooms.getById(roomId);

	if (!room) {
		throw new Error('Room not found');
	}

	if (playerId) {
		await ORM.Rooms.removePlayer(Number(playerId), roomId);
	}

	await BOT.editMessage({ ctx, text: ui.txt.kickPlayer, keyboard: ui.gkb.kickList(me.id, room) });
};

export const backToRoomsListCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);
	const { from: me, data: { meta } } = ctx.callback;

	if (meta === 'list') {
		await BOT.editMessage({ ctx, ...getRoomsListOptions(me) });
		return;
	}

	if (meta?.startsWith('room')) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const [_, roomId] = meta?.split(':');
		const room = ORM.Rooms.getById(roomId);

		if (!room) {
			throw new Error('Room not found');
		}

		await BOT.editMessage({ ctx, ...getRoomOptions(me, room) });
	}
};
