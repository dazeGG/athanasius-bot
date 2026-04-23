/**
 * core.ts — cross-cutting regression coverage for core infrastructure.
 */

import type { ApiCallFn } from 'grammy';

import { STATES, BOT, clearDB, getLog, resetLog } from '../bootstrap';
import { assert, assertSent } from '../runner';
import type { ModuleTools } from '../runner';

import {
	ALICE,
	BOB,
	CAROL,
	cardIds,
	createUsers,
	makeGame,
	makeTurnCallbackCtx,
	resetGameFlowCase,
	seedGameState,
	turnMeta,
	STALE_GAME_MESSAGE_TEXT,
} from '../flow/game/helpers';

/**
 * Runs regression checks for shared core behavior.
 */
export async function coreModule ({ runCase }: ModuleTools): Promise<void> {
	await runCase('Clears both state and context, and drops stale context when state changes', async () => {
		resetLog();
		await clearDB();

		STATES.setState(ALICE.id, 'ROOM_CDC', { roomId: 'room-1' });
		assert(STATES.getState(ALICE.id) === 'ROOM_CDC', 'Alice state should be stored');
		assert((STATES.getContext(ALICE.id) as { roomId?: string } | undefined)?.roomId === 'room-1', 'Alice context should be stored');

		STATES.setState(ALICE.id, 'REGISTRATION');
		assert(STATES.getContext(ALICE.id) === undefined, 'Setting a new state without context should clear the previous context');

		STATES.setContext(ALICE.id, { roomId: 'room-2' });
		STATES.clearState(ALICE.id);
		assert(STATES.getState(ALICE.id) === undefined, 'Alice state should be cleared');
		assert(STATES.getContext(ALICE.id) === undefined, 'Alice context should be cleared');
	});

	await runCase('Publishes user-facing Telegram commands alongside keyboard helpers', async () => {
		const { commands } = await import('~/commands');

		assert(commands.some(command => command.command === 'start'), 'Commands list should include /start');
		assert(commands.some(command => command.command === 'reg'), 'Commands list should include /reg');
		assert(commands.some(command => command.command === 'addglobalkeyboard'), 'Commands list should keep keyboard helper commands');
	});

	await runCase('Installs an HTML parse mode transformer for text messages', async () => {
		const transformer = BOT.api.config.installedTransformers().at(-1);
		assert(transformer !== undefined, 'Bot API should install at least one transformer');

		let capturedMethod = '';
		let capturedPayload: Record<string, unknown> | undefined;

		const prev: ApiCallFn = async (method, payload) => {
			capturedMethod = method;
			capturedPayload = payload as Record<string, unknown>;
			return {
				ok: true,
				result: true,
			} as never;
		};

		await transformer!(
			prev,
			'sendMessage',
			{
				chat_id: ALICE.id,
				text: '<b>Привет</b>',
			},
			undefined,
		);

		assert(capturedMethod === 'sendMessage', 'Transformer should preserve the method');
		assert(capturedPayload?.parse_mode === 'HTML', 'Transformer should inject HTML parse mode for text messages');
	});

	await runCase('Escapes HTML-sensitive user content before rendering it into messages', async () => {
		const { escapeHtml } = await import('~/shared/lib');

		assert(
			escapeHtml('<b>Зал & Co</b>') === '&lt;b&gt;Зал &amp; Co&lt;/b&gt;',
			'escapeHtml should neutralize angle brackets and ampersands',
		);
		assert(escapeHtml('Комната Алисы') === 'Комната Алисы', 'escapeHtml should keep plain text unchanged');
	});

	await runCase('Routes invalid game callbacks through the composer and returns a stale-message reply', async () => {
		await resetGameFlowCase();
		await seedGameState({
			users: createUsers(),
			game: makeGame({
				players: [ALICE.id, BOB.id, CAROL.id],
				hands: {
					[ALICE.id]: [...cardIds('A', 'Diamonds')],
					[BOB.id]: [...cardIds('K', 'Clubs')],
					[CAROL.id]: [...cardIds('3', 'Clubs')],
				},
			}),
		});

		const { default: gameComposer } = await import('~/modules/game');
		const middleware = gameComposer.middleware();

		await middleware(
			makeTurnCallbackCtx(BOB, turnMeta.player('game-flow', CAROL.id)),
			async () => undefined,
		);

		assertSent(getLog(), BOB.id, STALE_GAME_MESSAGE_TEXT);
	});
}
