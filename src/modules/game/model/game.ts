import { nanoid } from 'nanoid';

import { DB } from '~/core';
import type { GameSchema, GameId } from '~/core';

import type { PlayerId } from '../types';
import { Hands, Queue } from '.';
import type { HandHasOptions } from './types';
import type { Hand } from './hand';

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
	private readonly hands: Hands;
	private readonly athanasiuses: GameSchema['athanasiuses'];

	constructor ({ id, players, decksCount }: ConstructorOptionsById | ConstructorOptionsInit) {
		if (id) {
			const game = DB.data.games.find(game => game.id === id);

			if (!game) {
				throw new Error('404: Game not found');
			}

			this.id = game.id;
			this.queue = new Queue(game.queue, false);
			this.hands = new Hands({ hands: game.hands });
			this.athanasiuses = game.athanasiuses;
		} else if (players && decksCount) {
			this.id = nanoid(6);
			this.queue = new Queue(players, true);
			this.hands = new Hands({ players, decksCount, queue: this.queue });
			this.athanasiuses = {};
		} else {
			throw new Error('Game options error');
		}
	}

	get gameId (): GameId {
		return this.id;
	}

	get activePlayer (): PlayerId {
		return this.queue.activePlayer;
	}

	public async save (): Promise<void> {
		const game = DB.data.games.find(game => game.id === this.id);

		if (game) {
			game.queue = this.queue.allPlayers;
			game.hands = this.hands.allHands;
			game.athanasiuses = this.athanasiuses;

			await DB.write();
		} else {
			await DB.update(({ games }) => {
				games.push({
					id: this.id,
					queue: this.queue.allPlayers,
					hands: this.hands.allHands,
					athanasiuses: this.athanasiuses,
				});

				return {
					games,
				};
			});
		}
	}

	public async turn (playerId: PlayerId, options: HandHasOptions): Promise<{ success: boolean }> {
		const right = this.hands.has(playerId, options);

		if (right) {
			return { success: true };
		} else {
			this.queue.next();
			await this.save();
			return { success: false };
		}
	}

	public getHand (playerId: PlayerId): Hand | undefined {
		return this.hands.getHand(playerId);
	}
}
