#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Framings and probes for the pride.
//
//   node tools/lions.mjs --iter 3 --url http://127.0.0.1:5196/ \
//     --views close,medium,far,seat,pride --time day --force stand
//   node tools/lions.mjs --walk 10 --out shots/lion_walk        # walk cycle frames
//   node tools/lions.mjs --probe 20                             # foot contact numbers
//   node tools/lions.mjs --views face,eye --lookcam               # head framings, looking into the lens
//
// The truck starts hundreds of metres from the lions and no beauty view can
// see them, so this puts the truck on the mainline beside WORLD.lions, takes
// auto-drive off, and frames the nearest lion from its own local space: in
// front of the face at 2 m, side-on at 8 m, back down the road at 40 m, and
// from the driver's seat. Every capture steps the wildlife simulation itself
// with the page frozen, so the same frame is the same picture every run.
//
// `--force <state>` drops every lion into one behaviour state and lets the
// pose settle before the shutter opens; `--walk N` forces a walk and writes N
// frames of it; `--probe S` runs S simulated seconds through walk, lie and sit
// and reports the worst planted-foot slide and the worst penetration, measured
// from the paw bone against terrain.heightAt() every frame.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const iter = arg('iter', '0');
const base = arg('url', 'http://127.0.0.1:5196/');
const quality = arg('quality', 'fast');
const time = arg('time', 'day');
const url = base + (base.includes('?') ? '&' : '?') + `quality=${quality}&capture=1&time=${time}`;
const width = Number(arg('width', '512'));
const height = Number(arg('height', '288'));
const outDir = arg('out', path.join('shots', `lion_${iter}`));
const only = arg('views', 'close,medium,far,seat');
const force = arg('force', '');
const target = Number(arg('lion', '-1'));
const walkFrames = Number(arg('walk', '0'));
const probeSec = Number(arg('probe', '0'));
const settle = Number(arg('settle', '4'));
const setCode = arg('set', '');
const flat = argv.includes('--flat');
const atlas = argv.includes('--atlas');
const truckOut = Number(arg('truck', '0'));
const lookCam = argv.includes('--lookcam');

// Camera placements in the target lion's frame: +z is where it faces, +x its
// right, +y up, origin on the ground under the body centre. `look` is the
// point the camera aims at, in the same frame; `bone` aims at a bone instead
// (plus `look` as an offset), so the face framing finds the face whatever the
// pose. `seat` is special-cased.
const FRAMINGS = {
  close: { pos: [0.9, 0.35, 1.6], bone: 'head', look: [0.0, -0.05, 0.0], fov: 34 },
  face: { pos: [0.3, 0.2, 1.1], bone: 'head', look: [0.0, 0.0, 0.05], fov: 26 },
  paws: { pos: [0.6, 0.24, 0.66], bone: 'pawFL', look: [0.0, 0.0, 0.0], fov: 32 },
  eye: { pos: [0.22, 0.09, 0.42], bone: 'lidL', look: [0.0, 0.0, 0.0], fov: 14 },
  medium: { pos: [6.2, 1.7, 4.6], look: [0.0, 0.55, 0.0], fov: 36 },
  side: { pos: [7.5, 1.4, 0.4], look: [0.0, 0.6, 0.0], fov: 32 },
  rear: { pos: [-4.5, 1.6, -6.0], look: [0.0, 0.6, 0.0], fov: 36 },
  far: { pos: [28, 4.5, 28], look: [0.0, 0.5, 0.0], fov: 30 },
  pride: { pos: [-12, 7, 18], look: [2.0, 0.4, 2.0], fov: 46, anchor: true },
  seat: { seat: true },
};

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
// Other agents save files while this runs; without this Vite's HMR client
// reloads the page mid-capture and the evaluate context is destroyed.
await page.addInitScript(() => {
  const W = window.WebSocket;
  window.WebSocket = function (url, protocols) {
    const p = Array.isArray(protocols) ? protocols : protocols ? [protocols] : [];
    if (p.includes('vite-hmr') || String(url).includes('token=')) {
      const dead = { readyState: 3, send() {}, close() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false };
      return dead;
    }
    return new W(url, protocols);
  };
  window.WebSocket.prototype = W.prototype;
  window.WebSocket.CONNECTING = 0;
  window.WebSocket.OPEN = 1;
  window.WebSocket.CLOSING = 2;
  window.WebSocket.CLOSED = 3;
});
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') console.error(`[console:${m.type()}]`, m.text());
});

const t0 = Date.now();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__READY__ === true || window.__ERROR__, null, { timeout: 900000 });
const err = await page.evaluate(() => window.__ERROR__ || null);
if (err) {
  console.error('boot failed:\n' + err);
  await browser.close();
  process.exit(1);
}
console.log(`[lions] booted in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

// Shared page-side setup: freeze the loop, park the truck on the mainline beside
// the pride pointing along the road, pick the target lion, and expose helpers.
const info = await page.evaluate(
  ({ force, target, settle, setCode, flat, truckOut }) => {
    const api = window.debugAPI;
    const { terrain, driver, vehicle, wildlife, camera } = api.objects;
    api.pause();
    const a = wildlife.anchor;
    // the road point the pride is anchored to, or `truckOut` metres off it toward the pride
    const t = 0.84;
    const p = terrain.mainPoint(t);
    const tan = terrain.mainTangent(t);
    if (truckOut > 0) {
      const dx = a.x - p.x;
      const dz = a.z - p.z;
      const d = Math.hypot(dx, dz) || 1;
      p.x += (dx / d) * truckOut;
      p.z += (dz / d) * truckOut;
      p.y = terrain.heightAt(p.x, p.z);
    }
    driver.state.auto = false;
    driver.state.speed = 0;
    driver.state.pos.set(p.x, p.y, p.z);
    driver.state.heading = Math.atan2(tan.x, tan.z);
    for (let i = 0; i < 90; i++) driver.update(1 / 60);
    vehicle.root.updateMatrixWorld(true);
    // the frame loop moves the shadow frustum with the truck; a tool that
    // teleports the truck has to do the same or the frame shows a world the
    // player never sees — one with no shadows within a hundred metres
    api.objects.skyRig?.follow(vehicle.root.position);
    if (flat) {
      // clay render: one matte grey on every skinned part, shells and strands off
      const THREE_Mat = wildlife.lions[0].coat.constructor;
      const clay = new THREE_Mat({ color: 0x9a9088, roughness: 0.85, metalness: 0 });
      wildlife.group.traverse((o) => {
        if (!o.isSkinnedMesh) return;
        if (/shells|fuzz|strands|cornea/.test(o.name)) o.visible = false;
        else o.material = clay;
      });
    }

    const lions = wildlife.lions;
    let li = target;
    if (li < 0) {
      // nearest lion to the truck
      let bd = 1e9;
      lions.forEach((l, i) => {
        const d = l.root.position.distanceTo(vehicle.root.position);
        if (d < bd) {
          bd = d;
          li = i;
        }
      });
    }
    window.__lion = lions[li];
    // `__gaze` swaps the truck for another point of interest (the camera, for
    // the close framings) without the alarm that a truck that close would raise
    window.__gaze = null;
    window.__truck = () => ({ vehiclePos: window.__gaze || vehicle.root.position, vehicleSpeed: driver.state.speed, throttle: driver.input.throttle, camera });
    window.__sim = (seconds, dt = 1 / 30) => {
      const n = Math.round(seconds / dt);
      for (let i = 0; i < n; i++) {
        window.__t = (window.__t || 0) + dt;
        const alarms = window.__gaze ? lions.map((l) => l.brain.alarm) : null;
        wildlife.update(dt, window.__t, window.__truck());
        if (alarms) lions.forEach((l, k) => (l.brain.alarm = alarms[k]));
      }
    };
    if (setCode) new Function('wildlife', 'lion', 'terrain', 'driver', setCode)(wildlife, window.__lion, terrain, driver);
    if (force) {
      for (const l of lions) {
        l.brain.enter(force);
        l.brain.dwell = 1e9;
        l.brain.alarm = 0;
      }
    }
    window.__sim(settle);
    const st = api.stats();
    return {
      lion: li,
      kind: lions[li].kind,
      state: lions[li].state,
      pos: lions[li].root.position.toArray().map((v) => +v.toFixed(2)),
      truck: vehicle.root.position.toArray().map((v) => +v.toFixed(2)),
      tiers: wildlife.stats.tiers,
      calls: wildlife.stats.calls,
      tris: wildlife.stats.tris,
      scene: st,
    };
  },
  { force, target, settle, setCode, flat, truckOut },
);
console.log(`[lions] target #${info.lion} ${info.kind} (${info.state}) at ${info.pos} truck at ${info.truck}`);
console.log(`[lions] per-lion tiers (tris):`, JSON.stringify(info.tiers));
console.log(`[lions] scene stats:`, JSON.stringify(info.scene));

if (atlas) {
  // the canvases behind the textures, as they are
  const dumps = await page.evaluate(() => {
    const lion = window.__lion;
    const male = window.debugAPI.objects.wildlife.lions.find((l) => l.kind === 'male') || lion;
    const grab = (tex) => (tex && tex.image && tex.image.toDataURL ? tex.image.toDataURL('image/png') : null);
    return {
      coat: grab(lion.coat.map),
      normal: null,
      mane: grab(male.maneMat ? male.maneMat.map : null),
      alpha: grab(lion.tiers[0].children.find((c) => /strands/.test(c.name))?.material.map),
      fuzz: grab(lion.fuzzMat.alphaMap),
    };
  });
  for (const [k, v] of Object.entries(dumps)) {
    if (!v) continue;
    const file = path.join(outDir, `atlas_${k}.png`);
    await writeFile(file, Buffer.from(v.split(',')[1], 'base64'));
    console.log(`[lions] atlas ${k} -> ${file}`);
  }
}

async function capture(name, framing, frameIdx = -1) {
  const ts = Date.now();
  const out = await page.evaluate(
    ({ f, name, lookCam }) => {
      const api = window.debugAPI;
      const { camera, vehicle, wildlife } = api.objects;
      const lion = window.__lion;
      lion.root.updateMatrixWorld(true);
      if (f.seat) {
        // driver's eye, turned toward the lion
        const e = vehicle.root.matrixWorld.elements;
        const xf = (v) => [e[0] * v[0] + e[4] * v[1] + e[8] * v[2] + e[12], e[1] * v[0] + e[5] * v[1] + e[9] * v[2] + e[13], e[2] * v[0] + e[6] * v[1] + e[10] * v[2] + e[14]];
        const p = xf([0.38, 1.62, 0.02]);
        camera.position.set(p[0], p[1], p[2]);
        camera.fov = 50;
        const lp = lion.root.position;
        camera.lookAt(lp.x, lp.y + 0.7, lp.z);
      } else {
        const origin = f.anchor ? { x: wildlife.anchor.x, y: wildlife.anchor.y, z: wildlife.anchor.z, yaw: 0 } : { x: lion.root.position.x, y: lion.root.position.y, z: lion.root.position.z, yaw: lion.brain.yaw };
        const w = (v) => {
          const c = Math.cos(origin.yaw);
          const s = Math.sin(origin.yaw);
          return [origin.x + v[0] * c + v[2] * s, origin.y + v[1], origin.z - v[0] * s + v[2] * c];
        };
        let l = w(f.look);
        let p = w(f.pos);
        if (f.bone) {
          // aim at (and hang the camera off) the bone's current world position
          const bone = lion.skel.boneByName.get(f.bone);
          const bp = bone.getWorldPosition(new lion.root.position.constructor());
          const c = Math.cos(origin.yaw);
          const s = Math.sin(origin.yaw);
          const rot = (v) => [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c];
          const lo = rot(f.look);
          const po = rot(f.pos);
          l = [bp.x + lo[0], bp.y + lo[1], bp.z + lo[2]];
          p = [bp.x + po[0], bp.y + po[1], bp.z + po[2]];
        }
        camera.position.set(p[0], p[1], p[2]);
        camera.fov = f.fov;
        camera.lookAt(l[0], l[1], l[2]);
        if (f.bone && lookCam) {
          // the animal looks into the lens for the head framings
          window.__gaze = camera.position.clone();
          window.__sim(2.5);
          window.__gaze = null;
        }
      }
      camera.updateProjectionMatrix();
      // one zero-length step so the LOD picks the tier for this camera
      wildlife.update(1e-3, window.__t || 0, window.__truck());
      const dataUrl = api.captureFrame(2);
      const luma = api.sampleLuma();
      const h = (n) => +lion.skel.boneByName.get(n).getWorldPosition(new lion.root.position.constructor()).sub(lion.root.position).y.toFixed(3);
      const body = { fit: { hip: +lion.fit.hip.toFixed(3), chest: +lion.fit.chest.toFixed(3) }, ground: { hip: +lion.ground.hip.toFixed(3), chest: +lion.ground.chest.toFixed(3) }, pelvis: h('pelvis'), chest: h('chest'), head: h('head'), hipH: +lion.brain.pose.hipH.toFixed(2), chestH: +lion.brain.pose.chestH.toFixed(2), speed: +lion.brain.speed.toFixed(2) };
      return { dataUrl, luma, tier: lion.tier, state: lion.state, stats: api.stats(), body };
    },
    { f: framing, name, lookCam },
  );
  const file = path.join(outDir, frameIdx >= 0 ? `${name}_${String(frameIdx).padStart(2, '0')}.png` : `lion_${name}${time === 'day' ? '' : '_' + time}.png`);
  await writeFile(file, Buffer.from(out.dataUrl.split(',')[1], 'base64'));
  console.log(
    `[lions] ${name}${frameIdx >= 0 ? ' #' + frameIdx : ''} -> ${file} (${((Date.now() - ts) / 1000).toFixed(1)}s, luma ${out.luma.mean.toFixed(3)}/${out.luma.max.toFixed(2)}, tier ${out.tier}, ${out.state}, calls ${out.stats.calls}, tris ${out.stats.triangles}) body ${JSON.stringify(out.body)}`,
  );
  if (out.luma.mean < 0.02) console.error(`[lions] WARNING: ${name} came back essentially black`);
}

if (probeSec > 0) {
  const rep = await page.evaluate(
    ({ probeSec }) => {
      const { wildlife, terrain } = window.debugAPI.objects;
      const lions = wildlife.lions;
      const dt = 1 / 60;
      const res = {};
      const worst = { pen: 0, slide: 0, float: 0, reach: 0, penAt: null, slideAt: null, floatAt: null, reachAt: null };
      const prev = new Map();
      const run = (label, seconds, setup) => {
        for (const l of lions) setup(l.brain);
        let pen = 0;
        let slide = 0;
        let fl = 0;
        let reach = 0;
        let frames = 0;
        let plantedSamples = 0;
        let swingSamples = 0;
        let stepsSeen = 0;
        for (let i = 0; i < seconds * 60; i++) {
          window.__t = (window.__t || 0) + dt;
          for (const l of lions) l.step(dt, { x: 1e4, z: 1e4, speed: 0, throttle: 0 });
          lions.forEach((l, li) => {
            const rep = l.footReport();
            for (const f of rep) {
              const g = terrain.heightAt(f.x, f.z);
              const key = li + ':' + f.name;
              // how far the solved leg missed the contact the foot is meant to be on
              const r = Math.hypot(f.x - f.cx, f.y - f.cy, f.z - f.cz);
              if (r > reach) {
                reach = r;
                if (r > worst.reach) worst.reachAt = `${label} ${l.kind} ${f.name} ${l.state} ${f.planted ? 'planted' : 'swing'}`;
              }
              const pv = prev.get(key);
              if (f.planted) {
                plantedSamples++;
                const p = g - f.y;
                if (p > pen) {
                  pen = p;
                  if (p > worst.pen) worst.penAt = `${label} ${l.kind} ${f.name} ${l.state}`;
                }
                if (-p > fl) {
                  fl = -p;
                  if (-p > worst.float) worst.floatAt = `${label} ${l.kind} ${f.name} ${l.state}`;
                }
                if (pv && pv.planted) {
                  const d = Math.hypot(f.x - pv.x, f.z - pv.z);
                  if (d > slide) {
                    slide = d;
                    if (d > worst.slide) worst.slideAt = `${label} ${l.kind} ${f.name} ${l.state}`;
                  }
                }
              } else {
                swingSamples++;
                if (pv && pv.planted) stepsSeen++;
              }
              prev.set(key, f);
            }
          });
          frames++;
        }
        res[label] = { maxPenetration_m: pen, maxFloat_m: fl, maxPlantedSlide_m: slide, maxReachError_m: reach, frames, plantedSamples, swingSamples, steps: stepsSeen };
        worst.pen = Math.max(worst.pen, pen);
        worst.slide = Math.max(worst.slide, slide);
        worst.float = Math.max(worst.float, fl);
        worst.reach = Math.max(worst.reach, reach);
      };
      run('walk', probeSec, (b) => {
        b.enter('stand');
        b.blend = 1;
        Object.assign(b.pose, b.to);
        b.enter('walk');
        b.dest = { x: b.pos.x + Math.sin(b.yaw + 0.4) * 9, z: b.pos.z + Math.cos(b.yaw + 0.4) * 9 };
        b.dwell = 1e9;
        b.alarm = 0;
      });
      run('lie', probeSec * 0.5, (b) => {
        b.enter('lie');
        b.dwell = 1e9;
      });
      run('sit', probeSec * 0.5, (b) => {
        b.enter('sit');
        b.dwell = 1e9;
      });
      run('stretch', probeSec * 0.3, (b) => {
        b.enter('stretch');
        b.dwell = 1e9;
      });
      res.worst = worst;
      return res;
    },
    { probeSec },
  );
  console.log('[lions] foot probe:', JSON.stringify(rep, null, 1));
  // the probe leaves the pride in its last state; put the forced one back
  await page.evaluate(
    ({ force, settle }) => {
      const { wildlife } = window.debugAPI.objects;
      for (const l of wildlife.lions) {
        l.brain.enter(force || 'lie');
        l.brain.dwell = 1e9;
        l.brain.alarm = 0;
      }
      window.__sim(settle);
    },
    { force, settle },
  );
}

const names = only ? only.split(',').filter(Boolean) : [];
// `--states a,b` shoots the framings once per forced state, suffixing the files
const states = arg('states', '').split(',').filter(Boolean);
for (const st of states.length ? states : [null]) {
  if (st) {
    await page.evaluate(
      ({ st, settle }) => {
        const { wildlife } = window.debugAPI.objects;
        for (const l of wildlife.lions) {
          l.brain.enter(st);
          l.brain.dwell = 1e9;
          l.brain.alarm = 0;
        }
        window.__sim(settle);
      },
      { st, settle },
    );
  }
  for (const name of names) {
    const f = FRAMINGS[name];
    if (!f) {
      console.error(`[lions] no framing "${name}"`);
      continue;
    }
    await capture(st ? `${name}_${st}` : name, f);
  }
}

if (walkFrames > 0) {
  // force the target to walk straight ahead and shoot it side-on as it goes
  await page.evaluate(() => {
    const lion = window.__lion;
    const b = lion.brain;
    b.enter('stand');
    b.blend = 1;
    Object.assign(b.pose, b.to);
    window.__sim(0.5);
    b.enter('walk');
    b.dest = { x: b.pos.x + Math.sin(b.yaw) * 7, z: b.pos.z + Math.cos(b.yaw) * 7 };
    b.dwell = 1e9;
    window.__sim(2.0);
  });
  for (let i = 0; i < walkFrames; i++) {
    await capture('walk', { pos: [6.0, 1.3, 0.6], look: [0.0, 0.55, 0.3], fov: 30 }, i);
    await page.evaluate(() => window.__sim(0.12));
  }
}
await browser.close();
