/**
 * hand.ts — hand lookup coverage split into explicit cases.
 */

import { describe, it } from 'vitest';
import { Deck } from '../../src/entities/deck';

import { clearDB, getLog, resetLog, seedDB, withCallbackMethods, withMessageMethods } from '../bootstrap';
import { assert, assertDeleted, assertSent } from '../runner';

const PLAYERS = [
	{ id: 1001, username: 'alice_sim', name: 'Алиса' },
	{ id: 1002, username: 'bob_sim', name: 'Борис' },
	{ id: 1003, username: 'carol_sim', name: 'Каролина' },
] as const;

const [ALICE, BOB, CAROL] = PLAYERS;

type PlayerFixture = (typeof PLAYERS)[number];

const ROOM_ONE = {
	id: 'room1',
	name: 'Комната Алисы',
	owner: ALICE.id,
	players: [ALICE.id, BOB.id],
	settings: {
		joinCode: 'AAAA-BBBB',
		deckType: 52 as const,
		decksCount: 4,
		towHands: false,
		allowMailing: false,
		allowMailingAtTurn: false,
	},
};

const ROOM_TWO = {
	id: 'room2',
	name: 'Комната Каролины',
	owner: CAROL.id,
	players: [ALICE.id, CAROL.id],
	settings: {
		joinCode: 'CCCC-DDDD',
		deckType: 52 as const,
		decksCount: 4,
		towHands: false,
		allowMailing: false,
		allowMailingAtTurn: false,
	},
};

const findCardId = (name: string, suit: 'Hearts' | 'Diamonds' | 'Spades' | 'Clubs'): number => {
	const card = Deck.getDeck().find(item => item.name === name && item.suit === suit);
	assert(card !== undefined, `Card ${name} of ${suit} should exist in deck`);
	return card!.id;
};

const ALICE_HAND = [
	findCardId('A', 'Hearts'),
	findCardId('A', 'Spades'),
	findCardId('10', 'Clubs'),
];

const BOB_HAND = [
	findCardId('K', 'Diamonds'),
];

const CAROL_HAND: number[] = [];

const makeMessageCtx = (player: PlayerFixture, text: string) => withMessageMethods({
	chat: { id: player.id, type: 'private' as const },
	from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
	message: {
		message_id: 1,
		chat: { id: player.id, type: 'private' as const },
		date: Math.floor(Date.now() / 1000),
		text,
		from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
	},
});

const makeCallbackCtx = (
	player: PlayerFixture,
	data: { module: 'hand'; action?: 'show' | 'close'; back?: true; meta?: string },
	messageId = 1,
) => withCallbackMethods({
	chat: { id: player.id, type: 'private' as const },
	from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
	callbackData: data,
	callbackQuery: {
		id: `cb-${player.id}-${data.action ?? 'back'}`,
		from: { id: player.id, is_bot: false, first_name: player.name, username: player.username },
		message: {
			message_id: messageId,
			chat: { id: player.id, type: 'private' as const },
			date: Math.floor(Date.now() / 1000),
		},
		chat_instance: '',
		data: `${data.module}:${data.back ? 'back' : (data.action ?? '')}:${data.meta ?? ''}`,
	},
});

const resetHandCase = async (): Promise<void> => {
	resetLog();
	await clearDB();
};

const seedRegisteredUsers = async (): Promise<void> => {
	await seedDB({
		users: PLAYERS.map(player => ({
			id: player.id,
			username: player.username,
			name: player.name,
			settings: {
				updatesView: 'instant' as const,
			},
			achievements: [],
		})),
		rooms: [],
		games: [],
	});
	resetLog();
};

const seedOneActiveGame = async (): Promise<void> => {
	await seedDB({
		users: PLAYERS.map(player => ({
			id: player.id,
			username: player.username,
			name: player.name,
			settings: {
				updatesView: 'instant' as const,
			},
			achievements: [],
		})),
		rooms: [ROOM_ONE],
		games: [
			{
				id: 'game1',
				roomId: ROOM_ONE.id,
				name: ROOM_ONE.name,
				started: Date.now(),
				players: [ALICE.id, BOB.id],
				hands: {
					[ALICE.id]: ALICE_HAND,
					[BOB.id]: BOB_HAND,
				},
				athanasiuses: {
					[ALICE.id]: [],
					[BOB.id]: [],
				},
				utils: {
					cardsToAthanasius: 16,
					jokerCardsToAthanasius: 8,
					logs: [],
				},
			},
		],
	});
	resetLog();
};

const seedTwoActiveGames = async (): Promise<void> => {
	await seedDB({
		users: PLAYERS.map(player => ({
			id: player.id,
			username: player.username,
			name: player.name,
			settings: {
				updatesView: 'instant' as const,
			},
			achievements: [],
		})),
		rooms: [ROOM_ONE, ROOM_TWO],
		games: [
			{
				id: 'game1',
				roomId: ROOM_ONE.id,
				name: ROOM_ONE.name,
				started: Date.now(),
				players: [ALICE.id, BOB.id],
				hands: {
					[ALICE.id]: ALICE_HAND,
					[BOB.id]: BOB_HAND,
				},
				athanasiuses: {
					[ALICE.id]: [],
					[BOB.id]: [],
				},
				utils: {
					cardsToAthanasius: 16,
					jokerCardsToAthanasius: 8,
					logs: [],
				},
			},
			{
				id: 'game2',
				roomId: ROOM_TWO.id,
				name: ROOM_TWO.name,
				started: Date.now() + 1,
				players: [ALICE.id, CAROL.id],
				hands: {
					[ALICE.id]: ALICE_HAND,
					[CAROL.id]: CAROL_HAND,
				},
				athanasiuses: {
					[ALICE.id]: [],
					[CAROL.id]: [],
				},
				utils: {
					cardsToAthanasius: 16,
					jokerCardsToAthanasius: 8,
					logs: [],
				},
			},
		],
	});
	resetLog();
};

const seedEndedGame = async (): Promise<void> => {
	await seedDB({
		users: PLAYERS.map(player => ({
			id: player.id,
			username: player.username,
			name: player.name,
			settings: {
				updatesView: 'instant' as const,
			},
			achievements: [],
		})),
		rooms: [ROOM_ONE],
		games: [
			{
				id: 'game-ended',
				roomId: ROOM_ONE.id,
				name: ROOM_ONE.name,
				started: Date.now() - 10_000,
				ended: Date.now(),
				players: [ALICE.id, BOB.id],
				hands: {
					[ALICE.id]: ALICE_HAND,
					[BOB.id]: BOB_HAND,
				},
				athanasiuses: {
					[ALICE.id]: [],
					[BOB.id]: [],
				},
				utils: {
					cardsToAthanasius: 16,
					jokerCardsToAthanasius: 8,
					logs: [],
				},
			},
		],
	});
	resetLog();
};

const seedActiveAndEndedGames = async (): Promise<void> => {
	await seedDB({
		users: PLAYERS.map(player => ({
			id: player.id,
			username: player.username,
			name: player.name,
			settings: {
				updatesView: 'instant' as const,
			},
			achievements: [],
		})),
		rooms: [ROOM_ONE, ROOM_TWO],
		games: [
			{
				id: 'game-active',
				roomId: ROOM_ONE.id,
				name: ROOM_ONE.name,
				started: Date.now(),
				players: [ALICE.id, BOB.id],
				hands: {
					[ALICE.id]: ALICE_HAND,
					[BOB.id]: BOB_HAND,
				},
				athanasiuses: {
					[ALICE.id]: [],
					[BOB.id]: [],
				},
				utils: {
					cardsToAthanasius: 16,
					jokerCardsToAthanasius: 8,
					logs: [],
				},
			},
			{
				id: 'game-ended',
				roomId: ROOM_TWO.id,
				name: ROOM_TWO.name,
				started: Date.now() - 10_000,
				ended: Date.now(),
				players: [ALICE.id, CAROL.id],
				hands: {
					[ALICE.id]: ALICE_HAND,
					[CAROL.id]: CAROL_HAND,
				},
				athanasiuses: {
					[ALICE.id]: [],
					[CAROL.id]: [],
				},
				utils: {
					cardsToAthanasius: 16,
					jokerCardsToAthanasius: 8,
					logs: [],
				},
			},
		],
	});
	resetLog();
};

const seedGameWithEmptyHand = async (): Promise<void> => {
	await seedDB({
		users: PLAYERS.map(player => ({
			id: player.id,
			username: player.username,
			name: player.name,
			settings: {
				updatesView: 'instant' as const,
			},
			achievements: [],
		})),
		rooms: [ROOM_ONE],
		games: [
			{
				id: 'game1',
				roomId: ROOM_ONE.id,
				name: ROOM_ONE.name,
				started: Date.now(),
				players: [ALICE.id, BOB.id],
				hands: {
					[ALICE.id]: [],
					[BOB.id]: BOB_HAND,
				},
				athanasiuses: {
					[ALICE.id]: [],
					[BOB.id]: [],
				},
				utils: {
					cardsToAthanasius: 16,
					jokerCardsToAthanasius: 8,
					logs: [],
				},
			},
		],
	});
	resetLog();
};

/**
 * Runs tests coverage for hand listing, opening, navigation, and closing.
 */
describe('handModule', async () => {
	const handlers = await import('../../src/modules/hand/handlers');

	it('Shows empty hand state when there are no active games', async () => {
		await resetHandCase();
		await seedRegisteredUsers();

		await handlers.handMessageHandler(makeMessageCtx(ALICE, 'Рука'));

		const log = getLog();
		assertDeleted(log, ALICE.id, 1);
		assertSent(log, ALICE.id, 'У тебя пока нет запущенных игр');
	});

	it('Shows one active game in the hand picker', async () => {
		await resetHandCase();
		await seedOneActiveGame();

		await handlers.handMessageHandler(makeMessageCtx(ALICE, 'Рука'));

		const log = getLog();
		assertDeleted(log, ALICE.id, 1);
		assertSent(log, ALICE.id, 'Выбери игру, руку в которой хочешь посмотреть');
		assertSent(log, ALICE.id, ROOM_ONE.name);
	});

	it('Shows multiple active games in the hand picker', async () => {
		await resetHandCase();
		await seedTwoActiveGames();

		await handlers.handMessageHandler(makeMessageCtx(ALICE, 'Рука'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Выбери игру, руку в которой хочешь посмотреть');
		assertSent(log, ALICE.id, ROOM_ONE.name);
		assertSent(log, ALICE.id, ROOM_TWO.name);
	});

	it('Shows the selected hand for a game', async () => {
		await resetHandCase();
		await seedOneActiveGame();

		await handlers.handShowCallbackHandler(makeCallbackCtx(ALICE, { module: 'hand', action: 'show', meta: 'game1' }));

		const log = getLog();
		assertSent(log, ALICE.id, `Комната ${ROOM_ONE.name}`);
		assertSent(log, ALICE.id, '<code>');
		assertSent(log, ALICE.id, 'A |');
		assertSent(log, ALICE.id, '10 |');
		assertSent(log, ALICE.id, 'Закрыть');
	});

	it('Back callback returns from a hand to the games list', async () => {
		await resetHandCase();
		await seedTwoActiveGames();

		await handlers.handBackCallbackHandler(makeCallbackCtx(ALICE, { module: 'hand', back: true }));

		const log = getLog();
		assertSent(log, ALICE.id, 'Выбери игру, руку в которой хочешь посмотреть');
		assertSent(log, ALICE.id, ROOM_ONE.name);
		assertSent(log, ALICE.id, ROOM_TWO.name);
	});

	it('Close callback deletes the hand picker message', async () => {
		await resetHandCase();
		await seedOneActiveGame();

		await handlers.handCloseCallbackHandler(makeCallbackCtx(ALICE, { module: 'hand', action: 'close' }));

		const log = getLog();
		assertDeleted(log, ALICE.id, 1);
		assert(log.length === 1, 'Close callback should only delete the hand message');
	});

	it('Ended game is not shown in the hand picker', async () => {
		await resetHandCase();
		await seedEndedGame();

		await handlers.handMessageHandler(makeMessageCtx(ALICE, 'Рука'));

		const log = getLog();
		assertSent(log, ALICE.id, 'У тебя пока нет запущенных игр');
	});

	it('Mix of active and ended games — only the active game appears', async () => {
		await resetHandCase();
		await seedActiveAndEndedGames();

		await handlers.handMessageHandler(makeMessageCtx(ALICE, 'Рука'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Выбери игру, руку в которой хочешь посмотреть');
		assertSent(log, ALICE.id, ROOM_ONE.name);
		const sentTexts = log.filter(m => m.type === 'send' && m.to === ALICE.id).map(m => m.text);
		assert(!sentTexts.some(t => t.includes(ROOM_TWO.name)), 'Ended game room must not appear in the picker');
	});

	it('Shows empty-hand message when player has no cards left', async () => {
		await resetHandCase();
		await seedGameWithEmptyHand();

		await handlers.handShowCallbackHandler(makeCallbackCtx(ALICE, { module: 'hand', action: 'show', meta: 'game1' }));

		const log = getLog();
		assertSent(log, ALICE.id, 'У тебя закончились карты');
	});
});
