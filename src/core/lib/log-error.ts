import { LOGGER } from '~/core';

type LogErrorOptions = {
	error: unknown;
	errorText: string;
	chatId: number | string;
	userId?: number;
};

export const logError = ({ error, errorText, chatId, userId }: LogErrorOptions): void => {
	LOGGER.error(errorText, {
		chatId,
		from: userId ?? 'me',
		error: error instanceof Error ? error.message : String(error),
		stack: error instanceof Error ? error.stack : undefined,
	});
};
