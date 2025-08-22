import type { CardName } from '~/core';

import type { TurnMeta } from '../types';

const getCount = (countData: string): [number, string] => {
	return [+countData.replace(/\D/g, ''), countData.replace(/\d/g, '')];
};

export const parseTurnMeta = (meta: string): TurnMeta => {
	const [turnStage, gameId, playerId, cardName, countData, redCountData, suitsData] = meta.split('#');

	if (turnStage === undefined || gameId === undefined || gameId.length === 0 || playerId === undefined || playerId.length === 0) {
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

	return {
		stage: +turnStage,
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
};
