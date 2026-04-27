/**
 * end-game-message.ts — unit tests for gameEndedMailing medal distribution logic.
 */

import { InfoMessage } from '~/shared/ui/game/info-message';
import { assert } from '../runner';
import type { ModuleTools } from '../runner';

function msg (athMap: [string, number][]): string {
	return InfoMessage.gameEndedMailing(athMap);
}

function hasGold (text: string, name: string): boolean {
	return text.includes(`🥇`) && text.includes(name);
}

function hasSilver (text: string, name: string): boolean {
	const silverBlock = text.split('🥉')[0].split('🥇').slice(1).join('🥇');
	return silverBlock.includes('🥈') && silverBlock.includes(name);
}

function hasBronze (text: string, name: string): boolean {
	return text.includes('🥉') && text.split('🥉').slice(1).join('🥉').includes(name);
}

function hasLoser (text: string, name: string): boolean {
	return text.includes('🦧') && text.split('🦧').slice(1).join('🦧').includes(name);
}

function hasPlain (text: string, name: string): boolean {
	return text.includes('Простые ребята') && text.split('Простые ребята')[1].includes(name);
}

function noLoser (text: string): boolean {
	return !text.includes('🦧');
}

function noPlain (text: string): boolean {
	return !text.includes('Простые ребята');
}

export async function endGameMessageModule ({ runCase }: ModuleTools): Promise<void> {
	// ── 3 игрока, все разные ────────────────────────────────────────────────────
	await runCase('3 игрока, все разные — 🥇🥈🥉, без неудачника', () => {
		const text = msg([['A', 3], ['B', 2], ['C', 1]]);
		assert(hasGold(text, 'A'), 'A должен получить 🥇');
		assert(hasSilver(text, 'B'), 'B должен получить 🥈');
		assert(hasBronze(text, 'C'), 'C должен получить 🥉');
		assert(noLoser(text), 'Неудачника не должно быть');
		assert(noPlain(text), 'Простых не должно быть');
	});

	// ── 3 игрока, все одинаковые ────────────────────────────────────────────────
	await runCase('3 игрока, все одинаковые — все 🥇, без неудачника', () => {
		const text = msg([['A', 2], ['B', 2], ['C', 2]]);
		assert(hasGold(text, 'A'), 'A должен получить 🥇');
		assert(hasGold(text, 'B'), 'B должен получить 🥇');
		assert(hasGold(text, 'C'), 'C должен получить 🥇');
		assert(!text.includes('🥈'), 'Серебра не должно быть');
		assert(!text.includes('🥉'), 'Бронзы не должно быть');
		assert(noLoser(text), 'Неудачника не должно быть');
	});

	// ── 3 игрока, двое с максимумом ─────────────────────────────────────────────
	await runCase('3 игрока, 2 золота — серебро для третьего, без неудачника', () => {
		const text = msg([['A', 3], ['B', 3], ['C', 1]]);
		assert(hasGold(text, 'A'), 'A должен получить 🥇');
		assert(hasGold(text, 'B'), 'B должен получить 🥇');
		assert(hasSilver(text, 'C'), 'C должен получить 🥈');
		assert(!text.includes('🥉'), 'Бронзы не должно быть');
		assert(noLoser(text), 'Неудачника не должно быть');
	});

	// ── 3 игрока, двое с минимумом ──────────────────────────────────────────────
	await runCase('3 игрока, двое с минимумом — оба получают 🥈, без неудачника', () => {
		const text = msg([['A', 3], ['B', 1], ['C', 1]]);
		assert(hasGold(text, 'A'), 'A должен получить 🥇');
		assert(hasSilver(text, 'B'), 'B должен получить 🥈');
		assert(hasSilver(text, 'C'), 'C должен получить 🥈');
		assert(noLoser(text), 'Неудачника не должно быть');
	});

	// ── 4 игрока, все разные ────────────────────────────────────────────────────
	await runCase('4 игрока, все разные — 🥇🥈🥉, последний 🦧', () => {
		const text = msg([['A', 4], ['B', 3], ['C', 2], ['D', 1]]);
		assert(hasGold(text, 'A'), 'A должен получить 🥇');
		assert(hasSilver(text, 'B'), 'B должен получить 🥈');
		assert(hasBronze(text, 'C'), 'C должен получить 🥉');
		assert(hasLoser(text, 'D'), 'D должен быть неудачником');
		assert(noPlain(text), 'Простых не должно быть');
	});

	// ── 4 игрока, 2 золота ──────────────────────────────────────────────────────
	await runCase('4 игрока, 2 золота — серебро третьему, последний 🦧', () => {
		const text = msg([['A', 3], ['B', 3], ['C', 2], ['D', 1]]);
		assert(hasGold(text, 'A'), 'A должен получить 🥇');
		assert(hasGold(text, 'B'), 'B должен получить 🥇');
		assert(hasSilver(text, 'C'), 'C должен получить 🥈');
		assert(hasLoser(text, 'D'), 'D должен быть неудачником');
	});

	// ── 4 игрока, 3 золота ──────────────────────────────────────────────────────
	await runCase('4 игрока, 3 золота — серебра и бронзы нет, последний 🦧', () => {
		const text = msg([['A', 3], ['B', 3], ['C', 3], ['D', 1]]);
		assert(hasGold(text, 'A'), 'A должен получить 🥇');
		assert(hasGold(text, 'B'), 'B должен получить 🥇');
		assert(hasGold(text, 'C'), 'C должен получить 🥇');
		assert(!text.includes('🥈'), 'Серебра не должно быть');
		assert(!text.includes('🥉'), 'Бронзы не должно быть');
		assert(hasLoser(text, 'D'), 'D должен быть неудачником');
	});

	// ── 4 игрока, все одинаковые ────────────────────────────────────────────────
	await runCase('4 игрока, все одинаковые — все 🥇, без неудачника', () => {
		const text = msg([['A', 2], ['B', 2], ['C', 2], ['D', 2]]);
		assert(hasGold(text, 'A'), 'A должен получить 🥇');
		assert(hasGold(text, 'B'), 'B должен получить 🥇');
		assert(hasGold(text, 'C'), 'C должен получить 🥇');
		assert(hasGold(text, 'D'), 'D должен получить 🥇');
		assert(noLoser(text), 'Неудачника не должно быть');
	});

	// ── 4 игрока, бронза на двоих ───────────────────────────────────────────────
	await runCase('4 игрока, последние двое одинаковые — оба 🥉, без неудачника', () => {
		const text = msg([['A', 3], ['B', 2], ['C', 1], ['D', 1]]);
		assert(hasGold(text, 'A'), 'A должен получить 🥇');
		assert(hasSilver(text, 'B'), 'B должен получить 🥈');
		assert(hasBronze(text, 'C'), 'C должен получить 🥉');
		assert(hasBronze(text, 'D'), 'D должен получить 🥉');
		assert(noLoser(text), 'Неудачника не должно быть');
	});

	// ── 5 игроков, все разные ───────────────────────────────────────────────────
	await runCase('5 игроков, все разные — 🥇🥈🥉, простой и 🦧', () => {
		const text = msg([['A', 5], ['B', 4], ['C', 3], ['D', 2], ['E', 1]]);
		assert(hasGold(text, 'A'), 'A должен получить 🥇');
		assert(hasSilver(text, 'B'), 'B должен получить 🥈');
		assert(hasBronze(text, 'C'), 'C должен получить 🥉');
		assert(hasPlain(text, 'D'), 'D должен быть простым');
		assert(hasLoser(text, 'E'), 'E должен быть неудачником');
	});

	// ── 5 игроков, 2 золота ─────────────────────────────────────────────────────
	await runCase('5 игроков, 2 золота — серебро третьему, простой и 🦧', () => {
		const text = msg([['A', 5], ['B', 5], ['C', 3], ['D', 2], ['E', 1]]);
		assert(hasGold(text, 'A'), 'A должен получить 🥇');
		assert(hasGold(text, 'B'), 'B должен получить 🥇');
		assert(hasSilver(text, 'C'), 'C должен получить 🥈');
		assert(hasPlain(text, 'D'), 'D должен быть простым');
		assert(hasLoser(text, 'E'), 'E должен быть неудачником');
	});

	// ── 5 игроков, последние двое одинаковые ────────────────────────────────────
	await runCase('5 игроков, 2 неудачника — оба 🦧, простых нет', () => {
		const text = msg([['A', 5], ['B', 4], ['C', 3], ['D', 1], ['E', 1]]);
		assert(hasGold(text, 'A'), 'A должен получить 🥇');
		assert(hasSilver(text, 'B'), 'B должен получить 🥈');
		assert(hasBronze(text, 'C'), 'C должен получить 🥉');
		assert(hasLoser(text, 'D'), 'D должен быть неудачником');
		assert(hasLoser(text, 'E'), 'E должен быть неудачником');
		assert(noPlain(text), 'Простых не должно быть');
	});

	// ── 5 игроков, 3 золота ─────────────────────────────────────────────────────
	await runCase('5 игроков, 3 золота — серебра и бронзы нет, простой и 🦧', () => {
		const text = msg([['A', 4], ['B', 4], ['C', 4], ['D', 2], ['E', 1]]);
		assert(hasGold(text, 'A'), 'A должен получить 🥇');
		assert(hasGold(text, 'B'), 'B должен получить 🥇');
		assert(hasGold(text, 'C'), 'C должен получить 🥇');
		assert(!text.includes('🥈'), 'Серебра не должно быть');
		assert(!text.includes('🥉'), 'Бронзы не должно быть');
		assert(hasPlain(text, 'D'), 'D должен быть простым');
		assert(hasLoser(text, 'E'), 'E должен быть неудачником');
	});

	// ── 5 игроков, 3 золота + 2 неудачника ─────────────────────────────────────
	await runCase('5 игроков, 3 золота + 2 одинаковых минимума — оба 🦧, простых нет', () => {
		const text = msg([['A', 4], ['B', 4], ['C', 4], ['D', 1], ['E', 1]]);
		assert(hasGold(text, 'A'), 'A должен получить 🥇');
		assert(hasGold(text, 'B'), 'B должен получить 🥇');
		assert(hasGold(text, 'C'), 'C должен получить 🥇');
		assert(hasLoser(text, 'D'), 'D должен быть неудачником');
		assert(hasLoser(text, 'E'), 'E должен быть неудачником');
		assert(noPlain(text), 'Простых не должно быть');
	});

	// ── 1 золото + 2 серебра — бронзы нет ──────────────────────────────────────
	await runCase('1 золото + 2 серебра — бронзы нет', () => {
		const text = msg([['A', 5], ['B', 3], ['C', 3], ['D', 1]]);
		assert(hasGold(text, 'A'), 'A должен получить 🥇');
		assert(hasSilver(text, 'B'), 'B должен получить 🥈');
		assert(hasSilver(text, 'C'), 'C должен получить 🥈');
		assert(!text.includes('🥉'), 'Бронзы не должно быть');
		assert(hasLoser(text, 'D'), 'D должен быть неудачником');
	});
}
