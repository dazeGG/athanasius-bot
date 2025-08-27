import type { CallbackContext, MessageContext, SendMessageOptions } from '~/core';
import { BOT } from '~/core';
import { DB, ORM } from '~/db';
import { BaseDeck } from '~/entities/deck';
import { Game, TurnStage } from '~/entities/game';

import { DECKS_COUNT } from './config';
import { parseTurnMeta } from './lib';
import { GameMessage, InfoMessage, txt, gkb, kb } from './ui';

export const gameCommandHandler = async (ctx: MessageContext) => {
	const game = DB.data.games[0];

	if (!game) {
		const players = DB.data.users.map(user => user.id);

		const gameInfoText = txt.notStarted + '\n' +
			'\n' +
			txt.players + ':\n' +
			players.map(playerId => {
				const user = DB.data.users.find(user => user.id === playerId);
				return '• ' + (user ? user.name : `Игрок не найден (id: ${playerId})`);
			}).join('\n') + '\n' +
			'\n' +
			txt.gameSettings + ':\n' +
			'• ' + txt.decksCount + ': ' + DECKS_COUNT;

		const sendMessageOptions: SendMessageOptions = { ctx, text: gameInfoText };

		if (players.length >= 2) {
			sendMessageOptions.keyboard = kb.start;
		} else {
			sendMessageOptions.text += '\n\n' + txt.playersCountError;
		}

		await BOT.sendMessage(sendMessageOptions);
		return;
	}

	await BOT.sendMessage({ ctx, text: txt.ongoing, keyboard: gkb.gameStarted(game.id) });
};

export const gameStartCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);

	const players = DB.data.users.map(user => user.id);
	const game = new Game({ players, decksCount: DECKS_COUNT });

	await game.save();

	await game.mailing({ text: InfoMessage.gameStartedMailing() });
	await BOT.sendMessageByChatId(GameMessage.getFirstMessage(game, true));
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
		await BOT.sendMessageByChatId(GameMessage.getFirstMessage(game, false));
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

	switch (turnMeta.stage) {
	case TurnStage.player:
		await BOT.editMessage(GameMessage.getCardSelectMessageOptions(ctx, turnMeta, game));
		break;

	case TurnStage.card:
		const { success } = await game.turn({ me: me.id, turnMeta, options: { cardName: turnMeta.cardName } });

		if (success) {
			await BOT.editMessage(GameMessage.getCountSelectMessageOptions(ctx, turnMeta));
		} else {
			await BOT.editMessage(InfoMessage.wrongCardMe(ctx, turnMeta));
			await game.mailing({ text: InfoMessage.wrongCardMailing(turnMeta, me) }, [me.id, ...game.playersWithComposedUpdated]);
			await BOT.sendMessageByChatId(GameMessage.getFirstMessage(game, false));
		}
		break;

	case TurnStage.count:
		if (turnMeta.countAction === 'select') {
			const { success } = await game.turn({ me: me.id, turnMeta, options: { cardName: turnMeta.cardName, count: turnMeta.count } });

			if (success) {
				await BOT.editMessage(GameMessage.getColorsSelectMessageOptions(ctx, turnMeta));
			} else {
				await BOT.editMessage(InfoMessage.wrongCountMe(ctx, turnMeta));
				await game.mailing({ text: InfoMessage.wrongCountMailing(turnMeta, me) }, [me.id, ...game.playersWithComposedUpdated]);
				await BOT.sendMessageByChatId(GameMessage.getFirstMessage(game, false));
			}
		} else {
			await BOT.editMessage(GameMessage.getCountSelectMessageOptions(ctx, turnMeta));
		}
		break;

	case TurnStage.colors:
		if (turnMeta.redCountAction === 'select') {
			const { success } = await game.turn({
				me: me.id,
				turnMeta,
				options: { cardName: turnMeta.cardName, colors: { red: turnMeta.redCount, black: turnMeta.blackCount } },
			});

			if (success) {
				await BOT.editMessage(GameMessage.getSuitsSelectMessageOptions(ctx, turnMeta));
			} else {
				await BOT.editMessage(InfoMessage.wrongColorsMe(ctx, turnMeta));
				await game.mailing({ text: InfoMessage.wrongColorsMailing(turnMeta, me) }, [me.id, ...game.playersWithComposedUpdated]);
				await BOT.sendMessageByChatId(GameMessage.getFirstMessage(game, false));
			}
		} else {
			await BOT.editMessage(GameMessage.getColorsSelectMessageOptions(ctx, turnMeta));
		}
		break;

	case TurnStage.suits:
		if (turnMeta.suits?.action === 'select') {
			const { success, composeAthanasius, gameEnded } = await game.turn({
				me: me.id,
				turnMeta,
				options: { cardName: turnMeta.cardName, suits: turnMeta.suits },
			});

			if (success) {
				await BOT.editMessage(GameMessage.getCardsStealMessage(ctx, turnMeta));

				if (composeAthanasius) {
					await BOT.sendMessage(InfoMessage.newAthanasiusMe(ctx, turnMeta));
					await game.mailing({ text: InfoMessage.newAthanasiusMailing(turnMeta, me) }, [me.id, ...game.playersWithComposedUpdated]);
				}

				if (gameEnded) {
					const playerStats = game.allPlayers.map(playerId => {
						const user = DB.data.users.find(u => u.id === playerId);
						return {
							playerId,
							username: user?.username,
							count: game.getCountAthanasiuses(playerId),
						};
					});
					const maxCount = Math.max(...playerStats.map(stat => stat.count));
					const winners = playerStats
						.filter(stat => stat.count === maxCount && stat.count > 0)
						.map(stat => stat.username)
						.filter((name): name is string => name !== undefined);

					await game.mailing({ text: InfoMessage.gameEndedMailing(winners, maxCount) });
					return;
				}
			} else {
				await BOT.editMessage(InfoMessage.wrongSuitsMe(ctx, turnMeta));
				await game.mailing({ text: InfoMessage.wrongSuitsMailing(turnMeta, me) }, [me.id, ...game.playersWithComposedUpdated]);
			}

			await BOT.sendMessageByChatId(GameMessage.getFirstMessage(game, false));
		} else {
			await BOT.editMessage(GameMessage.getSuitsSelectMessageOptions(ctx, turnMeta));
		}
		break;
	}
};
