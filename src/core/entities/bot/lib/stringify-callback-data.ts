import type { RawButtons, StringifiedButtons } from '..';

export const stringifyCallbackData = (buttons: RawButtons): StringifiedButtons =>
	buttons.map(
		buttonRow =>
			buttonRow.map(
				button => button.callback_data ? { text: button.text, callback_data: JSON.stringify(button.callback_data) } : button,
			),
	);
