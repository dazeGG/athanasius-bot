import { Composer } from 'grammy';

import { isRegistered } from '~/shared/lib';
import type { AppContext } from '~/core';

import * as handlers from './handlers';
import { SettingsHandlers } from './settings.handlers';

const composer = new Composer<AppContext>();
const registered = composer.filter(isRegistered);

// ── Message handlers ──────────────────────────────────────────────────────────

registered.hears('Комнаты', handlers.roomsMessageHandler);

registered.on('message:text').filter(
	ctx => ctx.session.flow.name === 'ROOMS_JOIN',
	handlers.joinRoomCodeMessageHandler,
);

registered.on('message:text').filter(
	ctx => ctx.session.flow.name === 'ROOMS_CREATE',
	handlers.createRoomNameMessageHandler,
);

registered.on('message:text').filter(
	ctx => ctx.session.flow.name === 'ROOM_CDC',
	SettingsHandlers.changeDecksCountMessage,
);

// ── Callback handlers ─────────────────────────────────────────────────────────

registered.callbackQuery(/^rooms:join:/, handlers.joinRoomCallbackHandler);
registered.callbackQuery(/^room:kick:/, handlers.kickCallbackHandler);
registered.callbackQuery(/^room:leave:/, handlers.leaveRoomCallbackHandler);
registered.callbackQuery(/^rooms:create:/, handlers.createRoomCallbackHandler);
registered.callbackQuery(/^rooms:open:/, handlers.openRoomCallbackHandler);
registered.callbackQuery(/^room:start:/, handlers.gameStartCallbackHandler);
registered.callbackQuery(/^room:delete:/, handlers.deleteRoomCallbackHandler);
registered.callbackQuery(/^room:getath:/, handlers.gameGetAthanasiusesCallbackHandler);
registered.callbackQuery(/^room:whoseturn:/, handlers.gameWhoseTurnCallbackHandler);
registered.callbackQuery(/^room:sendturnmsg:/, handlers.gameSendTurnMessageCallbackHandler);
registered.callbackQuery(/^rooms:back:/, handlers.backCallbackHandler);
registered.callbackQuery(/^room:settings:/, SettingsHandlers.start);
registered.callbackQuery(/^room:cjc:/, SettingsHandlers.changeJoinCode);
registered.callbackQuery(/^room:cdc:/, SettingsHandlers.changeDecksCount);

export default composer;
