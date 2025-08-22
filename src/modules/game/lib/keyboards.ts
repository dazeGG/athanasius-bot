import { DB } from '~/core';
import type { RawButtons , GameId , CardName } from '~/core';

import { DECKS_COUNT } from '../config';
import type { Game } from '../model';
import type { PlayerId, Suits } from '../types';
import { RANKS_MAP } from '~/core/entities/deck/config';

/* KEYBOARDS */
export const kb: ModuleKeyboards = {
	start: [
		[{ text: 'Начать игру', callback_data: { module: 'game', action: 'start' } }],
	],
} as const;

/* GENERABLE KEYBOARDS */
export const gkb = {
	playersSelect: (me: PlayerId, gameId: GameId, playerIds: PlayerId[]): RawButtons => {
		const playersExceptMe = playerIds.filter(playerId => playerId !== me);
		const players = DB.data.users.filter(user => playersExceptMe.includes(user.id));

		return players.map(player =>
			[{ text: player.name, callback_data: { module: 'g', action: 't', meta: `${gameId}#${player.id}` } }]);
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

		return distributedCardNames.map(row => row.map(cardName =>
			({ text: cardName, callback_data: { module: 'g', action: 't', meta: `${game.gameId}#${playerId}#${cardName}` } })));
	},

	countSelect: (gameId: GameId, playerId: PlayerId, cardName: CardName, count: number): RawButtons => {
		const actionButtons = [];

		if (count > 1) {
			actionButtons.push({
				text: '-',
				callback_data: { module: 'g', action: 't', meta: `${gameId}#${playerId}#${cardName}#${count}-` },
			});
		}

		if (count < DECKS_COUNT * 4 - 1) {
			actionButtons.push({
				text: '+',
				callback_data: { module: 'g', action: 't', meta: `${gameId}#${playerId}#${cardName}#${count}+` },
			});
		}

		return [
			actionButtons,
			[{
				text: 'Выбрать',
				callback_data: { module: 'g', action: 't', meta: `${gameId}#${playerId}#${cardName}#${count}select` },
			}],
		];
	},

	colorsSelect: (gameId: GameId, playerId: PlayerId, cardName: CardName, count: number, redCount: number): RawButtons => {
		const actionButtons = [];

		if (redCount > 0) {
			actionButtons.push({
				text: '-',
				callback_data: { module: 'g', action: 't', meta: `${gameId}#${playerId}#${cardName}#${count}#${redCount}-` },
			});
		}

		if (redCount < count) {
			actionButtons.push({
				text: '+',
				callback_data: { module: 'g', action: 't', meta: `${gameId}#${playerId}#${cardName}#${count}#${redCount}+` },
			});
		}

		return [
			actionButtons,
			[{
				text: 'Выбрать',
				callback_data: { module: 'g', action: 't', meta: `${gameId}#${playerId}#${cardName}#${count}#${redCount}select` },
			}],
		];
	},

	suitsSelect: (gameId: GameId, playerId: PlayerId, cardName: CardName, count: number, redCount: number, suits: Suits): RawButtons => {
		const actionButtons = [];
		const baseMeta = `${gameId}#${playerId}#${cardName}#${count}#${redCount}#${suits.hearts}!${suits.diamonds}!${suits.spades}!${suits.clubs}!${suits.mode}`;

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
			suits.hearts + suits.diamonds + suits.spades + suits.spades === count
			&& suits.hearts + suits.diamonds === redCount
			&& suits.spades + suits.clubs === count - redCount
		) {
			keyboard.push([{ text: 'Выбрать', callback_data: { module: 'g', action: 't', meta: baseMeta + '!select' } }]);
		}

		return keyboard;
	},
} as const;
