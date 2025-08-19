import { BOT } from '~/core';
import type { MessageContext } from '~/core';

import * as lib from './lib';

export const startCommandHandler = async (ctx: MessageContext) => {
	await BOT.sendMessage(ctx, lib.txt.start);
};
