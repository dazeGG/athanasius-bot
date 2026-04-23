/**
 * runner.ts — lightweight test runner, no project dependencies.
 */

import type { CallbackContext } from '~/core/bot/types/context';
import type { CapturedMsg } from './bootstrap';

interface CaseResult {
	name: string;
	passed: boolean;
	error?: string;
}

interface RunResult {
	name: string;
	passed: boolean;
	cases: CaseResult[];
	error?: string;
}

export interface ModuleTools {
	runCase: (name: string, fn: () => Promise<void>) => Promise<void>;
}

interface RunnerOptions {
	fullLogs: boolean;
}

const results: RunResult[] = [];
const runnerOptions: RunnerOptions = {
	fullLogs: false,
};

const ANSI = {
	reset: '\u001B[0m',
	green: '\u001B[32m',
	red: '\u001B[31m',
} as const;

const colorize = (text: string, color: string): string => {
	if (!process.stdout.isTTY) {
		return text;
	}

	return `${color}${text}${ANSI.reset}`;
};

const PASSED_LABEL = `${colorize('✅', ANSI.green)} ${colorize('Passed', ANSI.green)}`;
const ERROR_LABEL = `${colorize('❌', ANSI.red)} ${colorize('Error', ANSI.red)}`;

const formatError = (error: string): string => {
	return error
		.split('\n')
		.map(line => `      ${line}`)
		.join('\n');
};

const getCasesSummary = (passedCases: number, totalCases: number): string => {
	return `(${passedCases}/${totalCases} cases)`;
};

const printFailedCaseDetails = (result: RunResult): void => {
	const failedCases = result.cases
		.map((caseResult, caseIndex) => ({ caseResult, caseIndex }))
		.filter(item => !item.caseResult.passed);

	if (failedCases.length > 0) {
		console.log('   Failed cases:');
		failedCases.forEach(({ caseResult, caseIndex }) => {
			console.log(`   - ${caseIndex + 1}) ${caseResult.name}`);
			if (caseResult.error) {
				console.log(formatError(caseResult.error));
			}
		});
	}

	if (result.error) {
		console.log('   Unhandled module error:');
		console.log(formatError(result.error));
	}
};

export function setRunnerOptions (options: Partial<RunnerOptions>): void {
	Object.assign(runnerOptions, options);
}

export async function run (
	name: string,
	fn: ((tools: ModuleTools) => Promise<void>) | (() => Promise<void>),
): Promise<void> {
	const result: RunResult = {
		name,
		passed: true,
		cases: [],
	};

	results.push(result);

	const moduleNumber = results.length;
	let caseIndex = 0;
	let usedCaseRunner = false;

	if (runnerOptions.fullLogs) {
		console.log(`${moduleNumber}) ${name}`);
		console.log('   Cases:');
	}

	const runCase = async (caseName: string, caseFn: () => Promise<void>): Promise<void> => {
		usedCaseRunner = true;
		caseIndex += 1;

		try {
			await caseFn();
			result.cases.push({ name: caseName, passed: true });
			if (runnerOptions.fullLogs) {
				console.log(`   ${caseIndex}) ${caseName} - ${PASSED_LABEL}`);
			}
		} catch (e) {
			const error = e instanceof Error ? e.message : String(e);
			result.passed = false;
			result.cases.push({ name: caseName, passed: false, error });
			if (runnerOptions.fullLogs) {
				console.log(`   ${caseIndex}) ${caseName} - ${ERROR_LABEL}`);
				console.log(formatError(error));
			}
		}
	};

	try {
		await fn({ runCase });
	} catch (e) {
		const error = e instanceof Error ? e.message : String(e);
		result.passed = false;
		result.error = error;

		if (!usedCaseRunner) {
			result.cases.push({ name: 'Module body', passed: false, error });
			if (runnerOptions.fullLogs) {
				console.log(`   1) Module body - ${ERROR_LABEL}`);
				console.log(formatError(error));
			}
		} else if (runnerOptions.fullLogs) {
			console.log(`   Unhandled module error - ${ERROR_LABEL}`);
			console.log(formatError(error));
		}
	}

	if (!usedCaseRunner && !result.error) {
		result.cases.push({ name: 'Module body', passed: true });
		if (runnerOptions.fullLogs) {
			console.log(`   1) Module body - ${PASSED_LABEL}`);
		}
	}

	const passedCases = result.cases.filter(item => item.passed).length;
	const casesSummary = getCasesSummary(passedCases, result.cases.length);

	if (runnerOptions.fullLogs) {
		console.log(`   Result: ${result.passed ? PASSED_LABEL : ERROR_LABEL} ${casesSummary}\n`);
	} else {
		console.log(`${moduleNumber}) ${name} - ${result.passed ? PASSED_LABEL : ERROR_LABEL} ${casesSummary}`);
		if (!result.passed) {
			printFailedCaseDetails(result);
		}
	}
}

export function printSummary (): void {
	const passedModules = results.filter(r => r.passed).length;
	const allCases = results.flatMap(r => r.cases);
	const passedCases = allCases.filter(c => c.passed).length;

	console.log(`${'─'.repeat(50)}`);
	console.log(`  Modules: ${passedModules} / ${results.length} passed`);
	console.log(`  Cases: ${passedCases} / ${allCases.length} passed`);

	if (results.some(r => !r.passed)) {
		console.log('\n  Failed modules:');
		results.forEach((moduleResult, moduleIndex) => {
			if (moduleResult.passed) {
				return;
			}

			const modulePassedCases = moduleResult.cases.filter(item => item.passed).length;
			console.log(`    ${moduleIndex + 1}) ${moduleResult.name} ${getCasesSummary(modulePassedCases, moduleResult.cases.length)}`);
		});
		process.exitCode = 1;
	}

	console.log('─'.repeat(50));
}

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
