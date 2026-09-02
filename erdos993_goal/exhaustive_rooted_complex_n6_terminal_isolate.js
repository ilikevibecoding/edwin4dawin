#!/usr/bin/env node
// Exhaust the terminal-isolate burden over every rooted complex on
// six labelled vertices, treating vertex 6 as the root.  A rooted
// complex is uniquely C union (q * D), with D a subcomplex of C on
// the other five vertices.

const fs = require("fs");

function nextLevel(old, vertices) {
  const shift = 1 << (vertices - 1);
  const following = [];
  for (const deletion of old) {
    for (const link of old) {
      if (((link & ~deletion) >>> 0) !== 0) continue;
      following.push((deletion | (link << shift)) >>> 0);
    }
  }
  return following;
}

function popcount(value) {
  value >>>= 0;
  value -= (value >>> 1) & 0x55555555;
  value = (value & 0x33333333) + ((value >>> 2) & 0x33333333);
  return (((value + (value >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

function faceCounts(mask, vertices) {
  const result = new Uint8Array(vertices + 1);
  for (let face = 0; face < (1 << vertices); face++) {
    if (((mask >>> face) & 1) !== 0) result[popcount(face)]++;
  }
  return result;
}

const outIndex = process.argv.indexOf("--out");
if (outIndex < 0 || !process.argv[outIndex + 1]) {
  throw new Error("usage: node exhaustive_rooted_complex_n6_terminal_isolate.js --out REPORT.json");
}
const outPath = process.argv[outIndex + 1];

let level = [0, 1];
for (let vertices = 1; vertices <= 5; vertices++) {
  level = nextLevel(level, vertices);
}

const counts = level.map(mask => faceCounts(mask, 5));
let rootedComplexes = 0;
let checks = 0;
let failures = 0;
let firstFailure = null;
let minimumMargin = null;
let minimumItem = null;
const started = Date.now();

for (let ci = 0; ci < level.length; ci++) {
  const cMask = level[ci] >>> 0;
  if (cMask === 0) continue;
  const c = counts[ci];
  for (let di = 0; di < level.length; di++) {
    const dMask = level[di] >>> 0;
    if (((dMask & ~cMask) >>> 0) !== 0) continue;
    rootedComplexes++;
    const d = counts[di];

    // A_j=C_j+D_{j-1}; B=(1+x)A after adding isolate z.
    const a = new Int16Array(8);
    const b = new Int16Array(9);
    for (let rank = 0; rank <= 6; rank++) {
      a[rank] = (c[rank] || 0) + (rank ? (d[rank - 1] || 0) : 0);
    }
    for (let rank = 0; rank <= 7; rank++) {
      b[rank] = (a[rank] || 0) + (rank ? (a[rank - 1] || 0) : 0);
    }

    for (let rank = 1; rank <= 7; rank++) {
      const bm = b[rank - 1];
      const br = b[rank];
      if (!bm || !br || br < bm) continue;
      const cm = c[rank - 1] || 0;
      const cr = c[rank] || 0;
      const margin =
        br * bm + rank * br * cm - bm * bm
        - (rank + 1) * bm * cr + bm * cm;
      checks++;
      const item = {
        deletion_index: ci,
        link_index: di,
        deletion_mask: cMask,
        link_mask: dMask,
        rank,
        b_previous: bm,
        b_current: br,
        c_previous: cm,
        c_current: cr,
        cleared_margin: margin,
      };
      if (margin < 0) {
        failures++;
        if (firstFailure === null) firstFailure = item;
      }
      if (minimumMargin === null || margin < minimumMargin) {
        minimumMargin = margin;
        minimumItem = item;
      }
    }
  }
  if ((ci + 1) % 1000 === 0) {
    process.stdout.write(
      `deletions=${ci + 1}/${level.length} rooted=${rootedComplexes} checks=${checks} failures=${failures}\n`
    );
  }
}

const report = {
  status: failures ? "COUNTEREXAMPLE" : "PASS_NOT_PROOF",
  vertices: 6,
  complexes_on_five_vertices_including_void: level.length,
  rooted_complexes: rootedComplexes,
  checks,
  failures,
  minimum_cleared_margin: minimumMargin,
  minimum_item: minimumItem,
  first_failure: firstFailure,
  elapsed_seconds: (Date.now() - started) / 1000,
};
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
process.exitCode = failures ? 1 : 0;

