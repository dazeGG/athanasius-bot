import { Composer } from 'grammy';
import type { KeyboardButton } from 'grammy/types';

import type { AppContext, MessageCtx } from '~/core';

export const GLOBAL_KEYBOARD: KeyboardButton[][] = [
	[{ text: 'Настройки' }, { text: 'Комнаты' }],
	[{ text: 'Рука' }],
];

const addGlobalKeyboardMessageHandler = async (ctx: MessageCtx) => {
	await ctx.reply('Добавил клавиатуру', {
		reply_markup: { keyboard: GLOBAL_KEYBOARD, resize_keyboard: true },
	});
};

const removeGlobalKeyboardMessageHandler = async (ctx: MessageCtx) => {
	await ctx.reply('Убрал клавиатуру', {
		reply_markup: { remove_keyboard: true },
	});
};

const updateGlobalKeyboardMessageHandler = async (ctx: MessageCtx) => {
	await ctx.reply('Обновил клавиатуру', {
		reply_markup: { keyboard: GLOBAL_KEYBOARD, resize_keyboard: true },
	});
};

export const globalKeyboardComposer = new Composer<AppContext>();
globalKeyboardComposer.command('addglobalkeyboard', ctx => addGlobalKeyboardMessageHandler(ctx as unknown as MessageCtx));
globalKeyboardComposer.command('removeglobalkeyboard', ctx => removeGlobalKeyboardMessageHandler(ctx as unknown as MessageCtx));
globalKeyboardComposer.command('updateglobalkeyboard', ctx => updateGlobalKeyboardMessageHandler(ctx as unknown as MessageCtx));
