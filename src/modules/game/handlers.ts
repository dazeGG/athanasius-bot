import { BOT, DB } from '~/core';
import type { MessageContext, CallbackContext , SendMessageOptions } from '~/core';

import * as lib from './lib';

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

		if (players.length >= 3) {
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
	console.log(ctx.callback.data);
};
