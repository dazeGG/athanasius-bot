import { nanoid } from 'nanoid';
import { LRUCache } from 'lru-cache';

import type { CallbackData } from '..';

interface CompressedCallbackData {
	m: CallbackData['module'];
	a?: CallbackData['action'];
	b?: 0 | 1;
	t?: string;
}

class CallbackStorage {
	private storage: LRUCache<string, CallbackData>;

	constructor (max: number = 10000, ttl: number = 7 * 24 * 60 * 60 * 1000) {
		this.storage = new LRUCache({ max, ttl });
	}

	private static compressCallbackData (callbackData: CallbackData): CompressedCallbackData {
		const compressed: CompressedCallbackData = {
			m: callbackData.module,
		};

		if (callbackData.action) {
			compressed.a = callbackData.action;
		}

		if (callbackData.back) {
			compressed.b = 1;
		}

		if (callbackData.meta) {
			compressed.t = JSON.stringify(callbackData.meta);
		}

		return compressed;
	}

	private static decompressCallbackData (compressedCallbackData: CompressedCallbackData): CallbackData {
		return {
			module: compressedCallbackData.m,
			action: compressedCallbackData.a,
			back: !!compressedCallbackData.b,
			meta: compressedCallbackData.t ? JSON.parse(compressedCallbackData.t) : undefined,
		};
	}

	public store (callbackData: CallbackData): string {
		const serialized = JSON.stringify(CallbackStorage.compressCallbackData(callbackData));
		const size = new TextEncoder().encode(serialized).length;

		if (size <= 50) {
			return serialized;
		} else {
			const id = nanoid();

			this.storage.set(id, callbackData);
			return id;
		}
	}

	public resolve (callbackData: string): CallbackData | null {
		try {
			return CallbackStorage.decompressCallbackData(JSON.parse(callbackData));
		} catch {
			return this.storage.get(callbackData) ?? null;
		}
	}
}

const CallbackStorageInstance = new CallbackStorage();

export {
	CallbackStorageInstance as CallbackStorage,
};
