import { BOT } from '~/core';
import type { MessageContext } from '~/core';

export const start = async (ctx: MessageContext) => {
	await BOT.sendMessage(ctx, 'Я бот для игры в Афанасия, я пока в разработке)');
};
