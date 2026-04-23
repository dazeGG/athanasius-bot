import { Composer } from 'grammy';

import { isRegistered } from '~/shared/lib';
import type { AppContext } from '~/core';

import * as handlers from './handlers';

const composer = new Composer<AppContext>();

composer.on('message:text').filter(
	ctx => ctx.message.text === 'Рука' && isRegistered(ctx),
	handlers.handMessageHandler,
);

composer.on('callback_query:data').filter(
	ctx => ctx.callbackData?.module === 'hand' && ctx.callbackData?.action === 'show' && isRegistered(ctx),
	handlers.handShowCallbackHandler,
);

composer.on('callback_query:data').filter(
	ctx => ctx.callbackData?.module === 'hand' && ctx.callbackData?.action === 'close' && isRegistered(ctx),
	handlers.handCloseCallbackHandler,
);

composer.on('callback_query:data').filter(
	ctx => ctx.callbackData?.module === 'hand' && ctx.callbackData?.back === true && isRegistered(ctx),
	handlers.handBackCallbackHandler,
);

export default composer;
