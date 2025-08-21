import { DB } from '~/core';
import type { RawButtons , GameId , CardName } from '~/core';

import { Game } from '../model';
import type { PlayerId } from '../types';
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

	cardSelect: (me: PlayerId, gameId: GameId, playerId: PlayerId): RawButtons => {
		const game = new Game({ id: gameId });

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
			({ text: cardName, callback_data: { module: 'g', action: 't', meta: `${gameId}#${playerId}#${cardName}` } })));
	},
} as const;
