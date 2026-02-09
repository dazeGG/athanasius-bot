import { BOT } from '~/core';
import type TelegramBot from 'node-telegram-bot-api';

import { ORM } from '~/db';
import { Deck } from '~/entities/deck';
import { Game } from '~/entities/game';
import type { MessageContext, CallbackContext } from '~/core';

import * as ui from './ui';

const getHandsOptions = (me: TelegramBot.User) => {
	const gamesWithMe = ORM.Games.getActiveWithMe(me.id);

	if (gamesWithMe.length === 0) {
		return { text: ui.txt.noActiveGames };
	} else {
		return { text: ui.txt.chooseGame, keyboard: ui.gkb.roomsList(gamesWithMe) };
	}
};

export const handMessageHandler = async (ctx: MessageContext) => {
	await BOT.deleteMessage(ctx);
	await BOT.sendMessage({ ctx, ...getHandsOptions(ctx.message.from) });
};

export const handShowCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);
	const { from: me, data: { meta: gameId } } = ctx.callback;

	if (!gameId) {
		throw new Error('Game id required');
	}

	const game = gameId ? new Game({ id: gameId }) : null;

	if (!game) {
		return;
	}

	const hand = game.getHand(me.id);

	if (!hand) {
		return;
	}

	await BOT.sendMessage({ ctx, text: Deck.getMyHandView(hand.cardsInHand), keyboard: ui.kb.handBack });
};

export const handCloseCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.deleteMessage(ctx);
};

export const handBackCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);
	await BOT.editMessage({ ctx, ...getHandsOptions(ctx.callback.from) });
};
