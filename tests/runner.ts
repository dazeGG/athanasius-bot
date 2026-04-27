import type { CapturedMsg } from './bootstrap';

export function assert (condition: boolean, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

type VisibleMsgType = Exclude<CapturedMsg['type'], 'delete'>;

interface MessageAssertOptions {
	type?: VisibleMsgType;
	exact?: boolean;
	latest?: boolean;
	count?: number;
}

type MessageMatchOptions = Omit<MessageAssertOptions, 'count'>;

const getVisibleMessages = (
	log: readonly CapturedMsg[],
	toId: number,
	type?: VisibleMsgType,
): CapturedMsg[] => {
	return log.filter(m => m.to === toId && m.type !== 'delete' && (type ? m.type === type : true));
};

const getComparableText = (message: CapturedMsg, exact: boolean): string => {
	return exact ? message.body : message.text;
};

const messageMatches = (
	message: CapturedMsg,
	contains: string,
	options: MessageMatchOptions,
): boolean => {
	const text = getComparableText(message, options.exact ?? false);
	return options.exact ? text === contains : text.includes(contains);
};

export function assertSent (
	log: readonly CapturedMsg[],
	toId: number,
	contains: string,
	options: MessageAssertOptions = {},
): void {
	const msgs = getVisibleMessages(log, toId, options.type);
	const targetMessages = options.latest ? msgs.slice(-1) : msgs;
	const matches = targetMessages.filter(m => messageMatches(m, contains, options));
	const hasMatch = matches.length > 0;

	if (!hasMatch || (options.count !== undefined && matches.length !== options.count)) {
		const got = msgs.length
			? msgs.map(m => `      "${m.text.slice(0, 80)}"`).join('\n')
			: '      (no messages)';
		const expectation = options.exact ? 'equal to' : 'containing';
		const countExpectation = options.count === undefined ? '' : ` exactly ${options.count} time(s)`;
		const latestExpectation = options.latest ? ' in the latest message' : '';
		throw new Error(`Expected message to ${toId} ${expectation} "${contains}"${latestExpectation}${countExpectation} but got:\n${got}`);
	}
}

export function assertNotSent (
	log: readonly CapturedMsg[],
	toId: number,
	contains: string,
	options: MessageMatchOptions = {},
): void {
	const msgs = getVisibleMessages(log, toId, options.type);
	const targetMessages = options.latest ? msgs.slice(-1) : msgs;
	if (targetMessages.some(m => messageMatches(m, contains, options))) {
		const expectation = options.exact ? 'equal to' : 'containing';
		const latestExpectation = options.latest ? ' in the latest message' : '';
		throw new Error(`Expected NO message to ${toId} ${expectation} "${contains}"${latestExpectation}, but one was sent`);
	}
}

export function assertKeyboardButton (
	log: readonly CapturedMsg[],
	toId: number,
	label: string,
	callbackData?: string,
): void {
	const message = getVisibleMessages(log, toId).at(-1);

	if (!message) {
		throw new Error(`Expected keyboard button "${label}" for ${toId}, but no visible messages were captured`);
	}

	const buttons = message.keyboard?.flat() ?? [];
	const matchedButton = buttons.find(button => button.text === label && (
		callbackData === undefined || button.callbackData === callbackData
	));

	if (!matchedButton) {
		const got = buttons.length > 0
			? buttons.map(button => `      ${button.text}${button.callbackData ? ` -> ${button.callbackData}` : ''}`).join('\n')
			: '      (no keyboard)';
		const expectedCallback = callbackData === undefined ? '' : ` with callback "${callbackData}"`;
		throw new Error(`Expected keyboard button "${label}"${expectedCallback} for ${toId}, but got:\n${got}`);
	}
}

export function assertDeleted (log: readonly CapturedMsg[], toId: number, messageId?: number): void {
	const deletions = log.filter(m => m.to === toId && m.type === 'delete');

	if (messageId === undefined) {
		if (deletions.length === 0) {
			throw new Error(`Expected a deleted message for ${toId}, but none was captured`);
		}
		return;
	}

	if (!deletions.some(m => m.messageId === messageId)) {
		const got = deletions.length
			? deletions.map(m => `      ${m.text}`).join('\n')
			: '      (no deletions)';
		throw new Error(`Expected message ${messageId} to be deleted for ${toId}, but got:\n${got}`);
	}
}
