import { BOT } from '~/core';
import { TurnStage } from '~/entities/game';
import { GLOBAL_KEYBOARD } from '~/shared/lib';
import type { Game } from '~/entities/game';

import { txt, gkb, InfoMessage, GameMessage } from '../ui';
import { SERVICES_CONFIG } from './config';
import type { GameServiceOptions, GameServiceOptionsStage, UpdateMessageOptionsStage } from './types';

export class GameNotificationsService {
	public static async sendFirstMessage (game: Game, initial: boolean = false) {
		await BOT.sendMessageByChatId({
			chatId: game.activePlayer.id,
			text: initial ? txt.firstTurnMessage : '<b>Твой ход!</b>\n\nВыбери у кого хочешь спросить карту',
			keyboard: gkb.playersSelect(game.activePlayer.id, game.gameId, game.allPlayers),
		});
	}

	public static async notifyNextStage ({ ctx, game, turnMeta }: GameServiceOptions) {
		switch (turnMeta.stage) {
		case TurnStage.player:
			await BOT.editMessage({
				ctx,
				text: GameMessage.getCardSelectMessage(turnMeta),
				keyboard: gkb.cardSelect(ctx.callback.from.id, game, turnMeta.player.id),
			});
			break;
		case TurnStage.card:
			await BOT.editMessage({
				ctx,
				text: GameMessage.getCountSelectMessage(turnMeta, SERVICES_CONFIG.INITIAL_COUNT),
				keyboard: gkb.countSelect(turnMeta.gameId, turnMeta.player.id, turnMeta.cardName, SERVICES_CONFIG.INITIAL_COUNT),
			});
			break;
		case TurnStage.count:
			await BOT.editMessage({
				ctx,
				text: GameMessage.getColorsSelectMessage(turnMeta, SERVICES_CONFIG.INITIAL_RED_COUNT),
				keyboard: gkb.colorsSelect(turnMeta.gameId, turnMeta.player.id, turnMeta.cardName, turnMeta.count, SERVICES_CONFIG.INITIAL_RED_COUNT),
			});
			break;
		case TurnStage.colors:
			await BOT.editMessage({
				ctx,
				text: GameMessage.getSuitsSelectMessage(turnMeta, SERVICES_CONFIG.INITIAL_SUITS),
				keyboard: gkb.suitsSelect(
					turnMeta.gameId,
					turnMeta.player.id,
					turnMeta.cardName,
					turnMeta.count,
					turnMeta.redCount,
					SERVICES_CONFIG.INITIAL_SUITS,
				),
			});
			break;
		}
	}

	public static async updateCountMessage ({ ctx, turnMeta, newCount }: UpdateMessageOptionsStage['Count']) {
		await BOT.editMessage({
			ctx,
			text: GameMessage.getCountSelectMessage(turnMeta, newCount),
			keyboard: gkb.countSelect(turnMeta.gameId, turnMeta.player.id, turnMeta.cardName, newCount),
		});
	}

	public static async updateColorsMessage ({ ctx, turnMeta, newRedCount }: UpdateMessageOptionsStage['Colors']) {
		await BOT.editMessage({
			ctx,
			text: GameMessage.getColorsSelectMessage(turnMeta, newRedCount),
			keyboard: gkb.colorsSelect(turnMeta.gameId, turnMeta.player.id, turnMeta.cardName, turnMeta.count, newRedCount),
		});
	}

	public static async updateSuitsMessage ({ ctx, turnMeta, newSuits }: UpdateMessageOptionsStage['Suits']) {
		await BOT.editMessage({
			ctx,
			text: GameMessage.getSuitsSelectMessage(turnMeta, newSuits),
			keyboard: gkb.suitsSelect(
				turnMeta.gameId,
				turnMeta.player.id,
				turnMeta.cardName,
				turnMeta.count,
				turnMeta.redCount,
				newSuits,
			),
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
		await BOT.editMessage({ ctx, text: InfoMessage.newAthanasiusMe(turnMeta) });
		await game.mailing({ text: InfoMessage.newAthanasiusMailing(turnMeta, me) }, [me.id, ...game.playersWithComposedUpdated]);
	}

	public static async notifyEndGameMessage (game: Game, winners: string[], maxCount: number) {
		await game.mailing({
			text: InfoMessage.gameEndedMailing(winners, maxCount),
			options: { reply_markup: { keyboard: GLOBAL_KEYBOARD, resize_keyboard: true } },
		});
	}
}
