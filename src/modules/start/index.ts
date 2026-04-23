import { Composer } from 'grammy';

import type { AppContext, MessageCtx } from '~/core';

import * as handlers from './handlers';

const composer = new Composer<AppContext>();

composer.command('start', ctx => handlers.startCommandHandler(ctx as unknown as MessageCtx));

export default composer;
