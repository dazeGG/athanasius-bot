import { BaseDeck } from '~/core';
import type { CardId } from '~/core';
import { shuffleArray } from '~/lib';

import type { PlayerId } from '../types';
import { Hand } from './hand';
import type { Queue } from '.';

interface ConstructorOptionsInit {
	hands?: never;
	players: PlayerId[];
	decksCount: number;
	queue: Queue;
}

interface ConstructorOptionsByHands {
	hands: Record<PlayerId, CardId[]>;
	players?: never;
	decksCount?: never;
	queue?: never;
}

export class Hands {
	private readonly hands: Record<PlayerId, Hand>;

	constructor ({ hands, players, decksCount, queue }: ConstructorOptionsInit | ConstructorOptionsByHands) {
		if (hands) {
			this.hands = {};

			Object.keys(hands).forEach(playerId => {
				this.hands[+playerId as PlayerId] = new Hand(hands[+playerId as PlayerId]);
			});
		} else if (players && decksCount && queue) {
			const cardsIds = BaseDeck.getDeck().map(card => card.id);
			const mainDeck = shuffleArray<CardId>(Array(decksCount).fill(cardsIds).flat());

			this.hands = {};
			players.forEach(playerId => {
				this.hands[playerId] = new Hand();
			});

			this.dealCards(mainDeck, players);
		} else {
			throw new Error('Hands options error');
		}
	}

	private dealCards (mainDeck: CardId[], players: PlayerId[]): void {
		let cardIndex = 0;

		while (cardIndex < mainDeck.length) {
			for (const playerId of players) {
				if (cardIndex >= mainDeck.length) {
					break;
				}

				const card = mainDeck[cardIndex];
				this.hands[playerId].pushCard(card);
				cardIndex++;
			}
		}
	}
}
