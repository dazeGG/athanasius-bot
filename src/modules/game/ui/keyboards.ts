import type { RawButtons } from '~/core';
import { DB } from '~/db';
import type { GameId } from '~/db';
import type { CardName } from '~/entities/deck';
import { CARDS_VIEW_MAP, RANKS_MAP } from '~/entities/deck';
import type { Game, PlayerId, Suits } from '~/entities/game';
import { TurnStage } from '~/entities/game';

import { DECKS_COUNT } from '../config';

/* KEYBOARDS */
export const kb: ModuleKeyboards = {
	start: [
		[{ text: 'Начать игру', callback_data: { module: 'game', action: 'start' } }],
	],
} as const;

/* GENERABLE KEYBOARDS */
export const gkb = {
	gameStarted: (gameId: GameId) => [
		[{ text: 'Посмотреть мои карты', callback_data: { module: 'game', action: 'started', meta: `${gameId}#mc` } }],
		[{ text: 'Собранные Афанасии', callback_data: { module: 'game', action: 'started', meta: `${gameId}#a` } }],
		// [{ text: 'Отправить игровое сообщение повторно', callback_data: { module: 'game', action: 'started', meta: `${gameId}#rgm` } }],
	],

	playersSelect: (me: PlayerId, gameId: GameId, playerIds: PlayerId[]): RawButtons => {
		const playersExceptMe = playerIds.filter(playerId => playerId !== me);
		const players = DB.data.users.filter(user => playersExceptMe.includes(user.id));

		return players.map(player => [{
			text: player.name,
			callback_data: { module: 'g', action: 't', meta: `${TurnStage.player}#${gameId}#${player.id}` },
		}]);
	},

	cardSelect: (me: PlayerId, game: Game, playerId: PlayerId): RawButtons => {
		const myHand = game.getHand(me);

		if (!myHand) {
			throw new Error('Cannot get my hand');
		}

		const uniqueCardNames = Array.from(new Set(myHand.cardsInHand.map(card => card.name)));

		uniqueCardNames.sort((a, b) => RANKS_MAP[a] - RANKS_MAP[b]);

		const distributedCardNames = uniqueCardNames.reduce((acc: [CardName[]], cardName) => {
			if (acc[acc.length - 1].length === 4) {
				acc.push([]);
			}

			acc[acc.length - 1].push(cardName);

			return acc;
		}, [[]]);

		return distributedCardNames.map(row => row.map(cardName => ({
			text: CARDS_VIEW_MAP[cardName],
			callback_data: { module: 'g', action: 't', meta: `${TurnStage.card}#${game.gameId}#${playerId}#${cardName}` },
		})));
	},

	countSelect: (gameId: GameId, playerId: PlayerId, cardName: CardName, count: number): RawButtons => {
		const actionButtons = [];
		const baseMeta = `${TurnStage.count}#${gameId}#${playerId}#${cardName}#${count}`;

		if (count > 1) {
			actionButtons.push({ text: '-', callback_data: { module: 'g',action: 't',meta: baseMeta + '-' } });
		}

		if (count < DECKS_COUNT * 4 - 1) {
			actionButtons.push({ text: '+', callback_data: { module: 'g',action: 't',meta: baseMeta + '+' } });
		}

		return [
			actionButtons,
			[{ text: 'Выбрать', callback_data: { module: 'g',action: 't',meta: baseMeta + 'select' } }],
		];
	},

	colorsSelect: (gameId: GameId, playerId: PlayerId, cardName: CardName, count: number, redCount: number): RawButtons => {
		const actionButtons = [];
		const baseMeta = `${TurnStage.colors}#${gameId}#${playerId}#${cardName}#${count}#${redCount}`;

		if (redCount > 0) {
			actionButtons.push({ text: '-', callback_data: { module: 'g', action: 't', meta: baseMeta + '-' } });
		}

		if (redCount < count) {
			actionButtons.push({ text: '+', callback_data: { module: 'g', action: 't', meta: baseMeta + '+' } });
		}

		return [
			actionButtons,
			[{ text: 'Выбрать', callback_data: { module: 'g', action: 't', meta: baseMeta + 'select' } }],
		];
	},

	suitsSelect: (gameId: GameId, playerId: PlayerId, cardName: CardName, count: number, redCount: number, suits: Suits): RawButtons => {
		const actionButtons = [];
		const baseMeta = `${TurnStage.suits}#${gameId}#${playerId}#${cardName}#${count}#${redCount}#${suits.hearts}!${suits.diamonds}!${suits.spades}!${suits.clubs}!${suits.mode}`;

		if (redCount > 0) {
			if (suits.mode === '+' || (suits.mode === '-' && suits.hearts !== 0)) {
				actionButtons.push({
					text: '♥️',
					callback_data: {
						module: 'g',
						action: 't',
						meta: baseMeta + '!h',
					},
				});
			}

			if (suits.mode === '+' || (suits.mode === '-' && suits.diamonds !== 0)) {
				actionButtons.push({
					text: '♦️',
					callback_data: {
						module: 'g',
						action: 't',
						meta: baseMeta + '!d',
					},
				});
			}
		}

		if (redCount !== count) {
			if (suits.mode === '+' || (suits.mode === '-' && suits.spades !== 0)) {
				actionButtons.push({
					text: '♠️',
					callback_data: {
						module: 'g',
						action: 't',
						meta: baseMeta + '!s',
					},
				});
			}

			if (suits.mode === '+' || (suits.mode === '-' && suits.clubs !== 0)) {
				actionButtons.push({
					text: '♣️',
					callback_data: {
						module: 'g',
						action: 't',
						meta: baseMeta + '!c',
					},
				});
			}
		}

		const keyboard = [
			actionButtons,
			[{
				text: 'mode: ' + suits.mode,
				callback_data: { module: 'g', action: 't', meta: baseMeta + '!m' },
			}],
		];

		if (
			suits.hearts + suits.diamonds + suits.spades + suits.clubs === count
			&& suits.hearts + suits.diamonds === redCount
			&& suits.spades + suits.clubs === count - redCount
		) {
			keyboard.push([{ text: 'Выбрать', callback_data: { module: 'g', action: 't', meta: baseMeta + '!select' } }]);
		}

		return keyboard;
	},
} as const;
