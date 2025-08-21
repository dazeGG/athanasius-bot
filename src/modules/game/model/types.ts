import type { CardName } from '~/core';

interface SharedHandHasOptions {
	cardName: CardName;
}

export interface HandHasOptions {
	count?: SharedHandHasOptions & {
		count: number;
	};
	colors?: SharedHandHasOptions & {
		red: number;
		black: number;
	};
	suits?: SharedHandHasOptions & {
		hearts: number;
		diamonds: number;
		spades: number;
		clubs: number;
	};
}
