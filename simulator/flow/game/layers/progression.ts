/**
 * progression.ts — happy-path staged progression for the game flow.
 */
import { Deck } from '~/entities/deck';

import { getLog } from '../../../bootstrap';
import { assert, assertSent } from '../../../runner';
import type { ModuleTools } from '../../../runner';

import {
	ALICE,
	BOB,
	CAROL,
	DAVE,
	cardIds,
	getGame,
	getLatestMessage,
	makeGame,
	resetGameFlowCase,
	runTurn,
	seedGameState,
	sendSeededFirstMessage,
	turnMeta,
} from '../helpers';

const seedProgressionGame = async (cardsToAthanasius = 4): Promise<void> => {
	await seedGameState({
		game: makeGame({
			players: [ALICE.id, BOB.id, CAROL.id, DAVE.id],
			cardsToAthanasius,
			hands: {
				[ALICE.id]: [...cardIds('A', 'Diamonds'), ...cardIds('K', 'Clubs')],
				[BOB.id]: [...cardIds('A', 'Hearts'), ...cardIds('A', 'Spades')],
				[CAROL.id]: [],
				[DAVE.id]: [...cardIds('Q', 'Clubs')],
			},
		}),
	});
};

/**
 * Runs happy-path coverage for player, card, count, colors, and suits stages.
 */
export async function runProgressionLayer ({ runCase }: ModuleTools): Promise<void> {
	await runCase('Shows only other players with cards in the opening turn keyboard', async () => {
		await resetGameFlowCase();
		await seedProgressionGame();

		await sendSeededFirstMessage();

		const latestMessage = getLatestMessage(ALICE.id);

		assert(latestMessage !== undefined, 'Alice should receive a turn message');
		assert(latestMessage.includes(BOB.name), 'Bob should appear in target selection');
		assert(latestMessage.includes(DAVE.name), 'David should appear in target selection');
		assert(!latestMessage.includes(ALICE.name), 'Alice should not be able to target herself');
		assert(!latestMessage.includes(CAROL.name), 'Players without cards should not appear in target selection');
	});

	await runCase('Player stage opens rank selection from the active hand only', async () => {
		await resetGameFlowCase();
		await seedProgressionGame();

		await runTurn(ALICE, turnMeta.player('game-flow', BOB.id));

		const latestMessage = getLatestMessage(ALICE.id, { type: 'edit' });

		assert(latestMessage !== undefined, 'Alice should receive a card selection message');
		assertSent(getLog(), ALICE.id, 'K · A');
		assert(!latestMessage.includes('Q'), 'Ranks that are absent from the active hand should not appear in the keyboard');
	});

	await runCase('Count stage keeps the upper bound at cardsToAthanasius minus one', async () => {
		await resetGameFlowCase();
		await seedProgressionGame(8);

		await runTurn(ALICE, turnMeta.count('game-flow', BOB.id, 'A', 6, '+'));

		const latestMessage = getLatestMessage(ALICE.id, { type: 'edit' });

		assert(latestMessage !== undefined, 'Alice should receive an updated count message');
		assert(latestMessage.includes('Сейчас выбрано: <b>7</b>'), 'Count should update to the upper valid bound');
		assert(latestMessage.includes('- · Выбрать'), 'Upper-bound keyboard should allow decrement and selection');
		assert(!latestMessage.includes('+ ·'), 'Upper-bound keyboard should not allow incrementing past the limit');
	});

	await runCase('Count selection advances the flow to the colors stage', async () => {
		await resetGameFlowCase();
		await seedProgressionGame();

		await runTurn(ALICE, turnMeta.count('game-flow', BOB.id, 'A', 2, 'select'));

		const latestMessage = getLatestMessage(ALICE.id, { type: 'edit' });

		assert(latestMessage !== undefined, 'Alice should receive a colors selection message');
		assert(latestMessage.includes('Выбери сколько <b>красных</b> карт ты хочешь спросить'), 'Flow should move to colors selection');
		assert(latestMessage.includes('🔴: <b>0</b> ⚫: <b>2</b>'), 'Colors stage should start from the default red/black split');
	});

	await runCase('Colors selection advances the flow to the suits stage', async () => {
		await resetGameFlowCase();
		await seedProgressionGame();

		await runTurn(ALICE, turnMeta.colors('game-flow', BOB.id, 'A', 2, 1, 'select'));

		const latestMessage = getLatestMessage(ALICE.id, { type: 'edit' });

		assert(latestMessage !== undefined, 'Alice should receive a suits selection message');
		assert(latestMessage.includes('Выбери количество мастей, которые ты хочешь спросить'), 'Flow should move to suits selection');
		assert(latestMessage.includes('mode: +'), 'Suits stage should start in increment mode');
	});

	await runCase('Suits stage shows the select button only after an exact distribution is built', async () => {
		await resetGameFlowCase();
		await seedProgressionGame();

		await runTurn(ALICE, turnMeta.suits('game-flow', BOB.id, 'A', 2, 1, {
			hearts: 0,
			diamonds: 0,
			spades: 0,
			clubs: 0,
			action: 'h',
		}));

		let latestMessage = getLatestMessage(ALICE.id, { type: 'edit' });
		assert(latestMessage !== undefined, 'Alice should receive an updated suits message');
		assert(!latestMessage.includes('Выбрать'), 'Incomplete suits split should not expose the select button');

		await runTurn(ALICE, turnMeta.suits('game-flow', BOB.id, 'A', 2, 1, {
			hearts: 1,
			diamonds: 0,
			spades: 0,
			clubs: 0,
			action: 's',
		}));

		latestMessage = getLatestMessage(ALICE.id, { type: 'edit' });
		assert(latestMessage !== undefined, 'Alice should receive another suits update');
		assert(latestMessage.includes('Выбрать'), 'Exact suits split should expose the select button');
	});

	await runCase('Exact suits success steals cards and keeps the turn while the hand stays non-empty', async () => {
		await resetGameFlowCase();
		await seedProgressionGame();

		await runTurn(ALICE, turnMeta.suits('game-flow', BOB.id, 'A', 2, 1, {
			hearts: 1,
			diamonds: 0,
			spades: 1,
			clubs: 0,
			action: 'select',
		}));

		const aliceHand = getGame().getHand(ALICE.id)?.cardsInHand.map(card => card.displayName) ?? [];
		const bobHand = getGame().getHand(BOB.id)?.cardsInHand.map(card => card.displayName) ?? [];

		assertSent(getLog(), ALICE.id, 'Ты успешно украл карты');
		assert(getGame().activePlayer.id === ALICE.id, 'Turn should stay with the active player after a successful steal with remaining cards');
		assert(aliceHand.length === 4, 'Alice should keep her original cards and receive Bob’s rank cards');
		assert(aliceHand.some(card => card === Deck.getCardById(cardIds('A', 'Hearts')[0])?.displayName), 'Alice should receive the target hearts card');
		assert(aliceHand.some(card => card === Deck.getCardById(cardIds('A', 'Spades')[0])?.displayName), 'Alice should receive the target spades card');
		assert(bobHand.length === 0, 'Bob should lose all cards of the stolen rank');
	});
}
