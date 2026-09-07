// Completion test for the Droid workshop program (docs/overhaul/SPEC.md section 7, rubric 16 C11-C13).
//   node scripts/programs/droid_workshop.mjs [--seed 1337] [--verbose] [--json out.json]
//   node scripts/programs/droid_workshop.mjs --url http://localhost:5323/ [--host <lotId>] [--shots /tmp/p3-shots]
// Offline: every host lot of the program has its required rooms (core set; extended set on hosts with enough
// rooms), each reachable from the public entry, lit, furnished to the landmark bar and offering an interaction,
// and a sign name. With --url the largest passing host is walked from the street to its signature room in
// headless Chrome and screenshotted.
import { runProgramTest } from './_lib.mjs';

await runProgramTest('droid_workshop');
