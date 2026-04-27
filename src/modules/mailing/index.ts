import { Composer } from 'grammy';

import { isRegistered } from '~/shared/lib';
import type { AppContext } from '~/core';

import * as handlers from './handlers';

const composer = new Composer<AppContext>();
const registered = composer.filter(isRegistered);

registered.hears('Сообщение', handlers.mailingMessageHandler);
registered.callbackQuery(/^mailing:select:/, handlers.mailingSelectCallbackHandler);
registered.callbackQuery(/^mailing:cancel:/, handlers.mailingCancelCallbackHandler);

registered.on('message:text').filter(
	ctx => ctx.session.flow.name === 'GAME_MAILING',
	handlers.mailingTextHandler,
);

export default composer;
