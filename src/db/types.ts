import type TelegramBot from 'node-telegram-bot-api';
import type { nanoid } from 'nanoid';

import type { CardName } from '~/entities/deck';

export type UserId = TelegramBot.User['id'];
export type GameId = ReturnType<typeof nanoid>;

export interface UserSettings {
	updatesView: 'instant' | 'composed';
}

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
