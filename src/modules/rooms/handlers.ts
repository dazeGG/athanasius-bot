import { BOT, logGameEvent } from '~/core';
import { ORM } from '~/db';
import { Game } from '~/entities/game';
import { sendFirstMessage } from '~/entities/game/services';
import { escapeHtml } from '~/shared/lib';
import { getAthanasiusesListText, MIN_PLAYERS_TO_START, txt as gameTxt } from '~/shared/ui/game';
import { getCallbackMeta } from '~/core/lib';
import type { CallbackCtx, AppContext, MessageCtx } from '~/core';
import * as ui from './ui';
import * as utils from './utils';

const getErrorMessage = (error: unknown): string => {
	return escapeHtml(error instanceof Error ? error.message : 'Произошла неизвестная ошибка');
};

export const roomsMessageHandler = async (ctx: AppContext) => {
	await ctx.deleteMessage();

	const roomsWithMe = ORM.Rooms.getWithMe(ctx.from!.id);

	if (roomsWithMe.length === 0) {
		await ctx.reply(ui.txt.noRooms, { reply_markup: ui.defaultKeyboard });
	} else {
		await ctx.reply(ui.txt.roomsList, { reply_markup: utils.getRoomsInlineKeyboard(ORM.Rooms.getWithMe(ctx.from!.id)) });
	}
};

export const joinRoomCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();

	await ctx.editMessageText(ui.txt.joinCodePrompt);
	ctx.session.flow = { name: 'ROOMS_JOIN' };
};

export const joinRoomCodeMessageHandler = async (ctx: MessageCtx) => {
	const { text: joinCode } = ctx.message;
	const me = ctx.from!;

	try {
		const room = await ORM.Rooms.joinRoom(me.id, joinCode);
		const meUser = ORM.Users.get(me.id);

		logGameEvent({
			type: 'PLAYER_JOINED_ROOM',
			roomId: room.id,
			playerId: me.id,
			playerName: meUser.name,
		});

		await ctx.reply(`Ты зашел в комнату ${escapeHtml(room.name)}`);
		await ctx.reply(ui.txt.roomsList, { reply_markup: utils.getRoomsInlineKeyboard(ORM.Rooms.getWithMe(me.id)) });

		await utils.mailing(`Комната ${escapeHtml(room.name)} | ${escapeHtml(meUser.name)} зашел`, room, [me.id]);
	} catch (error) {
		await ctx.reply(getErrorMessage(error));
		await ctx.reply(ui.txt.roomsList, { reply_markup: utils.getRoomsInlineKeyboard(ORM.Rooms.getWithMe(me.id)) });
	}

	ctx.session.flow = {};
};

export const leaveRoomCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();

	const roomId = getCallbackMeta(ctx.callbackQuery.data);

	if (!roomId) {
		throw new Error('Room id required');
	}

	const room = ORM.Rooms.getById(roomId);

	if (room.owner === ctx.from.id) {
		await ctx.reply(ui.txt.ownerCannotLeave);
		return;
	}

	if (!room.players.includes(ctx.from.id)) {
		await ctx.editMessageText(`Ты уже не в комнате ${escapeHtml(room.name)}`);
		return;
	}

	const meUser = ORM.Users.get(ctx.from.id);
	await ORM.Rooms.removePlayer(ctx.from.id, roomId);

	logGameEvent({
		type: 'PLAYER_LEFT_ROOM',
		roomId,
		playerId: ctx.from.id,
		playerName: meUser.name,
	});

	await ctx.editMessageText(`Ты вышел из комнаты ${escapeHtml(room.name)}`);
	await ctx.reply(ui.txt.roomsList, { reply_markup: utils.getRoomsInlineKeyboard(ORM.Rooms.getWithMe(ctx.from.id)) });

	await utils.mailing(`Комната ${escapeHtml(room.name)} | ${escapeHtml(meUser.name)} вышел`, room, [ctx.from.id]);
};

export const createRoomCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();

	await ctx.editMessageText(ui.txt.roomNamePrompt);
	ctx.session.flow = { name: 'ROOMS_CREATE' };
};

export const createRoomNameMessageHandler = async (ctx: MessageCtx) => {
	const { text: roomName } = ctx.message;
	const me = ctx.from!;

	try {
		await ORM.Rooms.createRoom(roomName, me.id);
		await ctx.reply(ui.txt.createdRoom + ' ' + escapeHtml(roomName));
		ctx.session.flow = {};

		await ctx.reply(ui.txt.roomsList, { reply_markup: utils.getRoomsInlineKeyboard(ORM.Rooms.getWithMe(me.id)) });
	} catch (error) {
		await ctx.reply(getErrorMessage(error));
	}
};

export const openRoomCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();

	const room = utils.getRoomFromMeta(ctx);

	if (!await utils.ensureRoomMember(ctx, room)) {
		return;
	}

	await ctx.editMessageText(
		utils.getRoomBaseText(room),
		{ reply_markup: utils.getRoomInlineKeyboard(ctx.from.id, room) },
	);
};

export const kickCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();

	const meta = getCallbackMeta(ctx.callbackQuery.data);

	if (!meta) {
		throw new Error('Meta is required');
	}

	const [roomId, playerId] = meta.split(':');
	const room = ORM.Rooms.getById(roomId);

	if (!await utils.ensureRoomOwner(ctx, room)) {
		return;
	}

	if (playerId) {
		const targetPlayerId = Number(playerId);

		if (targetPlayerId === room.owner) {
			await ctx.reply(ui.txt.cannotKickOwner);
			return;
		}

		if (!room.players.includes(targetPlayerId)) {
			await ctx.reply(`Игрока уже нет в комнате ${escapeHtml(room.name)}`);
			await ctx.editMessageText(ui.txt.kickPlayer, { reply_markup: ui.gkb.kickList(ctx.from.id, room) });
			return;
		}

		const kickedUser = ORM.Users.get(targetPlayerId);
		await ORM.Rooms.removePlayer(targetPlayerId, roomId);

		logGameEvent({
			type: 'PLAYER_KICKED',
			roomId,
			playerId: targetPlayerId,
			playerName: kickedUser.name,
		});

		await BOT.api.sendMessage(targetPlayerId, `Комната ${escapeHtml(room.name)} | Тебя выгнали :(`);
		await utils.mailing(`Комната ${escapeHtml(room.name)} | ${escapeHtml(kickedUser.name)} был выгнан`, room);
	}

	await ctx.editMessageText(ui.txt.kickPlayer, { reply_markup: ui.gkb.kickList(ctx.from.id, room) });
};

export const gameStartCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();

	const room = utils.getRoomFromMeta(ctx);

	if (!await utils.ensureRoomMember(ctx, room)) {
		return;
	}

	if (!await utils.ensureRoomOwner(ctx, room)) {
		return;
	}

	if (room.players.length < MIN_PLAYERS_TO_START) {
		await ctx.editMessageText(
			utils.getRoomBaseText(room) + `\n\n${gameTxt.playersCountError}`,
			{ reply_markup: utils.getRoomInlineKeyboard(ctx.from.id, room) },
		);
		return;
	}

	await ctx.deleteMessage();

	await Game.create(room);
};

export const gameGetAthanasiusesCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();

	const room = utils.getRoomFromMeta(ctx);

	if (!await utils.ensureRoomMember(ctx, room)) {
		return;
	}

	const game = utils.getGameFromMeta(ctx);

	await ctx.editMessageText(
		getAthanasiusesListText(game, room.name),
		{ reply_markup: ui.gkb.athanasiuses(room.id) },
	);
};

export const gameWhoseTurnCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();

	const room = utils.getRoomFromMeta(ctx);

	if (!await utils.ensureRoomMember(ctx, room)) {
		return;
	}

	const game = utils.getGameFromMeta(ctx);

	await ctx.editMessageText(
		`Комната ${escapeHtml(room.name)}\n\nСейчас ход ${escapeHtml(game.activePlayer.name)}`,
		{ reply_markup: ui.gkb.whoseTurn(room.id) },
	);
};

export const gameSendTurnMessageCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();

	const room = utils.getRoomFromMeta(ctx);

	if (!await utils.ensureRoomMember(ctx, room)) {
		return;
	}

	if (room.owner !== ctx.from.id) {
		return;
	}

	const game = utils.getGameFromMeta(ctx);
	const sender = BOT.api.sendMessage.bind(BOT.api);

	await sendFirstMessage(game, sender);
	await ctx.editMessageText(
		utils.getRoomBaseText(room, true) + `\n\n${gameTxt.gameMessageResendSuccess}`,
		{ reply_markup: utils.getRoomInlineKeyboard(ctx.from.id, room) },
	);
};

export const deleteRoomCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();

	const roomId = getCallbackMeta(ctx.callbackQuery.data);

	if (!roomId) {
		throw new Error('Room id required');
	}

	const room = ORM.Rooms.getById(roomId);

	if (!await utils.ensureRoomOwner(ctx, room)) {
		return;
	}

	try {
		await ORM.Rooms.deleteRoom(roomId);
	} catch (error) {
		await ctx.editMessageText(
			utils.getRoomBaseText(room) + `\n\n${getErrorMessage(error)}`,
			{ reply_markup: utils.getRoomInlineKeyboard(ctx.from.id, room) },
		);
		return;
	}

	const meUser = ORM.Users.get(ctx.from.id);

	logGameEvent({
		type: 'ROOM_DELETED',
		roomId,
		ownerId: ctx.from.id,
		ownerName: meUser.name,
	});

	await utils.mailing(`Комната ${escapeHtml(room.name)} была удалена`, room, [ctx.from.id]);

	await ctx.editMessageText(ui.txt.roomDeleted);
	await ctx.reply(ui.txt.roomsList, { reply_markup: utils.getRoomsInlineKeyboard(ORM.Rooms.getWithMe(ctx.from.id)) });
};

export const backCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();

	const meta = getCallbackMeta(ctx.callbackQuery.data);

	if (meta === 'list') {
		await ctx.editMessageText(ui.txt.roomsList, { reply_markup: utils.getRoomsInlineKeyboard(ORM.Rooms.getWithMe(ctx.from.id)) });
		return;
	}

	if (meta?.startsWith('room')) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const [_, roomId] = meta.split(':');
		const room = ORM.Rooms.getById(roomId);

		if (!await utils.ensureRoomMember(ctx, room)) {
			return;
		}

		await ctx.editMessageText(
			utils.getRoomBaseText(room),
			{ reply_markup: utils.getRoomInlineKeyboard(ctx.from.id, room) },
		);
	}
};
