// Format: "module:action:meta" or "module:back:meta"
export function stringifyCallbackData (opts: {
	module: string;
	action?: string;
	back?: boolean;
	meta?: string;
}): string {
	const action = opts.back ? 'back' : (opts.action ?? '');
	const meta = opts.meta ?? '';
	return `${opts.module}:${action}:${meta}`;
}

export function getCallbackMeta (data: string): string | undefined {
	const idx = data.indexOf(':', data.indexOf(':') + 1);
	const meta = idx !== -1 ? data.slice(idx + 1) : '';
	return meta || undefined;
}
