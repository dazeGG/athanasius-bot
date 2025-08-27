import _ from 'lodash';

import { SUITS, SUIT_WEIGHT_MAP, RANKS } from './config';
import type { Card } from './types';

export class BaseDeck {
	private static readonly deck: Card[] = BaseDeck.generateDeck();
	private static readonly cardCache: Map<number, Card> = new Map(BaseDeck.deck.map(card => [card.id, card]));

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
		return _.cloneDeep(this.deck);
	}

	public static getCardById (id: number): Card | undefined {
		return this.cardCache.get(id);
	}

	public static getCardsByIds (ids: number[]): Card[] {
		return ids.map(id => this.cardCache.get(id)).filter(Boolean) as Card[];
	}

	public static sortByValue (cards: Card[], sortType: 'asc' | 'desc' = 'asc'): Card[] {
		return _.cloneDeep(cards).sort((a, b) => {
			if (a.value !== b.value) {
				return sortType === 'asc' ? a.value - b.value : b.value - a.value;
			}

			const aSuitWeight = SUIT_WEIGHT_MAP[a.suit];
			const bSuitWeight = SUIT_WEIGHT_MAP[b.suit];

			return sortType === 'asc' ? aSuitWeight - bSuitWeight : bSuitWeight - aSuitWeight;
		});
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
