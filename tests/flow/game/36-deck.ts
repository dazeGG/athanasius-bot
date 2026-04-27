/**
 * 36-deck.ts — game flow tests for rooms configured with the 36-card deck type.
 */
import { describe, it } from 'vitest';
import { Deck } from '../../../src/entities/deck';

import { DB, Game } from '../../bootstrap';
import { assert, assertSent } from '../../runner';
import { getLog } from '../../bootstrap';

import {
	ALICE,
	BOB,
	CAROL,
	DAVE,
	cardIds36,
	createUsers,
	getGame,
	getPersistedGame,
	makeGame,
	makeRoom,
	resetGameFlowCase,
	runTurn,
	seedGameState,
	sendSeededFirstMessage,
	totalAthanasiusCards,
	totalCardsInHands,
	turnMeta,
} from './helpers';

/**
 * Runs game flow coverage for the 36-card deck type.
 */
describe('deck36Flow', async () => {
	describe('Startup', async () => {
		it('36-card game: Game.create deals exactly 36 cards per deck across all players', async () => {
			await resetGameFlowCase();

			const room = makeRoom({
				players: [ALICE.id, BOB.id, CAROL.id],
				decksCount: 1,
				deckType: 36,
			});

			await seedGameState({ users: createUsers(), room });
			await Game.create(room);

			const createdGameId = DB.data.games[0]?.id;
			assert(createdGameId !== undefined, 'Game.create should persist a game');

			const persisted = getPersistedGame(createdGameId);
			const totalCards = totalCardsInHands(persisted);
			const totalAthanasius = totalAthanasiusCards(persisted);

			assert(
				totalCards + totalAthanasius === Deck.getDeckSize(36) * room.settings.decksCount,
				`Expected ${Deck.getDeckSize(36)} total cards, got ${totalCards + totalAthanasius}`,
			);
		});

		it('36-card game: Game.create with 2 decks deals 72 cards total', async () => {
			await resetGameFlowCase();

			const room = makeRoom({
				players: [ALICE.id, BOB.id, CAROL.id, DAVE.id],
				decksCount: 2,
				deckType: 36,
			});

			await seedGameState({ users: createUsers(), room });
			await Game.create(room);

			const createdGameId = DB.data.games[0]?.id;
			assert(createdGameId !== undefined, 'Game.create should persist a game');

			const persisted = getPersistedGame(createdGameId);
			const totalCards = totalCardsInHands(persisted);
			const totalAthanasius = totalAthanasiusCards(persisted);

			assert(
				totalCards + totalAthanasius === Deck.getDeckSize(36) * 2,
				`Expected 72 total cards for 2 × 36-deck, got ${totalCards + totalAthanasius}`,
			);
		});

		it('36-card game: cardsToAthanasius = 4 for 1 deck', async () => {
			await resetGameFlowCase();

			const room = makeRoom({
				players: [ALICE.id, BOB.id, CAROL.id],
				decksCount: 1,
				deckType: 36,
			});

			await seedGameState({ users: createUsers(), room });
			await Game.create(room);

			const createdGameId = DB.data.games[0]?.id;
			assert(createdGameId !== undefined, 'Game.create should persist a game');
			const game = getGame(createdGameId);
			assert(game.cardsToAthanasius === 4, `cardsToAthanasius should be 4, got ${game.cardsToAthanasius}`);
		});

		it('36-card game: cardsToAthanasius = 8 for 2 decks', async () => {
			await resetGameFlowCase();

			const room = makeRoom({
				players: [ALICE.id, BOB.id, CAROL.id],
				decksCount: 2,
				deckType: 36,
			});

			await seedGameState({ users: createUsers(), room });
			await Game.create(room);

			const createdGameId = DB.data.games[0]?.id;
			assert(createdGameId !== undefined, 'Game.create should persist a game');
			const game = getGame(createdGameId);
			assert(game.cardsToAthanasius === 8, `cardsToAthanasius should be 8 for 2 decks, got ${game.cardsToAthanasius}`);
		});

		it('36-card game: all dealt card IDs belong to the 36-deck pool', async () => {
			await resetGameFlowCase();

			const room = makeRoom({
				players: [ALICE.id, BOB.id, CAROL.id],
				decksCount: 1,
				deckType: 36,
			});

			await seedGameState({ users: createUsers(), room });
			await Game.create(room);

			const createdGameId = DB.data.games[0]?.id;
			assert(createdGameId !== undefined, 'Game.create should persist a game');
			const persisted = getPersistedGame(createdGameId);
			const validIds = new Set(Deck.getDeck(36).map(c => c.id));
			const allDealtIds = Object.values(persisted.hands).flat();

			for (const id of allDealtIds) {
				assert(validIds.has(id), `Card ID ${id} is not in the 36-deck pool`);
			}
		});

		it('36-card game: first turn message delivered to exactly one player', async () => {
			await resetGameFlowCase();

			const room = makeRoom({
				players: [ALICE.id, BOB.id, CAROL.id],
				decksCount: 1,
				deckType: 36,
			});

			await seedGameState({ users: createUsers(), room });
			await Game.create(room);

			const firstTurnRecipients = [ALICE.id, BOB.id, CAROL.id].filter(id =>
				getLog().some(e => e.to === id && e.text.includes('Ты ходишь первым')),
			);

			assert(firstTurnRecipients.length === 1, 'Exactly one player should receive the initial first-turn message');
		});
	});

	describe('Steals', async () => {
		it('36-card game: successful steal transfers cards and keeps turn', async () => {
			await resetGameFlowCase();

			await seedGameState({
				room: makeRoom({ players: [ALICE.id, BOB.id, CAROL.id], deckType: 36 }),
				game: makeGame({
					players: [ALICE.id, BOB.id, CAROL.id],
					hands: {
						[ALICE.id]: [...cardIds36('A', 'Diamonds'), ...cardIds36('K', 'Hearts')],
						[BOB.id]: [...cardIds36('A', 'Hearts'), ...cardIds36('A', 'Spades')],
						[CAROL.id]: [...cardIds36('J', 'Hearts')],
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
			assertSent(getLog(), ALICE.id, '🟩 <b>Алиса → Борис</b> | A | ♥️ 1 ♠️ 1', { type: 'edit' });
			assert(getGame().activePlayer.id === ALICE.id, 'Turn should stay with Alice after successful steal');
			assert((persisted.hands[ALICE.id] ?? []).length === 4, 'Alice should hold 4 cards after steal');
			assert((persisted.hands[BOB.id] ?? []).length === 0, 'Bob should have no A cards left');
		});

		it('36-card game: failed steal at suits stage shifts turn to the next player', async () => {
			await resetGameFlowCase();

			await seedGameState({
				room: makeRoom({ players: [ALICE.id, BOB.id, CAROL.id], deckType: 36 }),
				game: makeGame({
					players: [ALICE.id, BOB.id, CAROL.id],
					hands: {
						[ALICE.id]: [...cardIds36('A', 'Diamonds')],
						[BOB.id]: [...cardIds36('A', 'Hearts'), ...cardIds36('A', 'Spades')],
						[CAROL.id]: [...cardIds36('J', 'Hearts')],
					},
				}),
			});

			// Alice guesses wrong distribution: 2 Aces with wrong suit split
			await runTurn(ALICE, turnMeta.suits('game-flow', BOB.id, 'A', 2, 2, {
				hearts: 2,
				diamonds: 0,
				spades: 0,
				clubs: 0,
				action: 'select',
			}));

			assertSent(getLog(), ALICE.id, '🟥 <b>Алиса → Борис</b> | A | ♥️ 2', { type: 'edit' });
			assert(getGame().activePlayer.id !== ALICE.id, 'Turn should shift away from Alice after failure');
		});
	});

	describe('Athanasius', async () => {
		it('36-card game: four same-rank cards compose an Athanasius', async () => {
			await resetGameFlowCase();

			await seedGameState({
				room: makeRoom({ players: [ALICE.id, BOB.id, CAROL.id], deckType: 36 }),
				game: makeGame({
					players: [ALICE.id, BOB.id, CAROL.id],
					hands: {
						[ALICE.id]: [
							...cardIds36('A', 'Diamonds'),
							...cardIds36('A', 'Spades'),
							...cardIds36('A', 'Clubs'),
						],
						[BOB.id]: [...cardIds36('A', 'Hearts')],
						[CAROL.id]: [...cardIds36('J', 'Hearts')],
					},
				}),
			});

			await runTurn(ALICE, turnMeta.suits('game-flow', BOB.id, 'A', 1, 1, {
				hearts: 1,
				diamonds: 0,
				spades: 0,
				clubs: 0,
				action: 'select',
			}));

			const persisted = getPersistedGame();
			assert(persisted.athanasiuses[ALICE.id]?.includes('A'), 'Alice should compose Athanasius A');
			assert((persisted.hands[ALICE.id] ?? []).length === 0, 'Alice hand should be empty after Athanasius');
		});

		it('36-card game: game ends when all hands are empty after final steal', async () => {
			await resetGameFlowCase();

			await seedGameState({
				room: makeRoom({ players: [ALICE.id, BOB.id, CAROL.id], deckType: 36 }),
				game: makeGame({
					players: [ALICE.id, BOB.id, CAROL.id],
					hands: {
						[ALICE.id]: [
							...cardIds36('A', 'Diamonds'),
							...cardIds36('A', 'Spades'),
							...cardIds36('A', 'Clubs'),
						],
						[BOB.id]: [...cardIds36('A', 'Hearts')],
						[CAROL.id]: [],
					},
				}),
			});

			await runTurn(ALICE, turnMeta.suits('game-flow', BOB.id, 'A', 1, 1, {
				hearts: 1,
				diamonds: 0,
				spades: 0,
				clubs: 0,
				action: 'select',
			}));

			const persisted = getPersistedGame();
			assert(persisted.ended !== undefined, 'Game should be marked as ended when all hands are empty');
			assertSent(getLog(), ALICE.id, 'Игра закончилась!');
			assertSent(getLog(), BOB.id, 'Игра закончилась!');
			assertSent(getLog(), CAROL.id, 'Игра закончилась!');
		});
	});

	describe('Turn Delivery', async () => {
		it('36-card game: turn message delivery skips players with empty hands', async () => {
			await resetGameFlowCase();

			await seedGameState({
				room: makeRoom({ players: [ALICE.id, BOB.id, CAROL.id, DAVE.id], deckType: 36 }),
				game: makeGame({
					players: [ALICE.id, BOB.id, CAROL.id, DAVE.id],
					hands: {
						[ALICE.id]: [],
						[BOB.id]: [],
						[CAROL.id]: [...cardIds36('K', 'Hearts')],
						[DAVE.id]: [...cardIds36('Q', 'Clubs')],
					},
				}),
			});

			await sendSeededFirstMessage();

			assert(getGame().activePlayer.id === CAROL.id, 'Turn should advance to Carol who has cards');
			assertSent(getLog(), CAROL.id, 'Твой ход!');
		});
	});
});
