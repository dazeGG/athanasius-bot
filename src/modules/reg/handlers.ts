import { BOT, STATES } from '~/core';
import { DB, ORM } from '~/db';
import type { MessageContext } from '~/core';

import { GLOBAL_KEYBOARD, validateName } from '~/shared/lib';

import * as lib from './lib';

export const regStartMessageHandler = async (ctx: MessageContext) => {
	const u = DB.data.users.find(u => u.id === ctx.message.from.id);

	if (u) {
		await BOT.sendMessage({
			ctx,
			text: lib.txt.alreadyRegistered,
			options: { reply_markup: { keyboard: GLOBAL_KEYBOARD, resize_keyboard: true } },
		});
		return;
	}

	const { from: user } = ctx.message;
	STATES.setState(user.id, 'REGISTRATION');

	await BOT.sendMessage({ ctx, text: lib.txt.registerStart });
};

export const regNameStateMessageHandler = async (ctx: MessageContext) => {
	const name = ctx.message.text;
	const userId = ctx.message.from.id;
	const validationData = validateName(name, userId);

	if (!validationData.success) {
		await BOT.sendMessage({ ctx, text: '<b>Ошибка!</b>\n\n' + validationData.message });
		return;
	}

	const { from: user } = ctx.message;
	const existingUser = DB.data.users.find(u => u.id === user.id);

	if (existingUser) {
		existingUser.name = name;
		await DB.write();
	} else {
		await ORM.Users.add({
			id: user.id,
			username: user.username,
			name,
			settings: {
				updatesView: 'instant',
			},
			achievements: [],
		});
	}

	await BOT.sendMessage({
		ctx,
		text: lib.txt.successfulRegistration,
		options: { reply_markup: { keyboard: GLOBAL_KEYBOARD, resize_keyboard: true } },
	});

	STATES.clearState(ctx.message.from.id);
};
