import { BOT } from '~/core';
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

	const name = ctx.message.text.slice(5, ctx.message.text.length);

	const validationData = validateName(name);

	if (!validationData.success) {
		await BOT.sendMessage({ ctx, text: validationData.message });
		return;
	}

	const { from: user } = ctx.message;

	await ORM.Users.add({
		id: user.id,
		username: user.username,
		name,
		settings: {
			updatesView: 'instant',
		},
	});

	await BOT.sendMessage({
		ctx,
		text: lib.txt.successfulRegistration,
		options: { reply_markup: { keyboard: GLOBAL_KEYBOARD, resize_keyboard: true } },
	});
};
