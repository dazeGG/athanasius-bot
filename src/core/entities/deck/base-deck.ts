import { SUITS, RANKS } from './config';
import type { Card } from '.';

export class BaseDeck {
	private static readonly deck: Card[] = BaseDeck.generateDeck();

	private static readonly cardCache: Map<number, Card> = new Map(
		BaseDeck.deck.map(card => [card.id, card]),
	);

	private static generateDeck (): Card[] {
		const deck: Card[] = [];
		let id = 1;

		for (const suit of SUITS) {
			for (const rank of RANKS) {
				deck.push({
					id: id++,
					name: rank.name,
					suit: suit.name,
					symbol: suit.symbol,
					value: rank.value,
					displayName: `${rank.name}${suit.symbol}`,
				});
			}
		}

		return deck;
	}

	public static getDeck (): Card[] {
		return [...this.deck];
	}

	public static getCardById (id: number): Card | undefined {
		return this.cardCache.get(id);
	}

	public static getCardsByIds (ids: number[]): Card[] {
		return ids.map(id => this.cardCache.get(id)).filter(Boolean) as Card[];
	}

	public static sortByValue (cards: Card[], sortType: 'asc' | 'desc' = 'asc'): Card[] {
		return [...cards].sort((a, b) => sortType === 'asc' ? a.value - b.value : b.value - a.value);
	}

	public static displayDeck (cards: Card[]): string[] {
		return cards.map(card => card.displayName);
	}

	public static getSortedDeck (sortType: 'asc' | 'desc' = 'asc'): Card[] {
		return this.sortByValue(this.getDeck(), sortType);
	}

	public static isValidCardId (id: number): boolean {
		return this.cardCache.has(id);
	}

	public static get deckSize (): number {
		return this.deck.length;
	}
}
