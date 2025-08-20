import type { CallbackContext, CallbackContextCallback, MessageContext, MessageContextMessage } from '.';

export type MessageHandler = (ctx: MessageContext) => Promise<void>;
export type CallbackHandler = (ctx: CallbackContext) => Promise<void>;

export type HandlerGuardContextEntity = MessageContextMessage | CallbackContextCallback;
export type HandlerGuard = (contextEntity: HandlerGuardContextEntity) => boolean;
