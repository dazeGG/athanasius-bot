import 'dotenv/config';

import TelegramBot from 'node-telegram-bot-api';

import { logError } from '~/core';

import { storeCallbackData, MessageHandlers, CallbackHandlers, CallbackUtils } from './lib';
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
	HandlerGuard,
	MessageContextMessage,
	CallbackContextCallback,
} from '.';

class Bot {
	private readonly bot: TelegramBot;

	private readonly commands: Map<string, { handler: MessageHandler, guard?: HandlerGuard<MessageContextMessage> }>;
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

	registerCommand (command: string, handler: MessageHandler, guard?: HandlerGuard<MessageContextMessage>) {
		this.commands.set(command, { handler, guard });
	}

	registerMessageHandler (handler: MessageHandler, options: MessageHandlerOptions, guard?: HandlerGuard<MessageContextMessage>) {
		this.messageHandlers.register(handler, options, guard);
	}

	registerCallbackHandler (handler: CallbackHandler, options: CallbackHandlerOptions, guard?: HandlerGuard<CallbackContextCallback>) {
		this.callbackHandlers.register(handler, options, guard);
	}

	async init (commands: TelegramBot.BotCommand[]) {
		await this.setMenuCommands(commands);

		this.bot.on('message', async message => {
			const { text, from: user } = message;

			if (!text || !user) {
				return;
			}

			// * Command handler
			const commandHandlerData = this.commands.get(text);

			if (text.startsWith('/') && commandHandlerData) {
				const { handler, guard } = commandHandlerData;

				if (guard && !guard({ ...message, text, from: user })) {
					return;
				}

				await chatIdMiddleware({ message: { ...message, text, from: user }, next: handler });
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

			// * Callback handler

			const { data, message } = callbackQuery;

			const callbackData = CallbackUtils.parseCallbackData(data);

			if (!callbackData) {
				return;
			}

			const contextCallback = { ...callbackQuery, data: callbackData, message };

			const callbackHandler = this.callbackHandlers.getHandler(contextCallback);

			if (callbackHandler && callbackData) {
				await chatIdMiddleware({ callback: contextCallback, next: callbackHandler });
				return;
			}
		});
	}

	async sendMessageByChatId ({ chatId, text, keyboard, options }: SendMessageByChatIdOptions) {
		const messageOptions: TelegramBot.SendMessageOptions = { parse_mode: 'HTML', disable_web_page_preview: true };

		if (keyboard) {
			messageOptions.reply_markup = {
				...options?.reply_markup,
				inline_keyboard: storeCallbackData(keyboard),
			};
		}

		try {
			await this.bot.sendMessage(chatId, text, { ...messageOptions, ...options });
		} catch (error) {
			logError({ error, errorText: text, chatId });
		}
	}

	async sendMessage ({ ctx, text, keyboard, options }: SendMessageOptions) {
		try {
			await this.sendMessageByChatId({ chatId: ctx.chatId, text, keyboard, options });
		} catch (error) {
			logError({
				error,
				errorText: ctx.message?.text ?? JSON.stringify(ctx.callback?.data) ?? 'Send message with no context',
				chatId: ctx.chatId,
				userId: ctx.message?.from.id ?? ctx.callback?.from.id,
			});
		}
	}

	async editMessage ({ ctx, text, keyboard, options }: EditMessageOptions) {
		const messageOptions: TelegramBot.EditMessageTextOptions = {
			chat_id: ctx.chatId,
			message_id: ctx.message?.message_id ?? ctx.callback?.message.message_id,
			parse_mode: 'HTML',
			disable_web_page_preview: true,
		};

		if (keyboard) {
			messageOptions.reply_markup = {
				...options?.reply_markup,
				inline_keyboard: storeCallbackData(keyboard),
			};
		}

		try {
			await this.bot.editMessageText(text, messageOptions);
		} catch (error) {
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-expect-error
			if (error.code === 'ETELEGRAM' && error.response?.body && error.response.body.description.includes('message is not modified')) {
				return;
			}

			logError({
				error,
				errorText: ctx.message?.text ?? JSON.stringify(ctx.callback?.data) ?? 'Edit message with no context',
				chatId: ctx.chatId,
				userId: ctx.message?.from.id ?? ctx.callback?.from.id,
			});

			await this.sendMessageByChatId({ chatId: ctx.chatId, text, keyboard, options: { ...options, ...messageOptions } });
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
