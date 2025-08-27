import type TelegramBot from 'node-telegram-bot-api';

import type { CardId, CardName } from '~/entities/deck';

import type { UserId, GameId, GameUtils, UserSettings } from './types';

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
	hands: Record<UserId, CardId[]>;
	athanasiuses: Record<UserId, CardName[]>;
	utils: GameUtils;
}
