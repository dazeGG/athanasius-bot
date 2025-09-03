import _ from 'lodash';

import { SUITS, SUIT_WEIGHT_MAP, RANKS, CARDS_VIEW_MAP } from './config';
import type { Card, CardName, SuitName } from './types';

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

	public static groupByValue (cards: Card[]): string {
		if (cards.length === 0) {
			return 'У тебя закончились карты, подожди пока игра закончится :)';
		}

		const groupedCounts: Partial<Record<CardName, Record<SuitName | 'total', number>>> = {};

		for (const card of this.sortByValue(cards)) {
			if (!groupedCounts[card.name]) {
				groupedCounts[card.name] = { Hearts: 0, Diamonds: 0, Spades: 0, Clubs: 0, total: 0 };
			}
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-expect-error
			++groupedCounts[card.name][card.suit];
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-expect-error
			++groupedCounts[card.name].total;
		}

		let result = '<code>';

		for (const cardName of Object.keys(groupedCounts)) {
			result += CARDS_VIEW_MAP[cardName as CardName] + '\t|\t';
			result += (groupedCounts[cardName as CardName]?.Hearts || '-') + '♥️' + '\t';
			result += (groupedCounts[cardName as CardName]?.Diamonds || '-') + '♦️' + '\t';
			result += (groupedCounts[cardName as CardName]?.Spades || '-') + '♠️' + '\t';
			result += (groupedCounts[cardName as CardName]?.Clubs || '-') + '♣️' + '\t';
			result += `(${groupedCounts[cardName as CardName]?.total})\n`;
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
