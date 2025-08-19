import { BOT, DB } from '~/core';
import type { MessageContext } from '~/core';

import * as lib from './lib';

export const regStartMessageHandler = async (ctx: MessageContext) => {
	const user = DB.data.users.find(user => user.id === ctx.message.from.id);

	if (user) {
		await BOT.sendMessage(ctx, lib.txt.alreadyRegistered);
		return;
	}

	const name = ctx.message.text.slice(5, ctx.message.text.length);

	const validationData = lib.mtd.validateName(name);

	if (!validationData.success) {
		await BOT.sendMessage(ctx, validationData.message);
		return;
	}

	const userWithName = DB.data.users.find(user => user.name === name);

	if (userWithName) {
		await BOT.sendMessage(ctx, lib.txt.nameAlreadyTaken);
		return;
	}

	await DB.update(({ users }) => {
		const { from: user } = ctx.message;

		users.push({ id: user.id, username: user.username, name });

		return {
			users,
		};
	});

	await BOT.sendMessage(ctx, lib.txt.successfulRegistration);
};
