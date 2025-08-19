import 'dotenv/config';

import TelegramBot from 'node-telegram-bot-api';

import { logError } from '~/core';

import { stringifyCallbackData, MessageHandlers, CallbackHandlers } from './lib';
import type { MessageHandlerOptions, CallbackHandlerOptions } from './lib';
import { chatIdMiddleware } from './middlewares';
import type {
	MessageHandler,
	CallbackHandler,
	BotContext,
	EditMessageOptions,
	SendMessageByChatIdOptions,
	SendMessageOptions,
	CallbackContext,
} from '.';

class Bot {
	private readonly bot: TelegramBot;

	private readonly commands: Map<string, MessageHandler>;
	private readonly messageHandlers: MessageHandlers;
	private readonly callbackHandlers: CallbackHandlers;

	constructor (token: string) {
		this.bot = new TelegramBot(token, { polling: true });

		this.commands = new Map();
		this.messageHandlers = new MessageHandlers();
		this.callbackHandlers = new CallbackHandlers();
	}

	private async setMenuCommands (menuCommands: TelegramBot.BotCommand[]) {
		await this.bot.setMyCommands(menuCommands);
	}

	registerCommand (command: string, handler: MessageHandler) {
		this.commands.set(command, handler);
	}

	registerMessageHandler (handler: MessageHandler, options: MessageHandlerOptions) {
		this.messageHandlers.register(handler, options);
	}

	registerCallbackHandler (handler: CallbackHandler, options: CallbackHandlerOptions) {
		this.callbackHandlers.register(handler, options);
	}

	async init (commands: TelegramBot.BotCommand[]) {
		await this.setMenuCommands(commands);

		this.bot.on('message', async message => {
			if (!message.text || !message.from) {
				return;
			}

			const { text, from: user } = message;

			// * Command handler
			const commandHandler = this.commands.get(text);

			if (text.startsWith('/') && commandHandler) {
				await chatIdMiddleware({ message: { ...message, text, from: user }, next: commandHandler });
				return;
			}

			// * Message handler
			const messageHandler = this.messageHandlers.getHandler(message);

			if (messageHandler) {
				await chatIdMiddleware({ message: { ...message, text, from: user }, next: messageHandler });
				return;
			}
		});

		this.bot.on('callback_query', async callbackQuery => {
			if (!callbackQuery.data || !callbackQuery.message) {
				return;
			}

			const { data, message } = callbackQuery;

			// * Callback handler
			const callbackHandler = this.callbackHandlers.getHandler(callbackQuery);

			if (callbackHandler) {
				await chatIdMiddleware({ callback: { ...callbackQuery, data, message }, next: callbackHandler });
				return;
			}
		});
	}

	async sendMessageByChatId ({ chatId, message, keyboard, options }: SendMessageByChatIdOptions) {
		const messageOptions: TelegramBot.SendMessageOptions = { parse_mode: 'HTML', disable_web_page_preview: true };

		if (keyboard) {
			messageOptions.reply_markup = {
				...options?.reply_markup,
				inline_keyboard: stringifyCallbackData(keyboard),
			};
		}

		try {
			await this.bot.sendMessage(chatId, message, { ...messageOptions, ...options });
		} catch (error) {
			logError({ error, errorText: message, chatId });
		}
	}

	async sendMessage ({ ctx, message, keyboard, options }: SendMessageOptions) {
		try {
			await this.sendMessageByChatId({ chatId: ctx.chatId, message, keyboard, options });
		} catch (error) {
			logError({
				error,
				errorText: ctx.message?.text ?? ctx.callback?.data ?? 'Send message with no context',
				chatId: ctx.chatId,
				userId: ctx.message?.from.id ?? ctx.callback?.from.id,
			});
		}
	}

	async editMessage ({ ctx, message, keyboard, options }: EditMessageOptions) {
		const messageOptions: TelegramBot.EditMessageTextOptions = {
			chat_id: ctx.chatId,
			message_id: ctx.message?.message_id ?? ctx.callback?.message.message_id,
			parse_mode: 'HTML',
			disable_web_page_preview: true,
		};

		if (keyboard) {
			messageOptions.reply_markup = {
				...options?.reply_markup,
				inline_keyboard: stringifyCallbackData(keyboard),
			};
		}

		try {
			await this.bot.editMessageText(message, messageOptions);
		} catch (error) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-expect-error
			if (error.code === 'ETELEGRAM' && error.response?.body && error.response.body.description.includes('message is not modified')) {
				return;
			}

			logError({
				error,
				errorText: ctx.message?.text ?? ctx.callback?.data ?? 'Edit message with no context',
				chatId: ctx.chatId,
				userId: ctx.message?.from.id ?? ctx.callback?.from.id,
			});

			await this.sendMessageByChatId({ chatId: ctx.chatId, message, keyboard, options: { ...options, ...messageOptions } });
		}
	}

	async deleteMessage (ctx: CallbackContext) {
		try {
			await this.bot.deleteMessage(ctx.chatId, ctx.callback.message.message_id);
		} catch (error) {
			logError({ error, errorText: 'Delete message error', chatId: ctx.chatId });
		}
	}

	async answerCallbackQuery (ctx: CallbackContext) {
		try {
			await this.bot.answerCallbackQuery(ctx.callback.id);
		} catch (error) {
			logError({ error, errorText: 'Answer callback error', chatId: ctx.chatId });
		}
	}

	async sendPhoto (ctx: BotContext, photo: string, options?: TelegramBot.SendPhotoOptions, fileOptions?: TelegramBot.FileOptions) {
		try {
			await this.bot.sendPhoto(ctx.chatId, photo, options, fileOptions);
		} catch (error) {
			logError({ error, errorText: 'Send photo error', chatId: ctx.chatId });
		}
	}

	async sendDocument (ctx: BotContext, doc: string, options?: TelegramBot.SendDocumentOptions, fileOptions?: TelegramBot.FileOptions) {
		try {
			await this.bot.sendDocument(ctx.chatId, doc, options, fileOptions);
		} catch (error) {
			logError({ error, errorText: 'Send document error', chatId: ctx.chatId });
		}
	}
}

const BOT = new Bot(process.env.BOT_TOKEN ?? '');

export default BOT;
