import 'dotenv/config';

import TelegramBot from 'node-telegram-bot-api';

import { logError } from '~/lib';
import type { Handlers, Callbacks, Handler, Callback, MessageContext, Buttons, CallbackContext } from '~/types/base';

import { callbackHandler, messageHandler } from './lib';

const token = process.env.BOT_TOKEN ?? '';

type BotContext = MessageContext & { callback?: never } | CallbackContext & { message?: never };

class Bot {
	private readonly bot: TelegramBot;
	private readonly handlers: Handlers;
	private readonly callbacks: Callbacks;

	constructor () {
		this.bot = new TelegramBot(token, { polling: true });
		this.handlers = {};
		this.callbacks = {};
	}

	private async setMenuCommands (menuCommands: TelegramBot.BotCommand[]) {
		await this.bot.setMyCommands(menuCommands);
	}

	registerHandler (handler: string, cb: Handler) {
		this.handlers[handler] = cb;
	}

	registerCallback (callbackStart: string, cb: Callback) {
		this.callbacks[callbackStart] = cb;
	}

	async init (commands: TelegramBot.BotCommand[]) {
		await this.setMenuCommands(commands);

		this.bot.on('message', async message => await messageHandler({ handlers: this.handlers, message }));
		this.bot.on('callback_query', async callback => await callbackHandler({ callbacks: this.callbacks, callback }));
	}

	async sendMessageByChatId (chatId: TelegramBot.ChatId, message: string, keyboard?: Buttons) {
		const options: TelegramBot.SendMessageOptions = { parse_mode: 'HTML', disable_web_page_preview: true };

		if (keyboard) {
			options.reply_markup = {
				inline_keyboard: keyboard,
			};
		}

		try {
			await this.bot.sendMessage(chatId, message, options);
		} catch (error) {
			logError({ error, errorText: message, chatId });
		}
	}

	async sendMessage (ctx: BotContext, message: string, keyboard?: Buttons) {
		try {
			await this.sendMessageByChatId(ctx.chatId, message, keyboard);
		} catch (error) {
			logError({
				error,
				errorText: ctx.message?.text ?? ctx.callback?.data ?? 'Send message with no context',
				chatId: ctx.chatId,
				userId: ctx.message?.from.id ?? ctx.callback?.from.id,
			});
		}
	}

	async editMessage (ctx: BotContext, message: string, keyboard?: Buttons) {
		const options: TelegramBot.EditMessageTextOptions = {
			chat_id: ctx.chatId,
			message_id: ctx.message?.message_id ?? ctx.callback?.message.message_id,
			parse_mode: 'HTML',
			disable_web_page_preview: true,
		};

		if (keyboard) {
			options.reply_markup = {
				inline_keyboard: keyboard,
			};
		}

		try {
			await this.bot.editMessageText(message, options);
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

			await this.sendMessageByChatId(ctx.chatId, message, keyboard);
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

export default new Bot();
