import type { CardName, GameId, UserId, UserSchema } from '~/core';

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

interface BaseTurnMeta {
	gameId: GameId;
	player: UserSchema;
	cardName?: never;
	count?: never;
	countAction?: never;
	redCount?: never;
	blackCount?: never;
	redCountAction?: never;
	suits?: never;
}

interface PlayerStage extends BaseTurnMeta {
	stage: TurnStage.player;
}

type CardStageOmit = 'cardName';

interface CardStage extends Omit<BaseTurnMeta, CardStageOmit> {
	stage: TurnStage.card;
	cardName: CardName;
}

type CountStageOmit = CardStageOmit | 'count' | 'countAction';

interface CountStage extends Omit<BaseTurnMeta, CountStageOmit> {
	stage: TurnStage.count;
	cardName: CardName;
	count: number;
	countAction: string;
}

type ColorsStageOmit = CardStageOmit | 'count' | 'redCount' | 'blackCount' | 'redCountAction';

interface ColorsStage extends Omit<BaseTurnMeta, ColorsStageOmit> {
	stage: TurnStage.colors;
	cardName: CardName;
	count: number;
	redCount: number;
	blackCount: number;
	redCountAction: string;
}

type SuitsStageOmit = CardStageOmit | 'count' | 'redCount' | 'blackCount' | 'suits';

interface SuitsStage extends Omit<BaseTurnMeta, SuitsStageOmit> {
	stage: TurnStage.suits;
	cardName: CardName;
	count: number;
	redCount: number;
	blackCount: number;
	suits: Suits;
}

export type TurnMeta = PlayerStage | CardStage | CountStage | ColorsStage | SuitsStage;
