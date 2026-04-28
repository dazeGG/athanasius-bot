import { Deck } from '../../deck/deck';
import type { CardId, Card, CardName } from '../../deck/types';
import type { GameUtilsParsed, HandHasOptions } from '../types';

export class Hand {
	private hand: CardId[];

	constructor (hand?: CardId[]) {
		this.hand = hand ?? [];
	}

	public get cardIds (): CardId[] {
		return structuredClone(this.hand);
	}

	public get cardsInHand (): Card[] {
		return this.hand.map(cardId => Deck.getCardById(cardId)).filter(Boolean) as Card[];
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
				(a, c) => c.color === 'red' ? [a[0] + 1, a[1]] : [a[0], a[1] + 1],
				[0, 0] as [number, number],
			);

			return colors.red === counts[0] && colors.black === counts[1];
		}

		if (suits) {
			const counts: [number, number, number, number] = neededCardsInHand.reduce(
				(a, c) => {
					switch (c.suit) {
					case 'Hearts':
						return [a[0] + 1, a[1], a[2], a[3]];
					case 'Diamonds':
						return [a[0], a[1] + 1, a[2], a[3]];
					case 'Spades':
						return [a[0], a[1], a[2] + 1, a[3]];
					case 'Clubs':
						return [a[0], a[1], a[2], a[3] + 1];
					default:
						return a;
					}
				},
				[0, 0, 0, 0] as [number, number, number, number],
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

	private getAthanasiuses (cardsToAthanasius: number, jokerCardsToAthanasius: number): CardName[] {
		const cardsCounts = this.cardsInHand.reduce<Partial<Record<CardName, number>>>((acc, card) => {
			acc[card.name] = (acc[card.name] ?? 0) + 1;
			return acc;
		}, {});

		const athanasiusCards: CardName[] = [];

		(Object.keys(cardsCounts) as CardName[]).forEach(cardName => {
			const required = cardName === 'Joker' ? jokerCardsToAthanasius : cardsToAthanasius;
			if (cardsCounts[cardName] === required) {
				athanasiusCards.push(cardName);
			}
		});

		return athanasiusCards;
	}

	public handleAthanasiuses ({ cardsToAthanasius, jokerCardsToAthanasius }: GameUtilsParsed): ReturnType<typeof this.getAthanasiuses> {
		const athanasiuses = this.getAthanasiuses(cardsToAthanasius, jokerCardsToAthanasius);

		athanasiuses.forEach(athanasius => {
			this.removeCardsByName(athanasius);
		});

		return athanasiuses;
	}

	[Symbol.for('nodejs.util.inspect.custom')] (): string {
		return `Hand(${this.hand.length} cards): [${Deck.displayDeck(Deck.sortByValue(this.cardsInHand)).join(', ')}]`;
	}
}
