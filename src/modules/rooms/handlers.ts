import { BOT, STATES } from '~/core';
import { ORM } from '~/db';
import type { MessageContext, CallbackContext } from '~/core';
import type { RoomSchema } from '~/db';

import * as ui from './ui';

const sendRoomsList = async (ctx: MessageContext | CallbackContext, rooms: RoomSchema[]) => {
	await BOT.sendMessage({ ctx, text: ui.txt.roomsList, keyboard: ui.gkb.roomsList(rooms) });
};

export const roomsMessageHandler = async (ctx: MessageContext) => {
	await BOT.deleteMessage(ctx);

	const { from: me } = ctx.message;

	const myRooms = ORM.Rooms.getMine(me.id);

	if (myRooms.length === 0) {
		await BOT.sendMessage({ ctx, text: ui.txt.noRooms, keyboard: ui.kb.noRooms });
	} else {
		await sendRoomsList(ctx, myRooms);
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
		await sendRoomsList(ctx, myRooms);
	} catch (error) {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
		await BOT.sendMessage({ ctx, text: error.message });
	}
};
