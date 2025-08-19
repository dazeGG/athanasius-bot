import type { CallbackHandlerOptions } from '~/core/entities/callback-handlers';

/* RAW */

export type RawButton =
	| { text: string; callback_data: CallbackHandlerOptions; url?: never; }
	| { text: string; url: string; callback_data?: never; };

export type RawButtonRow = RawButton[]

export type RawButtons = RawButtonRow[];

/* STRINGIFIED */

export type StringifiedButton =
	| { text: string; callback_data: string; url?: never; }
	| { text: string; url: string; callback_data?: never; };

export type StringifiedButtonRow = StringifiedButton[]

export type StringifiedButtons = StringifiedButtonRow[];
