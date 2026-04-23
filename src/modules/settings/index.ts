import { Composer } from 'grammy';

import { isRegistered } from '~/shared/lib';
import type { AppContext } from '~/core';

import * as handlers from './handlers';

const composer = new Composer<AppContext>();

composer.on('message:text').filter(
	ctx => ctx.message.text === 'Настройки' && isRegistered(ctx),
	handlers.settingsStartMessageHandler,
);

composer.on('message:text').filter(
	ctx => ctx.session.flow.name === 'SETTINGS_CHANGE_NAME' && isRegistered(ctx),
	handlers.settingsChangeNameStateMessageHandler,
);

composer.on('callback_query:data').filter(
	ctx => ctx.callbackData?.module === 'settings' && isRegistered(ctx),
	handlers.settingsCallbackHandler,
);

export default composer;
