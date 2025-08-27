import type { CallbackContextCallback, CallbackHandler, HandlerGuard } from '~/core';

export interface CallbackHandlerOptions {
	module: string;
	action?: string;
	back?: boolean;
	meta?: string;
}

export interface RegisterCallbackHandlerOptions {
	handler: CallbackHandler;
	options: CallbackHandlerOptions;
	guard?: HandlerGuard<CallbackContextCallback>;
}
