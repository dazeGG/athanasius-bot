import { Composer } from 'grammy';

import type { AppContext } from '~/core';
import { globalKeyboardComposer } from '~/shared/lib';

import gameComposer from './game';
import handComposer from './hand';
import notesComposer from './notes';
import regComposer from './reg';
import roomsComposer from './rooms';
import settingsComposer from './settings';
import startComposer from './start';

const createModulesComposer = (): Composer<AppContext> => {
	const composer = new Composer<AppContext>();
	composer.use(globalKeyboardComposer);
	composer.use(gameComposer);
	composer.use(handComposer);
	composer.use(notesComposer);
	composer.use(regComposer);
	composer.use(roomsComposer);
	composer.use(settingsComposer);
	composer.use(startComposer);
	return composer;
};

export default createModulesComposer;
