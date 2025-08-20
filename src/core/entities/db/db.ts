import { JSONFilePreset } from 'lowdb/node';

import type { Game, User } from '~/core';

type DatabaseSchema = {
	users: User[];
	games: Game[];
};

const DB = await JSONFilePreset<DatabaseSchema>('db.json', {
	users: [],
	games: [],
});

export {
	DB,
};
