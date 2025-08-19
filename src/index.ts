import type TelegramBot from 'node-telegram-bot-api';

import { BOT } from '~/core';

import registerModules from './modules/register-modules';

const commands: TelegramBot.BotCommand[] = [
	{ command: '/addglobalkeyboard', description: 'Добавить клавиатуру' },
	{ command: '/removeglobalkeyboard', description: 'Убрать клавиатуру' },
];

BOT.init(commands)
	.then(() => {
		console.log('Bot started!');
	})
	.catch((error) => {
		console.log('Failed to start bot.', error);
	});

registerModules();
