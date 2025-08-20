export type CardId = number;

export type SuitName = 'Hearts' | 'Diamonds' | 'Clubs' | 'Spades';
export type SuitSymbol = '♥' | '♦' | '♣' | '♠';

export interface Card {
	id: CardId;
	name: string;
	suit: SuitName;
	symbol: SuitSymbol;
	value: number;
	displayName: string;
}
