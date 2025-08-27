import { DB } from './db';
import type { UserSchema } from './schemas';
import type { UserId } from './types';

class Users {
	public static get (id: UserId): UserSchema {
		const user = DB.data.users.find(user => user.id === id);

		if (!user) {
			throw new Error(`User with id ${id} not found`);
		}

		return user;
	}

	public static async add (user: UserSchema) {
		DB.data.users.push(user);
		await DB.write();
	}

	public static async remove (id: UserId) {
		DB.data.users = DB.data.users.filter(u => u.id !== id);
		await DB.write();
	}
}

const ORM = {
	Users,
};

export {
	ORM,
};
