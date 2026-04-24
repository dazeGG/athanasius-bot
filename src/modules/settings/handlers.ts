import { InlineKeyboard } from 'grammy';

import type { UserSchema } from '~/db';
import { DB, ORM } from '~/db';
import { escapeHtml, validateName } from '~/shared/lib';
import { stringifyCallbackData } from '~/core/lib';
import type { CallbackCtx, AppContext, MessageCtx } from '~/core';

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

export const settingsStartMessageHandler = async (ctx: AppContext) => {
	await ctx.deleteMessage();

	if (ORM.Games.isInActiveGame(ctx.from!.id)) {
		await ctx.reply('Нельзя менять настройки во время игры :(');
		return;
	}

	const me = ORM.Users.get(ctx.from!.id);
	await ctx.reply(getBaseSettingsText(me), { reply_markup: getBaseSettingsKeyboard() });
};

export const settingsCallbackHandler = async (ctx: CallbackCtx) => {
	await ctx.answerCallbackQuery();

	const me = ORM.Users.get(ctx.from.id);

	switch (ctx.callbackQuery.data.split(':')[1]) {
	case 'name':
		await ctx.editMessageText(lib.txt.changeName);
		ctx.session.flow = { name: 'SETTINGS_CHANGE_NAME' };
		break;
	case 'updatesView':
		if (ORM.Games.isInActiveGame(ctx.from.id)) {
			await ctx.editMessageText('Нельзя менять настройки во время игры :(');
			return;
		}
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

	ctx.session.flow = {};
};
