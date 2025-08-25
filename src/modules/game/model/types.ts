import type { CardName } from '~/core';

export interface HandHasOptions {
	cardName: CardName;
	count?: number;
	colors?: {
		red: number;
		black: number;
	};
	suits?: {
		hearts: number;
		diamonds: number;
		spades: number;
		clubs: number;
	};
}
