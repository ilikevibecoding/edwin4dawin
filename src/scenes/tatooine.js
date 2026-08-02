/**
 * Scene 4 — Tatooine.  Local 0..32s, absolute film time 131..163.
 *
 *   0.0  the world: twin suns low over an endless dune field
 *   2.7  the pod, half-buried and smoking at the end of a black skid scar
 *   5.0  the walk, wide: two specks on a crest, shadows reaching for camera
 *   8.4  the walk at sand level, dune crests cutting the frame
 *  11.5  the argument, nose to nose
 *  13.9  the split — held wide, out of frame in opposite directions
 *  18.0  a sandcrawler crests the ridge and fills the frame
 *  20.9  jawas pour down the ramp and surround the astromech
 *  23.3  the zap, and the haul
 *  26.2  the ramp closes
 *  29.0  a long silhouette going into the suns
 *
 * Everything that touches the sand is placed through desert().heightAt, and
 * every motion is a closed form (or a build-time table) of t.
 */
import * as THREE from 'three';
import { desert, dunesBackdrop, twinSuns } from '../models/environments.js';
import { escapePod, sandcrawler } from '../models/ships.js';
import { astromech, protocolDroid, jawa } from '../models/characters.js';
import { walk, pose } from '../lego/minifig.js';
import { prism, rng } from '../lego/bricks.js';
import {
  lightRig, Bolts, Impacts, Smoke,
  beat, clamp, lerp, smoothstep, flash,
} from './_kit.js';

export const id = 'tatooine';

/* --- shot marks ----------------------------------------------------- */
const SH_WORLD = 0.0;
const SH_POD = 2.7;
const SH_WALK = 5.0;
const SH_TRACK = 8.4;
const SH_ARGUE = 11.5;
const SH_SPLIT = 13.9;
const SH_CREST = 18.0;
const SH_SWARM = 20.9;
const SH_ZAP = 23.3;
const SH_RAMP = 26.2;
const SH_AWAY = 29.0;
const END = 32.0;

/* --- beat clock ------------------------------------------------------ */
const T_STOP = 20.4;        // the crawler comes to rest
const T_RAMP_DOWN = 20.4;
const T_JAWA_OUT = 21.0;
const T_ZAP = 23.5;
const T_DRAG = 24.3;
const T_INSIDE = 26.0;
const T_RAMP_UP = 26.2;
const T_PIVOT = 27.4;
const T_ROLL = 27.8;

/* --- geography -------------------------------------------------------
 * Bearings: `head(x, z)` is the rotation.y that points a -Z-facing model
 * along the ground vector (x, z).  Camera bearings use the mirror of that,
 * phi = atan2(x, -z), so phi = 0 looks down -Z and +phi swings to +X.
 */
const head = (x, z) => Math.atan2(-x, -z);
const bear = (x, z) => Math.atan2(x, -z);
const TAU = Math.PI * 2;
const angLerp = (a, b, k) => a + (((b - a) % TAU + TAU * 1.5) % TAU - Math.PI) * k;

// the suns sit ~16 degrees left of -Z, and the whole scene is shot into them
const SUN_AZ = new THREE.Vector3(-0.27, 0, -0.963).normalize();
const SUN_PHI = bear(SUN_AZ.x, SUN_AZ.z);
const SUN_HI = 0.235;                       // radians above the horizon at t=0
const SUN_LO = 0.078;                       // ... and at the end

const WALK_FROM = [30, 78];                 // where the droids leave the pod
const WALK_DIR = [-0.18, -0.9836];          // ... and the line they trudge along
const ASTRO_DIR = [0.9836, -0.18];          // dead perpendicular, so the joke reads
const PROTO_DIR = [-0.9836, 0.18];

const POD_AT = [46, 101];
const SCAR_FROM = [196, 222];

const CRAWL_VEC = [-0.55, -0.835];          // the bearing it grinds in on
const CRAWL_IN = head(CRAWL_VEC[0], CRAWL_VEC[1]);
const CRAWL_OUT = head(SUN_AZ.x, SUN_AZ.z);

/* ------------------------------------------------------------------ */
/* build                                                               */
/* ------------------------------------------------------------------ */

export async function build(ctx) {
  const scene = new THREE.Scene();
  const rand = rng(2404);

  /* ---- ground ------------------------------------------------------ */
  const sand = desert({ size: 1400, seg: 280, seed: 77, amp: 14, rocks: 56, bones: 2 });
  scene.add(sand);
  const ground = sand.userData.heightAt;
  /** Low-passed sand height, so a moving camera does not ride the ripples. */
  const gs = (x, z, r = 9) =>
    (ground(x, z) + ground(x + r, z) + ground(x - r, z) + ground(x, z + r) + ground(x, z - r)) / 5;

  /* ---- lights ------------------------------------------------------ */
  const lights = lightRig(scene, 'desert', {
    shadowMap: 2048, shadowExtent: 105, shadowFar: 520,
  });
  scene.fog.near = 70;
  scene.fog.far = 820;

  /* ---- sky, horizon, suns ------------------------------------------ */
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(5200, 32, 20),
    new THREE.ShaderMaterial({
      uniforms: {
        cLow: { value: new THREE.Color(0xf3d7a4) },
        cMid: { value: new THREE.Color(0xd9a86a) },
        cHigh: { value: new THREE.Color(0x8d7a76) },
        cSun: { value: new THREE.Color(0xffb066) },
        sunDir: { value: new THREE.Vector3(0, 0.2, -1) },
      },
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 cLow, cMid, cHigh, cSun, sunDir;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          vec3 c = mix(cLow, cMid, smoothstep(-0.015, 0.15, d.y));
          c = mix(c, cHigh, smoothstep(0.12, 0.75, d.y));
          float s = max(dot(d, normalize(sunDir)), 0.0);
          c += cSun * (pow(s, 6.0) * 0.34 + pow(s, 40.0) * 0.5);
          c = mix(c, cLow * 0.5, smoothstep(0.0, -0.10, d.y));
          gl_FragColor = vec4(c, 1.0);
        }`,
    })
  );
  sky.renderOrder = -1000;
  sky.frustumCulled = false;
  scene.add(sky);

  const backdrop = dunesBackdrop({ seed: 91, layers: 4, radius: 900, haze: 0xd0b58a });
  scene.add(backdrop);
  const ridgeBands = backdrop.children.map((m) => ({ m, base: m.material.color.clone() }));

  const suns = twinSuns({ sep: 300, dist: 2620, size: 122, colors: [0xfff0c8, 0xffb268] });
  suns.rotation.y = CRAWL_OUT;
  suns.traverse((o) => {
    if (o.material) { o.material.fog = false; o.material.needsUpdate = true; }
  });
  scene.add(suns);

  // a shimmer band on the horizon: the cheapest honest heat haze
  const hazeTex = softDot();
  const haze = [];
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: hazeTex, color: 0xffdcae, transparent: true, opacity: 0.1,
      depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    }));
    s.renderOrder = -600;
    s.userData.a = (i / 7) * TAU + rand() * 0.7;
    s.userData.k = 0.6 + rand() * 0.8;
    scene.add(s);
    haze.push(s);
  }

  /* ---- the pod, its scar and its smoke ----------------------------- */
  const POD_YAW = head(POD_AT[0] - SCAR_FROM[0], POD_AT[1] - SCAR_FROM[1]);
  const POD_Y = ground(POD_AT[0], POD_AT[1]) - 1.45;
  const pod = escapePod({ seed: 3 });
  pod.rotation.order = 'YXZ';
  pod.position.set(POD_AT[0], POD_Y, POD_AT[1]);
  pod.rotation.set(-0.15, POD_YAW, 0.22);
  pod.userData.setThrottle(0);
  scene.add(pod);
  scene.add(skidScar(SCAR_FROM, POD_AT, ground));
  scene.add(sandBerm(POD_AT, POD_YAW, ground, rand));

  const podSmoke = new Smoke(scene, {
    t0: -4, count: 46, origin: [POD_AT[0] - 0.6, POD_Y + 4.4, POD_AT[1] + 1.8],
    spread: 3.0, size: 5.2, rise: 1.25, life: 8, opacity: 0.42,
    color: 0x6b5f55, spawnWindow: 38, seed: 17,
  });

  /* ---- the two droids: where they are, at any t --------------------- */
  const vWalk = (t) => 7.2 * smoothstep(2.1, 3.9, t) * (1 - smoothstep(10.5, 11.8, t));
  const vAstro = (t) => 4.6 * smoothstep(12.9, 13.9, t) * (1 - smoothstep(19.1, 19.9, t));
  const vProto = (t) => 4.3 * smoothstep(12.7, 13.7, t);
  const walkDist = table(vWalk, 0, END);
  const astroDist = table(vAstro, 0, END);
  const protoDist = table(vProto, 0, END);

  const along = (d) => [WALK_FROM[0] + WALK_DIR[0] * d, WALK_FROM[1] + WALK_DIR[1] * d];
  const astroPos = (t) => {
    const w = along(walkDist(t)), a = astroDist(t);
    return [w[0] + ASTRO_DIR[0] * a, w[1] + ASTRO_DIR[1] * a];
  };
  const protoPos = (t) => {
    const w = along(walkDist(t)), p = protoDist(t);
    return [w[0] + PROTO_DIR[0] * p - 3.6, w[1] + PROTO_DIR[1] * p + 1.4];
  };

  const SPLIT = along(walkDist(END));
  const CAUGHT = astroPos(END);

  // yaw: trudging -> turned on each other -> stalking off in opposite directions
  const YAW_WALK = head(WALK_DIR[0], WALK_DIR[1]);
  const YAW_A_FACE = head(PROTO_DIR[0], PROTO_DIR[1]);
  const YAW_A_OFF = head(ASTRO_DIR[0], ASTRO_DIR[1]);
  const YAW_P_FACE = head(ASTRO_DIR[0], ASTRO_DIR[1]);
  const YAW_P_OFF = head(PROTO_DIR[0], PROTO_DIR[1]);
  const argueK = (t) => smoothstep(11.0, 11.9, t);
  const turnK = (t) => smoothstep(12.9, 13.7, t);

  /* ---- the sandcrawler --------------------------------------------- */
  const C_STOP = [CAUGHT[0] - CRAWL_VEC[0] * 41, CAUGHT[1] - CRAWL_VEC[1] * 41];
  const RAMP_FOOT = [C_STOP[0] + CRAWL_VEC[0] * 31, C_STOP[1] + CRAWL_VEC[1] * 31];
  const MOUTH = [C_STOP[0] + CRAWL_VEC[0] * 18, C_STOP[1] + CRAWL_VEC[1] * 18];

  const vCrawl = (t) => 9.6 * smoothstep(12.4, 14.2, t) * (1 - smoothstep(18.9, T_STOP, t))
    + 5.4 * smoothstep(T_ROLL, T_ROLL + 2.0, t);
  const hCrawl = (t) => lerp(CRAWL_IN, CRAWL_OUT, smoothstep(T_PIVOT, T_PIVOT + 1.4, t));
  const crawlPath = drive({
    t0: 11.0, t1: END, speed: vCrawl, heading: hCrawl,
    fix: { t: T_STOP + 0.6, x: C_STOP[0], z: C_STOP[1] },
  });

  const crawler = sandcrawler({ seed: 41 });
  crawler.rotation.order = 'YXZ';
  scene.add(crawler);

  // dust is laid down where the treads were, not carried with them, so the
  // trail hangs: one emitter per sampled moment of the drive, at each tread
  const dust = [];
  for (let i = 0; i < 32; i++) {
    const t = i < 15 ? 14.2 + i * 0.42 : T_ROLL + 0.3 + (i - 15) * 0.26;
    const p = crawlPath(t);
    const fx = -Math.sin(p.h), fz = -Math.cos(p.h);
    for (const s of [1, -1]) {
      // both treads, at the contact patch, sloughing sideways and back
      const x = p.x - fx * 6 + Math.cos(p.h) * s * 12.5;
      const z = p.z - fz * 6 - Math.sin(p.h) * s * 12.5;
      dust.push(new Smoke(scene, {
        t0: t, count: 5, origin: [x, ground(x, z) + 1.8, z], spread: 12,
        size: 11, rise: 0.28, life: 5.0, opacity: 0.30,
        color: 0xe4c898, spawnWindow: 0.4, seed: 60 + i * 3 + s,
      }));
    }
  }

  /* ---- the far outcrop the protocol droid stalks toward ------------- */
  const RIDGE_AT = [SPLIT[0] + PROTO_DIR[0] * 265, SPLIT[1] + PROTO_DIR[1] * 265];
  scene.add(rockRidge(RIDGE_AT, ground, 3311));

  /* ---- cast --------------------------------------------------------- */
  const astro = astromech({ seed: 2 });
  astro.rotation.order = 'YXZ';
  scene.add(astro);

  const threep = protocolDroid();
  threep.rotation.order = 'YXZ';
  scene.add(threep);

  const JAWA_N = 6;
  const jawas = [];
  for (let i = 0; i < JAWA_N; i++) {
    const j = jawa({ prop: i > 1 });      // the two draggers keep their hands free
    j.scale.setScalar(0.74);              // a jawa has to read shorter than an astromech
    j.rotation.order = 'YXZ';
    j.visible = false;
    scene.add(j);
    jawas.push(j);
  }
  // where each one ends up in the ring: two in front of the droid as
  // silhouettes, the rest closing the circle behind it
  const RING = [];
  for (let i = 0; i < JAWA_N; i++) {
    const a = -2.35 + i * (TAU / JAWA_N) * 0.94;
    RING.push([CAUGHT[0] + Math.sin(a) * 4.4, CAUGHT[1] + Math.cos(a) * 4.4]);
  }

  /* ---- the zap: fixed geometry, so the bolt is built once ----------- */
  const gun = [RING[2][0], ground(RING[2][0], RING[2][1]) + 1.9, RING[2][1]];
  const hit = [CAUGHT[0], ground(CAUGHT[0], CAUGHT[1]) + 1.7, CAUGHT[1]];
  const bolts = new Bolts(scene, [
    { t0: T_ZAP, from: gun, to: hit, speed: 26, color: 0x9de8ff, len: 2.4, thick: 0.15 },
    { t0: T_ZAP + 0.14, from: gun, to: hit, speed: 26, color: 0x9de8ff, len: 2.0, thick: 0.12 },
  ]);
  const zapHit = new Impacts(scene, [
    { t: T_ZAP + 0.16, pos: hit, size: 0.5, color: 0xcaf2ff },
    { t: T_ZAP + 0.30, pos: [hit[0], hit[1] + 0.6, hit[2]], size: 0.72, color: 0x8fd8ff },
  ], { dur: 0.45 });

  /* ---- placement helpers -------------------------------------------- */
  const nrm = new THREE.Vector3();

  /** Sit a small thing on the sand and let it lie along the slope. */
  const sitSmall = (o, x, z, yaw, opt = {}) => {
    nrm.copy(sand.userData.normalAt(x, z));
    o.position.set(x, (opt.y ?? ground(x, z)) + (opt.lift ?? 0), z);
    o.rotation.set((opt.pitch ?? 0) - nrm.z * 0.7, yaw, (opt.roll ?? 0) + nrm.x * 0.7);
  };

  /**
   * Sit a long vehicle on the sand: mean of its four corners, plus slope.
   * Something 46 units long grinds through a dune rather than teetering over
   * it, so the measured slope is deliberately under-applied.
   */
  const sitBig = (o, x, z, yaw, hl, hw, lift = 0.1) => {
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const hF = ground(x + fx * hl, z + fz * hl);
    const hB = ground(x - fx * hl, z - fz * hl);
    const hR = ground(x + rx * hw, z + rz * hw);
    const hL = ground(x - rx * hw, z - rz * hw);
    o.position.set(x, (hF + hB + hR + hL) / 4 + lift, z);
    o.rotation.set(
      Math.atan2(hF - hB, 2 * hl) * 0.62,
      yaw,
      Math.atan2(hR - hL, 2 * hw) * 0.62,
    );
  };

  /* ---- sound -------------------------------------------------------- */
  const cues = [
    { t: 0.10, sfx: 'wind', opts: { gain: 0.5, dur: 13, gust: 1.1 } },
    { t: 0.20, sfx: 'rumbleSub', opts: { gain: 0.34, dur: 4.5, f0: 40, f1: 26 } },
    { t: 2.85, sfx: 'engineRumble', opts: { gain: 0.22, dur: 4.5, pitch: 0.7, pan: 0.2 } },
    { t: 5.20, sfx: 'droidBeep', opts: { gain: 0.42, n: 4, pan: 0.1 } },
    { t: 6.70, sfx: 'protocolFuss', opts: { gain: 0.4, syllables: 7, pan: -0.12 } },
    { t: 9.10, sfx: 'droidBeep', opts: { gain: 0.36, n: 3, happy: false, pan: 0.14 } },
    { t: 11.10, sfx: 'wind', opts: { gain: 0.42, dur: 12, gust: 0.8 } },
    { t: 11.90, sfx: 'protocolFuss', opts: { gain: 0.52, syllables: 9, pan: -0.2 } },
    { t: 12.60, sfx: 'droidWorry', opts: { gain: 0.46, dur: 0.9, pan: 0.2 } },
    { t: 13.10, sfx: 'protocolFuss', opts: { gain: 0.5, syllables: 5, pan: -0.3 } },
    { t: 14.60, sfx: 'droidBeep', opts: { gain: 0.4, n: 5, happy: false, pan: 0.34 } },
    { t: 17.20, sfx: 'rumbleSub', opts: { gain: 0.5, dur: 3.6, f0: 46, f1: 24 } },
    { t: 17.40, sfx: 'sandcrawlerRumble', opts: { gain: 0.82, dur: 11, tread: 0.7 } },
    { t: 18.10, sfx: 'engineRumble', opts: { gain: 0.42, dur: 9, pitch: 0.55 } },
    { t: 19.70, sfx: 'droidWorry', opts: { gain: 0.5, dur: 1.1, pan: -0.1 } },
    { t: T_RAMP_DOWN + 1.05, sfx: 'hullImpact', opts: { gain: 0.5 } },
    { t: 21.10, sfx: 'jawaChatter', opts: { gain: 0.48, n: 12, pan: -0.2 } },
    { t: 21.80, sfx: 'jawaChatter', opts: { gain: 0.42, n: 9, pan: 0.25, seed: 3 } },
    { t: 22.60, sfx: 'jawaChatter', opts: { gain: 0.5, n: 13, pan: 0, seed: 7 } },
    { t: 22.95, sfx: 'droidWorry', opts: { gain: 0.55, dur: 1.0 } },
    { t: T_ZAP, sfx: 'blaster', opts: { gain: 0.62 } },
    { t: T_ZAP + 0.06, sfx: 'droidWorry', opts: { gain: 0.6, dur: 1.5 } },
    { t: T_ZAP + 0.55, sfx: 'jawaChatter', opts: { gain: 0.52, n: 10, seed: 11 } },
    { t: 25.30, sfx: 'jawaChatter', opts: { gain: 0.4, n: 8, pan: 0.2, seed: 13 } },
    { t: T_RAMP_UP, sfx: 'engineRumble', opts: { gain: 0.4, dur: 5, pitch: 0.6 } },
    { t: 27.35, sfx: 'hullImpact', opts: { gain: 0.62 } },
    { t: 27.45, sfx: 'rumbleSub', opts: { gain: 0.5, dur: 3, f0: 44, f1: 22 } },
    { t: T_ROLL, sfx: 'sandcrawlerRumble', opts: { gain: 0.7, dur: 9, tread: 0.62 } },
    { t: 28.70, sfx: 'protocolFuss', opts: { gain: 0.22, syllables: 8, pan: -0.6 } },
    { t: 29.10, sfx: 'wind', opts: { gain: 0.5, dur: 9, gust: 1.2 } },
    { t: 30.40, sfx: 'sandcrawlerRumble', opts: { gain: 0.3, dur: 5, tread: 0.5 } },
  ];

  /* ---- colour ramp: afternoon to evening --------------------------- */
  const SKY_A = [0xf3d7a4, 0xd9a86a, 0x8d7a76, 0xffb066];
  const SKY_B = [0xffbb7a, 0xd07b47, 0x60455c, 0xff8a34];
  const FOG_A = new THREE.Color(0xdcb27f);
  const FOG_B = new THREE.Color(0xc07a4e);
  const KEY_A = new THREE.Color(0xffd7a2);
  const KEY_B = new THREE.Color(0xff8436);
  const AMB_A = new THREE.Color(0x503a28);
  const AMB_B = new THREE.Color(0x4a3040);
  const RIDGE_B = new THREE.Color(0x9c6a63);
  const skyU = sky.material.uniforms;
  const sunWorld = new THREE.Vector3();
  const scratch = new THREE.Color();

  const world = {
    ground, gs, pod: POD_AT, split: SPLIT, caught: CAUGHT, stop: C_STOP,
    ramp: RAMP_FOOT, last: crawlPath(30.6),
  };

  return {
    scene,
    cues,

    update(t, c) {
      const cam = c.camera;
      cam.up.set(0, 1, 0);

      /* ---- evening falls -------------------------------------------- */
      const ev = smoothstep(0, 1, clamp(t / END));
      const elev = lerp(SUN_HI, SUN_LO, ev);
      suns.userData.setElevation(elev);
      suns.userData.update(t);
      sunWorld.set(SUN_AZ.x * Math.cos(elev), Math.sin(elev), SUN_AZ.z * Math.cos(elev)).normalize();

      const keys = ['cLow', 'cMid', 'cHigh', 'cSun'];
      for (let i = 0; i < 4; i++) {
        skyU[keys[i]].value.setHex(SKY_A[i]).lerp(scratch.setHex(SKY_B[i]), ev);
      }
      skyU.sunDir.value.copy(sunWorld);
      scene.fog.color.copy(FOG_A).lerp(FOG_B, ev);
      for (const b of ridgeBands) b.m.material.color.copy(b.base).lerp(RIDGE_B, ev * 0.85);
      lights.key.color.copy(KEY_A).lerp(KEY_B, ev);
      lights.key.intensity = lerp(3.8, 2.8, ev);
      lights.fill.intensity = lerp(0.9, 1.2, ev);
      lights.rim.intensity = lerp(1.1, 1.7, ev);
      lights.amb.color.copy(AMB_A).lerp(AMB_B, ev);

      /* ---- the crawler ---------------------------------------------- */
      const cp = crawlPath(t);
      sitBig(crawler, cp.x, cp.z, cp.h, 20, 12.4, 0.1);
      crawler.userData.treadScroll(-cp.d / 4.67);
      const rampK = clamp(beat(t, T_RAMP_DOWN, T_RAMP_DOWN + 1.15) - beat(t, T_RAMP_UP, T_RAMP_UP + 1.15));
      crawler.userData.setRamp(rampK);
      // ...then a little further, so the lip actually reaches the sand
      crawler.userData.ramp.rotation.x -= 0.50 * rampK;
      crawler.userData.setThrottle(0.2 + 0.55 * clamp(vCrawl(t) / 9.6));
      crawler.visible = t > 12.6;

      /* ---- the astromech --------------------------------------------- */
      const ap = astroPos(t);
      const aRun = walkDist(t) + astroDist(t);
      const aYaw = angLerp(angLerp(YAW_WALK, YAW_A_FACE, argueK(t)), YAW_A_OFF, turnK(t));
      const topple = smoothstep(T_ZAP + 0.1, T_ZAP + 0.9, t);
      const dragK = smoothstep(T_DRAG, T_INSIDE, t);

      // dragged along the sand to the ramp foot, then up it into the dark
      const up = smoothstep(0.52, 1.0, dragK);
      const legK = smoothstep(0.0, 0.55, dragK);
      const ax = lerp(lerp(ap[0], RAMP_FOOT[0], legK), MOUTH[0], up);
      const az = lerp(lerp(ap[1], RAMP_FOOT[1], legK), MOUTH[1], up);
      const aY = lerp(ground(ax, az), crawler.position.y + 4.9, up);

      astro.userData.setCenterFoot(1);
      astro.userData.roll(aRun);
      sitSmall(astro, ax, az, aYaw + topple * 0.4, {
        y: aY,
        pitch: -topple * 1.0 + Math.sin(aRun * 1.6) * 0.035 * (1 - topple),
        roll: Math.sin(aRun * 0.85) * 0.07 * (1 - topple) + topple * 0.14,
        lift: topple * 0.6,
      });
      astro.userData.dome.rotation.y = t < T_ZAP
        ? Math.sin(t * 0.9) * 0.5 + Math.sin(t * 2.3) * 0.12 - 2.6 * smoothstep(18.4, 19.6, t)
        : -2.6 + Math.sin(t * 9) * 0.55 * Math.exp(-(t - T_ZAP) * 2.0);
      astro.visible = t < T_INSIDE + 0.02;

      /* ---- the protocol droid ---------------------------------------- */
      const pp = protoPos(t);
      const pRun = walkDist(t) + protoDist(t);
      const pYaw = angLerp(angLerp(YAW_WALK, YAW_P_FACE, argueK(t)), YAW_P_OFF, turnK(t));
      sitSmall(threep, pp[0], pp[1], pYaw);
      const pv = vWalk(t) + vProto(t);
      if (pv > 0.2) {
        walk(threep, pRun / 2.55, { stride: 0.30, arms: 0.15, lean: 0.015, twist: 0.03, sway: 0.02 });
        // even marching off he cannot stop making the point
        if (t > 13.6 && t < 16.4) pose(threep, { armL: 0.85 + 0.5 * Math.sin(t * 3.1), handL: -1.0 });
      } else {
        const g = Math.sin(t * 3.0);
        pose(threep, {
          armR: 0.18 + 0.12 * g, armL: 0.95 + 0.6 * g, handL: -1.1 + 0.5 * g, handR: -0.6,
          legR: 0.05, legL: -0.05, lean: -0.06, headY: 0.2 * Math.sin(t * 1.3), torsoY: 0.14 * g,
        });
      }

      /* ---- jawas ------------------------------------------------------ */
      const jawaAt = (i, tt) => {
        const out = T_JAWA_OUT + i * 0.2;
        const k = smoothstep(out, out + 1.6, tt);
        const back = smoothstep(T_DRAG + 0.05, T_INSIDE - 0.1, tt);
        const dk = smoothstep(T_DRAG, T_INSIDE, tt);
        const lk = smoothstep(0.0, 0.55, dk), uk = smoothstep(0.52, 1.0, dk);
        const dx = lerp(lerp(astroPos(tt)[0], RAMP_FOOT[0], lk), MOUTH[0], uk);
        const dz = lerp(lerp(astroPos(tt)[1], RAMP_FOOT[1], lk), MOUTH[1], uk);
        const side = i === 0 ? 1 : -1;
        const grip = i < 2
          ? [dx + CRAWL_VEC[0] * 2.6 - CRAWL_VEC[1] * 1.9 * side, dz + CRAWL_VEC[1] * 2.6 + CRAWL_VEC[0] * 1.9 * side]
          : [lerp(RAMP_FOOT[0], MOUTH[0], uk * 0.9), lerp(RAMP_FOOT[1], MOUTH[1], uk * 0.9)];
        return [
          lerp(lerp(RAMP_FOOT[0], RING[i][0], k), grip[0], back),
          lerp(lerp(RAMP_FOOT[1], RING[i][1], k), grip[1], back),
        ];
      };

      for (let i = 0; i < JAWA_N; i++) {
        const j = jawas[i];
        const out = T_JAWA_OUT + i * 0.2;
        j.visible = t > out - 0.02 && t < T_INSIDE + 0.3;
        if (!j.visible) continue;
        const p0 = jawaAt(i, t), p1 = jawaAt(i, t - 0.1);
        const step = Math.hypot(p0[0] - p1[0], p0[1] - p1[1]);
        const moving = step > 0.02;
        const jYaw = moving ? head(p0[0] - p1[0], p0[1] - p1[1]) : head(ax - p0[0], az - p0[1]);
        const jUp = t > T_DRAG + 0.9
          ? lerp(ground(p0[0], p0[1]), crawler.position.y + 4.9, smoothstep(0.62, 1.0, dragK))
          : ground(p0[0], p0[1]);
        sitSmall(j, p0[0], p0[1], jYaw, { y: jUp });
        if (moving) {
          walk(j, (i * 0.4 + t * 2.6), { stride: 0.5, arms: 0.44, lean: 0.1, twist: 0.11, sway: 0.05 });
        } else {
          const g = Math.sin(t * 5.4 + i * 1.7);
          pose(j, {
            armR: 0.55 + 0.4 * g, armL: 0.5 - 0.35 * g, handR: -0.5, handL: 0.5,
            legR: 0.04 * g, legL: -0.04 * g, lean: 0.14, headY: 0.22 * g,
          });
        }
        if (i < 2 && t > T_ZAP + 0.7) pose(j, { armR: 1.2, armL: 1.1, lean: 0.26, handR: -0.4, handL: 0.4 });
      }

      /* ---- the zap ---------------------------------------------------- */
      bolts.update(t);
      zapHit.update(t);
      flash(c.stage, t, [{ t: T_ZAP + 0.14, dur: 0.3, amount: 0.22, color: 0xbfeaff }]);

      /* ---- atmosphere -------------------------------------------------- */
      podSmoke.update(t);
      for (const d of dust) d.update(t);

      /* ---- camera ------------------------------------------------------ */
      shoot(t, cam, { ...world, astro: ap, proto: pp, crawler: cp, drag: [ax, az] });
      cam.updateProjectionMatrix();
      sky.position.copy(cam.position);
      for (const s of haze) {
        const a = s.userData.a + t * 0.005 * s.userData.k;
        const r = 430;
        s.position.set(cam.position.x + Math.sin(a) * r, 15 + s.userData.k * 7, cam.position.z + Math.cos(a) * r);
        s.scale.set(r * 0.8, r * 0.05 * s.userData.k, 1);
        s.material.opacity = lerp(0.12, 0.06, ev);
      }

      // keep the shadow camera on whatever the lens is looking at
      const f = focusOf(t, { astro: ap, crawler: cp, pod: POD_AT, caught: CAUGHT });
      const fy = ground(f[0], f[1]);
      lights.key.target.position.set(f[0], fy, f[1]);
      lights.key.position.set(f[0] + sunWorld.x * 240, fy + sunWorld.y * 240, f[1] + sunWorld.z * 240);
      lights.key.target.updateMatrixWorld();
    },
  };
}

/* ------------------------------------------------------------------ */
/* camera                                                              */
/* ------------------------------------------------------------------ */

/** What the shadow camera should be centred on for the shot at time t. */
function focusOf(t, p) {
  if (t < SH_WALK) return p.pod;
  if (t < SH_CREST) return p.astro;
  if (t < SH_RAMP) return [(p.crawler.x + p.caught[0]) / 2, (p.crawler.z + p.caught[1]) / 2];
  return [p.crawler.x, p.crawler.z];
}

function shoot(t, cam, w) {
  const G = w.gs;
  /** Landscape framing: stand at (x,z), face bearing phi, tilt by `pitch`. */
  const face = (x, up, z, phi, pitch, fov, roll = 0) => {
    const y = G(x, z) + up;
    cam.position.set(x, y, z);
    cam.lookAt(
      x + Math.sin(phi) * Math.cos(pitch) * 100,
      y + Math.sin(pitch) * 100,
      z - Math.cos(phi) * Math.cos(pitch) * 100,
    );
    cam.fov = fov;
    if (roll) cam.rotateZ(roll);
  };
  /** Subject framing: stand at (x,z), look at a point, `ty` is above its sand. */
  const on = (x, up, z, tx, ty, tz, fov, roll = 0) => {
    cam.position.set(x, G(x, z) + up, z);
    cam.lookAt(tx, G(tx, tz) + ty, tz);
    cam.fov = fov;
    if (roll) cam.rotateZ(roll);
  };
  const a = w.astro, pr = w.proto, cr = w.crawler, pd = w.pod;
  const V = CRAWL_VEC, P = [-V[1], V[0]];      // crawler forward / its left

  if (t < SH_POD) {
    /* --- the world: suns at the left third, the pod and its scar at the
           right, the horizon down at two thirds and nothing else ------- */
    const k = beat(t, SH_WORLD, SH_POD);
    const d = 86 - k * 13;
    face(pd[0] - d * 0.42, 8.5 - k * 0.7, pd[1] + d * 0.907, 0.10, 0.118 - k * 0.008, 42);
  } else if (t < SH_WALK) {
    /* --- the pod: near, side-lit, the scar running off to the horizon
           behind it.  The only shot in the scene facing away from the
           suns, so the pod itself is warm instead of a silhouette. ----- */
    const k = beat(t, SH_POD, SH_WALK);
    const d = 19 - k * 3;
    on(
      pd[0] - 0.968 * d, 2.6, pd[1] - 0.249 * d,
      pd[0] + 1.6, 3.2, pd[1] + 0.6,
      42 - k * 3,
    );
  } else if (t < SH_TRACK) {
    /* --- the walk, wide: two specks and two very long shadows --------- */
    const k = beat(t, SH_WALK, SH_TRACK);
    face(a[0] + 5 + k * 3.5, 7.5 - k * 2, a[1] + 33 - k * 2, -0.135, -0.062 - k * 0.006, 36);
  } else if (t < SH_ARGUE) {
    /* --- sand level, tracking: the crest cuts across the frame -------- */
    const k = beat(t, SH_TRACK, SH_ARGUE);
    on(a[0] + 7.0 - k * 1.2, 1.3, a[1] + 14.0, a[0] + 3.4, 4.2, a[1] - 11, 41);
  } else if (t < SH_SPLIT) {
    /* --- the argument: nose to nose, and neither of them listening ---- */
    const k = beat(t, SH_ARGUE, SH_SPLIT);
    const mx = (a[0] + pr[0]) / 2, mz = (a[1] + pr[1]) / 2;
    on(mx + 3.4 + k, 3.1, mz + 14.6 - k * 1.4, mx - 1.2, 2.9, mz - 3, 35);
  } else if (t < SH_CREST) {
    /* --- held wide: they leave the frame in opposite directions ------- */
    const k = beat(t, SH_SPLIT, SH_CREST);
    const s = w.split;
    face(s[0] + 6.5, 6.5 + k * 0.6, s[1] + 35.5 + k * 3, -0.176, 0.078, 31);
  } else if (t < SH_SWARM) {
    /* --- low and wide: it is by far the biggest thing on this planet -- */
    const k = beat(t, SH_CREST, SH_SWARM);
    const g = w.caught;
    const cx = g[0] + V[0] * (15 + k * 3) + P[0] * 13.5;
    const cz = g[1] + V[1] * (15 + k * 3) + P[1] * 13.5;
    on(cx, 1.35 + k * 0.5, cz, lerp(g[0], cr.x, 0.46), 8.5 - k * 1.5, lerp(g[1], cr.z, 0.46), 40 - k * 2);
  } else if (t < SH_ZAP) {
    /* --- jawas down the ramp, eyes lit under the hoods ---------------- */
    const k = beat(t, SH_SWARM, SH_ZAP);
    const g = w.caught;
    const cx = g[0] + V[0] * 12.5 - P[0] * 12.5;
    const cz = g[1] + V[1] * 12.5 - P[1] * 12.5;
    on(cx, 1.7, cz, lerp(g[0], w.ramp[0], 0.3), 2.8, lerp(g[1], w.ramp[1], 0.3), 38 - k * 4);
  } else if (t < SH_RAMP) {
    /* --- the zap, then the haul up the ramp --------------------------- */
    const k = beat(t, SH_ZAP, SH_RAMP);
    const dx = w.drag[0], dz = w.drag[1];
    on(
      dx + V[0] * 12 - P[0] * (12 + k * 4), 1.7 + k * 1.6, dz + V[1] * 12 - P[1] * (12 + k * 4),
      lerp(dx, w.ramp[0], 0.4), 2.0 + k * 3.4, lerp(dz, w.ramp[1], 0.4), 37 + k * 4, -0.016,
    );
  } else if (t < SH_AWAY) {
    /* --- the ramp seals, the treads bite ------------------------------ */
    const k = beat(t, SH_RAMP, SH_AWAY);
    on(
      cr.x + V[0] * 40 - P[0] * (58 + k * 6), 4.0 + k * 1.4, cr.z + V[1] * 40 - P[1] * (58 + k * 6),
      cr.x + V[0] * 6, 10 + k * 2, cr.z + V[1] * 6, 36,
    );
  } else {
    /* --- the long goodbye: small, black, going into the light --------- */
    const k = beat(t, SH_AWAY, END);
    const e = w.last;
    const d = 186;
    face(e.x - d * 0.1068, 6.5, e.z + d * 0.9943, SUN_PHI + 0.22, 0.125 - k * 0.006, 31 - k * 2.5);
  }
}

/* ------------------------------------------------------------------ */
/* build-time helpers                                                  */
/* ------------------------------------------------------------------ */

/**
 * Integrate a speed profile once, at build time, into a distance table.
 * Runtime is a pure lookup, so nothing ever accumulates between frames.
 */
function table(speed, t0, t1, steps = 1024) {
  const dt = (t1 - t0) / steps;
  const d = new Float64Array(steps + 1);
  for (let i = 1; i <= steps; i++) d[i] = d[i - 1] + speed(t0 + (i - 0.5) * dt) * dt;
  return (t) => {
    const k = clamp((t - t0) / (t1 - t0)) * steps;
    const i = Math.min(steps - 1, Math.max(0, Math.floor(k)));
    return lerp(d[i], d[i + 1], clamp(k - i));
  };
}

/** The same idea for a vehicle: speed *and* heading, integrated into a path. */
function drive({ t0, t1, speed, heading, fix, steps = 1600 }) {
  const dt = (t1 - t0) / steps;
  const xs = new Float64Array(steps + 1);
  const zs = new Float64Array(steps + 1);
  const hs = new Float64Array(steps + 1);
  const ds = new Float64Array(steps + 1);
  hs[0] = heading(t0);
  for (let i = 1; i <= steps; i++) {
    const tm = t0 + (i - 0.5) * dt;
    const h = heading(tm);
    const v = speed(tm) * dt;
    xs[i] = xs[i - 1] - Math.sin(h) * v;
    zs[i] = zs[i - 1] - Math.cos(h) * v;
    ds[i] = ds[i - 1] + v;
    hs[i] = heading(t0 + i * dt);
  }
  let ox = 0, oz = 0;
  if (fix) {
    const k = clamp((fix.t - t0) / (t1 - t0)) * steps;
    const i = Math.min(steps - 1, Math.floor(k));
    ox = fix.x - lerp(xs[i], xs[i + 1], k - i);
    oz = fix.z - lerp(zs[i], zs[i + 1], k - i);
  }
  return (t) => {
    const k = clamp((t - t0) / (t1 - t0)) * steps;
    const i = Math.min(steps - 1, Math.max(0, Math.floor(k)));
    const f = clamp(k - i);
    return {
      x: ox + lerp(xs[i], xs[i + 1], f),
      z: oz + lerp(zs[i], zs[i + 1], f),
      h: lerp(hs[i], hs[i + 1], f),
      d: lerp(ds[i], ds[i + 1], f),
    };
  };
}

/** The furrow the pod ploughed, laid exactly on the sand. */
function skidScar(from, to, ground) {
  const dx = to[0] - from[0], dz = to[1] - from[1];
  const len = Math.hypot(dx, dz);
  const ux = dx / len, uz = dz / len;
  const nx = -uz, nz = ux;
  const N = Math.max(24, Math.round(len / 2));
  const pos = [], col = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const wander = Math.sin(s * 6.4 + 1.1) * 1.9 + Math.sin(s * 2.1) * 2.8;
    const wid = lerp(2.2, 6.6, Math.pow(s, 0.6)) * (1 - 0.5 * Math.pow(1 - s, 5));
    const cx = from[0] + ux * len * s + nx * wander;
    const cz = from[1] + uz * len * s + nz * wander;
    const fade = smoothstep(0, 0.25, s) * (0.5 + 0.5 * s);
    for (const side of [-1.0, -0.34, 0.34, 1.0]) {
      const px = cx + nx * wid * side;
      const pz = cz + nz * wid * side;
      const core = Math.abs(side) < 0.5 ? 1 : 0.35;
      pos.push(px, ground(px, pz) + 0.16, pz);
      col.push(0.24, 0.17, 0.11, fade * 0.85 * core);
    }
  }
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < 3; k++) {
      const b = i * 4 + k;
      idx.push(b, b + 4, b + 1, b + 1, b + 4, b + 5);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
    vertexColors: true, transparent: true, roughness: 1, metalness: 0,
    depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  }));
  m.receiveShadow = true;
  m.renderOrder = 1;
  return m;
}

/** Sand ploughed up around the buried pod. */
function sandBerm(at, yaw, ground, rand) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0xd8bf90, roughness: 1 });
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  for (let i = 0; i < 9; i++) {
    const s = (i / 8) * 2 - 1;
    const side = i % 2 ? 1 : -1;
    const x = at[0] + fx * (1.5 + s * 3.5) - fz * side * (2.6 + rand() * 1.6);
    const z = at[1] + fz * (1.5 + s * 3.5) + fx * side * (2.6 + rand() * 1.6);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.7 + rand() * 1.5, 12, 8), m);
    mesh.position.set(x, ground(x, z) - 0.75, z);
    mesh.scale.set(1.3 + rand() * 0.8, 0.4, 1.0 + rand() * 0.7);
    mesh.rotation.y = yaw + (rand() - 0.5);
    mesh.castShadow = mesh.receiveShadow = true;
    g.add(mesh);
  }
  return g;
}

/** A line of low buttes on the skyline, for the protocol droid to stalk at. */
function rockRidge(at, ground, seed) {
  const r = rng(seed);
  const g = new THREE.Group();
  const cols = [0xa88a5e, 0x8d7350, 0xb89c72, 0x7a6449];
  for (let i = 0; i < 9; i++) {
    const s = (i / 8) * 2 - 1;
    const x = at[0] + s * 105 + (r() - 0.5) * 26;
    const z = at[1] + s * 44 + (r() - 0.5) * 30;
    const gy = ground(x, z);
    const rad = 16 + r() * 22;
    const hgt = (16 + r() * 28) * (1 - 0.5 * Math.abs(s));
    // a flat-topped mesa with a talus skirt, both sunk well into the sand
    for (const [rs, hs, dy] of [[1, 1, -7], [1.55, 0.24, -4]]) {
      const pts = [];
      const n = 7;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU + r() * 0.3;
        pts.push([Math.cos(a) * rad * rs * (0.7 + r() * 0.5), Math.sin(a) * rad * rs * (0.7 + r() * 0.5)]);
      }
      const m = prism(pts, hgt * hs + 8, { color: cols[(r() * cols.length) | 0], rough: 0.94, flat: true, bevel: 1.2 });
      m.position.set(x, gy + dy, z);
      m.rotation.y = r() * TAU;
      g.add(m);
    }
  }
  return g;
}

let _dotTex = null;
/** Soft radial sprite, used for the horizon shimmer. */
function softDot() {
  if (_dotTex) return _dotTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,0.85)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0.28)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  _dotTex = new THREE.CanvasTexture(c);
  return _dotTex;
}
