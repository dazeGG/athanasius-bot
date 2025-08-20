import { shuffleArray } from '~/lib';

import type { PlayerId } from '../types';

export class Queue {
	private readonly queue: PlayerId[];

	constructor (players: PlayerId[], shuffle: boolean) {
		this.queue = shuffle ? shuffleArray(players) : players;
	}

	get allPlayers (): PlayerId[] {
		return [...this.queue];
	}

	get activePlayer (): PlayerId {
		if (this.queue.length === 0) {
			throw new Error('Queue is empty, no active player');
		}

		return this.queue[0];
	}

	next (): void {
		if (this.queue.length === 0) {
			throw new Error('Queue is empty, cannot move to next player');
		}

		const currentPlayer = this.queue.shift()!;
		this.queue.push(currentPlayer);
	}
}
