import _ from 'lodash';

import { TurnStage } from '~/entities/game';
import type { Suits, SuitsStageMeta } from '~/entities/game';

import { GameNotificationsService } from '.';
import type { GameServiceOptions, GameServiceOptionsStage } from './types';

export class GameLogicService {
	private static adjustCount (value: number, action: string): number {
		return action === '-' ? value - 1 : value + 1;
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

	private static isPlayerStage (options: GameServiceOptions): options is GameServiceOptions {
		return options.turnMeta.stage === TurnStage.player;
	}

	private static async processPlayerStage ({ ctx, game, me, turnMeta }: GameServiceOptions) {
		await GameNotificationsService.notifyNextStage({ ctx, game, me, turnMeta });
	}

	private static isCardStage (options: GameServiceOptions): options is GameServiceOptionsStage['Card'] {
		return options.turnMeta.stage === TurnStage.card;
	}

	private static async processCardStage ({ ctx, game, me, turnMeta }: GameServiceOptionsStage['Card']) {
		const { success } = await game.turn({ me: me.id, turnMeta, options: { cardName: turnMeta.cardName } });

		if (!success) {
			await GameNotificationsService.notifyWrongCardMessage({ ctx, game, me, turnMeta });
			return;
		}

		await GameNotificationsService.notifyNextStage({ ctx, game, me, turnMeta });
	}

	private static isCountStage (options: GameServiceOptions): options is GameServiceOptionsStage['Count'] {
		return options.turnMeta.stage === TurnStage.count;
	}

	private static async processCountStage ({ ctx, game, me, turnMeta }: GameServiceOptionsStage['Count']) {
		if (turnMeta.countAction !== 'select') {
			const newCount = this.adjustCount(turnMeta.count, turnMeta.countAction);
			await GameNotificationsService.updateCountMessage({ ctx, game, turnMeta, newCount });
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

	private static isColorsStage (options: GameServiceOptions): options is GameServiceOptionsStage['Colors'] {
		return options.turnMeta.stage === TurnStage.colors;
	}

	private static async processColorsStage ({ ctx, game, me, turnMeta }: GameServiceOptionsStage['Colors']) {
		if (turnMeta.redCountAction !== 'select') {
			const newRedCount = this.adjustCount(turnMeta.redCount, turnMeta.redCountAction);
			await GameNotificationsService.updateColorsMessage({ ctx, game, turnMeta, newRedCount });
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

	private static isSuitsStage (options: GameServiceOptions): options is GameServiceOptionsStage['Suits'] {
		return options.turnMeta.stage === TurnStage.suits;
	}

	private static async processSuitsStage ({ ctx, game, me, turnMeta }: GameServiceOptionsStage['Suits']) {
		if (turnMeta.suits?.action !== 'select') {
			const newSuits = this.getNewSuits(turnMeta);
			await GameNotificationsService.updateSuitsMessage({ ctx, game, turnMeta, newSuits });
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
			await GameNotificationsService.notifyEndGameMessage(game);
			return;
		}

		await GameNotificationsService.sendFirstMessage(game);
	}

	public static async processTurn (options: GameServiceOptions) {
		if (this.isPlayerStage(options)) {
			await this.processPlayerStage(options);
			return;
		}

		if (this.isCardStage(options)) {
			await this.processCardStage(options);
			return;
		}

		if (this.isCountStage(options)) {
			await this.processCountStage(options);
			return;
		}

		if (this.isColorsStage(options)) {
			await this.processColorsStage(options);
			return;
		}

		if (this.isSuitsStage(options)) {
			await this.processSuitsStage(options);
			return;
		}
	}
}
