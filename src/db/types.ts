import type { nanoid } from 'nanoid';

import type { CardName } from '~/entities/deck';

export type UserId = number;
export type RoomId = ReturnType<typeof nanoid>;
export type GameId = ReturnType<typeof nanoid>;

export interface UserSettings {
	updatesView: 'instant' | 'composed';
	confirmMode?: boolean;
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
	athanasius?: boolean;
}

export interface GameUtils {
	cardsToAthanasius: number;
	logs: string[];
}

export interface GameUtilsParsed {
	cardsToAthanasius: number;
	logs: GameLog[];
}
