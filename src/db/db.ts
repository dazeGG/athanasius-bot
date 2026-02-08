import { JSONFilePreset } from 'lowdb/node';

import type { UserSchema, GameSchema, RoomSchema } from './schemas';

type DatabaseSchema = {
	users: UserSchema[];
	games: GameSchema[];
	rooms: RoomSchema[];
};

const DB = await JSONFilePreset<DatabaseSchema>('db.json', {
	users: [],
	games: [],
	rooms: [],
});

export {
	DB,
};
