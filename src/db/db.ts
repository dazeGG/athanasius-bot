import { JSONFilePreset } from 'lowdb/node';

import type { GameSchema, UserSchema } from './schemas';

type DatabaseSchema = {
	users: UserSchema[];
	games: GameSchema[];
};

const DB = await JSONFilePreset<DatabaseSchema>('db.json', {
	users: [],
	games: [],
});

export {
	DB,
};
