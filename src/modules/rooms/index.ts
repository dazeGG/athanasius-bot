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

composer.on('callback_query:data').filter(
	ctx => ctx.callbackData?.module === 'rooms' && ctx.callbackData?.action === 'join' && isRegistered(ctx),
	handlers.joinRoomCallbackHandler,
);

composer.on('callback_query:data').filter(
	ctx => ctx.callbackData?.module === 'room' && ctx.callbackData?.action === 'kick' && isRegistered(ctx),
	handlers.kickCallbackHandler,
);

composer.on('callback_query:data').filter(
	ctx => ctx.callbackData?.module === 'room' && ctx.callbackData?.action === 'leave' && isRegistered(ctx),
	handlers.leaveRoomCallbackHandler,
);

composer.on('callback_query:data').filter(
	ctx => ctx.callbackData?.module === 'rooms' && ctx.callbackData?.action === 'create' && isRegistered(ctx),
	handlers.createRoomCallbackHandler,
);

composer.on('callback_query:data').filter(
	ctx => ctx.callbackData?.module === 'rooms' && ctx.callbackData?.action === 'open' && isRegistered(ctx),
	handlers.openRoomCallbackHandler,
);

composer.on('callback_query:data').filter(
	ctx => ctx.callbackData?.module === 'room' && ctx.callbackData?.action === 'start' && isRegistered(ctx),
	handlers.gameStartCallbackHandler,
);

composer.on('callback_query:data').filter(
	ctx => ctx.callbackData?.module === 'room' && ctx.callbackData?.action === 'getath' && isRegistered(ctx),
	handlers.gameGetAthanasiusesCallbackHandler,
);

composer.on('callback_query:data').filter(
	ctx => ctx.callbackData?.module === 'room' && ctx.callbackData?.action === 'whoseturn' && isRegistered(ctx),
	handlers.gameWhoseTurnCallbackHandler,
);

composer.on('callback_query:data').filter(
	ctx => ctx.callbackData?.module === 'room' && ctx.callbackData?.action === 'sendturnmsg' && isRegistered(ctx),
	handlers.gameSendTurnMessageCallbackHandler,
);

composer.on('callback_query:data').filter(
	ctx => ctx.callbackData?.module === 'rooms' && ctx.callbackData?.back === true && isRegistered(ctx),
	handlers.backCallbackHandler,
);

composer.on('callback_query:data').filter(
	ctx => ctx.callbackData?.module === 'room' && ctx.callbackData?.action === 'settings' && isRegistered(ctx),
	SettingsHandlers.start,
);

composer.on('callback_query:data').filter(
	ctx => ctx.callbackData?.module === 'room' && ctx.callbackData?.action === 'cjc' && isRegistered(ctx),
	SettingsHandlers.changeJoinCode,
);

composer.on('callback_query:data').filter(
	ctx => ctx.callbackData?.module === 'room' && ctx.callbackData?.action === 'cdc' && isRegistered(ctx),
	SettingsHandlers.changeDecksCount,
);

export default composer;
