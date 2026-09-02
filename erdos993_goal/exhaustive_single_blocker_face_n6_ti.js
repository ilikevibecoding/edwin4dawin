#!/usr/bin/env node
// Exhaust TI for every simplicial complex Delta on six labelled
// vertices with a fixed face used as one blocker class.

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
  throw new Error(
    "usage: node exhaustive_single_blocker_face_n6_ti.js "
    + "--blocker-size 1..6 --out REPORT.json"
  );
}
const outPath = process.argv[outIndex + 1];
const blockerSizeIndex = process.argv.indexOf("--blocker-size");
const blockerSize =
  blockerSizeIndex < 0 ? 1 : Number(process.argv[blockerSizeIndex + 1]);
if (!Number.isInteger(blockerSize) || blockerSize < 1 || blockerSize > 6) {
  throw new Error("--blocker-size must be an integer from 1 through 6");
}

let level = [0, 1];
for (let vertices = 1; vertices <= 5; vertices++) {
  level = nextLevel(level, vertices);
}
const counts = level.map(mask => faceCounts(mask, 5));
const otherBlockerMask =
  blockerSize === 1 ? 0 : (1 << (blockerSize - 1)) - 1;
const requiredLinkFace = otherBlockerMask;
const deletionCounts = level.map(mask => {
  const result = new Uint8Array(6);
  for (let face = 0; face < 32; face++) {
    if ((face & otherBlockerMask) !== 0) continue;
    if (((mask >>> face) & 1) !== 0) result[popcount(face)]++;
  }
  return result;
});

let configurations = 0;
let checks = 0;
let failures = 0;
let firstFailure = null;
let minimumMargin = null;
let minimumItem = null;
const started = Date.now();

// Delta = deletion union (u * link), where link is a subcomplex of
// deletion.  Requiring link to contain the empty face makes {u} a
// face of Delta.
for (let deletionIndex = 0; deletionIndex < level.length; deletionIndex++) {
  const deletionMask = level[deletionIndex] >>> 0;
  const deletion = counts[deletionIndex];
  if ((deletionMask & 1) === 0) continue;
  for (let linkIndex = 0; linkIndex < level.length; linkIndex++) {
    const linkMask = level[linkIndex] >>> 0;
    if ((linkMask & 1) === 0) continue;
    if (((linkMask >>> requiredLinkFace) & 1) === 0) continue;
    if (((linkMask & ~deletionMask) >>> 0) !== 0) continue;
    const link = counts[linkIndex];
    const blockerDeletion = deletionCounts[deletionIndex];
    configurations++;

    // R is the f-polynomial of Delta and E is its deletion of u.
    const residual = new Int16Array(8);
    const rootDeleted = new Int16Array(9);
    const rootedBase = new Int16Array(10);
    const total = new Int16Array(11);
    for (let rank = 0; rank < residual.length; rank++) {
      residual[rank] =
        (deletion[rank] || 0)
        + (rank ? (link[rank - 1] || 0) : 0);
    }
    // One root-neighbour v is selectable exactly when u is absent:
    // C = R + x E.  Then A = C + x R and add terminal isolate z.
    for (let rank = 0; rank < rootDeleted.length; rank++) {
      rootDeleted[rank] =
        (residual[rank] || 0)
        + (rank ? (blockerDeletion[rank - 1] || 0) : 0);
      rootedBase[rank] =
        rootDeleted[rank]
        + (rank ? (residual[rank - 1] || 0) : 0);
      total[rank] =
        rootedBase[rank]
        + (rank ? (rootedBase[rank - 1] || 0) : 0);
    }

    for (let rank = 1; rank < total.length; rank++) {
      const previous = total[rank - 1];
      const current = total[rank];
      if (!previous || !current || current < previous) continue;
      const avoidPrevious = rootDeleted[rank - 1] || 0;
      const avoidCurrent = rootDeleted[rank] || 0;
      const margin =
        current * previous
        + rank * current * avoidPrevious
        - previous * previous
        - (rank + 1) * previous * avoidCurrent
        + previous * avoidPrevious;
      checks++;
      const item = {
        deletion_index: deletionIndex,
        link_index: linkIndex,
        deletion_mask: deletionMask,
        link_mask: linkMask,
        rank,
        b_previous: previous,
        b_current: current,
        c_previous: avoidPrevious,
        c_current: avoidCurrent,
        cleared_margin: margin,
      };
      if (minimumMargin === null || margin < minimumMargin) {
        minimumMargin = margin;
        minimumItem = item;
      }
      if (margin < 0) {
        failures++;
        if (firstFailure === null) firstFailure = item;
      }
    }
  }
}

const report = {
  status: failures ? "COUNTEREXAMPLE" : "PASS_NOT_PROOF",
  residual_vertices: 6,
  blocker_size: blockerSize,
  complexes_on_five_vertices_including_void: level.length,
  configurations,
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
