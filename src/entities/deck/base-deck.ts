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

	public static groupByValue (cards: Card[]): string {
		const sortedCards = this.sortByValue(cards);
		const grouped: Record<number, Card[]> = {};
    
		for (const card of sortedCards) {
			if (!grouped[card.value]) {
				grouped[card.value] = [];
			}
			grouped[card.value].push(card);
		}

		let result = '';

		const sortedValues = Object.keys(grouped).map(Number).sort((a, b) => a - b);
		
		for (const value of sortedValues) {
			const cardsInGroup = grouped[value];
			
			const diamonds = cardsInGroup.filter(c => c.suit === 'Diamonds').length;
			const clubs = cardsInGroup.filter(c => c.suit === 'Clubs').length;
			const hearts = cardsInGroup.filter(c => c.suit === 'Hearts').length;
			const spades = cardsInGroup.filter(c => c.suit === 'Spades').length;
			

			let valueName = value.toString();
			if (value === 11) valueName = 'J';
			if (value === 12) valueName = 'Q';
			if (value === 13) valueName = 'K';
			if (value === 14) valueName = 'A';
			
			result += `${valueName}: `;
			if (diamonds > 0) result += `${diamonds}♦️`;
			if (clubs > 0) result += `${clubs}♣️ `;
			if (hearts > 0) result += `${hearts}♥️ `;
			if (spades > 0) result += `${spades}♠️ (${cardsInGroup.length})`;
			result += '\n';
		}
		
		return result;
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
