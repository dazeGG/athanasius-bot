import { BOT } from '~/core';
import { DB } from '~/db';
import { Game, GameLogicService } from '~/entities/game';
import type { CallbackContext } from '~/core';

import * as lib from './lib';

export const gameTurnCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);

	const { meta: callbackMeta } = ctx.callback.data;

	if (!callbackMeta) {
		await BOT.sendMessage({ ctx, text: 'No game metadata!' });
		return;
	}

	const turnMeta = lib.parseTurnMeta(callbackMeta);
	const game = new Game({ id: turnMeta.gameId });
	const me = DB.data.users.find(u => u.id === ctx.callback.from.id);

	if (!me) {
		return;
	}

	await GameLogicService.processTurn({ ctx, game, me, turnMeta });
};
