import { JSONFilePreset } from 'lowdb/node';
// import { nanoid } from 'nanoid';

import type { Card, Game, User } from './types';

type DatabaseSchema = {
	cards: Card[];
	users: User[];
	games: Game[];
};

const DB = await JSONFilePreset<DatabaseSchema>('db.json', {
	// cards: ['Hearts', 'Diamonds', 'Clubs', 'Spades'].map(suit => ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'].map(name => ({ id: nanoid(), name, suit }))),
	cards: [],
	users: [],
	games: [],
});

export default DB;
