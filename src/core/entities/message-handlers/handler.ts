import type TelegramBot from 'node-telegram-bot-api';

import { STATES } from '~/core';
import type { MessageHandler as MessageHandlerType } from '~/core';

import type { MessageHandlerOptions } from '.';

export class MessageHandler {
	public readonly handler: MessageHandlerType;
	private readonly options: MessageHandlerOptions;

	constructor (handler: MessageHandlerType, options: MessageHandlerOptions) {
		this.handler = handler;
		this.options = options;
	}

	public match (message: TelegramBot.Message): boolean {
		if (!message.from || !message.text) {
			return false;
		}

		const { state, startsWith, userId } = this.options;

		const conditions: boolean[] = [
			state ? STATES.getState(message.from.id) === state : false,
			startsWith ? message.text.startsWith(startsWith) : false,
			userId ? message.from.id === userId : false,
		];

		return conditions.some(Boolean);
	}
}
