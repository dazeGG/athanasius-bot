import { Composer } from 'grammy';

import { isRegistered } from '~/shared/lib';
import type { AppContext } from '~/core';

import * as handlers from './handlers';

const composer = new Composer<AppContext>();
const registered = composer.filter(isRegistered);

registered.callbackQuery(/^g:t:/, handlers.gameTurnCallbackHandler);
registered.callbackQuery(/^g:tc:/, handlers.gameTurnConfirmCallbackHandler);
registered.callbackQuery(/^g:tb:/, handlers.gameTurnBackCallbackHandler);

export default composer;
