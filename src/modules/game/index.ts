import { BOT } from '~/core';
import type { CallbackContextCallback } from '~/core';
import { DB } from '~/db';
import { Game } from '~/entities/game';
import { isRegistered } from '~/shared/lib';

import * as handlers from './handlers';

const turnGuard = (ctx: CallbackContextCallback): boolean => {
	const gameId = ctx.data.meta?.split('#')[1];

	if (!gameId) {
		return false;
	}

	const user = DB.data.users.find(user => user.id === ctx.from.id);
	const game = new Game({ id: gameId });

	if (!user || !game) {
		return false;
	}

	return game.activePlayer === user.id && isRegistered(ctx);
};

const registerGame = () => {
	BOT.registerCommand('/game', handlers.gameCommandHandler, isRegistered);
	BOT.registerMessageHandler(handlers.gameCommandHandler, { exact: 'Игра' }, isRegistered);
	BOT.registerCallbackHandler(handlers.gameStartCallbackHandler, { module: 'game', action: 'start' }, isRegistered);
	BOT.registerCallbackHandler(handlers.gameStartedCallbackHandler, { module: 'game', action: 'started' }, isRegistered);
	BOT.registerCallbackHandler(handlers.gameTurnCallbackHandler, { module: 'g', action: 't' }, turnGuard);
};

export default registerGame;
