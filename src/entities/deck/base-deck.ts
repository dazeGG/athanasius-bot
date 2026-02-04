import _ from 'lodash';

import { DeckConfig } from './config';
import type { Card, CardName, SuitName } from './types';

const generateDeck = (): Card[] => {
	const deck: Card[] = [];
	let id = 1;

	for (const suit of DeckConfig.SUITS) {
		for (const rank of DeckConfig.RANKS) {
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
};

export class BaseDeck {
	private static readonly deck: Card[] = generateDeck();
	private static readonly cardCache: Map<number, Card> = new Map(BaseDeck.deck.map(card => [card.id, card]));

	public static getDeck (): Card[] {
		return _.cloneDeep(BaseDeck.deck);
	}

	public static getCardById (id: number): Card | undefined {
		return BaseDeck.cardCache.get(id);
	}

	public static getCardsByIds (ids: number[]): Card[] {
		return ids.map(id => BaseDeck.cardCache.get(id)).filter(Boolean) as Card[];
	}

	public static sortByValue (cards: Card[], sortType: 'asc' | 'desc' = 'asc'): Card[] {
		return _.cloneDeep(cards).sort((a, b) => {
			if (a.value !== b.value) {
				return sortType === 'asc' ? a.value - b.value : b.value - a.value;
			}

			const aSuitWeight = DeckConfig.SUIT_WEIGHT_MAP[a.suit];
			const bSuitWeight = DeckConfig.SUIT_WEIGHT_MAP[b.suit];

			return sortType === 'asc' ? aSuitWeight - bSuitWeight : bSuitWeight - aSuitWeight;
		});
	}

	public static getMyHandView (cards: Card[]): string {
		if (cards.length === 0) {
			return 'У тебя закончились карты, подожди пока игра закончится :)';
		}

		const groupedCounts: Partial<Record<CardName, Record<SuitName | 'total', number>>> = {};

		for (const card of BaseDeck.sortByValue(cards)) {
			if (!groupedCounts[card.name]) {
				groupedCounts[card.name] = { Hearts: 0, Diamonds: 0, Spades: 0, Clubs: 0, total: 0 };
			}

			groupedCounts[card.name]![card.suit]++;
			groupedCounts[card.name]!.total++;
		}

		let result = '<code>';

		for (const cardName of Object.keys(groupedCounts) as CardName[]) {
			const counts = groupedCounts[cardName]!;
			result += DeckConfig.CARDS_VIEW_MAP[cardName] + ' | ';

			for (const suit of Object.keys(DeckConfig.SUIT_VIEW_MAP) as SuitName[]) {
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
				result += DeckConfig.SUIT_VIEW_MAP[suit] + ' ';
			}

			result += `(${counts.total})\n`;
		}

		return result + '</code>';
	}

	public static displayDeck (cards: Card[]): string[] {
		return cards.map(card => card.displayName);
	}

	public static getSortedDeck (sortType: 'asc' | 'desc' = 'asc'): Card[] {
		return BaseDeck.sortByValue(BaseDeck.getDeck(), sortType);
	}

	public static isValidCardId (id: number): boolean {
		return BaseDeck.cardCache.has(id);
	}

	public static get deckSize (): number {
		return BaseDeck.deck.length;
	}
}
