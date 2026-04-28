/**
 * mailing-mode.ts — per-turn player mailing state coverage for the game flow.
 */
import { describe, it } from 'vitest';
import { assert, assertNotSent, assertSent } from '../../../runner';
import { getLog } from '../../../bootstrap';

import {
	ALICE,
	BOB,
	CAROL,
	cardIds,
	getGame,
	getPersistedGame,
	makeGame,
	resetGameFlowCase,
	runTurn,
	seedGameState,
	sendSeededFirstMessage,
	turnMeta,
} from '../helpers';

/**
 * Runs coverage for the persisted "one mailing per current turn" marker.
 */
describe('MailingMode', async () => {
	it('markMailedThisTurn persists the active player marker across game reloads', async () => {
		await resetGameFlowCase();
		await seedGameState({
			game: makeGame({
				players: [ALICE.id, BOB.id, CAROL.id],
				hands: {
					[ALICE.id]: [...cardIds('A', 'Diamonds')],
					[BOB.id]: [...cardIds('K', 'Clubs')],
					[CAROL.id]: [...cardIds('3', 'Clubs')],
				},
			}),
		});

		await getGame().markMailedThisTurn(ALICE.id);

		assert(getPersistedGame().utils.mailedThisTurn?.includes(ALICE.id) === true, 'Persisted game utils should store Alice as mailed this turn');
		assert(getGame().hasMailedThisTurn(ALICE.id), 'Reloaded game should know Alice has already mailed this turn');
		assert(!getGame().hasMailedThisTurn(BOB.id), 'Other players should not be treated as mailed this turn');
	});

	it('Failed turns clear the per-turn mailing marker when control passes forward', async () => {
		await resetGameFlowCase();
		await seedGameState({
			game: makeGame({
				players: [ALICE.id, BOB.id, CAROL.id],
				mailedThisTurn: [ALICE.id],
				hands: {
					[ALICE.id]: [...cardIds('A', 'Diamonds'), ...cardIds('K', 'Clubs')],
					[BOB.id]: [...cardIds('A', 'Hearts'), ...cardIds('A', 'Spades')],
					[CAROL.id]: [...cardIds('3', 'Clubs')],
				},
			}),
		});

		await runTurn(ALICE, turnMeta.count('game-flow', BOB.id, 'A', 1, 'select'));

		assert(getGame().activePlayer.id === BOB.id, 'Turn should pass to Bob after a failed declaration');
		assert(getPersistedGame().utils.mailedThisTurn === undefined, 'Mailing marker should reset after the turn shifts');
	});

	it('Successful steals that keep the same active player preserve the mailing marker', async () => {
		await resetGameFlowCase();
		await seedGameState({
			game: makeGame({
				players: [ALICE.id, BOB.id, CAROL.id],
				mailedThisTurn: [ALICE.id],
				hands: {
					[ALICE.id]: [...cardIds('A', 'Diamonds'), ...cardIds('K', 'Clubs')],
					[BOB.id]: [...cardIds('A', 'Hearts'), ...cardIds('A', 'Spades')],
					[CAROL.id]: [...cardIds('3', 'Clubs')],
				},
			}),
		});

		await runTurn(ALICE, turnMeta.suits('game-flow', BOB.id, 'A', 2, 1, {
			hearts: 1,
			diamonds: 0,
			spades: 1,
			clubs: 0,
			action: 'select',
		}));

		assert(getGame().activePlayer.id === ALICE.id, 'Alice should keep the turn after a successful steal with cards left');
		assert(getPersistedGame().utils.mailedThisTurn?.includes(ALICE.id) === true, 'Mailing marker should remain while the same turn continues');
	});

	it('Successful steals that empty the active hand clear the marker after skipping empty players', async () => {
		await resetGameFlowCase();
		await seedGameState({
			game: makeGame({
				players: [ALICE.id, BOB.id, CAROL.id],
				mailedThisTurn: [ALICE.id],
				hands: {
					[ALICE.id]: [...cardIds('A', 'Diamonds'), ...cardIds('A', 'Clubs')],
					[BOB.id]: [...cardIds('A', 'Hearts'), ...cardIds('A', 'Spades')],
					[CAROL.id]: [...cardIds('3', 'Clubs')],
				},
			}),
		});

		await runTurn(ALICE, turnMeta.suits('game-flow', BOB.id, 'A', 2, 1, {
			hearts: 1,
			diamonds: 0,
			spades: 1,
			clubs: 0,
			action: 'select',
		}));

		assert(getGame().activePlayer.id === CAROL.id, 'Turn should skip empty Alice and Bob and move to Carol');
		assert(getPersistedGame().utils.mailedThisTurn === undefined, 'Mailing marker should reset when the active player changes');
	});

	it('First turn delivery skips an empty mailed player and clears the stale marker', async () => {
		await resetGameFlowCase();
		await seedGameState({
			game: makeGame({
				players: [ALICE.id, BOB.id, CAROL.id],
				mailedThisTurn: [ALICE.id],
				hands: {
					[ALICE.id]: [],
					[BOB.id]: [...cardIds('K', 'Clubs')],
					[CAROL.id]: [...cardIds('3', 'Clubs')],
				},
			}),
		});

		await sendSeededFirstMessage();

		assert(getGame().activePlayer.id === BOB.id, 'Turn prompt should move to Bob when Alice has no cards');
		assert(getPersistedGame().utils.mailedThisTurn === undefined, 'Skipping an empty active player should clear stale mailing state');
		assertSent(getLog(), BOB.id, 'Твой ход!');
		assertNotSent(getLog(), ALICE.id, 'Твой ход!');
	});
});
