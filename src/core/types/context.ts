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
