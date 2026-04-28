import type { CardName } from '../deck/types';

export type UserId = number;
export type RoomId = string;
export type GameId = string;

export interface ConfirmModeSettings {
	card: boolean;
	count: boolean;
	colors: boolean;
	suits: boolean;
}

export interface UserSettings {
	updatesView: 'instant' | 'composed';
	confirmMode?: ConfirmModeSettings;
}

export interface RoomSettings {
	joinCode: string;
	deckType: 52 | 54 | 36;
	decksCount: number;
	towHands: boolean;
	allowMailing: boolean;
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
	jokerCardsToAthanasius: number;
	logs: string[];
	mailedThisTurn?: UserId[];
}

export interface GameUtilsParsed {
	cardsToAthanasius: number;
	jokerCardsToAthanasius: number;
	logs: GameLog[];
	mailedThisTurn?: UserId[];
}

export type PlayerId = UserId;

export interface HandHasOptions {
	cardName: CardName;
	count?: number;
	colors?: {
		red: number;
		black: number;
	};
	suits?: {
		hearts: number;
		diamonds: number;
		spades: number;
		clubs: number;
	};
}

export enum TurnStage {
	player,
	card,
	count,
	colors,
	suits,
}

export interface Suits {
	hearts: number;
	diamonds: number;
	spades: number;
	clubs: number;
	mode: string;
	action?: string;
}
