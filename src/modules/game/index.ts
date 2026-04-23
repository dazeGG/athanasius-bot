import { Composer } from 'grammy';

import { DB } from '~/db';
import { Game } from '~/entities/game';
import { isRegistered } from '~/shared/lib';
import type { AppContext, CallbackCtx } from '~/core';

import * as handlers from './handlers';

const turnGuard = (ctx: CallbackCtx): boolean => {
	const gameId = ctx.callbackData?.meta?.split('#')[1];

	if (!gameId) {
		return false;
	}

	try {
		const user = DB.data.users.find(user => user.id === ctx.from.id);
		const game = new Game({ id: gameId });

		if (!user || game.isEnded) {
			return false;
		}

		return game.activePlayer.id === user.id && isRegistered(ctx);
	} catch {
		return false;
	}
};

const composer = new Composer<AppContext>();

composer.on('callback_query:data').filter(
	ctx => ctx.callbackData?.module === 'g' && ctx.callbackData?.action === 't' && turnGuard(ctx),
	handlers.gameTurnCallbackHandler,
);

export default composer;
