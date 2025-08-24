import { txt } from '.';
import type { CardStageMeta, ColorsStageMeta, CountStageMeta, SuitsStageMeta, TurnMeta } from '../types';
import type { UserSchema } from '~/core';

export class InfoMessage {
	private static getPlayersMessage (turnMeta: TurnMeta, user: UserSchema): string {
		return `<b>${user.name} -> ${turnMeta.player.name}</b>\n`;
	}

	private static getPlayersCardMessage (turnMeta: TurnMeta, user: UserSchema): string {
		return this.getPlayersMessage(turnMeta, user) +
			'\n' +
			`<b>Карта: ${turnMeta.cardName}</b>\n`;
	}

	public static getGameStartMessage (): string {
		return txt.gameStarted;
	}

	public static getWrongCardMessage (turnMeta: CardStageMeta, user: UserSchema): string {
		return this.getPlayersCardMessage(turnMeta, user) + 'Карта не ' + turnMeta.cardName;
	}

	public static getWrongCountMessage (turnMeta: CountStageMeta, user: UserSchema): string {
		return this.getPlayersCardMessage(turnMeta, user) + 'Количество не ' + turnMeta.count;
	}

	public static getWrongColorMessage (turnMeta: ColorsStageMeta, user: UserSchema): string {
		return this.getPlayersCardMessage(turnMeta, user) + `Цвета не 🔴: ${turnMeta.redCount} ⚫: ${turnMeta.blackCount}`;
	}

	public static getWrongSuitsMessage (turnMeta: SuitsStageMeta, user: UserSchema): string {
		let turnMessage = this.getPlayersCardMessage(turnMeta, user) + 'Не';

		if (turnMeta.suits.hearts) {
			turnMessage += ` ♥️: ${turnMeta.suits.hearts}`;
		}

		if (turnMeta.suits.diamonds) {
			turnMessage += ` ♦️: ${turnMeta.suits.diamonds}`;
		}
		if (turnMeta.suits.spades) {
			turnMessage += ` ♠️: ${turnMeta.suits.spades}`;
		}

		if (turnMeta.suits.clubs) {
			turnMessage += ` ♣️: ${turnMeta.suits.clubs}`;
		}

		return turnMessage;
	}
}
