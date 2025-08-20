import { DB } from '~/core';
import type { HandlerGuardContextEntity } from '~/core';

export const isRegistered = (ctx: HandlerGuardContextEntity): boolean => !!DB.data.users.find(user => user.id === ctx.from.id);
