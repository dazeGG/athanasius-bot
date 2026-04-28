import { DeckConfig } from '@athanasius/shared';
import { escapeHtml } from '~/shared/lib';
import { playersList } from '~/shared/ui';
import type { CardName } from '@athanasius/shared';
import type { RoomSchema, UserSchema } from '~/db';
import type { CardStageMeta, ColorsStageMeta, CountStageMeta, SuitsStageMeta } from '~/entities/game';

import { txt } from '.';
import { formatSuits, formatColors } from './game-message';

export class InfoMessage {
	/* HELPERS */
	private static mailingLine (prefix: string, me: UserSchema, targetName: string, cardName: CardName, trailing?: string): string {
		const base = `${prefix} <b>${escapeHtml(me.name)} → ${escapeHtml(targetName)}</b> | ${DeckConfig.CARDS_VIEW_MAP[cardName]}`;
		return trailing ? `${base} | ${trailing}` : base;
	}


	/* GAME LIFECYCLE */
	public static gameStartedMailing (room: RoomSchema): string {
		return `Комната ${escapeHtml(room.name)} | ${txt.gameStarted}\n` +
			'\n' +
			txt.players + ':\n' +
			playersList(room.players) + '\n' +
			'\n' +
			txt.gameSettings + ':\n' +
			'• ' + txt.decksCount + ': ' + room.settings.decksCount + '\n' +
			'• Тип колоды: ' + DeckConfig.getDeckTypeLabel(room.settings.deckType);
	}

	private static formatPlayerResult (name: string, count: number): string {
		return `${escapeHtml(name)} - ${count} ${this.athanasiusRightText(count)}`;
	}

	private static athanasiusRightText (count: number): string {
		const lastDigit = Math.abs(count) % 10;
		const lastTwoDigits = Math.abs(count) % 100;

		if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
			return 'Афанасиев';
		}

		if (lastDigit === 1) {
			return 'Афанасий';
		}

		if (lastDigit >= 2 && lastDigit <= 4) {
			return 'Афанасия';
		}

		return 'Афанасиев';
	}

	public static gameEndedMailing (athMap: [string, number][]): string {
		let text = `🏁 <b>${txt.gameEnded}</b>\n\n`;

		// Группируем по уникальным значениям Афанасиев (убывание)
		const tiers: [string, number][][] = [];
		for (const player of athMap) {
			const last = tiers[tiers.length - 1];
			if (last && last[0][1] === player[1]) {
				last.push(player);
			} else {
				tiers.push([player]);
			}
		}

		const medals = [
			{ emoji: '🥇', tier: tiers[0] },
			{ emoji: '🥈', tier: tiers[1] },
			{ emoji: '🥉', tier: tiers[2] },
		];

		let medalCount = 0;
		const medalTiers: number[] = [];

		for (let i = 0; i < medals.length; i++) {
			if (!medals[i].tier) break;
			if (medalCount >= 3) break;
			medalTiers.push(i);
			medalCount += medals[i].tier.length;
		}

		const medalistTierIndices = new Set(medalTiers);
		const loserTierIndex = tiers.length - 1;
		const loserTierIsNotMedal = !medalistTierIndices.has(loserTierIndex);

		text += 'Вот они, победители, слева направо:\n';
		for (const i of medalTiers) {
			const { emoji, tier } = medals[i];
			for (const player of tier) {
				text += `${emoji} ${this.formatPlayerResult(player[0], player[1])}\n`;
			}
		}

		const plainPlayers = tiers
			.filter((_, i) => !medalistTierIndices.has(i) && !(loserTierIsNotMedal && i === loserTierIndex))
			.flat();

		if (plainPlayers.length > 0) {
			text += '\n<b>Простые ребята:</b>\n';
			plainPlayers.forEach((player, i) => {
				text += `${i + medalCount + 1}. ${this.formatPlayerResult(player[0], player[1])}\n`;
			});
		}

		if (loserTierIsNotMedal) {
			const losers = tiers[loserTierIndex];
			text += '\n<b>Главный неудачник:</b>\n';
			for (const player of losers) {
				text += `🦧 ${this.formatPlayerResult(player[0], player[1])}\n`;
			}
		}

		return text.trimEnd();
	}

	public static dealAthanasiusMe (cardNames: string[]): string {
		const cards = cardNames.map(n => DeckConfig.CARDS_VIEW_MAP[n as keyof typeof DeckConfig.CARDS_VIEW_MAP]).join(' и ');
		return `🎴 Стоп.\n\nПри раздаче тебе выпал Афанасий ${cards}.\nТакое случается раз в тысячу игр.`;
	}

	public static dealAthanasiusMailing (player: UserSchema, cardNames: string[]): string {
		const cards = cardNames.map(n => DeckConfig.CARDS_VIEW_MAP[n as keyof typeof DeckConfig.CARDS_VIEW_MAP]).join(' и ');
		return `🎴 Стоп.\n\nПри раздаче у ${escapeHtml(player.name)} выпал Афанасий ${cards}.\nЗапомните этот момент.`;
	}

	/* MAILING — single-line log format */
	public static wrongCardMailing (turnMeta: CardStageMeta, me: UserSchema): string {
		return this.mailingLine('🟥', me, turnMeta.player.name, turnMeta.cardName);
	}

	public static wrongCountMailing (turnMeta: CountStageMeta, me: UserSchema): string {
		return this.mailingLine('🟥', me, turnMeta.player.name, turnMeta.cardName, `${turnMeta.count}`);
	}

	public static wrongColorsMailing (turnMeta: ColorsStageMeta, me: UserSchema): string {
		return this.mailingLine('🟥', me, turnMeta.player.name, turnMeta.cardName, formatColors(turnMeta.redCount, turnMeta.blackCount));
	}

	public static wrongSuitsMailing (turnMeta: SuitsStageMeta, me: UserSchema): string {
		return this.mailingLine('🟥', me, turnMeta.player.name, turnMeta.cardName, formatSuits(turnMeta.suits));
	}

	public static stealCardsMailing (turnMeta: SuitsStageMeta, me: UserSchema): string {
		return this.mailingLine('🟩', me, turnMeta.player.name, turnMeta.cardName, formatSuits(turnMeta.suits));
	}

	public static stealWithAthanasiusMailing (turnMeta: SuitsStageMeta, me: UserSchema): string {
		return this.mailingLine('⭐', me, turnMeta.player.name, turnMeta.cardName, formatSuits(turnMeta.suits)) + ' — Афанасий!';
	}

	public static stealVictimMessage (turnMeta: SuitsStageMeta, me: UserSchema): string {
		const base = `🟧 <b>${escapeHtml(me.name)} → ${escapeHtml(turnMeta.player.name)}</b> | ${DeckConfig.CARDS_VIEW_MAP[turnMeta.cardName]}`;
		const suits = formatSuits(turnMeta.suits);
		return suits ? `${base} | ${suits}` : base;
	}

	public static jokerStealMailing (turnMeta: ColorsStageMeta, me: UserSchema): string {
		return this.mailingLine('🟩', me, turnMeta.player.name, turnMeta.cardName, formatColors(turnMeta.redCount, turnMeta.blackCount));
	}

	public static jokerStealWithAthanasiusMailing (turnMeta: ColorsStageMeta, me: UserSchema): string {
		return this.mailingLine('⭐', me, turnMeta.player.name, turnMeta.cardName, formatColors(turnMeta.redCount, turnMeta.blackCount)) + ' — Афанасий!';
	}

	public static jokerStealVictimMessage (turnMeta: ColorsStageMeta, me: UserSchema): string {
		const base = `🟧 <b>${escapeHtml(me.name)} → ${escapeHtml(turnMeta.player.name)}</b> | ${DeckConfig.CARDS_VIEW_MAP[turnMeta.cardName]}`;
		const colors = formatColors(turnMeta.redCount, turnMeta.blackCount);
		return colors ? `${base} | ${colors}` : base;
	}

	/* ME — log format */
	public static wrongCardMe (turnMeta: CardStageMeta, me: UserSchema): string {
		return this.mailingLine('🟥', me, turnMeta.player.name, turnMeta.cardName);
	}

	public static wrongCountMe (turnMeta: CountStageMeta, me: UserSchema): string {
		return this.mailingLine('🟥', me, turnMeta.player.name, turnMeta.cardName, `${turnMeta.count}`);
	}

	public static wrongColorsMe (turnMeta: ColorsStageMeta, me: UserSchema): string {
		return this.mailingLine('🟥', me, turnMeta.player.name, turnMeta.cardName, formatColors(turnMeta.redCount, turnMeta.blackCount));
	}

	public static wrongSuitsMe (turnMeta: SuitsStageMeta, me: UserSchema): string {
		return this.mailingLine('🟥', me, turnMeta.player.name, turnMeta.cardName, formatSuits(turnMeta.suits));
	}
}
