/**
 * runner.ts — lightweight test runner, no project dependencies.
 */

import type { CallbackContext } from '~/core/bot/types/context';
import type { CapturedMsg } from './bootstrap';

// ─── Results ──────────────────────────────────────────────────────────────────
interface RunResult {
	name: string;
	passed: boolean;
	error?: string;
}

const results: RunResult[] = [];

// ─── Runner ───────────────────────────────────────────────────────────────────
export async function run (name: string, fn: () => Promise<void>): Promise<void> {
	process.stdout.write(`  • ${name} … `);
	try {
		await fn();
		results.push({ name, passed: true });
		console.log('✅');
	} catch (e) {
		const error = e instanceof Error ? e.message : String(e);
		results.push({ name, passed: false, error });
		console.log(`❌\n    ${error}`);
	}
}

export function printSummary (): void {
	const passed = results.filter(r => r.passed).length;
	const total = results.length;
	console.log(`\n${'─'.repeat(50)}`);
	console.log(`  ${passed} / ${total} passed`);
	if (passed < total) {
		console.log('\n  Failed scenarios:');
		results.filter(r => !r.passed).forEach(r => {
			console.log(`    ❌ ${r.name}`);
			if (r.error) { console.log(`       ${r.error}`); }
		});
		process.exitCode = 1;
	}
	console.log('─'.repeat(50));
}

// ─── Assertions ───────────────────────────────────────────────────────────────
export function assert (condition: boolean, message: string): void {
	if (!condition) { throw new Error(message); }
}

export function assertSent (log: readonly CapturedMsg[], toId: number, contains: string): void {
	const msgs = log.filter(m => m.to === toId);
	if (!msgs.some(m => m.text.includes(contains))) {
		const got = msgs.length
			? msgs.map(m => `      "${m.text.slice(0, 80)}"`).join('\n')
			: '      (no messages)';
		throw new Error(`Expected message to ${toId} containing "${contains}" but got:\n${got}`);
	}
}

export function assertNotSent (log: readonly CapturedMsg[], toId: number, contains: string): void {
	const msgs = log.filter(m => m.to === toId);
	if (msgs.some(m => m.text.includes(contains))) {
		throw new Error(`Expected NO message to ${toId} containing "${contains}", but one was sent`);
	}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function makeCtx (playerId: number): CallbackContext {
	return {
		chatId: playerId,
		callback: {
			id: `cb-${playerId}`,
			from: { id: playerId, is_bot: false, first_name: 'Sim' },
			message: { message_id: 1, chat: { id: playerId, type: 'private' }, date: 0 },
			data: { module: 'game', meta: '' },
		},
	} as unknown as CallbackContext;
}
