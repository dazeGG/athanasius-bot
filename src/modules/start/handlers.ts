import { isRegistered } from '~/shared/lib';
import type { MessageCtx } from '~/core';

import * as lib from './lib';

export const startCommandHandler = async (ctx: MessageCtx) => {
	if (isRegistered(ctx)) {
		await ctx.reply(lib.txt.alreadyRegistered);
	} else {
		await ctx.reply(lib.txt.start);
	}
};
