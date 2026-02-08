import type { UserSchema } from '~/db';
import { DeckConfig } from '~/entities/deck';
import type { CardStageMeta, ColorsStageMeta, CountStageMeta, SuitsStageMeta, TurnMeta } from '~/entities/game';

import { txt } from './texts';

export class InfoMessage {
	/* MAILING */
	private static players (turnMeta: TurnMeta, me: UserSchema): string {
		return `🟨 <b>${me.name} -> ${turnMeta.player.name}</b>\n\n`;
	}

	private static playersCard (turnMeta: CardStageMeta | CountStageMeta | ColorsStageMeta | SuitsStageMeta, me: UserSchema): string {
		return this.players(turnMeta, me) + `<b>Карта: ${DeckConfig.CARDS_VIEW_MAP[turnMeta.cardName]}</b>\n`;
	}

	public static gameStartedMailing (playersList: string, deckCount: number): string {
		return '🦎 <b>' + txt.gameStarted + '</b>\n' +
			'\n' +
			txt.players + ':\n' +
			playersList + '\n' +
			'\n' +
			txt.gameSettings + ':\n' +
			'• ' + txt.decksCount + ': ' + deckCount;
	}

	public static gameEndedMailing (winners: string[], athanasiusesCount: number): string {
		let txtGameEnded = '🦎 <b>' + txt.gameEnded + '</b>\n\n';

		if (winners.length === 1) {
			txtGameEnded += `Победитель: <b>${winners[0]}</b>\n`;
		} else {
			txtGameEnded += `Победители: <b>${winners.join(', ')}</b>\n`;
		}

		return txtGameEnded + `Количество Афанасиев: ${athanasiusesCount}`;
	}

	public static wrongCardMailing (turnMeta: CardStageMeta, me: UserSchema): string {
		return this.players(turnMeta, me) + `Нет карт ${DeckConfig.CARDS_VIEW_MAP[turnMeta.cardName]}`;
	}

	public static wrongCountMailing (turnMeta: CountStageMeta, me: UserSchema): string {
		return this.playersCard(turnMeta, me) + `Количество не ${turnMeta.count}`;
	}

	public static wrongColorsMailing (turnMeta: ColorsStageMeta, me: UserSchema): string {
		return this.playersCard(turnMeta, me) + `Цвета не 🔴: ${turnMeta.redCount} ⚫: ${turnMeta.blackCount} (${turnMeta.count})`;
	}

	public static wrongSuitsMailing (turnMeta: SuitsStageMeta, me: UserSchema): string {
		return this.playersCard(turnMeta, me) + `Не ♥️: ${turnMeta.suits.hearts} ♦️: ${turnMeta.suits.diamonds} ♠️: ${turnMeta.suits.spades} ♣️: ${turnMeta.suits.clubs} (${turnMeta.count})`;
	}

	public static stealCardsMailing (turnMeta: SuitsStageMeta, me: UserSchema): string {
		return this.playersCard(turnMeta, me) + `Украл ♥️: ${turnMeta.suits.hearts} ♦️: ${turnMeta.suits.diamonds} ♠️: ${turnMeta.suits.spades} ♣️: ${turnMeta.suits.clubs}`;
	}

	public static newAthanasiusMailing (turnMeta: SuitsStageMeta, me: UserSchema): string {
		return `🟨 У <b>${me.name}</b> новый Афанасий ${DeckConfig.CARDS_VIEW_MAP[turnMeta.cardName]}!`;
	}

	/* ME */
	private static meWrongBase (turnMeta: TurnMeta): string {
		return `🟥 <b>К сожалению, ты не угадал :(</b>\n\nИгрок: ${turnMeta.player.name}\n`;
	}

	private static meWrongWithCard (turnMeta: CountStageMeta | ColorsStageMeta | SuitsStageMeta): string {
		return this.meWrongBase(turnMeta) + `Карта: ${DeckConfig.CARDS_VIEW_MAP[turnMeta.cardName]}\n`;
	}

	private static meWrongWithCount (turnMeta: ColorsStageMeta | SuitsStageMeta): string {
		return this.meWrongWithCard(turnMeta) + `Количество: <b>${turnMeta.count}</b>\n`;
	}

	public static wrongCardMe (turnMeta: CardStageMeta): string {
		return this.meWrongBase(turnMeta) + `Нет карт ${DeckConfig.CARDS_VIEW_MAP[turnMeta.cardName]}`;
	}

	public static wrongCountMe (turnMeta: CountStageMeta): string {
		return this.meWrongWithCard(turnMeta) + `Количество не ${turnMeta.count}`;
	}

	public static wrongColorsMe (turnMeta: ColorsStageMeta): string {
		return this.meWrongWithCount(turnMeta) + `Цвета не 🔴: ${turnMeta.redCount} ⚫: ${turnMeta.blackCount}`;
	}

	public static wrongSuitsMe (turnMeta: SuitsStageMeta): string {
		return this.meWrongWithCount(turnMeta) + `Не ♥️: ${turnMeta.suits.hearts} ♦️: ${turnMeta.suits.diamonds} ♠️: ${turnMeta.suits.spades} ♣️: ${turnMeta.suits.clubs}`;
	}

	public static newAthanasiusMe (turnMeta: SuitsStageMeta): string {
		return `🟩 У тебя новый Афанасий <b>${DeckConfig.CARDS_VIEW_MAP[turnMeta.cardName]}</b>!`;
	}
}
