import type { HandlerGuard, CallbackHandler as CallbackHandlerType, CallbackContextCallback } from '~/core';

import type { CallbackHandlerOptions, RegisterCallbackHandlerOptions } from './types';

export class CallbackHandler {
	public readonly handler: CallbackHandlerType;
	private readonly options: CallbackHandlerOptions;
	private readonly guard?: HandlerGuard<CallbackContextCallback>;

	constructor ({ handler, options, guard }: RegisterCallbackHandlerOptions) {
		this.handler = handler;
		this.options = options;
		this.guard = guard;
	}

	match (callbackQuery: CallbackContextCallback): boolean {
		const { data, message } = callbackQuery;

		if (!data || !message) {
			return false;
		}

		if (this.guard && !this.guard({ ...callbackQuery, data, message })) {
			return false;
		}

		const { module, action, back, meta } = data as Partial<CallbackHandlerOptions>;

		if (!module) {
			return false;
		}

		const conditions: boolean[] = [
			module === this.options.module,
			this.options.action ? action === this.options.action : true,
			this.options.back ? back === this.options.back : true,
			this.options.meta ? meta === this.options.meta : true,
		];

		return conditions.every(Boolean);
	}
}
