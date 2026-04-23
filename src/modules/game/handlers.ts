import { DB } from '~/db';
import { BOT } from '~/core';
import { Game, processTurn } from '~/entities/game';
import { getCallbackMeta } from '~/core/lib';
import type { CallbackCtx } from '~/core';

import * as lib from './lib';

export const gameTurnCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();

	const callbackMeta = getCallbackMeta(ctx.callbackQuery.data);

	if (!callbackMeta) {
		await ctx.reply(lib.STALE_GAME_MESSAGE_TEXT);
		return;
	}

	try {
		const turnMeta = lib.parseTurnMeta(callbackMeta);
		const game = new Game({ id: turnMeta.gameId });
		const me = DB.data.users.find(u => u.id === ctx.from.id);

		if (!me) {
			return;
		}

		lib.validateTurnMeta({ game, me, turnMeta });

		await processTurn({ ctx, game, me, turnMeta, sender: BOT.api.sendMessage.bind(BOT.api) });
	} catch (error) {
		if (lib.isInvalidGameFlowError(error) || (error instanceof Error && error.message === 'Game not found')) {
			await ctx.reply(lib.STALE_GAME_MESSAGE_TEXT);
			return;
		}

		throw error;
	}
};
