type StateContext = Record<string, unknown>;

type ClearStateOptions = {
	state?: boolean;
	context?: boolean;
}

class States {
	private readonly states: Map<number, string> = new Map();
	private readonly context: Map<number, StateContext> = new Map();

	setState (userId: number, state: string, context?: StateContext): void {
		this.states.set(userId, state);

		if (context) {
			this.context.set(userId, context);
		}
	}

	setContext (userId: number, context: StateContext): void {
		this.context.set(userId, context);
	}

	getState (userId: number): string | undefined {
		return this.states.get(userId);
	}

	getContext (userId: number): StateContext | undefined {
		return this.context.get(userId);
	}

	clearState (userId: number, { state: clearState = true, context: clearContext = true }: ClearStateOptions = {}): void {
		if (clearState) {
			this.states.delete(userId);
		}

		if (clearContext) {
			this.states.delete(userId);
		}
	}
}

export default new States();
