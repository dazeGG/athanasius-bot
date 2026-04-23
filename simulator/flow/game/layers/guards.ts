/**
 * guards.ts — anti-corruption and stale callback checks for the game flow.
 */
import { getLog } from '../../../bootstrap';
import { assertSent } from '../../../runner';
import type { ModuleTools } from '../../../runner';

import {
	ALICE,
	BOB,
	CAROL,
	DAVE,
	STALE_GAME_MESSAGE_TEXT,
	cardIds,
	createUsers,
	makeGame,
	resetGameFlowCase,
	runTurn,
	seedGameState,
	turnMeta,
} from '../helpers';

const seedGuardGame = async (gameOverrides: Partial<ReturnType<typeof makeGame>> = {}): Promise<void> => {
	await seedGameState({
		users: createUsers(),
		game: makeGame({
			players: [ALICE.id, BOB.id, CAROL.id],
			hands: {
				[ALICE.id]: [...cardIds('A', 'Diamonds'), ...cardIds('K', 'Clubs')],
				[BOB.id]: [...cardIds('A', 'Hearts'), ...cardIds('A', 'Spades')],
				[CAROL.id]: [...cardIds('3', 'Clubs')],
			},
			...gameOverrides,
		}),
	});
};

/**
 * Runs guard coverage for invalid payloads, stale callbacks, and illegal actors.
 */
export async function runGuardsLayer ({ runCase }: ModuleTools): Promise<void> {
	await runCase('Soft-rejects callbacks without meta', async () => {
		await resetGameFlowCase();
		await seedGuardGame();

		await runTurn(ALICE, undefined);

		assertSent(getLog(), ALICE.id, STALE_GAME_MESSAGE_TEXT);
	});

	await runCase('Soft-rejects malformed callback meta', async () => {
		await resetGameFlowCase();
		await seedGuardGame();

		await runTurn(ALICE, '99#game-flow#1002');

		assertSent(getLog(), ALICE.id, STALE_GAME_MESSAGE_TEXT);
	});

	await runCase('Soft-rejects unknown game ids', async () => {
		await resetGameFlowCase();
		await seedGuardGame();

		await runTurn(ALICE, turnMeta.player('missing-game', BOB.id));

		assertSent(getLog(), ALICE.id, STALE_GAME_MESSAGE_TEXT);
	});

	await runCase('Soft-rejects callbacks into ended games', async () => {
		await resetGameFlowCase();
		await seedGuardGame({ ended: Date.now() });

		await runTurn(ALICE, turnMeta.player('game-flow', BOB.id));

		assertSent(getLog(), ALICE.id, STALE_GAME_MESSAGE_TEXT);
	});

	await runCase('Rejects callbacks from non-active players', async () => {
		await resetGameFlowCase();
		await seedGuardGame();

		await runTurn(BOB, turnMeta.player('game-flow', CAROL.id));

		assertSent(getLog(), BOB.id, STALE_GAME_MESSAGE_TEXT);
	});

	await runCase('Rejects targets outside the current game', async () => {
		await resetGameFlowCase();
		await seedGuardGame();

		await runTurn(ALICE, turnMeta.player('game-flow', DAVE.id));

		assertSent(getLog(), ALICE.id, STALE_GAME_MESSAGE_TEXT);
	});

	await runCase('Rejects self-targeting callbacks', async () => {
		await resetGameFlowCase();
		await seedGuardGame();

		await runTurn(ALICE, turnMeta.player('game-flow', ALICE.id));

		assertSent(getLog(), ALICE.id, STALE_GAME_MESSAGE_TEXT);
	});

	await runCase('Rejects targets that no longer have cards', async () => {
		await resetGameFlowCase();
		await seedGuardGame({
			hands: {
				[ALICE.id]: [...cardIds('A', 'Diamonds')],
				[BOB.id]: [],
				[CAROL.id]: [...cardIds('3', 'Clubs')],
			},
		});

		await runTurn(ALICE, turnMeta.player('game-flow', BOB.id));

		assertSent(getLog(), ALICE.id, STALE_GAME_MESSAGE_TEXT);
	});

	await runCase('Rejects ranks that are missing from the active hand', async () => {
		await resetGameFlowCase();
		await seedGuardGame();

		await runTurn(ALICE, turnMeta.card('game-flow', BOB.id, 'Q'));

		assertSent(getLog(), ALICE.id, STALE_GAME_MESSAGE_TEXT);
	});

	await runCase('Rejects invalid count payloads', async () => {
		await resetGameFlowCase();
		await seedGuardGame();

		await runTurn(ALICE, turnMeta.count('game-flow', BOB.id, 'A', 4, 'select'));

		assertSent(getLog(), ALICE.id, STALE_GAME_MESSAGE_TEXT);
	});

	await runCase('Rejects invalid color payloads', async () => {
		await resetGameFlowCase();
		await seedGuardGame();

		await runTurn(ALICE, turnMeta.colors('game-flow', BOB.id, 'A', 2, 3, 'select'));

		assertSent(getLog(), ALICE.id, STALE_GAME_MESSAGE_TEXT);
	});

	await runCase('Rejects invalid suits payloads', async () => {
		await resetGameFlowCase();
		await seedGuardGame();

		await runTurn(ALICE, '4#game-flow#1002#A#2#1#1!0!1!0!*!select');

		assertSent(getLog(), ALICE.id, STALE_GAME_MESSAGE_TEXT);
	});
}
