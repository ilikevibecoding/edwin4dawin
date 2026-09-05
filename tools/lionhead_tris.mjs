#!/usr/bin/env node
// Head triangle budget per detail tier, straight from the generator in node.
//
//   node tools/lionhead_tris.mjs            # all kinds, tiers 0-2
//   node tools/lionhead_tris.mjs --kind male
//
// Counts the `body` builder (skull, muzzle, jaw, ears, eyes, lids) and the
// `alpha` builder (whiskers and the tail tuft strands) separately, so the
// tier 1-2 budget can be checked without a browser.
import { buildSkeleton } from '../src/wildlife/lion/rig.js';
import { KINDS } from '../src/wildlife/lion/spec.js';
import { DETAIL, SkinBuilder } from '../src/wildlife/lion/geometry.js';
import { addHead } from '../src/wildlife/lion/head.js';

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const kinds = arg('kind', 'male,lioness,cub').split(',');

for (const kind of kinds) {
  const skel = buildSkeleton(kind);
  const K = KINDS[kind];
  const rows = [];
  for (let t = 0; t < 3; t++) {
    const body = new SkinBuilder();
    const alpha = new SkinBuilder();
    const out = addHead(body, alpha, skel, K, DETAIL[t]) || {};
    const extra = out.mane ? out.mane.idx.length / 3 : 0;
    rows.push({ tier: t, head: body.idx.length / 3, strands: alpha.idx.length / 3, mane: extra });
  }
  console.log(kind, JSON.stringify(rows));
}
