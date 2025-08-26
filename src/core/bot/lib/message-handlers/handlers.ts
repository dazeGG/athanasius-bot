import type TelegramBot from 'node-telegram-bot-api';

import type { MessageHandler as MessageHandlerType } from '~/core';

import { MessageHandler } from './handler';
import type { RegisterMessageHandlerOptions } from './types';

export class MessageHandlers {
	private readonly messageHandlers: MessageHandler[] = [];

	public register (registerMessageHandlerOptions: RegisterMessageHandlerOptions): void {
		this.messageHandlers.push(new MessageHandler(registerMessageHandlerOptions));
	}

	public getHandler (message: TelegramBot.Message): MessageHandlerType | undefined {
		const messageHandler = this.messageHandlers.find(messageHandler => messageHandler.match(message));

		if (messageHandler) {
			return messageHandler.handler;
		}
	}
}
