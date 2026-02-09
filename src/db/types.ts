import type TelegramBot from 'node-telegram-bot-api';
import type { nanoid } from 'nanoid';

import type { CardName } from '~/entities/deck';

export type UserId = TelegramBot.User['id'];
export type RoomId = ReturnType<typeof nanoid>;
export type GameId = ReturnType<typeof nanoid>;

export interface UserSettings {
	updatesView: 'instant' | 'composed';
}

export interface RoomSettings {
	joinCode: string;
	deckType: 52 | 54 | 36;
	decksCount: number;
	towHands: boolean;
	allowMailing: boolean;
	allowMailingAtTurn: boolean;
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
	logs: string[];
}

export interface GameUtilsParsed {
	cardsToAthanasius: number;
	logs: GameLog[];
}
