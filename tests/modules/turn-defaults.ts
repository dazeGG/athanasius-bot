import { describe, it } from 'vitest';

import { getLog } from '../bootstrap';
import { assert, assertKeyboardButton, assertSent } from '../runner';
import {
	ALICE,
	BOB,
	CAROL,
	DAVE,
	cardIds,
	getPersistedGame,
	makeGame,
	makeRoom,
	resetGameFlowCase,
	runTurn,
	seedGameState,
	turnMeta,
} from '../flow/game/helpers';

const aces = (count: number): number[] => {
	const suits = ['Hearts', 'Diamonds', 'Spades', 'Clubs'] as const;
	return Array.from({ length: count }, (_, index) => cardIds('A', suits[index % suits.length])[0]);
};

const seedCountStage = async (rankTotal = 16, players = [ALICE.id, BOB.id, CAROL.id, DAVE.id], mine = 1): Promise<void> => {
	await resetGameFlowCase();
	await seedGameState({
		room: makeRoom({ players, decksCount: rankTotal / 4 }),
		game: makeGame({
			players,
			cardsToAthanasius: rankTotal,
			hands: {
				[ALICE.id]: aces(mine),
				[BOB.id]: aces(1),
				[CAROL.id]: aces(1),
				[DAVE.id]: [],
			},
		}),
	});
};

const assertCount = (count: number, target: number = BOB.id): void => {
	assertSent(getLog(), ALICE.id, `Сейчас выбрано: <b>${count}</b>`, { type: 'edit', latest: true });
	assertKeyboardButton(getLog(), ALICE.id, 'Выбрать', `g:t:2#game-flow#${target}#A#${count}select`);
};

describe('Turn defaults', () => {
	it('Starts four-deck, four-player count selection at four with unit steps', async () => {
		await seedCountStage();
		await runTurn(ALICE, turnMeta.card('game-flow', BOB.id, 'A'));

		assertCount(4);
		assertKeyboardButton(getLog(), ALICE.id, '-', `g:t:2#game-flow#${BOB.id}#A#4-`);
		assertKeyboardButton(getLog(), ALICE.id, '+', `g:t:2#game-flow#${BOB.id}#A#4+`);
		const latest = getLog().filter(entry => entry.to === ALICE.id && entry.type === 'edit').at(-1);
		assert(latest?.keyboard?.flat().length === 3, 'Count keyboard should retain just minus, plus and select');
	});

	it('Starts ten-deck, three-player count selection at thirteen', async () => {
		await seedCountStage(40, [ALICE.id, BOB.id, CAROL.id]);
		await runTurn(ALICE, turnMeta.card('game-flow', BOB.id, 'A'));

		assertCount(13);
	});

	it('Rounds the fixed average to the nearest whole card', async () => {
		await seedCountStage(16, [ALICE.id, BOB.id, CAROL.id]);
		await runTurn(ALICE, turnMeta.card('game-flow', BOB.id, 'A'));

		assertCount(5);
	});

	it('Never starts count selection below one', async () => {
		await seedCountStage(4);
		await runTurn(ALICE, turnMeta.card('game-flow', BOB.id, 'A'));

		assertCount(1);
	});

	it('Keeps the starting mean when the active hand grows without reaching the cap', async () => {
		await seedCountStage();
		await runTurn(ALICE, turnMeta.card('game-flow', BOB.id, 'A'));
		assertCount(4);

		getPersistedGame().hands[ALICE.id] = aces(6);
		await runTurn(ALICE, turnMeta.card('game-flow', BOB.id, 'A'));
		assertCount(4);
	});

	it('Includes players with empty hands in the original player count', async () => {
		await seedCountStage();
		assert(getPersistedGame().hands[DAVE.id].length === 0, 'David should have no cards');
		await runTurn(ALICE, turnMeta.card('game-flow', BOB.id, 'A'));

		assertCount(4);
	});

	it('Does not use the chosen target hand to determine the starting count', async () => {
		await seedCountStage();
		getPersistedGame().hands[CAROL.id] = aces(8);
		await runTurn(ALICE, turnMeta.card('game-flow', BOB.id, 'A'));
		assertCount(4);

		await runTurn(ALICE, turnMeta.card('game-flow', CAROL.id, 'A'));
		assertCount(4, CAROL.id);
	});

	it('Caps the starting count at the cards outside the active hand', async () => {
		await seedCountStage(16, [ALICE.id, BOB.id, CAROL.id, DAVE.id], 13);
		await runTurn(ALICE, turnMeta.card('game-flow', BOB.id, 'A'));

		assertCount(3);
	});

	it.each([
		{ total: 2, red: 1, black: 1 },
		{ total: 3, red: 1, black: 2 },
		{ total: 1, red: 0, black: 1 },
	])('Starts colors for $total cards at $red red and $black black', async ({ total, red, black }) => {
		await seedCountStage();
		getPersistedGame().hands[BOB.id] = aces(total);
		await runTurn(ALICE, turnMeta.count('game-flow', BOB.id, 'A', total, 'select'));

		assertSent(getLog(), ALICE.id, `🔴: <b>${red}</b> ⚫: <b>${black}</b>`, { type: 'edit', latest: true });
		assertKeyboardButton(getLog(), ALICE.id, 'Выбрать', `g:t:3#game-flow#${BOB.id}#A#${total}#${red}select`);
	});
});
