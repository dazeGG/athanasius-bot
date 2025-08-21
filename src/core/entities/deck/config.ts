import type { CardName, CardValue, SuitName, SuitSymbol } from '.';

export const SUITS: { name: SuitName, symbol: SuitSymbol }[] = [
	{ name: 'Hearts', symbol: '♥' },
	{ name: 'Diamonds', symbol: '♦' },
	{ name: 'Spades', symbol: '♠' },
	{ name: 'Clubs', symbol: '♣' },
] as const;

export const SUIT_WEIGHT_MAP: Record<SuitName, 1 | 2 | 3 | 4> = {
	'Hearts': 1,
	'Diamonds': 2,
	'Spades': 3,
	'Clubs': 4,
} as const;

export const RED_SUITS: [SuitName, SuitName] = ['Hearts', 'Diamonds'];
export const BLACK_SUITS: [SuitName, SuitName] = ['Spades', 'Clubs'];

export const RANKS: { name: CardName, value: CardValue }[] = [
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
];
