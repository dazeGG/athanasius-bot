import type TelegramBot from 'node-telegram-bot-api';

import { STATES } from '~/core';
import type { HandlerGuard, MessageHandler as MessageHandlerType, MessageContextMessage } from '~/core';

import type { MessageHandlerOptions, RegisterMessageHandlerOptions } from './types';

export class MessageHandler {
	public readonly handler: MessageHandlerType;
	private readonly options: MessageHandlerOptions;
	private readonly guard?: HandlerGuard<MessageContextMessage>;

	constructor ({ handler, options, guard }: RegisterMessageHandlerOptions) {
		this.handler = handler;
		this.options = options;
		this.guard = guard;
	}

	public match (message: TelegramBot.Message): boolean {
		const { text, from: user } = message;

		if (!text || !user) {
			return false;
		}

		if (this.guard && !this.guard({ ...message, text, from: user })) {
			return false;
		}

		const { state, startsWith, exact, userId } = this.options;

		const conditions: boolean[] = [
			state ? state === STATES.getState(user.id) : false,
			startsWith ? text.startsWith(startsWith) : false,
			exact ? exact === text : false,
			userId ? userId === user.id : false,
		];

		return conditions.some(Boolean);
	}
}
