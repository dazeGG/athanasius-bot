import type { Context, Filter } from 'grammy';

export interface CallbackData {
	module: string;
	action?: string;
	back?: boolean;
	meta?: string;
}

export type AppContext = Context & {
	callbackData?: CallbackData;
};

export type MessageCtx = Filter<AppContext, 'message:text'>;
export type CallbackCtx = Filter<AppContext, 'callback_query:data'>;
