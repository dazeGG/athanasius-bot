/**
 * start.ts — /start command coverage split into explicit cases.
 */

import { clearDB, getLog, resetLog, seedDB, withMessageMethods } from '../bootstrap';
import { assertSent } from '../runner';
import type { ModuleTools } from '../runner';

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
 * Runs simulator coverage for the `/start` command entrypoints.
 */
export async function startModule ({ runCase }: ModuleTools): Promise<void> {
	const handlers = await import('~/modules/start/handlers');

	await runCase('Greets unregistered users and suggests /reg', async () => {
		await resetStartCase();

		await handlers.startCommandHandler(makeMessageCtx(ALICE, '/start'));

		const log = getLog();
		assertSent(log, ALICE.id, 'Я бот для игры в Афанасия');
		assertSent(log, ALICE.id, 'Для регистрации напиши мне /reg');
	});

	await runCase('Tells registered users to wait for the game start', async () => {
		await resetStartCase();
		await seedRegisteredUsers([BOB]);

		await handlers.startCommandHandler(makeMessageCtx(BOB, '/start'));

		const log = getLog();
		assertSent(log, BOB.id, 'Ты уже зарегистрирован, подожди пока игра начнётся');
	});
}
