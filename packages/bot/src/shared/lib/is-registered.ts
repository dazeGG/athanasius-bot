import { DB } from '~/db';
import type { AppContext } from '~/core';

export const isRegistered = (ctx: AppContext): boolean => !!DB.data.users.find(user => user.id === ctx.from?.id);
