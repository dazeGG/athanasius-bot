import { DeckConfig } from '~/entities/deck';
import { playersList } from '~/shared/ui';
import type { RoomSchema, UserSchema } from '~/db';
import type { CardStageMeta, ColorsStageMeta, CountStageMeta, SuitsStageMeta, TurnMeta } from '~/entities/game';

import { txt } from '.';
import { formatSuits } from './game-message';

export class InfoMessage {
	/* MAILING */
	private static players (turnMeta: TurnMeta, me: UserSchema): string {
		return `🟨 <b>${me.name} -> ${turnMeta.player.name}</b>\n\n`;
	}

	private static playersCard (turnMeta: CardStageMeta | CountStageMeta | ColorsStageMeta | SuitsStageMeta, me: UserSchema): string {
		return this.players(turnMeta, me) + `<b>Карта: ${DeckConfig.CARDS_VIEW_MAP[turnMeta.cardName]}</b>\n`;
	}

	public static gameStartedMailing (room: RoomSchema): string {
		return `Комната ${room.name} | ${txt.gameStarted}\n` +
			'\n' +
			txt.players + ':\n' +
			playersList(room.players) + '\n' +
			'\n' +
			txt.gameSettings + ':\n' +
			'• ' + txt.decksCount + ': ' + room.settings.decksCount;
	}

	private static formatPlayerResult (name: string, count: number): string {
		return `${name} - ${count} ${this.athanasiusRightText(count)}`;
	}

	private static athanasiusRightText (count: number): string {
		const lastDigit = Math.abs(count) % 10;
		const lastTwoDigits = Math.abs(count) % 100;

		if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
			return 'Афанасиев';
		}

		if (lastDigit === 1) {
			return 'Афанасий';
		}

		if (lastDigit >= 2 && lastDigit <= 4) {
			return 'Афанасия';
		}

		return 'Афанасиев';
	}

	public static gameEndedMailing (athMap: [string, number][]): string {
		let text = `🦎 <b>${txt.gameEnded}</b>\n\n`;
		text += 'Вот они, победители, слева на право:\n\n';

		const [first, second, third, ...others] = athMap;

		text += `🥇 ${this.formatPlayerResult(first[0], first[1])}\n`;
		text += `🥈 ${this.formatPlayerResult(second[0], second[1])}\n`;

		if (others.length == 0) {
			text += '\nОстальные результаты:\n\n';
			text += `🦧 ${this.formatPlayerResult(third[0], third[1])}`;
		} else {
			text += `🥉 ${this.formatPlayerResult(third[0], third[1])}\n`;

			text += '\nОстальные результаты:\n\n';

			others.forEach((other, i) => {
				text += `🦧 ${this.formatPlayerResult(other[0], other[1])}`;

				if (i !== others.length - 1) {
					text += '\n';
				}
			});
		}

		return text;
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
		return this.playersCard(turnMeta, me) + `Не ${formatSuits(turnMeta.suits)} (${turnMeta.count})`;
	}

	public static stealCardsMailing (turnMeta: SuitsStageMeta, me: UserSchema): string {
		return this.playersCard(turnMeta, me) + `Украл ${formatSuits(turnMeta.suits)}`;
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
		return this.meWrongWithCount(turnMeta) + `Не ${formatSuits(turnMeta.suits)}`;
	}

	public static newAthanasiusMe (turnMeta: SuitsStageMeta): string {
		return `🟩 У тебя новый Афанасий <b>${DeckConfig.CARDS_VIEW_MAP[turnMeta.cardName]}</b>!`;
	}
}
