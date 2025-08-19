import type { CallbackHandler, CallbackContextCallback, MessageHandler, MessageContextMessage } from '~/core';

type ChatIdMiddlewareContext =
  | { message: MessageContextMessage; next: MessageHandler; callback?: never; }
  | { callback: CallbackContextCallback; next: CallbackHandler; message?: never; };

export const chatIdMiddleware = async (ctx: ChatIdMiddlewareContext) => {
	if (ctx.callback) {
		const { callback, next } = ctx;
		const { message } = callback;

		if (message) {
			const { id: chatId } = message.chat;
			await next({ callback, chatId });
		}
	} else {
		const { message, next } = ctx;
		const { id: chatId } = message.chat;

		await next({ message, chatId });
	}
};
