/**
 * start.ts — /start command coverage split into explicit cases.
 */

import { describe, it } from 'vitest';
import { clearDB, getLog, resetLog, seedDB, withMessageMethods } from '../bootstrap';
import { assertSent } from '../runner';

const PLAYERS = [
	{ id: 1001, username: 'alice_sim', name: 'Алиса' },
	{ id: 1002, username: 'bob_sim', name: 'Борис' },
] as const;

const [ALICE, BOB] = PLAYERS;

type PlayerFixture = (typeof PLAYERS)[number];

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

const resetStartCase = async (): Promise<void> => {
	resetLog();
	await clearDB();
};

const seedRegisteredUsers = async (players: readonly PlayerFixture[]): Promise<void> => {
	await seedDB({
		users: players.map(player => ({
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

/**
 * Runs tests coverage for the `/start` command entrypoints.
 */
describe('startModule', async () => {
	const handlers = await import('../../src/modules/start/handlers');

	it('Greets unregistered users and suggests /reg', async () => {
		await resetStartCase();

		await handlers.startCommandHandler(makeMessageCtx(ALICE, '/start'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Я бот для игры в Афанасия');
		assertSent(log, ALICE.id, 'Для регистрации напиши мне /reg');
	});

	it('Tells registered users to wait for the game start', async () => {
		await resetStartCase();
		await seedRegisteredUsers([BOB]);

		await handlers.startCommandHandler(makeMessageCtx(BOB, '/start'));

		const log = getLog();
		assertSent(log, BOB.id, 'Ты уже зарегистрирован, подожди пока игра начнётся');
	});
});
