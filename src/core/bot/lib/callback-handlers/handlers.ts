import type { CallbackHandler as CallbackHandlerType, CallbackContextCallback } from '~/core';

import { CallbackHandler } from './handler';
import type { RegisterCallbackHandlerOptions } from '.';

export class CallbackHandlers {
	private readonly callbackHandlers: CallbackHandler[] = [];

	public register (registerCallbackHandlerOptions : RegisterCallbackHandlerOptions): void {
		this.callbackHandlers.push(new CallbackHandler(registerCallbackHandlerOptions));
	}

	public getHandler (callbackQuery: CallbackContextCallback): CallbackHandlerType | undefined {
		const callbackHandler = this.callbackHandlers.find(callbackHandler => callbackHandler.match(callbackQuery));

		if (callbackHandler) {
			return callbackHandler.handler;
		}
	}
}
