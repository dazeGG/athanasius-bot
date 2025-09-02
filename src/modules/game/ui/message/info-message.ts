import type { CallbackContext, EditMessageOptions } from '~/core';
import type { UserSchema } from '~/db';
import { CARDS_VIEW_MAP } from '~/entities/deck';
import type { CardStageMeta, ColorsStageMeta, CountStageMeta, SuitsStageMeta, TurnMeta } from '~/entities/game';

import { txt } from '..';

export class InfoMessage {
	/* MAILING */
	private static players (turnMeta: TurnMeta, me: UserSchema): string {
		return `<b>${me.name} -> ${turnMeta.player.name}</b>\n\n`;
	}

	private static playersCard (turnMeta: CardStageMeta | CountStageMeta | ColorsStageMeta | SuitsStageMeta, me: UserSchema): string {
		return this.players(turnMeta, me) + `<b>Карта: ${CARDS_VIEW_MAP[turnMeta.cardName]}</b>\n`;
	}

	public static gameStartedMailing (players: string, deckCount: number): string {
		const gameStarted = txt.gameStarted + '\n' +
			txt.players + ':\n' +
			players + '\n' +
			'\n' +
			txt.gameSettings + ':\n' +
			'• ' + txt.decksCount + ': ' + deckCount;
		return gameStarted;
	}

	public static gameEndedMailing (winners: string[], countAthanasiuses: number): string {
		const txtGameEnded = txt.gameEnded + '\n\n';

		if (winners.length === 1) {
			return txtGameEnded + `Победитель: <b>${winners[0]}</b>\n` +
				`Количество Афанасиев: <b>${countAthanasiuses}</b>`;
		} else {
			return txtGameEnded + `Победители: <b>${winners.join(', ')}</b>\n` +
				`Количество Афанасиев: ${countAthanasiuses}`;
		}
	}

	public static wrongCardMailing (turnMeta: CardStageMeta, me: UserSchema): string {
		return this.players(turnMeta, me) + 'Карта не ' + CARDS_VIEW_MAP[turnMeta.cardName];
	}

	public static wrongCountMailing (turnMeta: CountStageMeta, me: UserSchema): string {
		return this.playersCard(turnMeta, me) + 'Количество не ' + turnMeta.count;
	}

	public static wrongColorsMailing (turnMeta: ColorsStageMeta, me: UserSchema): string {
		return this.playersCard(turnMeta, me) + `Цвета не 🔴: ${turnMeta.redCount} ⚫: ${turnMeta.blackCount}`;
	}

	public static wrongSuitsMailing (turnMeta: SuitsStageMeta, me: UserSchema): string {
		return this.playersCard(turnMeta, me) + `Не ♥️: ${turnMeta.suits.hearts} ♦️: ${turnMeta.suits.diamonds} ♠️: ${turnMeta.suits.spades} ♣️: ${turnMeta.suits.clubs}`;
	}

	public static newAthanasiusMailing (turnMeta: SuitsStageMeta, me: UserSchema): string {
		return `У <b>${me.name}</b> новый Афанасий ${CARDS_VIEW_MAP[turnMeta.cardName]}!`;
	}

	/* ME */
	private static meWrong (turnMeta: TurnMeta): string {
		return '<b>К сожалению, ты не угадал</b>\n' +
			'\n' +
			'У ' + turnMeta.player.name;
	}

	public static wrongCardMe (ctx: CallbackContext, turnMeta: CardStageMeta): EditMessageOptions {
		return { ctx, text: this.meWrong(turnMeta) + ` нет ${CARDS_VIEW_MAP[turnMeta.cardName]} :(` };
	}

	public static wrongCountMe (ctx: CallbackContext, turnMeta: CountStageMeta): EditMessageOptions {
		return {
			ctx,
			text: this.meWrong(turnMeta) + ` количество ${CARDS_VIEW_MAP[turnMeta.cardName]} не ${turnMeta.count} :(`,
		};
	}

	public static wrongColorsMe (ctx: CallbackContext, turnMeta: ColorsStageMeta): EditMessageOptions {
		return {
			ctx,
			text: this.meWrong(turnMeta) + ` количество красных ${CARDS_VIEW_MAP[turnMeta.cardName]} не ${turnMeta.redCount} :(`,
		};
	}

	public static wrongSuitsMe (ctx: CallbackContext, turnMeta: SuitsStageMeta): EditMessageOptions {
		return {
			ctx,
			text: this.meWrong(turnMeta) + ` масти не ♥️: ${turnMeta.suits.hearts} ♦️: ${turnMeta.suits.diamonds} ♠️: ${turnMeta.suits.spades} ♣️: ${turnMeta.suits.clubs} :(`,
		};
	}

	public static newAthanasiusMe (ctx: CallbackContext, turnMeta: SuitsStageMeta): EditMessageOptions {
		return { ctx, text: `<b>Поздравляю!</b> У тебя новый Афанасий ${CARDS_VIEW_MAP[turnMeta.cardName]}!` };
	}
}
