import type { CardName, CardValue, SuitName, SuitSymbol } from './types';

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

export const RANKS_MAP: Record<CardName, CardValue> = {
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
};

export const CARDS_VIEW_MAP = {
	'2': '2️⃣',
	'3': '3️⃣',
	'4': '4️⃣',
	'5': '5️⃣',
	'6': '6️⃣',
	'7': '7️⃣',
	'8': '8️⃣',
	'9': '9️⃣',
	'10': '🔟',
	J: '🇯',
	Q: '🇶',
	K: '🇰',
	A: '🇦',
	hearts: '♥️',
	diamonds: '♦️',
	spades: '♠️',
	clubs: '♣️',
} as const;
