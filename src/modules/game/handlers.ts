import { BOT } from '~/core';
import { DB, ORM } from '~/db';
import { Deck } from '~/entities/deck';
import { Game } from '~/entities/game';

import type { CallbackContext, MessageContext, SendMessageOptions } from '~/core';

import { GameLogicService, GameNotificationsService } from './services';
import { DECKS_COUNT, PLAYERS_TO_START } from './config';
import { parseTurnMeta } from './lib';
import { InfoMessage, playersList, txt, gkb, kb, athanasiusesList } from './ui';

export const gameCommandHandler = async (ctx: MessageContext) => {
	await BOT.deleteMessage(ctx);

	const activeGame = ORM.Games.getActive();
	const players = DB.data.users.map(user => user.id);

	const gameInfoText = txt.players + ':\n' +
		playersList(players) + '\n' +
		'\n' +
		txt.gameSettings + ':\n' +
		'• ' + txt.decksCount + ': ' + DECKS_COUNT;

	if (!activeGame) {
		const sendMessageOptions: SendMessageOptions = { ctx, text: txt.notStarted + '\n\n' + gameInfoText };

		if (players.length >= PLAYERS_TO_START) {
			sendMessageOptions.keyboard = kb.start;
		} else {
			sendMessageOptions.text += '\n\n' + txt.playersCountError;
		}

		await BOT.sendMessage(sendMessageOptions);
	} else {
		const activePlayer = ORM.Users.get(activeGame.players[0]);

		await BOT.sendMessage({
			ctx,
			text: txt.ongoing + '\n\n' + gameInfoText + '\n\n' + `Сейчас ход игрока <b>${activePlayer.name}</b>`,
			keyboard: gkb.gameStarted(activeGame.id),
		});
	}
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

export const gameStartedCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);

	if (!ctx.callback.data.meta) {
		throw new Error('Game started meta is required!');
	}

	const [gameId, action] = ctx.callback.data.meta?.split('#');
	const game = gameId ? new Game({ id: gameId }) : null;

	if (!game) {
		throw new Error('Could not find the game!');
	}

	switch (action) {
	case 'mc':
		const hand = game.getHand(ctx.callback.from.id);

		if (!hand) {
			throw new Error('Could not find player\'s hand!');
		}

		await BOT.editMessage({ ctx, text: Deck.getMyHandView(hand.cardsInHand) });
		break;
	case 'a':
		await BOT.editMessage({ ctx, text: '<b>Собранные Афанасии:</b>\n' + athanasiusesList(game) });
		break;
	case 'rgm':
		await GameNotificationsService.sendFirstMessage(game);
		await BOT.editMessage({ ctx, text: txt.gameMessageResendSuccess });
		break;
	}
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
