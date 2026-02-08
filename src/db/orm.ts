import { nanoid, customAlphabet } from 'nanoid';

import { DB } from './db';
import type { GameSchema, RoomSchema, UserSchema } from './schemas';
import type { GameId, RoomId, UserId, UserSettings } from './types';

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

class Games {
	public static getActive (): GameSchema | undefined {
		return DB.data.games.find(g => !g.ended);
	}

	public static get (id: GameId): GameSchema | undefined {
		return DB.data.games.find(g => g.id === id);
	}
}

class Rooms {
	public static getAll (): RoomSchema[] {
		return DB.data.rooms;
	}

	public static getMine (myId: UserId): RoomSchema[] {
		return DB.data.rooms.filter(r => r.leader === myId);
	}

	public static getWithMe (myId: UserId): RoomSchema[] {
		return DB.data.rooms.filter(r => r.players.includes(myId));
	}

	public static getById (roomId: RoomId): RoomSchema | undefined {
		return DB.data.rooms.find(r => r.id === roomId);
	}

	private static getByJoinCode (joinCode: string): RoomSchema | undefined {
		return DB.data.rooms.find(r => r.settings.joinCode === joinCode);
	}

	private static generateJoinCodeBlock (): string {
		return customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 4)();
	}

	private static generateJoinCode (): string {
		return Array.from({ length: 4 }, () => this.generateJoinCodeBlock()).join('-');
	}

	public static async createRoom (name: string, myId: UserId): Promise<void> {
		await DB.update(({ rooms }) => {
			if (this.getAll().some(r => r.name === name)) {
				throw new Error(`Комната ${name} уже есть, попробуй другое название`);
			}

			rooms.push({
				id: nanoid(6),
				name,
				leader: myId,
				players: [myId],
				settings: {
					joinCode: this.generateJoinCode(),
					deckType: 52,
					decksCount: 4,
					towHands: false,
					allowMailing: false,
					allowMailingAtTurn: false,
				},
			});

			return { rooms };
		});
	}

	public static async joinRoom (myId: UserId, joinCode: string): Promise<RoomSchema> {
		const room = this.getByJoinCode(joinCode);

		if (!room) {
			throw new Error('Неправильный код подключения');
		}

		if (room.players.includes(myId)) {
			throw new Error(`Ты уже в комнате ${room.name}`);
		}

		await DB.update(({ rooms }) => {
			for (const r of rooms) {
				if (r.id === room.id) {
					r.players.push(myId);
					break;
				}
			}
			return { rooms };
		});

		return room;
	}
}

const ORM = {
	Users,
	Games,
	Rooms,
};

export {
	ORM,
};
