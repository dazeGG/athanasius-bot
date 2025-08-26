import type { SendMessageByChatIdOptions } from '~/core';
import type { GameId, UserId, UserSchema } from '~/entities/db';
import type { CardName } from '~/entities/deck';

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

export interface PlayerStageMeta extends BaseTurnMeta {
	stage: TurnStage.player;
}

type CardStageOmitOptions = 'cardName';

export interface CardStageMeta extends Omit<BaseTurnMeta, CardStageOmitOptions> {
	stage: TurnStage.card;
	cardName: CardName;
}

type CountStageOmitOptions = CardStageOmitOptions | 'count' | 'countAction';

export interface CountStageMeta extends Omit<BaseTurnMeta, CountStageOmitOptions> {
	stage: TurnStage.count;
	cardName: CardName;
	count: number;
	countAction: string;
}

type ColorsStageOmitOptions = CardStageOmitOptions | 'count' | 'redCount' | 'blackCount' | 'redCountAction';

export interface ColorsStageMeta extends Omit<BaseTurnMeta, ColorsStageOmitOptions> {
	stage: TurnStage.colors;
	cardName: CardName;
	count: number;
	redCount: number;
	blackCount: number;
	redCountAction: string;
}

type SuitsStageOmitOptions = CardStageOmitOptions | 'count' | 'redCount' | 'blackCount' | 'suits';

export interface SuitsStageMeta extends Omit<BaseTurnMeta, SuitsStageOmitOptions> {
	stage: TurnStage.suits;
	cardName: CardName;
	count: number;
	redCount: number;
	blackCount: number;
	suits: Suits;
}

export type TurnMeta = PlayerStageMeta | CardStageMeta | CountStageMeta | ColorsStageMeta | SuitsStageMeta;

export type MailingOptions = Omit<SendMessageByChatIdOptions, 'chatId'>;
