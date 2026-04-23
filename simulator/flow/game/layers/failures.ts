import { getLog } from '../../../bootstrap';
import { assert, assertSent } from '../../../runner';
import type { ModuleTools } from '../../../runner';

import {
	ALICE,
	BOB,
	CAROL,
	STALE_GAME_MESSAGE_TEXT,
	cardIds,
	getGame,
	makeGame,
	resetGameFlowCase,
	runTurn,
	seedGameState,
	turnMeta,
} from '../helpers';

const seedFailureGame = async (): Promise<void> => {
	await seedGameState({
		game: makeGame({
			players: [ALICE.id, BOB.id, CAROL.id],
			hands: {
				[ALICE.id]: [...cardIds('A', 'Diamonds'), ...cardIds('K', 'Clubs')],
				[BOB.id]: [...cardIds('A', 'Hearts'), ...cardIds('A', 'Spades')],
				[CAROL.id]: [...cardIds('3', 'Clubs')],
			},
		}),
	});
};

export async function runFailuresLayer ({ runCase }: ModuleTools): Promise<void> {
	await runCase('Wrong rank ends the turn and passes it to the next player with cards', async () => {
		await resetGameFlowCase();
		await seedFailureGame();

		await runTurn(ALICE, turnMeta.card('game-flow', BOB.id, 'K'));

		assertSent(getLog(), ALICE.id, 'К сожалению, ты не угадал');
		assertSent(getLog(), BOB.id, 'Твой ход!');
		assert(getGame().activePlayer.id === BOB.id, 'Turn should move to Bob after a wrong rank');
	});

	await runCase('Wrong count ends the turn and reports the mismatch', async () => {
		await resetGameFlowCase();
		await seedFailureGame();

		await runTurn(ALICE, turnMeta.count('game-flow', BOB.id, 'A', 1, 'select'));

		assertSent(getLog(), ALICE.id, 'Количество не 1');
		assertSent(getLog(), BOB.id, 'Твой ход!');
		assert(getGame().activePlayer.id === BOB.id, 'Turn should move to Bob after a wrong count');
	});

	await runCase('Wrong colors end the turn and report the color mismatch', async () => {
		await resetGameFlowCase();
		await seedFailureGame();

		await runTurn(ALICE, turnMeta.colors('game-flow', BOB.id, 'A', 2, 2, 'select'));

		assertSent(getLog(), ALICE.id, 'Цвета не 🔴: 2 ⚫: 0');
		assertSent(getLog(), BOB.id, 'Твой ход!');
		assert(getGame().activePlayer.id === BOB.id, 'Turn should move to Bob after wrong colors');
	});

	await runCase('Wrong suits end the turn and report the suit mismatch', async () => {
		await resetGameFlowCase();
		await seedFailureGame();

		await runTurn(ALICE, turnMeta.suits('game-flow', BOB.id, 'A', 2, 1, {
			hearts: 0,
			diamonds: 1,
			spades: 1,
			clubs: 0,
			action: 'select',
		}));

		assertSent(getLog(), ALICE.id, 'Не ♥️: 0 ♦️: 1 ♠️: 1 ♣️: 0');
		assertSent(getLog(), BOB.id, 'Твой ход!');
		assert(getGame().activePlayer.id === BOB.id, 'Turn should move to Bob after wrong suits');
	});

	await runCase('Old callbacks become stale after the turn has already moved on', async () => {
		await resetGameFlowCase();
		await seedFailureGame();

		const staleMeta = turnMeta.card('game-flow', BOB.id, 'K');

		await runTurn(ALICE, staleMeta);
		await runTurn(ALICE, staleMeta, 2);

		assertSent(getLog(), ALICE.id, STALE_GAME_MESSAGE_TEXT);
	});
}
