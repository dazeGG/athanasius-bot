import type TelegramBot from 'node-telegram-bot-api';

import type { HandlerGuard, CallbackHandler as CallbackHandlerType } from '~/core';

import { CallbackHandler } from './handler';
import type { CallbackHandlerOptions } from '.';

export class CallbackHandlers {
	private readonly callbackHandlers: CallbackHandler[] = [];

	public register (handler: CallbackHandlerType, options: CallbackHandlerOptions, guard?: HandlerGuard): void {
		this.callbackHandlers.push(new CallbackHandler(handler, options, guard));
	}

	public getHandler (callbackQuery: TelegramBot.CallbackQuery): CallbackHandlerType | undefined {
		const callbackHandler = this.callbackHandlers.find(callbackHandler => callbackHandler.match(callbackQuery));

		if (callbackHandler) {
			return callbackHandler.handler;
		}
	}
}
