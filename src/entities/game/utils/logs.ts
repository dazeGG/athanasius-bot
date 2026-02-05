import { ORM } from '~/db';
import { DeckConfig } from '~/entities/deck';
import type { GameLog, GameUtils } from '~/db';

import type { PlayerId } from '../types';
import { TurnMeta, TurnOptions } from '../types';

export class GameLogs {
	private static formatStealData (stealData: number[]): string {
		switch (stealData.length) {
		case 1:
			return `${stealData[0]}`;
		case 2:
			return `🔴: ${stealData[0]} ⚫: ${stealData[1]}`;
		case 4:
			return `♥️: ${stealData[0]} ♦️: ${stealData[1]} ♠️: ${stealData[2]} ♣️: ${stealData[3]}`;
		default:
			throw new Error('Wrong stealData! Expected 1, 2 or 4 numbers!');
		}
	}

	private static getLogMessage (log: GameLog): string {
		const from = ORM.Users.get(log.from);
		const to = ORM.Users.get(log.to);

		let msg = `<b>${from.name} -> ${to.name}</b> | ${DeckConfig.CARDS_VIEW_MAP[log.cardName]}`;

		if (log.stealData?.length) {
			if (log.steal) {
				msg += ' | ' + GameLogs.formatStealData(log.stealData);
			} else {
				msg += ` | Не ${GameLogs.formatStealData(log.stealData)}`;
			}
		}

		return msg;
	}

	public static hasLogs (utils: GameUtils, playerId: PlayerId): boolean {
		return utils.logs[utils.logs.length - 1].from !== playerId;
	}

	public static getLastRoundLogs (utils: GameUtils, playerId: PlayerId): string {
		const result: string[] = [];

		for (let i = utils.logs.length - 1; i >= 0; i--) {
			const log = utils.logs[i];
			if (log.from === playerId) {
				break;
			}
			result.push(GameLogs.getLogMessage(log));
		}

		return result.reverse().join('\n');
	}
}
