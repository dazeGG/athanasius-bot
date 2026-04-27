import type { CardName } from './types';

export type DeckType = 52 | 36 | 54;
type RegularCardName = Exclude<CardName, 'Joker'>;

export class DeckConfig {
	public static REGULAR_CARD_NAMES: RegularCardName[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

	public static JOKER_NAME: CardName = 'Joker';

	public static CARD_NAMES: CardName[] = [...DeckConfig.REGULAR_CARD_NAMES, DeckConfig.JOKER_NAME];

	public static isCardName (value: string): value is CardName {
		return this.CARD_NAMES.includes(value as CardName);
	}

	public static getDeckTypeLabel (deckType: DeckType = 52): string {
		switch (deckType) {
		case 36:
			return '36 карт';
		case 54:
			return '54 карты';
		case 52:
			return '52 карты';
		}
	}

	public static SUITS = [
		{ name: 'Hearts', symbol: '♥' },
		{ name: 'Diamonds', symbol: '♦' },
		{ name: 'Spades', symbol: '♠' },
		{ name: 'Clubs', symbol: '♣' },
	] as const;

	public static RED_SUITS = ['Hearts', 'Diamonds'] as const;
	public static BLACK_SUITS = ['Spades', 'Clubs'] as const;

	public static SUIT_VIEW_MAP = {
		Hearts: '♥️',
		Diamonds: '♦️',
		Spades: '♠️',
		Clubs: '♣️',
	} as const;

	public static SUIT_WEIGHT_MAP = {
		'Hearts': 1,
		'Diamonds': 2,
		'Spades': 3,
		'Clubs': 4,
	} as const;

	public static RANKS = [
		{ name: '2', value: 2 },
		{ name: '3', value: 3 },
		{ name: '4', value: 4 },
		{ name: '5', value: 5 },
		{ name: '6', value: 6 },
		{ name: '7', value: 7 },
		{ name: '8', value: 8 },
		{ name: '9', value: 9 },
		{ name: '10', value: 10 },
		{ name: 'J', value: 11 },
		{ name: 'Q', value: 12 },
		{ name: 'K', value: 13 },
		{ name: 'A', value: 14 },
	] as const;

	public static RANKS_36 = DeckConfig.RANKS.filter(r => r.value >= 6);

	public static RANKS_MAP: Record<string, number> = {
		'2': 2,
		'3': 3,
		'4': 4,
		'5': 5,
		'6': 6,
		'7': 7,
		'8': 8,
		'9': 9,
		'10': 10,
		'J': 11,
		'Q': 12,
		'K': 13,
		'A': 14,
		'Joker': 15,
	};

	public static CARDS_VIEW_MAP: Record<string, string> = {
		'2': '2',
		'3': '3',
		'4': '4',
		'5': '5',
		'6': '6',
		'7': '7',
		'8': '8',
		'9': '9',
		'10': '10',
		J: 'J',
		Q: 'Q',
		K: 'K',
		A: 'A',
		Joker: '🃏',
		hearts: '♥️',
		diamonds: '♦️',
		spades: '♠️',
		clubs: '♣️',
	};
}
