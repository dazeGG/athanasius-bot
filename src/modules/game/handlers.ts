import type { CallbackContext, MessageContext, SendMessageOptions } from '~/core';
import { BOT, DB } from '~/core';

import * as lib from './lib';
import { Game } from './model';
import { TurnStage } from './types';

const DECKS_COUNT = 2;

export const gameCommandHandler = async (ctx: MessageContext) => {
	const game = DB.data.games[0];

	if (!game) {
		const players = DB.data.users.map(user => user.id);

		const gameInfoText = lib.txt.notStarted + '\n' +
			'\n' +
			lib.txt.players + ':\n' +
			players.map(playerId => {
				const user = DB.data.users.find(user => user.id === playerId);
				return '• ' + (user ? user.name : `Игрок не найден (id: ${playerId})`);
			}).join('\n') + '\n' +
			'\n' +
			lib.txt.gameSettings + ':\n' +
			'• ' + lib.txt.decksCount + ': ' + DECKS_COUNT;

		const sendMessageOptions: SendMessageOptions = { ctx, text: gameInfoText };

		if (players.length >= 2) {
			sendMessageOptions.keyboard = lib.kb.start;
		} else {
			sendMessageOptions.text += '\n\n' + lib.txt.playersCountError;
		}

		await BOT.sendMessage(sendMessageOptions);
		return;
	}

	await BOT.sendMessage({ ctx, text: lib.txt.ongoing });
};

export const gameStartCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);

	const players = DB.data.users.map(user => user.id);
	const game = new Game({ players, decksCount: DECKS_COUNT });

	await game.save();

	for (const playerId of players) {
		await BOT.sendMessageByChatId({ chatId: playerId, text: lib.txt.gameStarted });
	}

	await BOT.sendMessageByChatId({
		chatId: game.activePlayer,
		text: lib.txt.turnFirstMessage,
		keyboard: lib.gkb.playersSelect(game.activePlayer, game.gameId, players),
	});
};

export const gameTurnCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);

	const { meta: callbackMeta } = ctx.callback.data;

	if (!callbackMeta) {
		await BOT.sendMessage({ ctx, text: 'No game metadata!' });
		return;
	}

	const turnMeta = lib.parseTurnMeta(callbackMeta);

	const user = DB.data.users.find(user => user.id === turnMeta.playerId);

	if (!user) {
		await BOT.sendMessage({ ctx, text: 'Select player error!' });
		return;
	}

	console.log(turnMeta);

	switch (turnMeta.stage) {
	case TurnStage.player:
		await BOT.editMessage({
			ctx,
			text: '<b>' + lib.txt.yourChoice + ':</b>\n' +
					'• Игрок: ' + '<b>' + user.name + '</b>\n' +
				'\n' +
				lib.txt.turnCardSelect,
			keyboard: lib.gkb.cardSelect(ctx.callback.from.id, turnMeta.gameId, turnMeta.playerId),
		});
		break;
	}
};
