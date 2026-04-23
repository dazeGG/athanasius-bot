import { LOGGER } from '~/core';
import type { PlayerId } from '~/entities/game/types';

export type GameEvent =
	| { type: 'GAME_CREATED'; gameId: string; roomId: string; players: PlayerId[] }
	| { type: 'GAME_ENDED'; gameId: string; roomId: string; winnerId: PlayerId; duration: number }
	| { type: 'TURN_START'; gameId: string; playerId: PlayerId }
	| { type: 'TURN_SUCCESS'; gameId: string; from: PlayerId; to: PlayerId; cardName: string; cardsCount: number }
	| { type: 'TURN_FAILED'; gameId: string; playerId: PlayerId; failedAt: string }
	| { type: 'ATHANASIUS_COMPLETED'; gameId: string; playerId: PlayerId; rank: string }
	| { type: 'PLAYER_JOINED_ROOM'; roomId: string; playerId: PlayerId; playerName: string }
	| { type: 'PLAYER_LEFT_ROOM'; roomId: string; playerId: PlayerId; playerName: string }
	| { type: 'PLAYER_KICKED'; roomId: string; playerId: PlayerId; playerName: string }
	| { type: 'USER_REGISTERED'; playerId: PlayerId; username?: string }
	| { type: 'BOT_ERROR'; error: string; context: string; chatId?: number; userId?: number }
	| { type: 'ACTION_ON_ENDED_GAME'; gameId: string; playerId: PlayerId }
	| { type: 'SLOW_OPERATION'; operation: string; durationMs: number; thresholdMs: number }
	| { type: 'BOT_RECONNECT'; reconnectCount: number };

export const logGameEvent = (event: GameEvent): void => {
	switch (event.type) {
	case 'GAME_CREATED':
		LOGGER.info('Game created', {
			gameId: event.gameId,
			roomId: event.roomId,
			playerCount: event.players.length,
		});
		break;
	case 'GAME_ENDED':
		LOGGER.info('Game ended', {
			gameId: event.gameId,
			roomId: event.roomId,
			winnerId: event.winnerId,
			durationMs: event.duration,
		});
		break;
	case 'TURN_START':
		LOGGER.debug('Turn started', {
			gameId: event.gameId,
			activePlayerId: event.playerId,
		});
		break;
	case 'TURN_SUCCESS':
		LOGGER.info('Turn successful', {
			gameId: event.gameId,
			stealerId: event.from,
			targetId: event.to,
			cardName: event.cardName,
			cardsMoved: event.cardsCount,
		});
		break;
	case 'TURN_FAILED':
		LOGGER.info('Turn failed', {
			gameId: event.gameId,
			playerId: event.playerId,
			failedAt: event.failedAt,
		});
		break;
	case 'ATHANASIUS_COMPLETED':
		LOGGER.info('Athanasius completed', {
			gameId: event.gameId,
			playerId: event.playerId,
			rank: event.rank,
		});
		break;
	case 'PLAYER_JOINED_ROOM':
		LOGGER.info('Player joined room', {
			roomId: event.roomId,
			playerId: event.playerId,
			playerName: event.playerName,
		});
		break;
	case 'PLAYER_LEFT_ROOM':
		LOGGER.info('Player left room', {
			roomId: event.roomId,
			playerId: event.playerId,
			playerName: event.playerName,
		});
		break;
	case 'PLAYER_KICKED':
		LOGGER.info('Player kicked from room', {
			roomId: event.roomId,
			playerId: event.playerId,
			playerName: event.playerName,
		});
		break;
	case 'USER_REGISTERED':
		LOGGER.info('User registered', {
			playerId: event.playerId,
			username: event.username ?? 'N/A',
		});
		break;
	case 'BOT_ERROR':
		LOGGER.error(event.error, {
			context: event.context,
			chatId: event.chatId,
			userId: event.userId,
		});
		break;
	case 'ACTION_ON_ENDED_GAME':
		LOGGER.warn('Action attempted on ended game', {
			gameId: event.gameId,
			playerId: event.playerId,
		});
		break;
	case 'SLOW_OPERATION':
		LOGGER.warn('Slow operation detected', {
			operation: event.operation,
			durationMs: event.durationMs,
			thresholdMs: event.thresholdMs,
		});
		break;
	case 'BOT_RECONNECT':
		LOGGER.warn('Bot reconnected', {
			reconnectCount: event.reconnectCount,
		});
		break;
	}
};
