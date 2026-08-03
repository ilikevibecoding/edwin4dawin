#!/usr/bin/env node
import { chromium } from 'playwright';

// ---------------------------------------------------------------------------
// How many times does the foliage write each pixel?
//
//   node tools/folcost.mjs --url http://127.0.0.1:5292/?quality=fast --view forest
//
// Overdraw is the one budget alpha-tested cards can actually run out of, and it
// cannot be measured with a stopwatch here: this box rasterises in software and
// shares four cores with three other agents, so a frame time moves by 25 per
// cent between two identical renders. Counting fragments instead is exact.
//
// Every forest mesh is swapped for an additive constant that keeps the same map
// and alpha cut, so one surviving fragment adds a known amount; the frame is
// then summed. The result is the mean number of alpha-passing layers over the
// visible frame, per group and in total, plus the instance and triangle
// inventory behind each. That number times the pixel count is the fill a GPU
// has to find, and it is comparable between runs on any machine.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const url = arg('url', 'http://127.0.0.1:5292/?quality=fast') + '&capture=1';
const view = arg('view', 'forest');
const width = Number(arg('width', '320'));
const height = Number(arg('height', '180'));

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--js-flags=--max-old-space-size=4096',
  ],
});
const page = await browser.newPage({ viewport: { width, height } });
page.on('pageerror', (e) => console.error('[folcost] page error:', e.message));
await page.route('**/@vite/client', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });

const GROUPS = [
  ['tree', /^tree_[a-z]+_/],
  ['treeLod', /^tree_[a-z]+Lod_/],
  ['treeFar', /^treeFar/],
  ['fern', /^fern/],
  ['shrub', /^shrub/],
  ['grass', /^grass/],
  ['broad', /^broad/],
  ['understory', /^understory/],
  ['stalk', /^stalk/],
  ['litter', /^litter/],
  ['sapling', /^sapling/],
];

const result = await page.evaluate(
  async ([groups, view]) => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const { renderer, scene, camera, forest } = window.debugAPI.objects;
    window.debugAPI.setView(view);
    window.debugAPI.renderFrames(1);

    // A quantum small enough that a deep stack of cards cannot clip an 8-bit
    // channel, large enough to survive the readback: 32 layers reach full white.
    const STEP = 8;
    // Not MeshBasicMaterial: that multiplies the constant by the atlas colour,
    // and a foliage atlas is dark, so every count came back as a rounding
    // error. Only the alpha of the map is wanted here.
    const probes = new Map();
    let probeDepth = true;
    const probeFor = (mat) => {
      let p = probes.get(mat);
      if (!p) {
        p = new THREE.ShaderMaterial({
          uniforms: { tMap: { value: mat.map }, uCut: { value: mat.alphaTest ?? 0 }, uStep: { value: STEP / 255 } },
          vertexShader: `
            varying vec2 vAtlasUv;
            void main() {
              vAtlasUv = uv;
              vec4 p = vec4( position, 1.0 );
              #ifdef USE_INSTANCING
                p = instanceMatrix * p;
              #endif
              gl_Position = projectionMatrix * modelViewMatrix * p;
            }`,
          fragmentShader: `
            uniform sampler2D tMap;
            uniform float uCut;
            uniform float uStep;
            varying vec2 vAtlasUv;
            void main() {
              if ( texture2D( tMap, vAtlasUv ).a < uCut ) discard;
              gl_FragColor = vec4( vec3( uStep ), 1.0 );
            }`,
          side: mat.side,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          depthTest: probeDepth,
          toneMapped: false,
          fog: false,
        });
        probes.set(mat, p);
      }
      return p;
    };

    // The whole scene, not just the forest: anything left visible writes its own
    // opaque colour into the same buffer and swamps the count.
    const meshes = [];
    scene.traverse((o) => {
      if (o.isMesh || o.isInstancedMesh || o.isPoints || o.isSprite) meshes.push(o);
    });
    const inForest = new Set();
    forest.group.traverse((o) => inForest.add(o));

    const rt = new THREE.WebGLRenderTarget(renderer.domElement.width, renderer.domElement.height, {
      type: THREE.UnsignedByteType,
      colorSpace: THREE.NoColorSpace,
    });
    const buf = new Uint8Array(rt.width * rt.height * 4);
    const px = rt.width * rt.height;

    // Depth-tested, so a card hidden behind a trunk or a hillside is not
    // counted: the whole scene is drawn once to populate depth, then the colour
    // buffer alone is cleared and the probes are drawn against that depth.
    // Without it the count is an upper bound that credits the far verge with
    // fill it never pays.
    const measure = (test, depthTest) => {
      probeDepth = depthTest;
      for (const p of probes.values()) p.depthTest = depthTest;
      const prevBg = scene.background;
      const prevFog = scene.fog;
      scene.background = null;
      scene.fog = null;
      renderer.setRenderTarget(rt);
      renderer.setClearColor(0x000000, 1);
      renderer.clear();
      renderer.render(scene, camera);

      const saved = [];
      for (const m of meshes) {
        saved.push([m, m.visible, m.material]);
        if (inForest.has(m) && test(m)) m.material = probeFor(m.material);
        else m.visible = false;
      }
      renderer.autoClear = false;
      renderer.clearColor();
      renderer.render(scene, camera);
      renderer.autoClear = true;
      renderer.readRenderTargetPixels(rt, 0, 0, rt.width, rt.height, buf);
      renderer.setRenderTarget(null);
      scene.background = prevBg;
      scene.fog = prevFog;
      for (const [m, vis, mat] of saved) {
        m.visible = vis;
        m.material = mat;
      }
      let sum = 0;
      for (let i = 0; i < buf.length; i += 4) sum += buf[i];
      return sum / STEP / px;
    };

    const inv = {};
    for (const [name, re] of groups) {
      const rx = new RegExp(re.source ?? re);
      let instances = 0;
      let tris = 0;
      let n = 0;
      for (const m of meshes) {
        if (!rx.test(m.name)) continue;
        n++;
        instances += m.count ?? 1;
        const g = m.geometry;
        tris += ((g.index ? g.index.count : g.attributes.position?.count ?? 0) / 3) * (m.count ?? 1);
      }
      if (!n) continue;
      inv[name] = {
        meshes: n,
        instances,
        ktris: Math.round(tris / 1000),
        drawn: measure((m) => rx.test(m.name), false),
        kept: measure((m) => rx.test(m.name), true),
      };
    }
    const isFoliage = (m) => !!m.material?.userData?.foliage;
    const all = measure(isFoliage, false);
    const allKept = measure(isFoliage, true);
    rt.dispose();
    for (const p of probes.values()) p.dispose();
    window.debugAPI.renderFrames(1);
    return { inv, all, allKept, px };
  },
  [GROUPS.map(([n, re]) => [n, re.source]), view],
);

const rows = Object.entries(result.inv).sort((a, b) => b[1].drawn - a[1].drawn);
console.log(
  `[folcost] ${view} ${width}x${height} — foliage fragments per pixel: ${result.all.toFixed(2)} shaded, ` +
    `${result.allKept.toFixed(2)} reaching the frame`,
);
for (const [name, r] of rows) {
  console.log(
    `  ${name.padEnd(11)} ${r.drawn.toFixed(2).padStart(6)} shaded ${r.kept.toFixed(2).padStart(6)} kept  ` +
      `${String(r.meshes).padStart(3)} meshes  ${String(r.instances).padStart(6)} inst  ${String(r.ktris).padStart(5)} ktri`,
  );
}
await browser.close();
