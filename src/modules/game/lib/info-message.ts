import type { SendMessageByChatIdOptions } from '~/core';

import { txt } from '.';
import type { PlayerId, TurnMeta } from '../types';

export class InfoMessage {
	public static getGameStartMessage (playerId: PlayerId): SendMessageByChatIdOptions {
		return {
			chatId: playerId,
			text: txt.gameStarted,
		};
	}

	public static getFirstMessage (playerId: PlayerId, turnMeta: TurnMeta): SendMessageByChatIdOptions {
		return {
			chatId: playerId,
			text: txt.gameStarted,
		};
	}
}
