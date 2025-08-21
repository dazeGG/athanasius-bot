import { nanoid } from 'nanoid';
import { LRUCache } from 'lru-cache';

import type { CallbackHandlerOptions } from './callback-handlers';

class CallbackStorage {
	private storage: LRUCache<string, CallbackHandlerOptions>;

	constructor (max: number = 10000, ttl: number = 7 * 24 * 60 * 60 * 1000) {
		this.storage = new LRUCache({ max, ttl });
	}

	public store (options: CallbackHandlerOptions): string {
		const serialized = JSON.stringify(options);
		const size = new TextEncoder().encode(serialized).length;

		if (size <= 50) {
			return serialized;
		} else {
			const id = nanoid();

			this.storage.set(id, options);
			return id;
		}
	}

	public resolve (callbackData: string): CallbackHandlerOptions | null {
		try {
			return JSON.parse(callbackData);
		} catch {
			return this.storage.get(callbackData) ?? null;
		}
	}
}

const CallbackStorageInstance = new CallbackStorage();

export {
	CallbackStorageInstance as CallbackStorage,
};
