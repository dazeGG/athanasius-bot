import type TelegramBot from 'node-telegram-bot-api';

import type { CallbackHandler as CallbackHandlerType } from '~/core';

import type { CallbackHandlerOptions } from '.';

export class CallbackHandler {
	public readonly handler: CallbackHandlerType;
	private readonly options: CallbackHandlerOptions;

	constructor (handler: CallbackHandlerType, options: CallbackHandlerOptions) {
		this.handler = handler;
		this.options = options;
	}

	match (callbackQuery: TelegramBot.CallbackQuery): boolean {
		if (!callbackQuery.data) {
			return false;
		}

		const { module, action, back } = JSON.parse(callbackQuery.data) as Partial<CallbackHandlerOptions>;

		if (!module) {
			return false;
		}

		const conditions: boolean[] = [
			module === this.options.module,
			this.options.action ? action === this.options.action : true,
			this.options.back ? back === this.options.back : true,
		];

		return conditions.every(Boolean);
	}
}
