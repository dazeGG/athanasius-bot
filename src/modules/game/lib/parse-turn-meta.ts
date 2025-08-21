import type { CardName } from '~/core';

import { TurnStage } from '../types';
import type { TurnMeta } from '../types';

const getTurnStage = (turnMeta: Omit<TurnMeta, 'stage'>): TurnStage => {
	if (turnMeta.cardName) {
		return TurnStage.card;
	} else {
		return TurnStage.player;
	}
};

export const parseTurnMeta = (meta: string): TurnMeta => {
	const [gameId, playerId, cardName] = meta.split('#');

	if (gameId === undefined || gameId.length === 0 || playerId === undefined || playerId.length === 0) {
		throw new Error('Parse turn meta error');
	}

	const turnMeta: Omit<TurnMeta, 'stage'> = {
		gameId,
		playerId: +playerId,
		cardName: cardName as CardName | undefined,
	};

	const turnStage = getTurnStage(turnMeta);

	return {
		...turnMeta,
		stage: turnStage,
	};
};
