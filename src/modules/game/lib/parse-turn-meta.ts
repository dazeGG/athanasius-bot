import { DB } from '~/db';
import type { CardName } from '~/entities/deck';

import { TurnStage } from '~/entities/game';
import type { TurnMeta } from '~/entities/game';

const getCount = (countData: string): [number, string] => {
	return [+countData.replace(/\D/g, ''), countData.replace(/\d/g, '')];
};

export const parseTurnMeta = (meta: string): TurnMeta => {
	const [turnStage, gameId, playerId, cardName, countData, redCountData, suitsData] = meta.split('#');

	if (!turnStage || !gameId || !playerId) {
		throw new Error('Parse turn meta error');
	}

	const user = DB.data.users.find(user => user.id === +playerId);

	if (!user) {
		throw new Error('Cannot find player with provided in turn meta player id');
	}

	const base = { gameId, player: user };

	switch (+turnStage) {
	case TurnStage.player:
		return { ...base, stage: TurnStage.player };

	case TurnStage.card:
		return { ...base, stage: TurnStage.card, cardName: cardName as CardName };

	case TurnStage.count: {
		const [count, countAction] = getCount(countData);
		return { ...base, stage: TurnStage.count, cardName: cardName as CardName, count, countAction };
	}

	case TurnStage.colors: {
		const [count] = getCount(countData);
		const [redCount, redCountAction] = getCount(redCountData);
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
		const [count] = getCount(countData);
		const [redCount] = getCount(redCountData);
		const [hearts, diamonds, spades, clubs, mode, action] = suitsData.split('!');
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
		throw new Error('Invalid stage');
	}
};
