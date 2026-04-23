import { STATES } from '~/core';
import { DB, ORM } from '~/db';
import type { MessageCtx } from '~/core';

import { GLOBAL_KEYBOARD, validateName } from '~/shared/lib';

import * as lib from './lib';

export const regStartMessageHandler = async (ctx: MessageCtx) => {
	const u = DB.data.users.find(u => u.id === ctx.from!.id);

	if (u) {
		await ctx.reply(lib.txt.alreadyRegistered, {
			reply_markup: { keyboard: GLOBAL_KEYBOARD, resize_keyboard: true },
		});
		return;
	}

	STATES.setState(ctx.from!.id, 'REGISTRATION');

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
	}

	await ctx.reply(lib.txt.successfulRegistration, {
		reply_markup: { keyboard: GLOBAL_KEYBOARD, resize_keyboard: true },
	});

	STATES.clearState(userId);
};
