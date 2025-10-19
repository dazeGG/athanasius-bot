import _ from 'lodash';

import { SUITS, SUIT_WEIGHT_MAP, RANKS, CARDS_VIEW_MAP } from './config';
import type { Card, CardName, SuitName } from './types';

const SUIT_VIEW_MAP: Record<SuitName, string> = {
	Hearts: '♥️',
	Diamonds: '♦️',
	Spades: '♠️',
	Clubs: '♣️',
} as const;

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

	public static getMyHandView (cards: Card[]): string {
		if (cards.length === 0) {
			return 'У тебя закончились карты, подожди пока игра закончится :)';
		}

		const groupedCounts: Partial<Record<CardName, Record<SuitName | 'total', number>>> = {};

		for (const card of this.sortByValue(cards)) {
			if (!groupedCounts[card.name]) {
				groupedCounts[card.name] = { Hearts: 0, Diamonds: 0, Spades: 0, Clubs: 0, total: 0 };
			}

			groupedCounts[card.name]![card.suit]++;
			groupedCounts[card.name]!.total++;
		}

		let result = '<code>';

		for (const cardName of Object.keys(groupedCounts) as CardName[]) {
			const counts = groupedCounts[cardName]!;
			result += CARDS_VIEW_MAP[cardName] + ' | ';

			for (const suit of Object.keys(SUIT_VIEW_MAP) as SuitName[]) {
				const count = counts[suit];
				if (!count) {
					result += '  -';
				} else {
					if (count < 10) {
						result += '  ';
					} else if (count < 100) {
						result += ' ';
					}
					result += count;
				}
				result += SUIT_VIEW_MAP[suit] + ' ';
			}

			result += `(${counts.total})\n`;
		}

		return result + '</code>';
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
