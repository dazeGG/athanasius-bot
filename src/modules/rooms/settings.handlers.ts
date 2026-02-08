import { BOT, STATES } from '~/core';
import type { RoomId } from '~/db';
import { ORM } from '~/db';
import type { MessageContext, CallbackContext } from '~/core';

import * as utils from './utils';

export class SettingsHandlers {
	public static async start (ctx: CallbackContext) {
		await BOT.answerCallbackQuery(ctx);
		const room = utils.getRoomFromMeta(ctx);

		await BOT.editMessage(utils.getSettingsStartOptions(ctx, room));
	}

	public static async changeJoinCode (ctx: CallbackContext) {
		await BOT.answerCallbackQuery(ctx);
		const room = utils.getRoomFromMeta(ctx);

		await ORM.Rooms.changeJoinCode(room.id);
		await BOT.editMessage(utils.getSettingsStartOptions(ctx, room));
	}

	public static async changeDecksCount (ctx: CallbackContext) {
		await BOT.answerCallbackQuery(ctx);
		const { from: me, data: { meta: roomId } } = ctx.callback;

		await BOT.editMessage({
			ctx,
			text: 'Напиши новое количество колод\nКоличество колод должно быть целым числом в диапазоне от 1 до 100',
		});
		STATES.setState(me.id, 'ROOM_CDC', { roomId });
	}

	public static async changeDecksCountMessage (ctx: MessageContext) {
		const { from: me, text } = ctx.message;
		const stateContext = STATES.getContext(me.id) as { roomId: RoomId | undefined };

		if (!stateContext || !stateContext.roomId) {
			throw new Error('Room id required');
		}

		const { roomId } = stateContext;

		const room = ORM.Rooms.getById(roomId);
		const newDecksCount = Number(text);

		if (isNaN(newDecksCount) || newDecksCount < 1 || newDecksCount > 100) {
			await BOT.sendMessage({ ctx, text: 'Количество колод должно быть целым числом в диапазоне от 1 до 100' });
			return;
		}

		await ORM.Rooms.changeSettings(roomId, { decksCount: newDecksCount });

		await BOT.sendMessage(utils.getSettingsStartOptions(ctx, room));
		STATES.clearState(me.id);
	}
}
