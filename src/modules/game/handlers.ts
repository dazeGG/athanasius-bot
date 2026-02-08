import { BOT } from '~/core';
import { DB, ORM } from '~/db';
import { Deck } from '~/entities/deck';
import { Game } from '~/entities/game';

import type { CallbackContext, MessageContext, SendMessageOptions } from '~/core';

import { GameLogicService, GameNotificationsService } from './services';
import { DECKS_COUNT, PLAYERS_TO_START } from './config';
import { parseTurnMeta } from './lib';
import { InfoMessage, playersList, txt, kb, athanasiusesList } from './ui';

export const gameCommandHandler = async (ctx: MessageContext) => {
	await BOT.deleteMessage(ctx);

	const players = DB.data.users.map(user => user.id);

	const gameInfoText = txt.players + ':\n' +
		playersList(players) + '\n' +
		'\n' +
		txt.gameSettings + ':\n' +
		'• ' + txt.decksCount + ': ' + DECKS_COUNT;

	const sendMessageOptions: SendMessageOptions = { ctx, text: txt.notStarted + '\n\n' + gameInfoText };

	if (players.length >= PLAYERS_TO_START) {
		sendMessageOptions.keyboard = kb.start;
	} else {
		sendMessageOptions.text += '\n\n' + txt.playersCountError;
	}

	await BOT.sendMessage(sendMessageOptions);
};

export const gameStartCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);
	await BOT.deleteMessage(ctx);

	const players = DB.data.users.map(user => user.id);
	const game = new Game({ players, decksCount: DECKS_COUNT });

	await game.save();

	await game.mailing({ text: InfoMessage.gameStartedMailing(playersList(players), DECKS_COUNT) });
	await GameNotificationsService.sendFirstMessage(game, true);
};

export const gameAthanasiusesMessageHandler = async (ctx: MessageContext) => {
	await BOT.deleteMessage(ctx);
	const gameId = ORM.Games.getActive()?.id;
	const game = gameId ? new Game({ id: gameId }) : null;

	if (!game) {
		return;
	}

	await BOT.sendMessage({ ctx, text: '<b>Собранные Афанасии:</b>\n' + athanasiusesList(game) });
};

export const gameHandMessageHandler = async (ctx: MessageContext) => {
	await BOT.deleteMessage(ctx);
	const gameId = ORM.Games.getActive()?.id;
	const game = gameId ? new Game({ id: gameId }) : null;

	if (!game) {
		return;
	}

	const hand = game.getHand(ctx.message.from.id);

	if (!hand) {
		return;
	}

	await BOT.sendMessage({ ctx, text: Deck.getMyHandView(hand.cardsInHand) });
};

export const gameWhoseTurnMessageHandler = async (ctx: MessageContext) => {
	await BOT.deleteMessage(ctx);
	const gameId = ORM.Games.getActive()?.id;
	const game = gameId ? new Game({ id: gameId }) : null;

	if (!game) {
		return;
	}

	await BOT.sendMessage({ ctx, text: game.activePlayer.name });
};

export const gameTurnCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);

	const { meta: callbackMeta } = ctx.callback.data;

	if (!callbackMeta) {
		await BOT.sendMessage({ ctx, text: 'No game metadata!' });
		return;
	}

	const turnMeta = parseTurnMeta(callbackMeta);
	const game = new Game({ id: turnMeta.gameId });
	const me = DB.data.users.find(u => u.id === ctx.callback.from.id);

	if (!me) {
		return;
	}

	await GameLogicService.processTurn({ ctx, game, me, turnMeta });
};
