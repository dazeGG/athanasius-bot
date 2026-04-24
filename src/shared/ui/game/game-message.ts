import { DeckConfig } from '~/entities/deck';
import { escapeHtml } from '~/shared/lib';
import type {
	TurnMeta,
	Suits,
	CardStageMeta,
	CountStageMeta,
	ColorsStageMeta,
	SuitsStageMeta,
} from '~/entities/game';

import { txt } from '.';

export function formatSuits ({ hearts, diamonds, spades, clubs }: Pick<Suits, 'hearts' | 'diamonds' | 'spades' | 'clubs'>): string {
	const parts: string[] = [];
	if (hearts > 0) {
		parts.push(`♥️ ${hearts}`);
	}
	if (diamonds > 0) {
		parts.push(`♦️ ${diamonds}`);
	}
	if (spades > 0) {
		parts.push(`♠️ ${spades}`);
	}
	if (clubs > 0) {
		parts.push(`♣️ ${clubs}`);
	}
	return parts.join(' ');
}

export function formatColors (red: number, black: number): string {
	const parts: string[] = [];
	if (red > 0) {
		parts.push(`🔴 ${red}`);
	}
	if (black > 0) {
		parts.push(`⚫ ${black}`);
	}
	return parts.join(' ');
}

export class GameMessage {
	private static generateChoiceMessage (turnMeta: TurnMeta): string {
		let choiceMessage = '<b>' + txt.yourChoice + ':</b>\n\n';

		choiceMessage += '• ' + txt.player + ': ' + '<b>' + escapeHtml(turnMeta.player.name) + '</b>\n';

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
				text += `\n\n⚠️ <b>${txt.redCountError}</b>`;
			}

			if (suits.spades + suits.clubs > turnMeta.blackCount) {
				text += `\n\n⚠️ <b>${txt.blackCountError}</b>`;
			}

			if (suits.hearts + suits.diamonds + suits.spades + suits.clubs > turnMeta.count) {
				text += `\n\n⚠️ <b>${txt.suitsCountError}</b>`;
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

	public static getCardsStealMessage (turnMeta: SuitsStageMeta, composeAthanasius: boolean): string {
		let msg = '🟩 <b>Ты успешно украл карты</b>\n' +
			'\n' +
			`Игрок: ${escapeHtml(turnMeta.player.name)}\n` +
			`Карта: ${DeckConfig.CARDS_VIEW_MAP[turnMeta.cardName]}\n` +
			`Масти: ${formatSuits(turnMeta.suits)}`;

		if (composeAthanasius) {
			msg += '\n\n⭐ <b>И это новый Афанасий!</b>';
		}

		return msg;
	}
}
