import { BaseDeck } from '~/core';
import type { CardId , Card } from '~/core';

export class Hand {
	private readonly hand: CardId[];

	constructor (hand?: CardId[]) {
		this.hand = hand ?? [];
	}

	pushCard (cardId: CardId): void {
		this.hand.push(cardId);
	}

	toString (): string {
		const cardsInHand: Card[] = this.hand.map(cardId => BaseDeck.getCardById(cardId)).filter(Boolean) as Card[];

		return `Hand(${this.hand.length} cards): [${BaseDeck.displayDeck(BaseDeck.sortByValue(cardsInHand)).join(', ')}]`;
	}

	[Symbol.for('nodejs.util.inspect.custom')] (): string {
		return this.toString();
	}
}
