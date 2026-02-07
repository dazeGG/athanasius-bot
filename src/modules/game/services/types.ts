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

export interface GameServiceOptions {
    ctx: CallbackContext;
    game: Game;
    me: UserSchema;
    turnMeta: TurnMeta;
}

export interface GameServiceOptionsStage {
    Card: Omit<GameServiceOptions, 'turnMeta'> & { turnMeta: CardStageMeta };
    Count: Omit<GameServiceOptions, 'turnMeta'> & { turnMeta: CountStageMeta };
    Colors: Omit<GameServiceOptions, 'turnMeta'> & { turnMeta: ColorsStageMeta };
    Suits: Omit<GameServiceOptions, 'turnMeta'> & { turnMeta: SuitsStageMeta };
}

export interface UpdateMessageOptionsStage {
    Count: Omit<GameServiceOptionsStage['Count'], 'game' | 'me'> & { newCount: number };
    Colors: Omit<GameServiceOptionsStage['Colors'], 'game' | 'me'> & { newRedCount: number };
    Suits: Omit<GameServiceOptionsStage['Suits'], 'game' | 'me'> & { newSuits: Suits };
}
