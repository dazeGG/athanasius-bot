import { BOT } from '~/core';
import type { MessageContext, CallbackContext } from '~/core';

import * as lib from './lib';

export const gameCommandHandler = async (ctx: MessageContext) => {
	await BOT.sendMessage({ ctx, message: lib.txt.start, keyboard: lib.kb.start });
};

export const gameStartCallbackHandler = async (ctx: CallbackContext) => {
	await BOT.sendMessage({ ctx, message: lib.txt.start, keyboard: lib.kb.start });
};
