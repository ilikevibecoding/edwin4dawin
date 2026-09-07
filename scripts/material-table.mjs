// Prints the material classification of every painted tile (node, no browser):  node scripts/material-table.mjs
// Tiles that only matched a keyword rule are marked "(keyword)", tiles on the fallback class "<-- FALLBACK";
// both lists are repeated at the end so nothing is left unclassified by accident.
globalThis.ImageData = class ImageData {
  constructor(a, b, c) {
    if (typeof a === 'number') { this.width = a; this.height = b; this.data = new Uint8ClampedArray(a * b * 4); }
    else { this.data = a; this.width = b; this.height = c; }
  }
};
const T = await import('../src/textures.js');
const Mt = await import('../src/render/materials.js');

const names = [...T.TILE_NAMES, ...Array.from({ length: 10 }, (_, i) => 'destroy_' + i), 'sign:HOTEL:2'];
console.log(`${'tile'.padEnd(20)} ${'class'.padEnd(8)} parameters`);
for (const n of names) console.log(Mt.describe(n));

const byClass = {};
for (const n of names) { const c = Mt.classify(n).cls; (byClass[c] ||= []).push(n); }
console.log('\nper class:');
for (const c of Mt.MATERIAL_CLASSES) if (byClass[c]) console.log(`  ${c.padEnd(8)} ${byClass[c].length.toString().padStart(3)}  ${byClass[c].join(', ')}`);

const keyword = names.filter((n) => { const m = Mt.classify(n); return !m.explicit && !m.fallback; });
const fallback = names.filter((n) => Mt.classify(n).fallback);
console.log(`\nkeyword-classified (${keyword.length}): ${keyword.join(', ') || '-'}`);
console.log(`fallback (${fallback.length}): ${fallback.join(', ') || '-'}`);
const stale = Mt.EXPLICIT_TILE_NAMES.filter((n) => !T.TILE_NAMES.includes(n));
if (stale.length) console.log(`table entries without a painter: ${stale.join(', ')}`);
process.exit(fallback.length ? 1 : 0);
