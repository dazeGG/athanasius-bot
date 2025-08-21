import { CallbackStorage } from '.';
import type { RawButtons, StringifiedButtons } from '..';

export const storeCallbackData = (buttons: RawButtons): StringifiedButtons =>
	buttons.map(
		buttonRow =>
			buttonRow.map(
				button => button.callback_data ? { text: button.text, callback_data: CallbackStorage.store(button.callback_data) } : button,
			),
	);
