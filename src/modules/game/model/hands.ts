import { BaseDeck } from '~/core';
import type { CardId , CardName } from '~/core';
import { shuffleArray } from '~/lib';

import type { PlayerId } from '../types';
import { Hand } from './hand';
import type { Queue } from '.';
import type { HandHasOptions } from './types';

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
	private readonly hands: Map<PlayerId, Hand>;

	constructor ({ hands, players, decksCount, queue }: ConstructorOptionsInit | ConstructorOptionsByHands) {
		if (hands) {
			this.hands = new Map();

			Object.keys(hands).map(Number).forEach(playerId => {
				this.hands.set(playerId, new Hand(hands[playerId]));
			});
		} else if (players && decksCount && queue) {
			const cardsIds = BaseDeck.getDeck().map(card => card.id);
			const mainDeck = shuffleArray<CardId>(Array(decksCount).fill(cardsIds).flat());

			this.hands = new Map();
			players.forEach(playerId => {
				this.hands.set(playerId, new Hand());
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
				this.hands.get(playerId)?.pushCard(card);
				cardIndex++;
			}
		}
	}

	get allHands (): Record<PlayerId, CardId[]> {
		const preResult = Object.fromEntries(this.hands);
		const result: Record<PlayerId, CardId[]> = {};

		Object.keys(preResult).map(Number).forEach(playerId => {
			result[playerId] = preResult[playerId.toString()].cardIds;
		});

		return result;
	}

	public getHand (playerId: PlayerId): Hand | undefined {
		return this.hands.get(playerId);
	}

	public has (playerId: PlayerId, options: HandHasOptions): boolean {
		return !!this.hands.get(playerId)?.has(options);
	}

	public moveCards (me: PlayerId, playerId: PlayerId, cardName: CardName): void {
		const cardIds = this.hands.get(playerId)?.getCardsByName(cardName).map(card => card.id);

		if (!cardIds) {
			return;
		}

		this.hands.get(playerId)?.removeCards(cardIds);
		this.hands.get(me)?.addCards(cardIds);
	}
}
