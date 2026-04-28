import { shuffleArray } from '../../lib/shuffle-array';

import type { PlayerId } from '../types';

export class Queue {
	private readonly queue: PlayerId[];

	constructor (players: PlayerId[], shuffle: boolean) {
		this.queue = shuffle ? shuffleArray(players) : players;
	}

	public get actualQueue (): PlayerId[] {
		return structuredClone(this.queue);
	}

	public get activePlayer (): PlayerId {
		if (this.queue.length === 0) {
			throw new Error('Queue is empty, no active player');
		}

		return this.queue[0];
	}

	public next (): void {
		if (this.queue.length === 0) {
			throw new Error('Queue is empty, cannot move to next player');
		}

		const currentPlayer = this.queue.shift()!;
		this.queue.push(currentPlayer);
	}
}
