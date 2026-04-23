import { Composer } from 'grammy';

import { isRegistered } from '~/shared/lib';
import type { AppContext } from '~/core';

import * as handlers from './handlers';

const composer = new Composer<AppContext>();

composer.callbackQuery(/^g:t:/, ctx => isRegistered(ctx) && handlers.gameTurnCallbackHandler(ctx));

export default composer;
