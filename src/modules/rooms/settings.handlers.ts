import type { RoomId } from '~/db';
import { STATES } from '~/core';
import { ORM } from '~/db';
import type { CallbackCtx, MessageCtx } from '~/core';

import * as utils from './utils';

export class SettingsHandlers {
	public static async start (ctx: CallbackCtx) {
		await ctx.answerCallbackQuery();
		const room = utils.getRoomFromMeta(ctx);

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
		await ctx.answerCallbackQuery();
		const room = utils.getRoomFromMeta(ctx);

		if (!await utils.ensureRoomMember(ctx, room)) {
			return;
		}

		if (!await utils.ensureRoomOwner(ctx, room)) {
			return;
		}

		await ORM.Rooms.changeJoinCode(room.id);
		await ctx.editMessageText(
			utils.getSettingsStartText(room),
			{ reply_markup: utils.getSettingsInlineKeyboard(room) },
		);
	}

	public static async changeDecksCount (ctx: CallbackCtx) {
		await ctx.answerCallbackQuery();
		const roomId = ctx.callbackData!.meta;
		const room = utils.getRoomFromMeta(ctx);

		if (!await utils.ensureRoomMember(ctx, room)) {
			return;
		}

		if (!await utils.ensureRoomOwner(ctx, room)) {
			return;
		}

		await ctx.editMessageText('Напиши новое количество колод\nКоличество колод должно быть целым числом в диапазоне от 1 до 100');
		STATES.setState(ctx.from.id, 'ROOM_CDC', { roomId });
	}

	public static async changeDecksCountMessage (ctx: MessageCtx) {
		const me = ctx.from!;
		const { text } = ctx.message;
		const stateContext = STATES.getContext(me.id) as { roomId: RoomId | undefined };

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
			await ctx.reply('Количество колод должно быть целым числом в диапазоне от 1 до 100');
			return;
		}

		await ORM.Rooms.changeSettings(roomId, { decksCount: newDecksCount });

		await ctx.reply(
			utils.getSettingsStartText(room),
			{ reply_markup: utils.getSettingsInlineKeyboard(room) },
		);
		STATES.clearState(me.id);
	}
}
