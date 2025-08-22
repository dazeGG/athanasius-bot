import type { CardName } from '~/core';
import { DB } from '~/core';

import type { TurnMeta } from '../types';
import { TurnStage } from '../types';

const getCount = (countData: string): [number, string] => {
	return [+countData.replace(/\D/g, ''), countData.replace(/\d/g, '')];
};

export const parseTurnMeta = (meta: string): TurnMeta => {
	const [turnStage, gameId, playerId, cardName, countData, redCountData, suitsData] = meta.split('#');

	if (turnStage === undefined || gameId === undefined || gameId.length === 0 || playerId === undefined || playerId.length === 0) {
		throw new Error('Parse turn meta error');
	}

	const user = DB.data.users.find(user  => user.id === +playerId);

	if (!user) {
		throw new Error('Cannot find player with provided in turn meta player id');
	}

	let count, countAction, redCount, redCountAction, blackCount, suits;

	if (countData) {
		[count, countAction] = getCount(countData);
	}

	if (redCountData) {
		[redCount, redCountAction] = getCount(redCountData);
		blackCount = count - redCount;
	}

	if (suitsData) {
		const [hearts, diamonds, spades, clubs, mode, action] = suitsData.split('!');
		suits = { hearts: +hearts, diamonds: +diamonds, spades: +spades, clubs: +clubs, mode, action };
	}

	switch (+turnStage) {
	case TurnStage.player:
		return {
			stage: TurnStage.player,
			gameId,
			player: user,
		};
	case TurnStage.card:
		return {
			stage: TurnStage.card,
			gameId,
			player: user,
			cardName: cardName as CardName,
		};
	case TurnStage.count:
		return {
			stage: TurnStage.count,
			gameId,
			player: user,
			cardName: cardName as CardName,
			count,
			countAction,
		};
	case TurnStage.colors:
		return {
			stage: TurnStage.colors,
			gameId,
			player: user,
			cardName: cardName as CardName,
			count: count,
			redCount: redCount,
			blackCount: blackCount,
			redCountAction: redCountAction,
		};
	case TurnStage.suits:
		return {
			stage: TurnStage.suits,
			gameId,
			player: user,
			cardName: cardName as CardName,
			count: count,
			redCount: redCount,
			blackCount: blackCount,
			suits: suits,
		};
	default:
		throw new Error('Invalid stage');
	}
};
