import { BOT } from '~/core';

import * as handlers from './handlers';

const registerGame = () => {
	BOT.registerCommand('/game', handlers.gameCommandHandler);
	BOT.registerCallbackHandler(handlers.gameStartCallbackHandler, {module: 'game', action: 'start'})
};

export default registerGame;