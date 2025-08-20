export type CardId = number;

export interface Card {
	id: CardId;
	name: string;
	suit: 'Hearts' | 'Diamonds' | 'Clubs' | 'Spades';
	value: number;
	displayName: string;
}
