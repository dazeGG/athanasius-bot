import type { MailingOptions, PlayerId, Sender } from '~/entities/game';

export async function mailing (options: MailingOptions, allPlayers: PlayerId[], exclude: PlayerId[] = [], sender: Sender): Promise<void> {
	const playersToMailing = allPlayers.filter(p => !exclude.includes(p));

	await Promise.allSettled(
		playersToMailing.map(playerId => sender(playerId, options.text)),
	);
}
