import type TelegramBot from 'node-telegram-bot-api';

import type { MessageContext } from '~/core';
import { BOT } from '~/core';

export const GLOBAL_KEYBOARD: TelegramBot.ReplyKeyboardMarkup['keyboard'] = [[{ text: 'Настройки' }]];

const addGlobalKeyboardMessageHandler = async (ctx: MessageContext) => {
	await BOT.sendMessage({
		ctx,
		message: 'Добавил клавиатуру',
		options: { reply_markup: { keyboard: GLOBAL_KEYBOARD } },
	});
};

const removeGlobalKeyboardMessageHandler = async (ctx: MessageContext) => {
	await BOT.sendMessage({
		ctx,
		message: 'Убрал клавиатуру',
		options: { reply_markup: { remove_keyboard: true } },
	});
};

export const registerGlobalKeyboard = () => {
	BOT.registerCommand('/addglobalkeyboard', addGlobalKeyboardMessageHandler);
	BOT.registerCommand('/removeglobalkeyboard', removeGlobalKeyboardMessageHandler);
};
