#!/usr/bin/env node
// Water reflection probe. Renders the pool sheet with its intermediate terms as
// flat debug colour so the reflection lookup can be read off a frame instead of
// guessed at: `up` is the card's v coordinate, `az` its u, `fres` the mix.
//
//   node tools/gndwet2.mjs --out shots/gd_11/wet
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const base = arg('url', 'http://127.0.0.1:5183/');
const url = base + (base.includes('?') ? '&' : '?') + 'quality=fast&capture=1';
const outDir = arg('out', 'shots/wet2');
const eye = Number(arg('eye', '0.62'));
const back = Number(arg('back', '2.2'));
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 512, height: 288 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });

const out = await page.evaluate(
  async ([eye, back]) => {
    const { camera, terrain, vehicle, scene } = window.debugAPI.objects;
    window.debugAPI.setView('forest');
    vehicle.root.visible = false;
    const dust = scene.getObjectByName('wheelDust');
    if (dust) dust.visible = false;
    const water = terrain.water;
    const p = water.geometry.attributes.position.array;
    const a = water.geometry.attributes.aAlpha.array;
    const ring = 40;
    let best = { r: 0, x: 0, y: 0, z: 0 };
    for (let i = 0; i < a.length; i += ring + 1) {
      const cx = p[i * 3];
      const cz = p[i * 3 + 2];
      let span = 0;
      for (let k = 1; k <= ring && i + k < a.length; k++) span = Math.max(span, Math.hypot(p[(i + k) * 3] - cx, p[(i + k) * 3 + 2] - cz));
      if (span > best.r) best = { r: span, x: cx, y: p[i * 3 + 1], z: cz };
    }
    const d = Math.max(1.4, best.r * back);
    camera.position.set(best.x + d * 0.6, best.y + eye, best.z + d);
    camera.fov = 40;
    camera.lookAt(best.x, best.y, best.z);
    camera.updateProjectionMatrix();

    const keep = water.material.fragmentShader;
    const head = `
      uniform sampler2D uRipple, uCanopy;
      uniform vec3 uSunDir, uSunCol, uSkyTop, uSkyLow, uBody, uFog;
      uniform float uFogDensity, uTime;
      varying vec3 vWorld; varying float vAlpha; varying float vDepth;
      void main() {
        vec3 toCam = cameraPosition - vWorld;
        float dist = length( toCam ) + 1e-4;
        vec3 V = toCam / dist;
        vec3 N = vec3( 0.0, 1.0, 0.0 );
        vec3 R = reflect( -V, N );
        float up = clamp( R.y, -1.0, 1.0 );
        float az = atan( R.z, R.x + 1e-6 ) * 0.15915494 + 0.5;
        float f = clamp( dot( N, V ), 0.0, 1.0 );
        float fres = clamp( 0.1 + 0.9 * pow( 1.0 - f, 3.0 ), 0.0, 1.0 );
        vec3 refl = texture2D( uCanopy, vec2( az, clamp( max( up, 0.0 ), 0.004, 0.996 ) ) ).rgb;`;
    // A 0-1 scalar shown as a hard 8-band staircase, so a value can be read off
    // the frame instead of being guessed at through tone mapping and exposure.
    const band = (expr) => `${head}
      float q = floor( clamp( ${expr}, 0.0, 0.999 ) * 8.0 );
      vec3 bands[8];
      bands[0]=vec3(0,0,0); bands[1]=vec3(0.6,0,0); bands[2]=vec3(1,0.35,0); bands[3]=vec3(1,1,0);
      bands[4]=vec3(0,1,0); bands[5]=vec3(0,0.7,1); bands[6]=vec3(0.5,0,1); bands[7]=vec3(1,1,1);
      gl_FragColor = vec4( bands[ int( q ) ], 1.0 ); }`;
    const modes = {
      upband: band('up'),
      azband: band('fract( az * 4.0 )'),
      fresband: band('fres'),
      // the card sampled at fixed heights: if these show trunk bars the texture
      // is right and the lookup is wrong, if they do not it is the other way
      cardLow: `${head} gl_FragColor = vec4( texture2D( uCanopy, vec2( az, 0.12 ) ).rgb * 8.0, 1.0 ); }`,
      cardMid: `${head} gl_FragColor = vec4( texture2D( uCanopy, vec2( az, 0.35 ) ).rgb * 8.0, 1.0 ); }`,
      cardWide: `${head} gl_FragColor = vec4( texture2D( uCanopy, vec2( fract( az * 6.0 ), 0.35 ) ).rgb * 8.0, 1.0 ); }`,
      reflx8: `${head} gl_FragColor = vec4( refl * 8.0, 1.0 ); }`,
    };
    const shots = {};
    for (const [k, src] of Object.entries(modes)) {
      water.material.fragmentShader = src;
      water.material.transparent = false;
      water.material.needsUpdate = true;
      shots[k] = window.debugAPI.captureFrame(2);
    }
    water.material.fragmentShader = keep;
    water.material.transparent = true;
    water.material.needsUpdate = true;
    shots.real = window.debugAPI.captureFrame(2);
    vehicle.root.visible = true;
    if (dust) dust.visible = true;
    return { shots, r: best.r.toFixed(2), cam: [camera.position.x, camera.position.y, camera.position.z].map((v) => v.toFixed(2)) };
  },
  [eye, back],
);

for (const [k, v] of Object.entries(out.shots)) {
  const file = path.join(outDir, `w_${k}.png`);
  await writeFile(file, Buffer.from(v.split(',')[1], 'base64'));
  console.log(`[gndwet2] ${k} -> ${file}`);
}
console.log(`[gndwet2] pool r=${out.r} cam ${out.cam.join(' ')}`);
await browser.close();
