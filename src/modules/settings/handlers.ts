import { InlineKeyboard } from 'grammy';

import { STATES } from '~/core';
import type { UserSchema } from '~/db';
import { DB, ORM } from '~/db';
import { escapeHtml, validateName } from '~/shared/lib';
import { stringifyCallbackData } from '~/core/lib';
import type { CallbackCtx, MessageCtx } from '~/core';

import * as lib from './lib';

const getBaseSettingsText = (me: UserSchema) => {
	return '<b>' + lib.txt.yourSettings + ':</b>\n' +
		'\n' +
		'• ' + lib.txt.name + ': ' + escapeHtml(me.name) + '\n' +
		'• ' + lib.txt.updatesView + ': ' + me.settings.updatesView + '\n' +
		'\n' +
		lib.txt.chooseWhatToChange;
};

const getBaseSettingsKeyboard = () => {
	return new InlineKeyboard()
		.text('Имя', stringifyCallbackData({ module: 'settings', action: 'name' }))
		.row()
		.text('Вид обновлений', stringifyCallbackData({ module: 'settings', action: 'updatesView' }))
		.row()
		.text('Выход', stringifyCallbackData({ module: 'settings', action: 'exit' }));
};

export const settingsStartMessageHandler = async (ctx: MessageCtx) => {
	await ctx.deleteMessage();

	if (ORM.Games.getActiveWithMe(ctx.from!.id).length) {
		await ctx.reply('Нельзя менять настройки во время игры :(');
		return;
	}

	const me = ORM.Users.get(ctx.from!.id);
	await ctx.reply(getBaseSettingsText(me), { reply_markup: getBaseSettingsKeyboard() });
};

export const settingsCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();

	const me = ORM.Users.get(ctx.from.id);

	switch (ctx.callbackData!.action) {
	case 'name':
		await ctx.editMessageText(lib.txt.changeName);
		STATES.setState(ctx.from.id, 'SETTINGS_CHANGE_NAME');
		break;
	case 'updatesView':
		await ORM.Users.update(
			ctx.from.id,
			{ updatesView: me.settings.updatesView === 'instant' ? 'composed' : 'instant' },
		);
		await ctx.editMessageText(getBaseSettingsText(me), { reply_markup: getBaseSettingsKeyboard() });
		break;
	case 'exit':
		await ctx.deleteMessage();
		break;
	}
};

export const settingsChangeNameStateMessageHandler = async (ctx: MessageCtx) => {
	const me = ORM.Users.get(ctx.from!.id);
	const newName = ctx.message.text;

	const validationData = validateName(newName, me.id);

	if (!validationData.success) {
		await ctx.reply('<b>Ошибка!</b>\n\n' + validationData.message);
		return;
	}

	await DB.update(({ users }) => {
		const user = DB.data.users.find(user => user.id === ctx.from!.id);

		if (user) {
			user.name = newName;
		}

		return { users };
	});

	await ctx.reply(lib.txt.success);
	await ctx.reply(getBaseSettingsText(me), { reply_markup: getBaseSettingsKeyboard() });

	STATES.clearState(ctx.from!.id);
};
