import { CallbackUtils } from '.';
import type { RawButtons, StringifiedButtons } from '..';

export const composeCallbackData = (buttons: RawButtons): StringifiedButtons =>
	buttons.map(
		buttonRow =>
			buttonRow.map(
				button => button.callback_data ? { text: button.text, callback_data: CallbackUtils.composeCallbackData(button.callback_data) } : button,
			),
	);
