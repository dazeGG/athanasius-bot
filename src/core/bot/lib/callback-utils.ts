import type { CallbackData } from '../types';

export class CallbackUtils {
	public static parseCallbackData (callbackData: string): CallbackData {
		const [module, action, back, meta] = callbackData.split('|');
		if (module === undefined || action === undefined || back === undefined || meta === undefined) {
			throw new Error('Parse callback data error');
		}
		if (!module.length) {
			throw new Error('Callback data module is empty');
		}
		return {
			module,
			action,
			back: !!back,
			meta,
		};
	}
}
export function stringifyCallbackData (callbackData: CallbackData): string {
	return `${callbackData.module}|${callbackData.action ?? ''}|${callbackData.back ? '1' : ''}|${callbackData.meta ?? ''}`;
}
