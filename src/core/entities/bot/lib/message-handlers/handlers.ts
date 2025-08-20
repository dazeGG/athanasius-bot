import type TelegramBot from 'node-telegram-bot-api';

import type { MessageHandler as MessageHandlerType } from '~/core';

import { MessageHandler } from './handler';
import type { MessageHandlerOptions } from '.';

export class MessageHandlers {
	private readonly messageHandlers: MessageHandler[] = [];

	public register (handler: MessageHandlerType, options: MessageHandlerOptions): void {
		this.messageHandlers.push(new MessageHandler(handler, options));
	}

	public getHandler (message: TelegramBot.Message): MessageHandlerType | undefined {
		const messageHandler = this.messageHandlers.find(messageHandler => messageHandler.match(message));

		if (messageHandler) {
			return messageHandler.handler;
		}
	}
}
