import { Composer } from 'grammy';

import { isRegistered } from '~/shared/lib';
import type { AppContext } from '~/core';

import * as handlers from './handlers';

const composer = new Composer<AppContext>();

composer.on('message:text').filter(
	ctx => ctx.message.text === 'Рука' && isRegistered(ctx),
	handlers.handMessageHandler,
);

composer.callbackQuery(/^hand:show:/, ctx => isRegistered(ctx) && handlers.handShowCallbackHandler(ctx));
composer.callbackQuery(/^hand:close:/, ctx => isRegistered(ctx) && handlers.handCloseCallbackHandler(ctx));
composer.callbackQuery(/^hand:back:/, ctx => isRegistered(ctx) && handlers.handBackCallbackHandler(ctx));

export default composer;
