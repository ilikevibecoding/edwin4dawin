#!/usr/bin/env node
// Exhaust TI over every complex on six vertices for every partition
// shape of a fixed blocker face into disjoint color classes.

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
  for (let index = 1; index <= k; index++) {
    value = value * (n - k + index) / index;
  }
  return value;
}

function partitions(total, maximum = total) {
  if (total === 0) return [[]];
  const result = [];
  for (let first = Math.min(total, maximum); first >= 1; first--) {
    for (const tail of partitions(total - first, first)) {
      result.push([first, ...tail]);
    }
  }
  return result;
}

function faceCounts(mask) {
  const result = new Int16Array(7);
  for (let face = 0; face < 32; face++) {
    if (((mask >>> face) & 1) !== 0) result[popcount(face)]++;
  }
  return result;
}

function weightedCounts(mask, colors, degree, specialColor) {
  const result = new Int32Array(14);
  for (let face = 0; face < 32; face++) {
    if (((mask >>> face) & 1) === 0) continue;
    let blocked = specialColor < 0 ? 0 : (1 << specialColor);
    for (let vertex = 0; vertex < 5; vertex++) {
      if ((face & (1 << vertex)) && colors[vertex] >= 0) {
        blocked |= 1 << colors[vertex];
      }
    }
    const available = degree - popcount(blocked);
    const size = popcount(face) + (specialColor < 0 ? 0 : 1);
    for (let selected = 0; selected <= available; selected++) {
      result[size + selected] += binomial(available, selected);
    }
  }
  return result;
}

const outIndex = process.argv.indexOf("--out");
if (outIndex < 0 || !process.argv[outIndex + 1]) {
  throw new Error(
    "usage: node exhaustive_colored_union_face_n6_ti.js --out REPORT.json"
  );
}
const outPath = process.argv[outIndex + 1];

let level = [0, 1];
for (let vertices = 1; vertices <= 5; vertices++) {
  level = nextLevel(level, vertices);
}
const counts = level.map(faceCounts);

let configurations = 0;
let checks = 0;
let failures = 0;
let firstFailure = null;
let minimumMargin = null;
let minimumItem = null;
const byPartition = [];
const started = Date.now();

outer:
for (let coloredVertices = 1; coloredVertices <= 6; coloredVertices++) {
  for (const classSizes of partitions(coloredVertices)) {
    const degree = classSizes.length;
    const colors = new Int8Array(5);
    colors.fill(-1);
    let cursor = 0;
    // The distinguished sixth vertex belongs to class zero.
    for (let count = 0; count < classSizes[0] - 1; count++) {
      colors[cursor++] = 0;
    }
    for (let color = 1; color < degree; color++) {
      for (let count = 0; count < classSizes[color]; count++) {
        colors[cursor++] = color;
      }
    }
    const requiredLinkFace =
      coloredVertices === 1 ? 0 : (1 << (coloredVertices - 1)) - 1;
    const deletionWeighted = level.map(
      mask => weightedCounts(mask, colors, degree, -1)
    );
    const linkWeighted = level.map(
      mask => weightedCounts(mask, colors, degree, 0)
    );
    let partitionConfigurations = 0;
    let partitionChecks = 0;
    let partitionMinimum = null;

    for (
      let deletionIndex = 0;
      deletionIndex < level.length;
      deletionIndex++
    ) {
      const deletionMask = level[deletionIndex] >>> 0;
      if ((deletionMask & 1) === 0) continue;
      const deletion = counts[deletionIndex];
      for (let linkIndex = 0; linkIndex < level.length; linkIndex++) {
        const linkMask = level[linkIndex] >>> 0;
        if ((linkMask & 1) === 0) continue;
        if (((linkMask >>> requiredLinkFace) & 1) === 0) continue;
        if (((linkMask & ~deletionMask) >>> 0) !== 0) continue;
        const link = counts[linkIndex];
        configurations++;
        partitionConfigurations++;

        const rootDeleted = new Int32Array(14);
        const residual = new Int16Array(8);
        const rootedBase = new Int32Array(15);
        const total = new Int32Array(16);
        for (let rank = 0; rank < rootDeleted.length; rank++) {
          rootDeleted[rank] =
            (deletionWeighted[deletionIndex][rank] || 0)
            + (linkWeighted[linkIndex][rank] || 0);
          residual[rank] =
            (deletion[rank] || 0)
            + (rank ? (link[rank - 1] || 0) : 0);
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
          partitionChecks++;
          const item = {
            colored_vertices: coloredVertices,
            class_sizes: classSizes,
            deletion_index: deletionIndex,
            link_index: linkIndex,
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
          if (partitionMinimum === null || margin < partitionMinimum) {
            partitionMinimum = margin;
          }
          if (margin < 0) {
            failures++;
            firstFailure = item;
            break outer;
          }
        }
      }
    }
    const partitionReport = {
      colored_vertices: coloredVertices,
      class_sizes: classSizes,
      configurations: partitionConfigurations,
      checks: partitionChecks,
      minimum_cleared_margin: partitionMinimum,
    };
    byPartition.push(partitionReport);
    process.stdout.write(JSON.stringify(partitionReport) + "\n");
  }
}

const report = {
  status: failures ? "COUNTEREXAMPLE" : "PASS_NOT_PROOF",
  residual_vertices: 6,
  partition_shapes: byPartition.length,
  configurations,
  checks,
  failures,
  minimum_cleared_margin: minimumMargin,
  minimum_item: minimumItem,
  first_failure: firstFailure,
  by_partition: byPartition,
  elapsed_seconds: (Date.now() - started) / 1000,
};
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
process.exitCode = failures ? 1 : 0;
