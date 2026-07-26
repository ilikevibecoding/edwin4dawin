// Fable 3 QA: count meshes/triangles contributed by the props domain (budget: <=120 meshes).
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

const before = new Set();
scene.traverse((o) => { if (o.isMesh) before.add(o); });
placeProps(scene, world, map);

let meshes = 0, tris = 0;
const byName = new Map();
scene.traverse((o) => {
  if (!o.isMesh || before.has(o)) return;
  meshes++;
  const idx = o.geometry.index;
  const t = (idx ? idx.count : o.geometry.attributes.position.count) / 3;
  tris += t;
  let root = o;
  while (root.parent && root.parent !== scene) root = root.parent;
  const key = root.name || '(anon)';
  const e = byName.get(key) || { meshes: 0, tris: 0 };
  e.meshes++; e.tris += t;
  byName.set(key, e);
});
for (const [k, v] of [...byName].sort((a, b) => b[1].meshes - a[1].meshes)) {
  console.log(`${k.padEnd(14)} meshes ${String(v.meshes).padStart(3)}  tris ${Math.round(v.tris)}`);
}
console.log(`TOTAL props: ${meshes} meshes, ${Math.round(tris)} tris ${meshes <= 120 ? '(within <=120 budget)' : 'OVER BUDGET'}`);
