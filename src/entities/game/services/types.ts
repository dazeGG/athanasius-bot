import type { CallbackCtx } from '~/core';
import type { UserSchema } from '~/db';
import type {
	Game,
	TurnMeta,
	CardStageMeta,
	CountStageMeta,
	ColorsStageMeta,
	SuitsStageMeta,
	Suits,
	Sender,
} from '~/entities/game';

export interface GameServiceOptions {
    ctx: CallbackCtx;
    game: Game;
    me: UserSchema;
    turnMeta: TurnMeta;
    sender: Sender;
}

export interface GameServiceOptionsStage {
    Card: Omit<GameServiceOptions, 'turnMeta'> & { turnMeta: CardStageMeta };
    Count: Omit<GameServiceOptions, 'turnMeta'> & { turnMeta: CountStageMeta };
    Colors: Omit<GameServiceOptions, 'turnMeta'> & { turnMeta: ColorsStageMeta };
    Suits: Omit<GameServiceOptions, 'turnMeta'> & { turnMeta: SuitsStageMeta };
}

export interface UpdateMessageOptionsStage {
    Count: Omit<GameServiceOptionsStage['Count'], 'me'> & { newCount: number };
    Colors: Omit<GameServiceOptionsStage['Colors'], 'me'> & { newRedCount: number };
    Suits: Omit<GameServiceOptionsStage['Suits'], 'me'> & { newSuits: Suits };
}
