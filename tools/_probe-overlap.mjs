// Fable 3 QA: report prop colliders that intersect architecture colliders (columns, planters)
// and prop colliders that intersect each other suspiciously. Headless (same stubs as nav-props).
global.window = { addEventListener() {}, __consoleErrors: [], location: { search: '' } };
global.document = {
  createElement: () => ({
    width: 0, height: 0, style: {},
    getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }),
    addEventListener() {},
  }),
  addEventListener() {},
};
global.localStorage = { getItem: () => null, setItem() {} };
global.performance = global.performance || { now: () => Date.now() };

const THREE = await import('three');
const { CollisionWorld } = await import('../src/core/collide.js');
const { buildMap } = await import('../src/map/builder.js');
const { placeProps } = await import('../src/props/index.js');

const scene = new THREE.Scene();
const world = new CollisionWorld();
const map = buildMap(scene, world);
const arch = world.colliders.filter((c) => c.tag === 'column' || c.tag === 'planter');
placeProps(scene, world, map);
const props = world.colliders.filter((c) => c.tag === 'prop');

const overlap = (a, b) =>
  a.min.x < b.max.x && a.max.x > b.min.x &&
  a.min.y < b.max.y && a.max.y > b.min.y &&
  a.min.z < b.max.z && a.max.z > b.min.z;
const fmt = (c) => `[${c.min.x.toFixed(2)},${c.min.y.toFixed(2)},${c.min.z.toFixed(2)}]..[${c.max.x.toFixed(2)},${c.max.y.toFixed(2)},${c.max.z.toFixed(2)}]`;

let bad = 0;
for (const a of arch) {
  for (const p of props) {
    if (overlap(a, p)) {
      bad++;
      console.log(`OVERLAP ${a.tag} ${fmt(a)}  x  prop(${p.material}) ${fmt(p)}`);
    }
  }
}
console.log(bad ? `${bad} architecture/prop overlap(s)` : 'no architecture/prop overlaps');
process.exit(bad ? 1 : 0);
