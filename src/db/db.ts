import { JSONFilePreset } from 'lowdb/node';

import type { UserSchema, GameSchema, RoomSchema } from './schemas';

type DatabaseSchema = {
	users: UserSchema[];
	rooms: RoomSchema[];
	games: GameSchema[];
};

const DB = await JSONFilePreset<DatabaseSchema>('db.json', {
	users: [],
	rooms: [],
	games: [],
});

export {
	DB,
};
