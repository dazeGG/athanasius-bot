import { BOT } from '~/core';
import type TelegramBot from 'node-telegram-bot-api';

import { ORM } from '~/db';
import { Deck } from '~/entities/deck';
import { Game } from '~/entities/game';
import type { MessageContext, CallbackContext , EditMessageOptions } from '~/core';

import * as ui from './ui';

const getHandsOptions = (me: TelegramBot.User) => {
	const gamesWithMe = ORM.Games.getActiveWithMe(me.id);

	if (gamesWithMe.length === 0) {
		return { text: ui.txt.noActiveGames };
	} else {
		return { text: ui.txt.chooseGame, keyboard: ui.gkb.gamesList(gamesWithMe) };
	}
};

const getHandShowOptions = (ctx: CallbackContext): EditMessageOptions => {
	const { from: me, data: { meta: gameId } } = ctx.callback;

	if (!gameId) {
		throw new Error('Game id required');
	}

	const game = new Game({ id: gameId });
	const room = ORM.Rooms.getById(game.getRoomId());
	const hand = game.getHand(me.id);

	if (!hand) {
		throw new Error('Hand not found');
	}

	return {
		ctx,
		text: `Комната ${room.name}\n\n${Deck.getMyHandView(hand.cardsInHand)}`,
		keyboard: ui.gkb.hand(game),
	};
};

export const handMessageHandler = async (ctx: MessageContext) => {
	await BOT.deleteMessage(ctx);
	await BOT.sendMessage({ ctx, ...getHandsOptions(ctx.message.from) });
};

export const handShowCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);
	await BOT.editMessage(getHandShowOptions(ctx));
};

export const handCloseCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.deleteMessage(ctx);
};

export const handBackCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);
	await BOT.editMessage({ ctx, ...getHandsOptions(ctx.callback.from) });
};
