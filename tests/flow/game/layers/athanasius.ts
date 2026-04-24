/**
 * athanasius.ts — Athanasius composition and endgame coverage for the game flow.
 */
import { DB, getLog } from '../../../bootstrap';
import { assert, assertSent } from '../../../runner';
import type { ModuleTools } from '../../../runner';

import {
	ALICE,
	BOB,
	CAROL,
	DAVE,
	cardIds,
	getGame,
	getPersistedGame,
	makeGame,
	makeRoom,
	notifySeededInitialAthanasiuses,
	resetGameFlowCase,
	runTurn,
	seedGameState,
	turnMeta,
} from '../helpers';

/**
 * Runs Athanasius creation, initial notification, and endgame ranking coverage.
 */
export async function runAthanasiusLayer ({ runCase }: ModuleTools): Promise<void> {
	await runCase('Successful steals compose an Athanasius, empty the hand, and pass the turn forward', async () => {
		await resetGameFlowCase();
		await seedGameState({
			room: makeRoom({ players: [ALICE.id, BOB.id, CAROL.id] }),
			game: makeGame({
				players: [ALICE.id, BOB.id, CAROL.id],
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

		const persisted = getPersistedGame();

		assert(persisted.athanasiuses[ALICE.id]?.includes('A'), 'Alice should record the newly composed Athanasius');
		assert((persisted.hands[ALICE.id] ?? []).length === 0, 'Alice’s hand should be empty after the full set is removed');
		assert(getGame().activePlayer.id === CAROL.id, 'Turn should skip empty players and move to Carol');
		assertSent(getLog(), ALICE.id, 'Ты успешно украл карты');
		assertSent(getLog(), BOB.id, '🟧 <b>Алиса → Ты</b> | A');
		assertSent(getLog(), CAROL.id, '⭐ <b>Алиса → Борис</b> | A');
	});

	await runCase('Initial Athanasius notifications award achievements and mail other players', async () => {
		await resetGameFlowCase();
		await seedGameState({
			room: makeRoom({ players: [ALICE.id, BOB.id, CAROL.id] }),
			game: makeGame({
				players: [ALICE.id, BOB.id, CAROL.id],
				athanasiuses: {
					[ALICE.id]: ['A'],
					[BOB.id]: [],
					[CAROL.id]: ['K'],
				},
			}),
		});

		await notifySeededInitialAthanasiuses();

		const aliceAchievements = DB.data.users.find(user => user.id === ALICE.id)?.achievements ?? [];
		const carolAchievements = DB.data.users.find(user => user.id === CAROL.id)?.achievements ?? [];

		assert(aliceAchievements.includes('deal_athanasius'), 'Alice should receive the deal Athanasius achievement');
		assert(carolAchievements.includes('deal_athanasius'), 'Carol should receive the deal Athanasius achievement');
		assertSent(getLog(), ALICE.id, 'При раздаче тебе выпал Афанасий A');
		assertSent(getLog(), BOB.id, 'При раздаче у Алиса выпал Афанасий A');
		assertSent(getLog(), ALICE.id, 'При раздаче у Каролина выпал Афанасий K');
	});

	await runCase('The last successful steal ends the game and sends ranked results with a single monkey', async () => {
		await resetGameFlowCase();
		await seedGameState({
			room: makeRoom({ players: [ALICE.id, BOB.id, CAROL.id, DAVE.id] }),
			game: makeGame({
				players: [ALICE.id, BOB.id, CAROL.id, DAVE.id],
				hands: {
					[ALICE.id]: [...cardIds('A', 'Diamonds'), ...cardIds('A', 'Clubs')],
					[BOB.id]: [...cardIds('A', 'Hearts'), ...cardIds('A', 'Spades')],
					[CAROL.id]: [],
					[DAVE.id]: [],
				},
				athanasiuses: {
					[ALICE.id]: ['J'],
					[BOB.id]: ['K'],
					[CAROL.id]: ['Q'],
					[DAVE.id]: [],
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

		const endMessages = [ALICE.id, BOB.id, CAROL.id, DAVE.id]
			.map(playerId => getLog().findLast(entry => entry.to === playerId && entry.text.includes('Игра закончилась!'))?.text)
			.filter(Boolean);

		assert(endMessages.length === 4, 'Every player should receive the end-game summary');
		const summary = endMessages[0]!;

		assert(summary.includes('🥇 Алиса - 2 Афанасия'), 'First place should be awarded to Alice');
		assert(summary.includes('🥈 Борис - 1 Афанасий'), 'Second place should be awarded to Boris');
		assert(summary.includes('🥉 Каролина - 1 Афанасий'), 'Middle place should use the bronze medal');
		assert(summary.includes('🦧 Давид - 0 Афанасиев'), 'Last place should always receive the monkey');
		assert(summary.indexOf('🦧') === summary.lastIndexOf('🦧'), 'Monkey emoji should appear exactly once');
		assert(getPersistedGame().ended !== undefined, 'Game should be marked as ended after the final successful steal');
	});
}
