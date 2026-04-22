import _ from 'lodash';

import { TurnStage } from '~/entities/game';
import type { Suits, SuitsStageMeta } from '~/entities/game';

import {
	sendFirstMessage,
	notifyNextStage,
	updateCountMessage,
	updateColorsMessage,
	updateSuitsMessage,
	notifyWrongCardMessage,
	notifyWrongCountMessage,
	notifyWrongColorsMessage,
	notifyWrongSuitsMessage,
	notifyStealMessage,
	notifyComposeAthanasiusMessage,
	notifyEndGameMessage,
} from './game-notifications.service';
import type { GameServiceOptions } from './types';

function adjustCount (value: number, action: string): number {
	return action === '-' ? value - 1 : value + 1;
}

function getNewSuits (turnMeta: SuitsStageMeta): Suits {
	const newSuits = _.cloneDeep(turnMeta.suits);

	const { mode, action } = turnMeta.suits;

	const actionSuitMap = { h: 'hearts', d: 'diamonds', s: 'spades', c: 'clubs' } as const;

	switch (action) {
	case 'h':
	case 'd':
	case 's':
	case 'c':
		newSuits[actionSuitMap[action]] = mode === '+'
			? newSuits[actionSuitMap[action]] + 1
			: newSuits[actionSuitMap[action]] !== 0 ? newSuits[actionSuitMap[action]] - 1 : newSuits[actionSuitMap[action]];
		break;
	case 'm':
		newSuits.mode = newSuits.mode === '+' ? '-' : '+';
		break;
	}

	return newSuits;
}

export async function processTurn ({ ctx, game, me, turnMeta }: GameServiceOptions) {
	switch (turnMeta.stage) {
	case TurnStage.player:
		await notifyNextStage({ ctx, game, me, turnMeta });
		break;

	case TurnStage.card: {
		const { success } = await game.turn({ me: me.id, turnMeta, options: { cardName: turnMeta.cardName } });
		if (!success) {
			await notifyWrongCardMessage({ ctx, game, me, turnMeta });
			return;
		}
		await notifyNextStage({ ctx, game, me, turnMeta });
		break;
	}

	case TurnStage.count: {
		if (turnMeta.countAction !== 'select') {
			const newCount = adjustCount(turnMeta.count, turnMeta.countAction);
			await updateCountMessage({ ctx, game, turnMeta, newCount });
			return;
		}
		const { success } = await game.turn({
			me: me.id,
			turnMeta,
			options: { cardName: turnMeta.cardName, count: turnMeta.count },
		});
		if (!success) {
			await notifyWrongCountMessage({ ctx, game, me, turnMeta });
			return;
		}
		await notifyNextStage({ ctx, game, me, turnMeta });
		break;
	}

	case TurnStage.colors: {
		if (turnMeta.redCountAction !== 'select') {
			const newRedCount = adjustCount(turnMeta.redCount, turnMeta.redCountAction);
			await updateColorsMessage({ ctx, game, turnMeta, newRedCount });
			return;
		}
		const { success } = await game.turn({
			me: me.id,
			turnMeta,
			options: { cardName: turnMeta.cardName, colors: { red: turnMeta.redCount, black: turnMeta.blackCount } },
		});
		if (!success) {
			await notifyWrongColorsMessage({ ctx, game, me, turnMeta });
			return;
		}
		await notifyNextStage({ ctx, game, me, turnMeta });
		break;
	}

	case TurnStage.suits: {
		if (turnMeta.suits?.action !== 'select') {
			const newSuits = getNewSuits(turnMeta);
			await updateSuitsMessage({ ctx, game, turnMeta, newSuits });
			return;
		}
		const { success, composeAthanasius, gameEnded } = await game.turn({
			me: me.id,
			turnMeta,
			options: { cardName: turnMeta.cardName, suits: turnMeta.suits },
		});
		if (!success) {
			await notifyWrongSuitsMessage({ ctx, game, me, turnMeta });
			return;
		}
		await notifyStealMessage({ ctx, game, me, turnMeta });
		if (composeAthanasius) {
			await notifyComposeAthanasiusMessage({ ctx, game, me, turnMeta });
		}
		if (gameEnded) {
			await notifyEndGameMessage(game);
			return;
		}
		await sendFirstMessage(game);
		break;
	}
	}
}
