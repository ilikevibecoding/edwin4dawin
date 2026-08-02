/**
 * Scene 6 — the finale.
 *
 *   0.0  ignition: the exhaust port goes white and the chain rips out of the trench
 *   5.0  detonation: the station goes up — fireball, shock ring, a storm of bricks
 *  10.0  out of the fire: the Falcon banks past the lens, X-wings behind it
 *  16.0  quiet: the formation against clean stars, the wreck a ring in the distance
 *  22.0  lightspeed: engines burn, the streaks stretch, and they are gone
 *  27.0  title: LEGO STAR WARS — A NEW SPARK, and who actually wrote it
 *
 * Everything is a closed-form function of local time t: the camera rides one
 * long pull-back from the station surface out to open space, and every effect is
 * driven by a declarative event list, so any frame renders correctly on its own.
 */
import * as THREE from 'three';
import { falcon, xwing } from '../models/ships.js';
import { battleStation, spaceBackdrop, hyperspaceTunnel, explosionBurst } from '../models/environments.js';
import { rng } from '../lego/bricks.js';
import {
  lightRig, Fireball, BrickBurst, beat, clamp, lerp, smoothstep, noise, flash, chroma, flyAlong,
} from './_kit.js';

export const id = 'finale';

/* ---- beat boundaries, local scene time ---------------------------- */
const DET = 5.0;      // detonation
const OUT = 10.0;     // ships out of the fire
const CALM = 16.0;    // form up
const SNAP = 22.0;    // engines burn
const JUMP = 24.2;    // lightspeed
const DROP = 26.5;    // out of the streaks, into black
const TITLE = 27.0;   // the card starts resolving
const END = 34.0;

/* ---- the station -------------------------------------------------- */
const R = 320;                        // station radius
const FLOOR = R * 0.95;               // trench floor radius
const PORT_LON = Math.PI / 2 - 0.55;  // longitude of the exhaust port

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
/** Point on a sphere: `lat` above the equator, `lon` 0 at +X and PI/2 at +Z. */
const sph = (lat, lon, r) => V3(
  Math.cos(lat) * Math.cos(lon) * r,
  Math.sin(lat) * r,
  Math.cos(lat) * Math.sin(lon) * r,
);

/* ---- camera stations ---------------------------------------------- */
// One continuous pull-back: surface -> blast -> wide. Beat 3 holds here.
const CAM3 = sph(0.20, 1.52, 2150);
const VIEW3 = CAM3.clone().negate().normalize();
const RIGHT3 = new THREE.Vector3().crossVectors(V3(0, 1, 0), CAM3.clone().normalize()).normalize();
const UP3 = new THREE.Vector3().crossVectors(CAM3.clone().normalize(), RIGHT3).normalize();
// The calm beat, the jump and the card are staged around one camera facing -Z.
const CAM4 = V3(0, 0, 2400);

/* ------------------------------------------------------------------ */
/* canvas textures                                                     */
/* ------------------------------------------------------------------ */

const texCache = new Map();
function tex(key, w, h, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;
  texCache.set(key, t);
  return t;
}

/** Soft round glow, hot in the middle. */
const glowTex = () => tex('fin_glow', 256, 256, (g, w) => {
  const grd = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.14, 'rgba(255,246,214,0.85)');
  grd.addColorStop(0.36, 'rgba(255,196,112,0.30)');
  grd.addColorStop(0.66, 'rgba(255,128,44,0.07)');
  grd.addColorStop(1, 'rgba(255,100,24,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, w, w);
});

/** Lumpy fire cloud, so a big fireball never reads as a smooth balloon. */
const fireTex = () => tex('fin_fire', 512, 512, (g, w) => {
  const r = rng(8821);
  const c = w / 2;
  g.clearRect(0, 0, w, w);
  g.globalCompositeOperation = 'lighter';
  const base = g.createRadialGradient(c, c, 0, c, c, c);
  base.addColorStop(0, 'rgba(255,244,208,0.92)');
  base.addColorStop(0.30, 'rgba(255,176,78,0.46)');
  base.addColorStop(0.66, 'rgba(214,86,22,0.17)');
  base.addColorStop(1, 'rgba(140,36,8,0)');
  g.fillStyle = base;
  g.fillRect(0, 0, w, w);
  for (let i = 0; i < 180; i++) {
    const a = r() * Math.PI * 2;
    const rr = Math.pow(r(), 0.55) * 0.46 * w;
    const x = c + Math.cos(a) * rr, y = c + Math.sin(a) * rr;
    const hot = clamp(1 - rr / (0.48 * w));
    const s = (9 + r() * 62) * (0.5 + hot);
    const b = g.createRadialGradient(x, y, 0, x, y, s);
    b.addColorStop(0, `rgba(255,${(150 + hot * 100) | 0},${(48 + hot * 150) | 0},${0.09 + hot * 0.26})`);
    b.addColorStop(1, 'rgba(255,84,18,0)');
    g.fillStyle = b;
    g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
  }
  // pull the silhouette back to a soft disc
  g.globalCompositeOperation = 'destination-in';
  const mask = g.createRadialGradient(c, c, 0, c, c, c);
  mask.addColorStop(0, 'rgba(0,0,0,1)');
  mask.addColorStop(0.58, 'rgba(0,0,0,0.92)');
  mask.addColorStop(0.86, 'rgba(0,0,0,0.30)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = mask;
  g.fillRect(0, 0, w, w);
});

/** Flat shock ring: empty in the middle, one hard bright rim. */
const shockTex = () => tex('fin_shock', 1024, 1024, (g, w) => {
  const c = w / 2;
  const grd = g.createRadialGradient(c, c, 0, c, c, c);
  grd.addColorStop(0.00, 'rgba(255,255,255,0)');
  grd.addColorStop(0.84, 'rgba(255,186,104,0.00)');
  grd.addColorStop(0.905, 'rgba(255,206,140,0.10)');
  grd.addColorStop(0.938, 'rgba(255,238,200,0.66)');
  grd.addColorStop(0.955, 'rgba(255,255,248,1)');
  grd.addColorStop(0.975, 'rgba(255,214,150,0.24)');
  grd.addColorStop(1.00, 'rgba(255,150,60,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, w, w);
});

const FONT = '"Trebuchet MS", Helvetica, Arial, sans-serif';
const CREDIT = 'procedurally generated \u00b7 0 art assets \u00b7 every brick, ship, star and note written by code';

/** Shrink type until it fits `maxW`, so a long line can never run off frame. */
function fitFont(g, text, weight, start, maxW) {
  let size = start;
  for (let i = 0; i < 90; i++) {
    g.font = `${weight} ${size}px ${FONT}`;
    if (g.measureText(text).width <= maxW) break;
    size -= 2;
  }
  return size;
}

/** The card: LEGO / STAR WARS / A NEW SPARK, in the opening logo's yellow. */
const titleTex = () => tex('fin_title', 2048, 1024, (g, W) => {
  g.clearRect(0, 0, W, 1024);
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  // same yellow and the same top-lit gradient as the crawl logo
  const gold = (y0, y1) => {
    const grad = g.createLinearGradient(0, y0, 0, y1);
    grad.addColorStop(0, '#fff6a8');
    grad.addColorStop(0.45, '#ffe81f');
    grad.addColorStop(1, '#d9a800');
    return grad;
  };

  g.font = `700 104px ${FONT}`;
  g.fillStyle = gold(154, 262);
  g.fillText('L E G O', W / 2, 208);

  const big = fitFont(g, 'STAR WARS', 800, 320, W * 0.84);
  g.font = `800 ${big}px ${FONT}`;
  g.fillStyle = gold(470 - big * 0.5, 470 + big * 0.55);
  g.strokeStyle = '#8a6a00';
  g.lineWidth = 9;
  g.fillText('STAR WARS', W / 2, 470);
  g.strokeText('STAR WARS', W / 2, 470);

  const rule = g.createLinearGradient(W * 0.2, 0, W * 0.8, 0);
  rule.addColorStop(0, 'rgba(255,232,31,0)');
  rule.addColorStop(0.5, 'rgba(255,232,31,0.7)');
  rule.addColorStop(1, 'rgba(255,232,31,0)');
  g.fillStyle = rule;
  g.fillRect(W * 0.2, 650, W * 0.6, 3);

  const sub = fitFont(g, 'A   N E W   S P A R K', 700, 96, W * 0.6);
  g.font = `700 ${sub}px ${FONT}`;
  g.fillStyle = gold(744, 838);
  g.fillText('A   N E W   S P A R K', W / 2, 792);
});

/** The joke, in small type. */
const creditTex = () => tex('fin_credit', 2048, 256, (g, W, H) => {
  g.clearRect(0, 0, W, H);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const size = fitFont(g, CREDIT, 500, 58, W * 0.9);
  g.font = `500 ${size}px ${FONT}`;
  g.fillStyle = '#d3dbe4';
  g.fillText(CREDIT, W / 2, H / 2);
});

/* ------------------------------------------------------------------ */
/* small builders                                                      */
/* ------------------------------------------------------------------ */

/** Additive camera-facing glow with its own material. */
function spark(size, map, color, opacity = 0) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map, color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  }));
  s.scale.set(size, size, 1);
  return s;
}

/** Additive flat quad with its own material. */
function flatFx(map, color, opacity = 0) {
  return new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({
    map, color, transparent: true, opacity, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  }));
}

/** Additive cone, for jets venting off the hull. */
function jetFx(color) {
  return new THREE.Mesh(new THREE.ConeGeometry(1, 1, 16, 1, true), new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  }));
}

/**
 * Declarative flares: each entry is {t, dur, p:[x,y,z], size, gain, color}.
 * Sprites never foreshorten, so a bright hit reads as fire rather than a ball.
 */
class Flares {
  constructor(parent, list, map) {
    this.list = list;
    this.sprites = list.map((f) => {
      const s = spark(1, map, f.color ?? 0xffe2ac, 0);
      parent.add(s);
      return s;
    });
  }
  update(t) {
    for (let i = 0; i < this.list.length; i++) {
      const f = this.list[i], s = this.sprites[i];
      const k = (t - f.t) / f.dur;
      if (k < 0 || k > 1) { s.visible = false; continue; }
      s.visible = true;
      s.position.set(f.p[0], f.p[1], f.p[2]);
      s.scale.setScalar(f.size * (0.3 + Math.pow(k, 0.42) * 1.5));
      s.material.opacity = Math.pow(1 - k, 1.8) * (f.gain ?? 1);
    }
  }
}

function cardPlane(map, w, h, y) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
    map, transparent: true, opacity: 0, depthWrite: false, depthTest: false, toneMapped: false,
  }));
  m.position.set(0, y, -40);
  m.renderOrder = 50;
  return m;
}

export async function build(ctx) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  /* --- light ------------------------------------------------------- */
  const lights = lightRig(scene, 'battle', { shadows: false, fog: false });
  lights.key.position.set(620, 760, 980);
  lights.fill.position.set(-560, -180, -320);
  lights.rim.position.set(-240, 200, 900);
  const KEY = lights.key.intensity, FILL = lights.fill.intensity;
  const RIM = lights.rim.intensity, AMB = lights.amb.intensity;

  // the fireball is the biggest light in the film: it backlights every brick
  const blastLight = new THREE.PointLight(0xffb066, 0);
  blastLight.decay = 0;
  blastLight.distance = 0;
  scene.add(blastLight);
  // and it throws a hard back light straight down the lens axis, which is what
  // turns the escaping ships into silhouettes with hot edges
  const backLight = new THREE.DirectionalLight(0xffc487, 0);
  backLight.position.copy(CAM3).multiplyScalar(-1);
  scene.add(backLight, backLight.target);

  /* --- sky --------------------------------------------------------- */
  // both fields ride the camera, so they read as infinity
  const skyRig = new THREE.Group();
  scene.add(skyRig);
  const sky = spaceBackdrop({ seed: 61, radius: 6000, count: 6400, color: 0x3d2f74 });
  skyRig.add(sky);

  // a plain field for the card: black, stars, nothing else
  const tStars = (() => {
    const r = rng(7717);
    const n = 3600;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const v = V3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize().multiplyScalar(3000);
      pos.set([v.x, v.y, v.z], i * 3);
      c.setHSL(r() < 0.72 ? 0.58 : 0.09, 0.22 + r() * 0.3, 0.55 + r() * 0.45);
      const f = 0.3 + r() * 0.7;
      col.set([c.r * f, c.g * f, c.b * f], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const p = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 2.6, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false,
    }));
    p.frustumCulled = false;
    p.renderOrder = -1000;
    return p;
  })();
  skyRig.add(tStars);

  /* --- the station ------------------------------------------------- */
  const station = battleStation({ radius: R, seed: 17, seg: 200, texSize: 2048, greeble: 0.85 });
  scene.add(station);

  const portDir = V3(Math.cos(PORT_LON), 0, Math.sin(PORT_LON));
  const portPos = portDir.clone().multiplyScalar(FLOOR + 2);

  // the exhaust port: a pit that goes white, and a jet climbing out of the trench
  const portCore = new THREE.Mesh(
    new THREE.SphereGeometry(1, 18, 12),
    new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }),
  );
  portCore.position.copy(portPos);
  const portHalo = spark(1, glowTex(), 0xfff2ce, 0);
  portHalo.position.copy(portPos);
  const portJet = jetFx(0xffeccc);
  const jetRig = new THREE.Group();
  jetRig.position.copy(portDir.clone().multiplyScalar(FLOOR));
  jetRig.quaternion.setFromUnitVectors(V3(0, 1, 0), portDir);
  jetRig.add(portJet);
  station.add(portCore, portHalo, jetRig);

  // practicals: the port lights its own trench, and one light stands in for
  // whichever hit is currently going off
  const portLight = new THREE.PointLight(0xffd9a0, 0);
  portLight.position.copy(portPos);
  const chainLight = new THREE.PointLight(0xffbb70, 0);
  station.add(portLight, chainLight);

  /* --- the chain: along the trench, then up the seams --------------- */
  const chain = [];
  {
    const r = rng(4113);
    // out of the trench, running both ways from the port
    for (let i = 0; i < 13; i++) {
      for (const s of [1, -1]) {
        chain.push({
          t: 0.42 + i * 0.185 + (s < 0 ? 0.085 : 0),
          lat: (r() - 0.5) * 0.03,
          lon: PORT_LON + s * (0.045 + i * 0.031 + r() * 0.012),
          rad: FLOOR + 4,
          size: 11 + i * 1.9 + r() * 6,
        });
      }
    }
    // then it tears up the panel seams, off the equator
    for (let i = 0; i < 15; i++) {
      chain.push({
        t: 2.3 + i * 0.17 + r() * 0.12,
        lat: (r() < 0.5 ? -1 : 1) * (0.05 + r() * 0.46),
        lon: PORT_LON + (r() * 2 - 1) * 0.85,
        rad: R + 5,
        size: 20 + r() * 42,
      });
    }
  }
  const chainPos = chain.map((c) => sph(c.lat, c.lon, c.rad));
  const chainFx = chain.map((c, i) => new Fireball(station, {
    t0: c.t, pos: chainPos[i].toArray(), size: c.size * 0.5,
    dur: 0.7 + c.size * 0.009, seed: 60 + i * 7,
    brickCount: c.size > 26 ? 16 : 8, gravity: 0, ring: false,
    color: 0xfff2cc, color2: 0xff7a1e,
  }));
  const chainFlare = new Flares(station, chain.map((c, i) => ({
    t: c.t, dur: 0.9 + c.size * 0.011, p: chainPos[i].toArray(),
    size: c.size * 2.6, gain: 0.95, color: 0xffd7a0,
  })), fireTex());

  // the trench itself catches fire and stays lit
  const embers = [];
  {
    const r = rng(3371);
    const g = new THREE.Group();
    station.add(g);
    for (let i = 0; i < 46; i++) {
      const f = (i / 45) * 2 - 1;
      const lon = PORT_LON + f * 1.05;
      const p = sph((r() - 0.5) * 0.028, lon, FLOOR + 2);
      const s = spark(10 + r() * 16, glowTex(), 0xff9c3c, 0);
      s.position.copy(p);
      g.add(s);
      embers.push({ s, t0: 0.5 + Math.abs(f) * 3.5 + r() * 0.3, ph: r() * 6.3 });
    }
  }

  // vents blowing straight off the hull
  const vents = [];
  {
    const r = rng(9091);
    for (let i = 0; i < 8; i++) {
      const dir = sph((r() - 0.5) * 0.1, PORT_LON + (r() * 2 - 1) * 0.7, 1);
      const g = new THREE.Group();
      g.position.copy(dir.clone().multiplyScalar(FLOOR - 2));
      g.quaternion.setFromUnitVectors(V3(0, 1, 0), dir);
      const cone = jetFx(0xffd48a);
      g.add(cone);
      station.add(g);
      vents.push({ mesh: cone, t0: 1.4 + r() * 3.1, len: 34 + r() * 96, wide: 5 + r() * 9, ph: r() * 6.3 });
    }
  }

  /* --- the detonation ---------------------------------------------- */
  const blastRig = new THREE.Group();
  scene.add(blastRig);

  // the core blast: fire-textured shells and 240 real bricks.
  // `explosionBurst` throws its shrapnel 2.5x further along its own +Z than
  // across it, so aim that axis at the camera and the spray reads as radial.
  const burst = explosionBurst({ size: 460, seed: 17, shards: 240, gravity: 0, spread: 1.0 });
  burst.quaternion.setFromUnitVectors(V3(0, 0, 1), CAM3.clone().normalize());
  blastRig.add(burst);
  // its soot veil and its own two shock rings fight the composition in vacuum,
  // and its flare sprites alone are enough to white out the frame for a second
  const burstSoot = burst.children.filter((o) => o.isSprite && o.material.blending === THREE.NormalBlending);
  const burstRings = burst.children.filter((o) => o.isMesh && o.geometry.type === 'PlaneGeometry');
  const burstGlare = burst.children.filter((o) => o.isSprite && o.material.blending === THREE.AdditiveBlending);

  const hot = spark(1, glowTex(), 0xffffff, 0);
  const fireball = spark(1, fireTex(), 0xffa64a, 0);
  blastRig.add(hot, fireball);

  // secondaries on a stagger: the station keeps coming apart for five seconds
  const secs = [];
  const secFlare = [];
  {
    const r = rng(2287);
    for (let i = 0; i < 10; i++) {
      const d = V3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize().multiplyScalar(110 + r() * 460);
      const t0 = DET + 0.14 + i * 0.29 + r() * 0.18;
      const size = 130 + r() * 190;
      secs.push(new Fireball(blastRig, {
        t0, pos: [d.x, d.y, d.z], size: size * 0.55, dur: 1.4 + r() * 1.3,
        seed: 300 + i * 11, brickCount: 26, gravity: 0, ring: false,
        color: 0xfff0c0, color2: 0xff5a12,
      }));
      secFlare.push({ t: t0, dur: 1.5 + r() * 1.1, p: [d.x, d.y, d.z], size: size * 2.4, gain: 0.9 });
    }
  }
  const secFlares = new Flares(blastRig, secFlare, fireTex());

  // the brick storm: BrickBurst fans upward from its origin, so six copies are
  // rotated onto six axes to fill a sphere with debris.
  const storm = [];
  {
    const spec = [
      { count: 84, size: 12, speed: 500, life: 11 },
      { count: 60, size: 26, speed: 320, life: 12 },
      { count: 24, size: 56, speed: 175, life: 13 },
    ];
    const spin = [
      [0, 0, 0], [0, 0, Math.PI], [0, 0, Math.PI / 2], [0, 0, -Math.PI / 2],
      [Math.PI / 2, 0, 0], [-Math.PI / 2, 0, 0],
    ];
    let k = 0;
    for (const s of spec) {
      for (const rt of spin) {
        const g = new THREE.Group();
        g.rotation.set(rt[0], rt[1], rt[2]);
        blastRig.add(g);
        storm.push(new BrickBurst(g, {
          t0: DET, origin: [0, 0, 0], count: Math.round(s.count / 6), size: s.size,
          speed: s.speed, life: s.life, gravity: 0, stagger: 0.55, seed: 500 + k++ * 13,
          colors: [0xf2f3f2, 0xa3a2a4, 0x545955, 0x6c6e68, 0xc91a09],
        }));
      }
    }
  }

  /* --- the shock ring ---------------------------------------------- */
  const ringRig = new THREE.Group();
  scene.add(ringRig);
  const BLAST_VIEW = sph(0.26, 1.47, 1);
  const ringNormal = (mix) => V3(0, 1, 0).multiplyScalar(1 - mix).addScaledVector(BLAST_VIEW, mix).normalize();
  const shock = flatFx(shockTex(), 0xffd9a0, 0);
  shock.quaternion.setFromUnitVectors(V3(0, 0, 1), ringNormal(0.22));
  const shock2 = flatFx(shockTex(), 0xffe8c8, 0);
  shock2.quaternion.setFromUnitVectors(V3(0, 0, 1), ringNormal(0.55));
  ringRig.add(shock, shock2);

  /* --- the ships --------------------------------------------------- */
  const SHIP = 3.0;   // ships are LEGO-set scale; these shots need them bigger
  const fal = falcon({ seed: 29 });
  fal.scale.setScalar(SHIP);
  scene.add(fal);
  const xws = [0, 1, 2, 3].map((i) => {
    const x = xwing({ seed: 5 + i * 3 });
    x.scale.setScalar(SHIP);
    scene.add(x);
    return x;
  });
  const ships = [fal, ...xws];
  const FAL_LIFT = 9;   // the Falcon is anchored on its keel, not its centre

  // beat 3: described relative to the locked-off camera — zf in front of the
  // lens, xf right, yf up, each a quadratic in (t - pass time).
  const RUN = [
    { ship: fal, t: 13.5, z: [100, -190, 5], x: [62, 78, -3], y: [-26, -26, -0.6], bank: 0.85 },
    { ship: xws[0], t: 14.15, z: [120, -215, 6], x: [-74, -96, 4], y: [36, 22, -0.5], bank: -0.7 },
    { ship: xws[1], t: 14.7, z: [104, -205, 6], x: [70, 104, -4], y: [-40, 20, 0.4], bank: 0.65 },
    { ship: xws[2], t: 15.2, z: [136, -225, 6], x: [-58, -88, 3], y: [-18, -28, -0.4], bank: -0.55 },
    { ship: xws[3], t: 15.7, z: [150, -235, 6], x: [46, 82, -3], y: [50, 26, 0.5], bank: 0.5 },
  ];
  const runPaths = RUN.map((r) => (tt) => {
    const u = tt - r.t;
    return CAM3.clone()
      .addScaledVector(VIEW3, r.z[0] + r.z[1] * u + r.z[2] * u * u)
      .addScaledVector(RIGHT3, r.x[0] + r.x[1] * u + r.x[2] * u * u)
      .addScaledVector(UP3, r.y[0] + r.y[1] * u + r.y[2] * u * u);
  });

  // beat 4/5: the formation, camera-relative again. A little yaw and pitch on
  // each hull turns a dull tail-on view into a three-quarter one.
  const FORM = [
    { ship: fal, x: 44, y: -30, z: 190, ry: 0.34, rx: -0.13 },
    { ship: xws[0], x: -86, y: 16, z: 250, ry: -0.2, rx: -0.08 },
    { ship: xws[1], x: 126, y: 34, z: 340, ry: 0.16, rx: -0.06 },
    { ship: xws[2], x: -148, y: -14, z: 300, ry: -0.26, rx: -0.05 },
    { ship: xws[3], x: 20, y: 50, z: 430, ry: 0.1, rx: -0.04 },
  ];

  /* --- lightspeed -------------------------------------------------- */
  const tunnel = hyperspaceTunnel({ count: 1200, radius: 130, length: 640, seed: 21 });
  scene.add(tunnel);
  const tStreak = tunnel.userData.streaks;
  const tHalo = tunnel.children.filter((o) => o.isSprite);

  /* --- the card ---------------------------------------------------- */
  const cardRig = new THREE.Group();
  scene.add(cardRig);
  const titleCard = cardPlane(titleTex(), 46, 23, 2.6);
  const creditCard = cardPlane(creditTex(), 44, 5.5, -8.4);
  cardRig.add(titleCard, creditCard);

  /* --- cues -------------------------------------------------------- */
  const cues = [
    { t: 0.05, sfx: 'rumbleSub', opts: { gain: 0.7, dur: 4.6 } },
    { t: 0.10, sfx: 'ionDrone', opts: { gain: 0.42, dur: 4.5 } },
    ...chain.filter((_, i) => i % 3 === 0).map((c) => ({
      t: c.t, sfx: 'explosion', opts: { gain: 0.34 + Math.min(c.size, 60) / 120 },
    })),
    { t: 4.5, sfx: 'rumbleSub', opts: { gain: 1.0, dur: 2.5 } },
    { t: DET, sfx: 'bigExplosion', opts: { gain: 1.0 } },
    { t: DET + 0.06, sfx: 'rumbleSub', opts: { gain: 1.0, dur: 5.2 } },
    { t: DET + 0.55, sfx: 'explosion', opts: { gain: 0.85 } },
    { t: DET + 1.05, sfx: 'bigExplosion', opts: { gain: 0.7 } },
    { t: DET + 1.8, sfx: 'explosion', opts: { gain: 0.7 } },
    { t: DET + 2.6, sfx: 'explosion', opts: { gain: 0.6 } },
    { t: DET + 3.4, sfx: 'bigExplosion', opts: { gain: 0.5 } },
    { t: DET + 4.4, sfx: 'explosion', opts: { gain: 0.4 } },
    { t: OUT + 0.15, sfx: 'engineWhoosh', opts: { gain: 0.5, dur: 2.6 } },
    { t: 12.3, sfx: 'enginePass', opts: { gain: 0.6, dur: 2.4, from: -0.5, to: 0.5 } },
    { t: 13.0, sfx: 'enginePass', opts: { gain: 0.95, dur: 1.3, from: -0.8, to: 0.9, pitch: 0.8 } },
    { t: 13.8, sfx: 'enginePass', opts: { gain: 0.7, dur: 0.9, from: 0.7, to: -0.8 } },
    { t: 14.35, sfx: 'enginePass', opts: { gain: 0.7, dur: 0.9, from: -0.8, to: 0.8 } },
    { t: 14.85, sfx: 'enginePass', opts: { gain: 0.65, dur: 0.9, from: 0.8, to: -0.7 } },
    { t: 15.35, sfx: 'enginePass', opts: { gain: 0.6, dur: 1.0, from: -0.6, to: 0.8 } },
    { t: CALM + 0.3, sfx: 'ionDrone', opts: { gain: 0.24, dur: 6.4 } },
    { t: CALM + 0.9, sfx: 'crowdCheer', opts: { gain: 0.17, dur: 5.2, send: 0.7 } },
    { t: SNAP - 0.15, sfx: 'engineWhoosh', opts: { gain: 0.55, dur: 1.9 } },
    { t: JUMP - 1.3, sfx: 'hyperspaceJump', opts: { gain: 0.95, charge: 1.3 } },
    { t: JUMP + 0.05, sfx: 'rumbleSub', opts: { gain: 0.8, dur: 2.4 } },
    { t: DROP - 0.05, sfx: 'engineWhoosh', opts: { gain: 0.3, dur: 1.5 } },
    { t: TITLE + 0.1, sfx: 'ionDrone', opts: { gain: 0.14, dur: 6.8 } },
  ];

  /* ---------------------------------------------------------------- */
  const tmp = new THREE.Vector3();
  const HOTC = new THREE.Color(0xfff4de);
  const COOLC = new THREE.Color(0xff8f34);
  const FIREC = new THREE.Color(0xfff0d2);
  const EMBERC = new THREE.Color(0xff7a24);
  const ringCol = new THREE.Color();
  const fireCol = new THREE.Color();

  return {
    scene,
    cues,

    update(t, c) {
      const cam = c.camera;
      cam.up.set(0, 1, 0);
      const boom = t - DET;

      /* ---- the station, while it lasts ---------------------------- */
      const alive = t < DET + 0.05;
      station.visible = alive;
      if (alive) station.userData.update(t * 0.6);

      const heat = beat(t, 0, DET);
      const flick = 0.84 + 0.16 * Math.sin(t * 19);
      portCore.scale.setScalar(lerp(3.4, 15, Math.pow(heat, 1.5)) * flick);
      portCore.material.opacity = lerp(0.55, 1, heat);
      portHalo.scale.setScalar(lerp(17, 210, Math.pow(heat, 1.45)) * flick);
      portHalo.material.opacity = lerp(0.5, 1, heat);
      const jet = Math.pow(beat(t, 1.3, DET), 1.8) * flick;
      portJet.material.opacity = jet * 0.8;
      portJet.scale.set(7 + jet * 17, 8 + jet * 170, 7 + jet * 17);
      portJet.position.y = portJet.scale.y * 0.5;
      for (const v of vents) {
        const k = clamp((t - v.t0) / 0.8);
        v.mesh.material.opacity = k * 0.5 * (0.72 + 0.28 * Math.sin(t * 12 + v.ph));
        v.mesh.scale.set(v.wide * k, v.len * k, v.wide * k);
        v.mesh.position.y = v.mesh.scale.y * 0.5;
      }
      for (const e of embers) {
        const k = clamp((t - e.t0) / 0.35);
        e.s.material.opacity = k * (0.42 + 0.3 * Math.sin(t * 7 + e.ph));
      }
      for (const f of chainFx) f.update(t);
      chainFlare.update(t);

      // practicals
      portLight.intensity = alive ? lerp(2600, 16000, Math.pow(heat, 1.3)) : 0;
      let bw = 0, bi = -1;
      for (let i = 0; i < chain.length; i++) {
        const w = clamp(1 - Math.abs(t - chain[i].t) / 0.5) * Math.min(1, chain[i].size / 44);
        if (w > bw) { bw = w; bi = i; }
      }
      chainLight.intensity = alive ? bw * 26000 : 0;
      if (bi >= 0) chainLight.position.copy(chainPos[bi]);

      /* ---- the blast --------------------------------------------- */
      blastRig.visible = boom > -0.05 && t < CALM;
      if (blastRig.visible) {
        burst.userData.setT(clamp(boom / 5.0));
        for (const o of burstSoot) o.visible = false;
        for (const o of burstRings) o.visible = false;
        for (const o of burstGlare) o.material.opacity *= 0.55;
        for (const f of secs) f.update(t);
        secFlares.update(t);
        for (const s of storm) s.update(t);
        // core: a white flare that cools into a huge lumpy fireball, then into
        // the wall of fire the rebels fly out of
        const hk = clamp(boom / 0.8);
        hot.material.opacity = boom < 0 ? 0 : Math.pow(1 - hk, 2.2);
        hot.scale.setScalar(lerp(240, 1300, Math.pow(hk, 0.55)));
        fireball.material.opacity = boom < 0 ? 0
          : Math.min(1, boom * 3.5) * lerp(0.95, 0.52, smoothstep(0.6, 4.5, boom))
            * (1 - smoothstep(9.5, 12.2, boom));
        fireball.scale.setScalar(lerp(480, 1240, Math.pow(clamp(boom / 4), 0.5))
          * lerp(1, 0.78, smoothstep(5, 12, boom)));
        fireball.material.color.copy(FIREC).lerp(EMBERC, smoothstep(1.5, 7, boom));
      }

      /* ---- the shock ring ---------------------------------------- */
      const ringR = 140 + 1210 * (1 - Math.exp(-Math.max(boom, 0) / 1.25));
      const ringFade = boom < 0 ? 0
        : clamp(boom / 0.2) * lerp(1, 0.34, smoothstep(0.5, 9.0, boom)) * (1 - beat(t, SNAP, SNAP + 0.8));
      ringCol.copy(HOTC).lerp(COOLC, smoothstep(0.1, 4.0, boom));
      shock.material.color.copy(ringCol);
      shock2.material.color.copy(ringCol);
      shock.scale.set(ringR, ringR, 1);
      shock.material.opacity = ringFade * 0.9;
      shock2.scale.set(ringR * 0.6, ringR * 0.6, 1);
      shock2.material.opacity = ringFade * 0.4 * (1 - smoothstep(1.6, 6.5, boom));
      ringRig.visible = ringFade > 0.004;

      /* ---- light ------------------------------------------------- */
      blastLight.intensity = boom < 0 ? 0
        : 17 * Math.pow(clamp(1 - boom / 0.5), 1.5) + 6.5 * Math.pow(clamp(1 - boom / 13), 1.3);
      const silhouette = smoothstep(DET - 0.1, DET + 0.4, t) * (1 - smoothstep(CALM - 1.5, CALM + 0.5, t));
      const open = 1 - heat;   // beat 1 needs more bounce to read at all
      lights.key.intensity = KEY * lerp(1, 0.26, silhouette);
      lights.fill.intensity = FILL * lerp(1, 0.45, silhouette) * (1 + open * 1.6);
      lights.rim.intensity = RIM * lerp(1, 2.3, silhouette);
      lights.amb.intensity = AMB * lerp(1, 0.5, silhouette) * (1 + open * 1.8);

      /* ---- ships ------------------------------------------------- */
      const flying = t >= OUT - 0.5;
      for (const s of ships) s.visible = false;
      for (const x of xws) x.userData.setSFoils(1 - smoothstep(CALM + 1, CALM + 4.4, t));

      if (flying && t < CALM) {
        /* out of the fire: one after another, straight at the lens */
        for (let i = 0; i < RUN.length; i++) {
          const r = RUN[i];
          const p = runPaths[i];
          const zf = p(t).sub(CAM3).dot(VIEW3);
          r.ship.visible = zf > 16;
          if (!r.ship.visible) continue;
          r.ship.scale.setScalar(SHIP);
          flyAlong(r.ship, t, p, { bank: r.bank * 4, wobble: 0.02 });
          r.ship.userData.setThrottle(1.35);
        }
      } else if (flying) {
        /* formation, then the snap and the jump */
        const run = clamp((t - (SNAP + 0.35)) / (JUMP - SNAP - 0.35));
        const away = 1 + 15 * Math.pow(run, 3.1);
        const stretch = Math.pow(clamp((t - (JUMP - 0.18)) / 0.5), 1.6);
        const thr = t < SNAP ? 0.85 + 0.09 * Math.sin(t * 2.3)
          : lerp(0.9, 1.4, smoothstep(SNAP, SNAP + 1.6, t));
        for (let i = 0; i < FORM.length; i++) {
          const f = FORM[i];
          const s = f.ship;
          s.visible = t < JUMP + 0.42;
          if (!s.visible) continue;
          const drift = 1 + 0.05 * Math.sin(t * 0.5 + i * 1.9);
          s.position.set(
            CAM4.x + f.x * drift + noise(t * 0.35 + i, 11) * 5,
            CAM4.y + f.y * drift + noise(t * 0.31 + i, 22) * 4 - (s === fal ? FAL_LIFT : 0),
            CAM4.z - f.z * away * drift,
          );
          s.rotation.set(
            noise(t * 0.27 + i, 3) * 0.05,
            noise(t * 0.24 + i, 4) * 0.05,
            noise(t * 0.21 + i, 5) * 0.09,
          );
          s.scale.set(SHIP, SHIP, SHIP * (1 + 26 * stretch));
          s.userData.setThrottle(thr + stretch * 1.2);
        }
      }

      /* ---- lightspeed -------------------------------------------- */
      const warp = t < JUMP - 0.6
        ? clamp((t - (JUMP - 1.5)) / 0.9) * 0.26
        : lerp(0.26, 1, smoothstep(JUMP - 0.6, JUMP + 0.35, t)) * (1 - smoothstep(DROP - 0.14, DROP + 0.1, t));
      tunnel.visible = t > SNAP - 1.6 && t < DROP + 0.1;
      if (tunnel.visible) {
        tunnel.userData.update(t - SNAP);
        tunnel.userData.setStretch(warp);
        // the tube is written for a POV shot; pull it back so it never clips
        tStreak.material.opacity *= 0.45;
        for (const s of tHalo) s.material.opacity *= 0.3;
      }
      chroma(c.stage, warp * 1.3 * (t > JUMP - 0.8 ? 1 : 0.25));

      /* ---- the card ---------------------------------------------- */
      const res = smoothstep(TITLE, TITLE + 1.6, t);
      titleCard.material.opacity = res;
      titleCard.scale.setScalar(lerp(1.05, 1, res));
      creditCard.material.opacity = smoothstep(TITLE + 2.7, TITLE + 4.1, t);
      cardRig.visible = t > TITLE - 0.1;
      sky.visible = t < DROP;
      if (sky.visible) sky.userData.update(t);
      tStars.visible = t > DROP - 0.4;

      /* ---- camera ------------------------------------------------ */
      if (t < OUT) {
        // one long pull-back: 20 units off the hull out to 2150
        const k1 = beat(t, 0, DET);
        const k2 = beat(t, DET, OUT);
        const shake = 0.55 * clamp(1 - Math.abs(boom) / 1.7) + 0.3 * chainShake(t, chain);
        const dist = t < DET
          ? lerp(R + 20, 1180, Math.pow(k1, 1.75))
          : 1180 + 970 * Math.pow(k2, 2.2);
        const lon = t < DET
          ? PORT_LON + lerp(0.145, 0.40, smoothstep(0, 1, k1))
          : PORT_LON + lerp(0.40, 0.50, k2);
        const lat = t < DET ? lerp(0.030, 0.275, Math.pow(k1, 1.15)) : lerp(0.275, 0.20, k2);
        cam.position.copy(sph(lat, lon, dist));
        const sh = 3.5 * shake * (1 + dist * 0.006);
        cam.position.x += noise(t * 2.6, 1) * sh;
        cam.position.y += noise(t * 2.9, 2) * sh;
        // the port to start with, then the whole thing coming apart
        const aim = smoothstep(0.15, 0.95, k1);
        tmp.copy(portPos).multiplyScalar(1 - aim);
        cam.lookAt(tmp.x, tmp.y, tmp.z);
        cam.rotateZ(noise(t * 3.3, 5) * 0.02 * shake + lerp(0.04, -0.02, k1));
        cam.fov = t < DET ? lerp(52, 46, k1) : lerp(46, 52, Math.pow(k2, 0.6));
      } else if (t < CALM) {
        // locked off while the rebels come out of the fire
        const k = beat(t, OUT, CALM);
        cam.position.copy(CAM3).addScaledVector(VIEW3, k * -80);
        cam.lookAt(0, 0, 0);
        cam.rotateZ(-0.03 + k * 0.05);
        cam.fov = lerp(52, 48, k);
      } else if (t < DROP) {
        // calm, then the jump: locked to the axis of travel
        const k = beat(t, CALM, SNAP);
        const push = smoothstep(SNAP, JUMP, t);
        cam.position.set(
          CAM4.x + noise(t * 0.19, 7) * 8,
          CAM4.y + 5 + noise(t * 0.17, 8) * 6,
          CAM4.z + 34 * k - push * 110,
        );
        cam.lookAt(cam.position.x + noise(t * 0.15, 9) * 5, cam.position.y - 3, cam.position.z - 400);
        cam.rotateZ(0.02 * Math.sin(t * 0.32) + push * 0.03);
        cam.fov = lerp(40, 43, k) + push * 11;
      } else {
        // the card
        cam.position.set(CAM4.x, CAM4.y + 5, CAM4.z - 200);
        cam.lookAt(cam.position.x, cam.position.y, cam.position.z - 400);
        cam.fov = 40;
      }
      cam.updateProjectionMatrix();

      /* ---- things that ride the camera --------------------------- */
      skyRig.position.copy(cam.position);
      tStars.rotation.y = t * 0.0016;
      cardRig.position.copy(cam.position);
      cardRig.quaternion.copy(cam.quaternion);
      if (tunnel.visible) {
        tunnel.position.copy(cam.position);
        tunnel.quaternion.copy(cam.quaternion);
      }
      if (t < CALM) ringRig.position.set(0, 0, 0);
      else {
        // once we are away, the wreck is a backdrop: park it where it composes
        ringRig.position.copy(cam.position)
          .add(V3(-2150 + noise(t * 0.12, 31) * 40, -560, -7000));
      }

      /* ---- post -------------------------------------------------- */
      flash(c.stage, t, [
        ...chain.filter((_, i) => i % 4 === 0).map((ch) => ({
          t: ch.t, dur: 0.24, amount: 0.05 + Math.min(ch.size, 60) / 620, color: 0xffdca8,
        })),
        { t: DET, dur: 0.55, amount: 1.0, pow: 3.0, color: 0xffffff },
        { t: DET + 1.05, dur: 0.5, amount: 0.36, pow: 2.4, color: 0xffe2b0 },
        { t: DET + 3.4, dur: 0.5, amount: 0.2, pow: 2.4, color: 0xffd8a0 },
        { t: JUMP, dur: 0.5, amount: 1.0, pow: 2.6, color: 0xffffff },
        { t: DROP - 0.05, dur: 0.62, amount: 0.95, pow: 2.2, color: 0xf4faff },
      ]);
      c.stage.bloom.strength = t < DET ? 0.58 + 0.12 * heat
        : t < CALM ? 0.68 + 0.42 * Math.pow(clamp(1 - boom / 5), 1.6)
          : t < DROP ? lerp(0.6, 0.8, smoothstep(SNAP, JUMP, t))
            : lerp(0.68, 0.58, smoothstep(END - 2.5, END - 1.0, t));
    },
  };
}

/** Extra handheld from whichever chain hit is going off nearby. */
function chainShake(t, chain) {
  let v = 0;
  for (const c of chain) {
    const k = 1 - Math.abs(t - c.t) * 4.5;
    if (k > v) v = k;
  }
  return clamp(v);
}
