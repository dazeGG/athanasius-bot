import { BOT } from '~/core';
import { isRegistered } from '~/shared/lib';
import type { MessageContext } from '~/core';

import * as lib from './lib';

export const startCommandHandler = async (ctx: MessageContext) => {
	if (isRegistered(ctx.message)) {
		await BOT.sendMessage({ ctx, text: lib.txt.alreadyRegistered });
	} else {
		await BOT.sendMessage({ ctx, text: lib.txt.start });
	}
};
