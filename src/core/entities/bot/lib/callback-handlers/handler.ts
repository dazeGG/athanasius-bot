import _ from 'lodash';
import type TelegramBot from 'node-telegram-bot-api';

import type { HandlerGuard, CallbackHandler as CallbackHandlerType } from '~/core';

import type { CallbackHandlerOptions } from '.';

export class CallbackHandler {
	public readonly handler: CallbackHandlerType;
	private readonly options: CallbackHandlerOptions;
	private readonly guard?: HandlerGuard;

	constructor (handler: CallbackHandlerType, options: CallbackHandlerOptions, guard?: HandlerGuard) {
		this.handler = handler;
		this.options = options;
		this.guard = guard;
	}

	match (callbackQuery: TelegramBot.CallbackQuery): boolean {
		const { data, message } = callbackQuery;

		if (!data || !message) {
			return false;
		}

		if (this.guard && !this.guard({ ...callbackQuery, data, message })) {
			return false;
		}

		const { module, action, back, meta } = JSON.parse(data) as Partial<CallbackHandlerOptions>;

		if (!module) {
			return false;
		}

		const conditions: boolean[] = [
			module === this.options.module,
			this.options.action ? action === this.options.action : true,
			this.options.back ? back === this.options.back : true,
			this.options.meta ? _.isEqual(meta, this.options.meta) : true,
		];

		return conditions.every(Boolean);
	}
}
