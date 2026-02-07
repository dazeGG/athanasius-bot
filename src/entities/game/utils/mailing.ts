import { BOT } from '~/core';
import type { MailingOptions, PlayerId } from '~/entities/game';

export class GameMailing {
	public static async mailing (options: MailingOptions, allPlayers: PlayerId[], exclude: PlayerId[] = []): Promise<void> {
		const playersToMailing = allPlayers.filter(p => !exclude.includes(p));

		await Promise.allSettled(
			playersToMailing.map(playerId => BOT.sendMessageByChatId({ ...options, chatId: playerId })),
		);
	}
}
