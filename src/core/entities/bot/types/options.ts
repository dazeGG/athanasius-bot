import type TelegramBot from 'node-telegram-bot-api';

import type { RawButtons, BotContext } from '.';

type SharedMessageOptions = {
	message: string;
	keyboard?: RawButtons;
	options?: TelegramBot.SendMessageOptions;
}

export type SendMessageByChatIdOptions = SharedMessageOptions & {
	chatId: TelegramBot.ChatId;
};

export type SendMessageOptions = SharedMessageOptions & {
	ctx: BotContext;
};

export type EditMessageOptions = Omit<SharedMessageOptions, 'options'> & {
	ctx: BotContext;
	options?: TelegramBot.EditMessageTextOptions;
};
