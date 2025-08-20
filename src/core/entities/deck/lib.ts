import { SUITS, RANKS } from './config';
import type { Card } from './types';

export const generateDeck = (): Card[] => {
	const deck: Card[] = [];
	let id = 1;

	for (const suit of SUITS) {
		for (const rank of RANKS) {
			deck.push({
				id: id++,
				name: rank.name,
				suit,
				value: rank.value,
				displayName: `${rank.name} of ${suit}`,
			});
		}
	}

	return deck;
};

export const getCardById = (id: number): Card | undefined => {
	return generateDeck().find(card => card.id === id);
};

export const getCardsByIds = (ids: number[]): Card[] => {
	const deck = generateDeck();
	return ids.map(id => deck.find(card => card.id === id)).filter(Boolean) as Card[];
};
