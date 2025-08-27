import { DB } from '~/db';
import type { CallbackContextCallback, MessageContextMessage } from '~/core';

export const isRegistered = (ctx: MessageContextMessage | CallbackContextCallback): boolean => !!DB.data.users.find(user => user.id === ctx.from.id);
