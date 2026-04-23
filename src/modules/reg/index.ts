import { Composer } from 'grammy';

import { STATES } from '~/core/states';
import type { AppContext, MessageCtx } from '~/core';

import * as handlers from './handlers';

const composer = new Composer<AppContext>();

composer.command('reg', ctx => handlers.regStartMessageHandler(ctx as unknown as MessageCtx));

composer.on('message:text').filter(
	ctx => STATES.getState(ctx.from.id) === 'REGISTRATION',
	handlers.regNameStateMessageHandler,
);

export default composer;
