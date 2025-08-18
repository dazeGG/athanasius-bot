export type Button =
	| { text: string; callback_data: string; url?: never; }
	| { text: string; url: string; callback_data?: never; };

export type ButtonRow = Button[]

export type Buttons = ButtonRow[];
