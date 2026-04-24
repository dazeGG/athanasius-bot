import { ORM } from '~/db';
import { DeckConfig } from '~/entities/deck';
import { escapeHtml } from '~/shared/lib';
import type { GameLog, GameUtilsParsed } from '~/db';

import type { PlayerId } from '../types';

function formatStealData (stealData: number[]): string {
	switch (stealData.length) {
	case 1:
		return `${stealData[0]}`;
	case 2: {
		const parts: string[] = [];
		if (stealData[0] > 0) {
			parts.push(`🔴 ${stealData[0]}`);
		}
		if (stealData[1] > 0) {
			parts.push(`⚫ ${stealData[1]}`);
		}
		return parts.join(' ');
	}
	case 4: {
		const [hearts, diamonds, spades, clubs] = stealData;
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
	default:
		throw new Error('Wrong stealData! Expected 1, 2 or 4 numbers!');
	}
}

function getLogPrefix (log: GameLog): string {
	if (log.athanasius) {
		return '⭐';
	}
	if (log.steal) {
		return '🟩';
	}
	return '🟥';
}

function getLogMessage (log: GameLog, viewerId?: PlayerId): string {
	const from = ORM.Users.get(log.from);
	const to = ORM.Users.get(log.to);
	const isVictim = viewerId !== undefined && log.to === viewerId && log.steal;
	const prefix = isVictim ? '🟧' : getLogPrefix(log);
	const toName = isVictim ? 'Ты' : escapeHtml(to.name);

	let msg = `${prefix} <b>${escapeHtml(from.name)} → ${toName}</b> | ${DeckConfig.CARDS_VIEW_MAP[log.cardName]}`;

	if (log.stealData?.length) {
		const formatted = formatStealData(log.stealData);
		if (formatted) {
			msg += ` | ${formatted}`;
		}
	}

	if (log.athanasius) {
		msg += ' — Афанасий!';
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
		result.push(getLogMessage(log, playerId));
	}

	return result.reverse().join('\n');
}
