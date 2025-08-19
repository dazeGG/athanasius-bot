import { nanoid } from 'nanoid';

import { suits, names, nameValueMap } from './config';
import type { Card } from './types';

export const generateCards = (): Card[] => {
	const cards: Card[] = [];

	for (const suit of suits) {
		for (const name of names) {
			cards.push({ id: nanoid(), name, value: nameValueMap[name], suit });
		}
	}

	return cards;
};
