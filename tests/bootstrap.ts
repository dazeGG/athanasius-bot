/**
 * bootstrap.ts — loaded via dynamic import by index.ts AFTER env is configured.
 * Imports all project code, mocks BOT, and re-exports everything modules need.
 */

import type { KeyboardButton } from 'grammy/types';

import type { AppContext, AppFlowState, AppSession, CallbackCtx, MessageCtx } from '../src/core';
import type { UserSchema, GameSchema, RoomSchema } from '../src/db/schemas';

// ─── Project code (env must already be set by the time this module evaluates) ──
const { BOT } = await import('../src/core');
const { DB } = await import('../src/db');
const gameModule = await import('../src/entities/game');

// ─── Transport capture ────────────────────────────────────────────────────────
export interface CapturedMsg {
	type: 'send' | 'edit' | 'delete';
	to: number;
	toName: string;
	body: string;
	text: string;
	messageId?: number;
	parseMode?: string;
	keyboard?: CapturedKeyboard;
}

export interface CapturedKeyboardButton {
	text: string;
	callbackData?: string;
}

export type CapturedKeyboard = CapturedKeyboardButton[][];

let _log: CapturedMsg[] = [];
let _sessions = new Map<number, AppSession>();

const createSession = (): AppSession => ({
	flow: {},
});

const getOrCreateSession = (userId: number): AppSession => {
	const session = _sessions.get(userId);

	if (session) {
		return session;
	}

	const nextSession = createSession();
	_sessions.set(userId, nextSession);
	return nextSession;
};

export const SESSIONS = {
	get (userId: number): AppSession {
		return getOrCreateSession(userId);
	},
	setFlow (userId: number, flow: AppFlowState): void {
		getOrCreateSession(userId).flow = flow;
	},
	clear (userId: number): void {
		_sessions.delete(userId);
	},
	reset (): void {
		_sessions = new Map();
	},
};

const SUPPORTED_HTML_TAGS = new Set(['b', '/b', 'code', '/code']);

const nameOf = (id: number): string =>
	DB.data.users.find(u => u.id === id)?.name ?? `user#${id}`;

const capture = (
	type: CapturedMsg['type'],
	to: number,
	text: string,
	messageId?: number,
	options: {
		keyboard?: CapturedKeyboard;
		parseMode?: string;
	} = {},
): void => {
	_log.push({
		type,
		to,
		toName: nameOf(to),
		body: text,
		text: appendKeyboardLabels(text, options.keyboard),
		messageId,
		parseMode: options.parseMode,
		keyboard: options.keyboard,
	});
};

const appendKeyboardLabels = (text: string, keyboard?: CapturedKeyboard): string => {
	if (!keyboard || !Array.isArray(keyboard)) {
		return text;
	}

	const labels = keyboard.flat().map(button => button.text);
	return text + '\n\n' + labels.join(' · ');
};

const assertHtmlCompatibleText = (text: string): void => {
	let index = 0;

	while (index < text.length) {
		const char = text[index];

		if (char === '<') {
			const tagEndIndex = text.indexOf('>', index + 1);

			if (tagEndIndex < 0) {
				throw new Error(`Simulator captured malformed HTML text: missing closing ">" in "${text}"`);
			}

			const tagName = text.slice(index + 1, tagEndIndex);

			if (!SUPPORTED_HTML_TAGS.has(tagName)) {
				throw new Error(`Simulator captured unsupported HTML tag "<${tagName}>" in "${text}"`);
			}

			index = tagEndIndex + 1;
			continue;
		}

		if (char === '&') {
			const entityMatch = text.slice(index).match(/^&(amp|lt|gt);/);

			if (!entityMatch) {
				throw new Error(`Simulator captured unescaped "&" in "${text}"`);
			}

			index += entityMatch[0].length;
			continue;
		}

		index += 1;
	}
};

type RawReplyKeyboard = Array<Array<KeyboardButton | { text: string; callback_data?: unknown }>>;
type MessageOptions = {
	keyboard?: RawReplyKeyboard;
	options?: {
		parse_mode?: string;
		reply_markup?: {
			keyboard?: RawReplyKeyboard;
			inline_keyboard?: RawReplyKeyboard;
		};
	};
};

const getKeyboard = ({ keyboard, options }: MessageOptions): RawReplyKeyboard | undefined => {
	return keyboard ?? options?.reply_markup?.keyboard ?? options?.reply_markup?.inline_keyboard;
};

const getParseMode = ({ options }: MessageOptions): string | undefined => {
	return options?.parse_mode;
};

const normalizeKeyboard = (keyboard?: RawReplyKeyboard): CapturedKeyboard | undefined => {
	if (!keyboard || !Array.isArray(keyboard)) {
		return undefined;
	}

	return keyboard.map(row => {
		return row.map(button => {
			if (typeof button === 'string') {
				return { text: button };
			}

			const callbackData = 'callback_data' in button && typeof button.callback_data === 'string'
				? button.callback_data
				: undefined;

			return {
				text: button.text,
				...(callbackData ? { callbackData } : {}),
			};
		});
	});
};

const getDeletedMessageId = (ctx: {
	message?: { message_id: number };
	callbackQuery?: { message?: { message_id: number } };
}): number | undefined => {
	return ctx.message?.message_id ?? ctx.callbackQuery?.message?.message_id;
};

type ReplyLikeContext = {
	chat: { id: number };
	from: { id: number };
	message?: { message_id: number };
	callbackQuery?: { message?: { message_id: number } };
};

const BOT_ME = {
	id: 0,
	is_bot: true,
	first_name: 'Athanasius',
	username: 'athanasius_bot',
} as const;

const reply = async (ctx: ReplyLikeContext, text: string, options?: MessageOptions['options']) => {
	assertHtmlCompatibleText(text);
	capture('send', ctx.chat.id, text, undefined, {
		keyboard: normalizeKeyboard(getKeyboard({ options })),
		parseMode: getParseMode({ options }),
	});
};

const editMessageText = async (ctx: ReplyLikeContext, text: string, options?: MessageOptions['options']) => {
	assertHtmlCompatibleText(text);
	capture('edit', ctx.chat.id, text, undefined, {
		keyboard: normalizeKeyboard(getKeyboard({ options })),
		parseMode: getParseMode({ options }),
	});
};

const deleteMessage = async (ctx: ReplyLikeContext) => {
	const messageId = getDeletedMessageId(ctx);
	capture('delete', ctx.chat.id, messageId === undefined ? 'message' : `message#${messageId}`, messageId);
};

export const withMessageMethods = <ContextT extends ReplyLikeContext> (ctx: ContextT): MessageCtx & ContextT => {
	return Object.assign(ctx, {
		api: BOT.api,
		me: BOT_ME,
		session: getOrCreateSession(ctx.from.id),
		update: {
			message: ctx.message,
		},
		reply: (text: string, options?: MessageOptions['options']) => reply(ctx, text, options),
		deleteMessage: () => deleteMessage(ctx),
	}) as unknown as MessageCtx & ContextT;
};

export const withCallbackMethods = <ContextT extends ReplyLikeContext> (ctx: ContextT): CallbackCtx & ContextT => {
	return Object.assign(ctx, {
		api: BOT.api,
		me: BOT_ME,
		session: getOrCreateSession(ctx.from.id),
		update: {
			callback_query: ctx.callbackQuery,
		},
		reply: (text: string, options?: MessageOptions['options']) => reply(ctx, text, options),
		editMessageText: (text: string, options?: MessageOptions['options']) => editMessageText(ctx, text, options),
		deleteMessage: () => deleteMessage(ctx),
		answerCallbackQuery: async () => {},
	}) as unknown as CallbackCtx & ContextT;
};

// ─── Mock BOT methods ─────────────────────────────────────────────────────────
const mockedBot = BOT as unknown as {
	sendMessageByChatId: (options: {
		chatId: number;
		text: string;
		keyboard?: RawReplyKeyboard;
		options?: MessageOptions['options'];
	}) => Promise<void>;
	sendMessage: (options: {
		ctx: { chat?: { id: number } };
		text: string;
		keyboard?: RawReplyKeyboard;
		options?: MessageOptions['options'];
	}) => Promise<void>;
	editMessage: (options: {
		ctx: { chat?: { id: number } };
		text: string;
		keyboard?: RawReplyKeyboard;
		options?: MessageOptions['options'];
	}) => Promise<void>;
	deleteMessage: (ctx: {
		chat?: { id: number };
		message?: { message_id: number };
		callbackQuery?: { message?: { message_id: number } };
	}) => Promise<void>;
	api: typeof BOT.api & {
		sendMessage: (chatId: number, text: string, options?: MessageOptions['options']) => Promise<void>;
	};
};

mockedBot.sendMessageByChatId = async ({
	chatId,
	text,
	keyboard,
	options,
}: {
	chatId: number;
	text: string;
	keyboard?: RawReplyKeyboard;
	options?: MessageOptions['options'];
}) => {
	assertHtmlCompatibleText(text);
	capture('send', chatId, text, undefined, {
		keyboard: normalizeKeyboard(getKeyboard({ keyboard, options })),
		parseMode: getParseMode({ options }),
	});
};

mockedBot.sendMessage = async ({
	ctx,
	text,
	keyboard,
	options,
}: {
	ctx: { chat?: { id: number } };
	text: string;
	keyboard?: RawReplyKeyboard;
	options?: MessageOptions['options'];
}) => {
	assertHtmlCompatibleText(text);
	capture('send', ctx.chat?.id ?? 0, text, undefined, {
		keyboard: normalizeKeyboard(getKeyboard({ keyboard, options })),
		parseMode: getParseMode({ options }),
	});
};

mockedBot.editMessage = async ({
	ctx,
	text,
	keyboard,
	options,
}: {
	ctx: { chat?: { id: number } };
	text: string;
	keyboard?: RawReplyKeyboard;
	options?: MessageOptions['options'];
}) => {
	assertHtmlCompatibleText(text);
	capture('edit', ctx.chat?.id ?? 0, text, undefined, {
		keyboard: normalizeKeyboard(getKeyboard({ keyboard, options })),
		parseMode: getParseMode({ options }),
	});
};

mockedBot.deleteMessage = async (ctx: {
	chat?: { id: number };
	message?: { message_id: number };
	callbackQuery?: { message?: { message_id: number } };
}) => {
	const messageId = getDeletedMessageId(ctx);
	capture('delete', ctx.chat?.id ?? 0, messageId === undefined ? 'message' : `message#${messageId}`, messageId);
};

mockedBot.api.sendMessage = (async (chatId: number, text: string, options?: MessageOptions['options']) => {
	assertHtmlCompatibleText(text);
	capture('send', chatId, text, undefined, {
		keyboard: normalizeKeyboard(getKeyboard({ options })),
		parseMode: getParseMode({ options }),
	});
}) as never;

// ─── Log API ──────────────────────────────────────────────────────────────────
/**
 * Returns the captured tests transport log for the current tests case.
 */
export const getLog = (): readonly CapturedMsg[] => _log;

/**
 * Clears the captured transport log without touching database state.
 */
export const resetLog = (): void => {
	_log = [];
};

// ─── DB helpers ───────────────────────────────────────────────────────────────
/**
 * Resets the tests database to an empty persisted snapshot.
 */
export async function clearDB (): Promise<void> {
	setDBData({ users: [], rooms: [], games: [] });
	SESSIONS.reset();
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
 * Seeds the tests database with a full explicit snapshot for one case.
 */
export async function seedDB (data: {
	users: UserSchema[];
	rooms: RoomSchema[];
	games: GameSchema[];
}): Promise<void> {
	setDBData(data as never);
	await DB.write();
}

// ─── Re-exports for tests modules ─────────────────────────────────────────
export {
	DB,
};
export {
	BOT,
};
export type {
	AppContext,
	CallbackCtx,
	MessageCtx,
};
export const {
	Game,
	TurnStage,
	processTurn,
	sendFirstMessage,
	notifyInitialAthanasiuses,
} = gameModule;
