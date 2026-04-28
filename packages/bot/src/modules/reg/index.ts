import { Composer } from 'grammy';

import type { AppContext } from '~/core';

import * as handlers from './handlers';

const composer = new Composer<AppContext>();

composer.command('reg', handlers.regStartMessageHandler);

composer.on('message:text').filter(
	ctx => ctx.session.flow.name === 'REGISTRATION',
	handlers.regNameStateMessageHandler,
);

export default composer;
