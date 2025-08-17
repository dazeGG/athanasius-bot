import type TelegramBot from 'node-telegram-bot-api';

type BaseContext = {
  chatId: TelegramBot.ChatId;
};

export type MessageContextMessage = Omit<(TelegramBot.Message), 'text' | 'from'> & {
  text: string;
  from: TelegramBot.User;
};

export type MessageContext = BaseContext & {
  message: MessageContextMessage;
};

export type CallbackContextCallback = Omit<(TelegramBot.CallbackQuery), 'message' | 'data'> & {
  message: TelegramBot.Message;
  data: string;
};

export type CallbackContext = BaseContext & {
  callback: CallbackContextCallback;
};

export type Handler = (ctx: MessageContext) => Promise<void>;
export type Callback = (ctx: CallbackContext) => Promise<void>;

export type Handlers = Record<string, Handler>;
export type Callbacks = Record<string, Callback>;

export type MessageHandlerOptions = {
  handlers: Handlers;
  message: TelegramBot.Message;
};

export type CallbackHandlerOptions = {
  callbacks: Callbacks;
  callback: TelegramBot.CallbackQuery;
};

export type Button =
  | { text: string; callback_data: string; url?: never; }
  | { text: string; url: string; callback_data?: never; };

export type ButtonRow = Button[]

export type Buttons = ButtonRow[];
