import _ from 'lodash';

import { BaseDeck, RED_SUITS } from '~/entities/deck';
import type { CardId, Card, CardName } from '~/entities/deck';
import type { GameUtils } from '~/db';

import type { HandHasOptions } from '../types';

export class Hand {
	private hand: CardId[];

	constructor (hand?: CardId[]) {
		this.hand = hand ?? [];
	}

	get cardIds (): CardId[] {
		return _.cloneDeep(this.hand);
	}

	get cardsInHand (): Card[] {
		return this.hand.map(cardId => BaseDeck.getCardById(cardId)).filter(Boolean) as Card[];
	}

	public pushCards (cardIds: CardId[]): void {
		this.hand.push(...cardIds);
	}

	public removeCards (cardIds: CardId[]): void {
		this.hand = this.hand.filter(cardId => !cardIds.includes(cardId));
	}

	public getCardsByName (cardName: CardName): Card[] {
		return this.cardsInHand.filter(card => card.name === cardName);
	}

	public removeCardsByName (cardName: CardName): void {
		this.removeCards(this.getCardsByName(cardName).map(card => card.id));
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

	private getAthanasiuses (cardsToAthanasius: number): CardName[] {
		const cardsCounts = this.cardsInHand.reduce<Partial<Record<CardName, number>>>((acc, card) => {
			acc[card.name] = (acc[card.name] ?? 0) + 1;
			return acc;
		}, {});

		const athanasiusCards: CardName[] = [];

		Object.keys(cardsCounts).forEach(cardName => {
			if (cardsCounts[cardName as CardName] === cardsToAthanasius) {
				athanasiusCards.push(cardName as CardName);
			}
		});

		return athanasiusCards;
	}

	public handleAthanasiuses ({ cardsToAthanasius }: GameUtils): ReturnType<typeof this.getAthanasiuses> {
		const athanasiuses = this.getAthanasiuses(cardsToAthanasius);

		athanasiuses.forEach(athanasius => {
			this.removeCardsByName(athanasius);
		});

		return athanasiuses;
	}

	[Symbol.for('nodejs.util.inspect.custom')] (): string {
		return `Hand(${this.hand.length} cards): [${BaseDeck.displayDeck(BaseDeck.sortByValue(this.cardsInHand)).join(', ')}]`;
	}
}
