import { TurnStage } from '@athanasius/shared';
import type { CardName, GameId, HandHasOptions, PlayerId, Suits } from '@athanasius/shared';
import type { UserSchema } from '~/db';

export { TurnStage };
export type { HandHasOptions, PlayerId, Suits } from '@athanasius/shared';

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

export interface MailingOptions {
	text: string;
}

export type Sender = (chatId: number, text: string, options?: Record<string, unknown>) => Promise<unknown>;

export interface TurnOptions {
	me: PlayerId;
	turnMeta: CardStageMeta | CountStageMeta | ColorsStageMeta | SuitsStageMeta;
	options: HandHasOptions;
}

export type TurnReturn =
	| { success: false }
	| { success: true; composeAthanasius: boolean; gameEnded: boolean };
