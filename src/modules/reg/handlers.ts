import { DB, ORM } from '~/db';
import { logGameEvent } from '~/core';
import type { AppContext, MessageCtx } from '~/core';

import { GLOBAL_KEYBOARD, validateName } from '~/shared/lib';

import * as lib from './lib';

export const regStartMessageHandler = async (ctx: AppContext) => {
	const u = DB.data.users.find(u => u.id === ctx.from!.id);

	if (u) {
		await ctx.reply(lib.txt.alreadyRegistered, {
			reply_markup: { keyboard: GLOBAL_KEYBOARD, resize_keyboard: true },
		});
		return;
	}

	ctx.session.flow = { name: 'REGISTRATION' };

	await ctx.reply(lib.txt.registerStart);
};

export const regNameStateMessageHandler = async (ctx: MessageCtx) => {
	const name = ctx.message.text;
	const userId = ctx.from!.id;
	const validationData = validateName(name, userId);

	if (!validationData.success) {
		await ctx.reply('<b>Ошибка!</b>\n\n' + validationData.message);
		return;
	}

	const existingUser = DB.data.users.find(u => u.id === userId);

	if (existingUser) {
		existingUser.name = name;
		await DB.write();
	} else {
		await ORM.Users.add({
			id: userId,
			username: ctx.from!.username,
			name,
			settings: {
				updatesView: 'instant',
			},
			achievements: [],
		});

		logGameEvent({
			type: 'USER_REGISTERED',
			playerId: userId,
			username: ctx.from!.username,
		});
	}

	await ctx.reply(lib.txt.successfulRegistration, {
		reply_markup: { keyboard: GLOBAL_KEYBOARD, resize_keyboard: true },
	});

	ctx.session.flow = {};
};
