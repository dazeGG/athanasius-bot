import type { CallbackContext, MessageContext } from '.';

export type MessageHandler = (ctx: MessageContext) => Promise<void>;
export type CallbackHandler = (ctx: CallbackContext) => Promise<void>;

export type HandlerGuard<EntityT> = (contextEntity: EntityT) => boolean;
