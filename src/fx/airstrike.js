import * as THREE from 'three';
import { makeRNG } from '../core/utils.js';

const rng = makeRNG(70707);

// ===========================================================================
// Air strike killstreak: three-jet formation flies over the target point and
// carpet-bombs a line along the flight path. Flow: call -> 2.2s -> jets spawn
// ~490m out at 170 m/s -> red marker smoke on target -> sticks of bombs
// release on the run-in -> detonations ripple down the line ~t=5.4-6.2.
// Jets are procedural strike fighters with a painted canvas airframe:
// air-superiority grey camo, panel lines + rivets, star roundels, anti-glare
// nose panel, squadron tail codes; glass canopy, hot flickering afterburners
// with nozzle glow sprites, wingtip/tail speed streaks and dissipating
// wind-sheared contrails.
// ===========================================================================

const JET_SPEED = 170;     // m/s — crosses the visible frame in ~2.5-3s
const JET_ALT = 63;        // raised ~17% so the pass reads fast + far
const START_DIST = 490;    // leader crosses overhead ~t=4.8s, photo t=5.15
const BOMB_G = 42;
const JET_SCALE = 1.58;

// ---------------------------------------------------------------------------
// Airframe paint — one 512px canvas atlas (albedo) + one matching canvas for
// roughness/bump. Both passes replay the SAME seeded RNG sequence so panel
// lines, rivets and grime land on identical texels in every map.
// Atlas regions (canvas px):
// ---------------------------------------------------------------------------
const ATLAS = 512;
const R_FUSE = { x: 2, y: 2, w: 168, h: 340 };    // u = wrap (0 belly, .5 spine), v = length (top = nose)
const R_NOSE = { x: 2, y: 350, w: 168, h: 76 };   // nose cone wrap, top = tip
const R_WING = { x: 180, y: 2, w: 220, h: 220 };  // u = span (root->tip), v = chord (top = leading edge)
const R_STAB = { x: 180, y: 232, w: 120, h: 100 };
const R_FIN = { x: 312, y: 232, w: 120, h: 100 }; // u = length (aft->fwd), v = height
const R_MISC = { x: 180, y: 342, w: 120, h: 120 };

function paintAirframe(ctx, rough) {
  const r = makeRNG(9091);
  // Panel-line grime is slightly ROUGHER (brighter in the roughness map) and
  // darker in albedo; painted markings are glossier than the matte airframe.
  const ink = (a) => rough ? `rgba(182,182,182,${a})` : `rgba(56,62,70,${a})`;
  const rivetInk = (a) => rough ? `rgba(172,172,172,${a})` : `rgba(72,77,84,${a})`;

  // Cool blue-grey base: the dusk sun + dusty horizon env push everything
  // warm from below, so the paint itself leans cold to still read as grey.
  ctx.fillStyle = rough ? 'rgb(124,124,124)' : '#9da8b6';
  ctx.fillRect(0, 0, ATLAS, ATLAS);

  const mottle = (R, n, s0, s1) => {
    for (let i = 0; i < n; i++) {
      const cx = R.x + 8 + r() * (R.w - 16);
      const cy = R.y + 8 + r() * (R.h - 16);
      const rad = s0 + r() * (s1 - s0);
      const dark = r() < 0.5;
      const col = rough
        ? (dark ? '146,146,146' : '108,108,108')
        : (dark ? '132,142,156' : '176,184,194');
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, `rgba(${col},0.45)`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }
  };
  const line = (x0, y0, x1, y1, w, a) => {
    ctx.strokeStyle = ink(a);
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  };
  const rivets = (x0, y0, x1, y1, step, a) => {
    const dx = x1 - x0, dy = y1 - y0;
    const n = Math.max(1, Math.floor(Math.hypot(dx, dy) / step));
    ctx.fillStyle = rivetInk(a);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      ctx.fillRect(x0 + dx * t + (r() - 0.5), y0 + dy * t + (r() - 0.5), 1.3, 1.3);
    }
  };
  const star = (cx, cy, R) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
      const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      const b = a + Math.PI / 5;
      ctx.lineTo(cx + Math.cos(b) * R * 0.42, cy + Math.sin(b) * R * 0.42);
    }
    ctx.closePath(); ctx.fill();
  };
  // National-star roundel: white side bars, dark blue disc, white star.
  const roundel = (cx, cy, rad) => {
    ctx.fillStyle = rough ? 'rgb(96,96,96)' : '#e8ecef';
    ctx.fillRect(cx - rad * 1.95, cy - rad * 0.36, rad * 3.9, rad * 0.72);
    ctx.fillStyle = rough ? 'rgb(90,90,90)' : '#20396b';
    ctx.fillRect(cx - rad * 1.95, cy + rad * 0.1, rad * 3.9, rad * 0.14);
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rough ? 'rgb(96,96,96)' : '#e8ecef';
    star(cx, cy, rad * 0.8);
  };

  // ---- FUSELAGE (wrap) ----
  {
    const R = R_FUSE;
    // Cross-wrap shading baked in: belly (u=0/1) lighter, spine (u=.5) darker
    // so the airframe keeps form even in flat sky bounce from below.
    const g = ctx.createLinearGradient(R.x, 0, R.x + R.w, 0);
    if (rough) {
      g.addColorStop(0, 'rgba(118,118,118,0.35)');
      g.addColorStop(0.5, 'rgba(134,134,134,0.35)');
      g.addColorStop(1, 'rgba(118,118,118,0.35)');
    } else {
      g.addColorStop(0.0, 'rgba(188,194,202,0.7)');
      g.addColorStop(0.26, 'rgba(152,160,172,0.0)');
      g.addColorStop(0.5, 'rgba(118,127,140,0.55)');
      g.addColorStop(0.74, 'rgba(152,160,172,0.0)');
      g.addColorStop(1.0, 'rgba(188,194,202,0.7)');
    }
    ctx.fillStyle = g;
    ctx.fillRect(R.x, R.y, R.w, R.h);
    mottle(R, 26, 10, 30);

    // Ring frames (panel lines around the wrap) + rivet rows
    for (const s of [0.09, 0.2, 0.31, 0.415, 0.52, 0.615, 0.72, 0.815, 0.9]) {
      const y = R.y + s * R.h + (r() - 0.5) * 3;
      line(R.x, y, R.x + R.w, y, 1.7, 0.55);
      if (r() < 0.65) rivets(R.x, y + 2.6, R.x + R.w, y + 2.6, 5, 0.32);
    }
    // Longerons running the length
    for (const u of [0.16, 0.34, 0.66, 0.84]) {
      const x = R.x + u * R.w;
      line(x, R.y + 0.05 * R.h, x, R.y + 0.95 * R.h, 1.4, 0.32);
    }
    // Access hatches
    for (let i = 0; i < 9; i++) {
      const x = R.x + (0.08 + r() * 0.78) * R.w;
      const y = R.y + (0.12 + r() * 0.74) * R.h;
      ctx.strokeStyle = ink(0.42); ctx.lineWidth = 1;
      ctx.strokeRect(x, y, 6 + r() * 10, 4 + r() * 6);
    }
    // Exhaust/grime streaks flowing aft (canvas +y = tailward)
    for (let i = 0; i < 12; i++) {
      const x = R.x + r() * R.w;
      const y0 = R.y + (0.28 + 0.55 * r()) * R.h;
      const len = 20 + r() * 60;
      const g2 = ctx.createLinearGradient(0, y0, 0, y0 + len);
      g2.addColorStop(0, rough ? 'rgba(168,168,168,0.3)' : 'rgba(70,74,80,0.16)');
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(x, y0, 1.7, len);
    }
    // Anti-glare panel ahead of the canopy (top of fwd fuselage)
    ctx.fillStyle = rough ? 'rgb(212,212,212)' : '#23272d';
    ctx.fillRect(R.x + 0.4 * R.w, R.y, 0.2 * R.w, 0.105 * R.h);
    // Squadron tail band near the aft end
    ctx.fillStyle = rough ? 'rgb(104,104,104)' : '#31445e';
    ctx.fillRect(R.x, R.y + 0.925 * R.h, R.w, 0.035 * R.h);
    // Fuselage-side roundels (u=.25 right / .75 left)
    roundel(R.x + 0.25 * R.w, R.y + 0.62 * R.h, 12);
    roundel(R.x + 0.75 * R.w, R.y + 0.62 * R.h, 12);
  }

  // ---- NOSE CONE (wrap, top = tip) ----
  {
    const R = R_NOSE;
    mottle(R, 8, 6, 16);
    for (const s of [0.34, 0.66]) line(R.x, R.y + s * R.h, R.x + R.w, R.y + s * R.h, 1, 0.4);
    ctx.fillStyle = rough ? 'rgb(212,212,212)' : '#23272d';
    ctx.fillRect(R.x + 0.4 * R.w, R.y, 0.2 * R.w, R.h); // anti-glare continues to tip
  }

  // ---- WING (u root->tip, top = leading edge) ----
  {
    const R = R_WING;
    mottle(R, 24, 12, 34);
    for (const v of [0.3, 0.52]) { // spars
      const y = R.y + (1 - v) * R.h;
      line(R.x, y, R.x + R.w, y, 1.8, 0.5);
      rivets(R.x, y + 2.8, R.x + R.w, y + 2.8, 6, 0.3);
    }
    for (let i = 1; i <= 6; i++) { // ribs
      const x = R.x + (i / 7) * R.w;
      line(x, R.y + 0.04 * R.h, x, R.y + 0.96 * R.h, 1.4, 0.34);
      if (i % 2) rivets(x + 2.6, R.y + 0.08 * R.h, x + 2.6, R.y + 0.9 * R.h, 6, 0.24);
    }
    // Flap/aileron cutlines at the trailing edge
    const yTE = R.y + R.h;
    line(R.x, yTE - 0.15 * R.h, R.x + R.w, yTE - 0.15 * R.h, 2, 0.6);
    line(R.x + 0.52 * R.w, yTE - 0.15 * R.h, R.x + 0.52 * R.w, yTE, 1.6, 0.55);
    // Leading-edge strip
    ctx.fillStyle = rough ? 'rgb(92,92,92)' : '#b0b6bc';
    ctx.fillRect(R.x, R.y, R.w, 0.05 * R.h);
    roundel(R.x + 0.5 * R.w, R.y + 0.44 * R.h, 24);
  }

  // ---- STABILIZER ----
  {
    const R = R_STAB;
    mottle(R, 7, 8, 20);
    line(R.x, R.y + 0.42 * R.h, R.x + R.w, R.y + 0.42 * R.h, 1, 0.4);
    line(R.x + 0.5 * R.w, R.y + 0.05 * R.h, R.x + 0.5 * R.w, R.y + 0.95 * R.h, 1, 0.32);
    ctx.fillStyle = rough ? 'rgb(92,92,92)' : '#b0b6bc';
    ctx.fillRect(R.x, R.y, R.w, 0.08 * R.h);
  }

  // ---- FIN (tail codes) ----
  {
    const R = R_FIN;
    mottle(R, 7, 8, 20);
    line(R.x + 0.36 * R.w, R.y, R.x + 0.36 * R.w, R.y + R.h, 1.3, 0.5); // rudder hinge
    rivets(R.x + 0.36 * R.w + 3, R.y + 4, R.x + 0.36 * R.w + 3, R.y + R.h - 4, 6, 0.3);
    ctx.fillStyle = rough ? 'rgb(104,104,104)' : '#31445e'; // fin tip band
    ctx.fillRect(R.x, R.y, R.w, 0.13 * R.h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = rough ? 'rgb(142,142,142)' : '#39414c';
    ctx.font = 'bold 34px Arial, sans-serif';
    ctx.fillText('AJ', R.x + 0.5 * R.w, R.y + 0.46 * R.h);
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText('523', R.x + 0.5 * R.w, R.y + 0.74 * R.h);
  }

  // ---- MISC (spine, intakes) ----
  {
    const R = R_MISC;
    mottle(R, 12, 10, 26);
    for (const s of [0.3, 0.62]) line(R.x, R.y + s * R.h, R.x + R.w, R.y + s * R.h, 1, 0.35);
    line(R.x + 0.5 * R.w, R.y + 0.05 * R.h, R.x + 0.5 * R.w, R.y + 0.95 * R.h, 1, 0.3);
    for (let i = 0; i < 4; i++) {
      const x = R.x + (0.15 + r() * 0.7) * R.w;
      const y = R.y + (0.15 + r() * 0.7) * R.h;
      ctx.strokeStyle = ink(0.4); ctx.lineWidth = 1;
      ctx.strokeRect(x, y, 5 + r() * 8, 3 + r() * 5);
    }
  }
}

let _airframeMaps = null;
function getAirframeMaps() {
  if (_airframeMaps) return _airframeMaps;
  const make = (rough) => {
    const c = document.createElement('canvas');
    c.width = c.height = ATLAS;
    paintAirframe(c.getContext('2d'), rough);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 8;
    if (!rough) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  _airframeMaps = { albedo: make(false), rough: make(true) };
  return _airframeMaps;
}

// ---------------------------------------------------------------------------
// UV helpers — every part gets approximate but meaningful UVs into the atlas.
// ---------------------------------------------------------------------------
function uvRect(R) {
  return {
    u0: (R.x + 1) / ATLAS, u1: (R.x + R.w - 1) / ATLAS,
    vB: 1 - (R.y + R.h - 1) / ATLAS, vT: 1 - (R.y + 1) / ATLAS,
  };
}

// Remap the geometry's native UVs (bbox-normalized) into an atlas rect.
function remapUV(geo, R) {
  const q = uvRect(R);
  const uv = geo.attributes.uv;
  let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
  for (let i = 0; i < uv.count; i++) {
    u0 = Math.min(u0, uv.getX(i)); u1 = Math.max(u1, uv.getX(i));
    v0 = Math.min(v0, uv.getY(i)); v1 = Math.max(v1, uv.getY(i));
  }
  const su = (u1 - u0) || 1, sv = (v1 - v0) || 1;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(
      i,
      q.u0 + ((uv.getX(i) - u0) / su) * (q.u1 - q.u0),
      q.vB + ((uv.getY(i) - v0) / sv) * (q.vT - q.vB)
    );
  }
  uv.needsUpdate = true;
  return geo;
}

// Planar box-map: project two local position axes into an atlas rect
// (extruded shapes get shape-space UVs this way — beats their native UVs).
function planarUV(geo, ax, ay, R) {
  const q = uvRect(R);
  const pos = geo.attributes.position;
  const read = (i, axis) => axis === 0 ? pos.getX(i) : axis === 1 ? pos.getY(i) : pos.getZ(i);
  let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const a = read(i, ax), b = read(i, ay);
    a0 = Math.min(a0, a); a1 = Math.max(a1, a);
    b0 = Math.min(b0, b); b1 = Math.max(b1, b);
  }
  const sa = (a1 - a0) || 1, sb = (b1 - b0) || 1;
  const arr = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    arr[i * 2] = q.u0 + ((read(i, ax) - a0) / sa) * (q.u1 - q.u0);
    arr[i * 2 + 1] = q.vB + ((read(i, ay) - b0) / sb) * (q.vT - q.vB);
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(arr, 2));
  return geo;
}

// ---------------------------------------------------------------------------
// Local FX textures: nozzle glow sprite + speed-streak gradient.
// ---------------------------------------------------------------------------
let _fxTex = null;
function getFxTextures() {
  if (_fxTex) return _fxTex;
  const glowC = document.createElement('canvas');
  glowC.width = glowC.height = 64;
  {
    const ctx = glowC.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  // Streak: bright at u=0 (attachment), fading down the tail.
  const stC = document.createElement('canvas');
  stC.width = 128; stC.height = 16;
  {
    const ctx = stC.getContext('2d');
    const img = ctx.createImageData(128, 16);
    for (let y = 0; y < 16; y++) {
      const fy = 1 - Math.abs(((y + 0.5) / 16) * 2 - 1);
      for (let x = 0; x < 128; x++) {
        const t = x / 127;
        const a = Math.pow(1 - t, 1.8) * Math.min(1, t * 14 + 0.55) * Math.pow(fy, 1.6);
        const i = (y * 128 + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
        img.data[i + 3] = Math.round(a * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  _fxTex = { glow: new THREE.CanvasTexture(glowC), streak: new THREE.CanvasTexture(stC) };
  return _fxTex;
}

// Crossed pair of additive quads stretched along -z: fake motion-blur streak
// riding behind wingtips/tail, aligned to velocity because the jet flies
// nose-first along +z.
function makeStreak(len, width, color, opacity) {
  const tex = getFxTextures().streak;
  const geo = new THREE.PlaneGeometry(len, width);
  geo.rotateY(Math.PI / 2);       // length now along z (u=0 at +z end)
  geo.translate(0, 0, -len / 2);  // head at z=0, tail at z=-len
  const mat = new THREE.MeshBasicMaterial({
    map: tex, color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, mat));
  group.add(new THREE.Mesh(geo.clone().rotateZ(Math.PI / 2), mat));
  return { group, mat, base: opacity };
}

function jetMaterials() {
  // Painted airframe, NOT bare metal: dielectric-ish materials pick up the
  // sun, the warm hemisphere bounce on the undersides and the sky env.
  // Albedo/roughness/bump all come from the canvas atlas — panel lines,
  // rivets and markings survive even in flat sky bounce from below.
  const maps = getAirframeMaps();
  const skin = {
    map: maps.albedo,
    roughnessMap: maps.rough,
    bumpMap: maps.rough,
    bumpScale: 0.012,
    color: 0xffffff,
    roughness: 1.0,       // driven by the map (~0.5 base)
    metalness: 0.26,      // dielectric paint: cool diffuse beats warm spec
    envMapIntensity: 2.3,
  };
  return {
    hull: new THREE.MeshStandardMaterial(skin),
    wing: new THREE.MeshStandardMaterial({ ...skin, side: THREE.DoubleSide }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2c3036, roughness: 0.55, metalness: 0.45 }),
    // Tinted glass: near-black blue, mirror-smooth, strong env so it glints.
    canopy: new THREE.MeshStandardMaterial({ color: 0x0c1a28, roughness: 0.06, metalness: 0.85, envMapIntensity: 3.2 }),
    pale: new THREE.MeshStandardMaterial({ color: 0xb3b9bf, roughness: 0.48, metalness: 0.3 }),
  };
}

// Nose points along LOCAL +z so mesh.lookAt(pos + dir) flies nose-first.
function buildJet() {
  const g = new THREE.Group();
  const M = jetMaterials();
  const fxTex = getFxTextures();

  // Fuselage: tapered tube, nose-ward radius smaller. 24 radial segments so
  // the curve reads smooth (12 faceted visibly at hero size).
  const fusGeo = remapUV(new THREE.CylinderGeometry(0.34, 0.5, 7.6, 24), R_FUSE);
  const fus = new THREE.Mesh(fusGeo, M.hull);
  fus.rotation.x = Math.PI / 2;
  fus.position.z = 0.6;
  g.add(fus);
  // Nose cone + dark radome tip
  const nose = new THREE.Mesh(remapUV(new THREE.ConeGeometry(0.34, 2.2, 24), R_NOSE), M.hull);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 5.5;
  g.add(nose);
  const radome = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.62, 12), M.dark);
  radome.rotation.x = Math.PI / 2;
  radome.position.z = 6.3;
  g.add(radome);
  // Canopy + dorsal spine
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), M.canopy);
  canopy.scale.set(0.6, 0.52, 1.9);
  canopy.position.set(0, 0.5, 2.8);
  g.add(canopy);
  const spine = new THREE.Mesh(remapUV(new THREE.SphereGeometry(0.5, 14, 10), R_MISC), M.hull);
  spine.scale.set(0.74, 0.42, 3.3);
  spine.position.set(0, 0.3, 0.1);
  g.add(spine);

  // Swept main wings (planform: x = span, y = forward; rotX(+90) -> y=>+z)
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0.45, 1.5);
  wingShape.lineTo(4.7, -1.3);
  wingShape.lineTo(4.7, -2.2);
  wingShape.lineTo(0.45, -2.7);
  wingShape.closePath();
  const wingGeo = planarUV(
    new THREE.ExtrudeGeometry(wingShape, { depth: 0.09, bevelEnabled: false }),
    0, 1, R_WING
  );
  const wingR = new THREE.Mesh(wingGeo, M.wing);
  wingR.rotation.x = Math.PI / 2;
  wingR.position.set(0, 0.03, 0.4);
  g.add(wingR);
  const wingL = new THREE.Mesh(wingGeo, M.wing);
  wingL.rotation.x = Math.PI / 2;
  wingL.scale.x = -1;
  wingL.position.set(0, 0.03, 0.4);
  g.add(wingL);

  // Wingtip missile rails
  for (const sx of [1, -1]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.7, 6), M.pale);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(sx * 4.6, -0.02, -1.2);
    g.add(rail);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.32, 6), M.pale);
    tip.rotation.x = Math.PI / 2;
    tip.position.set(sx * 4.6, -0.02, -0.2);
    g.add(tip);
  }

  // Horizontal stabilizers (swept)
  const stabShape = new THREE.Shape();
  stabShape.moveTo(0.3, 0.4);
  stabShape.lineTo(2.05, -0.75);
  stabShape.lineTo(2.05, -1.35);
  stabShape.lineTo(0.3, -1.5);
  stabShape.closePath();
  const stabGeo = planarUV(
    new THREE.ExtrudeGeometry(stabShape, { depth: 0.07, bevelEnabled: false }),
    0, 1, R_STAB
  );
  for (const sx of [1, -1]) {
    const st = new THREE.Mesh(stabGeo, M.wing);
    st.rotation.x = Math.PI / 2;
    st.scale.x = sx;
    st.position.set(0, 0.06, -2.5);
    g.add(st);
  }

  // Twin canted vertical tails (profile: x = forward, y = up; rotY(-90))
  const finShape = new THREE.Shape();
  finShape.moveTo(1.0, 0);
  finShape.lineTo(-0.7, 0);
  finShape.lineTo(-1.55, 1.5);
  finShape.lineTo(-0.62, 1.5);
  finShape.closePath();
  const finGeo = planarUV(
    new THREE.ExtrudeGeometry(finShape, { depth: 0.06, bevelEnabled: false }),
    0, 1, R_FIN
  );
  for (const sx of [1, -1]) {
    const wrap = new THREE.Group();
    wrap.position.set(sx * 0.58, 0.26, -2.6);
    wrap.rotation.z = -sx * 0.28;
    const fin = new THREE.Mesh(finGeo, M.wing);
    fin.rotation.y = -Math.PI / 2;
    wrap.add(fin);
    g.add(wrap);
  }

  // Intakes flanking the fuselage
  for (const sx of [1, -1]) {
    const box = new THREE.Mesh(remapUV(new THREE.BoxGeometry(0.55, 0.6, 2.6), R_MISC), M.hull);
    box.position.set(sx * 0.72, -0.14, 1.3);
    g.add(box);
    const inlet = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.54, 0.12), M.dark);
    inlet.position.set(sx * 0.72, -0.14, 2.62);
    g.add(inlet);
  }

  // Twin engine nozzles + afterburner double cones + hot cores.
  // Each nozzle also gets an emissive ring inside the lip and an additive
  // glow sprite so the rear reads HOT from any angle, even at distance.
  const burners = [];
  const glow = [];
  const rings = [];
  for (const sx of [1, -1]) {
    const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.9, 14), M.dark);
    noz.rotation.x = Math.PI / 2;
    noz.position.set(sx * 0.36, 0, -3.55);
    g.add(noz);
    // emissive ring just inside the nozzle lip
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.055, 6, 18),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 2.1, 1.0), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    ring.position.set(sx * 0.36, 0, -3.94);
    g.add(ring);
    rings.push(ring);
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 6),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 3.2, 3.9), transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    core.position.set(sx * 0.36, 0, -3.95);
    g.add(core);
    // tight blinding core — SHORT: the hot read comes from the sprite +
    // ring; a long cone reads as a giant white triangle from below
    const inner = new THREE.Mesh(
      new THREE.ConeGeometry(0.17, 1.7, 8),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(3.6, 3.9, 4.6), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    inner.rotation.x = -Math.PI / 2;
    inner.position.set(sx * 0.36, 0, -4.8);
    g.add(inner);
    // soft plume / heat haze behind the nozzles (blue-white, not purple)
    const outer = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 3.8, 8),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.5, 2.2), transparent: true, opacity: 0.17, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    outer.rotation.x = -Math.PI / 2;
    outer.position.set(sx * 0.36, 0, -6.0);
    g.add(outer);
    burners.push({ mesh: inner, phase: sx * 1.7 }, { mesh: outer, phase: sx * 0.6 + 2.4 });
    // per-nozzle glow sprite
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: fxTex.glow, color: new THREE.Color(1.6, 1.9, 2.9),
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8,
    }));
    spr.position.set(sx * 0.36, 0, -4.25);
    spr.scale.setScalar(1.15);
    g.add(spr);
    glow.push({ mat: spr.material, base: 0.8, phase: sx * 2.3 });
  }
  // one wide faint halo pooling both engines
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: fxTex.glow, color: new THREE.Color(1.1, 1.3, 2.0),
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.3,
  }));
  halo.position.set(0, 0, -4.7);
  halo.scale.setScalar(2.5);
  g.add(halo);
  glow.push({ mat: halo.material, base: 0.3, phase: 4.1 });

  // Engine glow spills onto the aft fuselage so the jet isn't a flat dark
  // mass ignoring its own light source. Backed up by a small-radius pooled
  // PointLight per jet (see AirstrikeSystem) that lights the tail for real.
  const aftGlow = new THREE.MeshStandardMaterial({
    color: 0x343a42,
    emissive: new THREE.Color(0.45, 0.58, 0.9),
    emissiveIntensity: 1.45,
    roughness: 0.5, metalness: 0.4,
  });
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.42, 1.5, 16), aftGlow);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0, -3.0);
  g.add(collar);

  // Fake motion blur: short additive speed streaks trailing the wingtips and
  // tail, stretched along the velocity axis (local -z). ~3-3.8m at jet scale.
  const streaks = [];
  for (const sx of [1, -1]) {
    const s = makeStreak(1.9, 0.11, new THREE.Color(1.5, 1.7, 2.2), 0.4);
    s.group.position.set(sx * 4.62, -0.02, -2.15);
    g.add(s.group);
    streaks.push({ mat: s.mat, base: s.base, phase: sx * 1.3 });
  }
  {
    const s = makeStreak(2.4, 0.17, new THREE.Color(1.5, 1.7, 2.2), 0.45);
    s.group.position.set(0, 0.28, -4.1);
    g.add(s.group);
    streaks.push({ mat: s.mat, base: s.base, phase: 2.9 });
  }

  g.traverse((m) => { if (m.isMesh && m.material.blending !== THREE.AdditiveBlending) m.castShadow = true; });
  g.userData.burners = burners;
  g.userData.glow = glow;
  g.userData.rings = rings;
  g.userData.streaks = streaks;
  g.userData.engines = [new THREE.Vector3(0.36, 0, -4.6), new THREE.Vector3(-0.36, 0, -4.6)];
  g.userData.tips = [new THREE.Vector3(4.62, 0, -2.1), new THREE.Vector3(-4.62, 0, -2.1)];
  return g;
}

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();

const CONTRAIL0 = new THREE.Color(0.72, 0.72, 0.76);
const CONTRAIL1 = new THREE.Color(0.58, 0.58, 0.62);
const VAPOR = new THREE.Color(0.95, 0.97, 1.0);
const BOMBTRAIL0 = new THREE.Color(0.78, 0.76, 0.72);
const BOMBTRAIL1 = new THREE.Color(0.52, 0.5, 0.48);
// Prevailing wind as an acceleration: aged trail sections shear downwind,
// wander and fatten instead of hanging as ruler-drawn lines (matches the
// world's wind heading; simple local version of the particles wind logic).
const WIND = new THREE.Vector3(2.4, 0.6, -1.1);
const WIND_SOFT = new THREE.Vector3(1.1, 0.4, -0.55);
const BURNER_GLOW = new THREE.Color(1.7, 2.1, 3.2);
const BURNER_HOT = new THREE.Color(2.8, 2.3, 1.7);
const BURNER_TAIL = new THREE.Color(1.1, 0.85, 0.7);
const GLINT = new THREE.Color(3.4, 3.0, 2.2);
const MARKER_FLARE = new THREE.Color(1, 0.14, 0.09).multiplyScalar(5);
const MARKER_SMOKE0 = new THREE.Color(0.72, 0.11, 0.09);
const MARKER_SMOKE1 = new THREE.Color(0.42, 0.08, 0.07);

export class AirstrikeSystem {
  constructor(scene, physics, explosions, particles, player, audio) {
    this.scene = scene;
    this.physics = physics;
    this.explosions = explosions;
    this.particles = particles;
    this.player = player;
    this.audio = audio;

    this.jets = [];
    this.pendingBombs = [];   // {jetIndex, dropAt (s after spawn), target, T}
    this.fallingBombs = [];
    this.active = false;
    this.callTimer = -1;
    this.struck = false;      // first detonation happened (kills the marker)
    this.markerAcc = 0;
    this.strikeCenter = new THREE.Vector3();
    this.strikeDir = new THREE.Vector3(0, 0, -1);

    this.onStateChange = null; // HUD callback: 'called' | 'inbound' | 'done'

    // Shared bomb assets
    this.bombGeo = new THREE.CapsuleGeometry(0.17, 0.85, 4, 8);
    this.finGeo = new THREE.BoxGeometry(0.5, 0.3, 0.025);
    this.bombMat = new THREE.MeshStandardMaterial({ color: 0x2a2e26, roughness: 0.42, metalness: 0.55, envMapIntensity: 1.4 });

    // Small-radius afterburner light per formation slot so the tails glow
    // for real. Created up-front at intensity 0: the forward renderer's
    // light count stays fixed (adding lights mid-run recompiles shaders).
    this.jetLights = [];
    for (let i = 0; i < 3; i++) {
      const l = new THREE.PointLight(0x7fa4ff, 0, 20, 2);
      scene.add(l);
      this.jetLights.push(l);
    }
  }

  buildBomb() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(this.bombGeo, this.bombMat);
    g.add(body);
    for (let i = 0; i < 2; i++) {
      const fin = new THREE.Mesh(this.finGeo, this.bombMat);
      fin.position.y = -0.5;
      fin.rotation.y = i * Math.PI / 2;
      fin.rotation.x = Math.PI / 2;
      g.add(fin);
    }
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    return g;
  }

  /** Call in a strike centered where the player is aiming. */
  call(camera) {
    if (this.active) return false;
    // Aim from the player state (authoritative even before the camera
    // matrix has been synced, e.g. in screenshot fast-forward mode).
    const p = this.player;
    const cy = Math.cos(p.pitch);
    const dir = new THREE.Vector3(-Math.sin(p.yaw) * cy, Math.sin(p.pitch), -Math.cos(p.yaw) * cy);
    const origin = new THREE.Vector3(p.position.x, p.position.y + 1.62, p.position.z);
    const hit = this.physics.raycast(origin, dir, 260);
    // Effective tactical range: pull distant aim points back to ~50m so the
    // carpet reads big in frame instead of hiding down the street.
    const dist = hit ? Math.min(hit.dist, 50) : 50;
    const target = origin.clone().addScaledVector(dir, dist);
    target.y = 0;
    target.x = THREE.MathUtils.clamp(target.x, -80, 80);
    target.z = THREE.MathUtils.clamp(target.z, -80, 80);

    this.strikeCenter.copy(target);
    this.strikeDir.set(dir.x, 0, dir.z).normalize();
    if (this.strikeDir.lengthSq() < 0.01) this.strikeDir.set(0, 0, -1);
    // Stage the carpet slightly left of the aim line so the nearest
    // detonations aren't masked by street-center props (parked cars).
    this.strikeCenter.addScaledVector(
      _v.set(-this.strikeDir.z, 0, this.strikeDir.x), -7);
    this.strikeCenter.x = THREE.MathUtils.clamp(this.strikeCenter.x, -80, 80);
    this.strikeCenter.z = THREE.MathUtils.clamp(this.strikeCenter.z, -80, 80);

    this.active = true;
    this.callTimer = 0;
    this.struck = false;
    this.markerAcc = 0;
    this.onStateChange?.('called');
    this.audio?.play('airstrikeCall');
    return true;
  }

  spawnJets() {
    const dir = this.strikeDir;
    const perp = new THREE.Vector3(-dir.z, 0, dir.x);
    // Bomb fall time from release altitude (kinematic, exact)
    const T = Math.sqrt(2 * (JET_ALT - 1.6) / BOMB_G);

    for (let i = 0; i < 3; i++) {
      const jet = buildJet();
      const lateral = (i - 1) * 26;
      const behind = i === 1 ? 0 : 18; // echelon: leader ahead
      const start = this.strikeCenter.clone()
        .addScaledVector(dir, -START_DIST - behind)
        .addScaledVector(perp, lateral)
        .setY(JET_ALT + (i === 1 ? 0 : 2));
      jet.position.copy(start);
      jet.lookAt(start.clone().add(dir));
      jet.scale.setScalar(JET_SCALE);
      for (const off of jet.userData.engines) off.multiplyScalar(JET_SCALE);
      for (const off of jet.userData.tips) off.multiplyScalar(JET_SCALE);
      this.scene.add(jet);
      this.jets.push({
        mesh: jet, vel: dir.clone().multiplyScalar(JET_SPEED),
        age: 0, trailAcc: 0, tipAcc: 0, isLeader: i === 1, lateral,
        baseQuat: jet.quaternion.clone(), phase: i * 2.1,
        light: this.jetLights[i],
      });

      // Stick of bombs along the carpet line; detonations ripple away
      // from the caller (~t=5.35 -> 6.5 absolute), spread wide enough that
      // fireballs overlap in time without stacking all at once — and so a
      // t=5.6 still catches a DEVELOPED fireball (hot core + soot rim)
      // alongside a fresh flash, not just point-blank white pops.
      const bombCount = 3;
      for (let b = 0; b < bombCount; b++) {
        const along = (b - (bombCount - 1) / 2) * 11 + rng.range(-1.5, 1.5);
        const targetPos = this.strikeCenter.clone()
          .addScaledVector(dir, along)
          .addScaledVector(perp, lateral * 0.32 + rng.range(-2, 2));
        targetPos.y = 0;
        const landTime = 5.18 + ((along + 13) / 26) * 1.1 + (i === 1 ? 0 : 0.09) + rng.range(-0.02, 0.02);
        this.pendingBombs.push({
          jetIndex: this.jets.length - 1,
          dropAt: landTime - 2.2 - T,
          target: targetPos,
          T,
        });
      }
    }
    this.audio?.play('jetFlyby');
    this.onStateChange?.('inbound');
  }

  update(dt, time) {
    if (this.active) {
      const prev = this.callTimer;
      this.callTimer += dt;
      // 2.2s delay between call and jets appearing
      if (prev < 2.2 && this.callTimer >= 2.2) this.spawnJets();

      // ---- Red targeting marker at strike center until first impact ----
      if (!this.struck && this.callTimer > 0.4) {
        _v.copy(this.strikeCenter); _v.y += 0.7;
        this.particles.emit({
          pos: _v, count: 1, vel: _v2.set(0, 1.6, 0), spread: 0.15,
          life: [0.08, 0.12], size: [0.8, 1.3],
          color0: MARKER_FLARE, alpha: 1, additive: true,
          fadeIn: 0.01, fadeOutStart: 0.3, tex: 0,
        });
        this.markerAcc += dt;
        while (this.markerAcc >= 0.11) {
          this.markerAcc -= 0.11;
          _v.copy(this.strikeCenter); _v.y += 0.9;
          this.particles.emit({
            pos: _v, count: 1, vel: _v2.set(0, 3.1, 0), spread: 0.35,
            life: [1.8, 2.6], size: [0.8, 2.4], sizeEase: 0.6,
            color0: MARKER_SMOKE0, color1: MARKER_SMOKE1,
            alpha: 0.6, drag: 0.55, turb: 0.4,
            fadeIn: 0.1, fadeOutStart: 0.4, spinVel: 0.9, posJitter: 0.3, tex: 2,
          });
        }
      }
    }

    // ---- Jets ----
    for (let i = this.jets.length - 1; i >= 0; i--) {
      const j = this.jets[i];
      j.age += dt;
      j.mesh.position.addScaledVector(j.vel, dt);

      // Bank into the pass (hardest just before overhead) + a lazy wobble
      const over = (START_DIST - 80) / JET_SPEED;
      const lean = 0.34 * Math.exp(-Math.pow((j.age - over) / 1.15, 2));
      const roll = lean * (j.lateral === 0 ? 0.7 : (j.lateral > 0 ? 1.2 : -1.2))
        + 0.09 * Math.sin(j.age * 0.9 + j.phase);
      j.mesh.quaternion.copy(j.baseQuat);
      j.mesh.rotateZ(roll);

      // Afterburner flicker (deterministic), brighter than before: cones
      // pulse in length/width, nozzle rings and glow sprites throb with them.
      const fx = j.mesh.userData;
      for (let k = 0; k < fx.burners.length; k++) {
        const b = fx.burners[k];
        b.mesh.scale.y = 1 + 0.28 * Math.sin(time * 57 + b.phase) + 0.11 * Math.sin(time * 131 + b.phase * 2.3);
        const w = 1 + 0.12 * Math.sin(time * 83 + b.phase * 1.9);
        b.mesh.scale.x = w; b.mesh.scale.z = w;
      }
      for (let k = 0; k < fx.glow.length; k++) {
        const s = fx.glow[k];
        s.mat.opacity = s.base * (0.84 + 0.22 * Math.sin(time * 61 + s.phase));
      }
      for (let k = 0; k < fx.rings.length; k++) {
        const ringScale = 1 + 0.07 * Math.sin(time * 71 + k * 2.6);
        fx.rings[k].scale.setScalar(ringScale);
      }
      for (let k = 0; k < fx.streaks.length; k++) {
        const s = fx.streaks[k];
        s.mat.opacity = s.base * (0.86 + 0.14 * Math.sin(time * 29 + s.phase));
      }
      // Burner point light rides between the nozzles, flickering with the
      // cones, so the whole tail group actually glows.
      const E0 = fx.engines;
      j.light.position.copy(E0[0]).add(E0[1]).multiplyScalar(0.5)
        .applyQuaternion(j.mesh.quaternion).add(j.mesh.position);
      j.light.intensity = 88 + 30 * Math.sin(time * 47 + j.phase * 3.1);

      const nearPlayer = j.mesh.position.distanceTo(this.player.position) < 480;
      if (nearPlayer && j.age < 6.5) {
        // Camera-facing burner glow dots (the cones read edge-on from below)
        // riding WITH the jet (vel = jet vel so the dots pile on the nozzle
        // instead of smearing into a luminous rope)
        for (const off of fx.engines) {
          _v.copy(off).applyQuaternion(j.mesh.quaternion).add(j.mesh.position);
          this.particles.emit({
            pos: _v, count: 1, vel: j.vel, spread: 0,
            life: [0.05, 0.08], size: [0.95, 0.6],
            color0: BURNER_GLOW, alpha: 0.75, additive: true,
            fadeIn: 0.01, fadeOutStart: 0.3, tex: 0,
          });
        }
      }
      if (j.age < 6.5 && nearPlayer) {
        // Contrail, split in three reads: a HOT bright segment right at the
        // nozzles, a young grey ribbon tracking the flight path, then aged
        // puffs that GROW, thin out and get pushed downwind — a proper
        // dissipation gradient instead of static strokes on the sky.
        j.trailAcc += dt;
        while (j.trailAcc >= 0.016) {
          j.trailAcc -= 0.016;
          j.trailTick = (j.trailTick ?? 0) + 1;
          j.trailSeed = (j.trailSeed ?? 0) + 0.21;
          const E = fx.engines;
          // hot exhaust streaks at both nozzles (short additive ribbons)
          for (const off of E) {
            _v.copy(off).applyQuaternion(j.mesh.quaternion).add(j.mesh.position)
              .addScaledVector(j.vel, -j.trailAcc);
            this.particles.emit({
              pos: _v, count: 1, vel: j.vel, spread: 0,
              life: [0.1, 0.16], size: [0.24, 0.14],
              color0: BURNER_HOT, color1: BURNER_TAIL,
              alpha: 0.5, additive: true, drag: 0.1,
              fadeIn: 0.01, fadeOutStart: 0.35,
              stretch: 0.045, lenMax: 2.4,
            });
          }
          _v.copy(E[0]).add(E[1]).multiplyScalar(0.5)
            .applyQuaternion(j.mesh.quaternion).add(j.mesh.position)
            .addScaledVector(j.vel, -j.trailAcc - 0.028);
          if (j.trailTick % 2 === 0) {
            // young ribbon just behind the hot segment: thin, fast, tight;
            // decelerates and picks up wind so it hands off smoothly into
            // the aged puff body
            this.particles.emit({
              pos: _v, count: 1, vel: j.vel, spread: 0.1,
              life: [1.0, 1.4], size: [0.55, 1.9], sizeEase: 0.6,
              color0: CONTRAIL0, color1: CONTRAIL1,
              alpha: 0.34, drag: 1.15, seed: j.trailSeed, turb: 0.45, wind: WIND_SOFT,
              fadeIn: 0.02, fadeOutStart: 0.5,
              stretch: 0.045, lenMax: 8,
            });
          } else {
            // Aged body of the trail: puffs balloon out (2.6 -> 8.8), spin,
            // drift on the wind and fade from ~1/3 of life — the sun-side
            // rim light on the smoke pool models them against the sky
            this.particles.emit({
              pos: _v, count: 1, vel: _v2.set(0, 0.4, 0), spread: 0.22,
              life: [2.8, 4.6], size: [2.6, 8.8], sizeEase: 0.5,
              color0: CONTRAIL0, color1: CONTRAIL1,
              alpha: 0.19, drag: 0.42, spinVel: 0.5, turb: 0.65, wind: WIND,
              fadeIn: 0.06, fadeOutStart: 0.34,
              tex: (j.trailTick % 4 === 1) ? 3 : 2,
            });
          }
        }
        // Wingtip vortex ribbons — surge while the jet is banked (lean).
        // Kept slim: these support the speed streaks, they don't paint over
        // the sky.
        j.tipAcc += dt;
        while (j.tipAcc >= 0.03) {
          j.tipAcc -= 0.03;
          for (const off of fx.tips) {
            _v.copy(off).applyQuaternion(j.mesh.quaternion).add(j.mesh.position)
              .addScaledVector(j.vel, -j.tipAcc);
            this.particles.emit({
              pos: _v, count: 1, vel: j.vel, spread: 0.02,
              life: [0.26 + lean * 0.8, 0.44 + lean * 1.0], size: [0.16, 0.08],
              color0: VAPOR, alpha: 0.2 + lean * 0.9, drag: 22,
              fadeIn: 0.02, fadeOutStart: 0.5,
              stretch: 0.04, lenMax: 7,
            });
          }
        }
      }

      if (j.age > 9) {
        this.scene.remove(j.mesh);
        j.light.intensity = 0;
        this.jets.splice(i, 1);
      }
    }

    // ---- Bomb releases ----
    if (this.pendingBombs.length > 0) {
      for (let i = this.pendingBombs.length - 1; i >= 0; i--) {
        const b = this.pendingBombs[i];
        const jet = this.jets[b.jetIndex];
        if (!jet) { this.pendingBombs.splice(i, 1); continue; }
        b.dropAt -= dt;
        if (b.dropAt <= 0) {
          const mesh = this.buildBomb();
          mesh.position.copy(jet.mesh.position).add(_v.set(0, -1.6, 0));
          this.scene.add(mesh);
          // Release sun-glint: a brief sparkle that rides with the bomb so
          // the eye catches the drop and can track ordnance to impact.
          this.particles.emit({
            pos: mesh.position, count: 1, vel: jet.vel, spread: 0,
            life: [0.3, 0.42], size: [2.4, 0.5],
            color0: GLINT, alpha: 0.95, additive: true, drag: 0.4,
            fadeIn: 0.02, fadeOutStart: 0.45, tex: 0,
          });
          // Persistent tumbling glint on the bomb body itself
          const glint = new THREE.Sprite(new THREE.SpriteMaterial({
            map: getFxTextures().glow, color: new THREE.Color(2.6, 2.4, 1.9),
            blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0,
          }));
          glint.scale.setScalar(0.9);
          mesh.add(glint);
          // Slight lateral bow (zero at both endpoints, so the landing point
          // is untouched): the trail arcs instead of ruling a straight line.
          const pdx = b.target.x - mesh.position.x;
          const pdz = b.target.z - mesh.position.z;
          const pl = Math.hypot(pdx, pdz) || 1;
          const bow = rng.range(1.4, 2.4) * (rng.chance(0.5) ? 1 : -1);
          this.fallingBombs.push({
            mesh,
            dropPos: mesh.position.clone(),
            y0: mesh.position.y,
            target: b.target,
            T: b.T,
            age: 0, trailAcc: 0, whistled: false,
            curveX: (-pdz / pl) * bow, curveZ: (pdx / pl) * bow,
            glint, glintPhase: rng() * 6.28,
          });
          this.pendingBombs.splice(i, 1);
        }
      }
    }

    // ---- Falling bombs: kinematic arc, lands exactly on target at T ----
    for (let i = this.fallingBombs.length - 1; i >= 0; i--) {
      const b = this.fallingBombs[i];
      b.age += dt;
      const sN = Math.min(b.age / b.T, 1);
      const bow = Math.sin(Math.PI * sN);
      const pos = b.mesh.position;
      pos.x = b.dropPos.x + (b.target.x - b.dropPos.x) * sN + b.curveX * bow;
      pos.z = b.dropPos.z + (b.target.z - b.dropPos.z) * sN + b.curveZ * bow;
      pos.y = b.y0 * (1 - sN * sN);
      // Orient nose-down along the instantaneous velocity (incl. bow drift)
      const dBow = Math.PI * Math.cos(Math.PI * sN) / b.T;
      _v.set(
        (b.target.x - b.dropPos.x) / b.T + b.curveX * dBow,
        -2 * b.y0 * sN / b.T,
        (b.target.z - b.dropPos.z) / b.T + b.curveZ * dBow
      );
      _v2.copy(pos).add(_v);
      b.mesh.lookAt(_v2);
      b.mesh.rotateX(Math.PI / 2);

      // Intermittent sun-flash as the bomb tumbles; dims as it nears ground
      const tw = Math.pow(Math.max(0, Math.sin(b.age * 7.5 + b.glintPhase)), 8);
      b.glint.material.opacity = (0.22 + 0.78 * tw) * (1 - sN * 0.6) * 0.85;

      // Ribbon trail with an AGE GRADIENT, never a ruler line:
      //  - fresh segments at the bomb are thin, fast and tight (taper);
      //  - high drag freezes them in air, so the stretch length collapses
      //    while the width GROWS (tight tip -> fat old root) and alpha fades;
      //  - turbulence + wind shear make aged sections wander downwind;
      //  - the lateral bow inherited from the jet's track curves the line.
      _v3.copy(_v); // instantaneous velocity, preserved across the loop
      b.trailAcc += dt;
      b.puffAcc = (b.puffAcc ?? 0) + dt;
      while (b.trailAcc >= 0.03) {
        b.trailAcc -= 0.03;
        b.trailSeed = (b.trailSeed ?? 0) + 0.27;
        _v2.copy(_v3).normalize().multiplyScalar(-0.8).add(pos)
          .addScaledVector(_v3, -b.trailAcc);
        this.particles.emit({
          pos: _v2, count: 1, vel: _v3, spread: 0.06,
          life: [1.35, 1.75], size: [0.28, 1.5], sizeEase: 0.6,
          color0: BOMBTRAIL0, color1: BOMBTRAIL1,
          alpha: 0.5, drag: 2.3, seed: b.trailSeed, turb: 0.5, wind: WIND,
          fadeIn: 0.02, fadeOutStart: 0.45,
          stretch: 0.09, lenMax: 8,
        });
      }
      // Dissipation body: old sections hand off to fat soft puffs that
      // blow downwind and thin out (the smoke the line dissolves into).
      while (b.puffAcc >= 0.1) {
        b.puffAcc -= 0.1;
        _v2.copy(_v3).normalize().multiplyScalar(-0.8).add(pos)
          .addScaledVector(_v3, -b.puffAcc);
        this.particles.emit({
          pos: _v2, count: 1, vel: _v.set(0, 0.35, 0), spread: 0.25,
          life: [2.0, 3.2], size: [1.5, 4.8], sizeEase: 0.5,
          color0: BOMBTRAIL0, color1: BOMBTRAIL1,
          alpha: 0.18, drag: 0.5, spinVel: 0.6, turb: 0.55, wind: WIND,
          fadeIn: 0.22, fadeOutStart: 0.38, tex: 3,
        });
      }

      // Whistle as it commits to the dive
      if (sN > 0.35 && !b.whistled) {
        b.whistled = true;
        this.audio?.play('bombWhistle', this.player.position.distanceTo(b.target));
      }

      if (sN >= 1) {
        this.scene.remove(b.mesh);
        this.fallingBombs.splice(i, 1);
        this.struck = true;
        this.explosions.explode(b.target.clone(), { size: 1.7, damage: 190, radius: 12 });
      }
    }

    // ---- Wrap up ----
    if (this.active && this.callTimer > 12 && this.jets.length === 0 && this.fallingBombs.length === 0 && this.pendingBombs.length === 0) {
      this.active = false;
      this.onStateChange?.('done');
    }
  }
}
