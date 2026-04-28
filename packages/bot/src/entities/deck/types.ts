export type CardId = number;

export type CardName = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | 'Joker';
export type CardValue = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export type SuitName = 'Hearts' | 'Diamonds' | 'Spades' | 'Clubs';
export type SuitSymbol = '♥' | '♦' | '♣' | '♠';
export type CardColor = 'red' | 'black';

export interface Card {
	id: CardId;
	name: CardName;
	suit: SuitName | null;
	symbol: SuitSymbol | null;
	value: CardValue;
	color: CardColor;
	displayName: string;
}
