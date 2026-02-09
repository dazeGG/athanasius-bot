import { BOT } from '~/core';
import { isRegistered } from '~/shared/lib';

import * as handlers from './handlers';

const registerHand = () => {
	BOT.registerMessageHandler(handlers.handMessageHandler, { exact: 'Рука' }, isRegistered);
	BOT.registerCallbackHandler(handlers.handShowCallbackHandler, { module: 'hand', action: 'show' }, isRegistered);
	BOT.registerCallbackHandler(handlers.handCloseCallbackHandler, { module: 'hand', action: 'close' }, isRegistered);
	BOT.registerCallbackHandler(handlers.handBackCallbackHandler, { module: 'hand', back: true }, isRegistered);
};

export default registerHand;
