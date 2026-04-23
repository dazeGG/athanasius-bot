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

export interface ScenarioTools {
	runCase: (name: string, fn: () => Promise<void>) => Promise<void>;
}

const results: RunResult[] = [];

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

export async function run (
	name: string,
	fn: ((tools: ScenarioTools) => Promise<void>) | (() => Promise<void>),
): Promise<void> {
	const result: RunResult = {
		name,
		passed: true,
		cases: [],
	};

	results.push(result);

	const scenarioNumber = results.length;
	let caseIndex = 0;
	let usedCaseRunner = false;

	console.log(`${scenarioNumber}) ${name}`);
	console.log('   Cases:');

	const runCase = async (caseName: string, caseFn: () => Promise<void>): Promise<void> => {
		usedCaseRunner = true;
		caseIndex += 1;

		try {
			await caseFn();
			result.cases.push({ name: caseName, passed: true });
			console.log(`   ${caseIndex}) ${caseName} - ${PASSED_LABEL}`);
		} catch (e) {
			const error = e instanceof Error ? e.message : String(e);
			result.passed = false;
			result.cases.push({ name: caseName, passed: false, error });
			console.log(`   ${caseIndex}) ${caseName} - ${ERROR_LABEL}`);
			console.log(formatError(error));
		}
	};

	try {
		await fn({ runCase });
	} catch (e) {
		const error = e instanceof Error ? e.message : String(e);
		result.passed = false;
		result.error = error;

		if (!usedCaseRunner) {
			result.cases.push({ name: 'Scenario body', passed: false, error });
			console.log(`   1) Scenario body - ${ERROR_LABEL}`);
			console.log(formatError(error));
		} else {
			console.log(`   Unhandled scenario error - ${ERROR_LABEL}`);
			console.log(formatError(error));
		}
	}

	if (!usedCaseRunner && !result.error) {
		result.cases.push({ name: 'Scenario body', passed: true });
		console.log(`   1) Scenario body - ${PASSED_LABEL}`);
	}

	const passedCases = result.cases.filter(item => item.passed).length;
	console.log(`   Result: ${result.passed ? PASSED_LABEL : ERROR_LABEL} (${passedCases}/${result.cases.length} cases passed)\n`);
}

export function printSummary (): void {
	const passedScenarios = results.filter(r => r.passed).length;
	const allCases = results.flatMap(r => r.cases);
	const passedCases = allCases.filter(c => c.passed).length;

	console.log(`${'─'.repeat(50)}`);
	console.log(`  Scenarios: ${passedScenarios} / ${results.length} passed`);
	console.log(`  Cases: ${passedCases} / ${allCases.length} passed`);

	const failedCases = results.flatMap((scenario, scenarioIndex) => {
		return scenario.cases
			.map((caseResult, caseIndex) => ({ scenario, scenarioIndex, caseResult, caseIndex }))
			.filter(item => !item.caseResult.passed);
	});

	if (failedCases.length > 0 || results.some(r => r.error)) {
		console.log('\n  Failed:');

		failedCases.forEach(({ scenario, scenarioIndex, caseResult, caseIndex }) => {
			console.log(`    ${scenarioIndex + 1}.${caseIndex + 1} ${scenario.name} / ${caseResult.name}`);
			if (caseResult.error) {
				console.log(formatError(caseResult.error));
			}
		});

		results
			.map((scenario, scenarioIndex) => ({ scenario, scenarioIndex }))
			.filter(item => item.scenario.error)
			.forEach(({ scenario, scenarioIndex }) => {
				console.log(`    ${scenarioIndex + 1}.x ${scenario.name} / Unhandled scenario error`);
				console.log(formatError(scenario.error ?? 'Unknown error'));
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
