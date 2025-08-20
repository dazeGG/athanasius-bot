import { nanoid } from 'nanoid';

import { DB } from '~/core';
import type { Game as GameSchema, GameId } from '~/core';

import type { PlayerId } from '../types';
import { Hands, Queue } from '.';

interface ConstructorOptionsById {
	id: string;
	players?: never;
	decksCount?: never;
}

interface ConstructorOptionsInit {
	id?: never;
	players: PlayerId[];
	decksCount: number;
}

export class Game {
	private readonly id: GameId;
	private readonly queue: Queue;
	private readonly decks: Hands;
	private readonly athanasiuses: GameSchema['athanasiuses'];

	constructor ({ id, players, decksCount }: ConstructorOptionsById | ConstructorOptionsInit) {
		if (id) {
			const game = DB.data.games.find(game => game.id === id);

			if (!game) {
				throw new Error('404: Game not found');
			}

			this.id = game.id;
			this.queue = new Queue(game.queue, false);
			this.decks = new Hands({ decks: game.decks });
			this.athanasiuses = game.athanasiuses;
		} else if (players && decksCount) {
			this.id = nanoid();
			this.queue = new Queue(players, false);
			this.decks = new Hands({ players, decksCount, queue: this.queue });
			this.athanasiuses = {};
		} else {
			throw new Error('Game options error');
		}
	}
}
