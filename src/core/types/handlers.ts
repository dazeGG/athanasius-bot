import type TelegramBot from 'node-telegram-bot-api';

import type { CallbackContext, MessageContext } from '.';

export type MessageHandler = (ctx: MessageContext) => Promise<void>;
export type CallbackHandler = (ctx: CallbackContext) => Promise<void>;

export type CallbackHandlerOptions = {
	callbacks: Record<string, CallbackHandler>;
	callback: TelegramBot.CallbackQuery;
};
