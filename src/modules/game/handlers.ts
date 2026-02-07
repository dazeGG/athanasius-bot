import _ from 'lodash';

import { BOT } from '~/core';
import { DB, ORM } from '~/db';
import { Deck } from '~/entities/deck';
import { Game, TurnStage } from '~/entities/game';
import type { CallbackContext, MessageContext, SendMessageOptions } from '~/core';

import { DECKS_COUNT, PLAYERS_TO_START } from './config';
import { parseTurnMeta } from './lib';
import { GameMessage, InfoMessage, playersList, txt, gkb, kb, athanasiusesList } from './ui';

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
	await BOT.sendMessageByChatId({
		chatId: game.activePlayer.id,
		text: GameMessage.getFirstMessage(true),
		keyboard: gkb.playersSelect(game.activePlayer.id, game.gameId, game.allPlayers),
	});
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
		await BOT.sendMessageByChatId({
			chatId: game.activePlayer.id,
			text: GameMessage.getFirstMessage(false),
			keyboard: gkb.playersSelect(game.activePlayer.id, game.gameId, game.allPlayers),
		});
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
	case TurnStage.player: {
		await BOT.editMessage({
			ctx,
			text: GameMessage.getCardSelectMessage(turnMeta),
			keyboard: gkb.cardSelect(ctx.callback.from.id, game, turnMeta.player.id),
		});
		break;
	}

	case TurnStage.card: {
		const { success } = await game.turn({ me: me.id, turnMeta, options: { cardName: turnMeta.cardName } });

		if (!success) {
			await BOT.editMessage({ ctx, text: InfoMessage.wrongCardMe(turnMeta) });
			await game.mailing({ text: InfoMessage.wrongCardMailing(turnMeta, me) }, [me.id, ...game.playersWithComposedUpdated]);
			await BOT.sendMessageByChatId({
				chatId: game.activePlayer.id,
				text: GameMessage.getFirstMessage(false),
				keyboard: gkb.playersSelect(game.activePlayer.id, game.gameId, game.allPlayers),
			});
			break;
		}

		await BOT.editMessage({
			ctx,
			text: GameMessage.getCountSelectMessage(turnMeta, 1),
			keyboard: gkb.countSelect(turnMeta.gameId, turnMeta.player.id, turnMeta.cardName, 1),
		});
		break;
	}

	case TurnStage.count: {
		if (turnMeta.countAction !== 'select') {
			const newCount = turnMeta.countAction === '-' ? turnMeta.count - 1 : turnMeta.count + 1;

			await BOT.editMessage({
				ctx,
				text: GameMessage.getCountSelectMessage(turnMeta, newCount),
				keyboard: gkb.countSelect(turnMeta.gameId, turnMeta.player.id, turnMeta.cardName, newCount),
			});
			break;
		}

		const { success } = await game.turn({ me: me.id, turnMeta, options: { cardName: turnMeta.cardName, count: turnMeta.count } });

		if (!success) {
			await BOT.editMessage({ ctx, text: InfoMessage.wrongCountMe(turnMeta) });
			await game.mailing({ text: InfoMessage.wrongCountMailing(turnMeta, me) }, [me.id, ...game.playersWithComposedUpdated]);
			await BOT.sendMessageByChatId({
				chatId: game.activePlayer.id,
				text: GameMessage.getFirstMessage(false),
				keyboard: gkb.playersSelect(game.activePlayer.id, game.gameId, game.allPlayers),
			});
			break;
		}

		await BOT.editMessage({
			ctx,
			text: GameMessage.getColorsSelectMessage(turnMeta, 0),
			keyboard: gkb.colorsSelect(turnMeta.gameId, turnMeta.player.id, turnMeta.cardName, turnMeta.count, 0),
		});
		break;
	}

	case TurnStage.colors: {
		if (turnMeta.redCountAction !== 'select') {
			const newRedCount = turnMeta.redCountAction === '-' ? turnMeta.redCount - 1 : turnMeta.redCount + 1;

			await BOT.editMessage({
				ctx,
				text: GameMessage.getColorsSelectMessage(turnMeta, newRedCount),
				keyboard: gkb.colorsSelect(turnMeta.gameId, turnMeta.player.id, turnMeta.cardName, turnMeta.count, newRedCount),
			});
			break;
		}

		const { success } = await game.turn({
			me: me.id,
			turnMeta,
			options: { cardName: turnMeta.cardName, colors: { red: turnMeta.redCount, black: turnMeta.blackCount } },
		});

		if (!success) {
			await BOT.editMessage({ ctx, text: InfoMessage.wrongColorsMe(turnMeta) });
			await game.mailing({ text: InfoMessage.wrongColorsMailing(turnMeta, me) }, [me.id, ...game.playersWithComposedUpdated]);
			await BOT.sendMessageByChatId({
				chatId: game.activePlayer.id,
				text: GameMessage.getFirstMessage(false),
				keyboard: gkb.playersSelect(game.activePlayer.id, game.gameId, game.allPlayers),
			});
			break;
		}

		await BOT.editMessage({
			ctx,
			text: GameMessage.getSuitsSelectMessage(turnMeta, { hearts: 0, diamonds: 0, spades: 0, clubs: 0, mode: '+' }),
			keyboard: gkb.suitsSelect(
				turnMeta.gameId,
				turnMeta.player.id,
				turnMeta.cardName,
				turnMeta.count,
				turnMeta.redCount,
				{ hearts: 0, diamonds: 0, spades: 0, clubs: 0, mode: '+' },
			),
		});
		break;
	}

	case TurnStage.suits: {
		if (turnMeta.suits?.action !== 'select') {
			const newSuits = _.cloneDeep(turnMeta.suits);

			const { mode, action } = turnMeta.suits;

			const actionSuitMap = { h: 'hearts', d: 'diamonds', s: 'spades', c: 'clubs' } as const;

			switch (action) {
			case 'h':
			case 'd':
			case 's':
			case 'c':
				newSuits[actionSuitMap[action]] = mode === '+'
					? newSuits[actionSuitMap[action]] + 1
					: newSuits[actionSuitMap[action]] !== 0 ? newSuits[actionSuitMap[action]] - 1 : newSuits[actionSuitMap[action]];
				break;
			case 'm':
				newSuits.mode = newSuits.mode === '+' ? '-' : '+';
				break;
			}

			await BOT.editMessage({
				ctx,
				text: GameMessage.getSuitsSelectMessage(turnMeta, newSuits),
				keyboard: gkb.suitsSelect(
					turnMeta.gameId,
					turnMeta.player.id,
					turnMeta.cardName,
					turnMeta.count,
					turnMeta.redCount,
					newSuits,
				),
			});
			break;
		}

		const { success, composeAthanasius, gameEnded } = await game.turn({
			me: me.id,
			turnMeta,
			options: { cardName: turnMeta.cardName, suits: turnMeta.suits },
		});

		if (!success) {
			await BOT.editMessage({ ctx, text: InfoMessage.wrongSuitsMe(turnMeta) });
			await game.mailing({ text: InfoMessage.wrongSuitsMailing(turnMeta, me) }, [me.id, ...game.playersWithComposedUpdated]);
			await BOT.sendMessageByChatId({
				chatId: game.activePlayer.id,
				text: GameMessage.getFirstMessage(false),
				keyboard: gkb.playersSelect(game.activePlayer.id, game.gameId, game.allPlayers),
			});
			break;
		}

		await BOT.editMessage({ ctx, text: GameMessage.getCardsStealMessage(turnMeta) });
		await game.mailing({ text: InfoMessage.stealCardsMailing(turnMeta, me) }, [me.id, ...game.playersWithComposedUpdated]);

		if (composeAthanasius) {
			await BOT.editMessage({ ctx, text: InfoMessage.newAthanasiusMe(turnMeta) });
			await game.mailing({ text: InfoMessage.newAthanasiusMailing(turnMeta, me) }, [me.id, ...game.playersWithComposedUpdated]);
		}

		if (gameEnded) {
			const playerStats = game.allPlayers.map(playerId => {
				const user = DB.data.users.find(u => u.id === playerId);
				return {
					playerId,
					name: user?.name,
					count: game.getCountAthanasiuses(playerId),
				};
			});
			const maxCount = Math.max(...playerStats.map(stat => stat.count));
			const winners = playerStats
				.filter(stat => stat.count === maxCount && stat.count > 0)
				.map(stat => stat.name ?? 'noname');

			await game.mailing({ text: InfoMessage.gameEndedMailing(winners, maxCount) });
			break;
		}

		await BOT.sendMessageByChatId({
			chatId: game.activePlayer.id,
			text: GameMessage.getFirstMessage(false),
			keyboard: gkb.playersSelect(game.activePlayer.id, game.gameId, game.allPlayers),
		});
		break;
	}
	}
};
