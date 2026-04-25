import { DeckConfig } from '~/entities/deck';
import type { GameLog, GameUtils, GameUtilsParsed } from '~/db';

function parseGameLog (originalLog: string): GameLog {
	const [from, to, cardName, steal, stealData, athanasius] = originalLog.split(':');
	const parsed: Partial<GameLog> = {};

	parsed.from = Number(from);
	parsed.to = Number(to);

	if (isNaN(parsed.from) || isNaN(parsed.to)) {
		throw new Error(`Unable to parse game log: from and to must be a number, got ${from} and ${to} respectively`);
	}

	if (steal && steal !== '0' && steal !== '1') {
		throw new Error(`Unable to parse game log: steal must be "true" or "false" got "${steal}"`);
	}

	parsed.steal = steal === '1';

	if (DeckConfig.isCardName(cardName)) {
		parsed.cardName = cardName;
	} else {
		throw new Error('Unable to parse game log: cardName is invalid');
	}

	if (stealData) {
		const parsedStealData = stealData.split(',').map(Number);

		if (parsedStealData.some(isNaN)) {
			throw new Error('Unable to parse game log: stealData contains invalid numbers');
		}

		const validLengths = [1, 2, 4];

		if (!validLengths.includes(parsedStealData.length)) {
			throw new Error(`Unable to parse game log: stealData length must be 1, 2 or 4, got ${parsedStealData.length}`);
		}

		parsed.stealData = parsedStealData as [number] | [number, number] | [number, number, number, number];
	}

	if (athanasius === '1') {
		parsed.athanasius = true;
	}

	return parsed as GameLog;
}

function generateGameLog (log: GameLog): string {
	const { from, to, cardName, steal, stealData, athanasius } = log;
	return `${from}:${to}:${cardName}:${steal ? 1 : 0}:${stealData ? stealData.join(',') : ''}:${athanasius ? 1 : 0}`;
}

export function parseGameUtils (gameUtils: GameUtils): GameUtilsParsed {
	return {
		cardsToAthanasius: gameUtils.cardsToAthanasius,
		jokerCardsToAthanasius: gameUtils.jokerCardsToAthanasius ?? gameUtils.cardsToAthanasius / 2,
		logs: gameUtils.logs.map(log => parseGameLog(log)),
	};
}

export function generateGameUtils (gameUtils: GameUtilsParsed): GameUtils {
	return {
		cardsToAthanasius: gameUtils.cardsToAthanasius,
		jokerCardsToAthanasius: gameUtils.jokerCardsToAthanasius,
		logs: gameUtils.logs.map(log => generateGameLog(log)),
	};
}
