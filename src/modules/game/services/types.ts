import type { CallbackContext } from '~/core';
import type { UserSchema } from '~/db';
import type {
	Game,
	TurnMeta,
	CardStageMeta,
	CountStageMeta,
	ColorsStageMeta,
	SuitsStageMeta,
	Suits,
} from '~/entities/game';

export interface GameNotificationOptions {
    ctx: CallbackContext;
    game: Game;
    me: UserSchema;
    turnMeta: TurnMeta;
}

export interface NotifyStageOptions {
    Card: Omit<GameNotificationOptions, 'turnMeta'> & { turnMeta: CardStageMeta };
    Count: Omit<GameNotificationOptions, 'turnMeta'> & { turnMeta: CountStageMeta };
    Colors: Omit<GameNotificationOptions, 'turnMeta'> & { turnMeta: ColorsStageMeta };
    Suits: Omit<GameNotificationOptions, 'turnMeta'> & { turnMeta: SuitsStageMeta };
}

export interface UpdateStageOptions {
    Count: Omit<NotifyStageOptions['Count'], 'game' | 'me'> & { newCount: number };
    Colors: Omit<NotifyStageOptions['Colors'], 'game' | 'me'> & { newRedCount: number };
    Suits: Omit<NotifyStageOptions['Suits'], 'game' | 'me'> & { newSuits: Suits };
}
