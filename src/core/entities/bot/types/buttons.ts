import type { CallbackData } from '.';

/* RAW */

export type RawButton =
	| { text: string; callback_data: CallbackData; url?: never; }
	| { text: string; url: string; callback_data?: never; };

export type RawButtonRow = RawButton[]

export type RawButtons = RawButtonRow[];

/* STRINGIFIED */

export type StringifiedButton =
	| { text: string; callback_data: string; url?: never; }
	| { text: string; url: string; callback_data?: never; };

export type StringifiedButtonRow = StringifiedButton[]

export type StringifiedButtons = StringifiedButtonRow[];
