/**
 * bootstrap.ts — loaded via dynamic import by index.ts AFTER env is configured.
 * Imports all project code, mocks BOT, and re-exports everything modules need.
 */

import type { KeyboardButton } from 'grammy/types';

import type { UserSchema, GameSchema, RoomSchema } from '~/db/schemas';

// ─── Project code (env must already be set by the time this module evaluates) ──
const { BOT } = await import('~/core');
const { DB } = await import('~/db');
const { STATES } = await import('~/core/states');
const gameModule = await import('~/entities/game');

// ─── Transport capture ────────────────────────────────────────────────────────
export interface CapturedMsg {
	type: 'send' | 'edit' | 'delete';
	to: number;
	toName: string;
	text: string;
	messageId?: number;
}

let _log: CapturedMsg[] = [];

const nameOf = (id: number): string =>
	DB.data.users.find(u => u.id === id)?.name ?? `user#${id}`;

const capture = (
	type: CapturedMsg['type'],
	to: number,
	text: string,
	messageId?: number,
): void => {
	_log.push({ type, to, toName: nameOf(to), text, messageId });
};

const appendKeyboardLabels = (text: string, keyboard?: RawReplyKeyboard): string => {
	if (!keyboard || !Array.isArray(keyboard)) return text;
	const labels = keyboard.flat().map(b => b.text ?? b);
	return text + '\n\n' + labels.join(' · ');
};

type RawReplyKeyboard = Array<Array<KeyboardButton | { text: string; callback_data?: unknown }>>;
type MessageOptions = {
	keyboard?: RawReplyKeyboard;
	options?: {
		reply_markup?: {
			keyboard?: RawReplyKeyboard;
			inline_keyboard?: RawReplyKeyboard;
		};
	};
};

const getKeyboard = ({ keyboard, options }: MessageOptions): RawReplyKeyboard | undefined => {
	return keyboard ?? options?.reply_markup?.keyboard ?? options?.reply_markup?.inline_keyboard;
};

const getDeletedMessageId = (ctx: {
	message?: { message_id: number };
	callbackQuery?: { message?: { message_id: number } };
}): number | undefined => {
	return ctx.message?.message_id ?? ctx.callbackQuery?.message?.message_id;
};

type ReplyLikeContext = {
	chat: { id: number };
	message?: { message_id: number };
	callbackQuery?: { message?: { message_id: number } };
};

const reply = async (ctx: ReplyLikeContext, text: string, options?: MessageOptions['options']) => {
	capture('send', ctx.chat.id, appendKeyboardLabels(text, getKeyboard({ options })));
};

const editMessageText = async (ctx: ReplyLikeContext, text: string, options?: MessageOptions['options']) => {
	capture('edit', ctx.chat.id, appendKeyboardLabels(text, getKeyboard({ options })));
};

const deleteMessage = async (ctx: ReplyLikeContext) => {
	const messageId = getDeletedMessageId(ctx);
	capture('delete', ctx.chat.id, messageId === undefined ? 'message' : `message#${messageId}`, messageId);
};

export const withMessageMethods = <ContextT extends ReplyLikeContext> (ctx: ContextT) => {
	return Object.assign(ctx, {
		reply: (text: string, options?: MessageOptions['options']) => reply(ctx, text, options),
		deleteMessage: () => deleteMessage(ctx),
	});
};

export const withCallbackMethods = <ContextT extends ReplyLikeContext> (ctx: ContextT) => {
	return Object.assign(ctx, {
		reply: (text: string, options?: MessageOptions['options']) => reply(ctx, text, options),
		editMessageText: (text: string, options?: MessageOptions['options']) => editMessageText(ctx, text, options),
		deleteMessage: () => deleteMessage(ctx),
		answerCallbackQuery: async () => {},
	});
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
	ctx: { chat?: { id: number } };
	text: string;
	keyboard?: RawReplyKeyboard;
	options?: MessageOptions['options'];
}) => capture('send', ctx.chat?.id ?? 0, appendKeyboardLabels(text, getKeyboard({ keyboard, options })));

(BOT as any).editMessage = async ({
	ctx,
	text,
	keyboard,
	options,
}: {
	ctx: { chat?: { id: number } };
	text: string;
	keyboard?: RawReplyKeyboard;
	options?: MessageOptions['options'];
}) => capture('edit', ctx.chat?.id ?? 0, appendKeyboardLabels(text, getKeyboard({ keyboard, options })));

(BOT as any).deleteMessage = async (ctx: {
	chat?: { id: number };
	message?: { message_id: number };
	callbackQuery?: { message?: { message_id: number } };
}) => {
	const messageId = getDeletedMessageId(ctx);
	capture('delete', ctx.chat?.id ?? 0, messageId === undefined ? 'message' : `message#${messageId}`, messageId);
};

(BOT.api as any).sendMessage = async (chatId: number, text: string, options?: MessageOptions['options']) => {
	capture('send', chatId, appendKeyboardLabels(text, getKeyboard({ options })));
};

// ─── Log API ──────────────────────────────────────────────────────────────────
/**
 * Returns the captured simulator transport log for the current test case.
 */
export const getLog = (): readonly CapturedMsg[] => _log;

/**
 * Clears the captured transport log without touching database state.
 */
export const resetLog = (): void => { _log = []; };

// ─── DB helpers ───────────────────────────────────────────────────────────────
/**
 * Resets the test database to an empty persisted snapshot.
 */
export async function clearDB (): Promise<void> {
	setDBData({ users: [], rooms: [], games: [] });
	await DB.write();
}

// ─── DB data mutation helpers (safe for reassignment) ─────────────────────────
/**
 * Replaces lowdb collections in place so ORM references remain valid.
 */
export function setDBData (data: { users: unknown[]; rooms: unknown[]; games: unknown[] }): void {
	// Replace the content of the existing object, don't reassign DB.data
	// This ensures all ORM instances still reference the same object
	DB.data.users = data.users as never;
	DB.data.rooms = data.rooms as never;
	DB.data.games = data.games as never;
}

/**
 * Seeds the simulator database with a full explicit snapshot for one case.
 */
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
