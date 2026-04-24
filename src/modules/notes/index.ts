import { Composer } from 'grammy';

import { isRegistered } from '~/shared/lib';
import type { AppContext } from '~/core';

import * as handlers from './handlers';

const composer = new Composer<AppContext>();
const registered = composer.filter(isRegistered);

registered.hears('Заметки', handlers.notesMessageHandler);
registered.callbackQuery(/^notes:exit:/, handlers.notesExitCallbackHandler);
registered.callbackQuery(/^notes:games:/, handlers.notesGamesCallbackHandler);
registered.callbackQuery(/^notes:rank:/, handlers.notesRankCallbackHandler);
registered.callbackQuery(/^notes:grid:/, handlers.notesGridCallbackHandler);
registered.callbackQuery(/^notes:cycle:/, handlers.notesCycleCallbackHandler);
registered.callbackQuery(/^notes:suit:/, handlers.notesSuitCallbackHandler);

export default composer;
