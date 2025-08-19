import { JSONFilePreset } from 'lowdb/node';

import { generateCards } from './lib';
import type { Card, Game, User } from './types';

type DatabaseSchema = {
	cards: Card[];
	users: User[];
	games: Game[];
};

const DB = await JSONFilePreset<DatabaseSchema>('db.json', {
	cards: generateCards(),
	users: [],
	games: [],
});

export default DB;
