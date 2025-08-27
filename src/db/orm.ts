import { DB } from './db';
import type { UserSchema } from './schemas';
import type { UserId, UserSettings } from './types';

class Users {
	public static async add (user: UserSchema): Promise<UserSchema> {
		DB.data.users.push(user);
		await DB.write();
		return user;
	}

	public static get (id: UserId): UserSchema {
		const user = DB.data.users.find(u => u.id === id);

		if (!user) {
			throw new Error(`User with id ${id} not found`);
		}

		return user;
	}

	public static async update (id: UserId, newSettings: UserSettings): Promise<UserSchema> {
		const user = this.get(id);
		user.settings = newSettings;
		await DB.write();
		return user;
	}

	public static async remove (id: UserId): Promise<UserSchema> {
		const user = this.get(id);
		DB.data.users = DB.data.users.filter(u => u.id !== id);
		await DB.write();
		return user;
	}

	public static all (): UserSchema[] {
		return DB.data.users;
	}
}

const ORM = {
	Users,
};

export {
	ORM,
};
