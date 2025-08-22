import { txt } from '.';
import type { MailingOptions, TurnMeta } from '../types';

export class InfoMessage {
	public static getGameStartMessage (): MailingOptions {
		return {
			text: txt.gameStarted,
		};
	}

	public static getFirstMessage (turnMeta: TurnMeta): MailingOptions {
		return {
			text: txt.gameStarted,
		};
	}
}
