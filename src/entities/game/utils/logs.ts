import { ORM } from '~/db';
import { DeckConfig } from '~/entities/deck';
import { escapeHtml } from '~/shared/lib';
import { formatSuits } from '~/shared/ui/game';
import type { GameLog, GameUtilsParsed } from '~/db';

import type { PlayerId } from '../types';

function formatStealData (stealData: number[]): string {
	switch (stealData.length) {
	case 1:
		return `${stealData[0]}`;
	case 2:
		return `🔴: ${stealData[0]} ⚫: ${stealData[1]}`;
	case 4:
		return formatSuits({ hearts: stealData[0], diamonds: stealData[1], spades: stealData[2], clubs: stealData[3] });
	default:
		throw new Error('Wrong stealData! Expected 1, 2 or 4 numbers!');
	}
}

function getLogMessage (log: GameLog): string {
	const from = ORM.Users.get(log.from);
	const to = ORM.Users.get(log.to);

	let msg = `<b>${escapeHtml(from.name)} -> ${escapeHtml(to.name)}</b> | ${DeckConfig.CARDS_VIEW_MAP[log.cardName]}`;

	if (log.stealData?.length) {
		if (log.steal) {
			msg += ' | ' + formatStealData(log.stealData);
		} else {
			msg += ` | Не ${formatStealData(log.stealData)}`;
		}
	}

	if (log.athanasius) {
		msg += ' | 🟨 Афанасий!';
	}

	return msg;
}

export function getLastRoundLogs (utils: GameUtilsParsed, playerId: PlayerId): string {
	const result: string[] = [];

	for (let i = utils.logs.length - 1; i >= 0; i--) {
		const log = utils.logs[i];
		if (log.from === playerId) {
			break;
		}
		result.push(getLogMessage(log));
	}

	return result.reverse().join('\n');
}
