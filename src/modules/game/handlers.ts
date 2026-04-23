import { BOT } from '~/core';
import { DB } from '~/db';
import { Game, processTurn } from '~/entities/game';
import type { CallbackContext } from '~/core';

import * as lib from './lib';

export const gameTurnCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);

	const { meta: callbackMeta } = ctx.callback.data;

	if (!callbackMeta) {
		await BOT.sendMessage({ ctx, text: lib.STALE_GAME_MESSAGE_TEXT });
		return;
	}

	try {
		const turnMeta = lib.parseTurnMeta(callbackMeta);
		const game = new Game({ id: turnMeta.gameId });
		const me = DB.data.users.find(u => u.id === ctx.callback.from.id);

		if (!me) {
			return;
		}

		lib.validateTurnMeta({ game, me, turnMeta });

		await processTurn({ ctx, game, me, turnMeta });
	} catch (error) {
		if (lib.isInvalidGameFlowError(error) || (error instanceof Error && error.message === 'Game not found')) {
			await BOT.sendMessage({ ctx, text: lib.STALE_GAME_MESSAGE_TEXT });
			return;
		}

		throw error;
	}
};
