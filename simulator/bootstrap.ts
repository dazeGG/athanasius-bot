/**
 * bootstrap.ts — loaded via dynamic import by index.ts AFTER env is configured.
 * Imports all project code, mocks BOT, and re-exports everything scenarios need.
 */

import type { UserSchema, GameSchema, RoomSchema } from '~/db/schemas';

// ─── Project code (env must already be set by the time this module evaluates) ──
const { BOT } = await import('~/core');
const { DB } = await import('~/db');
const gameModule = await import('~/entities/game');

// ─── Stop fake polling ────────────────────────────────────────────────────────
(BOT as any).bot.on('polling_error', () => {});
(BOT as any).bot.stopPolling().catch(() => {});

// ─── Message capture ──────────────────────────────────────────────────────────
export interface CapturedMsg {
	type: 'send' | 'edit';
	to: number;
	toName: string;
	text: string;
}

let _log: CapturedMsg[] = [];

const nameOf = (id: number): string =>
	DB.data.users.find(u => u.id === id)?.name ?? `user#${id}`;

const capture = (type: CapturedMsg['type'], to: number, text: string): void => {
	_log.push({ type, to, toName: nameOf(to), text });
};

// ─── Mock BOT methods ─────────────────────────────────────────────────────────
(BOT as any).sendMessageByChatId = async ({ chatId, text }: { chatId: number; text: string }) =>
	capture('send', chatId, text);

(BOT as any).sendMessage = async ({ ctx, text }: { ctx: { chatId: number }; text: string }) =>
	capture('send', ctx.chatId, text);

(BOT as any).editMessage = async ({ ctx, text }: { ctx: { chatId: number }; text: string }) =>
	capture('edit', ctx.chatId, text);

(BOT as any).answerCallbackQuery = async () => {};

// ─── Log API ──────────────────────────────────────────────────────────────────
export const getLog = (): readonly CapturedMsg[] => _log;
export const resetLog = (): void => { _log = []; };

// ─── DB helpers ───────────────────────────────────────────────────────────────
export async function seedDB (data: {
	users: UserSchema[];
	rooms: RoomSchema[];
	games: GameSchema[];
}): Promise<void> {
	DB.data = data;
	await DB.write();
}

// ─── Re-exports for scenarios ─────────────────────────────────────────────────
export { DB };
export const {
	Game,
	TurnStage,
	processTurn,
	sendFirstMessage,
	notifyInitialAthanasiuses,
} = gameModule;
