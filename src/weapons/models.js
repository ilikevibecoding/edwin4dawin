// Parametric weapon models (Fable 4 domain; upgraded in the character/weapon art pass).
// Origin at grip point; barrel along −Z; sight line at local y = SIGHT_Y.
import * as THREE from 'three';
import { getMaterial } from '../materials/index.js';
import { registerAsset } from '../core/assets.js';

export const SIGHT_Y = 0.062;

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
function cyl(r, len, mat, x = 0, y = 0, z = 0, alongZ = true) {
  const g = new THREE.CylinderGeometry(r, r, len, 12);
  if (alongZ) g.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

const M = {
  body: () => getMaterial('hardPlastic'),
  metal: () => getMaterial('paintedMetal'),
  steel: () => getMaterial('brushedMetal'),
  grip: () => getMaterial('rubber'),
  accent: () => getMaterial('electronics'),
};

export function buildWeaponModel(defId) {
  const g = new THREE.Group();
  const parts = { group: g, muzzle: new THREE.Object3D(), mag: null, bolt: null, pump: null };
  const body = M.body(), metal = M.metal(), steel = M.steel(), grip = M.grip();

  switch (defId) {
    case 'karst-p9': {
      const slide = box(0.032, 0.036, 0.19, steel, 0, SIGHT_Y - 0.012, -0.06);
      const frame = box(0.03, 0.03, 0.16, body, 0, SIGHT_Y - 0.045, -0.05);
      const gr = box(0.03, 0.1, 0.042, grip, 0, -0.028, 0.012);
      gr.rotation.x = 0.18;
      const guard = box(0.026, 0.008, 0.05, body, 0, -0.005, -0.045);
      const front = box(0.006, 0.012, 0.008, steel, 0, SIGHT_Y + 0.012, -0.148);
      const rear = box(0.02, 0.01, 0.008, steel, 0, SIGHT_Y + 0.011, 0.028);
      const mag = box(0.026, 0.08, 0.034, metal, 0, -0.04, 0.012);
      parts.mag = mag;
      parts.bolt = slide;
      g.add(frame, slide, gr, guard, front, rear, mag);
      parts.muzzle.position.set(0, SIGHT_Y - 0.012, -0.165);
      break;
    }
    case 'boreal-k5': {
      const receiver = box(0.046, 0.056, 0.34, body, 0, SIGHT_Y - 0.02, -0.1);
      const barrel = cyl(0.011, 0.16, steel, 0, SIGHT_Y - 0.012, -0.33);
      const shroud = cyl(0.02, 0.12, metal, 0, SIGHT_Y - 0.012, -0.29);
      const gr = box(0.034, 0.1, 0.05, grip, 0, -0.035, -0.02);
      gr.rotation.x = 0.22;
      const mag = box(0.03, 0.14, 0.05, metal, 0, -0.05, -0.15);
      mag.rotation.x = -0.12;
      const stock = box(0.03, 0.04, 0.16, metal, 0, SIGHT_Y - 0.02, 0.14);
      const pad = box(0.036, 0.08, 0.02, grip, 0, SIGHT_Y - 0.03, 0.22);
      const front = box(0.007, 0.02, 0.008, steel, 0, SIGHT_Y + 0.017, -0.26);
      const rear = box(0.022, 0.016, 0.008, steel, 0, SIGHT_Y + 0.015, -0.0);
      const bolt = box(0.012, 0.014, 0.05, steel, 0.027, SIGHT_Y - 0.01, -0.08);
      parts.mag = mag; parts.bolt = bolt;
      g.add(receiver, barrel, shroud, gr, mag, stock, pad, front, rear, bolt);
      parts.muzzle.position.set(0, SIGHT_Y - 0.012, -0.42);
      break;
    }
    case 'halcyon-hc4': {
      const upper = box(0.05, 0.05, 0.36, metal, 0, SIGHT_Y - 0.018, -0.1);
      const lower = box(0.046, 0.045, 0.2, body, 0, SIGHT_Y - 0.062, -0.06);
      const handguard = box(0.048, 0.052, 0.24, body, 0, SIGHT_Y - 0.018, -0.35);
      const barrel = cyl(0.01, 0.14, steel, 0, SIGHT_Y - 0.014, -0.53);
      const brake = cyl(0.016, 0.05, metal, 0, SIGHT_Y - 0.014, -0.585);
      const gr = box(0.034, 0.11, 0.052, grip, 0, -0.045, 0.0);
      gr.rotation.x = 0.25;
      const mag = box(0.032, 0.15, 0.062, metal, 0, -0.06, -0.14);
      mag.rotation.x = -0.28;
      const stock = box(0.036, 0.05, 0.2, body, 0, SIGHT_Y - 0.025, 0.16);
      const pad = box(0.04, 0.1, 0.024, grip, 0, SIGHT_Y - 0.04, 0.26);
      const rail = box(0.02, 0.012, 0.4, metal, 0, SIGHT_Y + 0.012, -0.2);
      const front = box(0.008, 0.024, 0.01, steel, 0, SIGHT_Y + 0.028, -0.44);
      const rear = box(0.024, 0.02, 0.01, steel, 0, SIGHT_Y + 0.026, 0.0);
      const bolt = box(0.014, 0.016, 0.06, steel, 0.03, SIGHT_Y - 0.012, -0.05);
      parts.mag = mag; parts.bolt = bolt;
      g.add(upper, lower, handguard, barrel, brake, gr, mag, stock, pad, rail, front, rear, bolt);
      parts.muzzle.position.set(0, SIGHT_Y - 0.014, -0.62);
      break;
    }
    case 'vanta-s12': {
      const receiver = box(0.05, 0.06, 0.3, metal, 0, SIGHT_Y - 0.02, -0.05);
      const barrel = cyl(0.012, 0.4, steel, 0, SIGHT_Y - 0.005, -0.4);
      const tube = cyl(0.014, 0.34, metal, 0, SIGHT_Y - 0.045, -0.37);
      const pump = box(0.05, 0.045, 0.14, grip, 0, SIGHT_Y - 0.045, -0.33);
      const gr = box(0.036, 0.1, 0.05, grip, 0, -0.04, 0.01);
      gr.rotation.x = 0.28;
      const stock = box(0.04, 0.1, 0.24, body, 0, SIGHT_Y - 0.045, 0.2);
      const bead = box(0.007, 0.01, 0.01, steel, 0, SIGHT_Y + 0.012, -0.57);
      parts.pump = pump;
      g.add(receiver, barrel, tube, pump, gr, stock, bead);
      parts.muzzle.position.set(0, SIGHT_Y - 0.005, -0.61);
      break;
    }
    case 'meridian-lr8': {
      const receiver = box(0.045, 0.055, 0.34, metal, 0, SIGHT_Y - 0.02, -0.02);
      const barrel = cyl(0.013, 0.5, steel, 0, SIGHT_Y - 0.01, -0.48);
      const brake = cyl(0.02, 0.07, metal, 0, SIGHT_Y - 0.01, -0.75);
      const chassis = box(0.042, 0.05, 0.5, body, 0, SIGHT_Y - 0.06, -0.2);
      const gr = box(0.034, 0.11, 0.05, grip, 0, -0.045, 0.05);
      gr.rotation.x = 0.3;
      const mag = box(0.03, 0.09, 0.07, metal, 0, -0.05, -0.08);
      const stock = box(0.04, 0.09, 0.26, body, 0, SIGHT_Y - 0.04, 0.24);
      const cheek = box(0.036, 0.03, 0.14, grip, 0, SIGHT_Y + 0.005, 0.22);
      const scopeBody = cyl(0.021, 0.2, metal, 0, SIGHT_Y + 0.035, -0.04);
      const scopeFront = cyl(0.026, 0.05, metal, 0, SIGHT_Y + 0.035, -0.15);
      const scopeEye = cyl(0.023, 0.04, metal, 0, SIGHT_Y + 0.035, 0.07);
      const boltHandle = box(0.045, 0.012, 0.012, steel, 0.035, SIGHT_Y - 0.005, 0.03);
      const bipod = box(0.008, 0.09, 0.01, metal, 0.02, SIGHT_Y - 0.1, -0.55);
      const bipod2 = bipod.clone(); bipod2.position.x = -0.02;
      parts.mag = mag; parts.bolt = boltHandle;
      g.add(receiver, barrel, brake, chassis, gr, mag, stock, cheek, scopeBody, scopeFront, scopeEye, boltHandle, bipod, bipod2);
      parts.muzzle.position.set(0, SIGHT_Y - 0.01, -0.79);
      break;
    }
    case 'cq-blade': {
      const blade = box(0.006, 0.03, 0.17, steel, 0, 0.01, -0.14);
      blade.rotation.x = 0.02;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 4), steel);
      tip.rotation.x = -Math.PI / 2;
      tip.rotation.y = Math.PI / 4;
      tip.scale.set(0.45, 1, 2.1);
      tip.position.set(0, 0.012, -0.245);
      const guardP = box(0.05, 0.012, 0.014, metal, 0, 0.005, -0.05);
      const handle = box(0.024, 0.032, 0.11, grip, 0, 0, 0.01);
      g.add(blade, tip, guardP, handle);
      parts.muzzle.position.set(0, 0, -0.25);
      break;
    }
    case 'fb-3': {
      const bodyC = cyl(0.028, 0.11, metal, 0, 0, 0, false);
      const capC = cyl(0.02, 0.03, steel, 0, 0.065, 0, false);
      const lever = box(0.012, 0.07, 0.006, steel, 0.02, 0.03, 0.02);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.016, 0.003, 6, 12), steel);
      ring.position.set(0.02, 0.075, 0.01);
      const band = cyl(0.0285, 0.02, getMaterial('paintedMetalRed'), 0, -0.03, 0, false);
      g.add(bodyC, capC, lever, ring, band);
      parts.muzzle.position.set(0, 0, -0.1);
      break;
    }
    case 'sg-2': {
      const bodyC = cyl(0.03, 0.13, metal, 0, 0, 0, false);
      const capC = cyl(0.02, 0.028, steel, 0, 0.075, 0, false);
      const lever = box(0.012, 0.07, 0.006, steel, 0.022, 0.035, 0.02);
      const band = cyl(0.0305, 0.024, getMaterial('drywallBlue'), 0, -0.035, 0, false);
      const holes = cyl(0.02, 0.012, getMaterial('electronics'), 0, -0.062, 0, false);
      g.add(bodyC, capC, lever, band, holes);
      parts.muzzle.position.set(0, 0, -0.1);
      break;
    }
  }
  g.add(parts.muzzle);
  return parts;
}

const WEAPON_ASSETS = {
  'karst-p9': 'WPN-P9', 'boreal-k5': 'WPN-K5', 'halcyon-hc4': 'WPN-HC4',
  'vanta-s12': 'WPN-S12', 'meridian-lr8': 'WPN-LR8', 'cq-blade': 'WPN-CQ', 'fb-3': 'WPN-FB3', 'sg-2': 'WPN-SG2',
};
for (const [defId, assetId] of Object.entries(WEAPON_ASSETS)) {
  registerAsset(assetId, { name: `Weapon model ${defId}`, category: 'weapon', agent: 'Fable 4', files: ['src/weapons/models.js'] });
}
