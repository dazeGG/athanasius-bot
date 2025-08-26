import { BOT } from '~/core';
import { DB } from '~/entities/db';
import type { MessageContext } from '~/core';

import { GLOBAL_KEYBOARD, validateName } from '~/shared/lib';

import * as lib from './lib';

export const regStartMessageHandler = async (ctx: MessageContext) => {
	const user = DB.data.users.find(user => user.id === ctx.message.from.id);

	if (user) {
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

	await DB.update(({ users }) => {
		const { from: user } = ctx.message;

		users.push({ id: user.id, username: user.username, name });

		return {
			users,
		};
	});

	await BOT.sendMessage({
		ctx,
		text: lib.txt.successfulRegistration,
		options: { reply_markup: { keyboard: GLOBAL_KEYBOARD, resize_keyboard: true } },
	});
};
