import { Composer } from 'grammy';

import type { AppContext } from '~/core';

import * as handlers from './handlers';

const composer = new Composer<AppContext>();

composer.command('start', handlers.startCommandHandler);

export default composer;
