import { BOT } from '~/core';
import { ORM } from '~/db';
import { TurnStage } from '~/entities/game';
import { txt, gkb, InfoMessage, GameMessage } from '~/shared/ui/game';
import type { GameSchema } from '~/db';
import type { Game } from '~/entities/game';

import { SERVICES_CONFIG } from './config';
import type { GameServiceOptions, GameServiceOptionsStage, UpdateMessageOptionsStage } from './types';

export class GameNotificationsService {
	public static async sendFirstMessage (game: Game, initial: boolean = false) {
		let text: string;

		if (initial) {
			text = txt.firstTurnMessage;
		} else {
			text = '<b>Твой ход!</b>\n\nВыбери у кого хочешь спросить карту';

			if (game.activePlayer.settings.updatesView === 'composed') {
				await BOT.sendMessageByChatId({
					chatId: game.activePlayer.id,
					text: `🟨 Вот что было за последний круг:\n\n${game.getLastRoundLogs()}`,
				});
			}
		}

		await BOT.sendMessageByChatId({
			chatId: game.activePlayer.id,
			text,
			keyboard: gkb.playersSelect({ me: game.activePlayer.id, gameId: game.gameId, playerIds: game.allPlayers }),
		});
	}

	public static async notifyNextStage ({ ctx, game, turnMeta }: GameServiceOptions) {
		switch (turnMeta.stage) {
		case TurnStage.player:
			await BOT.editMessage({
				ctx,
				text: GameMessage.getCardSelectMessage(turnMeta),
				keyboard: gkb.cardSelect({ me: ctx.callback.from.id, game, playerId: turnMeta.player.id }),
			});
			break;
		case TurnStage.card:
			await BOT.editMessage({
				ctx,
				text: GameMessage.getCountSelectMessage(turnMeta, SERVICES_CONFIG.INITIAL_COUNT),
				keyboard: gkb.countSelect({ game, turnMeta, count: SERVICES_CONFIG.INITIAL_COUNT }),
			});
			break;
		case TurnStage.count:
			await BOT.editMessage({
				ctx,
				text: GameMessage.getColorsSelectMessage(turnMeta, SERVICES_CONFIG.INITIAL_RED_COUNT),
				keyboard: gkb.colorsSelect({ game, turnMeta, redCount: SERVICES_CONFIG.INITIAL_RED_COUNT }),
			});
			break;
		case TurnStage.colors:
			await BOT.editMessage({
				ctx,
				text: GameMessage.getSuitsSelectMessage(turnMeta, SERVICES_CONFIG.INITIAL_SUITS),
				keyboard: gkb.suitsSelect({ game, turnMeta, suits: SERVICES_CONFIG.INITIAL_SUITS }),
			});
			break;
		}
	}

	public static async updateCountMessage ({ ctx, game, turnMeta, newCount }: UpdateMessageOptionsStage['Count']) {
		await BOT.editMessage({
			ctx,
			text: GameMessage.getCountSelectMessage(turnMeta, newCount),
			keyboard: gkb.countSelect({ game, turnMeta, count: newCount }),
		});
	}

	public static async updateColorsMessage ({ ctx, game, turnMeta, newRedCount }: UpdateMessageOptionsStage['Colors']) {
		await BOT.editMessage({
			ctx,
			text: GameMessage.getColorsSelectMessage(turnMeta, newRedCount),
			keyboard: gkb.colorsSelect({ game, turnMeta, redCount: newRedCount }),
		});
	}

	public static async updateSuitsMessage ({ ctx, game, turnMeta, newSuits }: UpdateMessageOptionsStage['Suits']) {
		await BOT.editMessage({
			ctx,
			text: GameMessage.getSuitsSelectMessage(turnMeta, newSuits),
			keyboard: gkb.suitsSelect({ game, turnMeta, suits: newSuits }),
		});
	}

	public static async notifyWrongCardMessage ({ ctx, game, me, turnMeta }: GameServiceOptionsStage['Card']) {
		await BOT.editMessage({ ctx, text: InfoMessage.wrongCardMe(turnMeta) });
		await game.mailing({ text: InfoMessage.wrongCardMailing(turnMeta, me) }, [me.id, ...game.playersWithComposedUpdated]);
		await GameNotificationsService.sendFirstMessage(game);
	}

	public static async notifyWrongCountMessage ({ ctx, game, me, turnMeta }: GameServiceOptionsStage['Count']) {
		await BOT.editMessage({ ctx, text: InfoMessage.wrongCountMe(turnMeta) });
		await game.mailing({ text: InfoMessage.wrongCountMailing(turnMeta, me) }, [me.id, ...game.playersWithComposedUpdated]);
		await GameNotificationsService.sendFirstMessage(game);
	}

	public static async notifyWrongColorsMessage ({ ctx, game, me, turnMeta }: GameServiceOptionsStage['Colors']) {
		await BOT.editMessage({ ctx, text: InfoMessage.wrongColorsMe(turnMeta) });
		await game.mailing({ text: InfoMessage.wrongColorsMailing(turnMeta, me) }, [me.id, ...game.playersWithComposedUpdated]);
		await GameNotificationsService.sendFirstMessage(game);
	}

	public static async notifyWrongSuitsMessage ({ ctx, game, me, turnMeta }: GameServiceOptionsStage['Suits']) {
		await BOT.editMessage({ ctx, text: InfoMessage.wrongSuitsMe(turnMeta) });
		await game.mailing({ text: InfoMessage.wrongSuitsMailing(turnMeta, me) }, [me.id, ...game.playersWithComposedUpdated]);
		await this.sendFirstMessage(game);
	}

	public static async notifyStealMessage ({ ctx, game, me, turnMeta }: GameServiceOptionsStage['Suits']) {
		await BOT.editMessage({ ctx, text: GameMessage.getCardsStealMessage(turnMeta) });
		await game.mailing({ text: InfoMessage.stealCardsMailing(turnMeta, me) }, [me.id, ...game.playersWithComposedUpdated]);
	}

	public static async notifyComposeAthanasiusMessage ({ ctx, game, me, turnMeta }: GameServiceOptionsStage['Suits']) {
		await BOT.sendMessage({ ctx, text: InfoMessage.newAthanasiusMe(turnMeta) });
		await game.mailing({ text: InfoMessage.newAthanasiusMailing(turnMeta, me) }, [me.id, ...game.playersWithComposedUpdated]);
	}

	private static getSortedAthanasiusesMap (athanasiuses: GameSchema['athanasiuses']): [string, number][] {
		const athanasiusesMap: [string, number][] = [];

		Object.entries(athanasiuses).forEach(([playerId, cardNames]) => {
			const player = ORM.Users.get(Number(playerId));
			athanasiusesMap.push([player.name, cardNames.length]);
		});

		return athanasiusesMap.sort((a, b) => b[1] - a[1]);
	}

	public static async notifyEndGameMessage (game: Game) {
		await game.mailing({ text: InfoMessage.gameEndedMailing(this.getSortedAthanasiusesMap(game.getAthanasiuses())) });
	}
}
