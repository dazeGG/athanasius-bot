import type { UserId, GameId, RoomId, UserSettings, RoomSettings, GameUtils } from './types';

export interface UserSchema {
	id: UserId;
	username: string | undefined;
	name: string;
	settings: UserSettings;
	achievements?: string[];
}

export interface GameSchema {
	id: GameId;
	roomId: RoomId;
	name: string;
	started: number;
	ended?: number;
	players: UserId[];
	hands: Record<UserId, number[]>;
	athanasiuses: Record<UserId, string[]>;
	utils: GameUtils;
}

export interface RoomSchema {
	id: RoomId;
	name: string;
	owner: UserId;
	players: UserId[];
	settings: RoomSettings;
}
