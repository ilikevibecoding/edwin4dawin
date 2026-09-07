#!/usr/bin/env node
import { chromium } from 'playwright';

// ---------------------------------------------------------------------------
// What the quality tier actually built.
//
//   node tools/gpuprobe.mjs --url http://127.0.0.1:5391/?quality=ultra
//
// Boots and reports the settings that decide the frame — shadow filter and
// box, SSR permutation and how many objects it classified, environment map
// size, shaft and beam counts — without rendering anything. A silent fallback
// (PCSS not installing, SSR classifying nothing) looks exactly like a working
// build in a screenshot, which is the whole reason this exists.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const base = arg('url', 'http://127.0.0.1:5391/?quality=ultra');
const url = base + (base.includes('?') ? '&' : '?') + 'capture=1';

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
const warnings = [];
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') warnings.push(`${m.type()}: ${m.text()}`);
});
page.on('pageerror', (e) => warnings.push(`pageerror: ${e.message}`));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });

const out = await page.evaluate(() => {
  const { scene, renderer, post } = window.debugAPI.objects;
  const SHADOW = ['BasicShadowMap', 'PCFShadowMap', 'PCFSoftShadowMap', 'VSMShadowMap'];
  let sun = null;
  const shafts = [];
  let beamSlices = 0;
  let beams = 0;
  scene.traverse((o) => {
    if (o.isDirectionalLight && o.castShadow && !sun) sun = o;
    if (o.material && o.material.name === 'sunShaft') {
      shafts.push({
        shadowed: 'SHAFT_SHADOW' in (o.material.defines || {}),
        map: !!o.material.uniforms.uShadowMap.value,
        gate: o.material.uniforms.uShadowGate.value,
        soft: +o.material.uniforms.uShadowSoft.value.toFixed(6),
      });
    }
    if (o.material && o.material.name === 'headlightBeam') {
      beams++;
      beamSlices = o.geometry.attributes.position.count / 4 - 1;
    }
  });

  let ssrObjects = 0;
  let ssrByClass = {};
  scene.traverse((o) => {
    if (o.userData && o.userData.__ssr) {
      ssrObjects++;
      const key = (Array.isArray(o.material) ? o.material[0] : o.material)?.name || o.name;
      ssrByClass[key] = (ssrByClass[key] || 0) + 1;
    }
  });

  const ssr = post.passes.ssr;
  return {
    quality: post.quality,
    shadow: {
      type: SHADOW[renderer.shadowMap.type] ?? renderer.shadowMap.type,
      pcss: renderer.shadowMap.type === 0,
      mapSize: sun ? sun.shadow.mapSize.x : null,
      extent: sun ? sun.shadow.camera.right : null,
      metresPerTexel: sun ? +((2 * sun.shadow.camera.right * 1000) / sun.shadow.mapSize.x).toFixed(2) + 'mm' : null,
      near: sun ? sun.shadow.camera.near : null,
      far: sun ? sun.shadow.camera.far : null,
      bias: sun ? +sun.shadow.bias.toFixed(7) : null,
      normalBias: sun ? +sun.shadow.normalBias.toFixed(4) : null,
      radius: sun ? sun.shadow.radius : null,
      allocated: sun && sun.shadow.map ? `${sun.shadow.map.width}x${sun.shadow.map.height}` : 'not yet rendered',
    },
    ssr: ssr
      ? {
          enabled: ssr.enabled,
          defines: ssr.material.defines,
          maxDistance: ssr.material.uniforms.uMaxDistance.value,
          thickness: ssr.material.uniforms.uThickness.value,
          stepBase: +ssr.material.uniforms.uStepBase.value.toFixed(4),
          strength: ssr.material.uniforms.uStrength.value,
          target: `${ssr.reflectRT.width}x${ssr.reflectRT.height}`,
          depthBound: !!ssr.depthTexture,
          classified: ssrObjects,
          byClass: ssrByClass,
        }
      : null,
    ao: {
      samples: post.passes.gtao.gtaoMaterial.defines.SAMPLES,
      pdSamples: post.passes.gtao.pdMaterial.defines.SAMPLES,
      blend: post.passes.gtao.blendIntensity,
      radius: post.passes.gtao.gtaoMaterial.uniforms.radius.value,
    },
    env: (() => {
      const { skyRig } = window.debugAPI.objects;
      const rt = skyRig.envTarget;
      const info = {
        present: !!scene.environment,
        size: scene.environment ? `${scene.environment.image?.width}x${scene.environment.image?.height}` : null,
        intensity: scene.environmentIntensity,
      };
      // Read the environment back rather than trusting that it has anything in
      // it. A PMREM whose far plane clipped the entire scene is a valid
      // texture full of clear colour, and nothing in the scene graph says so.
      try {
        const w = Math.min(rt.width, 64);
        const h = Math.min(rt.height, 64);
        const buf = new Uint16Array(w * h * 4);
        const gl = renderer.getContext();
        renderer.setRenderTarget(rt);
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.HALF_FLOAT, buf);
        renderer.setRenderTarget(null);
        const half = (u) => {
          const s = (u & 0x8000) >> 15;
          const e = (u & 0x7c00) >> 10;
          const f = u & 0x03ff;
          const v = e === 0 ? Math.pow(2, -14) * (f / 1024) : e === 31 ? (f ? NaN : Infinity) : Math.pow(2, e - 15) * (1 + f / 1024);
          return s ? -v : v;
        };
        let sum = 0;
        let max = 0;
        let nan = 0;
        for (let i = 0; i < w * h; i++) {
          const r = half(buf[i * 4]);
          const g = half(buf[i * 4 + 1]);
          const b = half(buf[i * 4 + 2]);
          if (!(r === r) || !(g === g) || !(b === b)) nan++;
          const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          sum += l;
          if (l > max) max = l;
        }
        info.readback = {
          sampled: `${w}x${h} of ${rt.width}x${rt.height}`,
          meanLuma: +(sum / (w * h)).toFixed(5),
          maxLuma: +max.toFixed(4),
          nanPixels: nan,
        };
      } catch (e) {
        info.readback = { error: String(e) };
      }
      return info;
    })(),
    shafts: { count: shafts.length, ...(shafts[0] || {}) },
    beams: { meshes: beams, slices: beamSlices },
    // The AO prepass hides every depth-write-off mesh with a per-frame
    // traverse, so the size of the graph it walks is part of that pass's cost.
    graph: (() => {
      let nodes = 0;
      let drawables = 0;
      let noDepthWrite = 0;
      scene.traverse((o) => {
        nodes++;
        if (!o.isMesh && !o.isInstancedMesh) return;
        drawables++;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        if (!mats.some((m) => m && m.depthWrite !== false)) noDepthWrite++;
      });
      return { nodes, drawables, noDepthWrite };
    })(),
    pixelRatio: renderer.getPixelRatio(),
    drawingBuffer: `${renderer.domElement.width}x${renderer.domElement.height}`,
    smaa: post.passes.smaa.enabled,
  };
});
console.log(JSON.stringify(out, null, 1));
if (warnings.length) console.log('warnings:\n  ' + warnings.join('\n  '));
await browser.close();
