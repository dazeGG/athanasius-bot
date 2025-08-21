import type { CardName, GameId, UserId } from '~/core';

export type PlayerId = UserId;

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

export interface TurnMeta {
	stage: TurnStage;
	gameId: GameId;
	playerId: PlayerId;
	cardName?: CardName;
	count?: number;
	countAction?: string;
	redCount?: number;
	blackCount?: number;
	redCountAction?: string;
	suits?: Suits;
}
