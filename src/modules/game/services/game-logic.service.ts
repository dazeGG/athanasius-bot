import _ from 'lodash';

import { DB } from '~/db';
import { TurnStage } from '~/entities/game';
import type { ColorsStageMeta, CountStageMeta, Game, Suits, SuitsStageMeta } from '~/entities/game';

import { GameNotificationsService } from '.';
import type { GameServiceOptions, GameServiceOptionsStage } from './types';

const isCardStage = (options: GameServiceOptions): options is GameServiceOptionsStage['Card'] =>
	options.turnMeta.stage === TurnStage.card;

const isCountStage = (options: GameServiceOptions): options is GameServiceOptionsStage['Count'] =>
	options.turnMeta.stage === TurnStage.count;

const isColorsStage = (options: GameServiceOptions): options is GameServiceOptionsStage['Colors'] =>
	options.turnMeta.stage === TurnStage.colors;

const isSuitsStage = (options: GameServiceOptions): options is GameServiceOptionsStage['Suits'] =>
	options.turnMeta.stage === TurnStage.suits;

export class GameLogicService {
	private static getWinners (game: Game): [string[], number] {
		const playerStats = game.allPlayers.map(playerId => {
			const user = DB.data.users.find(u => u.id === playerId);
			return {
				playerId,
				name: user?.name,
				count: game.getCountAthanasiuses(playerId),
			};
		});
		const maxCount = Math.max(...playerStats.map(stat => stat.count));
		const winners = playerStats
			.filter(stat => stat.count === maxCount && stat.count > 0)
			.map(stat => stat.name ?? 'noname');

		return [winners, maxCount];
	}

	private static getNewCount (turnMeta: CountStageMeta): number {
		return turnMeta.countAction === '-' ? turnMeta.count - 1 : turnMeta.count + 1;
	}

	private static getNewRedCount (turnMeta: ColorsStageMeta): number {
		return turnMeta.redCountAction === '-' ? turnMeta.redCount - 1 : turnMeta.redCount + 1;
	}

	private static getNewSuits (turnMeta: SuitsStageMeta): Suits {
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

	private static async processPlayerStage ({ ctx, game, me, turnMeta }: GameServiceOptions) {
		await GameNotificationsService.notifyNextStage({ ctx, game, me, turnMeta });
	}

	private static async processCardStage ({ ctx, game, me, turnMeta }: GameServiceOptionsStage['Card']) {
		const { success } = await game.turn({ me: me.id, turnMeta, options: { cardName: turnMeta.cardName } });

		if (!success) {
			await GameNotificationsService.notifyWrongCardMessage({ ctx, game, me, turnMeta });
			return;
		}

		await GameNotificationsService.notifyNextStage({ ctx, game, me, turnMeta });
	}

	private static async processCountStage ({ ctx, game, me, turnMeta }: GameServiceOptionsStage['Count']) {
		if (turnMeta.countAction !== 'select') {
			const newCount = this.getNewCount(turnMeta);
			await GameNotificationsService.updateCountMessage({ ctx, turnMeta, newCount });
			return;
		}

		const { success } = await game.turn({
			me: me.id,
			turnMeta,
			options: { cardName: turnMeta.cardName, count: turnMeta.count },
		});

		if (!success) {
			await GameNotificationsService.notifyWrongCountMessage({ ctx, game, me, turnMeta });
			return;
		}

		await GameNotificationsService.notifyNextStage({ ctx, game, me, turnMeta });
	}

	private static async processColorsStage ({ ctx, game, me, turnMeta }: GameServiceOptionsStage['Colors']) {
		if (turnMeta.redCountAction !== 'select') {
			const newRedCount = this.getNewRedCount(turnMeta);
			await GameNotificationsService.updateColorsMessage({ ctx, turnMeta, newRedCount });
			return;
		}

		const { success } = await game.turn({
			me: me.id,
			turnMeta,
			options: { cardName: turnMeta.cardName, colors: { red: turnMeta.redCount, black: turnMeta.blackCount } },
		});

		if (!success) {
			await GameNotificationsService.notifyWrongColorsMessage({ ctx, game, me, turnMeta });
			return;
		}

		await GameNotificationsService.notifyNextStage({ ctx, game, me, turnMeta });
	}

	private static async processSuitsStage ({ ctx, game, me, turnMeta }: GameServiceOptionsStage['Suits']) {
		if (turnMeta.suits?.action !== 'select') {
			const newSuits = this.getNewSuits(turnMeta);
			await GameNotificationsService.updateSuitsMessage({ ctx, turnMeta, newSuits });
			return;
		}

		const { success, composeAthanasius, gameEnded } = await game.turn({
			me: me.id,
			turnMeta,
			options: { cardName: turnMeta.cardName, suits: turnMeta.suits },
		});

		if (!success) {
			await GameNotificationsService.notifyWrongSuitsMessage({ ctx, game, me, turnMeta });
			return;
		}

		await GameNotificationsService.notifyStealMessage({ ctx, game, me, turnMeta });

		if (composeAthanasius) {
			await GameNotificationsService.notifyComposeAthanasiusMessage({ ctx, game, me, turnMeta });
		}

		if (gameEnded) {
			const [winners, maxCount] = this.getWinners(game);
			await GameNotificationsService.notifyEndGameMessage(game, winners, maxCount);
			return;
		}

		await GameNotificationsService.sendFirstMessage(game);
	}

	public static async processTurn (options: GameServiceOptions) {
		if (isCardStage(options)) {
			await this.processCardStage(options);
		} else if (isCountStage(options)) {
			await this.processCountStage(options);
		} else if (isColorsStage(options)) {
			await this.processColorsStage(options);
		} else if (isSuitsStage(options)) {
			await this.processSuitsStage(options);
		} else {
			await this.processPlayerStage(options);
		}
	}
}
