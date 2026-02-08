import type TelegramBot from 'node-telegram-bot-api';

import { BOT } from '~/core';
import type { MessageContext } from '~/core';

export const GLOBAL_KEYBOARD: TelegramBot.ReplyKeyboardMarkup['keyboard'] = [
	[{ text: 'Настройки' }, { text: 'Комнаты' }],
	[{ text: 'Рука' }],
];

const addGlobalKeyboardMessageHandler = async (ctx: MessageContext) => {
	await BOT.sendMessage({
		ctx,
		text: 'Добавил клавиатуру',
		options: { reply_markup: { keyboard: GLOBAL_KEYBOARD, resize_keyboard: true } },
	});
};

const removeGlobalKeyboardMessageHandler = async (ctx: MessageContext) => {
	await BOT.sendMessage({
		ctx,
		text: 'Убрал клавиатуру',
		options: { reply_markup: { remove_keyboard: true } },
	});
};

const updateGlobalKeyboardMessageHandler = async (ctx: MessageContext) => {
	await BOT.sendMessage({
		ctx,
		text: 'Обновил клавиатуру',
		options: { reply_markup: { keyboard: GLOBAL_KEYBOARD, resize_keyboard: true } },
	});
};

export const registerGlobalKeyboard = () => {
	BOT.registerCommand('/addglobalkeyboard', addGlobalKeyboardMessageHandler);
	BOT.registerCommand('/removeglobalkeyboard', removeGlobalKeyboardMessageHandler);
	BOT.registerCommand('/updateglobalkeyboard', updateGlobalKeyboardMessageHandler);
};
