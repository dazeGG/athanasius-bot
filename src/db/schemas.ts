import type TelegramBot from 'node-telegram-bot-api';

import type { UserId, GameId, RoomId, UserSettings, RoomSettings, GameUtils } from './types';

export interface UserSchema {
	id: UserId;
	username: TelegramBot.User['username'];
	name: string;
	settings: UserSettings;
}

export interface GameSchema {
	id: GameId;
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
