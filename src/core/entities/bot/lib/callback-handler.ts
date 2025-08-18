import type { CallbackHandlerOptions } from '~/core';

import { chatIdMiddleware } from '../middlewares';

export const callbackHandler = async ({ callbacks, callback }: CallbackHandlerOptions) => {
	if (!callback.data || !callback.message) {
		return;
	}

	const { data, message } = callback;

	for (const cb of Object.keys(callbacks)) {
		if (data.startsWith(cb)) {
			await chatIdMiddleware({ callback: { ...callback, data, message }, next: callbacks[cb] });
			break;
		}
	}
};
