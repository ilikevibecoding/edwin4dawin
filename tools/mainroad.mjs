#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Buffer } from 'node:buffer';

// ---------------------------------------------------------------------------
// Framings for the gravel mainline and the junction it meets the trail at.
//
//   node tools/mainroad.mjs --iter 1 --url http://127.0.0.1:5194/ \
//     --views arrive,down,cross,plan,junc,surface
//
// Every existing beauty view and every road diagnostic is anchored to the trail
// and frames the truck, so none of them can see the second road at all. These
// are anchored to the *junction*, which is the one place both roads exist, and
// they put the truck on the graded surface rather than beside it — a road
// nobody can be shown driving on has not been added to anything.
//
// Placement is by road parameter: the truck is dropped on the mainline at
// `mainT`, auto-drive is taken off so it stops steering back to the trail, and
// the suspension is given ninety steps to settle before the shutter opens.
//
// Colour ratios are reported the same way roadview.mjs reports them, because
// the whole feature turns on the two surfaces reading as different substances
// and "is this greyer than that" is not a judgement to make by eye through
// ACES. `gravel r:b` should sit near 1.2 against the trail's 1.7.
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const iter = arg('iter', '0');
const base = arg('url', 'http://127.0.0.1:5194/');
const url = base + (base.includes('?') ? '&' : '?') + 'quality=fast&capture=1';
const width = Number(arg('width', '512'));
const height = Number(arg('height', '288'));
const outDir = arg('out', path.join('shots', `mr_${iter}`));
const only = arg('views', '');
const setCode = arg('set', '');
const bare = argv.includes('--bare');
const suffix = arg('suffix', '');

// Camera placements in an anchor's own frame: +u runs along the mainline in the
// direction of increasing arc length, +v is to its left, +y is up. Anchored to
// a point on the road rather than to the truck, so the same framing is the same
// picture whatever the truck is doing in it.
//
// `anchor` offsets that point along the mainline from the junction, and it
// matters more than it looks: the apron is deliberately forty metres of scuffed
// gravel with mud dragged onto it, so a framing anchored at the junction is
// measuring the junction and not the road. Every hue reading taken before this
// existed was of the apron.
//
// `on` is where the truck goes: [road, t] with road 'main' or 'trail'.
const FRAMINGS = {
  // Coming up the spur about to meet the mainline. The shot the whole feature
  // is for: if this does not read as arriving somewhere, nothing else matters.
  // `trailCam` places the camera on the trail itself — [ dt, height, lateral ]
  // against the junction's trail parameter — because the approach is the point
  // and the approach is not in the mainline's frame.
  // The camera has to be further from the junction than the truck is and high
  // enough to see over it. At 1.55 m with the truck 12 m ahead the first three
  // versions of this framing were a photograph of a tailgate with a berm behind
  // it, and the junction being invisible in them was read as the junction not
  // carrying rather than as the truck standing in front of it. The spur runs
  // 427 m, so a t of 0.01 is 4.3 m.
  arrive: { trailCam: [-0.035, 2.6, 0.0], target: [0.0, 0.4, 0.0], fov: 54, on: ['trail', -0.012] },
  // Same approach, from the driver's eyeline, closer in.
  arrive2: { trailCam: [-0.022, 2.1, -0.6], target: [1.0, 0.3, 0.8], fov: 58, on: ['trail', -0.007] },
  // The junction from off to one side: the spur mouth, the apron and the
  // mainline all in one frame. This is the picture of the feature.
  mouth: { pos: [-26.0, 9.0, -19.0], target: [1.0, 0.0, 1.0], fov: 40, on: ['trail', -0.012] },
  // Down the mainline from behind the truck, on the road. Crown, both wheel
  // paths, both shoulders, both ditches, and the road running away to a
  // vanishing point.
  down: { pos: [-11.0, 2.5, 1.2], target: [26.0, 0.6, -1.4], fov: 50, on: ['main', 0.012] },
  // Across the road at knee height. The cross-section: crown falling away to
  // the shoulder, the windrow, the ditch, the batter.
  cross: { pos: [2.0, 1.05, 11.5], target: [0.5, -0.1, -1.0], fov: 46, on: ['main', 0.05] },
  // Straight down at the junction. The only framing that answers "is this the
  // right shape" rather than "does it happen to catch the light here".
  plan: { pos: [0.0, 26.0, 1.0], target: [0.0, 0.0, 0.0], fov: 46, on: ['main', 0.03] },
  // The same, from high enough to see both roads. 26 m covers 39 by 22 metres,
  // which is *inside* the junction — every overhead render of it came back as
  // an undifferentiated tan expanse and was read as a colour problem for two
  // rounds when it was a framing one. At 62 m the frame covers 90 by 50 and the
  // gravel road, the dirt spur, the apron between them and the forest edge that
  // holds the whole thing are all in it at once.
  wide: { pos: [0.0, 62.0, 1.0], target: [0.0, 0.0, 0.0], fov: 46, on: ['main', 0.03] },
  // Coming up the spur with the junction still ahead. `arrive` sits so close to
  // the mouth that the mainline is behind the truck by the time the shutter
  // opens; this is the frame before that, where the trees open out and the
  // graded surface first shows through the gap.
  approach: { trailCam: [-0.075, 3.2, 1.0], target: [0.0, 0.6, 0.0], fov: 52, on: ['trail', -0.028] },
  // Over the driver's shoulder as the truck swings out of the spur onto the
  // gravel — the manoeuvre the feature exists for.
  onto: { pos: [-9.0, 3.4, -7.5], target: [1.0, 0.3, 0.5], fov: 50, on: ['trail', -0.004] },
  // Standing on the mainline looking back into the mouth of the spur.
  junc: { pos: [16.0, 2.2, 2.0], target: [-6.0, 0.4, -3.0], fov: 52, on: ['main', 0.028] },
  // Knee height on the gravel. Aggregate size and whether the wheel path
  // reads as polished rather than as a painted stripe.
  surface: { pos: [-2.4, 0.55, 2.6], target: [7.0, 0.0, 0.6], fov: 44, on: ['main', 0.02] },
  // Well down the mainline, clear of the apron: the road on its own terms,
  // which is where "the trail scaled up" would show.
  far: { anchor: 0.16, pos: [-13.0, 2.3, 0.6], target: [22.0, 0.7, -0.6], fov: 48, on: ['main', 0.185] },
  // Same place, knee height. Aggregate size and whether the wheel path reads
  // as polished rather than as a painted stripe, with no apron in the frame.
  farlow: { anchor: 0.16, pos: [-3.0, 0.5, 2.2], target: [7.0, 0.0, 0.4], fov: 44, on: ['main', 0.185] },
  // Straight down at a clean stretch. The washboard, the wheel paths and the
  // shoulder either read here as a shape or they do not read at all.
  farplan: { anchor: 0.16, pos: [0.0, 22.0, 0.0], target: [0.0, 0.0, 0.0], fov: 46, on: ['main', 0.185] },
};

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.error('[console]', m.text());
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
const junc = await page.evaluate(() => window.debugAPI.objects.terrain.junction);
console.log(
  `[mainroad] booted in ${((Date.now() - t0) / 1000).toFixed(1)}s — junction at ` +
    `(${junc.x.toFixed(1)}, ${junc.z.toFixed(1)}) trailT ${junc.trailT.toFixed(3)} mainT ${junc.mainT.toFixed(3)}`,
);

// Ablations: `label=code` pairs, semicolon separated, each run against every
// framing from the same page load. `code` is a function body over (t, u) —
// the terrain and its uniform block — so a tier can be switched off from the
// command line without a rebuild and without a second three-minute boot.
//
//   --ablate "relief=u.uReliefAmt.value=0;grit=u.uNearAmt.value.set(1,0,0,1)"
//
// Seven normal tiers, four albedo tint tiers and two AO stacks add into this
// surface. Two rounds went into a cobbling artefact on the assumption it was
// whichever tier had last been edited, and both times the fix landed on the
// wrong one and the frame came back unchanged — which is a diff of 5% of the
// pixels and a working day. Switching them off one at a time is how this is
// answered.
const ablations = arg('ablate', '')
  ? arg('ablate', '')
      .split(';')
      .map((s) => {
        const i = s.indexOf('=');
        return { label: '_' + s.slice(0, i), code: s.slice(i + 1) };
      })
  : [{ label: suffix, code: setCode }];

// --drive: run the truck up the spur, across the junction and away down the
// mainline under the real vehicle physics, reporting what the chassis does. A
// road that photographs well and drops a wheel in a culverted ditch has not
// been added to a driving game, and no still frame will say so.
if (argv.includes('--drive')) {
  const log = await page.evaluate(async () => {
    const { terrain, driver, vehicle } = window.debugAPI.objects;
    const j = terrain.junction;
    const L = terrain.roadLength;
    // 45 m back up the spur, pointed at the junction, and then it steers
    // itself: auto-drive follows the trail, so this is the approach a player
    // gets by doing nothing, and the turn onto the gravel is made by hand.
    const startT = j.trailT - 55 / L;
    const p = terrain.roadPoint(startT);
    const tan = terrain.roadTangent(startT);
    // Auto-drive up the spur, because that is the approach a player gets for
    // free and because hand-steering a 55 m run of two-track from a script
    // tests the script, not the road. Control is taken at the apron.
    driver.state.auto = true;
    driver.state.autoT = startT;
    driver.state.pos.set(p.x, p.y, p.z);
    driver.state.heading = Math.atan2(tan.x, tan.z);
    driver.state.speed = 0;
    const out = [];
    let worstRoll = 0;
    let worstPitch = 0;
    let airborne = 0;
    const mp = terrain.mainPoint(j.mainT);
    const mt = terrain.mainTangent(j.mainT);
    // Through the real input path. `input` is private to the driver closure and
    // nothing on `state` overrides it, so setting state.throttle does exactly
    // nothing — the first version of this test sat at 0 km/h for 23 simulated
    // seconds and reported a clean run. Synthetic key events are what the game
    // actually reads, which also means this is testing the code a player uses.
    const key = (code, downNow) =>
      window.dispatchEvent(new KeyboardEvent(downNow ? 'keydown' : 'keyup', { code, bubbles: true }));
    let steering = '';
    let took = -1;
    for (let i = 0; i < 1500; i++) {
      const s = driver.state;
      const dJ = Math.hypot(s.pos.x - j.x, s.pos.z - j.z);
      // Take control at the apron and turn onto the mainline's heading — the
      // manoeuvre the junction exists for. Pressing forward is what drops
      // auto-drive, which is also how a player does it.
      if (dJ < 15 && took < 0) {
        took = i;
        key('KeyW', true);
      }
      let steer = '';
      if (took >= 0) {
        // Aim 14 m ahead of wherever the truck currently is *along* the
        // mainline, not at a point fixed at the junction: a fixed target is a
        // waypoint, and a waypoint with the throttle pinned is a truck driving
        // in circles round it, which is what the first version measured for
        // twenty simulated seconds and reported as a 180° rollover.
        let bt = j.mainT;
        let bd = 1e9;
        for (let k = -40; k <= 160; k += 4) {
          const q = terrain.mainPoint(j.mainT + k / terrain.mainLength);
          const d = (q.x - s.pos.x) ** 2 + (q.z - s.pos.z) ** 2;
          if (d < bd) {
            bd = d;
            bt = j.mainT + k / terrain.mainLength;
          }
        }
        const ahead = terrain.mainPoint(bt + 14 / terrain.mainLength);
        let e = Math.atan2(ahead.x - s.pos.x, ahead.z - s.pos.z) - s.heading;
        while (e > Math.PI) e -= 2 * Math.PI;
        while (e < -Math.PI) e += 2 * Math.PI;
        // heading += (speed / 3.06) * tan(steer) * dt, and steer is
        // left-positive, so a positive heading error wants left.
        if (e > 0.04) steer = 'KeyA';
        else if (e < -0.04) steer = 'KeyD';
      }
      if (steer !== steering) {
        if (steering) key(steering, false);
        if (steer) key(steer, true);
        steering = steer;
      }
      driver.update(1 / 60);
      vehicle.root.updateMatrixWorld(true);
      // Off the matrix basis, not off Euler angles: the truck's yaw runs
      // through ±pi every lap and an XYZ decomposition flips both other axes
      // with it, which reads as a 180° roll in a truck that is sitting flat.
      const m = vehicle.root.matrixWorld.elements;
      const rx = Math.atan2(m[1], Math.hypot(m[0], m[2])); // right axis, y
      const fz = Math.atan2(m[9], Math.hypot(m[8], m[10])); // forward axis, y
      worstRoll = Math.max(worstRoll, Math.abs(rx));
      worstPitch = Math.max(worstPitch, Math.abs(fz));
      const ground = terrain.heightAt(s.pos.x, s.pos.z);
      if (s.pos.y - ground > 0.75) airborne++;
      if (i % 90 === 0)
        out.push({
          t: (i / 60).toFixed(1),
          spd: (s.speed * 3.6).toFixed(0),
          dJ: dJ.toFixed(1),
          off: terrain.roadDistance(s.pos.x, s.pos.z).toFixed(1),
          roll: ((rx * 180) / Math.PI).toFixed(1),
          pitch: ((fz * 180) / Math.PI).toFixed(1),
          on: took >= 0 && i >= took ? 'manual' : 'auto',
        });
      // Away down the mainline and clear of the apron: the run has answered
      // its question and everything after it is a test of the steering script.
      if (took >= 0 && dJ > 90) break;
    }
    key('KeyW', false);
    if (steering) key(steering, false);
    const end = driver.state.pos;
    const nm = terrain.roadDistance(end.x, end.z);
    return {
      out,
      worstRoll: (worstRoll * 180) / Math.PI,
      worstPitch: (worstPitch * 180) / Math.PI,
      airborne,
      endDist: nm,
      endFromMain: Math.hypot(end.x - mp.x, end.z - mp.z),
    };
  });
  for (const r of log.out)
    console.log(
      `[drive] t=${r.t}s ${r.on.padEnd(6)} ${r.spd.padStart(3)} km/h  ${r.dJ.padStart(5)} m from the junction  ` +
        `${r.off} m off the road  roll ${r.roll}°  pitch ${r.pitch}°`,
    );
  console.log(
    `[drive] worst roll ${log.worstRoll.toFixed(1)}°  worst pitch ${log.worstPitch.toFixed(1)}°  ` +
      `frames off the ground ${log.airborne}  ended ${log.endFromMain.toFixed(0)} m from the junction, ` +
      `${log.endDist.toFixed(1)} m from the nearest road edge`,
  );
}

const names = only ? only.split(',') : Object.keys(FRAMINGS);
for (const name of names) {
  const f = FRAMINGS[name];
  if (!f) continue;
  for (const ab of ablations) {
    const ts = Date.now();
    const out = await page.evaluate(
      ([fr, code, hide]) => {
      const { camera, vehicle, terrain, scene, driver } = window.debugAPI.objects;
      window.debugAPI.setView('forest');
      // Back to defaults first, or ablation three is running with one and two
      // still switched off and every frame after the first is meaningless.
      const u = terrain.material.userData.uniforms;
      u.uReliefAmt.value = 1;
      u.uNearAmt.value.set(1, 1, 1, 1);
      u.uDebug.value = 0;
      if (code) new Function('t', 'u', code)(terrain, u);

      const j = terrain.junction;
      const anchorT = j.mainT + (fr.anchor || 0);
      const ap = terrain.mainPoint(anchorT);
      const mt = terrain.mainTangent(anchorT);
      const ux = mt.x;
      const uz = mt.z;
      const vx = -uz;
      const vz = ux;

      // Put the truck where the framing asks for it, then let the suspension
      // find the ground. Auto-drive off, or it immediately steers for the trail.
      const [road, at] = fr.on;
      const t = road === 'main' ? j.mainT + at : j.trailT + at;
      const p = road === 'main' ? terrain.mainPoint(t) : terrain.roadPoint(t);
      const tan = road === 'main' ? terrain.mainTangent(t) : terrain.roadTangent(t);
      driver.state.auto = false;
      driver.state.speed = 0;
      driver.state.pos.set(p.x, p.y, p.z);
      driver.state.heading = Math.atan2(tan.x, tan.z);
      for (let i = 0; i < 90; i++) driver.update(1 / 60);
      vehicle.root.updateMatrixWorld(true);
      if (hide) {
        vehicle.root.visible = false;
        const d = scene.getObjectByName('wheelDust');
        if (d) d.visible = false;
      }

      const world = (c) => ({
        x: ap.x + ux * c[0] + vx * c[2],
        y: ap.y + c[1],
        z: ap.z + uz * c[0] + vz * c[2],
      });
      let cp;
      if (fr.trailCam) {
        const tp = terrain.roadPoint(j.trailT + fr.trailCam[0]);
        const tt = terrain.roadTangent(j.trailT + fr.trailCam[0]);
        cp = {
          x: tp.x - tt.z * fr.trailCam[2],
          y: tp.y + fr.trailCam[1],
          z: tp.z + tt.x * fr.trailCam[2],
        };
      } else {
        cp = world(fr.pos);
      }
      const ct = world(fr.target);
      camera.position.set(cp.x, cp.y, cp.z);
      camera.fov = fr.fov;
      camera.lookAt(ct.x, ct.y, ct.z);
      camera.updateProjectionMatrix();

      const dataUrl = window.debugAPI.captureFrame(2);
      const luma = window.debugAPI.sampleLuma();
      const cv = camera && window.debugAPI.objects.renderer.domElement;
      const c2 = document.createElement('canvas');
      c2.width = cv.width;
      c2.height = cv.height;
      const g2 = c2.getContext('2d');
      g2.drawImage(cv, 0, 0);
      const y0 = Math.floor(cv.height * 0.6);
      const px = g2.getImageData(0, y0, cv.width, cv.height - y0).data;
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let hot = 0;
      for (let i = 0; i < px.length; i += 4) {
        sr += px[i];
        sg += px[i + 1];
        sb += px[i + 2];
        if ((0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255 > 0.62) hot++;
      }
      const np = px.length / 4;
      vehicle.root.visible = true;
      const d2 = scene.getObjectByName('wheelDust');
      if (d2) d2.visible = true;
        return { dataUrl, luma, rgbMean: [sr / np, sg / np, sb / np], bright: (hot / np) * 100 };
      },
      [f, ab.code, bare],
    );
    const file = path.join(outDir, `mr_${name}${ab.label}.png`);
    await writeFile(file, Buffer.from(out.dataUrl.split(',')[1], 'base64'));
    const [r, g, b] = out.rgbMean;
    console.log(
      `[mainroad] ${name}${ab.label} -> ${file} (${((Date.now() - ts) / 1000).toFixed(1)}s, luma ${out.luma.mean.toFixed(3)}, ` +
        `ground rgb ${r.toFixed(0)}/${g.toFixed(0)}/${b.toFixed(0)} r:b ${(r / Math.max(1, b)).toFixed(2)}, ` +
        `bright ${out.bright.toFixed(2)}%)`,
    );
  }
}
await browser.close();
