import 'dotenv/config';

import { Bot as GrammyBot, session } from 'grammy';
import type { Middleware, Transformer } from 'grammy';

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

class Bot {
	private readonly grammyBot: GrammyBot<AppContext>;

	constructor (token: string) {
		this.grammyBot = new GrammyBot<AppContext>(token);
		this.grammyBot.api.config.use(htmlParseModeTransformer);
		this.grammyBot.use(session({
			initial: createInitialSessionData,
			getSessionKey: ctx => ctx.from?.id.toString(),
		}));

		this.grammyBot.catch((err) => {
			logError({
				error: err.error,
				errorText: 'Unhandled bot error',
				chatId: err.ctx.chat?.id ?? 0,
			});
		});
	}

	get api () {
		return this.grammyBot.api;
	}

	use (middleware: Middleware<AppContext>) {
		this.grammyBot.use(middleware);
	}

	async init (commands: { command: string; description: string }[]) {
		await this.grammyBot.api.setMyCommands(commands);
		void this.grammyBot.start();
	}
}

export const BOT = new Bot(process.env.BOT_TOKEN ?? '');
