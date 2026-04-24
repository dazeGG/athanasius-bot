import { Composer } from 'grammy';
import type { KeyboardButton } from 'grammy/types';

import type { AppContext } from '~/core';

export const GLOBAL_KEYBOARD: KeyboardButton[][] = [
	[{ text: 'Настройки' }, { text: 'Комнаты' }],
	[{ text: 'Заметки' }, { text: 'Рука' }],
];

const addGlobalKeyboardMessageHandler = async (ctx: AppContext) => {
	await ctx.reply('Добавил клавиатуру', {
		reply_markup: { keyboard: GLOBAL_KEYBOARD, resize_keyboard: true },
	});
};

const removeGlobalKeyboardMessageHandler = async (ctx: AppContext) => {
	await ctx.reply('Убрал клавиатуру', {
		reply_markup: { remove_keyboard: true },
	});
};

const updateGlobalKeyboardMessageHandler = async (ctx: AppContext) => {
	await ctx.reply('Обновил клавиатуру', {
		reply_markup: { keyboard: GLOBAL_KEYBOARD, resize_keyboard: true },
	});
};

export const globalKeyboardComposer = new Composer<AppContext>();
globalKeyboardComposer.command('addglobalkeyboard', addGlobalKeyboardMessageHandler);
globalKeyboardComposer.command('removeglobalkeyboard', removeGlobalKeyboardMessageHandler);
globalKeyboardComposer.command('updateglobalkeyboard', updateGlobalKeyboardMessageHandler);
