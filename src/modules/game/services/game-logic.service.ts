import _ from 'lodash';

import { DB } from '~/db';
import { TurnStage } from '~/entities/game';
import type { ColorsStageMeta, CountStageMeta, Game, Suits, SuitsStageMeta } from '~/entities/game';

import { GameNotificationsService } from '.';
import type { GameNotificationOptions } from './types';

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

	public static async processTurn ({ ctx, game, me, turnMeta }: GameNotificationOptions) {
		switch (turnMeta.stage) {
		case TurnStage.player: {
			await GameNotificationsService.notifyNextStage({ ctx, game, me, turnMeta });
			break;
		}

		case TurnStage.card: {
			const { success } = await game.turn({ me: me.id, turnMeta, options: { cardName: turnMeta.cardName } });

			if (!success) {
				await GameNotificationsService.notifyWrongCardMessage({ ctx, game, me, turnMeta });
				break;
			}

			await GameNotificationsService.notifyNextStage({ ctx, game, me, turnMeta });
			break;
		}

		case TurnStage.count: {
			if (turnMeta.countAction !== 'select') {
				const newCount = this.getNewCount(turnMeta);
				await GameNotificationsService.updateCountMessage({ ctx, turnMeta, newCount });
				break;
			}

			const { success } = await game.turn({
				me: me.id,
				turnMeta,
				options: { cardName: turnMeta.cardName, count: turnMeta.count },
			});

			if (!success) {
				await GameNotificationsService.notifyWrongCountMessage({ ctx, game, me, turnMeta });
				break;
			}

			await GameNotificationsService.notifyNextStage({ ctx, game, me, turnMeta });
			break;
		}

		case TurnStage.colors: {
			if (turnMeta.redCountAction !== 'select') {
				const newRedCount = this.getNewRedCount(turnMeta);
				await GameNotificationsService.updateColorsMessage({ ctx, turnMeta, newRedCount });
				break;
			}

			const { success } = await game.turn({
				me: me.id,
				turnMeta,
				options: { cardName: turnMeta.cardName, colors: { red: turnMeta.redCount, black: turnMeta.blackCount } },
			});

			if (!success) {
				await GameNotificationsService.notifyWrongColorsMessage({ ctx, game, me, turnMeta });
				break;
			}

			await GameNotificationsService.notifyNextStage({ ctx, game, me, turnMeta });
			break;
		}

		case TurnStage.suits: {
			if (turnMeta.suits?.action !== 'select') {
				const newSuits = this.getNewSuits(turnMeta);
				await GameNotificationsService.updateSuitsMessage({ ctx, turnMeta, newSuits });
				break;
			}

			const { success, composeAthanasius, gameEnded } = await game.turn({
				me: me.id,
				turnMeta,
				options: { cardName: turnMeta.cardName, suits: turnMeta.suits },
			});

			if (!success) {
				await GameNotificationsService.notifyWrongSuitsMessage({ ctx, game, me, turnMeta });
				break;
			}

			await GameNotificationsService.notifyStealMessage({ ctx, game, me, turnMeta });

			if (composeAthanasius) {
				await GameNotificationsService.notifyComposeAthanasiusMessage({ ctx, game, me, turnMeta });
			}

			if (gameEnded) {
				const [winners, maxCount] = this.getWinners(game);
				await GameNotificationsService.notifyEndGameMessage(game, winners, maxCount);
				break;
			}

			await GameNotificationsService.sendFirstMessage(game);
			break;
		}
		}
	}
}
