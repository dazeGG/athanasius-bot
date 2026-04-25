import { DeckConfig } from '~/entities/deck';
import { escapeHtml } from '~/shared/lib';
import { playersList } from '~/shared/ui';
import type { CardName } from '~/entities/deck';
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

	private static meWrongHeader (turnMeta: CardStageMeta | CountStageMeta | ColorsStageMeta | SuitsStageMeta): string {
		return '🟥 <b>К сожалению, ты не угадал</b>\n\n' +
			`Игрок: ${escapeHtml(turnMeta.player.name)}\n`;
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
		text += 'Вот они, победители, слева направо:\n';

		const [first, second, ...rest] = athMap;
		const middle = rest.slice(0, -1);
		const last = rest[rest.length - 1];

		const bronze = middle[0];
		const plainPlayers = middle.slice(1);

		text += `🥇 ${this.formatPlayerResult(first[0], first[1])}\n`;
		text += `🥈 ${this.formatPlayerResult(second[0], second[1])}\n`;

		if (bronze) {
			text += `🥉 ${this.formatPlayerResult(bronze[0], bronze[1])}\n`;
		}

		if (plainPlayers.length > 0) {
			text += '\n<b>Простые ребята:</b>\n';
			plainPlayers.forEach((player, i) => {
				text += `${i + 4}. ${this.formatPlayerResult(player[0], player[1])}\n`;
			});
		}

		text += '\n<b>Главный неудачник:</b>\n';
		text += `🦧 ${this.formatPlayerResult(last[0], last[1])}`;

		return text;
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
		const base = `🟧 <b>${escapeHtml(me.name)} → Ты</b> | ${DeckConfig.CARDS_VIEW_MAP[turnMeta.cardName]}`;
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
		const base = `🟧 <b>${escapeHtml(me.name)} → Ты</b> | ${DeckConfig.CARDS_VIEW_MAP[turnMeta.cardName]}`;
		const colors = formatColors(turnMeta.redCount, turnMeta.blackCount);
		return colors ? `${base} | ${colors}` : base;
	}

	/* ME — paragraph format with ❌ on wrong field */
	public static wrongCardMe (turnMeta: CardStageMeta): string {
		return this.meWrongHeader(turnMeta) +
			`Карта: ${DeckConfig.CARDS_VIEW_MAP[turnMeta.cardName]} ❌`;
	}

	public static wrongCountMe (turnMeta: CountStageMeta): string {
		return this.meWrongHeader(turnMeta) +
			`Карта: ${DeckConfig.CARDS_VIEW_MAP[turnMeta.cardName]}\n` +
			`Количество: ${turnMeta.count} ❌`;
	}

	public static wrongColorsMe (turnMeta: ColorsStageMeta): string {
		return this.meWrongHeader(turnMeta) +
			`Карта: ${DeckConfig.CARDS_VIEW_MAP[turnMeta.cardName]}\n` +
			`Количество: ${turnMeta.count}\n` +
			`Цвета: ${formatColors(turnMeta.redCount, turnMeta.blackCount)} ❌`;
	}

	public static wrongSuitsMe (turnMeta: SuitsStageMeta): string {
		return this.meWrongHeader(turnMeta) +
			`Карта: ${DeckConfig.CARDS_VIEW_MAP[turnMeta.cardName]}\n` +
			`Количество: ${turnMeta.count}\n` +
			`Масти: ${formatSuits(turnMeta.suits)} ❌`;
	}
}
