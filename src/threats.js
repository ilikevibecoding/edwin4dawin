// Incoming ballistic threats and decoys: procedural re-entry bodies, ballistic
// arcs with a simplified drag model, visual boost/coast/re-entry/terminal phases
// and pooled trails. All figures are fictional and tuned for readability.
//
// The re-entry body is a heavy, charred lathe assembly split into two meshes: a
// painted hull and an ablative nose whose colour and glow track aerodynamic
// heating. The decoy is deliberately the opposite — a wire frame carrying an
// inflated metallised envelope — but keeps a similar apparent size so radar
// discrimination stays late.

import * as THREE from 'three';
import { THREAT, WORLD, SCENARIO_BY_ID } from './config.js';
import { std } from './util/materials.js';
import { chamferBox, mergeParts, transform, latheProfile, cylinder } from './util/geom.js';
import { integrateBody, ballisticLaunchVelocity, alignToVelocity, trailPersistence, machNumber } from './physics.js';
import { GlowSprite } from './util/billboard.js';
import {
  flareSprite,
  paintedMetalMaps,
  fbmCanvas,
  makeCanvas,
  finishTexture,
  normalFromCanvas,
  canvasGrain,
  canvasSplotches,
} from './util/textures.js';
import { bus, state } from './state.js';

export const PHASE = {
  MIDCOURSE: 'MIDCOURSE',
  REENTRY: 'REENTRY',
  TERMINAL: 'TERMINAL',
  DESTROYED: 'DESTROYED',
};

let nextId = 1;

/* ============================================================== materials = */

/**
 * Charred phenolic heat shield: pitted, streaked aft by the flow and rough
 * enough that the nose never picks up a clean specular highlight.
 */
function ablativeMaps(size = 512) {
  const height = fbmCanvas(size, { seed: 131, octaves: 6, scale: 14, contrast: 1.45 });
  const pits = fbmCanvas(size, { seed: 57, octaves: 5, scale: 46, contrast: 2.4 });
  const c = makeCanvas(size);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#4a4238';
  ctx.fillRect(0, 0, size, size);
  ctx.globalAlpha = 0.55;
  ctx.drawImage(height, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = '#9b8f7e';
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';
  // ablation streaks running aft down the body (texture v)
  let s = 8123;
  const rnd = () => ((s = (Math.imul(s, 48271) + 11) & 0x7fffffff), (s >>> 9) / 4194304);
  for (let i = 0; i < 90; i++) {
    const x = rnd() * size;
    const y = rnd() * size * 0.6;
    const len = size * (0.1 + rnd() * 0.5);
    const g = ctx.createLinearGradient(x, y, x, y + len);
    const dark = rnd() > 0.4;
    const col = dark ? '26,22,18' : '176,158,128';
    g.addColorStop(0, `rgba(${col},0)`);
    g.addColorStop(0.3, `rgba(${col},${0.1 + rnd() * 0.3})`);
    g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x, y, 1 + rnd() * 5, len);
  }
  canvasSplotches(ctx, size, size, 110, [[24, 20, 16], [140, 122, 96], [72, 60, 46]], [5, 30], 41, [0.06, 0.3]);
  canvasGrain(ctx, size, size, 0.15);
  const hc = makeCanvas(size);
  const hx = hc.getContext('2d', { willReadFrequently: true });
  hx.drawImage(height, 0, 0);
  hx.globalAlpha = 0.65;
  hx.drawImage(pits, 0, 0);
  hx.globalAlpha = 1;
  const rough = makeCanvas(size);
  const rx = rough.getContext('2d', { willReadFrequently: true });
  rx.fillStyle = '#efefef';
  rx.fillRect(0, 0, size, size);
  rx.globalAlpha = 0.35;
  rx.drawImage(pits, 0, 0);

  // Emissive mask. The lathe runs v=0 at the tip and textures are not flipped,
  // so v=0 is the bottom of the canvas: the stagnation point glows, the
  // shoulder cools off, and the pit texture breaks the gradient into hot cells.
  const glow = makeCanvas(size);
  const gx = glow.getContext('2d', { willReadFrequently: true });
  const grad = gx.createLinearGradient(0, size, 0, 0);
  grad.addColorStop(0.0, '#ffffff');
  grad.addColorStop(0.28, '#d8d8d8');
  grad.addColorStop(0.62, '#6a6a6a');
  grad.addColorStop(1.0, '#242424');
  gx.fillStyle = grad;
  gx.fillRect(0, 0, size, size);
  gx.globalCompositeOperation = 'overlay';
  gx.globalAlpha = 0.55;
  gx.drawImage(pits, 0, 0);
  gx.globalCompositeOperation = 'source-over';
  gx.globalAlpha = 1;

  return {
    map: finishTexture(c, { repeat: [2, 1] }),
    normalMap: finishTexture(normalFromCanvas(hc, 2.8), { srgb: false, repeat: [2, 1] }),
    roughnessMap: finishTexture(rough, { srgb: false, repeat: [2, 1] }),
    emissiveMap: finishTexture(glow, { repeat: [2, 1] }),
  };
}

let THREAT_MATS = null;

function threatMats() {
  if (THREAT_MATS) return THREAT_MATS;
  const abl = ablativeMaps(512);
  const hull = paintedMetalMaps(512, '#71736e', { rust: 0.42, streaks: 26, scratches: 30 });
  const hullMaps = {};
  for (const [k, v] of Object.entries(hull)) {
    const t = v.clone();
    t.needsUpdate = true;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 1);
    hullMaps[k] = t;
  }
  THREAT_MATS = {
    ablator: abl,
    hull: std({ ...hullMaps, color: 0xcac6ba, roughness: 0.86, metalness: 0.14, envMapIntensity: 0.4, normalScale: new THREE.Vector2(0.9, 0.9) }),
    // Metallised balloon film: bright, almost mirror-like, so a decoy reads as
    // a hard point at range and as something weightless up close.
    film: std({ color: 0xd7dde3, roughness: 0.24, metalness: 0.92, envMapIntensity: 1.5, flatShading: true }),
    frame: std({ color: 0x8f959b, roughness: 0.46, metalness: 0.8, envMapIntensity: 1.0, side: THREE.DoubleSide }),
  };
  return THREAT_MATS;
}

/** Fresh ablator material per body: its colour and glow are animated. */
function ablatorMaterial() {
  const m = threatMats().ablator;
  return std({
    map: m.map,
    normalMap: m.normalMap,
    roughnessMap: m.roughnessMap,
    emissiveMap: m.emissiveMap,
    color: 0xffffff,
    roughness: 0.94,
    metalness: 0.03,
    envMapIntensity: 0.45,
    emissive: new THREE.Color(0, 0, 0),
    emissiveIntensity: 0,
    normalScale: new THREE.Vector2(1.1, 1.1),
  });
}

/* ================================================================ kit bag = */

const push = (list, geometry, matrix) => list.push(matrix ? { geometry, matrix } : { geometry });

function finPlate(rootChord, tipChord, span, sweep, thick, bevel = 0.01) {
  const s = new THREE.Shape();
  s.moveTo(0, -rootChord / 2);
  s.lineTo(0, rootChord / 2);
  s.lineTo(span, tipChord / 2 - sweep);
  s.lineTo(span, -tipChord / 2 - sweep);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: thick,
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 1,
    curveSegments: 1,
  });
  g.translate(0, 0, -thick / 2);
  g.computeVertexNormals();
  return g;
}

function radialParts(parts, geometry, n, phase, radius, y, { pitch = 0, roll = 0 } = {}) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + phase;
    parts.push({
      geometry,
      matrix: transform({ pos: [Math.cos(a) * radius, y, Math.sin(a) * radius], rot: [pitch, -a, roll] }),
    });
  }
}

/* ============================================================== airframes = */

const RV_CACHE = {};

/**
 * Blunted-cone re-entry body: ablative nose, heavy conical hull, an aft skirt
 * with attachment hardware, four stabiliser strakes and a body flap. Built once
 * and shared by every pooled threat.
 */
function reentryGeometry() {
  if (RV_CACHE.hull) return RV_CACHE;
  const SEG = 20;
  const hull = [];

  // ---- ablative nose: spherical cap blending into the cone -------------
  RV_CACHE.nose = latheProfile(
    [
      [0.004, 1.61],
      [0.055, 1.604],
      [0.101, 1.583],
      [0.14, 1.552],
      [0.168, 1.512],
      [0.212, 1.38],
      [0.268, 1.2],
      [0.33, 1.02],
    ],
    SEG
  );

  // ---- hull: cone, shoulder, aft skirt and base plate -------------------
  push(
    hull,
    latheProfile(
      [
        [0.33, 1.02],
        [0.412, 0.76],
        [0.496, 0.5],
        [0.57, 0.26],
        [0.615, 0.08],
        [0.622, -0.02], // shoulder
        [0.622, -0.5],
        [0.634, -0.53], // retaining ring
        [0.634, -0.59],
        [0.622, -0.62],
        [0.622, -0.96],
        [0.664, -1.1], // aft skirt flare
        [0.676, -1.3],
        [0.664, -1.34], // rim
        [0.652, -1.31],
        [0.646, -1.28],
        [0.4, -1.27], // base ring, closed by a flat disc below
      ],
      SEG
    )
  );

  // A flat capping disc rather than a lathe closing on the axis: a cone that
  // converges to a point smooth-shades into a mirrored starburst under IBL. The
  // base sits almost flush with the skirt rim so the aft end reads as a solid
  // slab of hardware rather than an empty cup.
  const base = new THREE.CircleGeometry(0.4, SEG);
  base.rotateX(Math.PI / 2);
  base.translate(0, -1.27, 0);
  push(hull, base);
  // separation boss, gas-generator port and the bolt circle around them
  push(hull, cylinder(0.15, 0.175, 0.1, 12), transform({ pos: [0, -1.24, 0] }));
  push(hull, cylinder(0.06, 0.06, 0.05, 8), transform({ pos: [0, -1.31, 0] }));
  radialParts(hull, cylinder(0.028, 0.028, 0.05, 5), 8, 0.1, 0.29, -1.28);
  // spin-up motor nozzles let into the base
  radialParts(hull, cylinder(0.05, 0.032, 0.07, 7), 3, 0.7, 0.5, -1.3);

  // ---- nose retaining ring at the ablator joint -------------------------
  push(hull, new THREE.TorusGeometry(0.335, 0.016, 4, SEG), transform({ pos: [0, 1.02, 0], rot: [Math.PI / 2, 0, 0] }));

  // ---- stabiliser strakes on the aft cone -------------------------------
  radialParts(hull, finPlate(0.62, 0.3, 0.17, 0.13, 0.05, 0.012), 4, Math.PI / 4, 0.6, -0.6);

  // ---- aft skirt attachment hardware ------------------------------------
  radialParts(hull, cylinder(0.045, 0.045, 0.07, 6), 8, 0.2, 0.66, -1.18, { roll: -Math.PI / 2 });
  push(hull, new THREE.TorusGeometry(0.668, 0.022, 4, SEG), transform({ pos: [0, -1.24, 0], rot: [Math.PI / 2, 0, 0] }));
  // umbilical connector block and two lifting eyes
  push(hull, chamferBox(0.09, 0.16, 0.14, 0.014, 0), transform({ pos: [0.63, -0.78, 0] }));
  push(hull, cylinder(0.035, 0.045, 0.06, 8), transform({ pos: [0.68, -0.78, 0], rot: [0, 0, -Math.PI / 2] }));
  for (const a of [Math.PI * 0.5, Math.PI * 1.5]) {
    push(hull, new THREE.TorusGeometry(0.038, 0.013, 4, 8), transform({ pos: [Math.cos(a) * 0.63, -0.34, Math.sin(a) * 0.63], rot: [0, Math.PI / 2 - a, 0] }));
  }

  // ---- body flap and its actuator ---------------------------------------
  push(hull, chamferBox(0.3, 0.34, 0.055, 0.014, 0), transform({ pos: [0.7, -0.82, 0], rot: [0, 0, -0.5] }));
  push(hull, cylinder(0.032, 0.032, 0.36, 7), transform({ pos: [0.62, -0.66, 0], rot: [0, 0, Math.PI / 2] }));
  push(hull, cylinder(0.02, 0.02, 0.2, 6), transform({ pos: [0.68, -0.94, 0.1], rot: [0.4, 0, 0.5] }));
  push(hull, cylinder(0.02, 0.02, 0.2, 6), transform({ pos: [0.68, -0.94, -0.1], rot: [-0.4, 0, 0.5] }));

  RV_CACHE.hull = mergeParts(hull);
  for (const p of hull) p.geometry.dispose();
  return RV_CACHE;
}

function buildReentryBody() {
  const g = reentryGeometry();
  const mats = threatMats();
  const group = new THREE.Group();
  const hull = new THREE.Mesh(g.hull, mats.hull);
  hull.castShadow = false;
  group.add(hull);
  const nose = new THREE.Mesh(g.nose, ablatorMaterial());
  nose.castShadow = false;
  group.add(nose);
  group.userData.ablator = nose.material;
  return group;
}

const DECOY_CACHE = {};

/**
 * Penetration aid: a folded strut frame carrying an inflated metallised
 * envelope and a small drogue. Obviously featherweight once you are close, but
 * its silhouette and specular flash keep it ambiguous at range.
 */
function decoyGeometry() {
  if (DECOY_CACHE.frame) return DECOY_CACHE;
  // ---- creased inflatable envelope --------------------------------------
  const env = new THREE.IcosahedronGeometry(0.46, 1);
  const pos = env.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const crease = 0.9 + 0.14 * Math.sin(v.x * 11.3) * Math.sin(v.y * 9.1 + 1.4) + 0.06 * Math.sin(v.z * 15.7);
    v.multiplyScalar(crease);
    v.y *= 1.22;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  env.computeVertexNormals();
  DECOY_CACHE.film = env;

  // ---- strut frame, spine and drogue ------------------------------------
  const frame = [];
  const spine = cylinder(0.016, 0.016, 1.5, 6);
  push(frame, spine, transform({ pos: [0, -0.16, 0] }));
  // longerons splayed around the envelope
  const longeron = cylinder(0.011, 0.011, 1.02, 5);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    push(frame, longeron, transform({ pos: [Math.cos(a) * 0.3, 0.02, Math.sin(a) * 0.3], rot: [0, -a, 0.1] }));
  }
  for (const y of [0.42, -0.36]) {
    push(frame, new THREE.TorusGeometry(0.3, 0.009, 4, 14), transform({ pos: [0, y, 0], rot: [Math.PI / 2, 0, 0] }));
  }
  // fore and aft end fittings
  push(frame, cylinder(0.05, 0.03, 0.1, 7), transform({ pos: [0, 0.62, 0] }));
  push(frame, cylinder(0.05, 0.06, 0.09, 7), transform({ pos: [0, -0.62, 0] }));
  // stabiliser drogue on a short tether
  push(frame, cylinder(0.007, 0.007, 0.3, 4), transform({ pos: [0, -0.86, 0] }));
  push(
    frame,
    new THREE.CylinderGeometry(0.055, 0.19, 0.24, 10, 1, true),
    transform({ pos: [0, -1.12, 0] })
  );
  const vane = chamferBox(0.2, 0.02, 0.16, 0.008, 0);
  radialParts(frame, vane, 3, 0.4, 0.2, -1.24, { roll: 0.5 });
  DECOY_CACHE.frame = mergeParts(frame);
  for (const p of frame) p.geometry.dispose();
  return DECOY_CACHE;
}

function buildDecoyBody() {
  const g = decoyGeometry();
  const mats = threatMats();
  const group = new THREE.Group();
  group.add(new THREE.Mesh(g.frame, mats.frame));
  group.add(new THREE.Mesh(g.film, mats.film));
  return group;
}

/* =========================================================== plasma sheath */

let SHEATH_GEO = null;

/**
 * One shell of the sheath. The region id goes into uv.x (0 bow-shock cap,
 * 0.5 body envelope, 1 wake) and normalised distance aft into uv.y.
 */
function sheathShell(points, region, seg, y0, y1) {
  const g = new THREE.LatheGeometry(points.map((p) => new THREE.Vector2(p[0], p[1])), seg);
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = region;
    uv[i * 2 + 1] = THREE.MathUtils.clamp((y0 - pos.getY(i)) / (y0 - y1), 0, 1);
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

function sheathGeometry() {
  if (SHEATH_GEO) return SHEATH_GEO;
  const parts = [];
  // Detached bow shock: a thin paraboloid standing a little ahead of the 1.61
  // nose tip and wrapping back past the shoulder. Kept close to the body — a
  // fat dome reads as fog rather than as a shock front.
  const cap = [];
  // Stepping y linearly and taking the radius as its square root gives a true
  // paraboloid whose stand-off grows smoothly from 0.16 at the stagnation point
  // to 0.24 at the shoulder, instead of a dome that hugs the tip and then
  // balloons past the body.
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    cap.push([Math.max(0.004, 0.86 * Math.sqrt(t)), 1.77 - 1.85 * t]);
  }
  parts.push({ geometry: sheathShell(cap, 0, 20, 1.77, -0.08) });
  // Luminous boundary layer clinging to the cone, barely proud of the hull.
  const body = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const y = 1.32 - t * 2.72;
    const r = 0.42 + 0.44 * Math.pow(t, 0.55);
    body.push([r, y]);
  }
  parts.push({ geometry: sheathShell(body, 0.5, 18, 1.32, -1.4) });
  // Recompressing wake, pinched behind the base then spreading out.
  const wake = [];
  for (let i = 0; i <= 9; i++) {
    const t = i / 9;
    wake.push([Math.max(0.01, 0.74 * Math.pow(1 - t, 0.55) * (0.72 + 0.4 * Math.sin(t * 3.4))), -1.2 - t * 4.4]);
  }
  parts.push({ geometry: sheathShell(wake, 1, 14, -1.2, -5.6) });
  SHEATH_GEO = mergeParts(parts);
  parts.forEach((p) => p.geometry.dispose());
  return SHEATH_GEO;
}

const SHEATH_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vN;
varying vec3 vView;
void main() {
  vUv = uv;
  vN = normalize( mat3( modelMatrix ) * normal );
  vec4 wp = modelMatrix * vec4( position, 1.0 );
  vView = normalize( cameraPosition - wp.xyz );
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const SHEATH_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vView;
uniform float uIntensity;
uniform float uTime;
uniform vec3 uColorCool;
uniform vec3 uColorHot;
void main() {
  float region = vUv.x;
  float t = clamp( vUv.y, 0.0, 1.0 );
  float isCap = 1.0 - step( 0.25, region );
  float isBody = step( 0.25, region ) * ( 1.0 - step( 0.75, region ) );
  float isWake = step( 0.75, region );

  // Everything is rim-weighted so each shell reads as a thin luminous surface
  // seen edge-on rather than as a solid volume of milk.
  float rim = pow( 1.0 - abs( dot( normalize( vN ), vView ) ), 2.1 );
  float flick = 0.82 + 0.18 * sin( uTime * 41.0 + t * 8.0 ) * sin( uTime * 23.0 - t * 3.0 );
  float ripple = 0.62 + 0.38 * sin( t * 26.0 - uTime * 34.0 );

  float aCap = ( 0.06 + 0.78 * pow( 1.0 - t, 2.2 ) ) * ( 0.08 + 1.0 * rim );
  float aBody = ( 0.03 + 0.32 * rim ) * pow( 1.0 - t, 0.7 );
  float aWake = 0.22 * pow( 1.0 - t, 1.9 ) * ( 0.07 + 1.05 * rim ) * ripple;

  // Stagnation region runs blue-white; the wake cools back through orange. The
  // square keeps it ember-coloured until the body is genuinely deep in the air.
  float hot = clamp( uIntensity * 1.05 + isCap * 0.3 - t * 0.45 - isWake * 0.35, 0.0, 1.0 );
  vec3 c = mix( uColorCool, uColorHot, hot * hot );
  // White-hot core right at the stagnation point.
  c += vec3( 0.55, 0.5, 0.45 ) * isCap * pow( 1.0 - t, 5.0 ) * uIntensity;

  float a = ( aCap * isCap + aBody * isBody + aWake * isWake ) * uIntensity * flick;
  // Fade the open trailing edge of each shell so no hard ring shows.
  a *= smoothstep( 1.0, 0.78, t );
  if ( a < 0.004 ) discard;
  gl_FragColor = vec4( c, a );
}
`;

/** Hot plasma sheath: bow-shock cap, body glow and trailing wake. */
function buildPlasmaSheath() {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uIntensity: { value: 0 },
      uTime: { value: 0 },
      uColorCool: { value: new THREE.Color(1.0, 0.4, 0.1) },
      uColorHot: { value: new THREE.Color(0.74, 0.87, 1.0) },
    },
    vertexShader: SHEATH_VERT,
    fragmentShader: SHEATH_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: true,
  });
  const m = new THREE.Mesh(sheathGeometry(), mat);
  m.renderOrder = 6;
  return m;
}

export class Threat {
  constructor(scene, effects) {
    this.scene = scene;
    this.effects = effects;
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);

    this.bodyRV = buildReentryBody();
    this.bodyDecoy = buildDecoyBody();
    this.group.add(this.bodyRV);
    this.group.add(this.bodyDecoy);
    this.ablator = this.bodyRV.userData.ablator;

    this.sheath = buildPlasmaSheath();
    this.group.add(this.sheath);

    this.glow = new GlowSprite(flareSprite(256), 0xffb070, 0.0032, 1.2);
    scene.add(this.glow.mesh);
    this.glowColor = new THREE.Color();

    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.mass = 1;
    this.cdA = THREAT.cdA;
    this.alive = false;
    this.id = 0;
    this.trail = null;
    this.hotTrail = null;
  }

  spawn(cfg) {
    this.id = nextId++;
    this.label = `${cfg.kind === 'DECOY' ? 'X' : 'T'}${String(this.id).padStart(2, '0')}`;
    this.kind = cfg.kind;
    this.pos.copy(cfg.pos);
    this.vel.copy(cfg.vel);
    this.impactPoint = cfg.impactPoint.clone();
    this.spawnTime = cfg.time;
    this.alive = true;
    this.phase = PHASE.MIDCOURSE;
    this.destroyed = false;
    this.assigned = false;
    this.weavePhase = cfg.weavePhase || 0;
    this.weaveAmp = cfg.weaveAmp || 0;
    this.cdA = cfg.kind === 'DECOY' ? THREAT.decoyCdA : THREAT.cdA;
    this.rcs = cfg.kind === 'DECOY' ? THREAT.rcs.DECOY : THREAT.rcs.RV;
    this.scaleBoost = 1;
    this.age = 0;
    this.lastCmd = null;
    this.charred = 0;

    const isDecoy = cfg.kind === 'DECOY';
    this.bodyRV.visible = !isDecoy;
    this.bodyDecoy.visible = isDecoy;
    this.sheath.visible = !isDecoy;
    this.group.visible = true;
    this.glow.mesh.visible = true;
    this.glow.setColor(isDecoy ? 0x9fd8ff : 0xffb070);
    this.glow.angular = isDecoy ? 0.0018 : 0.0032;
    this.glow.opacity = 0.9;
    // Fresh heat shield: pale binder, no char, no glow.
    this.ablator.color.setRGB(1, 1, 1);
    this.ablator.emissive.setRGB(0, 0, 0);
    this.ablator.emissiveIntensity = 0;

    const persist = trailPersistence(this.pos.y);
    this.trail = this.effects.acquireTrail({
      grow: 0.85,
      fade: 0.028 + (1 - persist) * 0.05,
      minStep: 26,
    });
    this.hotTrail = this.effects.acquireHotTrail({ grow: 0.4, fade: 1.5, minStep: 12, emissive: 1 });
    bus.emit('threat:spawn', this);
    return this;
  }

  release() {
    this.alive = false;
    this.group.visible = false;
    this.glow.mesh.visible = false;
    if (this.trail) {
      this.trail.detach();
      this.trail = null;
    }
    if (this.hotTrail) {
      this.hotTrail.detach();
      this.hotTrail = null;
    }
  }

  get altitude() {
    return this.pos.y;
  }

  get speed() {
    return this.vel.length();
  }

  update(dt, camera, time) {
    if (!this.alive) return;
    this.age += dt;

    // Terminal-phase weave: a slow, readable S-turn, never twitchy.
    let extra = null;
    if (this.phase === PHASE.TERMINAL && this.weaveAmp > 0) {
      const w = Math.sin(time * THREAT.weaveRate * Math.PI * 2 + this.weavePhase) * this.weaveAmp;
      const side = new THREE.Vector3(-this.vel.z, 0, this.vel.x).normalize();
      extra = side.multiplyScalar(w * 34);
    }
    integrateBody(this, dt, extra);

    // ---- phase transitions ------------------------------------------
    const prev = this.phase;
    if (this.pos.y < THREAT.terminalAlt) this.phase = PHASE.TERMINAL;
    else if (this.pos.y < THREAT.reentryAlt) this.phase = PHASE.REENTRY;
    else this.phase = PHASE.MIDCOURSE;
    if (prev !== this.phase) bus.emit('threat:phase', this);

    // ---- presentation -----------------------------------------------
    this.group.position.copy(this.pos);
    alignToVelocity(this.group, this.vel, dt, 6);
    const dist = this.pos.distanceTo(camera.position);
    // Readability boost: distant bodies are drawn larger than life.
    this.scaleBoost = THREE.MathUtils.clamp(dist / 900, 1, 9);
    this.group.scale.setScalar(this.scaleBoost * (this.kind === 'DECOY' ? 0.8 : 1));

    this.glow.mesh.position.copy(this.pos);
    const mach = machNumber(this.speed, this.pos.y);
    // Aerodynamic heating needs both speed and air to bite: a fast body in near
    // vacuum barely glows, and the same body low down runs incandescent. The
    // density term is what turns the descent into a visible event.
    const q = THREE.MathUtils.clamp((mach - 1.8) / 2.0, 0, 1);
    const dens = 1 - THREE.MathUtils.smoothstep(this.pos.y, 5000, 28000);
    const heat = THREE.MathUtils.clamp(q * dens * 1.25, 0, 1);
    // Heating drives the glow from ember orange toward shock white.
    if (this.kind === 'DECOY') this.glowColor.setHex(0x9fd8ff);
    else this.glowColor.setHex(0xffb070).lerp(new THREE.Color(0xfff4e2), heat * 0.8);
    this.glow.setColor(this.glowColor);
    // Constant angular size keeps a body at 30 km readable; inside ~90 m the
    // sprite is eased off so it stops sitting on top of the airframe it is
    // meant to advertise.
    const near = THREE.MathUtils.clamp(dist / 90, 0.4, 1);
    this.glow.update(camera, (1 + heat * 0.9) * near);
    this.glow.opacity = (this.kind === 'DECOY' ? 0.55 : 0.55 + heat * 0.75) * (0.55 + 0.45 * near);

    if (this.sheath.visible) {
      this.sheath.material.uniforms.uIntensity.value = heat;
      this.sheath.material.uniforms.uTime.value = time;
      this.sheath.scale.setScalar(1 + heat * 0.16);
      // The heat shield chars permanently: the nose darkens, then glows.
      this.charred = Math.max(this.charred, heat);
      const ch = this.charred;
      this.ablator.color.setRGB(1 - ch * 0.6, 1 - ch * 0.7, 1 - ch * 0.78);
      // Deep orange for most of the descent; only the last of the heating pulls
      // the stagnation point up to white.
      const white = Math.max(0, heat - 0.72) / 0.28;
      this.ablator.emissive.setRGB(1.0, 0.2 + white * 0.64, 0.03 + white * 0.62);
      // The emissive map carries the tip-to-shoulder falloff, so the overall
      // intensity stays low enough for the pitting to keep reading through it.
      this.ablator.emissiveIntensity = Math.pow(heat, 1.6) * 3.0;
    }

    // ---- trails ------------------------------------------------------
    const persist = trailPersistence(this.pos.y);
    const tangent = this.vel.clone().normalize();
    // Widened with range for readability, narrowed again inside ~110 m so a
    // close pass shows the body rather than the smoke it is sitting in.
    const widthScale = Math.max(1, dist * 0.00075) * THREE.MathUtils.clamp(dist / 110, 0.3, 1);
    // Wake and ablation shed from the base of the body, not its centroid. The
    // offset is sub-pixel at 30 km but it is the difference between seeing the
    // heat shield and seeing the smoke in front of it on a close pass.
    const aft = this.pos.clone().addScaledVector(tangent, -(this.kind === 'DECOY' ? 1.0 : 1.34) * this.scaleBoost);
    if (this.trail) {
      const col = this.kind === 'DECOY' ? new THREE.Color(0.62, 0.68, 0.74) : new THREE.Color(0.72, 0.7, 0.68);
      this.trail.push(aft, tangent, this.effects.time, 1.6 * widthScale * (0.6 + persist), 0.5 * (0.25 + persist * 0.9) * (0.5 + 0.5 * near), col);
    }
    if (this.hotTrail && heat > 0.05) {
      this.hotTrail.push(
        aft,
        tangent,
        this.effects.time,
        1.1 * widthScale * (0.6 + heat),
        heat * 0.85 * (0.5 + 0.5 * near),
        new THREE.Color(1.0, 0.55 + heat * 0.3, 0.25)
      );
    }
    if (heat > 0.25 && this.kind !== 'DECOY') this.effects.ablation(aft, this.vel, heat);
  }
}

export class ThreatManager {
  constructor(scene, effects, poolSize = 12) {
    this.scene = scene;
    this.effects = effects;
    this.pool = [];
    for (let i = 0; i < poolSize; i++) this.pool.push(new Threat(scene, effects));
    this.active = [];
    this.waves = [];
    this.time = 0;
    this.scenario = null;
    this.rng = null;
    this.spawnPlan = [];
  }

  startScenario(scenarioId, rng, time = 0) {
    const scn = SCENARIO_BY_ID[scenarioId];
    this.scenario = scn;
    this.rng = rng;
    this.time = time;
    this.spawnPlan.length = 0;
    for (const t of this.active) t.release();
    this.active.length = 0;

    // Build the spawn plan up front: deterministic per seed, varied per run.
    let idx = 0;
    for (const wave of scn.waves) {
      const total = wave.count + (wave.decoys || 0);
      for (let i = 0; i < total; i++) {
        const isDecoy = i >= wave.count;
        const at = wave.at + rng.range(-0.6, 1.6) + i * rng.range(0.9, 2.4);
        const azBase = rng.range(scn.spread[0], scn.spread[1]);
        this.spawnPlan.push({
          at: Math.max(0.5, at),
          kind: isDecoy ? 'DECOY' : 'RV',
          azimuth: azBase,
          alt: rng.range(scn.baseAlt[0], scn.baseAlt[1]),
          range: rng.range(scn.baseRange[0], scn.baseRange[1]),
          speed: rng.range(scn.speed[0], scn.speed[1]),
          aim: new THREE.Vector2(rng.gauss(0, 55), rng.gauss(0, 55)),
          weavePhase: rng.range(0, Math.PI * 2),
          weaveAmp: isDecoy ? 0 : rng.range(0.25, 1) * THREAT.weaveAmplitude,
          index: idx++,
        });
      }
    }
    this.spawnPlan.sort((a, b) => a.at - b.at);
    this.spawned = 0;
    state.stats.spawned = 0;
    return this.spawnPlan.length;
  }

  /** Threats approach from roughly -Z, fanned by the scenario spread. */
  spawnFromPlan(plan) {
    const t = this.pool.find((p) => !p.alive);
    if (!t) return null;
    const bearing = -Math.PI / 2 + plan.azimuth;
    const from = new THREE.Vector3(
      Math.cos(bearing) * plan.range,
      plan.alt,
      Math.sin(bearing) * plan.range
    );
    const to = new THREE.Vector3(plan.aim.x, WORLD.padY, plan.aim.y);
    const vel = ballisticLaunchVelocity(from, to, plan.speed, false);
    t.spawn({
      kind: plan.kind,
      pos: from,
      vel,
      impactPoint: to,
      time: this.time,
      weavePhase: plan.weavePhase,
      weaveAmp: plan.weaveAmp,
    });
    this.active.push(t);
    state.stats.spawned++;
    return t;
  }

  destroyThreat(threat, reason, camera) {
    if (!threat.alive) return;
    threat.destroyed = true;
    const size = threat.kind === 'DECOY' ? 12 : 26;
    this.effects.intercept(threat.pos.clone(), size, camera, {
      hot: new THREE.Color(1.0, 0.97, 0.86),
      mid: new THREE.Color(1.0, 0.5, 0.14),
      cool: new THREE.Color(0.1, 0.09, 0.09),
    });
    bus.emit('threat:destroyed', { threat, reason });
    threat.release();
    const i = this.active.indexOf(threat);
    if (i >= 0) this.active.splice(i, 1);
  }

  update(dt, camera) {
    this.time += dt;
    while (this.spawned < this.spawnPlan.length && this.spawnPlan[this.spawned].at <= this.time) {
      this.spawnFromPlan(this.spawnPlan[this.spawned]);
      this.spawned++;
    }
    for (let i = this.active.length - 1; i >= 0; i--) {
      const t = this.active[i];
      t.update(dt, camera, this.time);
      const ground = this.effects.groundAt(t.pos.x, t.pos.z);
      if (t.pos.y <= ground + 1) {
        if (t.kind === 'DECOY') {
          this.effects.groundImpact(t.pos.clone(), 10, camera);
          bus.emit('threat:decoyDown', t);
        } else {
          this.effects.groundImpact(t.pos.clone(), THREAT.impactCrater, camera);
          bus.emit('threat:impact', t);
        }
        t.release();
        this.active.splice(i, 1);
      }
    }
    state.stats.active = this.active.filter((t) => t.kind !== 'DECOY').length;
  }

  remaining() {
    return this.spawnPlan.length - this.spawned;
  }

  clear() {
    for (const t of this.active) t.release();
    this.active.length = 0;
    this.spawnPlan.length = 0;
    this.spawned = 0;
  }
}
