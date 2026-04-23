import { Composer } from 'grammy';

import type { AppContext, MessageCtx } from '~/core';

import * as handlers from './handlers';

const composer = new Composer<AppContext>();

composer.command('reg', ctx => handlers.regStartMessageHandler(ctx as unknown as MessageCtx));

composer.on('message:text').filter(
	ctx => ctx.session.flow.name === 'REGISTRATION',
	handlers.regNameStateMessageHandler,
);

export default composer;
