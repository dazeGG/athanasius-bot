import { BOT, STATES } from '~/core';
import type { UserSchema } from '~/db';
import { DB, ORM } from '~/db';
import { validateName } from '~/shared/lib';
import type { MessageContext, CallbackContext } from '~/core';

import * as lib from './lib';

const getBaseSettingsMessage = (me: UserSchema) => {
	const settingsStartMessage = '<b>' + lib.txt.yourSettings + ':</b>\n' +
		'\n' +
		'• ' + lib.txt.name + ': ' + me.name + '\n' +
		'• ' + lib.txt.updatesView + ': ' + me.settings.updatesView + '\n' +
		'\n' +
		lib.txt.chooseWhatToChange;

	return { text: settingsStartMessage, keyboard: lib.kb.baseSettings };
};

export const settingsStartMessageHandler = async (ctx: MessageContext) => {
	const me = ORM.Users.get(ctx.message.from.id);
	await BOT.sendMessage({ ctx, ...getBaseSettingsMessage(me) });
};

export const settingsCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.answerCallbackQuery(ctx);

	const me = ORM.Users.get(ctx.callback.from.id);

	switch (ctx.callback.data.action) {
	case 'name':
		await BOT.editMessage({ ctx, text: lib.txt.changeName });
		STATES.setState(ctx.callback.from.id, 'SETTINGS_CHANGE_NAME');
		break;
	case 'updatesView':
		await ORM.Users.update(
			ctx.callback.from.id,
			{ updatesView: me.settings.updatesView === 'instant' ? 'composed' : 'instant' },
		);
		await BOT.editMessage({ ctx, ...getBaseSettingsMessage(me) });
		break;
	}
};

export const settingsChangeNameStateMessageHandler = async (ctx: MessageContext) => {
	const me = ORM.Users.get(ctx.message.from.id);
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
		await BOT.sendMessage({ ctx, ...getBaseSettingsMessage(me) });

		STATES.clearState(ctx.message.from.id);
	}
};
