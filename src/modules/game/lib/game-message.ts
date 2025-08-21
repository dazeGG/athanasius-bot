import _ from 'lodash';

import { DB } from '~/core';
import type { EditMessageOptions , CallbackContext } from '~/core';

import { txt, gkb } from '.';
import { TurnStage } from '../types';
import type { TurnMeta , Suits } from '../types';

export class GameMessage {
	public static generateChoiceMessage (turnMeta: TurnMeta): string {
		let choiceMessage = '<b>' + txt.yourChoice + ':</b>\n';

		if (turnMeta.stage >= TurnStage.card) {
			const user = DB.data.users.find(user => user.id === turnMeta.playerId);
			choiceMessage += '• ' + txt.player + ': ' + '<b>' + user?.name + '</b>\n';
		}

		if (turnMeta.stage >= TurnStage.count) {
			choiceMessage += '• ' + txt.card + ': ' + '<b>' + turnMeta.cardName + '</b>\n';
		}

		if (turnMeta.stage >= TurnStage.colors) {
			choiceMessage += '• ' + txt.cardsCount + ': ' + '<b>' + turnMeta.count + '</b>\n';
		}

		if (turnMeta.stage >= TurnStage.suits) {
			choiceMessage += '• ' + txt.colors + ': ' + `🔴: <b>${turnMeta.redCount}</b> ⚫: <b>${turnMeta.blackCount}</b>\n`;
		}

		return choiceMessage;
	}

	public static getCardSelectMessageOptions (ctx: CallbackContext, turnMeta: TurnMeta): EditMessageOptions {
		return {
			ctx,
			text: this.generateChoiceMessage(turnMeta) + '\n' + txt.turnCardSelect,
			keyboard: gkb.cardSelect(ctx.callback.from.id, turnMeta.gameId, turnMeta.playerId),
		};
	}

	public static getCountSelectMessageOptions (ctx: CallbackContext, turnMeta: TurnMeta): EditMessageOptions {
		if (turnMeta.cardName && turnMeta.count && turnMeta.countAction) {
			const newCount = turnMeta.countAction === '-' ? turnMeta.count - 1 : turnMeta.count + 1;

			return {
				ctx,
				text: this.generateChoiceMessage(turnMeta) +
					'\n' +
					txt.turnCountSelect + '\n' +
					'\n' +
					txt.nowSelected + ': <b>' + newCount + '</b>',
				keyboard: gkb.countSelect(turnMeta.gameId, turnMeta.playerId, turnMeta.cardName, newCount),
			};
		} else if (turnMeta.cardName) {
			const initialCount = 1;

			return {
				ctx,
				text: this.generateChoiceMessage(turnMeta) +
					'\n' +
					txt.turnCountSelect + '\n' +
					'\n' +
					txt.nowSelected + ': <b>' + initialCount + '</b>',
				keyboard: gkb.countSelect(turnMeta.gameId, turnMeta.playerId, turnMeta.cardName, initialCount),
			};
		} else {
			throw new Error('Card name is required!');
		}
	}

	public static getColorsSelectMessageOptions (ctx: CallbackContext, turnMeta: TurnMeta): EditMessageOptions {
		if (turnMeta.cardName && turnMeta.count && turnMeta.redCount !== undefined && turnMeta.redCountAction) {
			const newRedCount = turnMeta.redCountAction === '-' ? turnMeta.redCount - 1 : turnMeta.redCount + 1;

			return {
				ctx,
				text: this.generateChoiceMessage(turnMeta) +
					'\n' +
					txt.turnColorsSelect + '\n' +
					'\n' +
					txt.nowSelected + ':\n' +
					'🔴: <b>' + newRedCount + '</b> ⚫: <b>' + (turnMeta.count - newRedCount) + '</b>\n',
				keyboard: gkb.colorsSelect(turnMeta.gameId, turnMeta.playerId, turnMeta.cardName, turnMeta.count, newRedCount),
			};
		} else if (turnMeta.cardName && turnMeta.count) {
			const initialRedCount = 0;

			return {
				ctx,
				text: this.generateChoiceMessage(turnMeta) +
					'\n' +
					txt.turnColorsSelect + '\n' +
					'\n' +
					txt.nowSelected + ':\n' +
					'🔴: <b>' + initialRedCount + '</b> ⚫️: <b>' + (turnMeta.count - initialRedCount) + '</b>\n',
				keyboard: gkb.colorsSelect(turnMeta.gameId, turnMeta.playerId, turnMeta.cardName, turnMeta.count, initialRedCount),
			};
		} else {
			throw new Error('Card name and count is required!');
		}
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

	public static getSuitsSelectMessageOptions (ctx: CallbackContext, turnMeta: TurnMeta): EditMessageOptions {
		if (turnMeta.cardName && turnMeta.count && turnMeta.redCount !== undefined && turnMeta.suits) {
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

			return {
				ctx,
				text: this.generateChoiceMessage(turnMeta) +
					'\n' +
					txt.turnColorsSelect + '\n' +
					'\n' +
					txt.nowSelected + '\n' +
					this.getSuitsNowSelected(turnMeta, newSuits, turnMeta.redCount > 0, turnMeta.redCount !== turnMeta.count),
				keyboard: gkb.suitsSelect(
					turnMeta.gameId,
					turnMeta.playerId,
					turnMeta.cardName,
					turnMeta.count,
					turnMeta.redCount,
					newSuits,
				),
			};
		} else if (turnMeta.cardName && turnMeta.count && turnMeta.redCount !== undefined) {
			const initialSuits: Suits = { hearts: 0, diamonds: 0, spades: 0, clubs: 0, mode: '+' };

			return {
				ctx,
				text: this.generateChoiceMessage(turnMeta) +
					'\n' +
					txt.turnSuitsSelect + '\n' +
					'\n' +
					txt.nowSelected + '\n' +
					this.getSuitsNowSelected(turnMeta, initialSuits, turnMeta.redCount > 0, turnMeta.redCount !== turnMeta.count),
				keyboard: gkb.suitsSelect(
					turnMeta.gameId,
					turnMeta.playerId,
					turnMeta.cardName,
					turnMeta.count,
					turnMeta.redCount,
					initialSuits,
				),
			};
		} else {
			throw new Error('Card name, count and red count is required!');
		}
	}
}
