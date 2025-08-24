import type { CallbackContext, MessageContext, SendMessageOptions } from '~/core';
import { BaseDeck } from '~/core';
import { BOT, DB } from '~/core';

import * as lib from './lib';
import { DECKS_COUNT } from './config';
import { Game } from './model';
import { TurnStage } from './types';

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

	await BOT.sendMessage({ ctx, text: lib.txt.ongoing, keyboard: lib.gkb.gameStarted(game.id) });
};

export const gameStartCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);

	const players = DB.data.users.map(user => user.id);
	const game = new Game({ players, decksCount: DECKS_COUNT });

	await game.save();

	await game.mailing({ text: lib.InfoMessage.gameStartedMailing() });

	await BOT.sendMessageByChatId(lib.GameMessage.getFirstMessage(game, true));
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

		await BOT.editMessage({ ctx, text: BaseDeck.displayDeck(BaseDeck.sortByValue(hand.cardsInHand)).join(' ') });
		break;
	case 'rgm':
		await BOT.sendMessageByChatId(lib.GameMessage.getFirstMessage(game, false));
		await BOT.editMessage({ ctx, text: lib.txt.gameMessageResendSuccess });
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

	const turnMeta = lib.parseTurnMeta(callbackMeta);
	const game = new Game({ id: turnMeta.gameId });
	const me = DB.data.users.find(user => user.id === ctx.callback.from.id);

	if (!me) {
		return;
	}

	switch (turnMeta.stage) {
	case TurnStage.player:
		await BOT.editMessage(lib.GameMessage.getCardSelectMessageOptions(ctx, turnMeta, game));
		break;

	case TurnStage.card:
		const turn = await game.turn(turnMeta.player.id, { cardName: turnMeta.cardName });

		if (turn.success) {
			await BOT.editMessage(lib.GameMessage.getCountSelectMessageOptions(ctx, turnMeta));
		} else {
			await BOT.editMessage(lib.InfoMessage.wrongCardMe(ctx, turnMeta));
			await game.mailing({ text: lib.InfoMessage.wrongCardMailing(turnMeta, me) }, [me.id]);

			if (turn.moveGoneNext) {
				await BOT.sendMessageByChatId(lib.GameMessage.getFirstMessage(game, false));
			}
		}
		break;

	case TurnStage.count:
		if (turnMeta.countAction === 'select') {
			const turn = await game.turn(turnMeta.player.id, { cardName: turnMeta.cardName, count: turnMeta.count });

			if (turn.success) {
				await BOT.editMessage(lib.GameMessage.getColorsSelectMessageOptions(ctx, turnMeta));
			} else {
				await BOT.editMessage(lib.InfoMessage.wrongCountMe(ctx, turnMeta));
				await game.mailing({ text: lib.InfoMessage.wrongCountMailing(turnMeta, me) }, [me.id]);

				if (turn.moveGoneNext) {
					await BOT.sendMessageByChatId(lib.GameMessage.getFirstMessage(game, false));
				}
			}
		} else {
			await BOT.editMessage(lib.GameMessage.getCountSelectMessageOptions(ctx, turnMeta));
		}
		break;

	case TurnStage.colors:
		if (turnMeta.redCountAction === 'select') {
			const turn = await game.turn(
				turnMeta.player.id,
				{ cardName: turnMeta.cardName, colors: { red: turnMeta.redCount, black: turnMeta.blackCount } },
			);

			if (turn.success) {
				await BOT.editMessage(lib.GameMessage.getSuitsSelectMessageOptions(ctx, turnMeta));
			} else {
				await BOT.editMessage(lib.InfoMessage.wrongColorsMe(ctx, turnMeta));
				await game.mailing({ text: lib.InfoMessage.wrongColorsMailing(turnMeta, me) }, [me.id]);

				if (turn.moveGoneNext) {
					await BOT.sendMessageByChatId(lib.GameMessage.getFirstMessage(game, false));
				}
			}
		} else {
			await BOT.editMessage(lib.GameMessage.getColorsSelectMessageOptions(ctx, turnMeta));
		}
		break;

	case TurnStage.suits:
		if (turnMeta.suits?.action === 'select') {
			const turn = await game.turn(turnMeta.player.id, { cardName: turnMeta.cardName, suits: { ...turnMeta.suits } });

			if (turn.success) {
				await BOT.editMessage(lib.GameMessage.getCardsStealMessage(ctx, turnMeta));
				const newAthanasiuses = await game.moveCards(me.id, turnMeta.player.id, turnMeta.cardName);

				if (newAthanasiuses.length > 0) {
					await BOT.sendMessage({ ctx, text: `У ТЕБЯ НОВЫЙ АФАНАСИЙ ПОЗДРАВЛЯЮ!!! ${newAthanasiuses}` });
				}
			} else {
				await BOT.editMessage(lib.InfoMessage.wrongSuitsMe(ctx, turnMeta));
				await game.mailing({ text: lib.InfoMessage.wrongSuitsMailing(turnMeta, me) }, [me.id]);
			}

			await BOT.sendMessageByChatId(lib.GameMessage.getFirstMessage(game, false));
		} else {
			await BOT.editMessage(lib.GameMessage.getSuitsSelectMessageOptions(ctx, turnMeta));
		}
		break;
	}
};
