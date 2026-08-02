import * as THREE from 'three';
import { Kit, PLATE, BRICK } from './kit.js';
import { C, SW } from './palette.js';
import { FINISH } from '../core/materials.js';
import {
  createMinifig, createBlaster, drawFace, FIG, printTexture, curvedPrint,
} from './minifig.js';
import { getMaterial } from '../core/materials.js';

/*
 * The cast.
 *
 * Every character is a builder that returns a THREE.Group standing with its
 * feet on y = 0, facing -Z, at minifigure scale (a fig is ~5.2 stud units to
 * the top of the head stud). Minifig-based characters return the fig itself so
 * userData.pose / walk / idle survive; extra parts (helmets, belts, packs) are
 * parented onto the fig's own sub-objects so they follow the animation.
 *
 * Helmets are brick-built: stacked cones for domes, annular-sector shells for
 * the sides, wedges for brows and jaws. Fine detail — panel lines, insignia,
 * chest boxes, faces — is printed onto canvas textures, as a real set would.
 *
 * userData contract, per character:
 *   update(t, dt)      always safe to call every frame; drives capes and, when
 *                      userData.autoIdle is true, a gentle idle.
 *   autoIdle           default false so the film can pose the figure; R2-D2 and
 *                      C-3PO default true because their idle *is* the character.
 */

const HELMET_SEG = 18;

// ------------------------------------------------------------- geometry aid --

/**
 * Annular sector, given in TRUE (x, z) world coordinates.
 * Angle 0 points at the face (-Z); +a sweeps toward the figure's right (+X).
 */
function arcRingPts(rOut, rIn, a0, a1, steps = 14, zScale = 1) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (a1 - a0) * (i / steps);
    pts.push([Math.sin(a) * rOut, -Math.cos(a) * rOut * zScale]);
  }
  for (let i = steps; i >= 0; i--) {
    const a = a0 + (a1 - a0) * (i / steps);
    pts.push([Math.sin(a) * rIn, -Math.cos(a) * rIn * zScale]);
  }
  return pts;
}

/** kit.poly() wants (x, -z); let callers think in world coordinates. */
function polyXZ(kit, x, y, z, pts, h, color, opts = {}) {
  return kit.poly(x, y, z, pts.map((p) => [p[0], -p[1]]), h, color, opts);
}

/** Helmet shell course: an arc of wall from y to y+h. */
function shell(kit, y, h, rOut, rIn, a0, a1, color, opts = {}) {
  const steps = opts.steps || Math.max(4, Math.round((Math.abs(a1 - a0) / Math.PI) * 12));
  return polyXZ(kit, 0, y, 0, arcRingPts(rOut, rIn, a0, a1, steps, opts.zScale || 1),
    h, color, { key: `shell${rOut}|${rIn}|${a0.toFixed(3)}|${a1.toFixed(3)}|${steps}|${opts.zScale || 1}`, ...opts });
}

/** Flat plate lying in the XY plane, `th` thick toward -Z. Vents, insignia, jaws. */
function plateXY(kit, x, y, z, pts, th, color, opts = {}) {
  return kit.poly(x, y, z, pts.map((p) => [p[0], -p[1]]), th, color,
    { ...opts, rot: [-Math.PI / 2, 0, 0] });
}

const _c1 = new THREE.Color();
const _c2 = new THREE.Color();
function lighten(hex, amount) {
  _c1.setHex(hex); _c2.setHex(0xffffff);
  return _c1.lerp(_c2, amount).getHex();
}

const DEG = Math.PI / 180;

// ---------------------------------------------------------------- canvas aid --

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

function poly2d(g, pts) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
}

/** Mirror a path about the canvas centre line — prints are symmetric. */
function mirror(pts, w) {
  return pts.map((p) => [w - p[0], p[1]]);
}

// ================================================================ lightsaber ==

/**
 * Chrome hilt with grip rings and an emissive blade.
 *   userData.setOn(bool)   ignite / retract
 *   userData.blade         the blade group (scale it to animate the ignition)
 *   userData.setLength(f)  0..1 blade extension
 */
export function buildLightsaber({
  color = SW.saberBlue, on = true, blade = 3.3, name = 'lightsaber',
} = {}) {
  const g = new THREE.Group();
  g.name = name;

  const kit = new Kit('saber-hilt');
  kit.cyl(0, 0, 0, 0.088, 0.06, C.gunmetal, { seg: 14, finish: FINISH.metal });   // pommel
  kit.cyl(0, 0.05, 0, 0.075, 0.10, C.chromeSilver, { seg: 14, finish: FINISH.metal });
  kit.cyl(0, 0.14, 0, 0.070, 0.22, C.black, { seg: 14, finish: FINISH.matte });   // grip
  for (let i = 0; i < 4; i++) {
    kit.torus(0, 0.175 + i * 0.055, 0, 0.077, 0.016, C.flatSilver,
      { seg: 14, tseg: 6, rot: [Math.PI / 2, 0, 0], finish: FINISH.metal });
  }
  kit.cyl(0, 0.36, 0, 0.088, 0.14, C.chromeSilver, { seg: 14, finish: FINISH.metal });
  kit.box(0, 0.38, -0.09, 0.085, 0.11, 0.05, C.red, {});                          // activator
  kit.box(0.09, 0.39, 0.0, 0.05, 0.08, 0.09, C.darkBluishGray, {});
  kit.cyl(0, 0.50, 0, 0.098, 0.09, C.flatSilver, { seg: 14, finish: FINISH.metal });
  kit.cone(0, 0.59, 0, 0.098, 0.072, 0.06, C.gunmetal, { seg: 14, finish: FINISH.metal });
  g.add(kit.build({ name: 'hilt' }));

  const bladeG = new THREE.Group();
  bladeG.name = 'blade';
  bladeG.position.y = 0.645;
  const bk = new Kit('saber-blade');
  const core = lighten(color, 0.72);
  bk.cyl(0, 0, 0, 0.052, blade, core, { seg: 10, finish: FINISH.glow, emissive: 4.2 });
  bk.cone(0, blade, 0, 0.052, 0.012, 0.085, core, { seg: 10, finish: FINISH.glow, emissive: 4.2 });
  bk.cyl(0, -0.02, 0, 0.105, blade + 0.04, color,
    { seg: 12, finish: FINISH.glow, emissive: 2.6, opacity: 0.42 });
  bk.sphere(0, blade + 0.02, 0, 0.105, color, { seg: 10, finish: FINISH.glow, emissive: 2.6, opacity: 0.42 });
  bladeG.add(bk.build({ name: 'bladeMesh' }));
  g.add(bladeG);

  bladeG.visible = !!on;
  g.userData.blade = bladeG;
  g.userData.on = !!on;
  g.userData.bladeLength = blade;
  g.userData.setOn = (v) => { g.userData.on = !!v; bladeG.visible = !!v; };
  g.userData.setLength = (f) => {
    const s = Math.max(0.0001, Math.min(1, f));
    bladeG.scale.y = s;
    bladeG.visible = g.userData.on && f > 0.01;
  };
  return g;
}

/** Wrap a saber so its grip sits in a minifig fist; returns the holder group. */
function sabreInHand(saber, pitch) {
  const holder = new THREE.Group();
  holder.name = 'saberHold';
  saber.position.set(0, -0.24, 0);
  holder.add(saber);
  holder.rotation.x = pitch;
  holder.position.set(0, -0.06, 0.02);
  return holder;
}

// =================================================================== helpers ==

/** Wrap fig.userData.update, keeping the cape (and anything already there). */
function chainUpdate(fig, fn) {
  const prev = fig.userData.update;
  fig.userData.update = (t, dt) => {
    if (prev) prev(t, dt);
    fn(t, dt);
  };
}

/** Put a weapon in a hand at a sane angle. `pitch` 0 = barrel forward (-Z). */
function aimAccessory(obj, pitch, drop = -0.22, push = 0.04) {
  obj.rotation.set(pitch, 0, 0);
  obj.position.set(0, drop, push);
  return obj;
}

// ==================================================================== VADER ==

const VADER_BLACK = 0x15181c;
const VADER_SHELL = 0x101316;

function drawVaderMask(g, w, h) {
  const cx = w / 2;
  g.fillStyle = '#14171b';
  g.fillRect(0, 0, w, h);
  // Gloss: the mask is lacquered, so it carries a bright edge on each cheek.
  const grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0.00, '#2b333c');
  grad.addColorStop(0.16, '#3b454f');
  grad.addColorStop(0.34, '#171b20');
  grad.addColorStop(0.50, '#1d2228');
  grad.addColorStop(0.66, '#171b20');
  grad.addColorStop(0.84, '#3b454f');
  grad.addColorStop(1.00, '#2b333c');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);

  const S = w / 192;
  const P = (pts) => pts.map(([x, y]) => [x * S, y * S]);

  // Brow ridge: a shallow V that dips at the bridge of the nose.
  g.fillStyle = '#39424c';
  poly2d(g, P([[18, 34], [96, 62], [174, 34], [174, 52], [96, 80], [18, 52]]));
  g.fill();
  g.fillStyle = '#5d6a78';
  poly2d(g, P([[18, 34], [96, 62], [174, 34], [174, 40], [96, 68], [18, 40]]));
  g.fill();

  // Eye lenses — angular, taller on the outside, sloping down to the bridge.
  for (const s of [0, 1]) {
    const base = [[24, 62], [86, 84], [86, 108], [24, 96]];
    const pts = P(s ? mirror(base, 192) : base);
    poly2d(g, pts);
    g.fillStyle = '#0d0f12';
    g.fill();
    g.lineWidth = 3.2 * S;
    g.strokeStyle = '#4c5764';
    g.stroke();
    // lens sheen
    const sh = [[30, 68], [78, 85], [78, 92], [30, 76]];
    poly2d(g, P(s ? mirror(sh, 192) : sh));
    g.fillStyle = 'rgba(150,170,190,0.30)';
    g.fill();
  }

  // Nose / bridge wedge.
  g.fillStyle = '#252b32';
  poly2d(g, P([[86, 74], [106, 74], [100, 122], [92, 122]]));
  g.fill();
  g.strokeStyle = '#5d6a78';
  g.lineWidth = 2 * S;
  g.beginPath();
  g.moveTo(96 * S, 76 * S); g.lineTo(96 * S, 120 * S);
  g.stroke();

  // Cheek "tusk" vents.
  for (const s of [0, 1]) {
    const base = [[16, 108], [46, 116], [46, 140], [16, 134]];
    poly2d(g, P(s ? mirror(base, 192) : base));
    g.fillStyle = '#0d0f12';
    g.fill();
    g.strokeStyle = '#4c5764'; g.lineWidth = 2.4 * S; g.stroke();
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      const y = (118 + i * 8) * S;
      g.moveTo((s ? 192 - 44 : 20) * S, y);
      g.lineTo((s ? 192 - 20 : 44) * S, y + (s ? -1.5 : 1.5) * S);
      g.strokeStyle = '#39424c'; g.lineWidth = 1.8 * S; g.stroke();
    }
  }

  // Mouth grille (the physical vent sits just in front of this, so the print
  // reads as the recess around it).
  poly2d(g, P([[62, 120], [130, 120], [120, 160], [72, 160]]));
  g.fillStyle = '#07090b';
  g.fill();
  g.strokeStyle = '#4c5764'; g.lineWidth = 3 * S; g.stroke();
  g.strokeStyle = '#2f363d'; g.lineWidth = 3 * S;
  for (let i = 1; i < 5; i++) {
    const f = i / 5;
    g.beginPath();
    g.moveTo((62 + f * 68) * S, 122 * S);
    g.lineTo((72 + f * 48) * S, 158 * S);
    g.stroke();
  }

  // Jaw shadow.
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.fillRect(0, 164 * S, w, h - 164 * S);
}

function drawVaderTorso(g, w, h) {
  const S = w / 256;
  g.clearRect(0, 0, w, h);

  // Shoulder harness straps converging on the chest box.
  g.strokeStyle = '#0a0c0e';
  g.lineWidth = 13 * S;
  g.lineCap = 'round';
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(128 * S + s * 92 * S, 8 * S);
    g.lineTo(128 * S + s * 46 * S, 74 * S);
    g.stroke();
  }
  g.strokeStyle = '#2e353d';
  g.lineWidth = 4 * S;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(128 * S + s * 92 * S, 10 * S);
    g.lineTo(128 * S + s * 46 * S, 74 * S);
    g.stroke();
  }

  // Chest control box.
  rr(g, 60 * S, 70 * S, 136 * S, 84 * S, 8 * S);
  g.fillStyle = '#0b0d10'; g.fill();
  g.strokeStyle = '#565f69'; g.lineWidth = 4 * S; g.stroke();
  rr(g, 68 * S, 78 * S, 120 * S, 68 * S, 5 * S);
  g.strokeStyle = '#2c333a'; g.lineWidth = 2.5 * S; g.stroke();

  // Button rows.
  const btns = ['#d0342a', '#2f6fd0', '#4aa64f', '#e2c23c', '#d0342a', '#cfd6dd'];
  for (let i = 0; i < 6; i++) {
    rr(g, (74 + i * 19) * S, 86 * S, 13 * S, 13 * S, 2.5 * S);
    g.fillStyle = btns[i]; g.fill();
    g.strokeStyle = '#0a0c0e'; g.lineWidth = 1.6 * S; g.stroke();
  }
  // Readout bars.
  for (let i = 0; i < 3; i++) {
    rr(g, (74 + i * 25) * S, 106 * S, 18 * S, 8 * S, 2 * S);
    g.fillStyle = '#7fd0c8'; g.fill();
  }
  rr(g, 150 * S, 104 * S, 34 * S, 12 * S, 3 * S);
  g.fillStyle = '#1d2a35'; g.fill();
  g.strokeStyle = '#565f69'; g.lineWidth = 2 * S; g.stroke();

  // Dials.
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.arc((82 + i * 24) * S, 132 * S, 7 * S, 0, 7);
    g.fillStyle = '#3b444d'; g.fill();
    g.strokeStyle = '#767f89'; g.lineWidth = 1.8 * S; g.stroke();
    g.beginPath();
    g.moveTo((82 + i * 24) * S, 132 * S);
    g.lineTo((82 + i * 24) * S + 5 * S, (132 - 4 + i) * S);
    g.stroke();
  }
  rr(g, 176 * S, 124 * S, 16 * S, 16 * S, 3 * S);
  g.fillStyle = '#d0342a'; g.fill();
  g.strokeStyle = '#0a0c0e'; g.lineWidth = 2 * S; g.stroke();

  // Ribbed under-suit below the box.
  g.strokeStyle = '#0a0c0e'; g.lineWidth = 3.5 * S;
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.moveTo(72 * S, (166 + i * 11) * S);
    g.lineTo(184 * S, (166 + i * 11) * S);
    g.stroke();
  }
}

/** The helmet: dome, brow, cheek wedges, mouth vent, neck bell. */
function vaderHelmet() {
  const kit = new Kit('vader-helmet');
  const BK = VADER_SHELL;
  const open = 47 * DEG;          // half-angle of the face opening

  // Neck bell — three flaring courses, squashed front-to-back so it clears
  // the chest.
  shell(kit, -0.14, 0.10, 0.98, 0.70, open + 8 * DEG, Math.PI * 2 - open - 8 * DEG, BK, { zScale: 0.82, steps: 16 });
  shell(kit, -0.05, 0.10, 0.90, 0.68, open + 4 * DEG, Math.PI * 2 - open - 4 * DEG, BK, { zScale: 0.86, steps: 16 });
  shell(kit, 0.04, 0.10, 0.84, 0.65, open, Math.PI * 2 - open, BK, { zScale: 0.92, steps: 16 });

  // Cheeks / sides.
  shell(kit, 0.13, 0.68, 0.80, 0.625, open, Math.PI * 2 - open, BK, { steps: 18 });

  // Brow band: full ring, with a wedge that juts forward over the eyes.
  shell(kit, 0.795, 0.14, 0.82, 0.62, 0, Math.PI * 2, BK, { steps: 22 });
  plateXY(kit, 0, 0.74, -0.72, [[-0.30, 0.10], [0.30, 0.10], [0.22, -0.02], [0, -0.075], [-0.22, -0.02]], 0.14, BK);
  kit.box(0, 0.80, -0.70, 0.86, 0.10, 0.20, BK, { rot: [0.22, 0, 0] });

  // Angular cheek planes framing the mask.
  kit.sym((s) => {
    kit.push().translate(s * 0.40, 0.16, -0.505).rotY(-s * 0.60);
    kit.box(0, 0, 0, 0.34, 0.66, 0.20, BK, {});
    kit.pop();
    kit.push().translate(s * 0.545, 0.13, -0.30).rotY(-s * 0.28);
    kit.box(0, 0, 0, 0.26, 0.70, 0.42, BK, {});
    kit.pop();
  });

  // Jaw + mouth vent.
  plateXY(kit, 0, 0.13, -0.60, [[-0.30, 0.30], [0.30, 0.30], [0.24, 0.0], [-0.24, 0.0]], 0.09, C.gunmetal);
  for (let i = -2; i <= 2; i++) {
    kit.box(i * 0.105, 0.15, -0.655, 0.045, 0.26, 0.05, 0x05070a, {});
  }
  kit.box(0, 0.05, -0.50, 0.52, 0.10, 0.30, BK, { rot: [-0.25, 0, 0] });

  // Dome — stacked cone courses, the way a real dome is bricked up.
  kit.cone(0, 0.925, 0, 0.822, 0.795, 0.20, BK, { seg: HELMET_SEG });
  kit.cone(0, 1.12, 0, 0.795, 0.66, 0.17, BK, { seg: HELMET_SEG });
  kit.cone(0, 1.28, 0, 0.66, 0.44, 0.13, BK, { seg: HELMET_SEG });
  kit.cone(0, 1.40, 0, 0.44, 0.20, 0.09, BK, { seg: HELMET_SEG });
  kit.sphere(0, 1.44, 0, 0.20, BK, { seg: 14, scl: [1, 0.7, 1] });

  // Crown spine.
  for (let i = 0; i < 5; i++) {
    const f = i / 4;
    kit.box(0, 0.95 + f * 0.42, -0.62 + f * 0.60, 0.15, 0.09, 0.24,
      lighten(BK, 0.08), { rot: [-0.9 + f * 0.9, 0, 0] });
  }

  // Rear vents.
  kit.sym((s) => {
    kit.push().rotY(s * 0.55).translate(0, 0.30, 0.70);
    kit.box(0, 0, 0, 0.26, 0.34, 0.09, C.gunmetal, {});
    kit.pop();
  });

  return kit.build({ name: 'vaderHelmet' });
}

/** Belt + buckle boxes, parented to the torso. */
function vaderBelt() {
  const kit = new Kit('vader-belt');
  kit.box(0, 0.02, 0, 1.30, 0.30, 0.88, 0x0d1014, {});
  kit.box(0, 0.05, -0.45, 0.28, 0.22, 0.08, C.flatSilver, { finish: FINISH.metal });
  kit.sym((s) => {
    kit.box(s * 0.36, 0.06, -0.42, 0.20, 0.17, 0.07, C.flatSilver, { finish: FINISH.metal });
    kit.box(s * 0.60, 0.05, -0.24, 0.10, 0.20, 0.14, C.darkBluishGray, {});
  });
  return kit.build({ name: 'vaderBelt' });
}

/** Shoulder mantle: reads as the bottom of the helmet bell / cape collar. */
function vaderMantle() {
  const kit = new Kit('vader-mantle');
  shell(kit, 1.44, 0.14, 0.92, 0.56, 62 * DEG, 298 * DEG, VADER_SHELL, { zScale: 0.95, steps: 14 });
  shell(kit, 1.56, 0.14, 0.85, 0.54, 55 * DEG, 305 * DEG, VADER_SHELL, { zScale: 0.95, steps: 14 });
  shell(kit, 1.68, 0.12, 0.76, 0.50, 48 * DEG, 312 * DEG, VADER_SHELL, { zScale: 0.98, steps: 14 });
  return kit.build({ name: 'vaderMantle' });
}

export function buildVader(opts = {}) {
  const fig = createMinifig({
    name: 'vader',
    skin: 0x1a1e23, torso: VADER_BLACK, arms: VADER_BLACK, hands: 0x0d1014,
    legs: VADER_BLACK, hips: 0x0d1014, feet: 0x0d1014,
    face: drawVaderMask, faceKey: 'vader-mask',
    torsoPrint: drawVaderTorso, torsoKey: 'vader-chest',
    headgear: vaderHelmet,
    cape: { color: 0x0e1014, w: 2.05, h: 3.15, sway: 0.85 },
  });

  const torso = fig.userData.parts.torso;
  const belt = vaderBelt();
  belt.position.y = 0.0;
  torso.add(belt);
  const mantle = vaderMantle();
  torso.add(mantle);

  const saber = buildLightsaber({ color: SW.saberRed, on: opts.saber !== false, blade: 3.1, name: 'vader-saber' });
  const hold = sabreInHand(saber, -1.62);
  fig.userData.parts.handR.add(hold);

  fig.userData.saber = saber.userData.blade;
  fig.userData.lightsaber = saber;
  fig.userData.setSaber = (on) => saber.userData.setOn(on);
  fig.userData.igniteSaber = (f) => saber.userData.setLength(f);

  fig.userData.pose({
    armR: 0.62, elbowR: 0.38, armROut: 0.16,
    armL: -0.12, elbowL: 0.62, armLOut: 0.22,
    legL: 0.10, legR: -0.10,
  });
  fig.userData.capeParams = { gust: 0.12, speed: 0 };
  fig.userData.autoIdle = false;
  chainUpdate(fig, (t) => {
    if (!fig.userData.autoIdle) return;
    const s = Math.sin(t * 0.9);
    fig.userData.pose({ armL: -0.12 + s * 0.05, headTurn: Math.sin(t * 0.4) * 0.13 });
  });
  return fig;
}

// ============================================================ STORMTROOPER ==

function drawTrooperTorso(g, w, h) {
  const S = w / 256;
  g.clearRect(0, 0, w, h);
  const ink = '#20262c';

  // Black neck seal.
  g.fillStyle = '#171b20';
  g.fillRect(78 * S, 0, 100 * S, 16 * S);

  // Chest plate seams.
  g.strokeStyle = ink;
  g.lineWidth = 5 * S;
  g.lineJoin = 'round';
  poly2d(g, [[46 * S, 6 * S], [72 * S, 44 * S], [72 * S, 96 * S], [128 * S, 112 * S],
    [184 * S, 96 * S], [184 * S, 44 * S], [210 * S, 6 * S]]);
  g.stroke();
  g.beginPath();
  g.moveTo(72 * S, 60 * S); g.lineTo(184 * S, 60 * S);
  g.stroke();

  // Shoulder bells.
  for (const s of [-1, 1]) {
    g.beginPath();
    g.arc(128 * S + s * 96 * S, 30 * S, 34 * S, 0, 7);
    g.strokeStyle = ink; g.lineWidth = 5 * S; g.stroke();
  }

  // Abdomen plates.
  g.strokeStyle = ink; g.lineWidth = 5 * S;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.moveTo(80 * S, (124 + i * 18) * S);
    g.quadraticCurveTo(128 * S, (136 + i * 18) * S, 176 * S, (124 + i * 18) * S);
    g.stroke();
  }
  g.fillStyle = ink;
  rr(g, 100 * S, 118 * S, 56 * S, 10 * S, 4 * S); g.fill();

  // Belt with utility boxes.
  g.fillStyle = '#1a1f25';
  g.fillRect(62 * S, 186 * S, 132 * S, 30 * S);
  g.fillStyle = '#8b9296';
  rr(g, 112 * S, 190 * S, 32 * S, 22 * S, 3 * S); g.fill();
  g.fillStyle = '#3b444c';
  rr(g, 70 * S, 192 * S, 22 * S, 18 * S, 3 * S); g.fill();
  rr(g, 164 * S, 192 * S, 22 * S, 18 * S, 3 * S); g.fill();

  // Hip plates.
  g.strokeStyle = ink; g.lineWidth = 5 * S;
  g.beginPath();
  g.moveTo(66 * S, 224 * S); g.lineTo(190 * S, 224 * S);
  g.stroke();
}

function drawTrooperLegs(g, w, h) {
  const S = w / 128;
  g.clearRect(0, 0, w, h);
  const ink = '#20262c';
  g.strokeStyle = ink; g.lineWidth = 5 * S; g.lineJoin = 'round';
  // Thigh plate.
  poly2d(g, [[22 * S, 10 * S], [106 * S, 10 * S], [100 * S, 62 * S], [28 * S, 62 * S]]);
  g.stroke();
  // Knee.
  g.beginPath();
  g.moveTo(26 * S, 86 * S);
  g.quadraticCurveTo(64 * S, 102 * S, 102 * S, 86 * S);
  g.stroke();
  g.beginPath();
  g.moveTo(26 * S, 100 * S);
  g.quadraticCurveTo(64 * S, 116 * S, 102 * S, 100 * S);
  g.stroke();
  // Shin seam + boot.
  g.beginPath();
  g.moveTo(64 * S, 118 * S); g.lineTo(64 * S, 158 * S);
  g.stroke();
  g.fillStyle = '#171b20';
  g.fillRect(18 * S, 162 * S, 92 * S, 30 * S);
}

function drawTrooperFace(g, w, h) {
  const S = w / 256;
  g.clearRect(0, 0, w, h);
  const ink = '#0c0f13';

  // Eye lenses.
  for (const s of [0, 1]) {
    const base = [[34, 44], [104, 52], [110, 86], [96, 104], [40, 96]];
    poly2d(g, (s ? mirror(base, 256) : base).map(([x, y]) => [x * S, y * S]));
    g.fillStyle = ink; g.fill();
    g.strokeStyle = '#575f66'; g.lineWidth = 3 * S; g.stroke();
    const sh = [[44, 54], [92, 60], [92, 70], [44, 66]];
    poly2d(g, (s ? mirror(sh, 256) : sh).map(([x, y]) => [x * S, y * S]));
    g.fillStyle = 'rgba(160,180,200,0.22)'; g.fill();
  }

  // Brow line across the top.
  g.strokeStyle = '#8a9198'; g.lineWidth = 4 * S;
  g.beginPath();
  g.moveTo(26 * S, 36 * S);
  g.quadraticCurveTo(128 * S, 14 * S, 230 * S, 36 * S);
  g.stroke();

  // Nose / vocoder.
  poly2d(g, [[112, 60], [144, 60], [150, 122], [106, 122]].map(([x, y]) => [x * S, y * S]));
  g.fillStyle = '#171c21'; g.fill();
  g.strokeStyle = '#575f66'; g.lineWidth = 2.6 * S; g.stroke();

  // Cheek "tears".
  for (const s of [0, 1]) {
    for (let i = 0; i < 2; i++) {
      const base = [[52 + i * 16, 108], [64 + i * 16, 108], [60 + i * 16, 134], [50 + i * 16, 134]];
      poly2d(g, (s ? mirror(base, 256) : base).map(([x, y]) => [x * S, y * S]));
      g.fillStyle = ink; g.fill();
    }
  }

  // The frown.
  poly2d(g, [[86, 126], [170, 126], [162, 158], [94, 158]].map(([x, y]) => [x * S, y * S]));
  g.fillStyle = ink; g.fill();
  g.strokeStyle = '#575f66'; g.lineWidth = 3 * S; g.stroke();
  g.strokeStyle = '#c9ced3'; g.lineWidth = 3.4 * S;
  for (let i = 1; i < 6; i++) {
    const f = i / 6;
    g.beginPath();
    g.moveTo((86 + f * 84) * S, 128 * S);
    g.lineTo((94 + f * 68) * S, 156 * S);
    g.stroke();
  }
  // Chin seam.
  g.strokeStyle = '#7d848b'; g.lineWidth = 3 * S;
  g.beginPath();
  g.moveTo(70 * S, 172 * S);
  g.quadraticCurveTo(128 * S, 186 * S, 186 * S, 172 * S);
  g.stroke();
}

function trooperHelmet() {
  const kit = new Kit('trooper-helmet');
  const W = C.white;
  const G = C.darkBluishGray;

  // Skull: a closed shell — the whole head is inside.
  kit.cyl(0, 0.02, 0, 0.775, 0.72, W, { seg: HELMET_SEG });
  kit.cone(0, 0.74, 0, 0.775, 0.735, 0.16, W, { seg: HELMET_SEG });
  kit.cone(0, 0.90, 0, 0.735, 0.60, 0.16, W, { seg: HELMET_SEG });
  kit.cone(0, 1.06, 0, 0.60, 0.38, 0.13, W, { seg: HELMET_SEG });
  kit.sphere(0, 1.14, 0, 0.38, W, { seg: 14, scl: [1, 0.62, 1] });

  // Brow ridge over the lenses.
  shell(kit, 0.70, 0.10, 0.83, 0.70, -62 * DEG, 62 * DEG, W, { steps: 10 });
  kit.box(0, 0.66, -0.74, 0.74, 0.09, 0.20, W, { rot: [0.26, 0, 0] });

  // The "ears" / tank vents.
  kit.sym((s) => {
    kit.push().translate(s * 0.70, 0.24, -0.02).rotY(-s * 0.16);
    kit.box(0, 0, 0, 0.22, 0.40, 0.52, W, {});
    kit.box(s * 0.06, 0.06, -0.02, 0.14, 0.26, 0.40, 0x1a1f25, {});
    kit.pop();
  });

  // Vocoder bump.
  kit.box(0, 0.20, -0.72, 0.26, 0.24, 0.14, W, {});
  // Chin / jaw taper.
  kit.cone(0, -0.06, 0, 0.72, 0.775, 0.09, W, { seg: HELMET_SEG });
  kit.cone(0, -0.16, 0, 0.62, 0.72, 0.10, W, { seg: HELMET_SEG });
  // Neck seal.
  kit.cyl(0, -0.26, 0, 0.50, 0.11, 0x1a1f25, { seg: 14 });
  // Rear pipe detail.
  kit.box(0, 0.30, 0.72, 0.30, 0.44, 0.14, G, {});

  const g = kit.build({ name: 'trooperHelmet' });
  const tex = printTexture('chr:trooper-face', drawTrooperFace, 256, 224);
  const p = curvedPrint(tex, { r: 0.79, h: 0.70, arc: 2.05, yOffset: 0.42 });
  g.add(p);
  return g;
}

export function buildStormtrooper(opts = {}) {
  const fig = createMinifig({
    name: 'stormtrooper',
    skin: 0x14181d, torso: C.white, arms: C.white, hands: 0x14181d,
    legs: C.white, hips: 0x14181d, feet: C.white,
    torsoPrint: drawTrooperTorso, torsoKey: 'stormtrooper',
    legPrint: drawTrooperLegs, legKey: 'stormtrooper',
    headgear: trooperHelmet,
  });

  const blaster = createBlaster({ long: true });
  aimAccessory(blaster, -1.15, -0.26, 0.05);
  fig.userData.parts.handR.add(blaster);
  fig.userData.blaster = blaster;
  fig.userData.muzzle = blaster.userData.muzzle;

  fig.userData.pose({
    armR: 0.55, elbowR: 0.55, armROut: 0.10,
    armL: 0.45, elbowL: 0.80, armLOut: 0.10,
  });
  fig.userData.autoIdle = false;
  chainUpdate(fig, (t) => {
    if (!fig.userData.autoIdle) return;
    fig.userData.pose({ headTurn: Math.sin(t * 0.6) * 0.2 });
  });
  return fig;
}

// ============================================================ REBEL TROOPER ==

function drawRebelTrooperTorso(g, w, h) {
  const S = w / 256;
  g.clearRect(0, 0, w, h);
  // Open jacket over a lighter shirt.
  g.fillStyle = '#efe7d2';
  poly2d(g, [[100 * S, 4 * S], [156 * S, 4 * S], [146 * S, 120 * S], [110 * S, 120 * S]]);
  g.fill();
  g.strokeStyle = '#7d6f52'; g.lineWidth = 5 * S;
  g.beginPath();
  g.moveTo(100 * S, 4 * S); g.lineTo(110 * S, 150 * S);
  g.moveTo(156 * S, 4 * S); g.lineTo(146 * S, 150 * S);
  g.stroke();
  // Collar.
  g.fillStyle = '#c9b88f';
  poly2d(g, [[86 * S, 0], [128 * S, 34 * S], [170 * S, 0]]);
  g.fill();
  g.strokeStyle = '#7d6f52'; g.lineWidth = 4 * S; g.stroke();

  // Bandolier / harness.
  g.strokeStyle = '#4a3a26'; g.lineWidth = 16 * S; g.lineCap = 'butt';
  g.beginPath();
  g.moveTo(56 * S, 20 * S); g.lineTo(180 * S, 168 * S);
  g.stroke();
  g.fillStyle = '#8b9296';
  for (let i = 0; i < 4; i++) {
    rr(g, (64 + i * 30) * S, (34 + i * 34) * S, 14 * S, 12 * S, 2 * S);
    g.fill();
  }

  // Belt.
  g.fillStyle = '#3a2f20';
  g.fillRect(58 * S, 180 * S, 140 * S, 26 * S);
  g.fillStyle = '#b4a072';
  rr(g, 112 * S, 184 * S, 30 * S, 18 * S, 3 * S); g.fill();
  // Pockets.
  g.strokeStyle = '#8d7d5c'; g.lineWidth = 4 * S;
  rr(g, 70 * S, 132 * S, 34 * S, 36 * S, 4 * S); g.stroke();
  rr(g, 152 * S, 132 * S, 34 * S, 36 * S, 4 * S); g.stroke();
}

function rebelHelmet() {
  const kit = new Kit('rebel-helmet');
  const T = C.darkTan;
  const T2 = lighten(C.darkTan, 0.12);

  // Rounded shell, open face.
  shell(kit, 0.30, 0.42, 0.79, 0.625, 52 * DEG, 308 * DEG, T, { steps: 16 });
  shell(kit, 0.70, 0.14, 0.80, 0.62, 0, Math.PI * 2, T2, { steps: 20 });
  kit.cone(0, 0.835, 0, 0.795, 0.70, 0.16, T, { seg: HELMET_SEG });
  kit.cone(0, 0.99, 0, 0.70, 0.50, 0.14, T, { seg: HELMET_SEG });
  kit.cone(0, 1.12, 0, 0.50, 0.26, 0.10, T, { seg: HELMET_SEG });
  kit.sphere(0, 1.20, 0, 0.26, T, { seg: 14, scl: [1, 0.7, 1] });

  // Brim over the brow.
  shell(kit, 0.62, 0.10, 0.96, 0.70, -58 * DEG, 58 * DEG, T2, { steps: 12, rot: [0.16, 0, 0] });
  // Rear neck flap.
  shell(kit, 0.16, 0.18, 0.83, 0.64, 118 * DEG, 242 * DEG, T, { steps: 10 });

  // Chin strap.
  kit.sym((s) => {
    kit.box(s * 0.63, -0.12, 0.02, 0.07, 0.46, 0.16, C.reddishBrown, { rot: [0, 0, s * 0.12] });
  });
  kit.box(0, -0.16, -0.34, 1.05, 0.09, 0.16, C.reddishBrown, { rot: [-0.5, 0, 0] });

  // Comms box on the side.
  kit.box(-0.66, 0.34, -0.24, 0.14, 0.20, 0.24, C.darkBluishGray, {});
  return kit.build({ name: 'rebelHelmet' });
}

export function buildRebelTrooper(opts = {}) {
  const fig = createMinifig({
    name: 'rebel-trooper',
    skin: C.yellow, torso: C.tan, arms: C.tan, hands: C.reddishBrown,
    legs: C.sandBlue, hips: C.sandBlue, feet: C.reddishBrown,
    face: (g, w, hh) => drawFace(g, w, hh, { mouth: 'flat', brows: true, angry: true }),
    faceKey: 'rebel-trooper',
    torsoPrint: drawRebelTrooperTorso, torsoKey: 'rebel-trooper',
    headgear: rebelHelmet,
  });

  const blaster = createBlaster({});
  aimAccessory(blaster, -1.05, -0.26, 0.05);
  fig.userData.parts.handR.add(blaster);
  fig.userData.blaster = blaster;
  fig.userData.muzzle = blaster.userData.muzzle;

  fig.userData.pose({
    armR: 0.75, elbowR: 0.50, armROut: 0.12,
    armL: 0.30, elbowL: 0.70, armLOut: 0.14,
  });
  fig.userData.autoIdle = false;
  chainUpdate(fig, (t) => {
    if (fig.userData.autoIdle) fig.userData.pose({ headTurn: Math.sin(t * 0.7) * 0.22 });
  });
  return fig;
}

// ===================================================================== LEIA ==

function drawLeiaTorso(g, w, h) {
  const S = w / 256;
  g.clearRect(0, 0, w, h);
  // Robe collar and centre seam.
  g.strokeStyle = '#c3c6c0'; g.lineWidth = 5 * S; g.lineJoin = 'round';
  poly2d(g, [[76 * S, 2 * S], [128 * S, 62 * S], [180 * S, 2 * S]]);
  g.stroke();
  g.beginPath();
  g.moveTo(128 * S, 62 * S); g.lineTo(128 * S, 190 * S);
  g.stroke();
  // Soft folds.
  g.strokeStyle = '#d5d8d2'; g.lineWidth = 3.5 * S;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(128 * S + s * 40 * S, 40 * S);
    g.quadraticCurveTo(128 * S + s * 54 * S, 120 * S, 128 * S + s * 40 * S, 196 * S);
    g.stroke();
  }
  // Silver belt.
  g.fillStyle = '#b9bec2';
  g.fillRect(66 * S, 176 * S, 124 * S, 20 * S);
  g.strokeStyle = '#7f868b'; g.lineWidth = 3 * S;
  g.strokeRect(66 * S, 176 * S, 124 * S, 20 * S);
  g.fillStyle = '#8b9296';
  for (let i = 0; i < 5; i++) {
    rr(g, (76 + i * 24) * S, 180 * S, 14 * S, 12 * S, 2 * S);
    g.fill();
  }
  // Shoulder shading.
  g.fillStyle = 'rgba(120,130,140,0.16)';
  g.fillRect(0, 0, 46 * S, h);
  g.fillRect(210 * S, 0, 46 * S, h);
}

function leiaHair() {
  const kit = new Kit('leia-hair');
  const HAIR = 0x3a2417;
  // Cap over the crown and down the back.
  kit.cyl(0, 0.60, 0, 0.665, 0.50, HAIR, { seg: 20 });
  kit.cone(0, 1.10, 0, 0.665, 0.50, 0.14, HAIR, { seg: 20 });
  kit.sphere(0, 1.16, 0, 0.52, HAIR, { seg: 16, scl: [1.22, 0.55, 1.22] });
  shell(kit, 0.10, 0.52, 0.70, 0.60, 62 * DEG, 298 * DEG, HAIR, { steps: 16 });
  // Fringe over the brow.
  shell(kit, 0.72, 0.16, 0.70, 0.59, -66 * DEG, 66 * DEG, HAIR, { steps: 12 });
  plateXY(kit, 0, 0.66, -0.615, [[-0.34, 0.14], [0.34, 0.14], [0.26, -0.02], [0, -0.06], [-0.26, -0.02]], 0.07, HAIR);

  // The buns.
  kit.sym((s) => {
    kit.cyl(s * 0.60, 0.42, 0.02, 0.34, 0.22, HAIR, { axis: 'x', seg: 16, rot: [0, 0, s * -Math.PI / 2] });
    kit.torus(s * 0.74, 0.42, 0.02, 0.235, 0.075, lighten(HAIR, 0.10),
      { seg: 16, tseg: 8, rot: [0, s * Math.PI / 2, 0] });
    kit.torus(s * 0.76, 0.42, 0.02, 0.115, 0.065, lighten(HAIR, 0.05),
      { seg: 14, tseg: 8, rot: [0, s * Math.PI / 2, 0] });
  });
  return kit.build({ name: 'leiaHair' });
}

function leiaRobe() {
  const kit = new Kit('leia-robe');
  const W = C.white;
  // Tapered dress in courses, like stacked cone bricks.
  kit.cone(0, 0.00, 0, 0.98, 0.90, 0.30, W, { seg: 22 });
  kit.cone(0, 0.30, 0, 0.90, 0.80, 0.40, W, { seg: 22 });
  kit.cone(0, 0.70, 0, 0.80, 0.70, 0.42, W, { seg: 22 });
  kit.cone(0, 1.12, 0, 0.70, 0.62, 0.44, W, { seg: 22 });
  kit.cone(0, 1.56, 0, 0.62, 0.58, 0.38, W, { seg: 22 });
  // Hem.
  kit.cyl(0, 0.0, 0, 1.00, 0.09, lighten(W, 0.0), { seg: 22 });
  // Vertical folds.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.1;
    kit.push().rotY(a);
    kit.box(0, 0.06, -0.92, 0.10, 1.70, 0.10, 0xe2e4e0, { rot: [0.055, 0, 0] });
    kit.pop();
  }
  // Toes peeking out.
  kit.sym((s) => kit.box(s * 0.30, 0.0, -0.72, 0.34, 0.16, 0.34, C.white, {}));
  return kit.build({ name: 'leiaRobe' });
}

export function buildLeia(opts = {}) {
  const fig = createMinifig({
    name: 'leia',
    skin: C.yellow, torso: C.white, arms: C.white, hands: C.yellow,
    legs: C.white, hips: C.white,
    face: (g, w, h) => drawFace(g, w, h, { mouth: 'flat', brows: true, eyeStyle: 'oval' }),
    faceKey: 'leia',
    torsoPrint: drawLeiaTorso, torsoKey: 'leia-robe',
    headgear: leiaHair,
  });

  fig.userData.parts.legs.visible = false;
  const robe = leiaRobe();
  fig.add(robe);
  fig.userData.robe = robe;

  if (opts.blaster !== false) {
    const bl = createBlaster({ color: C.darkBluishGray });
    bl.scale.setScalar(0.78);
    aimAccessory(bl, -1.30, -0.24, 0.04);
    fig.userData.parts.handR.add(bl);
    fig.userData.blaster = bl;
    fig.userData.muzzle = bl.userData.muzzle;
  }

  fig.userData.pose({
    armR: 0.30, elbowR: 0.72, armROut: 0.10,
    armL: -0.05, elbowL: 0.45, armLOut: 0.12,
  });
  fig.userData.autoIdle = false;
  chainUpdate(fig, (t) => {
    if (!fig.userData.autoIdle) return;
    fig.userData.pose({ headTurn: Math.sin(t * 0.5) * 0.18, armL: -0.05 + Math.sin(t * 1.1) * 0.04 });
  });
  return fig;
}

// ==================================================================== R2-D2 ==

const R2 = {
  bodyR: 0.86,
  bodyBot: 0.95,
  bodyTop: 2.55,
};

function r2BodyPanels(kit) {
  const R = R2.bodyR;
  const blue = SW.r2Blue;
  const dark = 0x2a3038;

  // Vertical panel seams all the way round.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    kit.push().rotY(a).translate(0, R2.bodyBot + 0.06, -(R - 0.015));
    kit.box(0, 0, 0, 0.05, 1.44, 0.05, 0x9aa1a6, {});
    kit.pop();
  }
  // Silver waist band + shoulder band.
  kit.cyl(0, R2.bodyBot - 0.02, 0, R + 0.015, 0.13, SW.r2Silver, { seg: 22, finish: FINISH.metal });
  kit.cyl(0, 2.36, 0, R + 0.02, 0.10, SW.r2Silver, { seg: 22, finish: FINISH.metal });
  kit.cyl(0, 2.46, 0, R + 0.005, 0.10, 0x9aa1a6, { seg: 22 });

  // Front detail stack.
  const front = (a, y, w, hgt, col, d = 0.05) => {
    kit.push().rotY(a).translate(0, y, -(R - 0.01));
    kit.box(0, 0, 0, w, hgt, d, col, {});
    kit.pop();
  };
  front(0, 2.02, 0.46, 0.28, blue);
  front(0, 1.70, 0.30, 0.26, blue);
  front(0, 1.36, 0.52, 0.22, dark);
  front(0, 1.12, 0.34, 0.16, blue);
  front(0.42, 1.86, 0.34, 0.44, blue);
  front(-0.42, 1.86, 0.34, 0.44, blue);
  front(0.42, 1.30, 0.30, 0.30, dark);
  front(-0.42, 1.30, 0.30, 0.30, dark);
  front(0.86, 1.60, 0.34, 0.62, blue);
  front(-0.86, 1.60, 0.34, 0.62, blue);
  front(Math.PI, 1.60, 0.40, 0.70, blue);
  front(Math.PI + 0.7, 1.50, 0.34, 0.50, dark);
  front(Math.PI - 0.7, 1.50, 0.34, 0.50, dark);

  // The little red logic port and the power couplings.
  kit.push().rotY(0).translate(0, 2.02, -(R + 0.02));
  kit.box(-0.14, 0.06, 0, 0.11, 0.11, 0.04, C.red, {});
  kit.box(0.10, 0.06, 0, 0.13, 0.11, 0.04, 0xd8dce0, {});
  kit.pop();
  kit.sym((s) => {
    kit.push().rotY(s * 0.30).translate(0, 1.02, -(R - 0.02));
    kit.cyl(0, 0.06, 0, 0.09, 0.09, C.darkBluishGray, { axis: 'z', seg: 10 });
    kit.pop();
  });
}

function r2Leg(kit, side) {
  const white = SW.r2White;
  const silver = SW.r2Silver;
  const x = side * 1.06;
  // Shoulder hub.
  kit.cyl(side * 0.80, 2.06, 0, 0.30, 0.30, silver, { axis: 'x', seg: 16, rot: [0, 0, side * -Math.PI / 2], finish: FINISH.metal });
  kit.cyl(side * 1.06, 2.06, 0, 0.20, 0.06, SW.r2Blue, { axis: 'x', seg: 14, rot: [0, 0, side * -Math.PI / 2] });
  // Upper leg.
  kit.box(x, 1.10, 0, 0.36, 1.10, 0.62, white, {});
  kit.box(x, 1.62, -0.30, 0.38, 0.52, 0.10, SW.r2Blue, {});
  kit.box(x, 1.20, 0.30, 0.30, 0.90, 0.10, silver, {});
  // Ankle.
  kit.box(x, 0.86, 0, 0.30, 0.28, 0.46, C.darkBluishGray, {});
  // Skirted foot.
  polyXZ(kit, x, 0.30, 0, [[-0.26, -0.58], [0.26, -0.58], [0.30, -0.12], [0.30, 0.42], [-0.30, 0.42], [-0.30, -0.12]],
    0.30, white, { key: `r2foot${side}` });
  polyXZ(kit, x, 0.10, 0, [[-0.30, -0.62], [0.30, -0.62], [0.34, -0.10], [0.34, 0.46], [-0.34, 0.46], [-0.34, -0.10]],
    0.22, silver, { key: `r2shoe${side}` });
  kit.box(x, 0.28, -0.36, 0.20, 0.14, 0.12, SW.r2Blue, {});
  // Drive wheels.
  for (let i = 0; i < 3; i++) {
    kit.cyl(x - 0.16, 0.10, -0.34 + i * 0.34, 0.10, 0.32, 0x1e2329,
      { axis: 'x', seg: 10, rot: [0, 0, -Math.PI / 2], finish: FINISH.matte });
  }
}

function r2Dome() {
  const kit = new Kit('r2-dome');
  const white = SW.r2White;
  const blue = SW.r2Blue;
  const R = R2.bodyR;
  kit.cyl(0, 0, 0, R, 0.14, SW.r2Silver, { seg: 22, finish: FINISH.metal });
  kit.cone(0, 0.14, 0, R, 0.79, 0.16, white, { seg: 22 });
  kit.cone(0, 0.30, 0, 0.79, 0.66, 0.16, white, { seg: 22 });
  kit.cone(0, 0.46, 0, 0.66, 0.46, 0.14, white, { seg: 22 });
  kit.cone(0, 0.60, 0, 0.46, 0.24, 0.11, white, { seg: 22 });
  kit.sphere(0, 0.68, 0, 0.24, white, { seg: 14, scl: [1, 0.66, 1] });

  // Blue dome panels around the skirt of the dome.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    kit.push().rotY(a).translate(0, 0.16, -(R - 0.03)).rotX(-0.18);
    kit.box(0, 0, 0, 0.34, 0.24, 0.06, blue, {});
    kit.pop();
    kit.push().rotY(a + Math.PI / 8).translate(0, 0.34, -0.70).rotX(-0.5);
    kit.box(0, 0, 0, 0.22, 0.16, 0.05, blue, {});
    kit.pop();
  }
  // Radar eye housing.
  kit.push().translate(0, 0.16, -(R - 0.10)).rotX(-0.12);
  kit.box(0, 0.02, -0.02, 0.42, 0.34, 0.20, 0x1b2026, {});
  kit.cyl(0, 0.19, -0.16, 0.115, 0.09, 0x0d1013, { axis: 'z', seg: 14, rot: [-Math.PI / 2, 0, 0] });
  kit.cyl(0, 0.19, -0.20, 0.085, 0.05, SW.blasterRed, { axis: 'z', seg: 14, rot: [-Math.PI / 2, 0, 0], finish: FINISH.glow, emissive: 2.2 });
  kit.cyl(0, 0.19, -0.16, 0.05, 0.07, C.chromeSilver, { axis: 'z', seg: 10, rot: [-Math.PI / 2, 0, 0], finish: FINISH.metal });
  kit.box(0.16, 0.06, -0.14, 0.07, 0.07, 0.06, C.chromeSilver, { finish: FINISH.metal });
  kit.pop();

  // Holo projector + periscope nubs on the crown.
  kit.cyl(0, 0.74, -0.10, 0.10, 0.10, C.flatSilver, { seg: 12, finish: FINISH.metal });
  kit.cyl(0, 0.83, -0.10, 0.055, 0.05, C.transLightBlue, { seg: 12, finish: FINISH.trans, opacity: 0.7 });
  kit.cyl(0, 0.72, 0.16, 0.06, 0.14, C.flatSilver, { seg: 10, finish: FINISH.metal });
  kit.box(0, 0.66, 0.34, 0.14, 0.12, 0.10, C.darkBluishGray, {});
  return kit.build({ name: 'r2Dome' });
}

function r2CentreLeg() {
  const kit = new Kit('r2-centre-leg');
  kit.box(0, 0.30, -0.06, 0.32, 0.78, 0.42, SW.r2White, {});
  kit.box(0, 0.44, -0.28, 0.22, 0.44, 0.06, SW.r2Blue, {});
  kit.box(0, 0.24, 0, 0.26, 0.12, 0.52, C.darkBluishGray, {});
  polyXZ(kit, 0, 0.06, -0.06, [[-0.26, -0.52], [0.26, -0.52], [0.30, 0.0], [0.30, 0.36], [-0.30, 0.36], [-0.30, 0.0]],
    0.20, SW.r2Silver, { key: 'r2cfoot' });
  kit.cyl(-0.18, 0.05, -0.22, 0.09, 0.36, 0x1e2329, { axis: 'x', seg: 10, rot: [0, 0, -Math.PI / 2], finish: FINISH.matte });
  kit.cyl(-0.18, 0.05, 0.16, 0.09, 0.36, 0x1e2329, { axis: 'x', seg: 10, rot: [0, 0, -Math.PI / 2], finish: FINISH.matte });
  return kit.build({ name: 'r2CentreLeg' });
}

/**
 * Astromech. ~3.4 units tall.
 *   userData.dome                 the rotating dome group
 *   userData.setCentreLeg(bool)   extend / retract the third leg
 *   userData.points.holoProjector local-space origin of the hologram beam
 */
export function buildR2D2(opts = {}) {
  const root = new THREE.Group();
  root.name = 'r2d2';

  const kit = new Kit('r2-body');
  kit.cyl(0, R2.bodyBot, 0, R2.bodyR, R2.bodyTop - R2.bodyBot, SW.r2White, { seg: 22 });
  r2BodyPanels(kit);
  r2Leg(kit, 1);
  r2Leg(kit, -1);
  root.add(kit.build({ name: 'r2Body' }));

  const dome = r2Dome();
  dome.position.y = R2.bodyTop;
  root.add(dome);

  const centre = r2CentreLeg();
  centre.position.set(0, 0, -0.10);
  root.add(centre);

  const holo = new THREE.Vector3(0, R2.bodyTop + 0.86, -0.10);
  root.userData.points = { holoProjector: holo, dome: new THREE.Vector3(0, R2.bodyTop + 0.4, 0) };
  root.userData.dome = dome;
  root.userData.centreLeg = centre;
  root.userData.eye = dome;

  let legT = opts.centreLeg === false ? 0 : 1;   // 0 retracted, 1 extended
  let legTarget = legT;
  root.userData.setCentreLeg = (extended, instant = false) => {
    legTarget = extended ? 1 : 0;
    if (instant) legT = legTarget;
  };
  const applyLeg = () => {
    centre.position.y = (1 - legT) * 0.92;
    centre.visible = legT > 0.02;
    root.position.y = (root.userData.baseY || 0);
  };
  applyLeg();

  root.userData.autoIdle = true;
  root.userData.update = (t, dt) => {
    if (legT !== legTarget) {
      const step = Math.min(1, (dt || 0.016) * 1.6);
      legT += (legTarget - legT) * step;
      if (Math.abs(legTarget - legT) < 0.004) legT = legTarget;
      applyLeg();
    }
    if (!root.userData.autoIdle) return;
    // Dome swivel: a slow sweep with a couple of quick snaps.
    const sweep = Math.sin(t * 0.55) * 0.75 + Math.sin(t * 0.17 + 1.1) * 0.45;
    dome.rotation.y = sweep;
    // Waddle: astromechs never stand quite still.
    root.rotation.z = Math.sin(t * 1.9) * 0.022;
    root.position.y = (root.userData.baseY || 0) + Math.abs(Math.sin(t * 1.9)) * 0.012;
  };
  return root;
}

// ==================================================================== C-3PO ==

function drawProtocolFace(g, w, h) {
  const S = w / 192;
  g.fillStyle = '#c99a2e';
  g.fillRect(0, 0, w, h);
  const grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0.0, '#8f6a1c');
  grad.addColorStop(0.18, '#e8bc55');
  grad.addColorStop(0.5, '#c99a2e');
  grad.addColorStop(0.82, '#e8bc55');
  grad.addColorStop(1.0, '#8f6a1c');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);

  // Brow plate.
  g.fillStyle = '#a87c1e';
  poly2d(g, [[10, 26], [182, 26], [176, 56], [16, 56]].map(([x, y]) => [x * S, y * S]));
  g.fill();
  g.strokeStyle = '#6d4c10'; g.lineWidth = 2.6 * S; g.stroke();
  g.strokeStyle = '#f6d98a'; g.lineWidth = 2 * S;
  g.beginPath(); g.moveTo(14 * S, 30 * S); g.lineTo(178 * S, 30 * S); g.stroke();

  // Eye sockets.
  for (const s of [-1, 1]) {
    const cx = 96 * S + s * 36 * S;
    g.beginPath();
    g.arc(cx, 78 * S, 22 * S, 0, 7);
    g.fillStyle = '#26200f'; g.fill();
    g.strokeStyle = '#8f6a1c'; g.lineWidth = 4 * S; g.stroke();
    g.beginPath();
    g.arc(cx, 78 * S, 13 * S, 0, 7);
    g.fillStyle = '#fbe9a8'; g.fill();
    g.beginPath();
    g.arc(cx - 4 * S, 74 * S, 4.5 * S, 0, 7);
    g.fillStyle = '#ffffff'; g.fill();
  }

  // Nose ridge.
  g.strokeStyle = '#8f6a1c'; g.lineWidth = 3 * S;
  g.beginPath();
  g.moveTo(96 * S, 68 * S); g.lineTo(96 * S, 118 * S);
  g.stroke();
  g.strokeStyle = '#f6d98a'; g.lineWidth = 1.6 * S;
  g.beginPath();
  g.moveTo(99 * S, 70 * S); g.lineTo(99 * S, 116 * S);
  g.stroke();

  // Mouth grille.
  poly2d(g, [[58, 126], [134, 126], [128, 156], [64, 156]].map(([x, y]) => [x * S, y * S]));
  g.fillStyle = '#241d0d'; g.fill();
  g.strokeStyle = '#8f6a1c'; g.lineWidth = 3.4 * S; g.stroke();
  g.strokeStyle = '#c99a2e'; g.lineWidth = 3.6 * S;
  for (let i = 1; i < 7; i++) {
    const f = i / 7;
    g.beginPath();
    g.moveTo((58 + f * 76) * S, 128 * S);
    g.lineTo((64 + f * 64) * S, 154 * S);
    g.stroke();
  }

  // Cheek plate seams.
  g.strokeStyle = '#8f6a1c'; g.lineWidth = 2.6 * S;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(96 * S + s * 62 * S, 58 * S);
    g.quadraticCurveTo(96 * S + s * 70 * S, 110 * S, 96 * S + s * 46 * S, 166 * S);
    g.stroke();
  }
  // Chin.
  g.strokeStyle = '#6d4c10'; g.lineWidth = 3 * S;
  g.beginPath();
  g.moveTo(52 * S, 168 * S);
  g.quadraticCurveTo(96 * S, 182 * S, 140 * S, 168 * S);
  g.stroke();
}

function drawProtocolTorso(g, w, h) {
  const S = w / 256;
  g.clearRect(0, 0, w, h);
  const seam = '#7a5713';
  const hi = '#f0cf7e';

  // Collar ring.
  g.strokeStyle = seam; g.lineWidth = 6 * S;
  g.beginPath();
  g.moveTo(74 * S, 10 * S);
  g.quadraticCurveTo(128 * S, 40 * S, 182 * S, 10 * S);
  g.stroke();

  // Chest plates.
  g.lineWidth = 5 * S;
  g.strokeStyle = seam;
  rr(g, 62 * S, 30 * S, 60 * S, 74 * S, 8 * S); g.stroke();
  rr(g, 134 * S, 30 * S, 60 * S, 74 * S, 8 * S); g.stroke();
  g.strokeStyle = hi; g.lineWidth = 2.4 * S;
  rr(g, 66 * S, 34 * S, 52 * S, 66 * S, 6 * S); g.stroke();
  rr(g, 138 * S, 34 * S, 52 * S, 66 * S, 6 * S); g.stroke();

  // Sternum column.
  g.strokeStyle = seam; g.lineWidth = 5 * S;
  g.beginPath();
  g.moveTo(128 * S, 22 * S); g.lineTo(128 * S, 118 * S);
  g.stroke();

  // Lower abdominal plate.
  g.strokeStyle = seam; g.lineWidth = 5 * S;
  rr(g, 74 * S, 112 * S, 108 * S, 44 * S, 6 * S); g.stroke();

  // Exposed wiring at the waist.
  g.fillStyle = '#221c12';
  rr(g, 66 * S, 160 * S, 124 * S, 52 * S, 6 * S); g.fill();
  const wires = ['#d0342a', '#2f6fd0', '#e2c23c', '#4aa64f', '#d8d8d8', '#b46a00'];
  g.lineCap = 'round';
  for (let i = 0; i < wires.length; i++) {
    g.strokeStyle = wires[i];
    g.lineWidth = 5 * S;
    g.beginPath();
    const y0 = (168 + i * 7) * S;
    g.moveTo(70 * S, y0);
    g.bezierCurveTo(110 * S, (y0 + (i % 2 ? 16 : -12)) * 1.0, 150 * S, (y0 + (i % 2 ? -12 : 16)) * 1.0, 186 * S, y0);
    g.stroke();
  }
  g.strokeStyle = seam; g.lineWidth = 4 * S;
  rr(g, 66 * S, 160 * S, 124 * S, 52 * S, 6 * S); g.stroke();
  // Hip plate below the wires.
  g.fillStyle = 'rgba(122,87,19,0.55)';
  g.fillRect(70 * S, 216 * S, 116 * S, 12 * S);
}

function protocolHead() {
  const kit = new Kit('c3po-head');
  const G = SW.protocolGold;
  const GD = SW.protocolGoldDark;
  // Crown plate and back-of-head shell.
  kit.cyl(0, 1.06, 0, 0.61, 0.10, G, { seg: 20 });
  kit.cone(0, 1.16, 0, 0.59, 0.42, 0.10, G, { seg: 20 });
  shell(kit, 0.30, 0.78, 0.655, 0.60, 74 * DEG, 286 * DEG, G, { steps: 14 });
  // Audio sensor discs.
  kit.sym((s) => {
    kit.cyl(s * 0.58, 0.56, 0.02, 0.22, 0.10, GD, { axis: 'x', seg: 16, rot: [0, 0, s * -Math.PI / 2] });
    kit.cyl(s * 0.68, 0.56, 0.02, 0.11, 0.05, C.flatSilver, { axis: 'x', seg: 12, rot: [0, 0, s * -Math.PI / 2], finish: FINISH.metal });
  });
  // Forehead crest.
  kit.box(0, 0.98, -0.44, 0.24, 0.12, 0.34, GD, { rot: [-0.2, 0, 0] });
  // Neck collar.
  kit.torus(0, 0.02, 0, 0.60, 0.075, GD, { seg: 20, tseg: 8, rot: [Math.PI / 2, 0, 0] });
  return kit.build({ name: 'c3poHead' });
}

export function buildC3PO(opts = {}) {
  const G = SW.protocolGold;
  const fig = createMinifig({
    name: 'c3po',
    skin: G, torso: G, arms: G, hands: SW.protocolGoldDark,
    legs: G, hips: SW.protocolGoldDark, feet: SW.protocolGoldDark,
    face: drawProtocolFace, faceKey: 'c3po',
    torsoPrint: drawProtocolTorso, torsoKey: 'c3po',
    headgear: protocolHead,
  });

  // Canon detail: the lower right leg is a mismatched silver replacement.
  const legMesh = fig.userData.parts.legR.getObjectByName('legMesh');
  if (legMesh) {
    const silver = getMaterial(C.flatSilver, FINISH.metal);
    legMesh.traverse((o) => { if (o.isMesh) o.material = silver; });
  }

  // A few physical joints, since 3PO is all exposed hardware.
  const jointKit = new Kit('c3po-joints');
  jointKit.sym((s) => {
    jointKit.sphere(s * 0.72, 1.50, 0, 0.30, SW.protocolGoldDark, { seg: 14 });
  });
  const joints = jointKit.build({ name: 'c3poJoints' });
  fig.userData.parts.torso.add(joints);

  fig.userData.pose({
    armL: 0.16, armR: 0.16, elbowL: 0.72, elbowR: 0.72,
    armLOut: 0.16, armROut: 0.16,
  });

  fig.userData.autoIdle = true;
  const step = (x, n) => Math.round(x * n) / n;
  chainUpdate(fig, (t) => {
    if (!fig.userData.autoIdle) return;
    // Servo idle: motion arrives in discrete steps, with a settle wobble.
    const turn = step(Math.sin(t * 0.62), 3) * 0.26 + Math.sin(t * 9.0) * 0.008;
    const arm = step(Math.sin(t * 0.45 + 1.0), 2) * 0.10;
    fig.userData.pose({
      headTurn: turn,
      headTilt: step(Math.sin(t * 0.31), 2) * 0.06,
      armL: 0.16 + arm, armR: 0.16 - arm,
      elbowL: 0.72 + step(Math.sin(t * 0.7), 2) * 0.10,
      elbowR: 0.72 - step(Math.sin(t * 0.7 + 2.0), 2) * 0.10,
    });
  });
  return fig;
}

// =============================================================== LUKE PILOT ==

function drawPilotTorso(g, w, h) {
  const S = w / 256;
  g.clearRect(0, 0, w, h);
  const strap = '#6e7276';
  const ink = '#2b3036';

  // Flight harness.
  g.strokeStyle = strap; g.lineWidth = 15 * S; g.lineCap = 'butt';
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(128 * S + s * 86 * S, 2 * S);
    g.lineTo(128 * S + s * 44 * S, 210 * S);
    g.stroke();
  }
  g.strokeStyle = '#9aa1a6'; g.lineWidth = 3 * S;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(128 * S + s * 80 * S, 2 * S);
    g.lineTo(128 * S + s * 38 * S, 210 * S);
    g.stroke();
  }
  // Chest strap.
  g.strokeStyle = strap; g.lineWidth = 12 * S;
  g.beginPath();
  g.moveTo(62 * S, 150 * S); g.lineTo(194 * S, 150 * S);
  g.stroke();
  // Collar of the flight suit.
  g.fillStyle = '#e8e9e6';
  poly2d(g, [[80 * S, 0], [128 * S, 34 * S], [176 * S, 0]]);
  g.fill();
  g.strokeStyle = '#b9bec2'; g.lineWidth = 4 * S; g.stroke();
  // Belt.
  g.fillStyle = ink;
  g.fillRect(58 * S, 196 * S, 140 * S, 26 * S);
  g.fillStyle = '#8b9296';
  rr(g, 110 * S, 200 * S, 34 * S, 18 * S, 3 * S); g.fill();
  // Rebel crest on the shoulder.
  g.fillStyle = '#c91a09';
  g.beginPath();
  g.moveTo(206 * S, 46 * S);
  g.lineTo(224 * S, 76 * S);
  g.lineTo(206 * S, 68 * S);
  g.lineTo(188 * S, 76 * S);
  g.closePath();
  g.fill();
}

function drawPilotLegs(g, w, h) {
  const S = w / 128;
  g.clearRect(0, 0, w, h);
  g.strokeStyle = '#6e7276'; g.lineWidth = 9 * S;
  g.beginPath();
  g.moveTo(16 * S, 40 * S); g.lineTo(112 * S, 40 * S);
  g.stroke();
  g.fillStyle = '#3b444c';
  rr(g, 78 * S, 46 * S, 34 * S, 44 * S, 5 * S); g.fill();
  g.strokeStyle = '#8b9296'; g.lineWidth = 3 * S; g.stroke();
  g.strokeStyle = '#6e7276'; g.lineWidth = 7 * S;
  g.beginPath();
  g.moveTo(18 * S, 118 * S); g.lineTo(110 * S, 118 * S);
  g.stroke();
  g.fillStyle = '#2b2015';
  g.fillRect(16 * S, 156 * S, 96 * S, 36 * S);
}

function drawPilotHelmetPrint(g, w, h) {
  const S = w / 256;
  g.clearRect(0, 0, w, h);
  // Centre stripe block: red bar between two grey bars, the classic markings.
  g.fillStyle = '#8b9296';
  g.fillRect(96 * S, 0, 64 * S, 96 * S);
  g.fillStyle = '#c91a09';
  g.fillRect(110 * S, 0, 36 * S, 96 * S);
  g.fillStyle = '#e8e9e6';
  g.fillRect(122 * S, 0, 12 * S, 96 * S);
  // Angular side flashes.
  for (const s of [0, 1]) {
    const base = [[26, 8], [78, 8], [66, 74], [30, 74]];
    poly2d(g, (s ? mirror(base, 256) : base).map(([x, y]) => [x * S, y * S]));
    g.fillStyle = '#c91a09'; g.fill();
    const in2 = [[36, 18], [68, 18], [60, 64], [40, 64]];
    poly2d(g, (s ? mirror(in2, 256) : in2).map(([x, y]) => [x * S, y * S]));
    g.fillStyle = '#f2cd37'; g.fill();
  }
  // Lower rim band.
  g.fillStyle = '#3b444c';
  g.fillRect(0, 100 * S, w, 14 * S);
}

function pilotHelmet() {
  const kit = new Kit('pilot-helmet');
  const W = C.white;
  const G = C.lightBluishGray;

  shell(kit, 0.20, 0.46, 0.80, 0.625, 50 * DEG, 310 * DEG, W, { steps: 16 });
  shell(kit, 0.64, 0.16, 0.815, 0.62, 0, Math.PI * 2, W, { steps: 20 });
  kit.cone(0, 0.79, 0, 0.815, 0.74, 0.16, W, { seg: HELMET_SEG });
  kit.cone(0, 0.95, 0, 0.74, 0.56, 0.15, W, { seg: HELMET_SEG });
  kit.cone(0, 1.10, 0, 0.56, 0.30, 0.11, W, { seg: HELMET_SEG });
  kit.sphere(0, 1.17, 0, 0.30, W, { seg: 14, scl: [1, 0.68, 1] });

  // Brow visor lip.
  shell(kit, 0.58, 0.09, 0.99, 0.72, -56 * DEG, 56 * DEG, G, { steps: 12, rot: [0.2, 0, 0] });
  // Ear boxes with comms gear.
  kit.sym((s) => {
    kit.push().translate(s * 0.72, 0.16, -0.02).rotY(-s * 0.12);
    kit.box(0, 0, 0, 0.22, 0.40, 0.54, G, {});
    kit.box(s * 0.06, 0.08, -0.04, 0.14, 0.22, 0.34, 0x2b3036, {});
    kit.cyl(s * 0.08, 0.20, 0.10, 0.10, 0.09, C.darkBluishGray, { axis: 'x', seg: 10, rot: [0, 0, s * -Math.PI / 2] });
    kit.pop();
  });
  // Chin cup + strap.
  shell(kit, 0.04, 0.18, 0.78, 0.60, 118 * DEG, 242 * DEG, W, { steps: 10 });
  kit.sym((s) => kit.box(s * 0.63, -0.12, 0.06, 0.07, 0.34, 0.16, 0x2b3036, {}));
  kit.box(0, -0.14, -0.30, 1.02, 0.09, 0.16, 0x2b3036, { rot: [-0.45, 0, 0] });
  // Mic boom.
  kit.box(-0.52, 0.10, -0.44, 0.07, 0.07, 0.42, 0x2b3036, { rot: [0, 0.5, 0] });
  kit.sphere(-0.28, 0.08, -0.60, 0.09, 0x2b3036, { seg: 10 });

  const g = kit.build({ name: 'pilotHelmet' });
  const tex = printTexture('chr:pilot-helmet', drawPilotHelmetPrint, 256, 128);
  g.add(curvedPrint(tex, { r: 0.83, h: 0.56, arc: 2.4, yOffset: 0.90 }));
  return g;
}

function pilotChestBox() {
  const kit = new Kit('pilot-chestbox');
  const W = C.white;
  kit.box(0, 0.72, -0.44, 0.86, 0.50, 0.20, W, {});
  kit.box(0, 1.22, -0.42, 0.62, 0.14, 0.16, C.lightBluishGray, {});
  kit.box(0, 0.66, -0.52, 0.34, 0.16, 0.06, 0x2b3036, {});
  kit.sym((s) => {
    kit.box(s * 0.30, 0.86, -0.52, 0.16, 0.16, 0.06, s > 0 ? C.red : C.darkBluishGray, {});
    kit.cyl(s * 0.42, 0.60, -0.34, 0.055, 0.34, 0x2b3036, { seg: 8, rot: [0.4, 0, s * 0.5] });
  });
  kit.box(0, 0.30, -0.44, 0.50, 0.16, 0.14, C.lightBluishGray, {});
  return kit.build({ name: 'pilotChestBox' });
}

export function buildLukePilot(opts = {}) {
  const fig = createMinifig({
    name: 'luke-pilot',
    skin: C.yellow, torso: C.orange, arms: C.orange, hands: C.lightBluishGray,
    legs: C.orange, hips: C.white, feet: 0x2b2015,
    face: (g, w, h) => drawFace(g, w, h, { mouth: 'flat', brows: true }),
    faceKey: 'luke-pilot',
    torsoPrint: drawPilotTorso, torsoKey: 'luke-pilot',
    legPrint: drawPilotLegs, legKey: 'luke-pilot',
    headgear: pilotHelmet,
  });
  fig.userData.parts.torso.add(pilotChestBox());

  fig.userData.pose({
    armL: 0.20, armR: 0.20, elbowL: 0.62, elbowR: 0.62, armLOut: 0.08, armROut: 0.08,
  });
  fig.userData.autoIdle = false;
  chainUpdate(fig, (t) => {
    if (fig.userData.autoIdle) fig.userData.idle(t, 0.7);
  });
  return fig;
}

// ===================================================================== JAWA ==

function drawJawaTorso(g, w, h) {
  const S = w / 256;
  g.clearRect(0, 0, w, h);
  // Bandolier.
  g.strokeStyle = '#3a2a18'; g.lineWidth = 26 * S;
  g.beginPath();
  g.moveTo(52 * S, 6 * S); g.lineTo(196 * S, 190 * S);
  g.stroke();
  g.strokeStyle = '#5b4324'; g.lineWidth = 4 * S;
  g.beginPath();
  g.moveTo(52 * S, 6 * S); g.lineTo(196 * S, 190 * S);
  g.stroke();
  // Pouches and canisters.
  for (let i = 0; i < 4; i++) {
    const x = (62 + i * 34) * S;
    const y = (34 + i * 42) * S;
    g.save();
    g.translate(x, y);
    g.rotate(0.9);
    g.fillStyle = i % 2 ? '#8b9296' : '#2b3036';
    rr(g, -10 * S, -13 * S, 20 * S, 26 * S, 3 * S); g.fill();
    g.strokeStyle = '#1b1b18'; g.lineWidth = 2.4 * S; g.stroke();
    g.restore();
  }
  // Robe folds.
  g.strokeStyle = 'rgba(30,20,10,0.5)'; g.lineWidth = 4 * S;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(128 * S + s * 66 * S, 10 * S);
    g.quadraticCurveTo(128 * S + s * 52 * S, 120 * S, 128 * S + s * 62 * S, 226 * S);
    g.stroke();
  }
}

function jawaHood() {
  const kit = new Kit('jawa-hood');
  const R1 = 0x4a3520;
  const R2c = 0x3d2b19;
  // Hood shell — open at the face, peaked at the crown.
  shell(kit, -0.10, 0.50, 0.86, 0.62, 56 * DEG, 304 * DEG, R1, { steps: 16 });
  shell(kit, 0.40, 0.40, 0.83, 0.62, 50 * DEG, 310 * DEG, R1, { steps: 16 });
  shell(kit, 0.80, 0.18, 0.80, 0.60, 0, Math.PI * 2, R1, { steps: 20 });
  kit.cone(0, 0.98, 0, 0.80, 0.62, 0.16, R1, { seg: HELMET_SEG });
  kit.cone(0, 1.14, 0, 0.62, 0.34, 0.18, R1, { seg: HELMET_SEG });
  kit.cone(0, 1.32, 0, 0.34, 0.10, 0.22, R2c, { seg: 12, rot: [-0.25, 0, 0] });
  // Brow of the hood, overhanging the face.
  shell(kit, 0.66, 0.16, 1.00, 0.66, -62 * DEG, 62 * DEG, R2c, { steps: 12, rot: [0.30, 0, 0] });
  plateXY(kit, 0, 0.60, -0.80, [[-0.46, 0.16], [0.46, 0.16], [0.30, -0.06], [-0.30, -0.06]], 0.10, R2c);
  // Shoulders of the robe.
  shell(kit, -0.34, 0.24, 0.94, 0.64, 40 * DEG, 320 * DEG, R1, { steps: 16, zScale: 0.9 });

  // Glowing eyes, deep in the hood shadow.
  kit.sym((s) => {
    kit.box(s * 0.19, 0.44, -0.60, 0.20, 0.16, 0.06, 0x120d07, {});
    kit.cyl(s * 0.19, 0.52, -0.62, 0.062, 0.05, 0xffe14a,
      { axis: 'z', seg: 10, rot: [-Math.PI / 2, 0, 0], finish: FINISH.glow, emissive: 3.6 });
  });
  return kit.build({ name: 'jawaHood' });
}

function jawaRobe() {
  const kit = new Kit('jawa-robe');
  const R1 = 0x4a3520;
  kit.cone(0, 0.00, 0, 1.05, 0.98, 0.34, R1, { seg: 20 });
  kit.cone(0, 0.34, 0, 0.98, 0.88, 0.42, R1, { seg: 20 });
  kit.cone(0, 0.76, 0, 0.88, 0.76, 0.44, R1, { seg: 20 });
  kit.cone(0, 1.20, 0, 0.76, 0.66, 0.44, R1, { seg: 20 });
  kit.cone(0, 1.64, 0, 0.66, 0.60, 0.34, R1, { seg: 20 });
  kit.cyl(0, 0.0, 0, 1.07, 0.10, 0x3d2b19, { seg: 20 });
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.2;
    kit.push().rotY(a);
    kit.box(0, 0.06, -0.99, 0.12, 1.80, 0.10, 0x543d24, { rot: [0.075, 0, 0] });
    kit.pop();
  }
  return kit.build({ name: 'jawaRobe' });
}

export function buildJawa(opts = {}) {
  const R1 = 0x4a3520;
  const fig = createMinifig({
    name: 'jawa',
    skin: 0x14100b, torso: R1, arms: R1, hands: 0x2a2118,
    legs: R1, hips: R1,
    torsoPrint: drawJawaTorso, torsoKey: 'jawa',
    headgear: jawaHood,
  });
  fig.userData.parts.legs.visible = false;
  const robe = jawaRobe();
  fig.add(robe);
  fig.userData.robe = robe;

  fig.userData.pose({
    armL: 0.28, armR: 0.28, elbowL: 0.90, elbowR: 0.90, armLOut: 0.10, armROut: 0.10,
  });

  // Jawas are small: about 3.4 units to the top of the hood.
  const s = opts.scale ?? 0.63;
  fig.scale.setScalar(s);
  fig.userData.figScale = s;
  fig.userData.autoIdle = false;
  chainUpdate(fig, (t) => {
    if (!fig.userData.autoIdle) return;
    fig.userData.pose({
      headTurn: Math.sin(t * 1.1) * 0.24,
      armL: 0.28 + Math.sin(t * 2.3) * 0.10,
      armR: 0.28 - Math.sin(t * 2.3) * 0.10,
    });
  });
  return fig;
}

// ============================================================ REBEL OFFICER ==

function drawOfficerTorso(g, w, h) {
  const S = w / 256;
  g.clearRect(0, 0, w, h);
  const seam = '#8d8264';
  // Jacket opening.
  g.strokeStyle = seam; g.lineWidth = 5 * S; g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(128 * S, 30 * S); g.lineTo(128 * S, 214 * S);
  g.stroke();
  poly2d(g, [[84 * S, 0], [128 * S, 40 * S], [172 * S, 0]]);
  g.stroke();
  // Collar.
  g.fillStyle = '#c2b48d';
  poly2d(g, [[80 * S, 0], [128 * S, 44 * S], [176 * S, 0], [176 * S, 14 * S], [128 * S, 56 * S], [80 * S, 14 * S]]);
  g.fill();
  // Rank badge: the classic block of coloured squares.
  const rank = ['#c91a09', '#c91a09', '#0055bf', '#f2cd37', '#0055bf', '#c91a09'];
  for (let i = 0; i < 6; i++) {
    const x = 62 * S + (i % 3) * 17 * S;
    const y = 62 * S + Math.floor(i / 3) * 17 * S;
    g.fillStyle = rank[i];
    g.fillRect(x, y, 14 * S, 14 * S);
    g.strokeStyle = '#3b3524'; g.lineWidth = 1.6 * S;
    g.strokeRect(x, y, 14 * S, 14 * S);
  }
  // Pocket flaps.
  g.strokeStyle = seam; g.lineWidth = 4 * S;
  rr(g, 150 * S, 62 * S, 40 * S, 30 * S, 3 * S); g.stroke();
  rr(g, 66 * S, 130 * S, 44 * S, 34 * S, 3 * S); g.stroke();
  rr(g, 146 * S, 130 * S, 44 * S, 34 * S, 3 * S); g.stroke();
  // Belt.
  g.fillStyle = '#4a4232';
  g.fillRect(58 * S, 190 * S, 140 * S, 24 * S);
  g.fillStyle = '#b8ad8b';
  rr(g, 112 * S, 194 * S, 32 * S, 16 * S, 3 * S); g.fill();
}

function officerCap() {
  const kit = new Kit('officer-cap');
  const T = C.darkTan;
  const T2 = lighten(C.darkTan, 0.14);
  // Hair showing under the cap.
  shell(kit, 0.42, 0.44, 0.655, 0.60, 66 * DEG, 294 * DEG, 0x4a3524, { steps: 14 });
  // Soft crown.
  kit.cyl(0, 0.86, 0, 0.70, 0.18, T, { seg: 20 });
  kit.cone(0, 1.04, 0, 0.70, 0.60, 0.14, T, { seg: 20 });
  kit.cone(0, 1.18, 0, 0.60, 0.42, 0.09, T2, { seg: 20 });
  kit.sphere(0, 1.24, 0, 0.42, T2, { seg: 14, scl: [1, 0.42, 1] });
  // Peak.
  shell(kit, 0.80, 0.09, 1.02, 0.60, -62 * DEG, 62 * DEG, T2, { steps: 12, rot: [0.24, 0, 0] });
  // Band + badge.
  shell(kit, 0.80, 0.10, 0.735, 0.66, 0, Math.PI * 2, 0x5b5340, { steps: 18 });
  kit.box(0, 0.90, -0.70, 0.16, 0.12, 0.08, C.flatSilver, { finish: FINISH.metal });
  return kit.build({ name: 'officerCap' });
}

export function buildRebelOfficer(opts = {}) {
  const fig = createMinifig({
    name: 'rebel-officer',
    skin: C.yellow, torso: C.tan, arms: C.tan, hands: C.yellow,
    legs: C.darkTan, hips: C.darkTan, feet: C.reddishBrown,
    face: (g, w, h) => drawFace(g, w, h, { mouth: 'flat', brows: true, beard: null }),
    faceKey: 'rebel-officer',
    torsoPrint: drawOfficerTorso, torsoKey: 'rebel-officer',
    headgear: officerCap,
  });
  fig.userData.pose({
    armL: 0.10, armR: -0.55, elbowL: 0.50, elbowR: 1.00, armROut: 0.14,
  });
  fig.userData.autoIdle = false;
  chainUpdate(fig, (t) => {
    if (fig.userData.autoIdle) fig.userData.idle(t, 1.4);
  });
  return fig;
}

// ==================================================================== crowd ==

/**
 * Line a few characters up, evenly spaced, facing -Z. Handy for group shots and
 * for eyeballing the whole cast at once.
 */
export function buildCrowd(builders = [buildVader, buildStormtrooper, buildR2D2, buildC3PO, buildLeia], opts = {}) {
  const g = new THREE.Group();
  g.name = 'crowd';
  const gap = opts.gap ?? 3.0;
  builders.forEach((b, i) => {
    const o = typeof b === 'function' ? b() : b;
    o.position.x = (i - (builders.length - 1) / 2) * gap;
    o.rotation.y = ((i % 3) - 1) * 0.12;
    g.add(o);
  });
  return g;
}

// ================================================================= EXHIBITS ==

export const EXHIBITS = {
  vader: () => buildVader(),
  'vader-dark': () => buildVader({ saber: false }),
  stormtrooper: () => buildStormtrooper(),
  'rebel-trooper': () => buildRebelTrooper(),
  leia: () => buildLeia(),
  r2d2: () => buildR2D2(),
  'r2d2-2legs': () => buildR2D2({ centreLeg: false }),
  c3po: () => buildC3PO(),
  'luke-pilot': () => buildLukePilot(),
  jawa: () => buildJawa(),
  'rebel-officer': () => buildRebelOfficer(),
  lightsaber: () => buildLightsaber({ color: SW.saberBlue }),
  'lightsaber-red': () => buildLightsaber({ color: SW.saberRed }),
  crowd: () => buildCrowd(),
  'crowd-rebels': () => buildCrowd([buildLeia, buildLukePilot, buildRebelTrooper, buildRebelOfficer, buildJawa]),
};
