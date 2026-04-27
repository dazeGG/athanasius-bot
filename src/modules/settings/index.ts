import { Composer } from 'grammy';

import { isRegistered } from '~/shared/lib';
import type { AppContext } from '~/core';

import * as handlers from './handlers';

const composer = new Composer<AppContext>();
const registered = composer.filter(isRegistered);

registered.hears('Настройки', handlers.settingsStartMessageHandler);

registered.on('message:text').filter(
	ctx => ctx.session.flow.name === 'SETTINGS_CHANGE_NAME',
	handlers.settingsChangeNameStateMessageHandler,
);

registered.callbackQuery(/^settings:/, handlers.settingsCallbackHandler);

export default composer;
