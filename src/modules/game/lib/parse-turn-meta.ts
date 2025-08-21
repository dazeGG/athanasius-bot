import type { CardName } from '~/core';

import { TurnStage } from '../types';
import type { TurnMeta } from '../types';

const getTurnStage = (turnMeta: Omit<TurnMeta, 'stage'>): TurnStage => {
	if (turnMeta.redCount && (turnMeta.redCountAction === undefined || turnMeta.redCountAction === 'select')) {
		return TurnStage.suits;
	} else if (turnMeta.count && (turnMeta.countAction === undefined || turnMeta.countAction === 'select')) {
		return TurnStage.colors;
	} else if (turnMeta.cardName) {
		return TurnStage.count;
	} else {
		return TurnStage.card;
	}
};

const getCount = (countData: string): [number, string] => {
	return [+countData.replace(/\D/g, ''), countData.replace(/\d/g, '')];
};

export const parseTurnMeta = (meta: string): TurnMeta => {
	const [gameId, playerId, cardName, countData, redCountData, suitsData] = meta.split('#');

	if (gameId === undefined || gameId.length === 0 || playerId === undefined || playerId.length === 0) {
		throw new Error('Parse turn meta error');
	}

	const [count, countAction] = countData ? getCount(countData) : [undefined, undefined];
	const [redCount, redCountAction] = redCountData ? getCount(redCountData) : [undefined, undefined];
	const blackCount = (count && redCount !== undefined) ? count - redCount : undefined;

	const [hearts, diamonds, spades, clubs, mode, action] = suitsData
		? suitsData.split('!')
		: [undefined, undefined, undefined, undefined, undefined, undefined];

	const suits =
		hearts !== undefined
		&& diamonds !== undefined
		&& spades !== undefined
		&& clubs !== undefined
		&& mode !== undefined
			? { hearts: +hearts, diamonds: +diamonds, spades: +spades, clubs: +clubs, mode, action }
			: undefined;

	const turnMeta: Omit<TurnMeta, 'stage'> = {
		gameId,
		playerId: +playerId,
		cardName: cardName as CardName | undefined,
		count,
		countAction: countAction || undefined,
		redCount,
		blackCount,
		redCountAction: redCountAction || undefined,
		suits,
	};

	const turnStage = getTurnStage(turnMeta);

	return {
		...turnMeta,
		stage: turnStage,
	};
};
