/**
 * Scene 5 — the trench.  The climax: 46 seconds, absolute 163s–209s.
 *
 *   0.0  the target      the station hangs there, the squadron tears past the lens
 *   4.0  the dive        S-foils crack open, the surface guns open up from below
 *   9.0  in the trench   chase cam, look-back, wall-skim: walls ripping past
 *  16.0  pursuit         TIEs drop in behind, a wingman goes into the wall
 *  24.0  the computer    the reticle converges, locks — and at 33.0 goes dark
 *  34.2  the run         port ahead, lens tightens, cannon fire whipping past
 *  39.4  away            torpedoes launch, curve into the port, camera pulls out
 *
 * Everything in here is keyed off `scroll(t)`, the closed-form distance flown
 * down the trench.  The trench itself slides past a nearly-stationary camera
 * (two clones of a 1400-unit tile, wrapped modulo the tile length) so no
 * position ever grows without bound and `update(t)` stays a pure function of t.
 */
import * as THREE from 'three';
import { xwing, tiefighter, turbolaserTower, setEngineGlow } from '../models/ships.js';
import { trench, stationSurface, battleStation, spaceBackdrop, explosionBurst } from '../models/environments.js';
import { svg, svgTexture } from '../lego/svgtex.js';
import { rng } from '../lego/bricks.js';
import {
  lightRig, Bolts, volley, Impacts, Fireball, BrickBurst, Smoke,
  beat, clamp, lerp, smoothstep, noise, flash,
} from './_kit.js';

export const id = 'trench';

/* ---- beat boundaries, local scene time ---------------------------- */
const B_DIVE = 4.0;
const B_TRENCH = 9.0;
const B_CHASE = 16.0;
const B_COMP = 24.0;
const B_RUN = 34.2;
const B_AWAY = 39.4;
const END = 46.0;

const T_LOCK = 28.4;        // targeting computer resolves
const T_OFF = 33.0;         // "So he switches it off."
const T_HITWING = 20.36;    // the wingman takes the burst
const T_KILL = 21.2;        // ...and goes into the wall
const T_LAUNCH = 39.6;      // "Torpedoes away!"
const T_HIT = 42.9;         // torpedoes reach the port
const T_OUT = 43.15;        // and up we go

/* ---- geometry constants ------------------------------------------- */
const WIDTH = 42;
const HEIGHT = 46;
const HX = WIDTH / 2;
const SEC = 100;
const LEN = 1400;           // one trench tile; two clones give 2800 of road
const SH = 0.55;            // ship scale

/* ------------------------------------------------------------------ */
/* the run: speed profile and its closed-form integral                 */
/* ------------------------------------------------------------------ */

const SPEED = [
  [B_TRENCH, 88], [12, 106], [16, 118], [20, 124], [24, 118],
  [27, 106], [T_OFF, 100], [B_RUN, 108], [36.6, 140], [B_AWAY, 162],
  [T_HIT, 172], [END, 130],
];
const CUM = [0];
for (let i = 1; i < SPEED.length; i++) {
  CUM[i] = CUM[i - 1] + (SPEED[i][0] - SPEED[i - 1][0]) * (SPEED[i][1] + SPEED[i - 1][1]) / 2;
}

/** Distance flown down the trench at local time t (0 at the trench entry). */
function scroll(t) {
  if (t <= SPEED[0][0]) return (t - SPEED[0][0]) * SPEED[0][1];
  for (let i = 1; i < SPEED.length; i++) {
    const [t0, v0] = SPEED[i - 1];
    const [t1, v1] = SPEED[i];
    if (t <= t1) {
      const dt = t - t0;
      const v = v0 + (v1 - v0) * (dt / (t1 - t0));
      return CUM[i - 1] + dt * (v0 + v) / 2;
    }
  }
  const n = SPEED.length - 1;
  return CUM[n] + (t - SPEED[n][0]) * SPEED[n][1];
}

/** Instantaneous speed, for engine glow and camera shake. */
function speedAt(t) {
  if (t <= SPEED[0][0]) return SPEED[0][1];
  for (let i = 1; i < SPEED.length; i++) {
    const [t0, v0] = SPEED[i - 1];
    const [t1, v1] = SPEED[i];
    if (t <= t1) return v0 + (v1 - v0) * ((t - t0) / (t1 - t0));
  }
  return SPEED[SPEED.length - 1][1];
}

/* Trench coordinates: the port sits well beyond where the fighters pull up. */
const PORT_Q = scroll(T_HIT) + 380;
const TORP_Q0 = scroll(T_LAUNCH) + 37;

/* ------------------------------------------------------------------ */
/* the targeting computer, drawn as SVG                                */
/* ------------------------------------------------------------------ */

const HUD_G = '#8dffb0';
const HUD_R = '#ff6a4a';

function ringSvg() {
  const p = [];
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const major = i % 5 === 0;
    const r0 = major ? 188 : 208;
    p.push(`<line x1="${(256 + Math.cos(a) * r0).toFixed(1)}" y1="${(256 + Math.sin(a) * r0).toFixed(1)}"`
      + ` x2="${(256 + Math.cos(a) * 228).toFixed(1)}" y2="${(256 + Math.sin(a) * 228).toFixed(1)}"`
      + ` stroke-width="${major ? 6 : 2.5}"/>`);
  }
  return svg([0, 0, 512, 512], `<g fill="none" stroke="${HUD_G}" stroke-opacity="0.8">
    <circle cx="256" cy="256" r="246" stroke-width="2" stroke-opacity="0.3"/>
    <circle cx="256" cy="256" r="176" stroke-width="2" stroke-opacity="0.22" stroke-dasharray="3 15"/>
    ${p.join('')}
    <path d="M 28 256 A 228 228 0 0 1 98 95" stroke-width="9" stroke-opacity="0.95"/>
    <path d="M 484 256 A 228 228 0 0 1 414 417" stroke-width="9" stroke-opacity="0.95"/>
    <path d="M 256 28 A 228 228 0 0 1 400 79" stroke-width="5" stroke-opacity="0.6"/>
  </g>`, { w: 512, h: 512 });
}

function bracketSvg(color) {
  return svg([0, 0, 128, 128], `<g fill="none" stroke="${color}" stroke-width="10" stroke-linecap="square">
    <path d="M 12 80 L 12 12 L 80 12"/>
    <path d="M 12 46 L 42 46" stroke-width="5"/>
    <path d="M 46 12 L 46 42" stroke-width="5"/>
    <rect x="8" y="8" width="11" height="11" fill="${color}" stroke="none"/>
  </g>`, { w: 128, h: 128 });
}

function boxSvg() {
  return svg([0, 0, 256, 256], `<g fill="none" stroke="${HUD_G}">
    <rect x="26" y="26" width="204" height="204" stroke-width="4" stroke-dasharray="40 26" stroke-opacity="0.9"/>
    <rect x="8" y="8" width="240" height="240" stroke-width="2" stroke-opacity="0.35"/>
    <path d="M 128 0 L 128 26 M 128 230 L 128 256 M 0 128 L 26 128 M 230 128 L 256 128" stroke-width="3" stroke-opacity="0.7"/>
  </g>`, { w: 256, h: 256 });
}

function crossSvg() {
  const lad = [];
  for (let i = -7; i <= 7; i++) {
    if (i === 0) continue;
    const x = 512 + i * 46;
    const h = i % 5 === 0 ? 16 : 8;
    lad.push(`<line x1="${x}" y1="${288 - h}" x2="${x}" y2="${288 + h}" stroke-width="3"/>`);
  }
  const corner = (x, y, sx, sy) => `<path d="M ${x} ${y + sy * 52} L ${x} ${y} L ${x + sx * 88} ${y}" stroke-width="5"/>`;
  return svg([0, 0, 1024, 576], `<g fill="none" stroke="${HUD_G}" stroke-opacity="0.8">
    <line x1="120" y1="288" x2="452" y2="288" stroke-width="3"/>
    <line x1="572" y1="288" x2="904" y2="288" stroke-width="3"/>
    <line x1="512" y1="106" x2="512" y2="212" stroke-width="3"/>
    <line x1="512" y1="364" x2="512" y2="470" stroke-width="3"/>
    ${lad.join('')}
    ${corner(46, 40, 1, 1)}${corner(978, 40, -1, 1)}${corner(46, 536, 1, -1)}${corner(978, 536, -1, -1)}
  </g>`, { w: 1024, h: 576 });
}

/** Bottom-corner readout panel; `v` picks one of the scrambling variants. */
function readoutSvg(v, locked) {
  const r = rng(v * 733 + 17);
  const col = locked ? HUD_R : HUD_G;
  const seg = [
    [1, 1, 1, 1, 1, 1, 0], [0, 1, 1, 0, 0, 0, 0], [1, 1, 0, 1, 1, 0, 1], [1, 1, 1, 1, 0, 0, 1],
    [0, 1, 1, 0, 0, 1, 1], [1, 0, 1, 1, 0, 1, 1], [1, 0, 1, 1, 1, 1, 1], [1, 1, 1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 0, 1, 1],
  ];
  const digit = (d, ox, oy, s) => {
    const g = seg[d];
    const o = [];
    const S = (a, b, w, h) => o.push(`<rect x="${ox + a * s}" y="${oy + b * s}" width="${w * s}" height="${h * s}" fill="${col}"/>`);
    if (g[0]) S(4, 0, 20, 4);
    if (g[1]) S(24, 4, 4, 16);
    if (g[2]) S(24, 24, 4, 16);
    if (g[3]) S(4, 40, 20, 4);
    if (g[4]) S(0, 24, 4, 16);
    if (g[5]) S(0, 4, 4, 16);
    if (g[6]) S(4, 20, 20, 4);
    return o.join('');
  };
  const row = (label, n, y) => {
    let out = `<text x="14" y="${y + 32}" font-family="Helvetica, Arial, sans-serif" font-size="27"`
      + ` fill="${col}" fill-opacity="0.9" letter-spacing="4">${label}</text>`;
    for (let i = 0; i < n; i++) {
      const d = locked ? (i * 3 + v) % 10 : Math.floor(r() * 10);
      out += digit(d, 200 + i * 40, y + 4, 1.25);
    }
    return out;
  };
  return svg([0, 0, 384, 240], `<g>
    <rect x="0" y="0" width="384" height="240" fill="#04140c" fill-opacity="0.42"/>
    <rect x="0" y="0" width="384" height="3" fill="${col}" fill-opacity="0.6"/>
    <rect x="0" y="237" width="384" height="3" fill="${col}" fill-opacity="0.35"/>
    ${row('RANGE', 4, 14)}${row('DELTA', 4, 94)}${row('YIELD', 4, 174)}
  </g>`, { w: 384, h: 240 });
}

function wordSvg(word, color) {
  return svg([0, 0, 1024, 128], `<text x="512" y="94" text-anchor="middle"
    font-family="Helvetica, Arial, sans-serif" font-size="78" font-weight="bold"
    letter-spacing="14" fill="${color}">${word}</text>`, { w: 1024, h: 128 });
}

/** Unlit, depth-free quad for the HUD layer. */
function hudQuad(w, h, texture, opacity = 1) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({
      map: texture, transparent: true, opacity, depthTest: false, depthWrite: false,
      fog: false, toneMapped: false, side: THREE.DoubleSide,
    })
  );
  m.renderOrder = 4000;
  m.frustumCulled = false;
  return m;
}

/* ------------------------------------------------------------------ */
/* props                                                               */
/* ------------------------------------------------------------------ */

let _flareTex = null;
function flareTexture() {
  if (_flareTex) return _flareTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 1, 64, 64, 63);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.16, 'rgba(255,214,140,0.85)');
  grd.addColorStop(0.42, 'rgba(255,132,40,0.32)');
  grd.addColorStop(1, 'rgba(255,90,20,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  _flareTex = new THREE.CanvasTexture(c);
  return _flareTex;
}

function flareSprite(size, color, opacity) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: flareTexture(), color, transparent: true, opacity, fog: false,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  s.scale.set(size, size, 1);
  return s;
}

function torpedo() {
  const g = new THREE.Group();
  const hot = new THREE.MeshBasicMaterial({ color: 0xffe9bd, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const halo = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), hot));
  const trail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 1.05, 26, 8, 1, true), halo);
  trail.rotation.x = Math.PI / 2;
  trail.position.z = 13;
  g.add(trail);
  g.add(flareSprite(7, 0xffb060, 0.85));
  return g;
}

/** Overhead braces + wall outcrops: the things that whip past the lens. */
function speedLayer(len, seed) {
  const g = new THREE.Group();
  const r = rng(seed);
  const bar = new THREE.MeshStandardMaterial({ color: 0x969ca4, roughness: 0.5, metalness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x4b5158, roughness: 0.7 });
  const lamp = new THREE.MeshBasicMaterial({ color: 0xd88a30, toneMapped: false });
  const lamp2 = new THREE.MeshBasicMaterial({ color: 0x4aa8d8, toneMapped: false });
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const step = 46;
  for (let z = -len + 6; z < 0; z += step) {
    const jz = z + r() * 14;
    // a gantry spanning the canyon, high enough to pass over the ships
    const y = HEIGHT * (0.7 + r() * 0.22);
    const beam = box(WIDTH + 2, 1.5, 3.0, bar);
    beam.position.set(0, y, jz);
    g.add(beam);
    const beam2 = box(WIDTH + 2, 0.7, 1.1, dark);
    beam2.position.set(0, y - 1.4, jz);
    g.add(beam2);
    for (const sx of [-1, 1]) {
      const hang = box(1.2, 5.5, 1.2, bar);
      hang.position.set(sx * (HX - 4.5), y + 3, jz);
      g.add(hang);
      const l = box(1.0, 0.5, 0.9, lamp);
      l.position.set(sx * (HX - 8), y - 1.9, jz);
      g.add(l);
    }
    // wall outcrops that reach well into the canyon, alternating sides
    const sx = r() < 0.5 ? -1 : 1;
    const oy = 5 + r() * 26;
    const out = 3.5 + r() * 3.5;
    const pod = box(out, 2.2 + r() * 3.4, 4 + r() * 6, r() < 0.4 ? dark : bar);
    pod.position.set(sx * (HX - out / 2), oy, jz + 12);
    g.add(pod);
    const strip = box(0.6, 0.5, 7, lamp2);
    strip.position.set(sx * (HX - out - 0.4), oy, jz + 12);
    g.add(strip);
    // a low kerb block near the floor on the other side
    const kerb = box(2.6, 1.6 + r() * 2.4, 5 + r() * 7, dark);
    kerb.position.set(-sx * (HX - 3.6), 1.6, jz + 26);
    g.add(kerb);
    // a light strip running along the wall at pilot height
    const rail = box(0.5, 0.45, 20, r() < 0.5 ? lamp : lamp2);
    rail.position.set(-sx * (HX - 1.4), 12 + r() * 10, jz + 30);
    g.add(rail);
  }
  return g;
}

/* ------------------------------------------------------------------ */

export async function build(ctx) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060a);

  /* ---- light: a slot of daylight far overhead, cold bounce below ---- */
  const lights = lightRig(scene, 'trench', { shadows: false, fog: true });
  const fog = scene.fog;
  lights.key.color.set(0xe6efff);
  lights.key.position.set(150, 250, 60);
  lights.fill.color.set(0x5a7aa8);
  lights.fill.position.set(-200, 70, 140);
  lights.rim.color.set(0xb6d2ff);
  lights.rim.position.set(10, 90, -260);
  lights.amb.color.set(0x2a3b4e);
  const spaceKey = new THREE.DirectionalLight(0xfff2dc, 0);
  spaceKey.position.set(320, 210, 240);
  scene.add(spaceKey, spaceKey.target);

  /* ---- sky ---------------------------------------------------------- */
  const sky = spaceBackdrop({ seed: 41, radius: 5200, count: 3600, color: 0x3a3f86 });
  scene.add(sky);

  /* ---- beat A: the station in open space ---------------------------- */
  const spaceGrp = new THREE.Group();
  scene.add(spaceGrp);
  const station = battleStation({ radius: 420, seed: 17, seg: 108, texSize: 1024, greeble: 0.55 });
  station.position.set(70, -250, -1180);
  station.rotation.set(0.16, 0.5, 0.34);
  spaceGrp.add(station);

  /* ---- beat B: the armoured plain, and the guns on it --------------- */
  const diveGrp = new THREE.Group();
  scene.add(diveGrp);
  const plain = stationSurface({ size: 1500, seed: 131, density: 0.4 });
  plain.position.set(0, 0, -400);
  diveGrp.add(plain);
  const towers = [];
  const TOWER_AT = [[-96, -190], [78, -286], [-38, -392], [122, -474], [-140, -560]];
  TOWER_AT.forEach((p, i) => {
    const tw = turbolaserTower({ seed: 61 + i * 7 });
    tw.scale.setScalar(2.1);
    tw.position.set(p[0], 0, p[1]);
    towers.push(tw);
    diveGrp.add(tw);
  });

  /* ---- the trench itself: one tile, two clones, wrapped ------------- */
  const tile = trench({ length: LEN, width: WIDTH, height: HEIGHT, secLen: SEC, seed: 101, variants: 6 });
  const port = tile.userData.exhaustPort;
  tile.remove(port);
  tile.add(speedLayer(LEN, 909));

  const road = new THREE.Group();
  scene.add(road);
  road.add(tile);
  const tileB = tile.clone();
  tileB.position.z = -LEN;
  road.add(tileB);

  // flat list of tile sections with their (road-local) z, so they can be
  // culled by hand instead of pushing the shared camera's far plane about
  const sections = [];
  for (const [grp, off] of [[tile, 0], [tileB, -LEN]]) {
    for (const ch of grp.children) sections.push({ o: ch, z: ch.position.z + off });
  }

  /* ---- the exhaust port, driven independently of the wrap ----------- */
  const portRig = new THREE.Group();
  scene.add(portRig);
  port.position.set(0, 0, 0);
  port.scale.setScalar(2.0);
  portRig.add(port);
  const throatMat = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const throat = new THREE.Mesh(new THREE.CircleGeometry(7.4, 26), throatMat);
  throat.rotation.x = -Math.PI / 2;
  throat.position.y = 1.6;
  portRig.add(throat);
  const maw = new THREE.Mesh(new THREE.CircleGeometry(8.4, 26), new THREE.MeshBasicMaterial({ color: 0x140b05 }));
  maw.rotation.x = -Math.PI / 2;
  maw.position.y = 1.42;
  portRig.add(maw);
  // reads through fog from a kilometre away, which is the whole point of it
  const portFlare = flareSprite(46, 0xffa040, 0.9);
  portFlare.position.set(0, 7, 0);
  portRig.add(portFlare);
  const portBlast = explosionBurst({ size: 54, seed: 23, shards: 26, gravity: -3, spread: 1.3 });
  portBlast.position.y = 3;
  portBlast.visible = false;
  portRig.add(portBlast);

  /* ---- the plain above the trench, for the pull-out ----------------- */
  const rimGrp = new THREE.Group();
  rimGrp.position.y = HEIGHT;
  scene.add(rimGrp);
  const rimPlate = stationSurface({ size: 1800, seed: 211, slotWidth: WIDTH, density: 0.26 });
  rimGrp.add(rimPlate);

  /* ---- ships -------------------------------------------------------- */
  const xw = [];
  for (let i = 0; i < 5; i++) {
    const s = xwing({ seed: 5 + i * 13 });
    s.scale.setScalar(SH);
    scene.add(s);
    xw.push(s);
  }
  const HERO = xw[0], WINGL = xw[1], WINGR = xw[2];

  const ties = [];
  for (let i = 0; i < 3; i++) {
    const s = tiefighter({ seed: 17 + i * 11 });
    s.scale.setScalar(SH);
    scene.add(s);
    ties.push(s);
  }

  const torps = [torpedo(), torpedo()];
  torps.forEach((tp) => scene.add(tp));

  /* ---- the wingman's death ------------------------------------------ */
  const wreck = new THREE.Group();
  scene.add(wreck);
  const wreckFire = new Fireball(wreck, {
    t0: T_KILL, pos: [-15.5, 12.5, 0], size: 8, dur: 1.7, seed: 31,
    brickCount: 26, gravity: -3, ring: true,
  });
  const wreckBricks = new BrickBurst(wreck, {
    t0: T_KILL, origin: [-15.5, 12.5, 0], count: 44, speed: 22, size: 1.0,
    seed: 61, life: 3.2, gravity: -7, stagger: 0.14,
  });
  const wreckSmoke = new Smoke(wreck, {
    t0: T_KILL + 0.1, count: 16, origin: [-15, 12, 0], spread: 8, size: 9,
    rise: 1.1, life: 2.4, opacity: 0.45, color: 0x6b6f76, spawnWindow: 1.4, seed: 12,
  });

  /* ---- the targeting computer --------------------------------------- */
  const hud = new THREE.Group();
  scene.add(hud);
  const ring = hudQuad(1.42, 1.42, svgTexture(ringSvg(), { w: 512, h: 512, key: 'trReticleRing' }));
  const cross = hudQuad(3.2, 1.8, svgTexture(crossSvg(), { w: 1024, h: 576, key: 'trReticleCross' }));
  const boxA = hudQuad(1, 1, svgTexture(boxSvg(), { w: 256, h: 256, key: 'trReticleBox' }));
  const brG = svgTexture(bracketSvg(HUD_G), { w: 128, h: 128, key: 'trBrkG' });
  const brR = svgTexture(bracketSvg(HUD_R), { w: 128, h: 128, key: 'trBrkR' });
  const brackets = [];
  const bracketsLocked = [];
  for (let i = 0; i < 4; i++) {
    const q = hudQuad(0.40, 0.40, brG);
    q.rotation.z = -i * Math.PI / 2;
    brackets.push(q);
    hud.add(q);
    const r = hudQuad(0.30, 0.30, brR);
    r.rotation.z = -i * Math.PI / 2;
    r.material.opacity = 0;
    bracketsLocked.push(r);
    hud.add(r);
  }
  hud.add(ring, cross, boxA);
  const panels = [];
  for (let i = 0; i < 6; i++) {
    const q = hudQuad(0.72, 0.45, svgTexture(readoutSvg(i, false), { w: 384, h: 240, key: 'trRead' + i }));
    panels.push(q);
    hud.add(q);
  }
  const panelLock = hudQuad(0.72, 0.45, svgTexture(readoutSvg(3, true), { w: 384, h: 240, key: 'trReadLock' }));
  hud.add(panelLock);
  const wordLock = hudQuad(1.5, 0.1875, svgTexture(wordSvg('LOCK', HUD_R), { w: 1024, h: 128, key: 'trWordLock' }));
  const wordAcq = hudQuad(1.5, 0.1875, svgTexture(wordSvg('ACQUIRING', HUD_G), { w: 1024, h: 128, key: 'trWordAcq' }));
  hud.add(wordLock, wordAcq);

  /* ================================================================== */
  /* ordnance                                                            */
  /* ================================================================== */

  /* beat B — the surface guns, firing up at the diving squadron */
  const diveShots = [];
  const diveHits = [];
  for (let i = 0; i < 14; i++) {
    const tw = towers[i % towers.length];
    const t0 = 4.7 + i * 0.29;
    diveHits.push({ t: t0, tw: i % towers.length });
    diveShots.push(...volley({
      t0, count: 2, interval: 0.12,
      from: [tw.position.x, 13, tw.position.z],
      to: [tw.position.x * 0.3 + (i % 5 - 2) * 30, 120 + (i % 4) * 46, tw.position.z + 190],
      speed: 620, color: 0x63ff4a, len: 30, thick: 0.66, seed: 3 + i, spread: 34, fromSpread: 8,
    }));
  }
  const diveBolts = new Bolts(diveGrp, diveShots);

  /* beats C–F — the dogfight.  The camera and the ships hold station in
     world space while the trench scrolls, so bolt paths can be authored
     once in that frame. */
  const heroGun = (i, t0) => volley({
    t0, count: 3, interval: 0.11,
    from: [0.9 + (i % 2 ? 6.2 : -6.2), 12.6, -37],
    to: [(i % 2 ? 3.4 : -3.0) + (i % 3 - 1) * 2, 11.2, -560],
    speed: 900, color: 0xff2b12, len: 30, thick: 0.5, seed: 11 + i, spread: 5,
  });
  const wingGun = (i, t0) => volley({
    t0, count: 3, interval: 0.12,
    from: [12.4, 15.4, -68], to: [4, 12, -560],
    speed: 880, color: 0xff3a18, len: 26, thick: 0.44, seed: 41 + i, spread: 9,
  });
  const HERO_BURSTS = [10.4, 12.6, 14.1, 17.6, 18.4, 19.6, 22.6, 23.4, 35.1, 36.3, 37.4, 38.6];
  const WING_BURSTS = [11.2, 13.4, 18.0, 22.1, 35.8, 37.9];
  const redShots = [];
  HERO_BURSTS.forEach((t0, i) => redShots.push(...heroGun(i, t0)));
  WING_BURSTS.forEach((t0, i) => redShots.push(...wingGun(i, t0)));
  const redBolts = new Bolts(scene, redShots);

  /* green: the TIEs behind, firing past the lens */
  const tieMuz = [[-8.6, 15.0, 22], [10.4, 11.6, 30], [0.4, 18.4, 48]];
  const greenShots = [];
  const TIE_BURSTS = [16.6, 17.4, 18.3, 19.3, 20.6, 22.2, 23.2, 34.6, 35.4, 36.2, 37.0, 37.8, 38.5, 39.2, 40.1, 41.0];
  TIE_BURSTS.forEach((t0, i) => {
    const m = tieMuz[i % 3];
    greenShots.push(...volley({
      t0, count: 3, interval: 0.1,
      from: [m[0], m[1], m[2]],
      to: [m[0] * 0.2 + (i % 3 - 1) * 9, 10 + (i % 2) * 5, -420],
      speed: 820, color: 0x63ff4a, len: 26, thick: 0.5, seed: 71 + i, spread: 12, fromSpread: 3,
    }));
  });
  /* the wall turrets: green fire crossing the canyon */
  const WALL_BURSTS = [19.1, 19.9, 21.9, 23.0, 34.9, 35.7, 36.9, 38.1, 39.0, 40.4, 41.4];
  WALL_BURSTS.forEach((t0, i) => {
    const sx = i % 2 ? 1 : -1;
    greenShots.push(...volley({
      t0, count: 2, interval: 0.14,
      from: [sx * (HX - 1), 16 + (i % 3) * 9, -150 - (i % 4) * 60],
      to: [-sx * (HX - 3), 8 + (i % 2) * 10, -40 - (i % 3) * 40],
      speed: 620, color: 0x8dff62, len: 22, thick: 0.46, seed: 91 + i, spread: 8,
    }));
  });
  /* the burst that kills the wingman */
  const killShots = volley({
    t0: 19.94, count: 4, interval: 0.09,
    from: [-8.6, 15.0, 22], to: [-12.0, 11.5, -46],
    speed: 640, color: 0x63ff4a, len: 24, thick: 0.5, seed: 5, spread: 2.5,
  });
  greenShots.push(...killShots);
  const greenBolts = new Bolts(scene, greenShots);

  const hitFlashes = new Impacts(scene, [
    ...killShots.map((s, i) => ({ t: T_HITWING + i * 0.09, pos: [-12.4, 11.6, -46], size: 1.5, color: 0xffe6a0 })),
    { t: 19.2, pos: [10, 9, -70], size: 1.4, color: 0x9dffb0 },
    { t: 23.1, pos: [-9, 20, -90], size: 1.5, color: 0x9dffb0 },
    { t: 35.9, pos: [8, 6, -60], size: 1.6, color: 0x9dffb0 },
    { t: 38.2, pos: [-10, 22, -84], size: 1.6, color: 0x9dffb0 },
    { t: 40.7, pos: [7, 5, -52], size: 1.8, color: 0x9dffb0 },
  ]);

  /* ------------------------------------------------------------------ */
  /* helpers used every frame                                            */
  /* ------------------------------------------------------------------ */

  const place = (o, x, y, z, rx = 0, ry = 0, rz = 0) => {
    o.position.set(x, y, z);
    o.rotation.set(rx, ry, rz);
  };
  /** Formation slot with a lazy weave, so nothing looks pinned. */
  const fly = (o, t, X, Y, Z, sd, amp = 1) => {
    place(o,
      X + noise(t * 0.62, sd) * 1.9 * amp,
      Y + noise(t * 0.51, sd + 7) * 1.5 * amp,
      Z + noise(t * 0.33, sd + 13) * 3.4 * amp,
      noise(t * 0.44, sd + 21) * 0.045, noise(t * 0.4, sd + 3) * 0.03,
      noise(t * 0.55, sd + 31) * 0.20 * amp);
  };
  const tmp = new THREE.Vector3();
  const camAt = (cam, px, py, pz, tx, ty, tz, fov, roll = 0) => {
    cam.position.set(px, py, pz);
    cam.lookAt(tx, ty, tz);
    if (roll) cam.rotateZ(roll);
    cam.fov = fov;
  };

  return {
    scene,

    cues: [
      /* the target */
      { t: 0.02, sfx: 'rumbleSub', opts: { gain: 0.95, dur: 3.4 } },
      { t: 0.04, sfx: 'engineRumble', opts: { gain: 0.55, dur: 4.4 } },
      { t: 0.10, sfx: 'engineWhoosh', opts: { gain: 0.75, dur: 1.8 } },
      { t: 0.55, sfx: 'radioStatic', opts: { gain: 0.4, dur: 1.3 } },
      { t: 2.10, sfx: 'enginePass', opts: { gain: 1.0, dur: 0.9, from: -0.9, to: 0.9 } },
      { t: 2.32, sfx: 'enginePass', opts: { gain: 0.92, dur: 0.9, from: 0.85, to: -0.85 } },
      { t: 2.60, sfx: 'enginePass', opts: { gain: 0.95, dur: 0.9, from: -0.7, to: 0.7, pitch: 1.12 } },
      { t: 3.24, sfx: 'enginePass', opts: { gain: 0.85, dur: 1.0, from: 0.8, to: -0.6, pitch: 0.95 } },
      { t: 3.42, sfx: 'commBeep', opts: { gain: 0.5 } },
      { t: 3.56, sfx: 'radioStatic', opts: { gain: 0.35, dur: 1.0 } },
      /* the dive */
      { t: 4.05, sfx: 'engineWhoosh', opts: { gain: 0.85, dur: 2.6 } },
      { t: 4.30, sfx: 'rumbleSub', opts: { gain: 0.6, dur: 3.0 } },
      { t: 4.62, sfx: 'alarm', opts: { gain: 0.28, dur: 5.4 } },
      ...[4.70, 4.99, 5.28, 5.57, 5.86, 6.15, 6.44, 6.73, 7.02, 7.31, 7.60, 7.89, 8.18, 8.47]
        .map((t, i) => ({ t, sfx: 'turbolaser', opts: { gain: 0.8, pan: (i % 3 - 1) * 0.55 } })),
      { t: 6.66, sfx: 'engineWhoosh', opts: { gain: 0.6, dur: 1.6 } },
      { t: 8.55, sfx: 'enginePass', opts: { gain: 0.95, dur: 1.0, from: -0.8, to: 0.8 } },
      /* in the trench */
      { t: 8.95, sfx: 'engineRumble', opts: { gain: 0.8, dur: 9 } },
      { t: 9.00, sfx: 'rumbleSub', opts: { gain: 0.7, dur: 4 } },
      { t: 9.06, sfx: 'engineWhoosh', opts: { gain: 0.7, dur: 2.2 } },
      ...[10.4, 12.6, 14.1].map((t) => ({ t, sfx: 'laser', opts: { gain: 0.75, pan: -0.3 } })),
      ...[10.62, 12.82, 14.32].map((t) => ({ t, sfx: 'laser', opts: { gain: 0.7, pan: 0.3 } })),
      ...[11.2, 13.4].map((t) => ({ t, sfx: 'laser', opts: { gain: 0.6, pan: 0.55 } })),
      { t: 11.45, sfx: 'enginePass', opts: { gain: 0.7, dur: 1.3, from: 0.8, to: -0.8 } },
      { t: 13.55, sfx: 'engineWhoosh', opts: { gain: 0.55, dur: 1.5 } },
      { t: 14.72, sfx: 'commBeep', opts: { gain: 0.55 } },
      { t: 14.86, sfx: 'radioStatic', opts: { gain: 0.42, dur: 1.4 } },
      /* the pursuit */
      { t: 16.05, sfx: 'engineRumble', opts: { gain: 0.7, dur: 8.5 } },
      { t: 16.15, sfx: 'enginePass', opts: { gain: 0.9, dur: 1.4, from: 0.9, to: -0.4, pitch: 0.9 } },
      { t: 16.50, sfx: 'enginePass', opts: { gain: 0.8, dur: 1.4, from: -0.9, to: 0.4, pitch: 0.95 } },
      { t: 16.9, sfx: 'alarm', opts: { gain: 0.3, dur: 6 } },
      ...TIE_BURSTS.filter((t) => t < 24).map((t, i) => ({ t, sfx: 'laser', opts: { gain: 0.72, pitch: 0.86, pan: (i % 3 - 1) * 0.55 } })),
      ...WALL_BURSTS.filter((t) => t < 24).map((t, i) => ({ t, sfx: 'turbolaser', opts: { gain: 0.55, pan: i % 2 ? 0.7 : -0.7 } })),
      ...[17.6, 18.4, 19.6, 22.6, 23.4].map((t) => ({ t, sfx: 'laser', opts: { gain: 0.72 } })),
      { t: 19.94, sfx: 'laser', opts: { gain: 0.9, pitch: 0.84, pan: -0.5 } },
      { t: T_HITWING, sfx: 'hullImpact', opts: { gain: 0.95, pan: -0.4 } },
      { t: T_HITWING + 0.14, sfx: 'blaster', opts: { gain: 0.5, pitch: 0.6, pan: -0.4 } },
      { t: T_HITWING + 0.26, sfx: 'alarm', opts: { gain: 0.42, dur: 1.1 } },
      { t: T_KILL, sfx: 'bigExplosion', opts: { gain: 1.0, pan: -0.35 } },
      { t: T_KILL + 0.02, sfx: 'rumbleSub', opts: { gain: 0.95, dur: 2.4 } },
      { t: T_KILL + 0.18, sfx: 'hullImpact', opts: { gain: 0.7, pan: -0.5 } },
      { t: T_KILL + 0.55, sfx: 'explosion', opts: { gain: 0.55, size: 0.7 } },
      { t: 22.4, sfx: 'radioStatic', opts: { gain: 0.4, dur: 1.2 } },
      /* the targeting computer */
      { t: 24.1, sfx: 'commBeep', opts: { gain: 0.5 } },
      { t: 24.3, sfx: 'engineRumble', opts: { gain: 0.5, dur: 10 } },
      { t: 25.0, sfx: 'targetingLock', opts: { gain: 0.62 } },
      { t: 26.7, sfx: 'targetingLock', opts: { gain: 0.66 } },
      { t: T_LOCK - 0.9, sfx: 'targetingLock', opts: { gain: 0.82 } },
      { t: T_LOCK + 0.05, sfx: 'commBeep', opts: { gain: 0.6 } },
      { t: 29.6, sfx: 'radioStatic', opts: { gain: 0.3, dur: 1.6 } },
      { t: 31.4, sfx: 'commBeep', opts: { gain: 0.35 } },
      { t: T_OFF + 0.05, sfx: 'commBeep', opts: { gain: 0.45, pitch: 0.6 } },
      { t: T_OFF + 0.3, sfx: 'radioStatic', opts: { gain: 0.22, dur: 0.9 } },
      /* the run */
      { t: B_RUN + 0.05, sfx: 'engineRumble', opts: { gain: 0.9, dur: 8 } },
      { t: B_RUN + 0.1, sfx: 'rumbleSub', opts: { gain: 0.75, dur: 5 } },
      { t: B_RUN + 0.7, sfx: 'alarm', opts: { gain: 0.34, dur: 5.5 } },
      ...TIE_BURSTS.filter((t) => t >= 24).map((t, i) => ({ t, sfx: 'laser', opts: { gain: 0.78, pitch: 0.86, pan: (i % 3 - 1) * 0.6 } })),
      ...WALL_BURSTS.filter((t) => t >= 24).map((t, i) => ({ t, sfx: 'turbolaser', opts: { gain: 0.6, pan: i % 2 ? 0.75 : -0.75 } })),
      ...[35.1, 36.3, 37.4, 38.6].map((t) => ({ t, sfx: 'laser', opts: { gain: 0.75 } })),
      { t: 36.45, sfx: 'enginePass', opts: { gain: 0.8, dur: 1.0, from: 0.8, to: -0.8, pitch: 0.9 } },
      { t: 38.8, sfx: 'hullImpact', opts: { gain: 0.6, pan: 0.4 } },
      { t: 39.3, sfx: 'commBeep', opts: { gain: 0.5 } },
      /* away */
      { t: T_LAUNCH, sfx: 'podLaunch', opts: { gain: 0.85 } },
      { t: T_LAUNCH + 0.04, sfx: 'engineWhoosh', opts: { gain: 0.9, dur: 1.6 } },
      { t: T_LAUNCH + 0.12, sfx: 'rumbleSub', opts: { gain: 0.7, dur: 3.2 } },
      { t: 41.8, sfx: 'targetingLock', opts: { gain: 0.5 } },
      { t: T_HIT, sfx: 'bigExplosion', opts: { gain: 1.0 } },
      { t: T_HIT + 0.03, sfx: 'rumbleSub', opts: { gain: 1.0, dur: 3.4 } },
      { t: T_HIT + 0.34, sfx: 'explosion', opts: { gain: 0.8, size: 0.9 } },
      { t: T_HIT + 0.42, sfx: 'engineWhoosh', opts: { gain: 0.9, dur: 2.4 } },
      { t: T_HIT + 0.62, sfx: 'hullImpact', opts: { gain: 0.7 } },
      { t: 44.3, sfx: 'enginePass', opts: { gain: 0.8, dur: 1.6, from: -0.6, to: 0.6 } },
      { t: 44.6, sfx: 'crowdCheer', opts: { gain: 0.34, dur: 2.6 } },
      { t: 45.0, sfx: 'engineRumble', opts: { gain: 0.4, dur: 2.2 } },
    ],

    /* ================================================================ */

    update(t, c) {
      const cam = c.camera;
      cam.up.set(0, 1, 0);

      const s = scroll(t);
      const inTrench = t >= B_TRENCH - 0.35;
      const v = speedAt(t);

      /* ---- world placement ---------------------------------------- */
      road.position.z = ((s % LEN) + LEN) % LEN;
      const portZ = -(PORT_Q - s);
      portRig.position.z = portZ;
      rimGrp.position.z = portZ;

      spaceGrp.visible = t < B_DIVE + 0.05;
      diveGrp.visible = t >= B_DIVE - 0.45 && t < B_TRENCH;
      road.visible = inTrench;
      portRig.visible = inTrench && portZ > -2400;
      rimGrp.visible = t > 38.0;
      hud.visible = t > B_COMP + 0.6 && t < T_OFF + 0.9;
      wreck.visible = t > T_KILL - 0.05 && t < T_KILL + 4.0;

      /* lighting: hard sun outside, slot light inside */
      spaceKey.intensity = t < B_TRENCH ? 3.4 : 0;
      lights.key.intensity = t < B_TRENCH ? 0.8 : 3.0;
      lights.fill.intensity = t < B_TRENCH ? 0.6 : 1.7;
      lights.rim.intensity = t < B_TRENCH ? 0.8 : 2.0;
      lights.amb.intensity = t < B_TRENCH ? 0.45 : 1.85;
      sky.visible = t < B_TRENCH || t > 42.6;
      if (t < B_TRENCH) { fog.near = 3000; fog.far = 40000; }
      else if (t > T_OUT) { fog.near = 400; fog.far = 2100 + (t - T_OUT) * 700; }
      else if (t > B_RUN) { fog.near = 170; fog.far = 1550; }
      else { fog.near = 70; fog.far = 820; }

      /* ---- ordnance (declarative, so order does not matter) -------- */
      diveBolts.update(t);
      redBolts.update(t);
      greenBolts.update(t);
      hitFlashes.update(t);
      wreckFire.update(t);
      wreckBricks.update(t);
      wreckSmoke.update(t);
      tile.userData.update(t);
      plain.userData.update?.(t);
      rimPlate.userData.update?.(t);

      flash(c.stage, t, [
        ...[4.7, 6.15, 7.6].map((tt) => ({ t: tt, dur: 0.16, amount: 0.13, color: 0x9dffb0 })),
        { t: T_KILL, dur: 0.42, amount: 0.38, color: 0xffd9a0 },
        { t: T_LOCK, dur: 0.24, amount: 0.14, color: 0xffb0a0 },
        { t: T_LAUNCH, dur: 0.28, amount: 0.2, color: 0xffe8c0 },
        { t: T_HIT, dur: 0.55, amount: 0.62, color: 0xfff0cc },
        { t: T_HIT + 0.6, dur: 0.8, amount: 0.24, color: 0xffb066 },
      ]);

      /* ================================================================
       * A — the target
       * ============================================================== */
      if (t < B_DIVE) {
        for (const o of xw) { o.visible = true; o.userData.setSFoils(clamp(beat(t, 3.3, 4.4))); setEngineGlow(o, 0.9); }
        for (const o of ties) o.visible = false;

        if (t < 2.1) {
          /* the squadron drops away from the lens toward a grey moon */
          const p = t / 2.1;
          const lead = 26 - 210 * t;
          const slot = [[0, 0, 0], [-17, -3.5, 22], [17, -2.5, 26], [-33, 2.5, 46], [33, 3.5, 50]];
          xw.forEach((o, i) => {
            const sl = slot[i];
            place(o, sl[0] + noise(t * 0.8, i) * 2.2, sl[1] + 2 + noise(t * 0.7, i + 5) * 1.6,
              lead + sl[2], -0.02, 0, noise(t * 0.7, i + 11) * 0.16);
          });
          camAt(cam, 4 + p * 3, 10 - p * 2, 62 - p * 16, 0, 2 - p * 6, -260, 44 - p * 5,
            -0.03 + p * 0.02);
        } else {
          /* the lens pass: they come over the camera and dive for the moon */
          const p = beat(t, 2.1, B_DIVE);
          const start = [230, 158, 96, 520, 700];
          const lat = [[-15, 7], [13, -6], [-25, -9], [21, 10], [-6, 13]];
          xw.forEach((o, i) => {
            const z = start[i] - 420 * (t - 2.1);
            const near = clamp(1 - Math.abs(z - 30) / 220);
            place(o, lat[i][0] * (0.55 + near * 0.9), lat[i][1] * (0.6 + near * 0.9) + 2, z,
              -0.03, 0, (i % 2 ? 0.3 : -0.28) * near + noise(t * 0.9, i + 3) * 0.14);
          });
          camAt(cam, 0.5, 3.5, 44, 1.5, 2.5, -300, 62 - p * 8, 0.05 - p * 0.09);
        }
        station.rotation.y = 0.5 + t * 0.004;
        cam.updateProjectionMatrix();
        return;
      }

      /* ================================================================
       * B — the dive
       * ============================================================== */
      if (t < B_TRENCH) {
        const k = beat(t, B_DIVE, B_TRENCH);
        const sf = clamp(beat(t, B_DIVE + 0.25, B_DIVE + 1.8));
        for (const o of xw) { o.visible = true; o.userData.setSFoils(sf); setEngineGlow(o, 1.05); }
        for (const o of ties) o.visible = false;

        // the squadron falls out of the sky and levels off over the plain
        const y0 = lerp(215, 40, Math.pow(k, 0.72));
        const zc = lerp(-110, -600, smoothstep(0, 1, k));
        const pitch = -0.52 * (1 - smoothstep(0.4, 1, k));
        const slot = [[0, 0, 0], [-21, 7, 30], [21, 6, 36], [-40, 14, 62], [40, 13, 68]];
        xw.forEach((o, i) => {
          const sl = slot[i];
          place(o,
            sl[0] + noise(t * 0.7, i) * 2.6,
            y0 + sl[1] * (1 - k * 0.45) + noise(t * 0.6, i + 4) * 2.6,
            zc + sl[2], pitch, 0, noise(t * 0.6, i + 9) * 0.22);
        });
        towers.forEach((tw, i) => {
          tw.userData.aim(tmp.set(xw[i % 5].position.x, xw[i % 5].position.y, xw[i % 5].position.z));
          tw.userData.fire(diveHits.some((h) => h.tw === i && t - h.t > -0.02 && t - h.t < 0.16));
        });

        if (t < 6.45) {
          /* over the shoulder of the formation, the plain rushing up */
          const p = beat(t, B_DIVE, 6.45);
          camAt(cam, 8 - p * 5, y0 + 40 - p * 18, zc + 108 - p * 20,
            0, y0 - 34 - p * 40, zc - 150, 54 + p * 8, 0.05 - p * 0.07);
        } else {
          /* low on the deck: a tower hammering away right past the lens */
          const p = beat(t, 6.45, B_TRENCH);
          const tw = towers[3];
          camAt(cam, tw.position.x + 34 - p * 8, 10 + p * 6, tw.position.z + 62 - p * 14,
            tw.position.x - 4, 46 + p * 74, tw.position.z - 60, 62 - p * 6, -0.06 + p * 0.06);
        }
        cam.updateProjectionMatrix();
        return;
      }

      /* ================================================================
       * inside the trench (C onward) — shared setup
       * ============================================================== */
      const burn = 0.62 + (v - 88) / 260;
      xw.forEach((o, i) => { o.visible = i < 3; o.userData.setSFoils(1); setEngineGlow(o, burn); });
      for (const o of ties) { o.visible = t > B_CHASE - 0.2 && t < 42.0; setEngineGlow(o, 0.9); }

      /* formation: hero nearest the lens, the other two staggered ahead */
      fly(HERO, t, 0.9, 12.6, -30, 1, 1);
      fly(WINGR, t, 12.6, 15.6, -62, 3, 1);
      if (t < T_HITWING) {
        fly(WINGL, t, -12.0, 11.5, -46, 2, 1);
      } else {
        /* hit: he rolls out of formation and cartwheels into the wall */
        const k = beat(t, T_HITWING, T_KILL);
        place(WINGL,
          lerp(-12.0, -16.4, k * k), lerp(11.5, 12.5, k), lerp(-46, -41, k),
          k * 5.6, k * 1.1, k * 9.4);
        setEngineGlow(WINGL, 0.15);
      }
      WINGL.visible = t < T_KILL;

      ties.forEach((o, i) => {
        const m = tieMuz[i];
        const enter = smoothstep(0, 1, beat(t, B_CHASE, B_CHASE + 1.4));
        fly(o, t, m[0], m[1] + (1 - enter) * 40, m[2] + (1 - enter) * 70, 40 + i * 9, 1.2);
      });

      /* torpedoes: they pull away from the ship and drop into the well */
      const tk = beat(t, T_LAUNCH, T_HIT);
      const tEase = 0.72 * tk + 0.28 * tk * tk;
      const torpQ = lerp(TORP_Q0, PORT_Q, tEase);
      const dive = smoothstep(0.72, 1, tk);
      torps.forEach((tp, i) => {
        const live = t >= T_LAUNCH && t < T_HIT + 0.04;
        tp.visible = live;
        if (!live) return;
        const sgn = i ? 1 : -1;
        tp.position.set(
          lerp(0.9 + sgn * 6.0, 0, Math.pow(dive, 0.7)),
          lerp(12.0, 2.6, Math.pow(dive, 1.4)),
          -(torpQ - s) + i * 3);
        tp.rotation.set(-dive * 0.6, 0, 0);
      });

      /* the wreck rides the wall it hit, so it recedes with the trench */
      wreck.position.z = s - scroll(T_KILL) - 42;

      /* the port lights up as the torpedoes go in */
      const pk = clamp((t - T_HIT) / 2.6);
      portBlast.visible = t > T_HIT - 0.02 && t < T_HIT + 3.0;
      if (portBlast.visible) portBlast.userData.setT(clamp((t - T_HIT) / 3.0));
      const near = clamp(1 - (-portZ) / 900);
      portFlare.material.opacity = t > T_HIT
        ? 0.9 + 1.2 * Math.pow(1 - pk, 1.4)
        : (0.35 + 0.5 * near) * (0.8 + 0.2 * Math.sin(t * 3.4));
      portFlare.scale.setScalar(t > T_HIT ? 46 + 220 * Math.pow(pk, 0.4) : 46);
      throatMat.opacity = t > T_HIT ? clamp(1 - pk * 0.5) : 0.5 + 0.35 * Math.sin(t * 3.4);
      throat.scale.setScalar(t > T_HIT ? 1 + pk * 2.2 : 1);

      /* which way the shot is pointed, for hand-rolled section culling */
      let viewDir = -1;
      if ((t >= 11.4 && t < 13.5) || (t >= B_CHASE && t < 17.7)
        || (t >= 21.45 && t < 22.6) || (t >= 36.3 && t < 37.6)) viewDir = 1;

      /* ================================================================
       * C — in the trench
       * ============================================================== */
      let camZ = 0;
      if (t < B_CHASE) {
        if (t < 11.4) {
          const p = beat(t, B_TRENCH, 11.4);
          camAt(cam, 0.6, 15.4 - p * 1.2, -4, 0.6, 12.2, -80, 66,
            noise(t * 1.6, 2) * 0.012);
          camZ = -4;
        } else if (t < 13.5) {
          /* looking back up the trench at them coming */
          const p = beat(t, 11.4, 13.5);
          camAt(cam, -1.5 + p * 3, 13.6, -104 - p * 6, 0.4, 13.0, 40, 62,
            0.03 - p * 0.05);
          camZ = -104 - p * 6;
        } else {
          /* skimming the starboard wall, greebles inches from the lens */
          const p = beat(t, 13.5, B_CHASE);
          camAt(cam, 14.6 - p * 1.5, 9.6 + p * 3.6, -16 + p * 4, 2.0, 12.4, -110, 70 - p * 4,
            -0.08 + p * 0.05);
          camZ = -16 + p * 4;
        }
      } else if (t < B_COMP) {
        /* ==============================================================
         * D — pursuit
         * ============================================================ */
        if (t < 17.7) {
          /* look back: three TIEs fall into the canyon behind */
          const p = beat(t, B_CHASE, 17.7);
          camAt(cam, 2.4, 15.2 - p * 0.6, -18, 0.5, 14.6 + p * 1.0, 60, 58 + p * 4,
            -0.04 + p * 0.07);
          camZ = -18;
        } else if (t < 20.2) {
          /* chase cam again, red fire going out, green coming in */
          const p = beat(t, 17.7, 20.2);
          camAt(cam, -3.2 + p * 2.0, 14.0 + p * 1.4, -2 - p * 2, -1.5, 12.0, -90, 68,
            0.02 + noise(t * 2.2, 4) * 0.02);
          camZ = -2 - p * 2;
        } else if (t < 21.45) {
          /* the wingman goes in: hold on him from the far side */
          const p = beat(t, 20.2, 21.45);
          const shake = Math.max(0, 1 - Math.abs(t - T_KILL) * 3.0);
          camAt(cam, 13.0 + noise(t * 6, 9) * shake * 1.6, 15.0 + noise(t * 6, 12) * shake * 1.6,
            -6 - p * 2, -9.0, 12.4, -60, 62,
            -0.05 + p * 0.03 + noise(t * 7, 15) * shake * 0.05);
          camZ = -6 - p * 2;
        } else if (t < 22.6) {
          /* look back at the fire falling away behind them */
          const p = beat(t, 21.45, 22.6);
          const shake = Math.max(0, 1 - Math.abs(t - T_KILL) * 1.6);
          camAt(cam, 2.0, 16.4, -22, -4.0 - p * 3, 13.0, 70, 60 + p * 4,
            0.06 - p * 0.09 + noise(t * 7, 17) * shake * 0.03);
          camZ = -22;
        } else {
          /* back on the hero, tighter */
          const p = beat(t, 22.6, B_COMP);
          camAt(cam, 6.2 - p * 4.0, 16.6 - p * 1.6, -7, 0.6, 12.4, -95, 64, 0.05 - p * 0.06);
          camZ = -7;
        }
      } else if (t < B_RUN) {
        /* ==============================================================
         * E — the targeting computer
         * ============================================================ */
        if (t < T_LOCK + 0.4) {
          /* tight on the lead ship as the boxes converge */
          const p = beat(t, B_COMP, T_LOCK + 0.4);
          camAt(cam, 10.4 - p * 5.6, 14.8 - p * 0.8, -12 + p * 2.0, 1.4, 12.6, -46, 46 - p * 5,
            0.03 - p * 0.04);
          camZ = -12 + p * 2.0;
        } else {
          /* settle: a slow push toward the cockpit, everything quiet */
          const p = smoothstep(0, 1, beat(t, T_LOCK + 0.4, B_RUN));
          camAt(cam, 4.8 - p * 1.8, 14.2 - p * 0.4, -14.5 + p * 2.4, 0.9, 12.9, -40, 41 - p * 5,
            -0.01 + p * 0.015);
          camZ = -14.5 + p * 2.4;
        }
      } else if (t < B_AWAY) {
        /* ==============================================================
         * F — the run
         * ============================================================ */
        if (t < 36.3) {
          const p = beat(t, B_RUN, 36.3);
          camAt(cam, 0.9, 14.8 - p * 1.4, -2, 0.6, 11.4 - p * 1.4, -200, 68 - p * 5,
            noise(t * 2.4, 6) * 0.014);
          camZ = -2;
        } else if (t < 37.6) {
          /* one last look back: the TIEs still there, cannon fire past */
          const p = beat(t, 36.3, 37.6);
          camAt(cam, -2.0, 15.4, -24, 1.0, 14.0, 54, 60, 0.05 - p * 0.09);
          camZ = -24;
        } else {
          /* down the pipe, lens tightening onto the port */
          const p = beat(t, 37.6, B_AWAY);
          camAt(cam, 0.6, 13.6 + p * 1.4, 2 - p * 4, 0.4, 10.0, -260, 60 - p * 8,
            noise(t * 2.8, 8) * 0.012);
          camZ = 2 - p * 4;
        }
      } else {
        /* ==============================================================
         * G — away
         * ============================================================ */
        if (t < 40.9) {
          /* the launch, from above and behind the hero */
          const p = beat(t, B_AWAY, 40.9);
          camAt(cam, 2.6 - p * 1.2, 16.4 - p * 1.0, 6 - p * 4, 0.6, 10.6, -170, 62 - p * 4,
            0.03 - p * 0.04);
          camZ = 6 - p * 4;
        } else if (t < 42.35) {
          /* over the top of the ship, watching them go */
          const p = beat(t, 40.9, 42.35);
          camAt(cam, 0.9, 20.6 - p * 3.0, -4 - p * 4, 0.5, 8.4, -300, 54 - p * 4,
            noise(t * 2.2, 11) * 0.01);
          camZ = -4 - p * 4;
        } else if (t < T_OUT) {
          /* the flash at the end of the pipe */
          const p = beat(t, 42.35, T_OUT);
          const shake = Math.max(0, 1 - Math.abs(t - T_HIT) * 3.0);
          camAt(cam, 0.9 + noise(t * 9, 3) * shake * 1.8, 13.6 + noise(t * 9, 6) * shake * 1.8, -12,
            0.4, 6.4, -340, 46 + p * 6, noise(t * 11, 9) * shake * 0.05);
          camZ = -12;
        } else {
          /* up and out, into open space, the port burning below */
          const p = smoothstep(0, 1, beat(t, T_OUT, END));
          const climb = Math.pow(p, 0.72);
          camZ = -12 + p * 40;
          camAt(cam,
            0.9 + climb * 62, 13.6 + climb * 235, camZ,
            lerp(0.4, 30, p), lerp(6.4, -6, p), lerp(-340, portZ + 40, smoothstep(0, 1, p * 1.15)),
            50 + p * 14, 0.02 + p * 0.20);
        }
        /* the fighters pull up with the camera */
        const up = smoothstep(0, 1, beat(t, 42.5, 45.4));
        if (up > 0) {
          const lift = Math.pow(up, 0.8);
          place(HERO, 0.9 - lift * 16, 12.6 + lift * 176, -30 - lift * 46, 0.62 * lift, -0.12 * lift, 0.5 * lift);
          place(WINGR, 12.6 + lift * 26, 15.6 + lift * 150, -62 - lift * 30, 0.58 * lift, 0.1 * lift, -0.4 * lift);
          setEngineGlow(HERO, 1.15);
          setEngineGlow(WINGR, 1.15);
        }
      }

      /* hand-rolled section culling around the camera */
      const rz = road.position.z;
      const backLim = t > T_OUT ? 1500 : 180;
      const fwdLim = t > B_RUN ? 1700 : 900;
      for (let i = 0; i < sections.length; i++) {
        const sec = sections[i];
        const rel = (sec.z + rz - camZ) * viewDir;
        sec.o.visible = rel > -backLim && rel < fwdLim;
      }

      /* ---- the targeting computer overlay -------------------------- */
      if (hud.visible) {
        const d = 2.0;
        const hh = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * d;
        hud.position.copy(cam.position);
        hud.quaternion.copy(cam.quaternion);
        hud.translateZ(-d);
        hud.scale.setScalar(hh);
        const a = cam.aspect || 1.778;

        const boot = smoothstep(0, 1, beat(t, B_COMP + 0.6, B_COMP + 1.5));
        const conv = smoothstep(0, 1, beat(t, B_COMP + 1.1, T_LOCK));
        const locked = t >= T_LOCK;
        const die = beat(t, T_OFF, T_OFF + 0.62);
        const alive = boot * (1 - die);
        // the collapse: everything squashes to a line and blinks out
        const sq = 1 - smoothstep(0, 1, beat(t, T_OFF, T_OFF + 0.42));
        hud.scale.y = hh * (0.05 + 0.95 * sq);

        const cx = lerp(0.34, 0.0, conv) + noise(t * 0.5, 17) * 0.05 * (1 - conv);
        const cy = lerp(-0.16, 0.0, conv) + noise(t * 0.45, 23) * 0.035 * (1 - conv);
        const blink = locked ? (0.6 + 0.4 * Math.sign(Math.sin(t * 8.5))) : 1;

        ring.position.set(cx, cy, 0.001);
        ring.rotation.z = -t * (locked ? 0.12 : 0.85);
        ring.scale.setScalar(lerp(1.4, 0.8, conv));
        ring.material.opacity = alive * 0.8;

        cross.position.set(0, 0, 0);
        cross.scale.set(a / 1.778, 1, 1);
        cross.material.opacity = alive * 0.5;

        boxA.position.set(cx, cy, 0.002);
        boxA.scale.setScalar(lerp(1.7, 0.42, conv));
        boxA.rotation.z = locked ? 0 : Math.sin(t * 2.1) * 0.06;
        boxA.material.opacity = alive * (locked ? 0.42 : 0.9);

        const bx = lerp(a * 0.84, 0.28, conv);
        const by = lerp(0.78, 0.28, conv);
        brackets.forEach((q, i) => {
          const sx = i === 0 || i === 3 ? 1 : -1;
          const sy = i < 2 ? 1 : -1;
          q.position.set(cx + sx * bx, cy + sy * by, 0.003);
          q.material.opacity = alive * (locked ? 0.12 : 0.95);
        });
        bracketsLocked.forEach((q, i) => {
          const sx = i === 0 || i === 3 ? 1 : -1;
          const sy = i < 2 ? 1 : -1;
          q.position.set(cx + sx * 0.26, cy + sy * 0.26, 0.004);
          q.material.opacity = locked ? alive * blink : 0;
        });

        const pi = Math.floor(t * 13) % panels.length;
        panels.forEach((q, i) => {
          q.position.set(-a + 0.46, -0.70, 0.003);
          q.material.opacity = !locked && i === pi ? alive * 0.95 : 0;
        });
        panelLock.position.set(-a + 0.46, -0.70, 0.003);
        panelLock.material.opacity = locked ? alive * 0.95 : 0;

        wordAcq.position.set(0, 0.80, 0.004);
        wordAcq.material.opacity = !locked ? alive * (0.55 + 0.45 * Math.sign(Math.sin(t * 6))) : 0;
        wordLock.position.set(0, 0.80, 0.004);
        wordLock.material.opacity = locked ? alive * blink : 0;
      }

      cam.updateProjectionMatrix();
    },
  };
}
