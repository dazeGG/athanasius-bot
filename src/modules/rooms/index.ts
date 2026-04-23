import { Composer } from 'grammy';

import { isRegistered } from '~/shared/lib';
import type { AppContext } from '~/core';

import * as handlers from './handlers';
import { SettingsHandlers } from './settings.handlers';

const composer = new Composer<AppContext>();

// ── Message handlers ──────────────────────────────────────────────────────────

composer.on('message:text').filter(
	ctx => ctx.message.text === 'Комнаты' && isRegistered(ctx),
	handlers.roomsMessageHandler,
);

composer.on('message:text').filter(
	ctx => ctx.session.flow.name === 'ROOMS_JOIN' && isRegistered(ctx),
	handlers.joinRoomCodeMessageHandler,
);

composer.on('message:text').filter(
	ctx => ctx.session.flow.name === 'ROOMS_CREATE' && isRegistered(ctx),
	handlers.createRoomNameMessageHandler,
);

composer.on('message:text').filter(
	ctx => ctx.session.flow.name === 'ROOM_CDC' && isRegistered(ctx),
	SettingsHandlers.changeDecksCountMessage,
);

// ── Callback handlers ─────────────────────────────────────────────────────────

composer.callbackQuery(/^rooms:join:/, ctx => isRegistered(ctx) && handlers.joinRoomCallbackHandler(ctx));
composer.callbackQuery(/^room:kick:/, ctx => isRegistered(ctx) && handlers.kickCallbackHandler(ctx));
composer.callbackQuery(/^room:leave:/, ctx => isRegistered(ctx) && handlers.leaveRoomCallbackHandler(ctx));
composer.callbackQuery(/^rooms:create:/, ctx => isRegistered(ctx) && handlers.createRoomCallbackHandler(ctx));
composer.callbackQuery(/^rooms:open:/, ctx => isRegistered(ctx) && handlers.openRoomCallbackHandler(ctx));
composer.callbackQuery(/^room:start:/, ctx => isRegistered(ctx) && handlers.gameStartCallbackHandler(ctx));
composer.callbackQuery(/^room:getath:/, ctx => isRegistered(ctx) && handlers.gameGetAthanasiusesCallbackHandler(ctx));
composer.callbackQuery(/^room:whoseturn:/, ctx => isRegistered(ctx) && handlers.gameWhoseTurnCallbackHandler(ctx));
composer.callbackQuery(/^room:sendturnmsg:/, ctx => isRegistered(ctx) && handlers.gameSendTurnMessageCallbackHandler(ctx));
composer.callbackQuery(/^rooms:back:/, ctx => isRegistered(ctx) && handlers.backCallbackHandler(ctx));
composer.callbackQuery(/^room:settings:/, ctx => isRegistered(ctx) && SettingsHandlers.start(ctx));
composer.callbackQuery(/^room:cjc:/, ctx => isRegistered(ctx) && SettingsHandlers.changeJoinCode(ctx));
composer.callbackQuery(/^room:cdc:/, ctx => isRegistered(ctx) && SettingsHandlers.changeDecksCount(ctx));

export default composer;
