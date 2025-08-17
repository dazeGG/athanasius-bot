import 'dotenv/config';
import type TelegramBot from 'node-telegram-bot-api';

import { BOT } from '~/core';

import registerModules from './modules/register-modules';

const commands: TelegramBot.BotCommand[] = [
];

BOT.init(commands)
	.then(() => {
		console.log('Bot started!');
	})
	.catch((error) => {
		console.log('Failed to start bot.', error);
	});

registerModules();
