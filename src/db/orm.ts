import { nanoid, customAlphabet } from 'nanoid';

import { DB } from './db';
import type { GameSchema, RoomSchema, UserSchema } from './schemas';
import type { GameId, RoomId, RoomSettings, UserId, UserSettings } from './types';

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

	public static async awardAchievement (id: UserId, achievement: string): Promise<void> {
		const user = this.get(id);
		const achievements = user.achievements ?? [];
		if (!achievements.includes(achievement)) {
			user.achievements = [...achievements, achievement];
			await DB.write();
		}
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

class Rooms {
	public static getAll (): RoomSchema[] {
		return DB.data.rooms;
	}

	public static getMine (myId: UserId): RoomSchema[] {
		return DB.data.rooms.filter(r => r.owner === myId);
	}

	public static getWithMe (myId: UserId): RoomSchema[] {
		return DB.data.rooms.filter(r => r.players.includes(myId));
	}

	public static getById (roomId: RoomId): RoomSchema {
		const room = DB.data.rooms.find(r => r.id === roomId);

		if (!room) {
			throw new Error(`Room with id ${roomId} not found`);
		}

		return room;
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
				owner: myId,
				players: [myId],
				settings: {
					joinCode: this.generateJoinCode(),
					deckType: 52,
					decksCount: 4,
					towHands: false,
					allowMailing: false,
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

		room.players.push(myId);
		await DB.write();

		return room;
	}

	public static async removePlayer (playerId: number, roomId: RoomId): Promise<RoomSchema> {
		const room = this.getById(roomId);
		const playerIndex = room.players.indexOf(playerId);

		if (playerIndex < 0) {
			throw new Error('Игрока нет в комнате');
		}

		room.players.splice(playerIndex, 1);
		await DB.write();

		return room;
	}

	public static async changeJoinCode (roomId: RoomId): Promise<RoomSchema> {
		const room = this.getById(roomId);

		room.settings.joinCode = this.generateJoinCode();
		await DB.write();

		return room;
	}

	public static async changeSettings (roomId: RoomId, newSettings: Partial<RoomSettings>): Promise<RoomSchema> {
		const room = this.getById(roomId);

		room.settings = { ...room.settings, ...newSettings };
		await DB.write();

		return room;
	}

	public static async deleteRoom (roomId: RoomId): Promise<RoomSchema> {
		const room = this.getById(roomId);
		const activeGame = Games.getActive(roomId);

		if (activeGame) {
			throw new Error('Нельзя удалить комнату с активной игрой');
		}

		DB.data.rooms = DB.data.rooms.filter(r => r.id !== roomId);
		await DB.write();

		return room;
	}
}

class Games {
	public static getActive (roomId: RoomId): GameSchema | undefined {
		return DB.data.games.find(g => g.roomId === roomId && !g.ended);
	}

	public static getActiveWithMe (myId: UserId): GameSchema[] {
		return DB.data.games.filter(g => g.players.includes(myId) && !g.ended);
	}

	public static isInActiveGame (myId: UserId): boolean {
		return DB.data.games.some(g => g.players.includes(myId) && !g.ended);
	}

	public static getById (id: GameId): GameSchema {
		const game = DB.data.games.find(g => g.id === id);

		if (!game) {
			throw new Error('Game not found');
		}

		return game;
	}

	public static getNote (gameId: GameId, userId: UserId): Record<string, UserId | null> {
		const game = this.getById(gameId);
		return game.notes?.[userId] ?? {};
	}

	public static async setNoteCell (gameId: GameId, userId: UserId, key: string, value: UserId | null): Promise<void> {
		const game = this.getById(gameId);
		if (!game.notes) {
			game.notes = {};
		}
		if (!game.notes[userId]) {
			game.notes[userId] = {};
		}
		game.notes[userId][key] = value;
		await DB.write();
	}
}

const ORM = {
	Users,
	Rooms,
	Games,
};

export {
	ORM,
};
