import { Composer } from 'grammy';

import { isRegistered } from '~/shared/lib';
import type { AppContext } from '~/core';

import * as handlers from './handlers';

const composer = new Composer<AppContext>();

composer.on('callback_query:data').filter(
	ctx => ctx.callbackData?.module === 'g' && ctx.callbackData?.action === 't' && isRegistered(ctx),
	handlers.gameTurnCallbackHandler,
);

export default composer;
