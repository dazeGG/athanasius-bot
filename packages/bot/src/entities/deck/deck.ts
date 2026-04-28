import _ from 'lodash';

import { DeckConfig } from './config';
import type { DeckType } from './config';
import type { Card, CardId, CardName, SuitName } from './types';

const generateDeck52 = (): Card[] => {
	const deck: Card[] = [];
	let id = 1;

	for (const suit of DeckConfig.SUITS) {
		const color = DeckConfig.RED_SUITS.some(s => s === suit.name) ? 'red' : 'black';
		for (const rank of DeckConfig.RANKS) {
			deck.push({
				id: id++,
				name: rank.name,
				suit: suit.name,
				symbol: suit.symbol,
				value: rank.value,
				color,
				displayName: `${rank.name}${suit.symbol}`,
			});
		}
	}

	return deck;
};

const generateDeck36 = (): Card[] => {
	const ranks36 = new Set<Card['name']>(DeckConfig.RANKS_36.map(rank => rank.name));
	return generateDeck52().filter(card => ranks36.has(card.name));
};

const generateDeck54 = (): Card[] => {
	const deck = generateDeck52();

	deck.push({
		id: 53,
		name: 'Joker',
		suit: null,
		symbol: null,
		value: 15,
		color: 'red',
		displayName: '🃏🔴',
	});

	deck.push({
		id: 54,
		name: 'Joker',
		suit: null,
		symbol: null,
		value: 15,
		color: 'black',
		displayName: '🃏⚫',
	});

	return deck;
};

const deck52 = generateDeck52();
const deck36 = generateDeck36();
const deck54 = generateDeck54();

const cardCache52: Map<CardId, Card> = new Map(deck52.map(card => [card.id, card]));
const cardCache36: Map<CardId, Card> = new Map(deck36.map(card => [card.id, card]));
const cardCache54: Map<CardId, Card> = new Map(deck54.map(card => [card.id, card]));

const deckMap: Record<DeckType, Card[]> = { 52: deck52, 36: deck36, 54: deck54 };
const cacheMap: Record<DeckType, Map<CardId, Card>> = { 52: cardCache52, 36: cardCache36, 54: cardCache54 };

export class Deck {
	public static getDeck (deckType: DeckType = 52): Card[] {
		return _.cloneDeep(deckMap[deckType]);
	}

	public static getCardById (id: CardId): Card | undefined {
		return cardCache54.get(id);
	}

	public static sortByValue (cards: Card[], sortType: 'asc' | 'desc' = 'asc'): Card[] {
		return _.cloneDeep(cards).sort((a, b) => {
			if (a.value !== b.value) {
				return sortType === 'asc' ? a.value - b.value : b.value - a.value;
			}

			// Jokers have no suit
			if (a.suit === null || b.suit === null) {
				return 0;
			}

			const aSuitWeight = DeckConfig.SUIT_WEIGHT_MAP[a.suit];
			const bSuitWeight = DeckConfig.SUIT_WEIGHT_MAP[b.suit];

			return sortType === 'asc' ? aSuitWeight - bSuitWeight : bSuitWeight - aSuitWeight;
		});
	}

	private static getSpacedValue (value: string, space: number): string {
		return ' '.repeat(Math.max(0, space - value.length)) + value;
	}

	public static getMyHandView (cards: Card[]): string {
		if (cards.length === 0) {
			return 'У тебя закончились карты, подожди пока игра закончится :)';
		}

		const sorted = Deck.sortByValue(cards);

		// Separate jokers from regular cards
		const regularCards = sorted.filter(c => c.name !== 'Joker');
		const jokers = sorted.filter(c => c.name === 'Joker');

		const groupedCounts: Partial<Record<CardName, Record<SuitName | 'total', number>>> = {};

		for (const card of regularCards) {
			if (!groupedCounts[card.name]) {
				groupedCounts[card.name] = { Hearts: 0, Diamonds: 0, Spades: 0, Clubs: 0, total: 0 };
			}

			groupedCounts[card.name]![card.suit as SuitName]++;
			groupedCounts[card.name]!.total++;
		}

		const maxCountsLengths: Record<SuitName | 'total', number> = { Hearts: 0, Diamonds: 0, Spades: 0, Clubs: 0, total: 0 };

		for (const card of regularCards) {
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

		if (jokers.length > 0) {
			const redJokers = jokers.filter(c => c.color === 'red').length;
			const blackJokers = jokers.filter(c => c.color === 'black').length;
			const parts: string[] = [];
			if (redJokers > 0) {
				parts.push(`🔴 ${redJokers}`);
			}
			if (blackJokers > 0) {
				parts.push(`⚫ ${blackJokers}`);
			}
			result += `🃏 | ${parts.join(' ')}\n`;
		}

		return result + '</code>';
	}

	public static displayDeck (cards: Card[]): string[] {
		return cards.map(card => card.displayName);
	}

	public static getSortedDeck (deckType: DeckType = 52, sortType: 'asc' | 'desc' = 'asc'): Card[] {
		return Deck.sortByValue(Deck.getDeck(deckType), sortType);
	}

	public static isValidCardId (id: number, deckType: DeckType = 54): boolean {
		return cacheMap[deckType].has(id);
	}

	public static get deckSize (): number {
		return deck52.length;
	}

	public static getDeckSize (deckType: DeckType): number {
		return deckMap[deckType].length;
	}

	/** Get the cache map for a specific deck type — used by game-level card lookups */
	public static getCacheForDeckType (deckType: DeckType): Map<CardId, Card> {
		return cacheMap[deckType];
	}
}
