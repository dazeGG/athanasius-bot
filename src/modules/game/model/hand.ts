import { getCardById } from '~/core';
import type { Card, CardId } from '~/core';

const getPrettyCard = (card: Card): string => card.name + card.suit[0];

export class Hand {
	private readonly hand: CardId[];

	constructor (hand?: CardId[]) {
		this.hand = hand ?? [];
	}

	pushCard (cardId: CardId): void {
		this.hand.push(cardId);
	}

	toString (): string {
		return `Hand(${this.hand.length} cards): [${this.hand.map(cardId => getPrettyCard(getCardById(cardId))).join(', ')}]`;
	}

	[Symbol.for('nodejs.util.inspect.custom')] (): string {
		return this.toString();
	}
}
