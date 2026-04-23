import type { AppContext, CallbackCtx, MessageCtx } from '.';

export type MessageHandler = (ctx: MessageCtx) => Promise<void>;
export type CallbackHandler = (ctx: CallbackCtx) => Promise<void>;
export type HandlerGuard<T extends AppContext = AppContext> = (ctx: T) => boolean;
