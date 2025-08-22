import type { CardName, GameId, SendMessageByChatIdOptions, UserId, UserSchema } from '~/core';

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

type CardStageOmitOptions = 'cardName';

interface CardStage extends Omit<BaseTurnMeta, CardStageOmitOptions> {
	stage: TurnStage.card;
	cardName: CardName;
}

type CountStageOmitOptions = CardStageOmitOptions | 'count' | 'countAction';

interface CountStage extends Omit<BaseTurnMeta, CountStageOmitOptions> {
	stage: TurnStage.count;
	cardName: CardName;
	count: number;
	countAction: string;
}

type ColorsStageOmitOptions = CardStageOmitOptions | 'count' | 'redCount' | 'blackCount' | 'redCountAction';

interface ColorsStage extends Omit<BaseTurnMeta, ColorsStageOmitOptions> {
	stage: TurnStage.colors;
	cardName: CardName;
	count: number;
	redCount: number;
	blackCount: number;
	redCountAction: string;
}

type SuitsStageOmitOptions = CardStageOmitOptions | 'count' | 'redCount' | 'blackCount' | 'suits';

interface SuitsStage extends Omit<BaseTurnMeta, SuitsStageOmitOptions> {
	stage: TurnStage.suits;
	cardName: CardName;
	count: number;
	redCount: number;
	blackCount: number;
	suits: Suits;
}

export type TurnMeta = PlayerStage | CardStage | CountStage | ColorsStage | SuitsStage;

export type MailingOptions = Omit<SendMessageByChatIdOptions, 'chatId'>;
