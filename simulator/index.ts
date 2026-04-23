/**
 * simulator/index.ts — test entry point.
 *
 * Run all scenarios: pnpm test
 * Keep db.test.json after run: pnpm test -- --save-db
 */

import { config } from 'dotenv';
import { unlink } from 'fs/promises';

// ─── Load test env BEFORE any project code is imported ───────────────────────
config({ path: '.env.test', override: true });

// ─── Project code via dynamic imports (env is now set) ───────────────────────
await import('./bootstrap');

const { run, printSummary } = await import('./runner');
const { scenarioGameFlow }      = await import('./scenarios/game-flow');
const { scenarioRegistration }  = await import('./scenarios/registration');

// ─── Run all scenarios ────────────────────────────────────────────────────────
console.log('\n🎮  Athanasius simulator\n');

await run('Registration flow (5 players, /reg → name → /reg again)', scenarioRegistration);
await run('Initial Athanasius at deal + failed turn + successful steal', scenarioGameFlow);

// ─── Summary ─────────────────────────────────────────────────────────────────
printSummary();

// ─── Cleanup ─────────────────────────────────────────────────────────────────
const dbFile = process.env.DB_FILE ?? 'db.test.json';
const saveDb = process.argv.includes('--save-db');

if (saveDb) {
	console.log(`\n  💾  ${dbFile} kept (--save-db)`);
} else {
	await unlink(dbFile).catch(() => {});
	console.log(`\n  🗑   ${dbFile} deleted  (pass --save-db to keep)\n`);
}
