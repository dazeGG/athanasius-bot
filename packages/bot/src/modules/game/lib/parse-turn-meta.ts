import { DB } from '~/db';
import { DeckConfig } from '@athanasius/shared';
import type { CardName } from '@athanasius/shared';

import { TurnStage } from '~/entities/game';
import type { TurnMeta } from '~/entities/game';

import { InvalidGameFlowError, STALE_GAME_MESSAGE_TEXT } from './validate-turn-meta';

const throwInvalidTurnMeta = (): never => {
	throw new InvalidGameFlowError(STALE_GAME_MESSAGE_TEXT);
};

const ensureDefined = (value?: string): string => {
	if (value === undefined) {
		throwInvalidTurnMeta();
	}

	return value!;
};

const getActionCount = (countData?: string): [number, string] => {
	const normalizedCountData = ensureDefined(countData);

	if (!/^\d+(\+|-|select)$/.test(normalizedCountData)) {
		throwInvalidTurnMeta();
	}

	const action = normalizedCountData.endsWith('select') ? 'select' : normalizedCountData.slice(-1);
	const count = normalizedCountData.slice(0, normalizedCountData.length - action.length);

	return [Number(count), action];
};

const getPlainCount = (countData?: string): number => {
	const normalizedCountData = ensureDefined(countData);

	if (!/^\d+$/.test(normalizedCountData)) {
		throwInvalidTurnMeta();
	}

	return Number(normalizedCountData);
};

export const parseTurnMeta = (meta: string): TurnMeta => {
	const [turnStage, gameId, playerId, cardName, countData, redCountData, suitsData] = meta.split('#');

	if (!turnStage || !gameId || !playerId) {
		throwInvalidTurnMeta();
	}

	const user = DB.data.users.find(user => user.id === +playerId);

	if (!user) {
		throwInvalidTurnMeta();
	}

	const base = { gameId, player: user! };

	switch (+turnStage) {
	case TurnStage.player:
		return { ...base, stage: TurnStage.player };

	case TurnStage.card:
		if (!cardName || !DeckConfig.isCardName(cardName)) {
			throwInvalidTurnMeta();
		}

		return { ...base, stage: TurnStage.card, cardName: cardName as CardName };

	case TurnStage.count: {
		if (!cardName || !DeckConfig.isCardName(cardName)) {
			throwInvalidTurnMeta();
		}

		const [count, countAction] = getActionCount(countData);
		return { ...base, stage: TurnStage.count, cardName: cardName as CardName, count, countAction };
	}

	case TurnStage.colors: {
		if (!cardName || !DeckConfig.isCardName(cardName)) {
			throwInvalidTurnMeta();
		}

		const count = getPlainCount(countData);
		const [redCount, redCountAction] = getActionCount(redCountData);
		return {
			...base,
			stage: TurnStage.colors,
			cardName: cardName as CardName,
			count,
			redCount,
			blackCount: count - redCount,
			redCountAction,
		};
	}

	case TurnStage.suits: {
		if (!cardName || !DeckConfig.isCardName(cardName) || !suitsData) {
			throwInvalidTurnMeta();
		}

		const count = getPlainCount(countData);
		const redCount = getPlainCount(redCountData);
		const [hearts, diamonds, spades, clubs, mode, action] = suitsData.split('!');

		if (
			hearts === undefined
			|| diamonds === undefined
			|| spades === undefined
			|| clubs === undefined
			|| mode === undefined
			|| action === undefined
		) {
			throwInvalidTurnMeta();
		}

		return {
			...base,
			stage: TurnStage.suits,
			cardName: cardName as CardName,
			count,
			redCount,
			blackCount: count - redCount,
			suits: { hearts: +hearts, diamonds: +diamonds, spades: +spades, clubs: +clubs, mode, action },
		};
	}

	default:
		return throwInvalidTurnMeta();
	}
};
