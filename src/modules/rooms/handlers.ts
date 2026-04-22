import { BOT, STATES } from '~/core';
import { ORM } from '~/db';
import { Game } from '~/entities/game';
import { GameNotificationsService } from '~/entities/game/services';
import { getAthanasiusesListText, txt as gameTxt } from '~/shared/ui/game';
import type { MessageContext, CallbackContext } from '~/core';

import * as ui from './ui';
import * as utils from './utils';

export const roomsMessageHandler = async (ctx: MessageContext) => {
	await BOT.deleteMessage(ctx);

	const { from: me } = ctx.message;

	const roomsWithMe = ORM.Rooms.getWithMe(me.id);

	if (roomsWithMe.length === 0) {
		await BOT.sendMessage({ ctx, text: ui.txt.noRooms, keyboard: ui.kb.default });
	} else {
		await BOT.sendMessage({ ctx, ...utils.getRoomsListOptions(me) });
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
		await BOT.sendMessage({ ctx, ...utils.getRoomsListOptions(me) });

		await utils.mailing(`Комната ${room.name} | ${meUser.name} зашел`, room, [me.id]);
	} catch (e) {
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-expect-error
		await BOT.sendMessage({ ctx, text: e.message });
		await BOT.sendMessage({ ctx, ...utils.getRoomsListOptions(me) });
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
	await BOT.sendMessage({ ctx, ...utils.getRoomsListOptions(me) });

	await utils.mailing(`Комната ${room.name} | ${meUser.name} вышел`, room, [me.id]);
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

		await BOT.sendMessage({ ctx, ...utils.getRoomsListOptions(me) });
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

	await BOT.editMessage({ ctx, ...utils.getRoomOptions(me, room) });
};

export const kickCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);
	const { from: me, data: { meta } } = ctx.callback;

	if (!meta) {
		throw new Error('Meta is required');
	}

	const [roomId, playerId] = meta.split(':');
	const room = ORM.Rooms.getById(roomId);

	if (playerId) {
		await ORM.Rooms.removePlayer(Number(playerId), roomId);
		await BOT.sendMessageByChatId({ chatId: Number(playerId), text: `Комната ${room.name} | Тебя выгнали :(` });
		await utils.mailing(`Комната ${room.name} | ${ORM.Users.get(Number(playerId)).name} был выгнан`, room);
	}

	await BOT.editMessage({ ctx, text: ui.txt.kickPlayer, keyboard: ui.gkb.kickList(me.id, room) });
};

export const gameStartCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);
	await BOT.deleteMessage(ctx);

	const room = utils.getRoomFromMeta(ctx);

	const game = new Game({ room });
	await game.save();
};

export const gameGetAthanasiusesCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);

	const room = utils.getRoomFromMeta(ctx);
	const game = utils.getGameFromMeta(ctx);

	await BOT.editMessage({
		ctx,
		text: getAthanasiusesListText(game, room.name),
		keyboard: ui.gkb.athanasiuses(room.id),
	});
};

export const gameWhoseTurnCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);

	const room = utils.getRoomFromMeta(ctx);
	const game = utils.getGameFromMeta(ctx);

	await BOT.editMessage({
		ctx,
		text: `Комната ${room.name}\n\nСейчас ход ${game.activePlayer.name}`,
		keyboard: ui.gkb.whoseTurn(room.id),
	});
};

export const gameSendTurnMessageCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);

	const room = utils.getRoomFromMeta(ctx);

	if (room.owner !== ctx.callback.from.id) {
		return;
	}

	const game = utils.getGameFromMeta(ctx);

	await GameNotificationsService.sendFirstMessage(game);
	await BOT.editMessage({
		ctx,
		text: utils.getRoomBaseText(room, true) + `\n\n🟩 ${gameTxt.gameMessageResendSuccess}`,
		keyboard: ui.gkb.roomOngoing(ctx.callback.from.id, room),
	});
};

export const backCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);
	const { from: me, data: { meta } } = ctx.callback;

	if (meta === 'list') {
		await BOT.editMessage({ ctx, ...utils.getRoomsListOptions(me) });
		return;
	}

	if (meta?.startsWith('room')) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const [_, roomId] = meta?.split(':');
		const room = ORM.Rooms.getById(roomId);
		await BOT.editMessage({ ctx, ...utils.getRoomOptions(me, room) });
	}
};
