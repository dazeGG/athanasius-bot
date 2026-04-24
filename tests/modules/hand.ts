/**
 * hand.ts — hand lookup coverage split into explicit cases.
 */

import { Deck } from '../../src/entities/deck';

import { clearDB, getLog, resetLog, seedDB, withCallbackMethods, withMessageMethods } from '../bootstrap';
import { assert, assertDeleted, assertSent } from '../runner';
import type { ModuleTools } from '../runner';

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
					logs: [],
				},
			},
			{
				id: 'game2',
				roomId: ROOM_TWO.id,
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
export async function handModule ({ runCase }: ModuleTools): Promise<void> {
	const handlers = await import('../../src/modules/hand/handlers');

	await runCase('Shows empty hand state when there are no active games', async () => {
		await resetHandCase();
		await seedRegisteredUsers();

		await handlers.handMessageHandler(makeMessageCtx(ALICE, 'Рука'));

		const log = getLog();
		assertDeleted(log, ALICE.id, 1);
		assertSent(log, ALICE.id, 'У тебя пока нет запущенных игр');
	});

	await runCase('Shows one active game in the hand picker', async () => {
		await resetHandCase();
		await seedOneActiveGame();

		await handlers.handMessageHandler(makeMessageCtx(ALICE, 'Рука'));

		const log = getLog();
		assertDeleted(log, ALICE.id, 1);
		assertSent(log, ALICE.id, 'Выбери игру, руку в которой хочешь посмотреть');
		assertSent(log, ALICE.id, ROOM_ONE.name);
	});

	await runCase('Shows multiple active games in the hand picker', async () => {
		await resetHandCase();
		await seedTwoActiveGames();

		await handlers.handMessageHandler(makeMessageCtx(ALICE, 'Рука'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Выбери игру, руку в которой хочешь посмотреть');
		assertSent(log, ALICE.id, ROOM_ONE.name);
		assertSent(log, ALICE.id, ROOM_TWO.name);
	});

	await runCase('Shows the selected hand for a game', async () => {
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

	await runCase('Back callback returns from a hand to the games list', async () => {
		await resetHandCase();
		await seedTwoActiveGames();

		await handlers.handBackCallbackHandler(makeCallbackCtx(ALICE, { module: 'hand', back: true }));

		const log = getLog();
		assertSent(log, ALICE.id, 'Выбери игру, руку в которой хочешь посмотреть');
		assertSent(log, ALICE.id, ROOM_ONE.name);
		assertSent(log, ALICE.id, ROOM_TWO.name);
	});

	await runCase('Close callback deletes the hand picker message', async () => {
		await resetHandCase();
		await seedOneActiveGame();

		await handlers.handCloseCallbackHandler(makeCallbackCtx(ALICE, { module: 'hand', action: 'close' }));

		const log = getLog();
		assertDeleted(log, ALICE.id, 1);
		assert(log.length === 1, 'Close callback should only delete the hand message');
	});
}
