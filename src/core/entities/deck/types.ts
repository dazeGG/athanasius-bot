export type CardId = number;

export type CardName = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type CardValue = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export type SuitName = 'Hearts' | 'Diamonds' | 'Clubs' | 'Spades';
export type SuitSymbol = '♥' | '♦' | '♣' | '♠';

export interface Card {
	id: CardId;
	name: CardName;
	suit: SuitName;
	symbol: SuitSymbol;
	value: CardValue;
	displayName: string;
}
