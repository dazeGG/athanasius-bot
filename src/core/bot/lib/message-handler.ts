import { STATES } from '~/core';
import type { MessageHandlerOptions } from '~/types/base';

import { chatIdMiddleware } from '../middlewares';

export const messageHandler = async ({ handlers, message }: MessageHandlerOptions) => {
	if (!message.text || !message.from) {
		return;
	}

	const { text, from: user } = message;

	// * State
	const state = STATES.getState(user.id);

	if (state && handlers[state]) {
		await chatIdMiddleware({ message: { ...message, text, from: user }, next: handlers[state] });
		return;
	}

	// * Command
	if (text.startsWith('/') && handlers[text]) {
		await chatIdMiddleware({ message: { ...message, text, from: user }, next: handlers[text] });
		return;
	}
};
