/**
 * 54-deck.ts — game flow tests for the 54-card deck type (52 cards + 2 jokers).
 */
import { describe, it } from 'vitest';
import { Deck } from '@athanasius/shared';

import { DB, Game, getLog } from '../../bootstrap';
import { assert, assertSent, assertNotSent } from '../../runner';

import {
	ALICE,
	BOB,
	CAROL,
	DAVE,
	cardIds,
	cardIds54,
	createUsers,
	getGame,
	getLatestMessage,
	getPersistedGame,
	jokerCardId,
	makeGame,
	makeRoom,
	resetGameFlowCase,
	runTurn,
	seedGameState,
	totalAthanasiusCards,
	totalCardsInHands,
	turnMeta,
} from './helpers';

/**
 * Runs game flow coverage for the 54-card deck type (joker mechanics).
 */
describe('deck54Flow', async () => {
	describe('Startup', async () => {
		it('54-card game: Game.create deals exactly 54 cards per deck', async () => {
			await resetGameFlowCase();

			const room = makeRoom({
				players: [ALICE.id, BOB.id, CAROL.id],
				decksCount: 1,
				deckType: 54,
			});

			await seedGameState({ users: createUsers(), room });
			await Game.create(room);

			const createdGameId = DB.data.games[0]?.id;
			assert(createdGameId !== undefined, 'Game.create should persist a game');

			const persisted = getPersistedGame(createdGameId);
			const totalCards = totalCardsInHands(persisted);
			const totalAthanasius = totalAthanasiusCards(persisted);

			assert(
				totalCards + totalAthanasius === Deck.getDeckSize(54) * room.settings.decksCount,
				`Expected 54 total cards, got ${totalCards + totalAthanasius}`,
			);
		});

		it('54-card game: jokerCardsToAthanasius = 2 for 1 deck', async () => {
			await resetGameFlowCase();

			const room = makeRoom({
				players: [ALICE.id, BOB.id, CAROL.id],
				decksCount: 1,
				deckType: 54,
			});

			await seedGameState({ users: createUsers(), room });
			await Game.create(room);

			const createdGameId = DB.data.games[0]?.id;
			assert(createdGameId !== undefined, 'Game.create should persist a game');
			const persisted = getPersistedGame(createdGameId);
			assert(persisted.utils.jokerCardsToAthanasius === 2, 'jokerCardsToAthanasius should be 2 for 1 deck');
		});

		it('54-card game: jokerCardsToAthanasius = 4 for 2 decks', async () => {
			await resetGameFlowCase();

			const room = makeRoom({
				players: [ALICE.id, BOB.id, CAROL.id],
				decksCount: 2,
				deckType: 54,
			});

			await seedGameState({ users: createUsers(), room });
			await Game.create(room);

			const createdGameId = DB.data.games[0]?.id;
			assert(createdGameId !== undefined, 'Game.create should persist a game');
			const persisted = getPersistedGame(createdGameId);
			assert(persisted.utils.jokerCardsToAthanasius === 4, 'jokerCardsToAthanasius should be 4 for 2 decks');
		});

		it('54-card game: getCardsToAthanasiusForRank returns 2 for Joker and 4 for regular ranks', async () => {
			await resetGameFlowCase();

			await seedGameState({
				game: makeGame({
					players: [ALICE.id, BOB.id, CAROL.id],
					jokerCardsToAthanasius: 2,
					cardsToAthanasius: 4,
					hands: { [ALICE.id]: [], [BOB.id]: [], [CAROL.id]: [] },
				}),
			});

			const game = getGame();
			assert(game.getCardsToAthanasiusForRank('Joker') === 2, 'Joker needs 2 cards for Athanasius');
			assert(game.getCardsToAthanasiusForRank('A') === 4, 'Regular rank needs 4 cards for Athanasius');
			assert(game.getCardsToAthanasiusForRank('7') === 4, 'Regular rank 7 needs 4 cards for Athanasius');
		});

		it('54-card game: game started mailing mentions 54-card deck type', async () => {
			await resetGameFlowCase();

			const room = makeRoom({
				players: [ALICE.id, BOB.id, CAROL.id],
				decksCount: 1,
				deckType: 54,
			});

			await seedGameState({ users: createUsers(), room });
			await Game.create(room);

			assertSent(getLog(), ALICE.id, '54 карты');
		});
	});

	describe('Joker Steals', async () => {
		it('Joker steal: count stage with action=select advances to colors stage', async () => {
			await resetGameFlowCase();

			await seedGameState({
				room: makeRoom({ players: [ALICE.id, BOB.id, CAROL.id], deckType: 54 }),
				game: makeGame({
					players: [ALICE.id, BOB.id, CAROL.id],
					jokerCardsToAthanasius: 2,
					hands: {
						[ALICE.id]: [jokerCardId('red')],
						[BOB.id]: [jokerCardId('black')],
						[CAROL.id]: [...cardIds('3', 'Clubs')],
					},
				}),
			});

			await runTurn(ALICE, turnMeta.count('game-flow', BOB.id, 'Joker', 1, 'select'));

			const latest = getLatestMessage(ALICE.id, { type: 'edit' });
			assert(latest !== undefined, 'Alice should receive a message after count select');
			assert(latest.includes('красных'), 'Flow should advance to colors selection for Joker');
		});

		it('Joker steal: correct colors guess at colors stage commits the steal', async () => {
			await resetGameFlowCase();

			// jokerCardsToAthanasius=3 means 3 jokers are needed for Athanasius — so stealing 1 black joker
			// when Alice already has 1 red joker (total=2) does NOT trigger Athanasius, leaving the stolen
			// joker visible in Alice's hand for assertion.
			await seedGameState({
				room: makeRoom({ players: [ALICE.id, BOB.id, CAROL.id], deckType: 54 }),
				game: makeGame({
					players: [ALICE.id, BOB.id, CAROL.id],
					jokerCardsToAthanasius: 3,
					hands: {
						[ALICE.id]: [jokerCardId('red')],
						[BOB.id]: [jokerCardId('black')],
						[CAROL.id]: [...cardIds('3', 'Clubs')],
					},
				}),
			});

			// count=1 (Bob has exactly 1 joker), redCount=0 → blackCount=1
			await runTurn(ALICE, turnMeta.colors('game-flow', BOB.id, 'Joker', 1, 0, 'select'));

			const persisted = getPersistedGame();
			assert(
				persisted.hands[ALICE.id]?.includes(jokerCardId('black')),
				'Alice should receive Bob\'s black joker after successful steal',
			);
			assert(
				!(persisted.hands[BOB.id] ?? []).includes(jokerCardId('black')),
				'Bob should no longer have the black joker',
			);
		});

		it('Joker steal: colors stage is final — no suits stage follows', async () => {
			await resetGameFlowCase();

			await seedGameState({
				room: makeRoom({ players: [ALICE.id, BOB.id, CAROL.id], deckType: 54 }),
				game: makeGame({
					players: [ALICE.id, BOB.id, CAROL.id],
					jokerCardsToAthanasius: 2,
					hands: {
						[ALICE.id]: [jokerCardId('red')],
						[BOB.id]: [jokerCardId('black')],
						[CAROL.id]: [...cardIds('3', 'Clubs')],
					},
				}),
			});

			await runTurn(ALICE, turnMeta.colors('game-flow', BOB.id, 'Joker', 1, 0, 'select'));

			const log = getLog();
			// Successful steal notification for joker
			assertSent(log, ALICE.id, '🃏');
			// Turn moved on (next player gets a turn message)
			const turnWentOn = log.some(e => (e.to === BOB.id || e.to === CAROL.id) && e.text.includes('Твой ход'));
			assert(turnWentOn || getGame().isEnded, 'After joker steal the turn must advance or the game must end');
		});

		it('Joker steal: steal message uses joker emoji', async () => {
			await resetGameFlowCase();

			await seedGameState({
				room: makeRoom({ players: [ALICE.id, BOB.id, CAROL.id], deckType: 54 }),
				game: makeGame({
					players: [ALICE.id, BOB.id, CAROL.id],
					jokerCardsToAthanasius: 2,
					hands: {
						[ALICE.id]: [jokerCardId('red')],
						[BOB.id]: [jokerCardId('black')],
						[CAROL.id]: [...cardIds('3', 'Clubs')],
					},
				}),
			});

			await runTurn(ALICE, turnMeta.colors('game-flow', BOB.id, 'Joker', 1, 0, 'select'));

			assertSent(getLog(), BOB.id, '🃏');
		});

	});

	describe('Joker Failures', async () => {
		it('Joker steal: wrong color guess at colors stage fails the turn', async () => {
			await resetGameFlowCase();

			// Bob has only a black joker; Alice guesses 1 red joker → wrong
			await seedGameState({
				room: makeRoom({ players: [ALICE.id, BOB.id, CAROL.id], deckType: 54 }),
				game: makeGame({
					players: [ALICE.id, BOB.id, CAROL.id],
					jokerCardsToAthanasius: 2,
					hands: {
						[ALICE.id]: [jokerCardId('red')],
						[BOB.id]: [jokerCardId('black')],
						[CAROL.id]: [...cardIds('3', 'Clubs')],
					},
				}),
			});

			// redCount=1 → Alice claims 1 red, but Bob has 0 red jokers → failure
			await runTurn(ALICE, turnMeta.colors('game-flow', BOB.id, 'Joker', 1, 1, 'select'));

			assertSent(getLog(), ALICE.id, '🟥 <b>Алиса → Борис</b> | 🃏 | 🔴 1', { type: 'edit' });
			assert(getGame().activePlayer.id !== ALICE.id, 'Turn should shift away from Alice after failed joker steal');
		});

		it('Joker steal: failed turn does not transfer cards', async () => {
			await resetGameFlowCase();

			await seedGameState({
				room: makeRoom({ players: [ALICE.id, BOB.id, CAROL.id], deckType: 54 }),
				game: makeGame({
					players: [ALICE.id, BOB.id, CAROL.id],
					jokerCardsToAthanasius: 2,
					hands: {
						[ALICE.id]: [jokerCardId('red')],
						[BOB.id]: [jokerCardId('black')],
						[CAROL.id]: [...cardIds('3', 'Clubs')],
					},
				}),
			});

			await runTurn(ALICE, turnMeta.colors('game-flow', BOB.id, 'Joker', 1, 1, 'select'));

			const persisted = getPersistedGame();
			assert(
				persisted.hands[BOB.id]?.includes(jokerCardId('black')),
				'Bob must still hold his black joker after Alice\'s failed steal',
			);
			assert(
				!(persisted.hands[ALICE.id] ?? []).includes(jokerCardId('black')),
				'Alice must not receive Bob\'s joker after a failed steal',
			);
		});

		it('Joker steal: failure at count stage when target has fewer jokers than selected', async () => {
			await resetGameFlowCase();

			await seedGameState({
				room: makeRoom({ players: [ALICE.id, BOB.id, CAROL.id], decksCount: 2, deckType: 54 }),
				game: makeGame({
					players: [ALICE.id, BOB.id, CAROL.id],
					jokerCardsToAthanasius: 4,
					hands: {
						[ALICE.id]: [jokerCardId('red')],
						[BOB.id]: [jokerCardId('black')],
						[CAROL.id]: [...cardIds('3', 'Clubs')],
					},
				}),
			});

			await runTurn(ALICE, turnMeta.count('game-flow', BOB.id, 'Joker', 2, 'select'));

			assertSent(getLog(), ALICE.id, '🟥 <b>Алиса → Борис</b> | 🃏 | 2', { type: 'edit' });
			assert(getGame().activePlayer.id !== ALICE.id, 'Turn should shift away from Alice after wrong joker count');
			assert(
				getPersistedGame().hands[BOB.id]?.includes(jokerCardId('black')),
				'Bob should keep his joker after Alice guesses the wrong joker count',
			);
		});
	});

	describe('Joker Athanasius', async () => {
		it('Joker Athanasius: stealing the second joker completes the set and forms an Athanasius', async () => {
			await resetGameFlowCase();

			// Alice has red joker, Bob has black joker → Alice steals Bob's joker → 2 jokers = Athanasius
			await seedGameState({
				room: makeRoom({ players: [ALICE.id, BOB.id, CAROL.id], deckType: 54 }),
				game: makeGame({
					players: [ALICE.id, BOB.id, CAROL.id],
					jokerCardsToAthanasius: 2,
					cardsToAthanasius: 4,
					hands: {
						[ALICE.id]: [jokerCardId('red')],
						[BOB.id]: [jokerCardId('black')],
						[CAROL.id]: [...cardIds('3', 'Clubs')],
					},
				}),
			});

			await runTurn(ALICE, turnMeta.colors('game-flow', BOB.id, 'Joker', 1, 0, 'select'));

			const persisted = getPersistedGame();
			assert(
				persisted.athanasiuses[ALICE.id]?.includes('Joker'),
				'Alice should have a Joker Athanasius after collecting both jokers',
			);
			assert(
				(persisted.hands[ALICE.id] ?? []).length === 0,
				'Alice hand should be empty after Joker Athanasius is removed',
			);
		});

		it('Joker Athanasius: steal notification includes Athanasius indication', async () => {
			await resetGameFlowCase();

			await seedGameState({
				room: makeRoom({ players: [ALICE.id, BOB.id, CAROL.id], deckType: 54 }),
				game: makeGame({
					players: [ALICE.id, BOB.id, CAROL.id],
					jokerCardsToAthanasius: 2,
					cardsToAthanasius: 4,
					hands: {
						[ALICE.id]: [jokerCardId('red')],
						[BOB.id]: [jokerCardId('black')],
						[CAROL.id]: [...cardIds('3', 'Clubs')],
					},
				}),
			});

			await runTurn(ALICE, turnMeta.colors('game-flow', BOB.id, 'Joker', 1, 0, 'select'));

			assertSent(getLog(), CAROL.id, 'Афанасий');
		});

		it('Joker Athanasius: game ends when Joker Athanasius empties the last non-empty hand', async () => {
			await resetGameFlowCase();

			await seedGameState({
				room: makeRoom({ players: [ALICE.id, BOB.id, CAROL.id], deckType: 54 }),
				game: makeGame({
					players: [ALICE.id, BOB.id, CAROL.id],
					jokerCardsToAthanasius: 2,
					cardsToAthanasius: 4,
					hands: {
						[ALICE.id]: [jokerCardId('red')],
						[BOB.id]: [jokerCardId('black')],
						[CAROL.id]: [],
					},
				}),
			});

			await runTurn(ALICE, turnMeta.colors('game-flow', BOB.id, 'Joker', 1, 0, 'select'));

			const persisted = getPersistedGame();
			assert(persisted.ended !== undefined, 'Game should end when all hands are empty after Joker Athanasius');
			assertSent(getLog(), ALICE.id, 'Игра закончилась!');
			assertSent(getLog(), BOB.id, 'Игра закончилась!');
			assertSent(getLog(), CAROL.id, 'Игра закончилась!');
		});
	});

	describe('Regular Cards', async () => {
		it('54-card game: regular suit-based steal works alongside jokers', async () => {
			await resetGameFlowCase();

			await seedGameState({
				room: makeRoom({ players: [ALICE.id, BOB.id, CAROL.id], deckType: 54 }),
				game: makeGame({
					players: [ALICE.id, BOB.id, CAROL.id],
					jokerCardsToAthanasius: 2,
					cardsToAthanasius: 4,
					hands: {
						[ALICE.id]: [...cardIds54('A', 'Diamonds'), ...cardIds54('A', 'Clubs')],
						[BOB.id]: [...cardIds54('A', 'Hearts'), ...cardIds54('A', 'Spades')],
						[CAROL.id]: [jokerCardId('red')],
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
			assertSent(getLog(), ALICE.id, '⭐ <b>Алиса → Борис</b> | A | ♥️ 1 ♠️ 1 — Афанасий!', { type: 'edit' });
			assert(persisted.athanasiuses[ALICE.id]?.includes('A'), 'Alice should form Athanasius A from 52-deck cards in a 54-deck game');
		});

		it('54-card game: regular steal failure shifts the turn correctly', async () => {
			await resetGameFlowCase();

			await seedGameState({
				room: makeRoom({ players: [ALICE.id, BOB.id, CAROL.id], deckType: 54 }),
				game: makeGame({
					players: [ALICE.id, BOB.id, CAROL.id],
					jokerCardsToAthanasius: 2,
					cardsToAthanasius: 4,
					hands: {
						[ALICE.id]: [...cardIds54('K', 'Clubs')],
						[BOB.id]: [...cardIds54('K', 'Hearts'), ...cardIds54('K', 'Spades')],
						[CAROL.id]: [...cardIds54('Q', 'Diamonds')],
					},
				}),
			});

			// Wrong suit distribution → failure
			await runTurn(ALICE, turnMeta.suits('game-flow', BOB.id, 'K', 2, 2, {
				hearts: 2,
				diamonds: 0,
				spades: 0,
				clubs: 0,
				action: 'select',
			}));

			assertSent(getLog(), ALICE.id, '🟥 <b>Алиса → Борис</b> | K | ♥️ 2', { type: 'edit' });
			assert(getGame().activePlayer.id !== ALICE.id, 'Turn should shift after failed regular steal in 54-deck game');
		});

		it('54-card game: hand view of a player with both jokers shows red and black counts', async () => {
			const redJoker = Deck.getCardById(53)!;
			const blackJoker = Deck.getCardById(54)!;
			const view = Deck.getMyHandView([redJoker, blackJoker]);
			assert(view.includes('🃏'), 'Hand view must include joker emoji');
			assert(view.includes('🔴 1'), 'Must show 1 red joker');
			assert(view.includes('⚫ 1'), 'Must show 1 black joker');
		});
	});

	describe('Notifications', async () => {
		it('Joker steal: victim receives a notification', async () => {
			await resetGameFlowCase();

			await seedGameState({
				room: makeRoom({ players: [ALICE.id, BOB.id, CAROL.id], deckType: 54 }),
				game: makeGame({
					players: [ALICE.id, BOB.id, CAROL.id],
					jokerCardsToAthanasius: 2,
					hands: {
						[ALICE.id]: [jokerCardId('red')],
						[BOB.id]: [jokerCardId('black')],
						[CAROL.id]: [...cardIds('3', 'Clubs')],
					},
				}),
			});

			await runTurn(ALICE, turnMeta.colors('game-flow', BOB.id, 'Joker', 1, 0, 'select'));

			const bobMessages = getLog().filter(e => e.to === BOB.id);
			const received = bobMessages.some(m => m.text.includes('Алиса') && m.text.includes('🃏'));
			assert(received, 'Bob (victim) should receive a notification about Alice stealing the joker');
		});

		it('Joker steal: bystander players receive a mailing notification', async () => {
			await resetGameFlowCase();

			await seedGameState({
				room: makeRoom({ players: [ALICE.id, BOB.id, CAROL.id, DAVE.id], deckType: 54 }),
				game: makeGame({
					players: [ALICE.id, BOB.id, CAROL.id, DAVE.id],
					jokerCardsToAthanasius: 2,
					cardsToAthanasius: 4,
					hands: {
						[ALICE.id]: [jokerCardId('red')],
						[BOB.id]: [jokerCardId('black')],
						[CAROL.id]: [...cardIds('5', 'Clubs')],
						[DAVE.id]: [...cardIds('6', 'Hearts')],
					},
				}),
			});

			await runTurn(ALICE, turnMeta.colors('game-flow', BOB.id, 'Joker', 1, 0, 'select'));

			// Carol and Dave are bystanders — they should receive a mailing line
			assertSent(getLog(), CAROL.id, '🃏');
			assertSent(getLog(), DAVE.id, '🃏');
			// Alice (thief) must not appear as a mailing recipient in the bystander mailing
			assertNotSent(getLog(), ALICE.id, 'Алиса → Борис', { type: 'send' });
		});
	});
});
