import { txt } from '.';
import type { MailingOptions, TurnMeta } from '../types';
import type { UserSchema } from '~/core';

export class InfoMessage {
	public static getGameStartMessage (): MailingOptions {
		return {
			text: txt.gameStarted,
		};
	}

	public static getWrongCardMessage (turnMeta: TurnMeta, user: UserSchema): MailingOptions {
		let turnMessage = '<b>' + user.name + ' -> ' + turnMeta.player.name + '</b>\n\n';

		turnMessage += 'Карта не ' + turnMeta.cardName + '\n';

		return {
			text: turnMessage,
		};
	}

	public static getWrongCountMessage (turnMeta: TurnMeta, user: UserSchema): MailingOptions {
		let turnMessage = '<b>' + user.name + ' -> ' + turnMeta.player.name + ` </b>\nКарта ${turnMeta.cardName}\n`;

		if (turnMeta.count) {
			turnMessage += 'не ' + turnMeta.count + '\n';
		}

		return {
			text: turnMessage,
		};
	}

	public static getWrongColorMessage (turnMeta: TurnMeta, user: UserSchema): MailingOptions {
		let turnMessage = '<b>' + user.name + ' -> ' + turnMeta.player.name + ` </b>\nКарта ${turnMeta.cardName}\n`;

		if (turnMeta.redCount !== undefined
            && turnMeta.blackCount !== undefined
		) {
			turnMessage += txt.colors + ' не ' + `🔴: ${turnMeta.redCount} ⚫: ${turnMeta.blackCount}\n`;
		}

		return {
			text: turnMessage,
		};
	}

	public static getWrongSuitsMessage (turnMeta: TurnMeta, user: UserSchema): MailingOptions {
		let turnMessage = '<b>' + user.name + ' -> ' + turnMeta.player.name + ` </b>\nКарта ${turnMeta.cardName}\n`;
		turnMessage += 'не ';

		if (turnMeta.suits?.hearts !== 0) {
			turnMessage += `♥️: ${turnMeta.suits?.hearts} `;
		}

		if (turnMeta.suits?.diamonds !== 0) {
			turnMessage += `♦️: ${turnMeta.suits?.diamonds} `;
		}
		if (turnMeta.suits?.spades !== 0) {
			turnMessage += `♠️: ${turnMeta.suits?.spades} `;
		}

		if (turnMeta.suits?.clubs !== 0) {
			turnMessage += `♣️: ${turnMeta.suits?.clubs} `;
		}

		return {
			text: turnMessage,
		};
	}
}
