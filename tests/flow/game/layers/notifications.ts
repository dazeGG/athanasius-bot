/**
 * notifications.ts — notification delivery coverage for instant and composed players.
 */
import { getLog } from '../../../bootstrap';
import { assert, assertNotSent, assertSent } from '../../../runner';
import type { ModuleTools } from '../../../runner';

import {
	ALICE,
	BOB,
	CAROL,
	cardIds,
	createUsers,
	getGame,
	getMessagesFor,
	makeGame,
	makeGameLog,
	resetGameFlowCase,
	runTurn,
	seedGameState,
	sendSeededFirstMessage,
	turnMeta,
} from '../helpers';

const seedNotificationGame = async (views: Partial<Record<number, 'instant' | 'composed'>> = {}): Promise<void> => {
	await seedGameState({
		users: createUsers(views),
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

/**
 * Runs notification coverage for instant mailings and composed round summaries.
 */
export async function runNotificationsLayer ({ runCase }: ModuleTools): Promise<void> {
	await runCase('Instant players receive wrong-turn mailings in real time', async () => {
		await resetGameFlowCase();
		await seedNotificationGame();

		await runTurn(ALICE, turnMeta.count('game-flow', BOB.id, 'A', 1, 'select'));

		assertSent(getLog(), CAROL.id, '🟥 <b>Алиса → Борис</b> | A | 1');
	});

	await runCase('Composed players are excluded from real-time wrong-turn mailings', async () => {
		await resetGameFlowCase();
		await seedNotificationGame({ [CAROL.id]: 'composed' });

		await runTurn(ALICE, turnMeta.count('game-flow', BOB.id, 'A', 1, 'select'));

		assertNotSent(getLog(), CAROL.id, '🟥 <b>Алиса → Борис</b> | A | 1');
	});

	await runCase('Composed players receive a last-round summary before their turn prompt', async () => {
		await resetGameFlowCase();
		await seedGameState({
			users: createUsers({ [ALICE.id]: 'composed' }),
			game: makeGame({
				players: [ALICE.id, BOB.id, CAROL.id],
				hands: {
					[ALICE.id]: [...cardIds('A', 'Diamonds')],
					[BOB.id]: [...cardIds('K', 'Clubs')],
					[CAROL.id]: [...cardIds('3', 'Clubs')],
				},
				logs: [
					makeGameLog({ from: BOB.id, to: CAROL.id, cardName: 'K', steal: false, stealData: [1] }),
					makeGameLog({ from: CAROL.id, to: BOB.id, cardName: '3', steal: true, stealData: [1] }),
				],
			}),
		});

		await sendSeededFirstMessage();

		const aliceMessages = getMessagesFor(ALICE.id);

		assert(aliceMessages.length === 1, 'Composed player should receive a single combined message with summary and turn prompt');
		assert(aliceMessages[0]!.includes('Вот что было за последний круг'), 'Message should contain the composed summary');
		assert(aliceMessages[0]!.includes('Твой ход!'), 'Message should contain the regular turn prompt');
	});

	await runCase('Last-round summary stops at the active player’s previous turn', async () => {
		await resetGameFlowCase();
		await seedGameState({
			game: makeGame({
				players: [ALICE.id, BOB.id, CAROL.id],
				hands: {
					[ALICE.id]: [...cardIds('A', 'Diamonds')],
					[BOB.id]: [...cardIds('K', 'Clubs')],
					[CAROL.id]: [...cardIds('3', 'Clubs')],
				},
				logs: [
					makeGameLog({ from: BOB.id, to: CAROL.id, cardName: 'K', steal: false, stealData: [1] }),
					makeGameLog({ from: ALICE.id, to: BOB.id, cardName: 'A', steal: true, stealData: [1] }),
					makeGameLog({ from: CAROL.id, to: BOB.id, cardName: '3', steal: false, stealData: [1] }),
					makeGameLog({ from: BOB.id, to: ALICE.id, cardName: 'K', steal: true, stealData: [1] }),
				],
			}),
		});

		const logs = getGame().getLastRoundLogs();

		assert(!logs.includes('<b>Борис → Каролина</b> | K'), 'Logs before Alice’s previous turn should be excluded');
		assert(logs.includes('🟥 <b>Каролина → Борис</b> | 3 | 1'), 'Logs after Alice’s previous turn should be included');
		assert(logs.includes('🟧 <b>Борис → Ты</b> | K | 1'), 'Newest logs should be included in order');
	});

	await runCase('Composed next players receive a summary when a failed turn hands control to them', async () => {
		await resetGameFlowCase();
		await seedNotificationGame({ [BOB.id]: 'composed' });

		await runTurn(ALICE, turnMeta.card('game-flow', BOB.id, 'K'));

		const bobMessages = getMessagesFor(BOB.id);

		assert(bobMessages.some(message => message.includes('Вот что было за последний круг')), 'Bob should receive a composed summary when the turn passes to him');
		assert(bobMessages.some(message => message.includes('Твой ход!')), 'Bob should still receive the regular turn prompt');
		assert(!bobMessages.some(message => message.includes('Нет карт K')), 'Bob should not receive the real-time failure mailing while on composed updates');
	});

	await runCase('Composed steal victim still receives an instant notification about their lost cards', async () => {
		await resetGameFlowCase();
		await seedGameState({
			users: createUsers({ [BOB.id]: 'composed' }),
			game: makeGame({
				players: [ALICE.id, BOB.id, CAROL.id],
				hands: {
					[ALICE.id]: [...cardIds('A', 'Diamonds')],
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

		assertSent(getLog(), BOB.id, '🟧 <b>Алиса → Ты</b> | A');
	});

	await runCase('Composed observers are excluded from real-time steal broadcasts', async () => {
		await resetGameFlowCase();
		await seedGameState({
			users: createUsers({ [CAROL.id]: 'composed' }),
			game: makeGame({
				players: [ALICE.id, BOB.id, CAROL.id],
				hands: {
					[ALICE.id]: [...cardIds('A', 'Diamonds')],
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

		assertNotSent(getLog(), CAROL.id, '<b>Алиса → Борис</b> | A');
	});
}
