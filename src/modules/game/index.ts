import { BOT } from '~/core';
import { isRegistered } from '~/lib';

import * as handlers from './handlers';

const registerGame = () => {
	BOT.registerCommand('/game', handlers.gameCommandHandler, isRegistered);
	BOT.registerCallbackHandler(handlers.gameStartCallbackHandler, { module: 'game', action: 'start' }, isRegistered);
	BOT.registerCallbackHandler(handlers.gameTurnCallbackHandler, { module: 'g', action: 't' }, isRegistered);
};

export default registerGame;
