import type TelegramBot from 'node-telegram-bot-api';
import type { nanoid } from 'nanoid';

import type { CardId, Card, CardName } from '~/core';

export type UserId = TelegramBot.User['id'];
export type GameId = ReturnType<typeof nanoid>;

export type UserSchema = {
	id: UserId;
	username: TelegramBot.User['username'];
	name: string;
};

export interface GameLog {
	from: UserId;
	to: UserId;
	cardName: CardName;
	steal: boolean;
	stealData?: [number] | [number, number] | [number, number, number, number];
}

export interface GameUtils {
	cardsToAthanasius: number;
	logs: GameLog[];
}

export interface GameSchema {
	id: GameId;
	started: number;
	ended?: number;
	players: UserId[];
	hands: Record<UserId, CardId[]>;
	athanasiuses: Record<UserId, Card['name'][]>;
	utils: GameUtils;
}
