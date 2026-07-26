// Character rigs (Fable 4 domain — art pass). Properly proportioned articulated humanoids
// (1.8 m), layered clothing, procedural canvas faces, hostile gear variants ('Kestrel' crew:
// dark utility + red armband) and two civilian hostages. Procedural locomotion, weapon-aim
// with two-bone IK so hands stay on the actual weapon geometry, recoil pulses, flinch,
// two death variations with a dropped weapon, kneel/cower breathing idles and cold-air
// breath vapor. The rig interface consumed by src/ai/* is unchanged.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildWeaponModel, weaponFamily } from '../weapons/models.js';
import { registerAsset } from '../core/assets.js';
import { cosmeticRng } from '../core/rng.js';
import { setFireFamily } from '../vfx/firecontext.js';

// ---------------------------------------------------------------------------
// Palette (visual bible tokens; characters own their local materials)
const SKIN_TONES = [0xd9b295, 0xc9a186, 0xa97a5a, 0x8a5f45, 0x6b4832];
const HAIR_COLORS = [0x241c14, 0x3a2e24, 0x171614, 0x5c554e, 0x6e4a28];

const OUTFITS = {
  // hostiles — kestrel dark base #2e3236, danger-red armband #8e3b34
  scout:   { kind: 'hostile', jacket: 0x3d4348, pants: 0x2e3236, vest: null, webbing: 0x23272b, accent: 0x8e3b34, gear: 0x1f2326, headwear: 'cap', build: { w: 0.97, gear: 0.7 } },
  trooper: { kind: 'hostile', jacket: 0x40444a, pants: 0x33373c, vest: 0x1f2326, webbing: 0x282c30, accent: 0x8e3b34, gear: 0x24282c, headwear: 'helmet', build: { w: 1.0, gear: 1.0 } },
  heavy:   { kind: 'hostile', jacket: 0x383d43, pants: 0x2c3034, vest: 0x181c1f, webbing: 0x212528, accent: 0x8e3b34, gear: 0x1d2124, headwear: 'helmetHeavy', build: { w: 1.09, gear: 1.3 } },
  // hostages — light civilian office layers
  civ0: { kind: 'civ', jacket: 0x5c6b79, pants: 0x394049, shirt: 0xd8dde2, shoes: 0x3c3129, skin: 0x8a5f45, hair: 0x171614, hairStyle: 'short', lanyard: true, build: { w: 0.96 } },
  civ1: { kind: 'civ', jacket: 0x8a6f52, pants: 0x4a4640, shirt: 0xbcc7cd, shoes: 0x2c2a26, skin: 0xd9b295, hair: 0x5c554e, hairStyle: 'thin', beard: 0x6b665f, lanyard: false, build: { w: 1.06 } },
};

// hostile head/face combo cycle (>=4 distinct reads via skin/hair/beard/headwear)
const HOSTILE_HEADS = [
  { skin: 1, hair: 0, hairStyle: 'buzz', beard: null, stubble: true },
  { skin: 3, hair: 2, hairStyle: 'short', beard: null, stubble: false },
  { skin: 0, hair: 4, hairStyle: 'short', beard: 4, stubble: false },
  { skin: 2, hair: 1, hairStyle: 'buzz', beard: 1, stubble: true },
  { skin: 4, hair: 2, hairStyle: 'bald', beard: 2, stubble: false },
  { skin: 1, hair: 3, hairStyle: 'short', beard: null, stubble: true },
];
let hostileHeadCounter = 0;

// ---------------------------------------------------------------------------
// shared material cache (characters may own local materials per working agreement)
const matCache = new Map();
function mat(color, rough = 0.9, metal = 0) {
  const key = color + '/' + rough + '/' + metal;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
    matCache.set(key, m);
  }
  return m;
}
const clothM = (c) => mat(c, 0.94);
const gearM = (c) => mat(c, 0.82, 0.08);
const skinM = (c) => mat(c, 0.62);
const hairM = (c) => mat(c, 0.96);

// procedural face texture (eyes/brows read at 3 m)
const faceCache = new Map();
function faceMaterial(skinHex, opts = {}) {
  const key = skinHex + '|' + JSON.stringify(opts);
  let m = faceCache.get(key);
  if (m) return m;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const skin = '#' + skinHex.toString(16).padStart(6, '0');
  g.fillStyle = skin;
  g.fillRect(0, 0, 128, 128);
  // soft shading: darker at sides + under brow + jaw
  const grad = g.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(0,0,0,0.10)');
  grad.addColorStop(0.32, 'rgba(0,0,0,0)');
  grad.addColorStop(0.86, 'rgba(0,0,0,0.05)');
  grad.addColorStop(1, 'rgba(0,0,0,0.18)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const sideG = g.createLinearGradient(0, 0, 128, 0);
  sideG.addColorStop(0, 'rgba(0,0,0,0.16)');
  sideG.addColorStop(0.2, 'rgba(0,0,0,0)');
  sideG.addColorStop(0.8, 'rgba(0,0,0,0)');
  sideG.addColorStop(1, 'rgba(0,0,0,0.16)');
  g.fillStyle = sideG;
  g.fillRect(0, 0, 128, 128);
  if (opts.mask) {
    // balaclava: dark knit with an eye slot
    g.fillStyle = '#26282c';
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = skin;
    g.fillRect(24, 42, 80, 22);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(24, 42, 80, 4);
  }
  const eyeY = 52, eyeDX = 22;
  for (const s of [-1, 1]) {
    const ex = 64 + s * eyeDX;
    // eye white + iris + lid line
    g.fillStyle = '#e8e2d8';
    g.beginPath(); g.ellipse(ex, eyeY, 8.5, 4.6, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = opts.eye || '#2c241c';
    g.beginPath(); g.arc(ex + (opts.gaze || 0), eyeY + 0.5, 3.4, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#141210';
    g.beginPath(); g.arc(ex + (opts.gaze || 0), eyeY + 0.5, 1.5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(20,16,12,0.75)';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(ex - 9, eyeY - 4); g.quadraticCurveTo(ex, eyeY - 7, ex + 9, eyeY - 4); g.stroke();
    // brow
    if (!opts.mask) {
      g.strokeStyle = opts.browColor || '#2a2018';
      g.lineWidth = opts.heavyBrow ? 5 : 4;
      g.beginPath();
      g.moveTo(ex - 11, eyeY - 12 + (s < 0 ? 1 : 1));
      g.quadraticCurveTo(ex, eyeY - 16, ex + 11, eyeY - 11);
      g.stroke();
    }
  }
  if (!opts.mask) {
    // nose shadow + mouth
    g.strokeStyle = 'rgba(0,0,0,0.22)';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(60, 62); g.lineTo(58, 78); g.lineTo(66, 82); g.stroke();
    g.strokeStyle = 'rgba(60,30,25,0.72)';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(50, 97); g.quadraticCurveTo(64, 101 + (opts.frown ? -4 : 0), 78, 97); g.stroke();
    if (opts.stubble) {
      g.fillStyle = 'rgba(30,24,18,0.30)';
      g.beginPath();
      g.moveTo(18, 84); g.quadraticCurveTo(64, 132, 110, 84);
      g.lineTo(112, 128); g.lineTo(16, 128); g.closePath();
      g.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62 });
  faceCache.set(key, m);
  return m;
}

// breath vapor texture (shared)
let _breathTex = null;
function breathTex() {
  if (_breathTex) return _breathTex;
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(16, 16, 1, 16, 16, 15);
  grad.addColorStop(0, 'rgba(232,240,248,0.85)');
  grad.addColorStop(0.5, 'rgba(232,240,248,0.3)');
  grad.addColorStop(1, 'rgba(232,240,248,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  _breathTex = new THREE.CanvasTexture(c);
  return _breathTex;
}

// ---------------------------------------------------------------------------
// geometry helpers (merged per material per bone to keep draw calls low)
function xg(geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  if (rx) geo.rotateX(rx);
  if (ry) geo.rotateY(ry);
  if (rz) geo.rotateZ(rz);
  geo.translate(x, y, z);
  return geo;
}
const B = (w, h, d, x, y, z, rx, ry, rz) => xg(new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz);
const Cap = (r, len, x, y, z, rx, ry, rz) => xg(new THREE.CapsuleGeometry(r, len, 3, 10), x, y, z, rx, ry, rz);
const Sph = (r, x, y, z, sx = 1, sy = 1, sz = 1) => {
  const g = new THREE.SphereGeometry(r, 12, 9);
  g.scale(sx, sy, sz);
  g.translate(x, y, z);
  return g;
};
const CylY = (r, len, x, y, z, seg = 10, r2 = null) => xg(new THREE.CylinderGeometry(r, r2 ?? r, len, seg), x, y, z);

// Draw-call control: bone geometry collapses into four shared vertex-colored bucket
// materials (cloth / gear / skin / metal); source colors bake into vertex colors.
let _buckets = null;
function buckets() {
  if (_buckets) return _buckets;
  _buckets = {
    clo: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.93, metalness: 0, vertexColors: true }),
    gea: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78, metalness: 0.12, vertexColors: true }),
    ski: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0, vertexColors: true }),
    met: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.7, vertexColors: true }),
  };
  return _buckets;
}
function bucketFor(m) {
  if (m.map || (m.emissive && m.emissive.getHex && m.emissive.getHex() !== 0)) return null;
  if ((m.metalness ?? 0) >= 0.4) return 'met';
  if (m.roughness >= 0.88) return 'clo';
  if (m.roughness <= 0.68) return 'ski';
  return 'gea';
}
function paint(geo, color) {
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = color.r; arr[i * 3 + 1] = color.g; arr[i * 3 + 2] = color.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geo;
}

class Bag {
  constructor() { this.lists = new Map(); }
  add(m, ...geos) {
    const bucket = bucketFor(m);
    const key = bucket ?? m;
    let l = this.lists.get(key);
    if (!l) { l = []; this.lists.set(key, l); }
    for (let g of geos) {
      if (g.index) g = g.toNonIndexed();
      if (bucket) paint(g, m.color);
      l.push(g);
    }
  }
  build(parent) {
    for (const [key, geos] of this.lists) {
      const merged = mergeGeometries(geos, false);
      for (const g of geos) g.dispose();
      const mesh = new THREE.Mesh(merged, typeof key === 'string' ? buckets()[key] : key);
      mesh.castShadow = true;
      parent.add(mesh);
    }
  }
}

// arm/leg dimensions
const L_UPPER = 0.28, L_FORE = 0.25;
const SHOULDER_X = 0.21, SHOULDER_Y = 0.355;

// ---------------------------------------------------------------------------
export class CharacterRig {
  constructor(variant = 'trooper') {
    this.variant = variant;
    const o = OUTFITS[variant] || OUTFITS.trooper;
    this.outfit = o;
    this.group = new THREE.Group();
    this.group.name = 'char-' + variant;
    this.moving = 0;
    this.phase = cosmeticRng.next() * 6;
    this.pose = 'stand';
    this.aimPitch = 0;
    this.aiming = false;
    this.deadT = -1;
    this.deathVariant = 'crumple';
    this.recoilT = 0;
    this.flinchT = 0;
    this.flinchDir = 1;
    this.reloadT = -1;
    this.breathTimer = 1 + cosmeticRng.next() * 2.5;
    this.heightScale = variant === 'heavy' ? 1.04 : variant === 'civ1' ? 0.98 : 1.0;
    const bw = o.build?.w ?? 1.0;

    // hostile head combo
    let head;
    if (o.kind === 'hostile') {
      head = HOSTILE_HEADS[hostileHeadCounter++ % HOSTILE_HEADS.length];
      this.skinColor = SKIN_TONES[head.skin];
      this.hairColor = HAIR_COLORS[head.hair];
    } else {
      head = { hairStyle: o.hairStyle, beard: null, stubble: false };
      this.skinColor = o.skin;
      this.hairColor = o.hair;
    }

    const jacket = clothM(o.jacket), pants = clothM(o.pants), skin = skinM(this.skinColor);
    const gear = gearM(o.gear ?? 0x24282c);
    const glove = o.kind === 'hostile' ? gearM(0x232528) : skin;

    // ---------------- pelvis (root at 0.96, feet at 0) ----------------
    this.pelvis = new THREE.Group();
    this.pelvis.position.y = 0.96;
    this.group.add(this.pelvis);
    {
      const bag = new Bag();
      bag.add(pants, B(0.30 * bw, 0.17, 0.21, 0, 0.0, 0), Sph(0.12 * bw, 0, -0.04, 0, 1.25, 0.9, 1));
      // belt + buckle (+ gear pouches for hostiles)
      bag.add(gear, B(0.31 * bw, 0.05, 0.225, 0, 0.075, 0));
      bag.add(gearM(0x3a3f45), B(0.05, 0.035, 0.012, 0, 0.075, -0.115));
      if (o.kind === 'hostile') {
        bag.add(gear,
          B(0.07, 0.1, 0.05, -0.13 * bw, -0.01, -0.09),   // hip pouch L
          B(0.07, 0.09, 0.05, 0.13 * bw, 0.0, 0.08, 0, 0.5), // dump pouch R rear
        );
        if (o.build.gear >= 1.3) bag.add(gear, B(0.16, 0.12, 0.04, 0, -0.03, -0.125)); // groin flap
      }
      bag.build(this.pelvis);
    }

    // ---------------- torso ----------------
    this.torso = new THREE.Group();
    this.torso.position.y = 0.12;
    this.pelvis.add(this.torso);
    {
      const bag = new Bag();
      // layered jacket: waist, chest, shoulder yoke, collar, zip placket, cuffs handled on arms
      bag.add(jacket,
        B(0.32 * bw, 0.2, 0.215, 0, 0.06, 0),
        Sph(0.185 * bw, 0, 0.245, 0, 1.0, 1.15, 0.62),
        B(0.345 * bw, 0.26, 0.225, 0, 0.235, 0),
        B(0.36 * bw, 0.09, 0.2, 0, 0.335, 0.005), // shoulder yoke
        B(0.15, 0.035, 0.21, 0, 0.405, 0.01),      // collar ring
      );
      if (o.kind === 'civ') {
        // open jacket showing shirt: front placket panels + shirt front
        bag.add(clothM(o.shirt),
          B(0.125 * bw, 0.34, 0.03, 0, 0.2, -0.105),
          B(0.11, 0.045, 0.035, 0, 0.375, -0.09), // collar V
        );
        bag.add(clothM(o.jacket),
          B(0.095 * bw, 0.365, 0.035, -0.095 * bw, 0.18, -0.1),
          B(0.095 * bw, 0.365, 0.035, 0.095 * bw, 0.18, -0.1),
        );
        if (o.lanyard) {
          const lan = mat(0x2f5d7c, 0.9);
          bag.add(lan,
            B(0.018, 0.2, 0.012, -0.05, 0.28, -0.115, 0, 0, -0.22),
            B(0.018, 0.2, 0.012, 0.05, 0.28, -0.115, 0, 0, 0.22),
          );
          bag.add(mat(0xdfe3e6, 0.6), B(0.055, 0.075, 0.008, 0, 0.15, -0.125)); // badge card
          bag.add(mat(0x2f5d7c, 0.6), B(0.055, 0.02, 0.009, 0, 0.175, -0.126));
        }
      } else {
        // zip placket + chest pockets
        bag.add(gearM(0x30343a), B(0.02, 0.36, 0.012, 0, 0.2, -0.115));
        bag.add(jacket, B(0.08, 0.09, 0.02, -0.1 * bw, 0.26, -0.115), B(0.08, 0.09, 0.02, 0.1 * bw, 0.26, -0.115));
      }
      if (o.vest != null) {
        const vest = gearM(o.vest);
        const gw = o.build.gear;
        bag.add(vest,
          B(0.30 * bw, 0.3, 0.055, 0, 0.21, -0.135),  // front plate
          B(0.30 * bw, 0.32, 0.05, 0, 0.22, 0.13),    // back plate
          B(0.09, 0.05, 0.32, -0.105 * bw, 0.37, 0),  // shoulder strap L
          B(0.09, 0.05, 0.32, 0.105 * bw, 0.37, 0),   // shoulder strap R
          B(0.055 * bw, 0.22, 0.28, -0.155 * bw, 0.13, 0), // cummerbund L
          B(0.055 * bw, 0.22, 0.28, 0.155 * bw, 0.13, 0),  // cummerbund R
        );
        // mag pouches across belly
        for (let i = -1; i <= 1; i++) {
          bag.add(gear, B(0.075, 0.11, 0.045, i * 0.09 * bw, 0.08, -0.155));
        }
        bag.add(gear, B(0.05, 0.09, 0.05, -0.12 * bw, 0.28, -0.15)); // radio pouch
        if (gw >= 1.3) {
          bag.add(vest,
            B(0.12, 0.06, 0.34, -0.16 * bw, 0.4, 0, 0, 0, 0.25),  // shoulder pad L
            B(0.12, 0.06, 0.34, 0.16 * bw, 0.4, 0, 0, 0, -0.25),  // shoulder pad R
            B(0.16, 0.14, 0.06, 0, 0.05, -0.16),                   // drum pouch
          );
        }
      }
      bag.build(this.torso);
    }

    // ---------------- head ----------------
    this.headG = new THREE.Group();
    this.headG.position.y = 0.44;
    this.torso.add(this.headG);
    {
      const bag = new Bag();
      bag.add(skin,
        Cap(0.05, 0.05, 0, 0.0, 0.005),                 // neck
        B(0.155, 0.2, 0.17, 0, 0.135, 0.004),           // skull
        B(0.03, 0.045, 0.02, 0, 0.115, -0.085, -0.15),  // nose
        B(0.018, 0.05, 0.045, -0.085, 0.13, 0.015),     // ear L
        B(0.018, 0.05, 0.045, 0.085, 0.13, 0.015),      // ear R
      );
      // rounded crown only when nothing covers it (hats/helmets replace it);
      // colored as hair when a covering style is present so it never reads as a bald band
      if (!o.headwear) {
        const st = head.hairStyle;
        const crownM = (st === 'short' || st === 'buzz') ? hairM(this.hairColor) : skin;
        bag.add(crownM, Sph(0.078, 0, 0.185, 0.008, 1.0, 0.66, 1.05));
      }
      const isMasked = o.headwear === 'helmetHeavy';
      const face = new THREE.Mesh(
        new THREE.PlaneGeometry(0.15, 0.185),
        faceMaterial(this.skinColor, {
          stubble: head.stubble, heavyBrow: o.kind === 'hostile',
          browColor: '#' + this.hairColor.toString(16).padStart(6, '0'),
          frown: o.kind === 'hostile', mask: isMasked ? 'balaclava' : null,
        }),
      );
      face.position.set(0, 0.135, -0.0865);
      face.rotation.y = Math.PI; // plane faces -Z (character forward)
      face.castShadow = false;
      this.headG.add(face);
      if (isMasked) bag.add(gearM(0x26282c), B(0.16, 0.205, 0.175, 0, 0.133, 0.006)); // balaclava shell
      // hair / beard
      const hm = hairM(this.hairColor);
      const style = head.hairStyle;
      if (style === 'short') {
        bag.add(hm,
          B(0.162, 0.05, 0.178, 0, 0.235, 0.006),
          B(0.162, 0.1, 0.045, 0, 0.19, 0.075),
          B(0.16, 0.035, 0.05, 0, 0.225, -0.06), // front sweep
        );
      } else if (style === 'buzz') {
        bag.add(hm, B(0.158, 0.028, 0.172, 0, 0.243, 0.006), B(0.158, 0.09, 0.02, 0, 0.19, 0.084));
      } else if (style === 'thin') {
        bag.add(hm, B(0.16, 0.022, 0.1, 0, 0.244, 0.045), B(0.16, 0.08, 0.024, 0, 0.19, 0.082));
      } // 'bald': none
      if (head.beard != null) {
        bag.add(hairM(HAIR_COLORS[head.beard] ?? head.beard),
          B(0.14, 0.065, 0.04, 0, 0.048, -0.068),          // chin
          B(0.016, 0.075, 0.1, -0.077, 0.062, -0.028),     // jawline L
          B(0.016, 0.075, 0.1, 0.077, 0.062, -0.028),      // jawline R
        );
      } else if (o.beard) {
        // front face must clear the face plane at z=-0.0865 or it is occluded
        bag.add(hairM(o.beard),
          B(0.14, 0.06, 0.045, 0, 0.045, -0.07),
          B(0.016, 0.07, 0.09, -0.077, 0.06, -0.03),
          B(0.016, 0.07, 0.09, 0.077, 0.06, -0.03),
        );
      }
      // headwear
      if (o.headwear === 'cap') {
        bag.add(gearM(0x2f3338),
          B(0.165, 0.055, 0.175, 0, 0.245, 0.012),
          Sph(0.086, 0, 0.24, 0.012, 1.0, 0.62, 1.05),
          B(0.14, 0.014, 0.09, 0, 0.222, -0.125, 0.12), // brim
        );
        bag.add(mat(0x8e3b34, 0.85), B(0.04, 0.025, 0.008, 0, 0.245, -0.082)); // kestrel patch
      } else if (o.headwear === 'helmet' || o.headwear === 'helmetHeavy') {
        const shellM = gearM(o.headwear === 'helmetHeavy' ? 0x24282b : 0x2b2f33);
        bag.add(shellM,
          Sph(0.105, 0, 0.205, 0.008, 1.0, 0.82, 1.06),
          B(0.2, 0.05, 0.21, 0, 0.19, 0.008),
        );
        bag.add(gearM(0x1c1f22),
          B(0.02, 0.03, 0.03, 0, 0.23, -0.105),   // mount stub
          B(0.012, 0.12, 0.01, -0.078, 0.09, -0.03, 0, 0, 0.22), // chin strap L
          B(0.012, 0.12, 0.01, 0.078, 0.09, -0.03, 0, 0, -0.22), // chin strap R
        );
        if (o.headwear === 'helmetHeavy') {
          // goggles on helmet + lower-face guard
          bag.add(gearM(0x17191c), B(0.15, 0.045, 0.03, 0, 0.215, -0.095));
          bag.add(mat(0x6fc3e8, 0.25, 0.6), B(0.13, 0.03, 0.012, 0, 0.215, -0.108));
          bag.add(gearM(0x24282b), B(0.15, 0.07, 0.04, 0, 0.045, -0.075, 0.15)); // mandible guard
        } else {
          bag.add(gearM(0x3a3f44), B(0.012, 0.04, 0.12, -0.1, 0.21, 0.0), B(0.012, 0.04, 0.12, 0.1, 0.21, 0.0)); // side rails
        }
      }
      bag.build(this.headG);
    }

    // ---------------- arms ----------------
    this.armL = new THREE.Group(); this.armR = new THREE.Group();
    this.armL.position.set(-SHOULDER_X * bw - 0.015, SHOULDER_Y, 0);
    this.armR.position.set(SHOULDER_X * bw + 0.015, SHOULDER_Y, 0);
    this.torso.add(this.armL, this.armR);
    for (const [g, side] of [[this.armL, -1], [this.armR, 1]]) {
      const bag = new Bag();
      bag.add(jacket,
        Sph(0.068, 0, -0.01, 0),                    // deltoid (covers shoulder joint)
        Cap(0.052, 0.15, 0, -0.15, 0),              // upper arm
      );
      if (side === -1 && this.outfit.kind === 'hostile') {
        bag.add(mat(this.outfit.accent, 0.85), CylY(0.0585, 0.05, 0, -0.115, 0));
        bag.add(mat(0xd8d4c8, 0.8),
          B(0.012, 0.02, 0.008, -0.059, -0.108, 0, 0, 0, 0.6),
          B(0.012, 0.02, 0.008, -0.059, -0.122, 0, 0, 0, -0.6), // pale chevron motif
        );
      }
      bag.build(g);

      const fore = new THREE.Group();
      fore.position.y = -L_UPPER;
      g.add(fore);
      const fbag = new Bag();
      fbag.add(jacket,
        Sph(0.052, 0, 0, 0),                 // elbow
        Cap(0.044, 0.13, 0, -0.115, 0),      // forearm sleeve
        CylY(0.048, 0.03, 0, -0.195, 0),     // cuff
      );
      if (this.outfit.kind === 'hostile') fbag.add(gearM(0x2a2d31), B(0.015, 0.05, 0.1, side * 0.045, -0.12, 0)); // forearm strap
      fbag.build(fore);

      const hand = new THREE.Group();
      hand.position.y = -L_FORE;
      fore.add(hand);
      const hbag = new Bag();
      hbag.add(glove,
        B(0.052, 0.075, 0.075, 0, -0.033, -0.005),                  // palm
        B(0.048, 0.062, 0.055, 0, -0.09, -0.02, -0.35),             // mitten fingers (curled)
        B(0.026, 0.05, 0.03, side * -0.032, -0.045, -0.03, -0.5),   // thumb
      );
      hbag.build(hand);

      g.userData.fore = fore;
      g.userData.hand = hand;
      g.userData.side = side;
    }

    // ---------------- legs ----------------
    this.legL = new THREE.Group(); this.legR = new THREE.Group();
    this.legL.position.set(-0.095 * bw, -0.06, 0);
    this.legR.position.set(0.095 * bw, -0.06, 0);
    this.pelvis.add(this.legL, this.legR);
    const bootM = o.kind === 'civ' ? mat(o.shoes, 0.55) : mat(0x1d1f22, 0.8);
    for (const [g, side] of [[this.legL, -1], [this.legR, 1]]) {
      const bag = new Bag();
      bag.add(pants,
        Sph(0.075, 0, -0.01, 0),
        Cap(0.066, 0.24, 0, -0.21, 0),
      );
      if (o.kind === 'hostile' && side === 1 && o.headwear === 'cap') {
        bag.add(gear, B(0.06, 0.14, 0.09, 0.062, -0.24, -0.02)); // scout drop-leg holster
        bag.add(gearM(0x35393e), B(0.075, 0.02, 0.1, 0.055, -0.17, -0.02));
      }
      bag.build(g);

      const shin = new THREE.Group();
      shin.position.y = -0.44;
      g.add(shin);
      const sbag = new Bag();
      sbag.add(pants,
        Sph(0.058, 0, 0, 0),
        Cap(0.048, 0.16, 0, -0.14, 0),
      );
      if (o.kind === 'hostile' && o.vest != null) sbag.add(gear, B(0.09, 0.09, 0.045, 0, -0.045, -0.055)); // knee pad
      sbag.add(bootM,
        CylY(0.056, 0.1, 0, -0.3, 0.005),                  // boot shaft
        B(0.1, 0.075, 0.24, 0, -0.375, -0.045),            // foot
        Sph(0.052, 0, -0.375, -0.155, 1.0, 0.72, 1.0),     // toe cap
        B(0.106, 0.028, 0.25, 0, -0.418, -0.045),          // sole
      );
      sbag.build(shin);
      g.userData.shin = shin;
    }

    this.group.scale.setScalar(this.heightScale);

    // weapon mounts to the torso; hands are IK'd onto the weapon's grip markers
    this.weaponMount = new THREE.Group();
    this.torso.add(this.weaponMount);
    this.weaponModel = null;
    this.weaponParts = null;
    this.droppedWeapon = null;

    // breath vapor sprite (reused)
    this.breathSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: breathTex(), transparent: true, opacity: 0, depthWrite: false,
    }));
    this.breathSprite.scale.setScalar(0.06);
    this.breathSprite.visible = false;
    this.group.add(this.breathSprite);
    this.breathAnim = -1;

    // scratch objects
    this._v1 = new THREE.Vector3(); this._v2 = new THREE.Vector3(); this._v3 = new THREE.Vector3();
    this._q1 = new THREE.Quaternion();
    this._m1 = new THREE.Matrix4();
  }

  // ------------------------------------------------------------------
  attachWeapon(defId) {
    if (this.weaponModel) this.weaponMount.remove(this.weaponModel);
    if (!defId) { this.weaponModel = null; this.weaponParts = null; this.weaponDefId = null; return; }
    this.weaponDefId = defId;
    const parts = buildWeaponModel(defId);
    // seat the weapon so its main grip sits at the mount origin
    parts.group.position.copy(parts.gripMain.position).multiplyScalar(-1);
    this.weaponModel = parts.group;
    this.weaponParts = parts;
    this.weaponMount.add(parts.group);
  }

  getMuzzleWorld(out = new THREE.Vector3()) {
    if (this.weaponParts && !this.droppedWeapon) {
      this.weaponParts.muzzle.getWorldPosition(out);
      // the AI only requests the muzzle when firing — use it as the recoil trigger
      // and pass the weapon family along to the VFX system
      if (this.aiming && this.pose !== 'dead') {
        this.recoilT = 1;
        setFireFamily(weaponFamily(this.weaponDefId));
      }
    } else {
      this.group.getWorldPosition(out);
      out.y += 1.45;
    }
    return out;
  }

  setAiming(aiming) { this.aiming = aiming; }

  flinch() {
    this.flinchT = 1;
    this.flinchDir = cosmeticRng.next() < 0.5 ? -1 : 1;
  }

  playReload() { this.reloadT = 0; }

  die() { this.setPose('dead'); }

  setPose(pose) {
    if (this.pose === pose) return;
    this.pose = pose;
    if (pose === 'dead') {
      this.deadT = 0;
      this.deathVariant = cosmeticRng.next() < 0.5 ? 'crumple' : 'backfall';
      this.deathTwist = (cosmeticRng.next() - 0.5) * 0.5;
      this.deathSide = cosmeticRng.next() < 0.5 ? -1 : 1;
      this._dropWeapon();
      return;
    }
    this.deadT = -1;
    this.group.rotation.x = 0;
    this.group.rotation.z = 0;
    this.group.position.y = 0;
    this.pelvis.rotation.set(0, 0, 0);
    this.pelvis.position.y = 0.96;
    for (const g of [this.legL, this.legR]) { g.rotation.set(0, 0, 0); g.userData.shin.rotation.set(0, 0, 0); }
    for (const g of [this.armL, this.armR]) { g.rotation.set(0, 0, 0); g.quaternion.identity(); g.userData.fore.rotation.set(0, 0, 0); }
    this.headG.rotation.set(0, 0, 0);
    this.torso.rotation.set(0, 0, 0);
  }

  _dropWeapon() {
    if (!this.weaponModel || this.droppedWeapon) return;
    const w = this.weaponModel;
    this.group.updateWorldMatrix(true, true);
    // reparent to the rig root keeping the world transform
    const worldM = w.matrixWorld.clone();
    this.weaponMount.remove(w);
    this.group.add(w);
    this._m1.copy(this.group.matrixWorld).invert().multiply(worldM);
    worldM.copy(this._m1);
    w.position.setFromMatrixPosition(worldM);
    w.quaternion.setFromRotationMatrix(worldM);
    w.scale.set(1, 1, 1);
    // rest transform: flat on the floor beside the body
    const side = this.deathSide;
    const restPos = new THREE.Vector3(side * 0.55 + (cosmeticRng.next() - 0.5) * 0.15, 0.035, -0.25 - cosmeticRng.next() * 0.3);
    const restQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, cosmeticRng.next() * Math.PI * 2, side * Math.PI / 2 * 0.94, 'YXZ'));
    this.droppedWeapon = { obj: w, t: 0, fromP: w.position.clone(), fromQ: w.quaternion.clone(), toP: restPos, toQ: restQ };
  }

  // two-bone IK: aim a shoulder group + forearm so the wrist reaches `target`
  // (target expressed in torso space). `hint` biases the elbow direction.
  _solveArm(arm, target, hint) {
    const S = this._v1.copy(arm.position);
    const d = this._v2.copy(target).sub(S);
    let len = d.length();
    const maxLen = L_UPPER + L_FORE - 0.015;
    if (len > maxLen) { d.multiplyScalar(maxLen / len); len = maxLen; }
    if (len < 0.1) { d.multiplyScalar(0.1 / Math.max(len, 1e-5)); len = 0.1; }
    const dir = this._v3.copy(d).normalize();
    // law of cosines
    const cosE = THREE.MathUtils.clamp((L_UPPER * L_UPPER + L_FORE * L_FORE - len * len) / (2 * L_UPPER * L_FORE), -1, 1);
    const interior = Math.acos(cosE);
    const cosS = THREE.MathUtils.clamp((L_UPPER * L_UPPER + len * len - L_FORE * L_FORE) / (2 * L_UPPER * len), -1, 1);
    const alpha = Math.acos(cosS);
    // elbow axis from bend-plane (dir x hint)
    const axis = new THREE.Vector3().crossVectors(dir, hint);
    if (axis.lengthSq() < 1e-6) axis.set(1, 0, 0);
    axis.normalize();
    const upperDir = dir.clone().applyQuaternion(this._q1.setFromAxisAngle(axis, alpha));
    // ensure elbow ends up on the hint side; otherwise flip
    const elbow = S.clone().addScaledVector(upperDir, L_UPPER);
    const mid = S.clone().addScaledVector(d, 0.5);
    if (elbow.sub(mid).dot(hint) < 0) {
      upperDir.copy(dir).applyQuaternion(this._q1.setFromAxisAngle(axis, -alpha));
    }
    // shoulder basis: bone runs along -Y, elbow axis along +X
    const yA = upperDir.clone().multiplyScalar(-1);
    const zA = new THREE.Vector3().crossVectors(axis, yA).normalize();
    const xA = new THREE.Vector3().crossVectors(yA, zA).normalize();
    this._m1.makeBasis(xA, yA, zA);
    arm.quaternion.setFromRotationMatrix(this._m1);
    // forearm bend measured numerically in the shoulder frame
    const foreDir = target.clone().sub(S).addScaledVector(upperDir, -L_UPPER).normalize();
    const inv = this._m1.clone().invert();
    const fl = foreDir.applyMatrix4(inv.setPosition(0, 0, 0));
    arm.userData.fore.rotation.set(Math.atan2(-fl.z, -fl.y), 0, 0);
  }

  // marker world pos -> torso space (weapon mount pose must be set first)
  _markerInTorso(markerObj, out) {
    this.weaponMount.updateWorldMatrix(true, false);
    if (markerObj.parent !== this.weaponMount) markerObj.parent.updateWorldMatrix(false, false);
    markerObj.getWorldPosition(out);
    return this.torso.worldToLocal(out);
  }

  // ------------------------------------------------------------------
  update(dt, speed = 0) {
    // decaying pulses
    this.recoilT = Math.max(0, this.recoilT - dt * 7);
    this.flinchT = Math.max(0, this.flinchT - dt * 5);
    if (this.reloadT >= 0) { this.reloadT += dt; if (this.reloadT > 1.6) this.reloadT = -1; }

    if (this.pose === 'dead') { this._updateDeath(dt); return; }

    this.moving = THREE.MathUtils.damp(this.moving, Math.min(1, speed / 3.2), 8, dt);
    this.phase += dt * (2.6 + speed * 2.3);
    const run = THREE.MathUtils.clamp((speed - 1.6) / 2.0, 0, 1);
    const swing = Math.sin(this.phase) * this.moving;
    const swing2 = Math.sin(this.phase + Math.PI) * this.moving;
    const breath = Math.sin(this.phase * 0.32) * 0.012;
    const flinchK = this.flinchT * this.flinchT;

    this._updateBreath(dt);

    if (this.pose === 'kneel') {
      this.pelvis.position.y = 0.56;
      this.pelvis.rotation.set(0, 0, 0);
      this.legL.rotation.set(-1.62, 0, -0.1);
      this.legL.userData.shin.rotation.x = 1.62;
      this.legR.rotation.set(-0.62, 0, 0.12);
      this.legR.userData.shin.rotation.x = 2.05;
      this.torso.rotation.set(0.12 + breath, 0, 0);
      // hands resting on thighs
      this.armL.quaternion.setFromEuler(new THREE.Euler(-0.55 + breath, 0.15, -0.12));
      this.armL.userData.fore.rotation.x = -0.55;
      this.armR.quaternion.setFromEuler(new THREE.Euler(-0.55 + breath, -0.15, 0.12));
      this.armR.userData.fore.rotation.x = -0.55;
      this.headG.rotation.set(0.1 - breath * 2, 0, 0);
      this._setMountLowered();
      return;
    }
    if (this.pose === 'cower') {
      this.pelvis.position.y = 0.46;
      this.pelvis.rotation.set(0, 0, 0);
      this.legL.rotation.set(-2.15, 0, -0.08);
      this.legL.userData.shin.rotation.x = 2.3;
      this.legR.rotation.set(-2.05, 0, 0.1);
      this.legR.userData.shin.rotation.x = 2.35;
      this.torso.rotation.set(0.62 + breath * 2, 0, 0);
      // arms shielding the head
      this.armL.quaternion.setFromEuler(new THREE.Euler(-2.5, 0.35, -0.5));
      this.armL.userData.fore.rotation.x = -2.1;
      this.armR.quaternion.setFromEuler(new THREE.Euler(-2.5, -0.35, 0.5));
      this.armR.userData.fore.rotation.x = -2.1;
      this.headG.rotation.set(0.55 + breath * 3, 0, 0);
      this._setMountLowered();
      return;
    }

    // ---------------- stand / locomotion ----------------
    this.pelvis.rotation.set(0, 0, 0);
    this.pelvis.position.y = 0.96 - 0.012 * this.moving + Math.abs(Math.sin(this.phase)) * (0.018 + run * 0.02) * this.moving;
    this.torso.rotation.x = breath + this.moving * (0.05 + run * 0.1) + flinchK * 0.16;
    this.torso.rotation.z = Math.sin(this.phase) * 0.02 * this.moving + flinchK * 0.08 * this.flinchDir;
    this.headG.rotation.x = -this.moving * 0.05 - flinchK * 0.12 + (this.aiming ? this.aimPitch * 0.55 : 0);
    this.headG.rotation.z = -this.torso.rotation.z * 0.6;

    // legs with heel-strike shin flexion
    this.legL.rotation.set(swing * (0.6 + run * 0.25), 0, 0);
    this.legR.rotation.set(swing2 * (0.6 + run * 0.25), 0, 0);
    this.legL.userData.shin.rotation.x = Math.max(0, -swing) * (0.85 + run * 0.5) + this.moving * 0.12;
    this.legR.userData.shin.rotation.x = Math.max(0, -swing2) * (0.85 + run * 0.5) + this.moving * 0.12;

    if (this.weaponModel) {
      const recoil = this.recoilT * this.recoilT;
      if (this.aiming) {
        // shouldered aim: bladed stance, weapon at shoulder pocket
        this.torso.rotation.y = -0.3;
        this.headG.rotation.y = 0.24;
        this.weaponMount.position.set(0.15, 0.30, -0.2 + recoil * 0.045);
        this.weaponMount.rotation.set(this.aimPitch + recoil * 0.1, 0.3, 0);
      } else {
        // low ready / patrol carry
        this.torso.rotation.y = -0.14 + Math.sin(this.phase) * 0.03 * this.moving;
        this.headG.rotation.y = 0.1;
        this.weaponMount.position.set(0.1, 0.16, -0.2);
        this.weaponMount.rotation.set(-0.62 + breath * 1.5 + this.moving * 0.06, 0.24, 0.06);
      }
      this._placeHandsOnWeapon();
    } else {
      this.torso.rotation.y = 0;
      this.headG.rotation.y = 0;
      // natural arm swing with elbow follow-through
      this.armL.quaternion.setFromEuler(new THREE.Euler(swing2 * (0.45 + run * 0.4), 0, -0.07));
      this.armR.quaternion.setFromEuler(new THREE.Euler(swing * (0.45 + run * 0.4), 0, 0.07));
      this.armL.userData.fore.rotation.x = -0.2 - Math.max(0, swing2) * 0.45 - run * 0.5 * this.moving;
      this.armR.userData.fore.rotation.x = -0.2 - Math.max(0, swing) * 0.45 - run * 0.5 * this.moving;
    }
  }

  _setMountLowered() {
    if (!this.weaponModel) return;
    this.weaponMount.position.set(0.08, 0.05, -0.18);
    this.weaponMount.rotation.set(-1.15, 0.2, 0.1);
  }

  _placeHandsOnWeapon() {
    const parts = this.weaponParts;
    if (!parts || this.droppedWeapon) return;
    const tR = this._markerInTorso(parts.gripMain, new THREE.Vector3());
    this._solveArm(this.armR, tR, new THREE.Vector3(0.55, -1, 0.35).normalize());
    // reload gesture: mag hand dips to the magwell and back
    let tL;
    if (parts.gripSupport) {
      tL = this._markerInTorso(parts.gripSupport, new THREE.Vector3());
    } else {
      tL = tR.clone().add(new THREE.Vector3(-0.03, -0.06, 0.01));
    }
    if (this.reloadT >= 0 && parts.mag) {
      const k = Math.sin(Math.min(1, this.reloadT / 1.5) * Math.PI);
      const tMag = this._markerInTorso(parts.mag, new THREE.Vector3());
      tMag.y -= 0.1 * k;
      tL.lerp(tMag, k);
    }
    this._solveArm(this.armL, tL, new THREE.Vector3(-0.75, -1, 0.1).normalize());
    // orient hands to wrap the weapon
    this.armR.userData.hand.rotation.set(-0.35, 0.15, 0);
    this.armL.userData.hand.rotation.set(-0.4, -0.2, 0);
  }

  // ---------------- death ----------------
  _updateDeath(dt) {
    if (this.deadT < 0) return;
    this.deadT = Math.min(1, this.deadT + dt * 1.35);
    const t = this.deadT;
    // eased fall with a small impact settle
    const fall = t < 0.72 ? (t / 0.72) * (t / 0.72) : 1;
    const settle = t > 0.72 ? Math.sin((t - 0.72) / 0.28 * Math.PI) * (1 - t) * 0.35 : 0;
    const k = Math.min(1, fall + settle * 0.15);
    const lerp = THREE.MathUtils.lerp;

    if (this.deathVariant === 'crumple') {
      // knees give way, torso slumps, body tips to one side
      const s = this.deathSide;
      const c1 = Math.min(1, k * 1.7);           // collapse phase
      const c2 = THREE.MathUtils.clamp((k - 0.4) / 0.6, 0, 1); // side tip phase
      this.pelvis.position.y = lerp(0.96, 0.42, c1) - 0.24 * c2;
      this.pelvis.rotation.z = s * 1.5 * c2 * c2;
      this.pelvis.rotation.x = -0.25 * c2;
      this.legL.rotation.x = lerp(0, -1.9, c1);
      this.legL.userData.shin.rotation.x = lerp(0, 2.1, c1);
      this.legR.rotation.x = lerp(0, -1.4, c1);
      this.legR.rotation.z = s * 0.25 * c2;
      this.legR.userData.shin.rotation.x = lerp(0, 1.7, c1);
      this.torso.rotation.x = lerp(0, 0.75, c1) - settle * 0.4;
      this.torso.rotation.y = this.deathTwist * c2;
      this.torso.rotation.z = s * 0.3 * c2;
      this.headG.rotation.x = lerp(0, 0.55, c2);
      this.headG.rotation.z = s * 0.35 * c2;
      // arms settle alongside the tipped body; targets solved numerically so the bone
      // direction stays in the ground plane for either tip side (see wp-013 notes)
      this.armL.quaternion.slerp(this._q1.setFromEuler(new THREE.Euler(-0.85, 0, -0.2 * s)), Math.min(1, dt * 6));
      this.armR.quaternion.slerp(this._q1.setFromEuler(new THREE.Euler(-1.35, 0, -0.2 * s)), Math.min(1, dt * 6));
      this.armL.userData.fore.rotation.x = lerp(this.armL.userData.fore.rotation.x, -0.25, Math.min(1, dt * 6));
      this.armR.userData.fore.rotation.x = lerp(this.armR.userData.fore.rotation.x, -0.15, Math.min(1, dt * 6));
    } else {
      // backward fall: arch back, arms out, one knee up, flat settle
      this.pelvis.rotation.x = 1.42 * k + settle * 0.1;
      this.pelvis.rotation.y = this.deathTwist * k;
      this.pelvis.position.y = lerp(0.96, 0.16, Math.min(1, k * 1.15));
      this.torso.rotation.x = -0.35 * k + settle * 0.3;
      this.torso.rotation.y = 0;
      this.torso.rotation.z = this.deathTwist * 0.4 * k;
      this.headG.rotation.x = -0.35 * k + settle * 0.5;
      this.legL.rotation.x = -0.12 * k;
      this.legL.userData.shin.rotation.x = 0.1 * k;
      this.legR.rotation.x = lerp(0, -0.65, k);
      this.legR.userData.shin.rotation.x = lerp(0, 1.15, k);
      this.armL.quaternion.slerp(this._q1.setFromEuler(new THREE.Euler(0.1, 0, -1.6)), Math.min(1, dt * 5));
      this.armR.quaternion.slerp(this._q1.setFromEuler(new THREE.Euler(0.3, 0, 1.45)), Math.min(1, dt * 5));
      this.armL.userData.fore.rotation.x = lerp(this.armL.userData.fore.rotation.x, -0.2, Math.min(1, dt * 5));
      this.armR.userData.fore.rotation.x = lerp(this.armR.userData.fore.rotation.x, -0.12, Math.min(1, dt * 5));
    }

    // dropped weapon: short toss then rest flat beside the body
    if (this.droppedWeapon) {
      const dw = this.droppedWeapon;
      if (dw.t < 1) {
        dw.t = Math.min(1, dw.t + dt * 2.4);
        const dk = dw.t * dw.t;
        const arc = Math.sin(dw.t * Math.PI) * 0.12;
        dw.obj.position.lerpVectors(dw.fromP, dw.toP, dk);
        dw.obj.position.y += arc;
        dw.obj.quaternion.slerpQuaternions(dw.fromQ, dw.toQ, dk);
      }
    }
  }

  // ---------------- cold breath ----------------
  _updateBreath(dt) {
    // exterior check (matches the snowfall envelope): building is x 0..48, z 0..36, y<6.6
    const p = this._v1;
    this.group.getWorldPosition(p);
    const outside = p.x < -0.4 || p.x > 48.4 || p.z < -0.4 || p.z > 36.4;
    if (this.breathAnim >= 0) {
      this.breathAnim += dt;
      const k = this.breathAnim / 1.1;
      if (k >= 1) {
        this.breathAnim = -1;
        this.breathSprite.visible = false;
        this.breathSprite.material.opacity = 0;
      } else {
        this.breathSprite.material.opacity = 0.3 * (k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75);
        this.breathSprite.scale.setScalar((0.05 + k * 0.16) / this.heightScale);
        this.breathSprite.position.y += dt * 0.1;
        this.breathSprite.position.z -= dt * 0.06;
      }
      return;
    }
    if (!outside) return;
    this.breathTimer -= dt;
    if (this.breathTimer <= 0) {
      this.breathTimer = 2.8 + cosmeticRng.next() * 1.6;
      this.breathAnim = 0;
      // roughly at the mouth in rig-local space (group carries yaw so -Z is forward)
      const mouthY = this.pose === 'stand' ? 1.6 : this.pose === 'kneel' ? 1.2 : 1.0;
      this.breathSprite.position.set(0, mouthY / this.heightScale, -0.18);
      this.breathSprite.visible = true;
    }
  }
}

// ---------------------------------------------------------------------------
function galleryRig(variant, weapon, pose = 'stand', aiming = false) {
  const r = new CharacterRig(variant);
  if (weapon) r.attachWeapon(weapon);
  r.setPose(pose);
  r.setAiming(aiming);
  r.update(1 / 60, 0);
  return r;
}

registerAsset('CHAR-HOSTILE-SCOUT', {
  name: 'Hostile — Kestrel scout (cap, light webbing)', category: 'character', agent: 'Fable 4',
  files: ['src/characters/humanoid.js'], build: () => galleryRig('scout', 'boreal-k5', 'stand', true),
});
registerAsset('CHAR-HOSTILE-TROOPER', {
  name: 'Hostile — Kestrel trooper (helmet, plate vest)', category: 'character', agent: 'Fable 4',
  files: ['src/characters/humanoid.js'], build: () => galleryRig('trooper', 'halcyon-hc4', 'stand', true),
});
registerAsset('CHAR-HOSTILE-HEAVY', {
  name: 'Hostile — Kestrel heavy (armor, mandible guard)', category: 'character', agent: 'Fable 4',
  files: ['src/characters/humanoid.js'], build: () => galleryRig('heavy', 'vanta-s12', 'stand', true),
});
registerAsset('CHAR-HOSTAGE-0', {
  name: 'Hostage — analyst D. Okafor (lanyard + badge)', category: 'character', agent: 'Fable 4',
  files: ['src/characters/humanoid.js'], build: () => galleryRig('civ0', null, 'kneel'),
});
registerAsset('CHAR-HOSTAGE-1', {
  name: 'Hostage — manager M. Lindqvist', category: 'character', agent: 'Fable 4',
  files: ['src/characters/humanoid.js'], build: () => galleryRig('civ1', null, 'kneel'),
});
