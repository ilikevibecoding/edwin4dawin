// Sequence 8 -- the attack run. Surface, trench, two metres, and the end of the
// Empire's best idea.

import * as THREE from 'three';
import { makeStage } from '../core/film.js';
import { music, vo, sfx, cameraQuad } from './kit.js';
import { kyberStation, trenchSegment, exhaustPort } from '../models/station.js';
import { xwing, ywing, tieFighter } from '../models/fighters.js';
import { freighter } from '../models/civilian.js';
import { turret } from '../models/props.js';
import { BoltPool, ExplosionPool } from '../fx/combat.js';
import { starfield, nebulaSky, debrisField } from '../worlds/space.js';
import { CameraRig, aimAlong } from '../core/camera.js';
import { greebled, emissive, glowPlane, paint } from '../gfx/materials.js';
import { clamp, lerp, smoothstep, Ease } from '../util/math.js';
import { RNG } from '../util/rng.js';

const DURATION = 64;

// Timeline landmarks.
const DIVE_T = 21.5;        // over the lip into the trench
const RUN_START = 23.5;
const TORP_T = 45.6;
const HIT_T = 47.4;
const BOOM_T = 53.0;

// Trench geometry.
const SEGMENTS = 24;
const SEG_LEN = 300;
const TRENCH_DEPTH = 220;
const TRENCH_HALF = 90;
const TRENCH_START_Z = 0;
const TRENCH_END_Z = -SEGMENTS * SEG_LEN;
const PORT_Z = TRENCH_END_Z + 420;

const RUN_SPEED = 250;
// Rhea's position through the run.
function rheaPath(t, out = new THREE.Vector3()) {
  if (t < DIVE_T) {
    // Skimming the surface, then over the lip.
    const u = clamp(t / DIVE_T);
    out.set(lerp(-260, 6, Ease.inOutQuad(u)), lerp(300, 42, Ease.inQuad(u)), lerp(2600, 400, u));
  } else if (t < RUN_START) {
    const u = clamp((t - DIVE_T) / (RUN_START - DIVE_T));
    out.set(lerp(6, 0, u), lerp(42, -TRENCH_DEPTH * 0.42, Ease.inQuad(u)), lerp(400, 120, u));
  } else {
    const u = t - RUN_START;
    const z = 120 - u * RUN_SPEED;
    const weave = Math.sin(u * 0.55) * 22 + Math.sin(u * 1.31) * 7;
    const bob = Math.sin(u * 0.8) * 12;
    out.set(weave, -TRENCH_DEPTH * 0.42 + bob, z);
    if (t > HIT_T) {
      // Pull up and out after the shot.
      const p = clamp((t - HIT_T) / 5);
      out.y += Ease.inQuad(p) * 1400;
      out.x += Ease.inQuad(p) * 300;
    }
  }
  return out;
}

export default {
  id: 'trench',
  duration: DURATION,
  fadeIn: 0.7,
  fadeOut: 1.2,
  cues: [
    music('battle', 2.0, { gain: 0.9 }),
    sfx('engineBed', 0, { dur: 52, vel: 0.55, freq: 70, cutoff: 340 }),
    vo('n16', 1.2),
    sfx('commClick', 6.4), vo('g1', 6.6),
    sfx('flyby', 10.6, { vel: 0.7, dur: 1.1 }),
    vo('n17', 11.4),
    ...[12.4, 12.7, 13.4, 14.1, 15.2, 16.0, 16.6, 17.4, 18.2].map((t) => sfx('blaster', t, { vel: 0.6, pitch: 0.7 })),
    sfx('explosion', 15.6, { vel: 0.55, size: 0.7 }),
    sfx('tieScream', 17.2, { vel: 0.6, dur: 1.2 }),
    sfx('commClick', 18.6), vo('g2', 18.8),
    sfx('explosion', 22.1, { vel: 0.5, size: 0.8 }),
    ...[25.5, 26.1, 27.2, 28.4, 29.6, 31.2, 32.4, 33.8, 35.2, 36.4, 37.8, 39.2, 40.6, 42.0].map((t, i) =>
      sfx('blaster', t, { vel: 0.55, pitch: i % 2 ? 0.65 : 1.15 })),
    sfx('tieScream', 25.0, { vel: 0.65, dur: 1.4 }),
    sfx('commClick', 26.4), vo('v5', 26.6),
    sfx('commClick', 30.4), vo('r4', 30.6),
    sfx('commClick', 34.0), vo('g3', 34.2),
    sfx('tieScream', 36.0, { vel: 0.7, dur: 1.3 }),
    sfx('explosion', 38.2, { vel: 0.7, size: 0.9 }),
    sfx('commClick', 38.6), vo('dx1', 38.8),
    sfx('commClick', 45.0), vo('r5', 45.2),
    sfx('blaster', TORP_T, { vel: 0.9, pitch: 0.45, tail: 0.5 }),
    sfx('blaster', TORP_T + 0.14, { vel: 0.9, pitch: 0.42, tail: 0.5 }),
    sfx('explosion', HIT_T, { vel: 0.8, size: 1.4 }),
    sfx('explosion', BOOM_T, { vel: 1.0, size: 2.6 }),
    sfx('explosion', BOOM_T + 0.5, { vel: 0.9, size: 3.0 }),
    vo('n18', BOOM_T + 2.2),
  ],

  build() {
    const { scene, camera } = makeStage({
      background: 0x02040a, fov: 46, near: 0.6, far: 120000,
    });
    scene.add(camera);
    scene.add(nebulaSky({ radius: 90000, seed: 33, density: 0.45, hueA: [40, 30, 100], hueB: [120, 40, 60] }));
    scene.add(starfield({ count: 2400, radius: 70000 }));

    scene.add(new THREE.AmbientLight(0x3a4c68, 2.8));
    const key = new THREE.DirectionalLight(0xdfe8ff, 3.2);
    key.position.set(0.4, 1, 0.5).multiplyScalar(1000);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x6f8cbc, 1.9);
    fill.position.set(-0.7, -0.4, -0.6).multiplyScalar(1000);
    scene.add(fill);
    // A hard raking light down the length of the trench: without it the walls
    // fall off to pure black and all the geometry is wasted.
    const rake = new THREE.DirectionalLight(0xcfe0ff, 2.2);
    rake.position.set(0.35, 0.55, 1).multiplyScalar(1000);
    scene.add(rake);
    // Travelling light that rides with the fighter, like engine wash.
    const wash = new THREE.PointLight(0x9fd0ff, 900, 320, 2);
    scene.add(wash);

    // --- the far view of the station (shots 1 and 7) -------------------------
    const far = new THREE.Group();
    scene.add(far);
    const station = kyberStation({ radius: 6000, detail: 0.7, seed: 4 });
    station.position.set(0, 0, -15000);
    far.add(station);

    const debris = debrisField({
      count: 260, radius: 5200, seed: 12, size: [8, 90],
      material: greebled({ seed: 66, repeat: [1, 1], base: [138, 128, 118] }),
    });
    debris.position.copy(station.position);
    debris.visible = false;
    // Wreckage still burning as it spreads.
    const emberMat = debris.material;
    far.add(debris);

    const boomFlash = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowPlane({ color: 0xfff0d0, opacity: 0 }));
    boomFlash.position.copy(station.position);
    boomFlash.renderOrder = 9;
    far.add(boomFlash);
    const boomCore = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), emissive(0xffc060, { opacity: 0 }));
    boomCore.position.copy(station.position);
    far.add(boomCore);
    const boomRing = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowPlane({ color: 0xffe0a0, opacity: 0 }));
    boomRing.position.copy(station.position);
    boomRing.renderOrder = 9;
    far.add(boomRing);
    const boomRing2 = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowPlane({ color: 0xffb060, opacity: 0 }));
    boomRing2.position.copy(station.position);
    boomRing2.renderOrder = 9;
    far.add(boomRing2);
    // Embers: hot fragments that keep the frame alive after the flash.
    const embers = [];
    {
      const er = new RNG(51);
      for (let i = 0; i < 26; i++) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowPlane({ color: 0xff9a44, opacity: 0 }));
        const p2 = er.onSphere({});
        m.userData = { dir: new THREE.Vector3(p2.x, p2.y, p2.z).multiplyScalar(er.float(0.3, 1)), size: er.float(300, 1400), ph: er.float(0, 6) };
        m.renderOrder = 8;
        far.add(m);
        embers.push(m);
      }
    }
    // Secondary detonations across the surface just before the main blast.
    const preBooms = [];
    {
      const pr = new RNG(63);
      for (let i = 0; i < 9; i++) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowPlane({ color: 0xffc070, opacity: 0 }));
        const p2 = pr.onSphere({});
        m.position.copy(station.position).add(new THREE.Vector3(p2.x, p2.y, p2.z).multiplyScalar(5400));
        m.userData = { t: BOOM_T - 2.6 + pr.float(0, 2.4), size: pr.float(700, 2200) };
        m.renderOrder = 8;
        far.add(m);
        preBooms.push(m);
      }
    }

    // --- the trench set (shots 2-6) ------------------------------------------
    const set = new THREE.Group();
    scene.add(set);

    // Surface slab either side of the trench, plus the approach apron.
    const surfMat = greebled({ seed: 71, repeat: [40, 60], base: [122, 126, 134], lights: 0.04 });
    const apron = new THREE.Mesh(new THREE.BoxGeometry(9000, 40, 12000), surfMat);
    apron.position.set(0, -20, -2800);
    set.add(apron);
    // Surface complexes: without these the approach reads as a flat black plane
    // with runway stripes.
    {
      const sr2 = new RNG(77);
      const geo = new THREE.BoxGeometry(1, 1, 1);
      const inst = new THREE.InstancedMesh(geo, greebled({ seed: 73, repeat: [1, 1], base: [128, 133, 142], lights: 0.05 }), 1500);
      const d = new THREE.Object3D();
      let n = 0;
      for (let i = 0; i < 1500; i++) {
        const x = sr2.gauss(0, 1300);
        const z = sr2.float(-7200, 3200);
        if (Math.abs(x) < TRENCH_HALF + 70) continue;   // keep the trench clear
        const w = sr2.float(8, 90);
        const hgt = sr2.float(4, 70) * (sr2.bool(0.12) ? 2.4 : 1);
        d.position.set(x, hgt * 0.5 - 2, z);
        d.rotation.set(0, sr2.bool(0.2) ? sr2.float(0, 1.6) : 0, 0);
        d.scale.set(w, hgt, w * sr2.float(0.4, 2.6));
        d.updateMatrix();
        inst.setMatrixAt(n++, d.matrix);
      }
      inst.count = n;
      inst.instanceMatrix.needsUpdate = true;
      set.add(inst);
    }
    // Cut the trench out of the apron by simply placing the walls on top of it.
    const segs = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const seg = trenchSegment({ length: SEG_LEN, width: TRENCH_HALF * 2, depth: TRENCH_DEPTH, seed: i * 7 + 3 });
      seg.position.z = TRENCH_START_Z - (i + 0.5) * SEG_LEN;
      set.add(seg);
      segs.push(seg);
    }
    // Fill the apron gap above the trench so the slab does not cover it.
    const gapFix = new THREE.Mesh(new THREE.BoxGeometry(TRENCH_HALF * 2 + 2, 60, 12000), paint(0x000000));
    gapFix.position.set(0, -10, -2800);
    gapFix.visible = false;
    set.add(gapFix);

    const port = exhaustPort({ scale: 5 });
    port.position.set(0, -TRENCH_DEPTH + 2, PORT_Z);
    set.add(port);

    // Surface turrets that track and fire.
    const turrets = [];
    const tr = new RNG(21);
    for (let i = 0; i < 12; i++) {
      const g = turret({ scale: 5.5, bolt: 0x6bff5a });
      const side = i % 2 ? 1 : -1;
      g.position.set(side * tr.float(TRENCH_HALF + 90, TRENCH_HALF + 420), 0, tr.float(-6200, 600));
      set.add(g);
      turrets.push(g);
    }

    // --- craft ---------------------------------------------------------------
    const rhea = xwing({ scale: 1.0, stripe: 0xd0402c });
    scene.add(rhea);
    const wingmen = [];
    for (let i = 0; i < 3; i++) {
      const w = i === 2 ? ywing({ scale: 1.0 }) : xwing({ scale: 1.0, stripe: i ? 0xd8b13a : 0x3a7fd0 });
      scene.add(w);
      wingmen.push(w);
    }
    const ties = [];
    for (let i = 0; i < 3; i++) {
      const tie = tieFighter({ scale: 1.6, advanced: i === 0 });
      scene.add(tie);
      ties.push(tie);
    }
    const falcon = freighter({ scale: 1.0 });
    falcon.userData.setGear(false);
    falcon.visible = false;
    scene.add(falcon);

    // --- weapons -------------------------------------------------------------
    const redBolts = new BoltPool({ max: 70, color: 0xff4530, length: 22, radius: 1.0, speed: 1500 });
    const greenBolts = new BoltPool({ max: 70, color: 0x6bff5a, length: 26, radius: 1.2, speed: 1500 });
    const booms = new ExplosionPool({ max: 12, seed: 4 });
    scene.add(redBolts.group, greenBolts.group, booms.group);

    // Torpedoes: two slow blue-white rounds that dive into the port.
    const torps = [];
    for (let i = 0; i < 2; i++) {
      const g = new THREE.Group();
      const core = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), emissive(0xdff0ff, { blending: THREE.NormalBlending, depthWrite: true }));
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), glowPlane({ color: 0x9fd8ff, opacity: 0.9 }));
      halo.renderOrder = 7;
      g.add(core, halo);
      g.visible = false;
      set.add(g);
      torps.push({ g, halo });
    }

    // HUD: the targeting computer, which she switches off.
    const hudCanvas = document.createElement('canvas');
    hudCanvas.width = 1024;
    hudCanvas.height = 512;
    const hx = hudCanvas.getContext('2d');
    const hudTex = new THREE.CanvasTexture(hudCanvas);
    hudTex.colorSpace = THREE.SRGBColorSpace;
    const hud = cameraQuad(camera, hudTex, { distance: 6, widthFrac: 0.3, opacity: 0, y: 0.0 });
    hud.position.x = -1.55;
    hud.position.y = -1.05;
    function drawHud(t) {
      const g = hx;
      g.clearRect(0, 0, 1024, 512);
      g.strokeStyle = '#6bff9a';
      g.fillStyle = '#6bff9a';
      g.lineWidth = 3;
      g.strokeRect(90, 60, 844, 392);
      g.beginPath();
      for (const [x, y] of [[90, 60], [934, 60], [90, 452], [934, 452]]) {
        g.moveTo(x, y); g.lineTo(x + (x < 512 ? 70 : -70), y);
        g.moveTo(x, y); g.lineTo(x, y + (y < 256 ? 60 : -60));
      }
      g.stroke();
      // Crosshair and the closing target box.
      const k = clamp((t - 28) / 14);
      const s = lerp(300, 60, k);
      g.lineWidth = 4;
      g.strokeRect(512 - s / 2, 256 - s / 2, s, s);
      g.beginPath();
      g.moveTo(512 - 40, 256); g.lineTo(512 + 40, 256);
      g.moveTo(512, 256 - 40); g.lineTo(512, 256 + 40);
      g.stroke();
      g.font = '700 30px Orbitron, monospace';
      g.fillText('TARGET LOCK', 120, 110);
      g.fillText(`RANGE ${Math.max(0, Math.round((1 - k) * 2400)).toString().padStart(4, '0')}`, 120, 420);
      g.fillText(k > 0.92 ? 'LOCKED' : 'ACQUIRING', 660, 420);
      hudTex.needsUpdate = true;
    }

    const rig = new CameraRig(camera);
    rig.impulse(HIT_T, 0.6, 0.9);
    rig.impulse(BOOM_T, 1.4, 1.6);

    const rheaPos = new THREE.Vector3();
    const tmpA = new THREE.Vector3();
    const tmpB = new THREE.Vector3();
    const prevRhea = rheaPath(0).clone();

    // Camera: mostly a chase rig behind Rhea, with cuts for the set pieces.
    const chase = (dx, dy, dz) => (t) => {
      const p = rheaPath(t, tmpA).clone();
      return p.add(new THREE.Vector3(dx, dy, dz));
    };
    const at = (dx, dy, dz) => (t) => rheaPath(t, tmpB).clone().add(new THREE.Vector3(dx, dy, dz));

    rig.setTrack([
      // Shot 1: the station, and the squadron crossing frame.
      { t: 0, pos: [900, 260, 3400], look: [0, 0, -12000], fov: 40 },
      { t: 6.2, pos: [560, 190, 3100], look: [0, 0, -12000], fov: 36, ease: Ease.linear },
      // Shot 2: formation, S-foils opening.
      { t: 6.201, cut: true, pos: chase(46, 12, 62), look: at(0, 0, -10), fov: 38 },
      { t: 11.0, pos: chase(24, 7, 44), look: at(0, 0, -10), fov: 36, ease: Ease.linear },
      // Shot 3: the surface run, low and fast.
      { t: 11.001, cut: true, pos: chase(-16, 6, 40), look: at(0, 2, -60), fov: 50 },
      { t: 18.4, pos: chase(-8, 4, 30), look: at(0, 2, -70), fov: 52, ease: Ease.linear },
      // Shot 4: the dive.
      { t: 18.401, cut: true, pos: chase(30, 26, 56), look: at(0, -6, -30), fov: 46 },
      { t: 25.4, pos: chase(12, 9, 40), look: at(0, -2, -40), fov: 48, ease: Ease.inOutQuad },
      // Shot 5: chase down the trench.
      { t: 25.401, cut: true, pos: chase(0, 7, 34), look: at(0, 0, -80), fov: 56 },
      { t: 33.0, pos: chase(0, 5.5, 27), look: at(0, 0, -90), fov: 58, ease: Ease.linear },
      // Shot 6: over her shoulder, walls whipping past.
      { t: 33.001, cut: true, pos: chase(-4.5, 3.2, 12), look: at(0, 0.5, -120), fov: 62 },
      { t: 41.0, pos: chase(-3.4, 2.8, 10), look: at(0, 0.5, -140), fov: 64, ease: Ease.linear },
      // Shot 7: the shot itself.
      { t: 41.001, cut: true, pos: chase(0, 4.4, 22), look: at(0, 0, -160), fov: 60 },
      { t: 48.6, pos: chase(0, 3.6, 18), look: at(0, 0, -180), fov: 62, ease: Ease.linear },
      // Shot 8: outside again, the station coming apart.
      { t: 48.601, cut: true, pos: [1500, 700, 2600], look: [0, 0, -13000], fov: 40 },
      { t: 56.0, pos: [1900, 900, 3100], look: [0, 0, -13000], fov: 44, ease: Ease.linear },
      { t: 56.001, cut: true, pos: (t) => rhea.position.clone().add(new THREE.Vector3(-46, 16, 74)), look: () => rhea.position.clone(), fov: 44 },
      { t: DURATION, pos: (t) => rhea.position.clone().add(new THREE.Vector3(-30, 11, 52)), look: () => rhea.position.clone(), fov: 42, ease: Ease.linear },
    ]);

    // Schedule the fights.
    const rr = new RNG(31);
    for (const t of [12.4, 12.7, 13.4, 14.1, 15.2, 16.0, 16.6, 17.4, 18.2]) {
      const p = rheaPath(t, tmpA).clone();
      redBolts.schedule(t, p.clone().add(new THREE.Vector3(rr.float(-6, 6), 0, 6)),
        p.clone().add(new THREE.Vector3(rr.float(-40, 40), rr.float(-20, 10), -900)), { travel: 0.6 });
    }
    for (let i = 0; i < 26; i++) {
      const t = 24.5 + i * 0.72;
      const p = rheaPath(t, tmpA).clone();
      greenBolts.schedule(t, p.clone().add(new THREE.Vector3(rr.float(-30, 30), rr.float(-10, 40), 320)),
        p.clone().add(new THREE.Vector3(rr.float(-24, 24), rr.float(-14, 14), -30)), { travel: 0.45 });
    }
    for (const t of [25.5, 26.1, 27.2, 28.4, 29.6, 31.2, 32.4, 33.8, 35.2, 36.4, 37.8, 39.2, 40.6, 42.0]) {
      const p = rheaPath(t, tmpA).clone();
      redBolts.schedule(t, p.clone().add(new THREE.Vector3(rr.float(-7, 7), -0.5, 8)),
        p.clone().add(new THREE.Vector3(rr.float(-14, 14), rr.float(-8, 8), -1100)), { travel: 0.75 });
    }
    booms.schedule(15.6, rheaPath(15.6, tmpA).clone().add(new THREE.Vector3(90, 20, -520)), { size: 30, dur: 1.6 });
    booms.schedule(22.1, rheaPath(22.1, tmpA).clone().add(new THREE.Vector3(-140, 60, -300)), { size: 34, dur: 1.8 });
    booms.schedule(38.2, rheaPath(38.2, tmpA).clone().add(new THREE.Vector3(20, 30, 260)), { size: 26, dur: 1.5 });
    booms.schedule(HIT_T, new THREE.Vector3(0, -TRENCH_DEPTH + 10, PORT_Z), { size: 46, dur: 2.4 });

    const dir = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    return {
      scene,
      camera,
      bloom: 0.95,

      update(t, dt) {
        const inTrench = t > 6.0 && t < 48.6;
        set.visible = inTrench;
        far.visible = !inTrench;

        const p = rheaPath(t, rheaPos);
        if (inTrench) rhea.visible = true;
        else if (t < 6) rhea.visible = false;
        rhea.position.copy(p);
        dir.subVectors(p, prevRhea);
        if (dir.lengthSq() > 1e-6) aimAlong(rhea, dir, up, -Math.sin((t - RUN_START) * 0.55) * 0.5);
        prevRhea.copy(p);
        rhea.userData.setSFoils(smoothstep(6.6, 9.4, t));
        rhea.userData.setThrottle(0.75 + 0.25 * Math.sin(t * 3));

        // Wingmen fly loose formation until the trench, then fall back.
        wingmen.forEach((w, i) => {
          const side = i === 1 ? 1 : -1;
          const drop = smoothstep(20, 30 + i * 4, t);
          const off = new THREE.Vector3(side * (26 + i * 10) * (1 - drop * 0.8), 6 + i * 3, 42 + i * 34 + drop * 400);
          w.position.copy(p).add(off);
          if (dir.lengthSq() > 1e-6) aimAlong(w, dir, up, side * 0.12);
          if (w.userData.setSFoils) w.userData.setSFoils(smoothstep(6.6, 9.4, t));
          w.userData.setThrottle(0.8);
          w.visible = t < 44;
        });

        // TIEs on her tail through the run.
        ties.forEach((tie, i) => {
          const on = t > 16 && t < 42;
          tie.visible = on;
          if (!on) return;
          const lag = 180 + i * 90 + Math.sin(t * 0.7 + i) * 30;
          const sway = Math.sin(t * 0.9 + i * 2.1) * (i === 0 ? 10 : 26);
          tie.position.set(p.x + sway, p.y + 6 + Math.sin(t * 1.3 + i) * 6, p.z + lag);
          aimAlong(tie, dir, up, -sway * 0.01);
          tie.userData.setThrottle(1);
        });

        // The freighter drops in to clear her tail.
        const dax = t > 37.6 && t < 46;
        falcon.visible = dax;
        if (dax) {
          const u = clamp((t - 37.6) / 5);
          falcon.position.set(p.x + lerp(320, -60, u), p.y + lerp(260, 24, u), p.z + lerp(900, 220, u));
          aimAlong(falcon, dir, up, lerp(0.5, 0, u));
          falcon.userData.setThrottle(1);
        }

        // Turrets track and fire on her.
        for (const g of turrets) {
          g.userData.aim(p);
        }

        // Torpedoes.
        torps.forEach((tp, i) => {
          const on = t > TORP_T && t < HIT_T + 0.1;
          tp.g.visible = on;
          if (!on) return;
          const u = clamp((t - TORP_T) / (HIT_T - TORP_T));
          const from = rheaPath(TORP_T, tmpA).clone().add(new THREE.Vector3((i ? 1 : -1) * 5, 0, -6));
          const to = new THREE.Vector3(0, -TRENCH_DEPTH + 8, PORT_Z);
          // Straight down the trench, then a right-angle dive into the port.
          const mid = new THREE.Vector3(to.x + (i ? 1 : -1) * 2, from.y, to.z + 30);
          const q = u < 0.82 ? from.clone().lerp(mid, u / 0.82) : mid.clone().lerp(to, (u - 0.82) / 0.18);
          tp.g.position.copy(q);
          tp.halo.quaternion.copy(camera.quaternion);
          tp.halo.scale.setScalar(0.8 + Math.sin(t * 30 + i) * 0.15);
        });
        port.userData.glow.material.opacity = smoothstep(TORP_T, HIT_T, t) * 0.8;

        // Targeting computer: comes up, then she shuts it off.
        const hudOn = smoothstep(27.5, 28.5, t) * (1 - smoothstep(31.4, 32.2, t));
        hud.material.opacity = hudOn * 0.85;
        hud.visible = hudOn > 0.01;
        if (hud.visible) drawHud(t);

        // The station going up.
        if (!inTrench) {
          const b = clamp((t - BOOM_T) / 6.5);
          if (t > BOOM_T) {
            station.visible = b < 0.22;
            debris.visible = b > 0.15;
            debris.userData.update((t - BOOM_T) * 0.35);
            debris.scale.setScalar(1 + b * 2.4);
            boomFlash.visible = true;
            boomFlash.quaternion.copy(camera.quaternion);
            boomFlash.material.opacity = Math.exp(-b * 6) * 1.0;
            boomFlash.scale.setScalar(9000 + b * 60000);
            boomCore.material.opacity = clamp(1 - b * 1.6);
            boomCore.scale.setScalar(2000 + Ease.outQuart(b) * 12000);
            boomCore.material.color.setRGB(1, 0.8 - b * 0.5, 0.45 - b * 0.4);
            boomRing.visible = true;
            boomRing.quaternion.copy(camera.quaternion);
            boomRing.material.opacity = clamp(0.95 - b * 0.85);
            boomRing.scale.setScalar(4000 + Ease.outQuart(b) * 62000);
            boomRing2.visible = true;
            boomRing2.quaternion.copy(camera.quaternion);
            boomRing2.material.opacity = clamp(0.8 - b * 0.7) * 0.8;
            boomRing2.scale.setScalar(2000 + Ease.outQuint(b) * 34000);
            for (const m of embers) {
              const age = clamp(b * 1.15);
              m.position.copy(station.position).add(m.userData.dir.clone().multiplyScalar(3000 + age * 26000));
              m.scale.setScalar(m.userData.size * (1 + age * 2.2));
              m.quaternion.copy(camera.quaternion);
              m.material.opacity = clamp(1 - age) * (0.5 + 0.5 * Math.sin(t * 6 + m.userData.ph)) * 0.8;
            }
            this.flash = Math.exp(-Math.max(0, t - BOOM_T) * 3.5) * 1.4;
          } else {
            station.visible = true;
            boomFlash.material.opacity = 0;
            boomCore.material.opacity = 0;
            boomRing.material.opacity = 0;
            boomRing2.material.opacity = 0;
            for (const m of embers) m.material.opacity = 0;
            // Secondary detonations walking across the surface.
            for (const m of preBooms) {
              const age = (t - m.userData.t) / 1.3;
              const on = age > 0 && age < 1;
              m.visible = on;
              if (on) {
                m.quaternion.copy(camera.quaternion);
                m.scale.setScalar(m.userData.size * (0.4 + age * 2.6));
                m.material.opacity = Math.exp(-age * 3.4);
              }
            }
            this.flash = 0;
          }
          // Survivors streaking away from the blast.
          rhea.visible = t > 48.6;
          if (rhea.visible) {
            const u = clamp((t - 48.6) / 15);
            rhea.position.set(lerp(-600, 620, u), lerp(-200, 190, u), lerp(-9000, 900, Ease.inOutQuad(u)));
            aimAlong(rhea, new THREE.Vector3(0.12, 0.03, 1), up, Math.sin(t) * 0.2);
            rhea.userData.setThrottle(1);
          }
          falcon.visible = t > 49.6;
          if (falcon.visible) {
            const u = clamp((t - 49.6) / 14);
            falcon.position.set(lerp(-1400, -160, u), lerp(-420, 60, u), lerp(-10000, 640, Ease.inOutQuad(u)));
            aimAlong(falcon, new THREE.Vector3(0.1, 0.03, 1), up, 0.1);
            falcon.userData.setThrottle(1);
          }
          for (const w of wingmen) w.visible = false;
          for (const tie of ties) tie.visible = false;
        } else {
          this.flash = 0;
        }

        wash.position.set(p.x, p.y + 12, p.z + 26);
        wash.intensity = inTrench ? 1400 : 0;

        redBolts.update(t, camera);
        greenBolts.update(t, camera);
        booms.update(t, camera);
        rig.update(t);
      },

      dispose() {
        camera.remove(hud);
      },
    };
  },
};
