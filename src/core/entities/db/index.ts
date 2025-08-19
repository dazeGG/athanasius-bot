import { JSONFilePreset } from 'lowdb/node';

import type { User } from './types';

type DatabaseSchema = {
	users: User[];
};

const DB = await JSONFilePreset<DatabaseSchema>('db.json', {
	users: [],
});

export default DB;
