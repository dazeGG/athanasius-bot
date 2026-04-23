import { Composer } from 'grammy';

import { isRegistered } from '~/shared/lib';
import type { AppContext } from '~/core';

import * as handlers from './handlers';

const composer = new Composer<AppContext>();
const registered = composer.filter(isRegistered);

registered.hears('Рука', handlers.handMessageHandler);
registered.callbackQuery(/^hand:show:/, handlers.handShowCallbackHandler);
registered.callbackQuery(/^hand:close:/, handlers.handCloseCallbackHandler);
registered.callbackQuery(/^hand:back:/, handlers.handBackCallbackHandler);

export default composer;
