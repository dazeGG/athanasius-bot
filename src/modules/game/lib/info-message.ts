import type { CallbackContext, EditMessageOptions, UserSchema } from '~/core';

import { txt } from '.';
import type { CardStageMeta, ColorsStageMeta, CountStageMeta, SuitsStageMeta, TurnMeta } from '../types';

export class InfoMessage {
	/* MAILING */
	private static players (turnMeta: TurnMeta, user: UserSchema): string {
		return `<b>${user.name} -> ${turnMeta.player.name}</b>\n`;
	}

	private static playersCard (turnMeta: TurnMeta, user: UserSchema): string {
		return this.players(turnMeta, user) +
			'\n' +
			`<b>Карта: ${turnMeta.cardName}</b>\n`;
	}

	public static gameStartedMailing (): string {
		return txt.gameStarted;
	}

	public static wrongCardMailing (turnMeta: CardStageMeta, user: UserSchema): string {
		return this.playersCard(turnMeta, user) + 'Карта не ' + turnMeta.cardName;
	}

	public static wrongCountMailing (turnMeta: CountStageMeta, user: UserSchema): string {
		return this.playersCard(turnMeta, user) + 'Количество не ' + turnMeta.count;
	}

	public static wrongColorsMailing (turnMeta: ColorsStageMeta, user: UserSchema): string {
		return this.playersCard(turnMeta, user) + `Цвета не 🔴: ${turnMeta.redCount} ⚫: ${turnMeta.blackCount}`;
	}

	public static wrongSuitsMailing (turnMeta: SuitsStageMeta, user: UserSchema): string {
		return this.playersCard(turnMeta, user) + `Не ♥️: ${turnMeta.suits.hearts} ♦️: ${turnMeta.suits.hearts} ♠️: ${turnMeta.suits.hearts} ♣️: ${turnMeta.suits.hearts}`;
	}

	/* ME */
	private static meWrong (turnMeta: TurnMeta): string {
		return '<b>К сожалению, ты не угадал</b>\n' +
			'\n' +
			'У ' + turnMeta.player.name;
	}

	public static wrongCardMe (ctx: CallbackContext, turnMeta: CardStageMeta): EditMessageOptions {
		return { ctx, text: this.meWrong(turnMeta) + ` нет ${turnMeta.cardName} :(` };
	}

	public static wrongCountMe (ctx: CallbackContext, turnMeta: CountStageMeta): EditMessageOptions {
		return {
			ctx,
			text: this.meWrong(turnMeta) + ` количество ${turnMeta.cardName} не ${turnMeta.count} :(`,
		};
	}

	public static wrongColorsMe (ctx: CallbackContext, turnMeta: ColorsStageMeta): EditMessageOptions {
		return {
			ctx,
			text: this.meWrong(turnMeta) + ` количество красных ${turnMeta.cardName} не ${turnMeta.redCount} :(`,
		};
	}

	public static wrongSuitsMe (ctx: CallbackContext, turnMeta: SuitsStageMeta): EditMessageOptions {
		return {
			ctx,
			text: this.meWrong(turnMeta) + ` масти не ♥️: ${turnMeta.suits.hearts} ♦️: ${turnMeta.suits.diamonds} ♠️: ${turnMeta.suits.spades} ♣️: ${turnMeta.suits.clubs} :(`,
		};
	}
}
