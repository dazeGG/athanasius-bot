import { JSONFilePreset } from 'lowdb/node';

import type { UserSchema, GameSchema, RoomSchema } from './schemas';

type DatabaseSchema = {
	users: UserSchema[];
	rooms: RoomSchema[];
	games: GameSchema[];
};

const DB = await JSONFilePreset<DatabaseSchema>(process.env.DB_FILE ?? 'db.json', {
	users: [],
	rooms: [],
	games: [],
});

export {
	DB,
};
