import { BOT, STATES } from '~/core';
import { DB } from '~/db';
import { validateName } from '~/shared/lib';
import type { MessageContext, CallbackContext } from '~/core';

import * as lib from './lib';

const sendBaseSettingsMessage = async (ctx: MessageContext) => {
	const user = DB.data.users.find(user => user.id === ctx.message.from.id);

	const settingsStartMessage = '<b>' + lib.txt.yourSettings + ':</b>\n' +
		'\n' +
		'• ' + lib.txt.name + ': ' + user?.name + '\n' +
		'\n' +
		lib.txt.chooseWhatToChange;

	await BOT.sendMessage({ ctx, text: settingsStartMessage, keyboard: lib.kb.baseSettings });
};

export const settingsStartMessageHandler = async (ctx: MessageContext) => {
	await sendBaseSettingsMessage(ctx);
};

export const settingsChangeNameCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);
	await BOT.editMessage({ ctx, text: lib.txt.changeName });

	STATES.setState(ctx.callback.from.id, 'SETTINGS_CHANGE_NAME');
};

export const settingsChangeNameStateMessageHandler = async (ctx: MessageContext) => {
	const newName = ctx.message.text;

	const validationData = validateName(newName);

	if (!validationData.success) {
		await BOT.sendMessage({ ctx, text: '<b>Ошибка!</b>\n\n' + validationData.message });
	} else {
		await DB.update(({ users }) => {
			const user = DB.data.users.find(user => user.id === ctx.message.from.id);

			if (user) {
				user.name = newName;
			}

			return { users };
		});

		await BOT.sendMessage({ ctx, text: lib.txt.success });
		await sendBaseSettingsMessage(ctx);

		STATES.clearState(ctx.message.from.id);
	}
};
