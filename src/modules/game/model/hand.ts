import _ from 'lodash';

import { BaseDeck } from '~/core';
import type { CardId, Card } from '~/core';
import { RED_SUITS } from '~/core/entities/deck/config';

import type { HandHasOptions } from './types';

export class Hand {
	private readonly hand: CardId[];

	constructor (hand?: CardId[]) {
		this.hand = hand ?? [];
	}

	get cardIds (): CardId[] {
		return _.cloneDeep(this.hand);
	}

	get cardsInHand (): Card[] {
		return this.hand.map(cardId => BaseDeck.getCardById(cardId)).filter(Boolean) as Card[];
	}

	public pushCard (cardId: CardId): void {
		this.hand.push(cardId);
	}

	public has ({ cardName, count, colors, suits }: HandHasOptions): boolean {
		const neededCardsInHand = this.cardsInHand.filter(card => card.name === cardName);

		if (count) {
			return neededCardsInHand.length === count;
		}

		if (colors) {
			const counts: [number, number] = neededCardsInHand.reduce(
				(a, c) => RED_SUITS.includes(c.suit) ? [a[0] + 1, a[1]] : [a[0], a[1] + 1],
				[0, 0],
			);

			return colors.red === counts[0] && colors.black === counts[1];
		}

		if (suits) {
			const counts: [number, number, number, number] = neededCardsInHand.reduce(
				(a, c) => {
					if (c.suit === 'Hearts') {
						return [a[0] + 1, a[1], a[2], a[3]];
					} else if (c.suit === 'Diamonds') {
						return [a[0], a[1] + 1, a[2], a[3]];
					} else if (c.suit === 'Spades') {
						return [a[0], a[1], a[2] + 1, a[3]];
					} else if (c.suit === 'Clubs') {
						return [a[0], a[1], a[2], a[3] + 1];
					} else {
						return a;
					}
				},
				[0, 0, 0, 0],
			);

			return (
				suits.hearts === counts[0]
				&& suits.diamonds === counts[1]
				&& suits.spades === counts[2]
				&& suits.clubs === counts[3]
			);
		}

		return !!neededCardsInHand.length;
	}

	[Symbol.for('nodejs.util.inspect.custom')] (): string {
		return `Hand(${this.hand.length} cards): [${BaseDeck.displayDeck(BaseDeck.sortByValue(this.cardsInHand)).join(', ')}]`;
	}
}
