import _ from 'lodash';

import { DeckConfig } from './config';
import type { Card, CardId, CardName, SuitName } from './types';

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

export class Deck {
	private static readonly deck: Card[] = generateDeck();
	private static readonly cardCache: Map<CardId, Card> = new Map(Deck.deck.map(card => [card.id, card]));

	public static getDeck (): Card[] {
		return _.cloneDeep(Deck.deck);
	}

	public static getCardById (id: CardId): Card | undefined {
		return Deck.cardCache.get(id);
	}

	public static getCardsByIds (ids: CardId[]): Card[] {
		return ids.map(id => Deck.cardCache.get(id)).filter(Boolean) as Card[];
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

	private static getSpacedValue (value: string, space: number): string {
		return ' '.repeat(space - value.length) + value;
	}

	public static getMyHandView (cards: Card[]): string {
		if (cards.length === 0) {
			return 'У тебя закончились карты, подожди пока игра закончится :)';
		}

		const groupedCounts: Partial<Record<CardName, Record<SuitName | 'total', number>>> = {};

		for (const card of Deck.sortByValue(cards)) {
			if (!groupedCounts[card.name]) {
				groupedCounts[card.name] = { Hearts: 0, Diamonds: 0, Spades: 0, Clubs: 0, total: 0 };
			}

			groupedCounts[card.name]![card.suit]++;
			groupedCounts[card.name]!.total++;
		}

		const maxCountsLengths: Record<SuitName | 'total', number> = { Hearts: 0, Diamonds: 0, Spades: 0, Clubs: 0, total: 0 };

		for (const card of Deck.sortByValue(cards)) {
			const counts = groupedCounts[card.name]!;
			maxCountsLengths.Hearts = Math.max(maxCountsLengths.Hearts, counts.Hearts.toString().length);
			maxCountsLengths.Diamonds = Math.max(maxCountsLengths.Diamonds, counts.Diamonds.toString().length);
			maxCountsLengths.Spades = Math.max(maxCountsLengths.Spades, counts.Spades.toString().length);
			maxCountsLengths.Clubs = Math.max(maxCountsLengths.Clubs, counts.Clubs.toString().length);
			maxCountsLengths.total = Math.max(maxCountsLengths.total, counts.total.toString().length);
		}

		let result = '<code>';

		for (const cardName of Object.keys(groupedCounts) as CardName[]) {
			const counts = groupedCounts[cardName]!;

			result += this.getSpacedValue(DeckConfig.CARDS_VIEW_MAP[cardName], 2) + ' |';

			for (const suit of Object.keys(DeckConfig.SUIT_VIEW_MAP) as SuitName[]) {
				result += this.getSpacedValue(counts[suit].toString(), maxCountsLengths[suit] + 1);
				result += DeckConfig.SUIT_VIEW_MAP[suit];
			}

			result += ` | ${this.getSpacedValue(counts.total.toString(), maxCountsLengths.total)}\n`;
		}

		return result + '</code>';
	}

	public static displayDeck (cards: Card[]): string[] {
		return cards.map(card => card.displayName);
	}

	public static getSortedDeck (sortType: 'asc' | 'desc' = 'asc'): Card[] {
		return Deck.sortByValue(Deck.getDeck(), sortType);
	}

	public static isValidCardId (id: number): boolean {
		return Deck.cardCache.has(id);
	}

	public static get deckSize (): number {
		return Deck.deck.length;
	}
}
