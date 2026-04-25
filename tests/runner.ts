/**
 * runner.ts — lightweight tests runner, no project dependencies.
 */

import type { CapturedMsg } from './bootstrap';

interface CaseResult {
	name: string;
	passed: boolean;
	error?: string;
}

interface LayerResult {
	name: string;
	passed: boolean;
	cases: CaseResult[];
	error?: string;
}

type RunKind = 'module' | 'flow';

interface RunResult {
	kind: RunKind;
	name: string;
	passed: boolean;
	cases: CaseResult[];
	layers: LayerResult[];
	error?: string;
}

export interface ModuleTools {
	runCase: (name: string, fn: () => Promise<void> | void) => Promise<void>;
	runLayer: (name: string, fn: (tools: ModuleTools) => Promise<void>) => Promise<void>;
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
const ITEM_MARKER = '·';

const formatError = (error: string): string => {
	return error
		.split('\n')
		.map(line => `      ${line}`)
		.join('\n');
};

const getCasesSummary = (passedCases: number, totalCases: number): string => {
	return `(${passedCases}/${totalCases} cases)`;
};

const getAllCases = (result: RunResult): CaseResult[] => {
	return [...result.cases, ...result.layers.flatMap(layer => layer.cases)];
};

const getPassedCasesCount = (result: RunResult): number => {
	return getAllCases(result).filter(item => item.passed).length;
};

const printFailedCaseDetails = (cases: CaseResult[], indent: string): void => {
	const failedCases = cases
		.filter(caseResult => !caseResult.passed);

	if (failedCases.length > 0) {
		console.log(`${indent}Failed cases:`);
		failedCases.forEach(caseResult => {
			console.log(`${indent}${ITEM_MARKER} ${caseResult.name}`);
			if (caseResult.error) {
				console.log(formatError(caseResult.error));
			}
		});
	}
};

const printFlowCompactDetails = (result: RunResult): void => {
	console.log('   Layers:');
	result.layers.forEach(layerResult => {
		const layerPassedCases = layerResult.cases.filter(item => item.passed).length;
		console.log(`   ${ITEM_MARKER} ${layerResult.name} - ${layerResult.passed ? PASSED_LABEL : ERROR_LABEL} ${getCasesSummary(layerPassedCases, layerResult.cases.length)}`);
		if (!layerResult.passed) {
			printFailedCaseDetails(layerResult.cases, '      ');
			if (layerResult.error) {
				console.log('      Unhandled layer error:');
				console.log(formatError(layerResult.error));
			}
		}
	});
	if (result.error) {
		console.log('   Unhandled flow error:');
		console.log(formatError(result.error));
	}
};

const getKindTitle = (kind: RunKind): string => kind === 'module' ? 'module' : 'flow';

/**
 * Updates runner behavior for the current tests invocation.
 */
export function setRunnerOptions (options: Partial<RunnerOptions>): void {
	Object.assign(runnerOptions, options);
}

/**
 * Executes one module or flow and records structured case and layer results.
 */
export async function run (
	name: string,
	fn: ((tools: ModuleTools) => Promise<void>) | (() => Promise<void> | void),
	options: {
		kind?: RunKind;
	} = {},
): Promise<void> {
	const kind = options.kind ?? 'module';
	const result: RunResult = {
		kind,
		name,
		passed: true,
		cases: [],
		layers: [],
	};

	results.push(result);

	let usedCaseRunner = false;
	let currentLayer: LayerResult | undefined;

	if (runnerOptions.fullLogs) {
		console.log(`${ITEM_MARKER} ${name}`);
		console.log(kind === 'flow' ? '   Layers:' : '   Cases:');
	}

	const runCase = async (caseName: string, caseFn: () => Promise<void> | void): Promise<void> => {
		usedCaseRunner = true;
		const target = currentLayer ?? result;
		const casePrefix = runnerOptions.fullLogs
			? currentLayer ? '      ' : '   '
			: '';

		try {
			await caseFn();
			target.cases.push({ name: caseName, passed: true });
			if (runnerOptions.fullLogs) {
				console.log(`${casePrefix}${ITEM_MARKER} ${caseName} - ${PASSED_LABEL}`);
			}
		} catch (e) {
			const error = e instanceof Error ? e.message : String(e);
			target.passed = false;
			result.passed = false;
			target.cases.push({ name: caseName, passed: false, error });
			if (runnerOptions.fullLogs) {
				console.log(`${casePrefix}${ITEM_MARKER} ${caseName} - ${ERROR_LABEL}`);
				console.log(formatError(error));
			}
		}
	};

	const runLayer = async (layerName: string, layerFn: (tools: ModuleTools) => Promise<void>): Promise<void> => {
		const layerResult: LayerResult = {
			name: layerName,
			passed: true,
			cases: [],
		};

		result.layers.push(layerResult);
		const previousLayer = currentLayer;
		const previousUsedCaseRunner = usedCaseRunner;
		currentLayer = layerResult;
		usedCaseRunner = false;

		if (runnerOptions.fullLogs) {
			console.log(`   ${ITEM_MARKER} ${layerName}`);
			console.log('      Cases:');
		}

		try {
			await layerFn({ runCase, runLayer });
		} catch (e) {
			const error = e instanceof Error ? e.message : String(e);
			layerResult.passed = false;
			result.passed = false;
			layerResult.error = error;

			if (!usedCaseRunner) {
				layerResult.cases.push({ name: 'Layer body', passed: false, error });
				if (runnerOptions.fullLogs) {
					console.log(`      ${ITEM_MARKER} Layer body - ${ERROR_LABEL}`);
					console.log(formatError(error));
				}
			} else if (runnerOptions.fullLogs) {
				console.log(`      Unhandled layer error - ${ERROR_LABEL}`);
				console.log(formatError(error));
			}
		}

		if (!usedCaseRunner && !layerResult.error) {
			layerResult.cases.push({ name: 'Layer body', passed: true });
			if (runnerOptions.fullLogs) {
				console.log(`      ${ITEM_MARKER} Layer body - ${PASSED_LABEL}`);
			}
		}

		const passedCases = layerResult.cases.filter(item => item.passed).length;
		const casesSummary = getCasesSummary(passedCases, layerResult.cases.length);

		if (runnerOptions.fullLogs) {
			console.log(`      Result: ${layerResult.passed ? PASSED_LABEL : ERROR_LABEL} ${casesSummary}\n`);
		}

		currentLayer = previousLayer;
		usedCaseRunner = previousUsedCaseRunner || usedCaseRunner;
	};

	try {
		await fn({ runCase, runLayer });
	} catch (e) {
		const error = e instanceof Error ? e.message : String(e);
		result.passed = false;
		result.error = error;

		if (!usedCaseRunner) {
			result.cases.push({ name: 'Module body', passed: false, error });
			if (runnerOptions.fullLogs) {
				console.log(`   ${ITEM_MARKER} ${getKindTitle(kind) === 'module' ? 'Module' : 'Flow'} body - ${ERROR_LABEL}`);
				console.log(formatError(error));
			}
		} else if (runnerOptions.fullLogs) {
			console.log(`   Unhandled ${getKindTitle(kind)} error - ${ERROR_LABEL}`);
			console.log(formatError(error));
		}
	}

	if (!usedCaseRunner && result.layers.length === 0 && !result.error) {
		result.cases.push({ name: `${getKindTitle(kind) === 'module' ? 'Module' : 'Flow'} body`, passed: true });
		if (runnerOptions.fullLogs) {
			console.log(`   ${ITEM_MARKER} ${getKindTitle(kind) === 'module' ? 'Module' : 'Flow'} body - ${PASSED_LABEL}`);
		}
	}

	const allCases = getAllCases(result);
	const passedCases = getPassedCasesCount(result);
	const casesSummary = getCasesSummary(passedCases, allCases.length);

	if (runnerOptions.fullLogs) {
		console.log(`   Result: ${result.passed ? PASSED_LABEL : ERROR_LABEL} ${casesSummary}\n`);
	} else {
		console.log(`${ITEM_MARKER} ${name} - ${result.passed ? PASSED_LABEL : ERROR_LABEL} ${casesSummary}`);
		if (kind === 'flow') {
			printFlowCompactDetails(result);
		} else if (!result.passed) {
			printFailedCaseDetails(result.cases, '   ');
			if (result.error) {
				console.log('   Unhandled module error:');
				console.log(formatError(result.error));
			}
		}
	}
}

/**
 * Prints the aggregated tests summary and sets the exit code on failures.
 */
export function printSummary (): void {
	const modules = results.filter(r => r.kind === 'module');
	const flows = results.filter(r => r.kind === 'flow');
	const layers = flows.flatMap(result => result.layers);
	const passedModules = modules.filter(r => r.passed).length;
	const passedFlows = flows.filter(r => r.passed).length;
	const passedLayers = layers.filter(layer => layer.passed).length;
	const allCases = results.flatMap(result => getAllCases(result));
	const passedCases = allCases.filter(c => c.passed).length;

	console.log(`${'─'.repeat(50)}`);
	if (modules.length > 0) {
		console.log(`  Modules: ${passedModules} / ${modules.length} passed`);
	}
	if (flows.length > 0) {
		console.log(`  Flows: ${passedFlows} / ${flows.length} passed`);
		console.log(`  Layers: ${passedLayers} / ${layers.length} passed`);
	}
	console.log(`  Cases: ${passedCases} / ${allCases.length} passed`);

	if (results.some(r => !r.passed)) {
		const failedModules = modules.filter(result => !result.passed);
		const failedFlows = flows.filter(result => !result.passed);

		if (failedModules.length > 0) {
			console.log('\n  Failed modules:');
			failedModules.forEach(moduleResult => {
				const modulePassedCases = getPassedCasesCount(moduleResult);
				console.log(`    ${ITEM_MARKER} ${moduleResult.name} ${getCasesSummary(modulePassedCases, getAllCases(moduleResult).length)}`);
			});
		}

		if (failedFlows.length > 0) {
			console.log('\n  Failed flows:');
			failedFlows.forEach(flowResult => {
				const flowPassedCases = getPassedCasesCount(flowResult);
				console.log(`    ${ITEM_MARKER} ${flowResult.name} ${getCasesSummary(flowPassedCases, getAllCases(flowResult).length)}`);
				flowResult.layers.forEach(layerResult => {
					if (layerResult.passed) {
						return;
					}

					const layerPassedCases = layerResult.cases.filter(item => item.passed).length;
					console.log(`      ${ITEM_MARKER} ${layerResult.name} ${getCasesSummary(layerPassedCases, layerResult.cases.length)}`);
				});
			});
		}

		process.exitCode = 1;
	}

	console.log('─'.repeat(50));
}

/**
 * Throws with the provided message when a tests condition is not met.
 */
export function assert (condition: boolean, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

type VisibleMsgType = Exclude<CapturedMsg['type'], 'delete'>;

interface MessageAssertOptions {
	type?: VisibleMsgType;
	exact?: boolean;
	latest?: boolean;
	count?: number;
}

type MessageMatchOptions = Omit<MessageAssertOptions, 'count'>;

const getVisibleMessages = (
	log: readonly CapturedMsg[],
	toId: number,
	type?: VisibleMsgType,
): CapturedMsg[] => {
	return log.filter(m => m.to === toId && m.type !== 'delete' && (type ? m.type === type : true));
};

const getComparableText = (message: CapturedMsg, exact: boolean): string => {
	return exact ? message.body : message.text;
};

const messageMatches = (
	message: CapturedMsg,
	contains: string,
	options: MessageMatchOptions,
): boolean => {
	const text = getComparableText(message, options.exact ?? false);
	return options.exact ? text === contains : text.includes(contains);
};

/**
 * Asserts that a user received a message containing the expected fragment.
 */
export function assertSent (
	log: readonly CapturedMsg[],
	toId: number,
	contains: string,
	options: MessageAssertOptions = {},
): void {
	const msgs = getVisibleMessages(log, toId, options.type);
	const targetMessages = options.latest ? msgs.slice(-1) : msgs;
	const matches = targetMessages.filter(m => messageMatches(m, contains, options));
	const hasMatch = matches.length > 0;

	if (!hasMatch || (options.count !== undefined && matches.length !== options.count)) {
		const got = msgs.length
			? msgs.map(m => `      "${m.text.slice(0, 80)}"`).join('\n')
			: '      (no messages)';
		const expectation = options.exact ? 'equal to' : 'containing';
		const countExpectation = options.count === undefined ? '' : ` exactly ${options.count} time(s)`;
		const latestExpectation = options.latest ? ' in the latest message' : '';
		throw new Error(`Expected message to ${toId} ${expectation} "${contains}"${latestExpectation}${countExpectation} but got:\n${got}`);
	}
}

/**
 * Asserts that a user did not receive a message containing the given fragment.
 */
export function assertNotSent (
	log: readonly CapturedMsg[],
	toId: number,
	contains: string,
	options: MessageMatchOptions = {},
): void {
	const msgs = getVisibleMessages(log, toId, options.type);
	const targetMessages = options.latest ? msgs.slice(-1) : msgs;
	if (targetMessages.some(m => messageMatches(m, contains, options))) {
		const expectation = options.exact ? 'equal to' : 'containing';
		const latestExpectation = options.latest ? ' in the latest message' : '';
		throw new Error(`Expected NO message to ${toId} ${expectation} "${contains}"${latestExpectation}, but one was sent`);
	}
}

/**
 * Asserts that the latest visible message for a user has a keyboard button.
 */
export function assertKeyboardButton (
	log: readonly CapturedMsg[],
	toId: number,
	label: string,
	callbackData?: string,
): void {
	const message = getVisibleMessages(log, toId).at(-1);

	if (!message) {
		throw new Error(`Expected keyboard button "${label}" for ${toId}, but no visible messages were captured`);
	}

	const buttons = message.keyboard?.flat() ?? [];
	const matchedButton = buttons.find(button => button.text === label && (
		callbackData === undefined || button.callbackData === callbackData
	));

	if (!matchedButton) {
		const got = buttons.length > 0
			? buttons.map(button => `      ${button.text}${button.callbackData ? ` -> ${button.callbackData}` : ''}`).join('\n')
			: '      (no keyboard)';
		const expectedCallback = callbackData === undefined ? '' : ` with callback "${callbackData}"`;
		throw new Error(`Expected keyboard button "${label}"${expectedCallback} for ${toId}, but got:\n${got}`);
	}
}

/**
 * Asserts that a message deletion was captured for the given user.
 */
export function assertDeleted (log: readonly CapturedMsg[], toId: number, messageId?: number): void {
	const deletions = log.filter(m => m.to === toId && m.type === 'delete');

	if (messageId === undefined) {
		if (deletions.length === 0) {
			throw new Error(`Expected a deleted message for ${toId}, but none was captured`);
		}
		return;
	}

	if (!deletions.some(m => m.messageId === messageId)) {
		const got = deletions.length
			? deletions.map(m => `      ${m.text}`).join('\n')
			: '      (no deletions)';
		throw new Error(`Expected message ${messageId} to be deleted for ${toId}, but got:\n${got}`);
	}
}
