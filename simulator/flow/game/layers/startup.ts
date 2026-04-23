/**
 * startup.ts — startup and deal invariants for the staged game flow.
 */
import { Deck } from '~/entities/deck';

import { DB, Game, getLog } from '../../../bootstrap';
import { assert, assertNotSent, assertSent } from '../../../runner';
import type { ModuleTools } from '../../../runner';

import {
	ALICE,
	BOB,
	CAROL,
	DAVE,
	cardIds,
	createUsers,
	getGame,
	getPersistedGame,
	makeGame,
	makeRoom,
	resetGameFlowCase,
	seedGameState,
	sendSeededFirstMessage,
	totalAthanasiusCards,
	totalCardsInHands,
} from '../helpers';

/**
 * Runs startup-related game flow coverage such as deal invariants and first turn delivery.
 */
export async function runStartupLayer ({ runCase }: ModuleTools): Promise<void> {
	await runCase('Creates a game with consistent deal invariants and one first-turn recipient', async () => {
		await resetGameFlowCase();

		const room = makeRoom({
			players: [ALICE.id, BOB.id, CAROL.id, DAVE.id],
			decksCount: 2,
		});

		await seedGameState({ users: createUsers(), room });
		await Game.create(room);

		assert(getLog().length > 0, 'Game.create should produce transport messages');

		const createdGameId = DB.data.games[0]?.id;
		assert(createdGameId !== undefined, 'Game.create should persist a game');

		const createdGame = getGame(createdGameId);
		assert(createdGame.cardsToAthanasius === 8, 'cardsToAthanasius should equal decksCount * 4');
		assert(createdGame.allPlayers.length === 4, 'Queue should include all room players');

		const persistedGame = getPersistedGame(createdGameId);
		const totalCards = totalCardsInHands(persistedGame);
		const totalAthanasius = totalAthanasiusCards(persistedGame);

		assert(totalCards + totalAthanasius === Deck.deckSize * room.settings.decksCount, 'All dealt cards should be preserved between hands and Athanasiuses');

		[ALICE, BOB, CAROL, DAVE].forEach(player => {
			assertSent(getLog(), player.id, 'Игра началась!');
		});

		const firstTurnRecipients = [ALICE.id, BOB.id, CAROL.id, DAVE.id].filter(playerId =>
			getLog().some(entry => entry.to === playerId && entry.text.includes('Ты ходишь первым')),
		);

		assert(firstTurnRecipients.length === 1, 'Exactly one player should receive the initial first-turn message');
	});

	await runCase('Skips empty players when sending the next turn message', async () => {
		await resetGameFlowCase();

		await seedGameState({
			game: makeGame({
				players: [ALICE.id, BOB.id, CAROL.id, DAVE.id],
				hands: {
					[ALICE.id]: [],
					[BOB.id]: [],
					[CAROL.id]: [...cardIds('2', 'Hearts')],
					[DAVE.id]: [...cardIds('3', 'Clubs')],
				},
			}),
		});

		await sendSeededFirstMessage();

		assert(getGame().activePlayer.id === CAROL.id, 'Turn should move to the first player with cards');
		assertSent(getLog(), CAROL.id, 'Твой ход!');
		assertNotSent(getLog(), ALICE.id, 'Твой ход!');
		assertNotSent(getLog(), BOB.id, 'Твой ход!');
	});

	await runCase('Does not send a turn message when no players have cards', async () => {
		await resetGameFlowCase();

		await seedGameState({
			game: makeGame({
				players: [ALICE.id, BOB.id, CAROL.id],
				hands: {
					[ALICE.id]: [],
					[BOB.id]: [],
					[CAROL.id]: [],
				},
			}),
		});

		await sendSeededFirstMessage();

		assert(getLog().length === 0, 'No turn message should be sent when every player is empty');
	});
}
