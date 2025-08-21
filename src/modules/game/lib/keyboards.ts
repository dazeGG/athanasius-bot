import { DB } from '~/core';
import type { RawButtons , GameId } from '~/core';

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
			[{ text: player.name, callback_data: { module: 'game', action: 'turn', meta: { stage: 'player', gameId, playerId: player.id } } }]);
	},

	cardSelect: (me: PlayerId, gameId: GameId, playerId: PlayerId): RawButtons => {
		const game = new Game({ id: gameId });

		const myHand = game.getHand(me);

		if (!myHand) {
			throw new Error('Cannot get my hand');
		}

		const uniqueCardNames = Array.from(new Set(myHand.cardsInHand.map(card => card.name)));

		uniqueCardNames.sort((a, b) => RANKS_MAP[a] - RANKS_MAP[b]);

		return uniqueCardNames.map(cardName =>
			[{ text: cardName, callback_data: { module: 'game', action: 'turn', meta: { stage: 'card', gameId, playerId, cardName } } }]);
	},
} as const;
