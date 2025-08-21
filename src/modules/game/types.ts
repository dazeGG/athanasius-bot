import type { CardName, GameId, UserId } from '~/core';

export type PlayerId = UserId;

export enum TurnStage {
	player,
	card,
	colors,
	suits,
}

export interface TurnMeta {
	stage: TurnStage;
	gameId: GameId;
	playerId: PlayerId;
	cardName?: CardName;
}
