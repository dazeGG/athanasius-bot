import { BOT, DB } from '~/core';
import type { MessageContext } from '~/core';

import * as lib from './lib';

export const settingsStartMessageHandler = async (ctx: MessageContext) => {
	await BOT.sendMessage(ctx, lib.txt.start);
};
