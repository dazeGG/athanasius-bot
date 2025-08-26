import type TelegramBot from 'node-telegram-bot-api';

import type { HandlerGuard, MessageContextMessage, MessageHandler as MessageHandlerType } from '~/core';

export interface MessageHandlerOptions {
	state?: string;
	startsWith?: string;
	exact?: string;
	userId?: TelegramBot.User['id'];
}

export interface RegisterMessageHandlerOptions {
	handler: MessageHandlerType;
	options: MessageHandlerOptions;
	guard?: HandlerGuard<MessageContextMessage>;
}
