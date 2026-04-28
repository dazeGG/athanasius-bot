import { ORM } from '~/db';
import { getCallbackMeta } from '~/core/lib';
import type { CallbackCtx, MessageCtx } from '~/core';

import * as utils from './utils';
import * as ui from './ui';

async function guardGameNotStarted (ctx: CallbackCtx, roomId: string): Promise<boolean> {
	if (ORM.Games.getActive(roomId)) {
		await ctx.answerCallbackQuery(ui.txt.gameAlreadyStarted);
		await ctx.deleteMessage();
		return false;
	}
	return true;
}

export class SettingsHandlers {
	public static async start (ctx: CallbackCtx) {
		const room = utils.getRoomFromMeta(ctx);

		if (!await guardGameNotStarted(ctx, room.id)) {
			return;
		}

		await ctx.answerCallbackQuery();

		if (!await utils.ensureRoomMember(ctx, room)) {
			return;
		}

		if (!await utils.ensureRoomOwner(ctx, room)) {
			return;
		}

		await ctx.editMessageText(
			utils.getSettingsStartText(room),
			{ reply_markup: utils.getSettingsInlineKeyboard(room) },
		);
	}

	public static async changeJoinCode (ctx: CallbackCtx) {
		const room = utils.getRoomFromMeta(ctx);

		if (!await guardGameNotStarted(ctx, room.id)) {
			return;
		}

		if (!await utils.ensureRoomMember(ctx, room)) {
			await ctx.answerCallbackQuery();
			return;
		}

		if (!await utils.ensureRoomOwner(ctx, room)) {
			await ctx.answerCallbackQuery();
			return;
		}

		await ORM.Rooms.changeJoinCode(room.id);
		const updatedRoom = ORM.Rooms.getById(room.id);
		await ctx.answerCallbackQuery({ text: `Новый код: ${updatedRoom.settings.joinCode}` });
		await ctx.editMessageText(
			utils.getSettingsStartText(updatedRoom),
			{ reply_markup: utils.getSettingsInlineKeyboard(updatedRoom) },
		);
	}

	public static async changeDecksCount (ctx: CallbackCtx) {
		const room = utils.getRoomFromMeta(ctx);

		if (!await guardGameNotStarted(ctx, room.id)) {
			return;
		}

		await ctx.answerCallbackQuery();

		if (!await utils.ensureRoomMember(ctx, room)) {
			return;
		}

		if (!await utils.ensureRoomOwner(ctx, room)) {
			return;
		}

		await ctx.editMessageText(ui.txt.decksCountPrompt);
		ctx.session.flow = { name: 'ROOM_CDC', roomId: room.id };
	}

	public static async changeDecksCountMessage (ctx: MessageCtx) {
		const { text } = ctx.message;
		const stateContext = ctx.session.flow.name === 'ROOM_CDC'
			? { roomId: ctx.session.flow.roomId }
			: undefined;

		if (!stateContext || !stateContext.roomId) {
			throw new Error('Room id required');
		}

		const { roomId } = stateContext;

		const room = ORM.Rooms.getById(roomId);
		const newDecksCount = Number(text);

		if (!await utils.ensureRoomMember(ctx, room)) {
			return;
		}

		if (!await utils.ensureRoomOwner(ctx, room)) {
			return;
		}

		if (!Number.isInteger(newDecksCount) || newDecksCount < 1 || newDecksCount > 100) {
			await ctx.reply(ui.txt.decksCountError);
			return;
		}

		await ORM.Rooms.changeSettings(roomId, { decksCount: newDecksCount });

		await ctx.reply(
			utils.getSettingsStartText(room),
			{ reply_markup: utils.getSettingsInlineKeyboard(room) },
		);
		ctx.session.flow = {};
	}

	public static async changeDeckType (ctx: CallbackCtx) {
		const meta = getCallbackMeta(ctx.callbackQuery.data);

		if (!meta) {
			throw new Error('Meta required');
		}

		const [roomId, deckTypeStr] = meta.split(':');
		const room = ORM.Rooms.getById(roomId);

		if (!await utils.ensureRoomMember(ctx, room)) {
			return;
		}

		if (!await utils.ensureRoomOwner(ctx, room)) {
			return;
		}

		if (!await guardGameNotStarted(ctx, room.id)) {
			return;
		}

		await ctx.answerCallbackQuery();

		// If no deckType value, show the selection keyboard
		if (!deckTypeStr) {
			await ctx.editMessageText(
				utils.getSettingsStartText(room) + `\n\n${ui.txt.deckTypePrompt}`,
				{ reply_markup: utils.getDeckTypeInlineKeyboard(room) },
			);
			return;
		}

		const deckType = Number(deckTypeStr) as 36 | 52 | 54;

		if (![36, 52, 54].includes(deckType)) {
			throw new Error('Invalid deck type');
		}

		await ORM.Rooms.changeSettings(roomId, { deckType });

		// Re-fetch room to get updated settings
		const updatedRoom = ORM.Rooms.getById(roomId);
		await ctx.editMessageText(
			utils.getSettingsStartText(updatedRoom),
			{ reply_markup: utils.getSettingsInlineKeyboard(updatedRoom) },
		);
	}

	public static async toggleAllowMailing (ctx: CallbackCtx) {
		const room = utils.getRoomFromMeta(ctx);

		if (!await guardGameNotStarted(ctx, room.id)) {
			return;
		}

		await ctx.answerCallbackQuery();

		if (!await utils.ensureRoomMember(ctx, room)) {
			return;
		}

		if (!await utils.ensureRoomOwner(ctx, room)) {
			return;
		}

		await ORM.Rooms.changeSettings(room.id, { allowMailing: !room.settings.allowMailing });

		const updatedRoom = ORM.Rooms.getById(room.id);
		await ctx.editMessageText(
			utils.getSettingsStartText(updatedRoom),
			{ reply_markup: utils.getSettingsInlineKeyboard(updatedRoom) },
		);
	}
}
