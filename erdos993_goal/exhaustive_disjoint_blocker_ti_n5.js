#!/usr/bin/env node
// Exhaust TI over every simplicial complex on five residual vertices
// and every assignment of those vertices to disjoint root-neighbor
// blocking classes.  Each residual vertex blocks at most one class.

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

function binomial(n, k) {
  if (k < 0 || k > n) return 0;
  let value = 1;
  for (let i = 1; i <= k; i++) value = value * (n - k + i) / i;
  return value;
}

const outIndex = process.argv.indexOf("--out");
if (outIndex < 0 || !process.argv[outIndex + 1]) {
  throw new Error("usage: node exhaustive_disjoint_blocker_ti_n5.js --out REPORT.json");
}
const outPath = process.argv[outIndex + 1];

let complexes = [0, 1];
for (let vertices = 1; vertices <= 5; vertices++) {
  complexes = nextLevel(complexes, vertices);
}

let configurations = 0;
let checks = 0;
let failures = 0;
let firstFailure = null;
let minimumMargin = null;
let minimumItem = null;
const byDegree = {};
const started = Date.now();

for (let degree = 0; degree <= 4; degree++) {
  const base = degree + 1; // color 0 blocks nothing
  const assignments = base ** 5;
  let degreeConfigs = 0;
  let degreeChecks = 0;
  for (let assignmentCode = 0; assignmentCode < assignments; assignmentCode++) {
    let code = assignmentCode;
    const colors = [];
    for (let vertex = 0; vertex < 5; vertex++) {
      colors.push(code % base);
      code = Math.floor(code / base);
    }
    const blockedMasks = new Uint8Array(32);
    for (let face = 0; face < 32; face++) {
      let blocked = 0;
      for (let vertex = 0; vertex < 5; vertex++) {
        if ((face & (1 << vertex)) && colors[vertex] > 0) {
          blocked |= 1 << (colors[vertex] - 1);
        }
      }
      blockedMasks[face] = blocked;
    }

    for (let complexIndex = 0; complexIndex < complexes.length; complexIndex++) {
      const mask = complexes[complexIndex] >>> 0;
      if (mask === 0) continue;
      configurations++;
      degreeConfigs++;
      const deletionLink = new Int16Array(6);
      const rootDeleted = new Int16Array(10);
      for (let face = 0; face < 32; face++) {
        if (((mask >>> face) & 1) === 0) continue;
        const size = popcount(face);
        deletionLink[size]++;
        const available = degree - popcount(blockedMasks[face]);
        for (let selected = 0; selected <= available; selected++) {
          rootDeleted[size + selected] += binomial(available, selected);
        }
      }

      // Rooted base A=C+xD; then add terminal isolate z.
      const rootedBase = new Int16Array(11);
      const total = new Int16Array(12);
      for (let rank = 0; rank < rootedBase.length; rank++) {
        rootedBase[rank] =
          (rootDeleted[rank] || 0)
          + (rank ? (deletionLink[rank - 1] || 0) : 0);
      }
      for (let rank = 0; rank < total.length; rank++) {
        total[rank] =
          (rootedBase[rank] || 0)
          + (rank ? (rootedBase[rank - 1] || 0) : 0);
      }

      for (let rank = 1; rank < total.length; rank++) {
        const bm = total[rank - 1];
        const br = total[rank];
        if (!bm || !br || br < bm) continue;
        const cm = rootDeleted[rank - 1] || 0;
        const cr = rootDeleted[rank] || 0;
        const margin =
          br * bm + rank * br * cm - bm * bm
          - (rank + 1) * bm * cr + bm * cm;
        checks++;
        degreeChecks++;
        const item = {
          degree,
          assignment_code: assignmentCode,
          colors,
          complex_index: complexIndex,
          complex_mask: mask,
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
  }
  byDegree[degree] = {
    assignments,
    configurations: degreeConfigs,
    checks: degreeChecks,
  };
  process.stdout.write(
    `degree=${degree} assignments=${assignments} configs=${degreeConfigs} `
    + `checks=${degreeChecks} failures=${failures}\n`
  );
  if (firstFailure !== null) break;
}

const report = {
  status: failures ? "COUNTEREXAMPLE" : "PASS_NOT_PROOF",
  residual_vertices: 5,
  complexes_including_void: complexes.length,
  configurations,
  checks,
  failures,
  by_degree: byDegree,
  minimum_cleared_margin: minimumMargin,
  minimum_item: minimumItem,
  first_failure: firstFailure,
  elapsed_seconds: (Date.now() - started) / 1000,
};
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
process.exitCode = failures ? 1 : 0;

