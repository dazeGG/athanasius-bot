import type TelegramBot from 'node-telegram-bot-api';
import type { nanoid } from 'nanoid';

import type { CardId, Card } from '~/core';

export type UserId = TelegramBot.User['id'];
export type GameId = ReturnType<typeof nanoid>;

export type UserSchema = {
	id: UserId;
	username: TelegramBot.User['username'];
	name: string;
};

export interface GameUtils {
	cardsToAthanasius: number;
}

export interface GameSchema {
	id: GameId;
	queue: UserId[];
	hands: Record<UserId, CardId[]>;
	athanasiuses: Record<UserId, Card['name'][]>;
	utils: GameUtils;
};
