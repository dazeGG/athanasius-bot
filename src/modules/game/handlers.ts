import { BOT, DB } from '~/core';
import type { MessageContext, CallbackContext , SendMessageOptions , GameId } from '~/core';

import * as lib from './lib';
import { Game } from './model';
import type { PlayerId } from './types';

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
	console.log(game);

	for (const playerId of players) {
		await BOT.sendMessageByChatId({ chatId: playerId, text: lib.txt.gameStarted });
	}

	await BOT.sendMessageByChatId({
		chatId: game.activePlayer,
		text: lib.txt.firstTurnMessage,
		keyboard: lib.gkb.playersSelect(game.activePlayer, game.gameId, players),
	});
};

interface TurnMeta {
	stage?: string;
	gameId?: GameId;
	playerId?: PlayerId;
}

export const gameTurnCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);

	const { meta: callbackMeta } = ctx.callback.data as { meta?: TurnMeta };

	if (!callbackMeta || !callbackMeta.stage || !callbackMeta.gameId || !callbackMeta.playerId) {
		await BOT.sendMessage({ ctx, text: 'Something went wrong!' });
		return;
	}

	const user = DB.data.users.find(user => user.id === callbackMeta.playerId);

	if (!user) {
		await BOT.sendMessage({ ctx, text: 'Select player error!' });
		return;
	}

	switch (callbackMeta.stage) {
	case 'player':
		await BOT.editMessage({
			ctx,
			text: '<b>Отлично!</b>\n' +
					'\n' +
					'Твой выбор:\n' +
					'• Игрок: ' + '<b>' + user.name + '</b>',
			keyboard: lib.gkb.cardSelect(ctx.callback.from.id, callbackMeta.gameId, callbackMeta.playerId),
		});
		break;
	}
};
