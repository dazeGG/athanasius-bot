import { InlineKeyboard } from 'grammy';

import type { UserSchema } from '~/db';
import { DB, ORM } from '~/db';
import type { ConfirmModeSettings } from '~/db';
import { escapeHtml, validateName } from '~/shared/lib';
import { stringifyCallbackData } from '~/core/lib';
import type { CallbackCtx, AppContext, MessageCtx } from '~/core';

import * as lib from './lib';

const on = '✅';
const off = '☐';

const getBaseSettingsText = (me: UserSchema) => {
	const cm = me.settings.confirmMode;
	const confirmSummary = cm
		? [
			cm.card ? lib.txt.confirmStages.card : null,
			cm.count ? lib.txt.confirmStages.count : null,
			cm.colors ? lib.txt.confirmStages.colors : null,
			cm.suits ? lib.txt.confirmStages.suits : null,
		].filter(Boolean).join(', ') || 'выкл'
		: 'выкл';

	return '<b>' + lib.txt.yourSettings + ':</b>\n' +
		'\n' +
		'• ' + lib.txt.name + ': ' + escapeHtml(me.name) + '\n' +
		'• ' + lib.txt.updatesView + ': ' + me.settings.updatesView + '\n' +
		'• ' + lib.txt.confirmMode + ': ' + confirmSummary + '\n' +
		'\n' +
		lib.txt.chooseWhatToChange;
};

const getBaseSettingsKeyboard = () => {
	return new InlineKeyboard()
		.text('Имя', stringifyCallbackData({ module: 'settings', action: 'name' }))
		.row()
		.text('Вид обновлений', stringifyCallbackData({ module: 'settings', action: 'updatesView' }))
		.row()
		.text('Режим подтверждения', stringifyCallbackData({ module: 'settings', action: 'confirmMode' }))
		.row()
		.text('Выход', stringifyCallbackData({ module: 'settings', action: 'exit' }));
};

const getConfirmModeKeyboard = (cm: ConfirmModeSettings | undefined) => {
	const s = cm ?? { card: false, count: false, colors: false, suits: false };
	return new InlineKeyboard()
		.text(`${s.card ? on : off} ${lib.txt.confirmStages.card}`, stringifyCallbackData({ module: 'settings', action: 'cm:card' }))
		.row()
		.text(`${s.count ? on : off} ${lib.txt.confirmStages.count}`, stringifyCallbackData({ module: 'settings', action: 'cm:count' }))
		.row()
		.text(`${s.colors ? on : off} ${lib.txt.confirmStages.colors}`, stringifyCallbackData({ module: 'settings', action: 'cm:colors' }))
		.row()
		.text(`${s.suits ? on : off} ${lib.txt.confirmStages.suits}`, stringifyCallbackData({ module: 'settings', action: 'cm:suits' }))
		.row()
		.text('Назад', stringifyCallbackData({ module: 'settings', action: 'cm:back' }));
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

	const rawData = ctx.callbackQuery.data;
	const action = rawData.slice(rawData.indexOf(':') + 1, rawData.lastIndexOf(':'));

	if (action !== 'exit' && ORM.Games.isInActiveGame(ctx.from.id)) {
		await ctx.editMessageText('Нельзя менять настройки во время игры :(');
		return;
	}

	const me = ORM.Users.get(ctx.from.id);

	switch (action) {
	case 'name':
		await ctx.editMessageText(lib.txt.changeName);
		ctx.session.flow = { name: 'SETTINGS_CHANGE_NAME' };
		break;
	case 'updatesView':
		await ORM.Users.update(
			ctx.from.id,
			{ ...me.settings, updatesView: me.settings.updatesView === 'instant' ? 'composed' : 'instant' },
		);
		await ctx.editMessageText(getBaseSettingsText(ORM.Users.get(ctx.from.id)), { reply_markup: getBaseSettingsKeyboard() });
		break;
	case 'confirmMode':
		await ctx.editMessageText(lib.txt.confirmModeMenu, {
			reply_markup: getConfirmModeKeyboard(me.settings.confirmMode),
			parse_mode: 'HTML',
		});
		break;
	case 'cm:card':
	case 'cm:count':
	case 'cm:colors':
	case 'cm:suits': {
		const stage = action.split(':')[1] as keyof ConfirmModeSettings;
		const current = me.settings.confirmMode ?? { card: false, count: false, colors: false, suits: false };
		const updated = { ...current, [stage]: !current[stage] };
		await ORM.Users.update(ctx.from.id, { ...me.settings, confirmMode: updated });
		await ctx.editMessageText(lib.txt.confirmModeMenu, {
			reply_markup: getConfirmModeKeyboard(updated),
			parse_mode: 'HTML',
		});
		break;
	}
	case 'cm:back': {
		const fresh = ORM.Users.get(ctx.from.id);
		await ctx.editMessageText(getBaseSettingsText(fresh), { reply_markup: getBaseSettingsKeyboard() });
		break;
	}
	case 'exit':
		await ctx.deleteMessage();
		break;
	}
};

export const settingsChangeNameStateMessageHandler = async (ctx: MessageCtx) => {
	if (ORM.Games.isInActiveGame(ctx.from!.id)) {
		await ctx.reply('Нельзя менять настройки во время игры :(');
		return;
	}

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
