import { DeckConfig } from '~/entities/deck';
import type {
	TurnMeta,
	Suits,
	CardStageMeta,
	CountStageMeta,
	ColorsStageMeta,
	SuitsStageMeta,
} from '~/entities/game';

import { txt } from './texts';

export class GameMessage {
	private static generateChoiceMessage (turnMeta: TurnMeta): string {
		let choiceMessage = '<b>' + txt.yourChoice + ':</b>\n\n';

		choiceMessage += '• ' + txt.player + ': ' + '<b>' + turnMeta.player.name + '</b>\n';

		if (turnMeta.cardName) {
			choiceMessage += '• ' + txt.card + ': ' + '<b>' + DeckConfig.CARDS_VIEW_MAP[turnMeta.cardName] + '</b>\n';
		}

		if (turnMeta.count && (turnMeta.countAction === undefined || turnMeta.countAction === 'select')) {
			choiceMessage += '• ' + txt.cardsCount + ': ' + '<b>' + turnMeta.count + '</b>\n';
		}

		if (
			turnMeta.redCount !== undefined
			&& turnMeta.blackCount !== undefined
			&& (turnMeta.redCountAction === undefined || turnMeta.redCountAction === 'select')
		) {
			choiceMessage += '• ' + txt.colors + ': ' + `🔴: <b>${turnMeta.redCount}</b> ⚫: <b>${turnMeta.blackCount}</b>\n`;
		}

		return choiceMessage;
	}

	public static getFirstMessage (initialMessage: boolean): string {
		return initialMessage ? txt.firstTurnMessage : '<b>Твой ход!</b>\n\nВыбери у кого хочешь спросить карту';
	}

	public static getCardSelectMessage (turnMeta: TurnMeta): string {
		return this.generateChoiceMessage(turnMeta) + '\n' + txt.turnCardSelect;
	}

	public static getCountSelectMessage (turnMeta: CardStageMeta | CountStageMeta, count: number): string {
		return this.generateChoiceMessage(turnMeta) +
			'\n' +
			txt.turnCountSelect + '\n' +
			'\n' +
			txt.nowSelected + ': <b>' + count + '</b>';
	}

	public static getColorsSelectMessage (turnMeta: CountStageMeta | ColorsStageMeta, redCount: number): string {
		return this.generateChoiceMessage(turnMeta) +
			'\n' +
			txt.turnColorsSelect + '\n' +
			'\n' +
			txt.nowSelected + ':\n' +
			'🔴: <b>' + redCount + '</b> ⚫: <b>' + (turnMeta.count - redCount) + '</b>\n';
	}

	private static getSuitsNowSelected (turnMeta: TurnMeta, suits: Suits, showRed: boolean, showBlack: boolean): string {
		const nowSelectedItems = [];

		if (showRed) {
			nowSelectedItems.push(`♥️: <b>${suits.hearts}</b>`, `♦️: <b>${suits.diamonds}</b>`);
		}

		if (showBlack) {
			nowSelectedItems.push(`♠️: <b>${suits.spades}</b>`, `♣️: <b>${suits.clubs}</b>`);
		}

		let text = nowSelectedItems.join(' ');

		if (turnMeta.count && turnMeta.redCount !== undefined && turnMeta.blackCount !== undefined) {
			if (suits.hearts + suits.diamonds > turnMeta.redCount) {
				text += `\n\n⚠️<b>${txt.redCountError}</b>`;
			}

			if (suits.spades + suits.clubs > turnMeta.blackCount) {
				text += `\n\n⚠️<b>${txt.blackCountError}</b>`;
			}

			if (suits.hearts + suits.diamonds + suits.spades + suits.clubs > turnMeta.count) {
				text += `\n\n⚠️<b>${txt.suitsCountError}</b>`;
			}
		}

		return text;
	}

	public static getSuitsSelectMessage (turnMeta: ColorsStageMeta | SuitsStageMeta, suits: Suits): string {
		return this.generateChoiceMessage(turnMeta) +
			'\n' +
			txt.turnSuitsSelect + '\n' +
			'\n' +
			txt.nowSelected + ':\n' +
			this.getSuitsNowSelected(turnMeta, suits, turnMeta.redCount > 0, turnMeta.redCount !== turnMeta.count);
	}

	public static getCardsStealMessage (turnMeta: SuitsStageMeta): string {
		return '🟩 <b>Ты успешно украл карты :)</b>\n' +
			'\n' +
			`Игрок: ${turnMeta.player.name}\n` +
			`Карта: ${DeckConfig.CARDS_VIEW_MAP[turnMeta.cardName]}\n` +
			`Масти: ♥️: ${turnMeta.suits.hearts} ♦️: ${turnMeta.suits.diamonds} ♠️: ${turnMeta.suits.spades} ♣️: ${turnMeta.suits.clubs}`;
	}
}
