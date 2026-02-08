import { BOT, STATES } from '~/core';
import { ORM } from '~/db';
import type { MessageContext, CallbackContext } from '~/core';
import type { RoomSchema } from '~/db';

import * as ui from './ui';
import { playersList } from '~/modules/game/ui';

const getRoomsListOptions = (ctx: MessageContext | CallbackContext, rooms: RoomSchema[]) => {
	return { ctx, text: ui.txt.roomsList, keyboard: ui.gkb.roomsList(rooms) };
};

export const roomsMessageHandler = async (ctx: MessageContext) => {
	await BOT.deleteMessage(ctx);

	const { from: me } = ctx.message;

	const myRooms = ORM.Rooms.getMine(me.id);

	if (myRooms.length === 0) {
		await BOT.sendMessage({ ctx, text: ui.txt.noRooms, keyboard: ui.kb.noRooms });
	} else {
		await BOT.sendMessage(getRoomsListOptions(ctx, myRooms));
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

		const myRooms = ORM.Rooms.getMine(me.id);
		await BOT.sendMessage(getRoomsListOptions(ctx, myRooms));
	} catch (error) {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
		await BOT.sendMessage({ ctx, text: error.message });
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
		const myRooms = ORM.Rooms.getMine(me.id);
		await BOT.editMessage(getRoomsListOptions(ctx, myRooms));
		break;
	}
};
