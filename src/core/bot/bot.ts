import 'dotenv/config';

import { Bot, session } from 'grammy';
import type { Transformer } from 'grammy';

import { logError } from '~/core/lib';
import { createInitialSessionData } from './types';
import type { AppContext } from './types';

const HTML_PARSE_MODE_METHODS = new Set(['sendMessage', 'editMessageText']);

const htmlParseModeTransformer: Transformer = async (prev, method, payload, signal) => {
	if (!HTML_PARSE_MODE_METHODS.has(method)) {
		return prev(method, payload, signal);
	}

	const payloadRecord = payload as Record<string, unknown>;

	if ('parse_mode' in payloadRecord || 'entities' in payloadRecord) {
		return prev(method, payload, signal);
	}

	return prev(method, {
		...payloadRecord,
		parse_mode: 'HTML',
	} as typeof payload, signal);
};

export const BOT = new Bot<AppContext>(process.env.BOT_TOKEN ?? '');

BOT.api.config.use(htmlParseModeTransformer);

BOT.use(session({
	initial: createInitialSessionData,
	getSessionKey: ctx => ctx.from?.id.toString(),
}));

BOT.catch((err) => {
	logError({
		error: err.error,
		errorText: 'Unhandled bot error',
		chatId: err.ctx.chat?.id ?? 0,
	});
});
