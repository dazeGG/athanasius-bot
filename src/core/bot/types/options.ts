import type TelegramBot from 'node-telegram-bot-api';

import type { RawButtons, BotContext } from '.';

type SharedMessageTextOptions = {
	text: string;
	keyboard?: RawButtons;
	options?: TelegramBot.SendMessageOptions;
}

export type SendMessageByChatIdOptions = SharedMessageTextOptions & {
	chatId: TelegramBot.ChatId;
};

export type SendMessageOptions = SharedMessageTextOptions & {
	ctx: BotContext;
};

export type EditMessageOptions = Omit<SharedMessageTextOptions, 'options'> & {
	ctx: BotContext;
	options?: TelegramBot.EditMessageTextOptions;
};
