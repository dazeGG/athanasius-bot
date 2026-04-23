/**
 * bootstrap.ts — loaded via dynamic import by index.ts AFTER env is configured.
 * Imports all project code, mocks BOT, and re-exports everything modules need.
 */

import type { UserSchema, GameSchema, RoomSchema } from '~/db/schemas';

// ─── Project code (env must already be set by the time this module evaluates) ──
const { BOT } = await import('~/core');
const { DB } = await import('~/db');
const { STATES } = await import('~/core/states');
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

const appendKeyboardLabels = (text: string, keyboard?: RawReplyKeyboard | TelegramBot.ReplyKeyboardMarkup): string => {
	if (!keyboard || !Array.isArray(keyboard)) return text;
	const labels = keyboard.flat().map(b => b.text ?? b);
	return text + '\n\n' + labels.join(' · ');
};

type RawReplyKeyboard = Array<Array<TelegramBot.KeyboardButton | { text: string; callback_data?: unknown }>>;
type MessageOptions = {
	keyboard?: RawReplyKeyboard;
	options?: {
		reply_markup?: {
			keyboard?: RawReplyKeyboard;
		};
	};
};

const getKeyboard = ({ keyboard, options }: MessageOptions): RawReplyKeyboard | undefined => {
	return keyboard ?? options?.reply_markup?.keyboard;
};

// ─── Mock BOT methods ─────────────────────────────────────────────────────────
(BOT as any).sendMessageByChatId = async ({
	chatId,
	text,
	keyboard,
	options,
}: {
	chatId: number;
	text: string;
	keyboard?: RawReplyKeyboard;
	options?: MessageOptions['options'];
}) => capture('send', chatId, appendKeyboardLabels(text, getKeyboard({ keyboard, options })));

(BOT as any).sendMessage = async ({
	ctx,
	text,
	keyboard,
	options,
}: {
	ctx: { chatId: number };
	text: string;
	keyboard?: RawReplyKeyboard;
	options?: MessageOptions['options'];
}) => capture('send', ctx.chatId, appendKeyboardLabels(text, getKeyboard({ keyboard, options })));

(BOT as any).editMessage = async ({
	ctx,
	text,
	keyboard,
	options,
}: {
	ctx: { chatId: number };
	text: string;
	keyboard?: RawReplyKeyboard;
	options?: MessageOptions['options'];
}) => capture('edit', ctx.chatId, appendKeyboardLabels(text, getKeyboard({ keyboard, options })));

(BOT as any).deleteMessage = async () => {};
(BOT as any).answerCallbackQuery = async () => {};

// ─── Log API ──────────────────────────────────────────────────────────────────
export const getLog = (): readonly CapturedMsg[] => _log;
export const resetLog = (): void => { _log = []; };

// ─── DB helpers ───────────────────────────────────────────────────────────────
export async function clearDB (): Promise<void> {
	setDBData({ users: [], rooms: [], games: [] });
	await DB.write();
}

// ─── DB data mutation helpers (safe for reassignment) ─────────────────────────
export function setDBData (data: { users: unknown[]; rooms: unknown[]; games: unknown[] }): void {
	// Replace the content of the existing object, don't reassign DB.data
	// This ensures all ORM instances still reference the same object
	DB.data.users = data.users as never;
	DB.data.rooms = data.rooms as never;
	DB.data.games = data.games as never;
}

export async function seedDB (data: {
	users: UserSchema[];
	rooms: RoomSchema[];
	games: GameSchema[];
}): Promise<void> {
	setDBData(data as never);
	await DB.write();
}

// ─── Re-exports for simulator modules ─────────────────────────────────────────
export { DB, STATES };
export const {
	Game,
	TurnStage,
	processTurn,
	sendFirstMessage,
	notifyInitialAthanasiuses,
} = gameModule;
