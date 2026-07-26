// Parametric weapon models (Fable 4 domain — art pass). Original fictional designs only.
// Origin at grip point; barrel along −Z; sight line at local y = SIGHT_Y.
// Contract: buildWeaponModel(defId) -> { group, muzzle, mag, bolt, pump } (+ grip markers used
// by the character rig and first-person viewmodel: gripMain, gripSupport).
// Static geometry is merged per material so each weapon costs only a handful of draw calls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getMaterial } from '../materials/index.js';
import { registerAsset } from '../core/assets.js';

export const SIGHT_Y = 0.062;

// ---------------------------------------------------------------------------
// Local weapon-specific materials (weapon art is this file's domain; world/family
// materials still come from getMaterial()).
let _wm = null;
function weaponMats() {
  if (_wm) return _wm;
  const knurl = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#808080';
    g.fillRect(0, 0, 64, 64);
    g.strokeStyle = '#b4b4b4';
    g.lineWidth = 2;
    for (let i = -64; i < 128; i += 8) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.stroke();
      g.beginPath(); g.moveTo(i + 64, 0); g.lineTo(i, 64); g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    return tex;
  })();
  _wm = {
    // receiver/barrel gunmetal — darker + more metallic than generic paintedMetal
    gunmetal: new THREE.MeshStandardMaterial({ color: 0x41464c, roughness: 0.42, metalness: 0.82 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x2e3238, roughness: 0.34, metalness: 0.9 }),
    // textured polymer grips (knurled bump)
    gripTex: new THREE.MeshStandardMaterial({ color: 0x26282b, roughness: 0.92, metalness: 0.05, bumpMap: knurl, bumpScale: 0.6 }),
    furniture: new THREE.MeshStandardMaterial({ color: 0x3a3e34, roughness: 0.78, metalness: 0.08 }),
    sight: new THREE.MeshStandardMaterial({ color: 0x1d1f22, roughness: 0.5, metalness: 0.6 }),
    sightDot: new THREE.MeshStandardMaterial({ color: 0x2a3c34, emissive: 0x59e8a8, emissiveIntensity: 1.6, roughness: 0.5 }),
    scopeGlass: new THREE.MeshStandardMaterial({ color: 0x101418, emissive: 0x2a4a5c, emissiveIntensity: 0.7, roughness: 0.08, metalness: 0.4 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc8a34a, roughness: 0.3, metalness: 0.95 }),
    shellHull: new THREE.MeshStandardMaterial({ color: 0x3d5a45, roughness: 0.62, metalness: 0.05 }),
    bandPale: new THREE.MeshStandardMaterial({ color: 0xcfccc2, roughness: 0.7, metalness: 0.1 }),
  };
  return _wm;
}

// ---------------------------------------------------------------------------
// Geometry helpers: every call returns a transformed BufferGeometry which is later
// merged per material (Bag). Dynamic parts (mag/bolt/pump) stay separate meshes.
function xform(geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  if (rx) geo.rotateX(rx);
  if (ry) geo.rotateY(ry);
  if (rz) geo.rotateZ(rz);
  geo.translate(x, y, z);
  return geo;
}
const gBox = (w, h, d, x, y, z, rx, ry, rz) => xform(new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz);
function gCylZ(r, len, x, y, z, seg = 12, r2 = null) {
  const g = new THREE.CylinderGeometry(r, r2 ?? r, len, seg);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}
const gCylY = (r, len, x, y, z, seg = 12, r2 = null) =>
  xform(new THREE.CylinderGeometry(r, r2 ?? r, len, seg), x, y, z);
// octagonal prism along Z (chamfered receiver profiles)
function gOctZ(w, h, len, x, y, z, cham = 0.28) {
  const s = new THREE.Shape();
  const hw = w / 2, hh = h / 2, cx = w * cham * 0.5, cy = h * cham * 0.5;
  s.moveTo(-hw + cx, -hh);
  s.lineTo(hw - cx, -hh); s.lineTo(hw, -hh + cy); s.lineTo(hw, hh - cy);
  s.lineTo(hw - cx, hh); s.lineTo(-hw + cx, hh); s.lineTo(-hw, hh - cy);
  s.lineTo(-hw, -hh + cy); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
  g.translate(0, 0, -len / 2);
  g.translate(x, y, z);
  return g;
}

// Draw-call control: static geometry collapses into three shared vertex-colored bucket
// materials (metal / polymer / textured-grip); source material colors are baked into
// vertex colors. Emissive/glass specials keep their own material.
let _buckets = null;
function buckets() {
  if (_buckets) return _buckets;
  const wm = weaponMats();
  _buckets = {
    met: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.42, metalness: 0.82, vertexColors: true }),
    pol: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72, metalness: 0.05, vertexColors: true }),
    grp: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0.05, bumpMap: wm.gripTex.bumpMap, bumpScale: 0.6, vertexColors: true }),
  };
  return _buckets;
}
function bucketFor(m) {
  if (m.emissive && m.emissive.getHex && m.emissive.getHex() !== 0) return null; // keep own material
  if (m.bumpMap) return 'grp';
  return (m.metalness ?? 0) >= 0.5 ? 'met' : 'pol';
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
  add(mat, ...geos) {
    const bucket = bucketFor(mat);
    const key = bucket ?? mat;
    let l = this.lists.get(key);
    if (!l) { l = []; this.lists.set(key, l); }
    for (let g of geos) {
      if (g.index) g = g.toNonIndexed();
      if (bucket) paint(g, mat.color);
      l.push(g);
    }
    return this;
  }
  build(group) {
    for (const [key, geos] of this.lists) {
      const merged = mergeGeometries(geos, false);
      for (const g of geos) g.dispose();
      const mesh = new THREE.Mesh(merged, typeof key === 'string' ? buckets()[key] : key);
      mesh.castShadow = true;
      group.add(mesh);
    }
  }
}

function marker(x, y, z, rx = 0, ry = 0, rz = 0) {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  return o;
}

// rail teeth strip (picatinny-ish) — cheap repeated boxes
function railTeeth(bag, mat, y, z0, z1, w = 0.022, pitch = 0.02) {
  for (let z = z0; z > z1; z -= pitch) {
    bag.add(mat, gBox(w, 0.006, pitch * 0.55, 0, y, z));
  }
}

// dynamic part helper: separate mesh (mag/bolt/pump) sharing the bucket materials
function dynMesh(mat, geos) {
  const bucket = bucketFor(mat);
  const painted = geos.map((g) => {
    if (g.index) g = g.toNonIndexed();
    if (bucket) paint(g, mat.color);
    return g;
  });
  const merged = mergeGeometries(painted, false);
  for (const g of painted) g.dispose();
  const mesh = new THREE.Mesh(merged, bucket ? buckets()[bucket] : mat);
  mesh.castShadow = true;
  return mesh;
}

// ---------------------------------------------------------------------------
export function buildWeaponModel(defId) {
  const g = new THREE.Group();
  g.name = 'weapon-' + defId;
  const parts = { group: g, muzzle: new THREE.Object3D(), mag: null, bolt: null, pump: null, gripMain: null, gripSupport: null };
  const wm = weaponMats();
  const body = getMaterial('hardPlastic');
  const metal = wm.gunmetal;
  const steel = getMaterial('brushedMetal');
  const grip = wm.gripTex;
  const rubber = getMaterial('rubber');
  const bag = new Bag();
  const SY = SIGHT_Y;

  switch (defId) {
    // ------------------------------------------------ compact service pistol
    case 'karst-p9': {
      const slideY = SY - 0.014;
      // slide: octagonal profile w/ serrations front + rear, top rib
      bag.add(steel,
        gOctZ(0.032, 0.034, 0.19, 0, slideY, -0.06, 0.34),
        gBox(0.034, 0.006, 0.05, 0, slideY + 0.014, 0.015), // rear cocking wings
        gBox(0.01, 0.03, 0.012, 0, slideY, -0.153), // muzzle face block
      );
      for (let i = 0; i < 6; i++) bag.add(wm.darkSteel, gBox(0.035, 0.02, 0.0035, 0, slideY + 0.004, 0.028 - i * 0.008));
      for (let i = 0; i < 4; i++) bag.add(wm.darkSteel, gBox(0.035, 0.018, 0.0035, 0, slideY + 0.004, -0.118 - i * 0.008));
      // ejection port (right side inset) + extractor
      bag.add(wm.darkSteel, gBox(0.004, 0.016, 0.034, 0.0155, slideY + 0.006, -0.028));
      // barrel visible at crown
      bag.add(wm.darkSteel, gCylZ(0.008, 0.014, 0, slideY, -0.156));
      // frame: dust cover + rail teeth + trigger guard
      bag.add(body,
        gOctZ(0.03, 0.03, 0.115, 0, SY - 0.046, -0.093, 0.3),
        gBox(0.028, 0.03, 0.05, 0, SY - 0.045, -0.008), // frame rear over grip
        gBox(0.024, 0.007, 0.052, 0, -0.008, -0.062), // guard bottom
        gBox(0.024, 0.02, 0.007, 0, 0.002, -0.085, 0.35), // guard front slant
        gBox(0.024, 0.026, 0.007, 0, SY - 0.075, -0.033), // guard rear post
      );
      railTeeth(bag, body, SY - 0.064, -0.075, -0.13, 0.026, 0.016);
      // grip: textured panels + backstrap; slight rake
      bag.add(grip,
        gBox(0.031, 0.1, 0.04, 0, -0.028, 0.011, 0.18),
        gBox(0.026, 0.096, 0.012, 0, -0.026, 0.033, 0.18), // backstrap
        gBox(0.03, 0.014, 0.05, 0, 0.022, 0.006, 0.18), // beavertail web
      );
      // trigger + hammer + controls
      bag.add(wm.darkSteel,
        gBox(0.007, 0.024, 0.006, 0, -0.004, -0.048, -0.22), // trigger blade
        gBox(0.012, 0.012, 0.01, 0, SY - 0.006, 0.033, 0.5), // hammer nub
        gBox(0.004, 0.006, 0.024, -0.017, SY - 0.032, 0.0), // slide release L
        gBox(0.005, 0.008, 0.01, -0.017, SY - 0.05, 0.018), // safety lever
      );
      bag.add(steel, gCylY(0.004, 0.036, 0, SY - 0.038, -0.02, 8, 0.004).rotateZ(Math.PI / 2)); // takedown pin
      // sights: rear notch blocks + front post with luminous dot
      bag.add(wm.sight,
        gBox(0.007, 0.011, 0.008, -0.0085, SY + 0.008, 0.028),
        gBox(0.007, 0.011, 0.008, 0.0085, SY + 0.008, 0.028),
        gBox(0.005, 0.012, 0.007, 0, SY + 0.0085, -0.148),
      );
      bag.add(wm.sightDot, gBox(0.003, 0.003, 0.002, 0, SY + 0.012, -0.152));
      // magazine w/ extended baseplate (dynamic)
      parts.mag = dynMesh(metal, [
        gBox(0.024, 0.088, 0.032, 0, -0.036, 0.008, 0.18),
        gBox(0.03, 0.012, 0.042, 0, -0.082, 0.017, 0.18),
      ]);
      // slide is static-merged; provide a thin dynamic bolt proxy (top rear) for anims
      parts.bolt = dynMesh(steel, [gBox(0.03, 0.005, 0.04, 0, slideY + 0.019, 0.016)]);
      g.add(parts.mag, parts.bolt);
      parts.muzzle.position.set(0, slideY, -0.168);
      parts.gripMain = marker(0, -0.03, 0.012, -0.12);
      parts.gripSupport = marker(0, -0.055, -0.01, -0.1); // support hand cups the grip
      break;
    }
    // ------------------------------------------------ compact SMG
    case 'boreal-k5': {
      const bY = SY - 0.014;
      // tubular upper + rectangular lower
      bag.add(metal,
        gCylZ(0.023, 0.3, 0, bY, -0.1, 14),
        gBox(0.044, 0.015, 0.3, 0, bY - 0.012, -0.1), // weld seam block
        gCylZ(0.024, 0.02, 0, bY, 0.048, 14), // rear cap
      );
      bag.add(body,
        gBox(0.042, 0.05, 0.2, 0, bY - 0.043, -0.05), // lower/trigger housing
        gBox(0.04, 0.045, 0.055, 0, bY - 0.04, -0.185, -0.12), // magwell flare
      );
      // perforated barrel shroud
      bag.add(metal, gCylZ(0.02, 0.13, 0, bY, -0.3, 12));
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        for (let j = 0; j < 3; j++) {
          bag.add(wm.darkSteel, gCylZ(0.005, 0.132, Math.cos(a) * 0.02, bY + Math.sin(a) * 0.02, -0.3, 6));
        }
      }
      bag.add(steel, gCylZ(0.01, 0.09, 0, bY, -0.4, 10));
      bag.add(wm.darkSteel, gCylZ(0.014, 0.03, 0, bY, -0.435, 10, 0.011)); // slanted muzzle cap
      // charging handle slot + handle (dynamic bolt)
      bag.add(wm.darkSteel, gBox(0.003, 0.005, 0.16, -0.0235, bY + 0.006, -0.09));
      parts.bolt = dynMesh(steel, [
        gBox(0.018, 0.01, 0.022, -0.032, bY + 0.004, -0.05),
        gCylZ(0.007, 0.02, -0.038, bY + 0.004, -0.05, 8),
      ]);
      // grip + trigger + selector
      bag.add(grip, gBox(0.032, 0.095, 0.042, 0, -0.036, -0.018, 0.22));
      bag.add(wm.darkSteel,
        gBox(0.007, 0.022, 0.006, 0, -0.005, -0.075, -0.2),
        gBox(0.022, 0.007, 0.05, 0, -0.026, -0.075), // guard bottom
        gBox(0.004, 0.01, 0.016, -0.023, bY - 0.045, 0.0), // selector
      );
      // curved magazine (two segments, dynamic)
      parts.mag = dynMesh(metal, [
        gBox(0.028, 0.08, 0.046, 0, -0.045, -0.155, -0.08),
        gBox(0.028, 0.075, 0.046, 0, -0.115, -0.143, -0.24),
        gBox(0.03, 0.006, 0.048, 0, -0.152, -0.132, -0.24), // baseplate
      ]);
      // skeleton folding-style stock: struts + pad
      bag.add(metal,
        gBox(0.008, 0.008, 0.17, -0.012, bY, 0.14, 0, 0, 0),
        gBox(0.008, 0.008, 0.17, 0.012, bY, 0.14),
        gBox(0.008, 0.05, 0.012, -0.012, bY - 0.026, 0.21),
        gBox(0.008, 0.05, 0.012, 0.012, bY - 0.026, 0.21),
      );
      bag.add(rubber, gBox(0.034, 0.085, 0.016, 0, bY - 0.026, 0.225));
      // sights: hooded front post + rear notch drum
      bag.add(wm.sight,
        gBox(0.003, 0.02, 0.006, -0.011, SY + 0.008, -0.245),
        gBox(0.003, 0.02, 0.006, 0.011, SY + 0.008, -0.245),
        gBox(0.025, 0.003, 0.006, 0, SY + 0.019, -0.245),
        gBox(0.004, 0.014, 0.005, 0, SY + 0.006, -0.245),
        gCylZ(0.009, 0.012, 0, SY + 0.008, 0.02, 10), // rear drum
        gBox(0.02, 0.008, 0.008, 0, SY + 0.002, 0.02),
      );
      bag.add(wm.sightDot, gBox(0.0028, 0.0028, 0.002, 0, SY + 0.011, -0.249));
      g.add(parts.mag, parts.bolt);
      parts.muzzle.position.set(0, bY, -0.452);
      parts.gripMain = marker(0, -0.04, -0.016, -0.15);
      parts.gripSupport = marker(0, bY - 0.028, -0.185, 0.15); // magwell hold
      break;
    }
    // ------------------------------------------------ modern carbine
    case 'halcyon-hc4': {
      const bY = SY - 0.018;
      // upper receiver: flat-top octagon + rail
      bag.add(metal,
        gOctZ(0.048, 0.048, 0.24, 0, bY, -0.09, 0.3),
        gBox(0.02, 0.02, 0.03, 0.026, bY + 0.004, -0.005, 0, 0, 0.6), // brass deflector
        gCylZ(0.008, 0.012, 0.028, bY - 0.004, 0.018, 8), // forward assist
      );
      railTeeth(bag, metal, bY + 0.028, 0.02, -0.21, 0.022, 0.018);
      // ejection port inset + door
      bag.add(wm.darkSteel, gBox(0.003, 0.018, 0.06, 0.0245, bY - 0.002, -0.06));
      // lower receiver + magwell + guard
      bag.add(body,
        gBox(0.044, 0.042, 0.17, 0, bY - 0.043, -0.045),
        gBox(0.046, 0.05, 0.055, 0, bY - 0.055, -0.115, -0.1), // flared magwell
        gBox(0.022, 0.006, 0.055, 0, -0.014, -0.063),
        gBox(0.022, 0.022, 0.006, 0, -0.003, -0.088, 0.4),
      );
      bag.add(wm.darkSteel,
        gBox(0.007, 0.024, 0.006, 0, 0.004, -0.05, -0.22), // trigger
        gBox(0.004, 0.008, 0.022, -0.024, bY - 0.036, 0.008), // selector L
        gBox(0.004, 0.008, 0.022, 0.024, bY - 0.036, 0.008), // selector R
        gBox(0.016, 0.01, 0.012, -0.026, bY - 0.05, -0.1), // mag release fence
      );
      // handguard: slim octagon with slots + continued top rail
      bag.add(body, gOctZ(0.044, 0.046, 0.26, 0, bY, -0.35, 0.36));
      railTeeth(bag, body, bY + 0.027, -0.23, -0.47, 0.02, 0.02);
      for (const sx of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          bag.add(wm.darkSteel, gBox(0.004, 0.012, 0.05, sx * 0.0225, bY - 0.004, -0.27 - i * 0.07));
        }
      }
      bag.add(wm.darkSteel, gBox(0.04, 0.005, 0.24, 0, bY - 0.026, -0.35)); // bottom slot strip
      // barrel + gas block + brake with kerf cuts
      bag.add(steel, gCylZ(0.0095, 0.13, 0, bY, -0.53, 10));
      bag.add(wm.darkSteel, gBox(0.02, 0.024, 0.02, 0, bY + 0.002, -0.5));
      bag.add(metal,
        gCylZ(0.015, 0.055, 0, bY, -0.596, 10),
        gBox(0.032, 0.006, 0.04, 0, bY, -0.596), // side ports
      );
      bag.add(wm.darkSteel, gCylZ(0.0158, 0.005, 0, bY, -0.582, 10), gCylZ(0.0158, 0.005, 0, bY, -0.6, 10));
      // pistol grip w/ swell + stock w/ buffer tube
      bag.add(grip, gBox(0.032, 0.105, 0.046, 0, -0.044, 0.004, 0.25), gBox(0.034, 0.02, 0.05, 0, -0.09, 0.015, 0.25));
      bag.add(metal, gCylZ(0.016, 0.13, 0, bY - 0.004, 0.1, 10));
      bag.add(body,
        gBox(0.036, 0.052, 0.13, 0, bY - 0.02, 0.19),
        gBox(0.03, 0.026, 0.1, 0, bY + 0.012, 0.2), // cheek riser
        gBox(0.034, 0.06, 0.02, 0, bY - 0.028, 0.252, -0.12), // butt plate slant
      );
      bag.add(rubber, gBox(0.036, 0.075, 0.012, 0, bY - 0.028, 0.263, -0.12));
      bag.add(wm.darkSteel, gCylY(0.006, 0.037, 0, bY - 0.02, 0.225, 8).rotateZ(Math.PI / 2)); // QD hole
      // sights: front post w/ wings + rear aperture w/ wings
      bag.add(wm.sight,
        gBox(0.004, 0.018, 0.006, 0, SY + 0.022, -0.455),
        gBox(0.004, 0.024, 0.008, -0.012, SY + 0.02, -0.455),
        gBox(0.004, 0.024, 0.008, 0.012, SY + 0.02, -0.455),
        gBox(0.024, 0.016, 0.008, 0, SY + 0.02, 0.008),
        gCylZ(0.007, 0.01, 0, SY + 0.026, 0.008, 10),
      );
      bag.add(wm.sightDot, gBox(0.003, 0.003, 0.002, 0, SY + 0.0295, -0.458));
      // curved magazine (dynamic)
      parts.mag = dynMesh(metal, [
        gBox(0.03, 0.075, 0.058, 0, -0.055, -0.12, -0.14),
        gBox(0.03, 0.075, 0.058, 0, -0.125, -0.098, -0.34),
        gBox(0.032, 0.008, 0.06, 0, -0.16, -0.082, -0.34),
        gBox(0.032, 0.003, 0.059, 0, -0.075, -0.113, -0.14), // rib
        gBox(0.032, 0.003, 0.059, 0, -0.1, -0.106, -0.24),
      ]);
      // charging handle (dynamic bolt)
      parts.bolt = dynMesh(steel, [
        gBox(0.036, 0.008, 0.025, 0, bY + 0.012, 0.028),
        gBox(0.012, 0.012, 0.03, 0.028, bY - 0.008, -0.045), // side reciprocating nub
      ]);
      g.add(parts.mag, parts.bolt);
      parts.muzzle.position.set(0, bY, -0.628);
      parts.gripMain = marker(0, -0.045, 0.004, -0.2);
      parts.gripSupport = marker(0, bY - 0.03, -0.36, 0.1);
      break;
    }
    // ------------------------------------------------ pump shotgun
    case 'vanta-s12': {
      const bY = SY - 0.01;
      const tubeY = bY - 0.038;
      // receiver: chunky octagon w/ ejection + loading ports
      bag.add(metal,
        gOctZ(0.05, 0.058, 0.22, 0, bY - 0.008, -0.03, 0.3),
        gBox(0.02, 0.012, 0.03, 0, bY - 0.044, 0.02), // safety/trigger housing top
      );
      bag.add(wm.darkSteel,
        gBox(0.003, 0.02, 0.055, 0.0255, bY, -0.04), // ejection port
        gBox(0.03, 0.003, 0.05, 0, bY - 0.037, -0.05), // loading port
      );
      // barrel over tube mag + clamp + vent rib
      bag.add(steel, gCylZ(0.0115, 0.42, 0, bY + 0.004, -0.35, 12));
      bag.add(metal, gCylZ(0.0135, 0.4, 0, tubeY, -0.32, 12));
      bag.add(metal, gBox(0.032, 0.05, 0.014, 0, bY - 0.017, -0.5)); // barrel clamp
      bag.add(wm.darkSteel, gBox(0.008, 0.004, 0.4, 0, bY + 0.02, -0.34)); // rib
      bag.add(wm.darkSteel, gCylZ(0.0145, 0.02, 0, tubeY, -0.518, 10)); // tube cap
      // action bars
      bag.add(steel,
        gBox(0.004, 0.01, 0.24, -0.017, tubeY + 0.004, -0.22),
        gBox(0.004, 0.01, 0.24, 0.017, tubeY + 0.004, -0.22),
      );
      // ribbed pump (dynamic)
      const pumpGeos = [gCylZ(0.021, 0.13, 0, tubeY, -0.31, 12)];
      for (let i = 0; i < 5; i++) pumpGeos.push(gCylZ(0.0235, 0.012, 0, tubeY, -0.36 + i * 0.025, 12));
      parts.pump = dynMesh(wm.furniture, pumpGeos);
      // stock: solid shoulder stock w/ grip swell + cheek + recoil pad
      bag.add(wm.furniture,
        gBox(0.038, 0.052, 0.09, 0, bY - 0.03, 0.075, 0.5), // wrist
        gBox(0.04, 0.095, 0.17, 0, bY - 0.055, 0.185, 0.08),
        gBox(0.032, 0.026, 0.11, 0, bY + 0.008, 0.19), // cheek riser
      );
      bag.add(rubber, gBox(0.042, 0.105, 0.018, 0, bY - 0.06, 0.272, 0.08));
      bag.add(wm.darkSteel,
        gBox(0.007, 0.022, 0.006, 0, -0.006, -0.012, -0.2), // trigger
        gBox(0.022, 0.006, 0.05, 0, -0.028, -0.02),
        gBox(0.022, 0.02, 0.006, 0, -0.012, -0.045, 0.4),
        gCylZ(0.005, 0.014, 0.02, bY - 0.042, 0.035, 8), // safety button
      );
      // side saddle with 4 visible shells
      for (let i = 0; i < 4; i++) {
        const z = -0.095 + i * 0.042;
        bag.add(wm.shellHull, gCylZ(0.0092, 0.05, -0.033, bY + 0.002, z, 8));
        bag.add(wm.brass, gCylZ(0.0098, 0.012, -0.033, bY + 0.002, z + 0.026, 8));
      }
      bag.add(metal, gBox(0.008, 0.05, 0.19, -0.028, bY + 0.002, -0.032)); // saddle plate
      // bead sight + rear reference groove
      bag.add(wm.sightDot, gCylY(0.004, 0.006, 0, SY + 0.014, -0.545, 8));
      bag.add(wm.sight, gBox(0.005, 0.006, 0.005, 0, SY + 0.012, -0.545), gBox(0.018, 0.004, 0.02, 0, SY + 0.017, 0.06));
      g.add(parts.pump);
      parts.muzzle.position.set(0, bY + 0.004, -0.575);
      parts.gripMain = marker(0, bY - 0.045, 0.075, -0.35);
      parts.gripSupport = marker(0, tubeY - 0.02, -0.31, 0.1);
      break;
    }
    // ------------------------------------------------ precision rifle
    case 'meridian-lr8': {
      const bY = SY - 0.012;
      // receiver + full-length chassis
      bag.add(metal, gOctZ(0.044, 0.052, 0.26, 0, bY - 0.004, -0.03, 0.3));
      railTeeth(bag, metal, bY + 0.028, 0.06, -0.13, 0.022, 0.018);
      bag.add(body,
        gOctZ(0.042, 0.048, 0.34, 0, bY - 0.05, -0.25, 0.4), // free-float forend
        gBox(0.04, 0.05, 0.14, 0, bY - 0.05, 0.02), // chassis center
      );
      for (const sx of [-1, 1]) {
        for (let i = 0; i < 4; i++) bag.add(wm.darkSteel, gBox(0.004, 0.012, 0.045, sx * 0.0215, bY - 0.05, -0.16 - i * 0.062));
      }
      // fluted barrel + big brake
      bag.add(steel, gCylZ(0.0125, 0.42, 0, bY, -0.55, 12));
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.39;
        bag.add(wm.darkSteel, gBox(0.004, 0.004, 0.34, Math.cos(a) * 0.0125, bY + Math.sin(a) * 0.0125, -0.52));
      }
      bag.add(metal, gCylZ(0.019, 0.075, 0, bY, -0.77, 10));
      for (let i = 0; i < 3; i++) bag.add(wm.darkSteel, gCylZ(0.0197, 0.006, 0, bY, -0.748 - i * 0.022, 10));
      // scope: rings + tube + bells + turrets + glass
      bag.add(metal,
        gCylZ(0.015, 0.17, 0, SY + 0.038, -0.02, 12),
        gCylZ(0.023, 0.07, 0, SY + 0.038, -0.13, 12, 0.016), // objective bell
        gCylZ(0.019, 0.05, 0, SY + 0.038, 0.075, 12, 0.016), // eyepiece
        gCylY(0.009, 0.02, 0, SY + 0.06, -0.02, 8), // elevation turret
        gBox(0.02, 0.024, 0.024, 0, SY + 0.014, -0.075), // ring front
        gBox(0.02, 0.024, 0.024, 0, SY + 0.014, 0.03), // ring rear
      );
      bag.add(wm.darkSteel, gCylY(0.009, 0.018, 0.014, SY + 0.038, -0.02, 8).rotateZ(Math.PI / 2)); // windage
      bag.add(wm.scopeGlass, gCylZ(0.02, 0.004, 0, SY + 0.038, -0.163, 12), gCylZ(0.014, 0.004, 0, SY + 0.038, 0.099, 12));
      // grip + thumbhole stock + cheek + pad + bag rider
      bag.add(grip, gBox(0.032, 0.1, 0.048, 0, -0.042, 0.05, 0.3));
      bag.add(body,
        gBox(0.038, 0.075, 0.2, 0, bY - 0.035, 0.21),
        gBox(0.03, 0.026, 0.12, 0, bY + 0.014, 0.22), // cheek plate
        gBox(0.034, 0.05, 0.05, 0, bY - 0.095, 0.27), // bag rider hook
      );
      bag.add(wm.darkSteel, gBox(0.032, 0.03, 0.11, 0, bY + 0.016, 0.22)); // riser contrast? keep subtle
      bag.add(rubber, gBox(0.04, 0.09, 0.016, 0, bY - 0.03, 0.312));
      bag.add(wm.darkSteel,
        gBox(0.007, 0.024, 0.006, 0, -0.002, -0.005, -0.2),
        gBox(0.022, 0.006, 0.05, 0, -0.024, -0.012),
        gBox(0.022, 0.02, 0.006, 0, -0.008, -0.038, 0.4),
      );
      // folded bipod under forend
      for (const sx of [-1, 1]) {
        bag.add(metal, gBox(0.008, 0.012, 0.1, sx * 0.014, bY - 0.082, -0.35, -0.12));
        bag.add(rubber, gBox(0.01, 0.014, 0.014, sx * 0.014, bY - 0.088, -0.298));
      }
      bag.add(metal, gBox(0.036, 0.014, 0.03, 0, bY - 0.078, -0.395));
      // box mag (dynamic) + bolt handle (dynamic)
      parts.mag = dynMesh(metal, [
        gBox(0.03, 0.08, 0.068, 0, -0.045, -0.075, -0.08),
        gBox(0.032, 0.008, 0.07, 0, -0.086, -0.07, -0.08),
      ]);
      parts.bolt = dynMesh(steel, [
        gCylZ(0.006, 0.04, 0.03, bY + 0.006, 0.028, 8).rotateZ(0.5),
        xform(new THREE.SphereGeometry(0.011, 8, 6), 0.043, bY - 0.008, 0.036),
        gCylZ(0.009, 0.05, 0, bY + 0.01, 0.03, 10), // bolt body
      ]);
      g.add(parts.mag, parts.bolt);
      parts.muzzle.position.set(0, bY, -0.812);
      parts.gripMain = marker(0, -0.042, 0.05, -0.25);
      parts.gripSupport = marker(0, bY - 0.075, -0.3, 0.1);
      break;
    }
    // ------------------------------------------------ field knife
    case 'cq-blade': {
      // blade: extruded drop-point outline, thin; spine + fuller
      const s = new THREE.Shape();
      s.moveTo(0, 0.006); // heel top
      s.lineTo(-0.15, 0.011); // spine rise
      s.lineTo(-0.21, 0.004); // drop point start
      s.lineTo(-0.235, -0.007); // tip
      s.lineTo(-0.16, -0.016); // belly
      s.lineTo(-0.02, -0.014);
      s.lineTo(0, -0.012);
      s.closePath();
      const bladeGeo = new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.0016, bevelSize: 0.003, bevelSegments: 1 });
      bladeGeo.rotateY(-Math.PI / 2);
      bladeGeo.rotateY(Math.PI); // outline drawn in -X; map onto -Z axis
      bladeGeo.translate(-0.002, 0.012, -0.03);
      bag.add(steel, bladeGeo);
      bag.add(wm.darkSteel, gBox(0.0052, 0.004, 0.13, 0, 0.019, -0.1)); // spine flat
      bag.add(wm.darkSteel, gBox(0.0056, 0.0035, 0.1, 0, 0.011, -0.09)); // fuller groove
      // guard + wrapped handle + pommel
      bag.add(wm.darkSteel, gBox(0.012, 0.042, 0.008, 0, 0.004, -0.028));
      const hAxis = [];
      for (let i = 0; i < 5; i++) hAxis.push(gCylZ(0.0125, 0.017, 0, 0.002, -0.012 + i * 0.019, 10));
      bag.add(grip, ...hAxis);
      bag.add(wm.darkSteel,
        gBox(0.02, 0.028, 0.014, 0, 0.002, 0.088), // pommel
        gCylY(0.004, 0.022, 0, 0.002, 0.088, 6).rotateZ(Math.PI / 2), // lanyard tube
      );
      parts.muzzle.position.set(0, 0.005, -0.26);
      parts.gripMain = marker(0, 0.002, 0.035, 0);
      break;
    }
    // ------------------------------------------------ flash device
    case 'fb-3': {
      const bodyM = metal;
      bag.add(bodyM, gCylY(0.026, 0.1, 0, 0, 0, 14));
      bag.add(wm.darkSteel, gCylY(0.0265, 0.008, 0, 0.028, 0, 14), gCylY(0.0265, 0.008, 0, -0.028, 0, 14)); // rolled ribs
      bag.add(wm.bandPale, gCylY(0.0268, 0.014, 0, 0.012, 0, 14)); // pale ID band
      // vent holes top ring
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        bag.add(wm.darkSteel, gCylY(0.005, 0.104, Math.cos(a) * 0.017, 0, Math.sin(a) * 0.017, 6));
      }
      // fuze head + spoon + pin
      bag.add(steel,
        gCylY(0.012, 0.02, 0, 0.058, 0, 10),
        gCylY(0.018, 0.012, 0, 0.052, 0, 10),
      );
      bag.add(wm.darkSteel,
        gBox(0.014, 0.05, 0.004, 0.004, 0.038, 0.024, -0.25), // spoon upper
        gBox(0.014, 0.055, 0.0035, 0.004, -0.008, 0.03, 0.06), // spoon lower hugging body
      );
      const ring = new THREE.TorusGeometry(0.014, 0.0025, 6, 14);
      ring.rotateY(Math.PI / 2);
      ring.translate(-0.014, 0.062, 0.004);
      bag.add(steel, ring, gCylZ(0.003, 0.014, 0, 0.06, 0.004, 6).rotateZ(Math.PI / 2));
      parts.muzzle.position.set(0, 0, -0.1);
      parts.gripMain = marker(0, 0, 0, 0);
      break;
    }
    // ------------------------------------------------ smoke device
    case 'sg-2': {
      bag.add(metal, gCylY(0.029, 0.125, 0, 0, 0, 14));
      bag.add(getMaterial('drywallBlue'), gCylY(0.0295, 0.02, 0, -0.026, 0, 14)); // blue ID band
      bag.add(wm.darkSteel, gCylY(0.0295, 0.007, 0, 0.03, 0, 14));
      // top + bottom emission holes
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.3;
        bag.add(wm.darkSteel, gCylY(0.0045, 0.008, Math.cos(a) * 0.018, 0.063, Math.sin(a) * 0.018, 6));
      }
      bag.add(wm.darkSteel, gCylY(0.007, 0.006, 0, -0.064, 0, 8));
      // fuze + spoon + pin
      bag.add(steel, gCylY(0.011, 0.018, 0, 0.07, 0, 10), gCylY(0.017, 0.012, 0, 0.062, 0, 10));
      bag.add(wm.darkSteel,
        gBox(0.014, 0.05, 0.004, 0.004, 0.048, 0.026, -0.25),
        gBox(0.014, 0.06, 0.0035, 0.004, -0.002, 0.033, 0.05),
      );
      const ring2 = new THREE.TorusGeometry(0.014, 0.0025, 6, 14);
      ring2.rotateY(Math.PI / 2);
      ring2.translate(-0.013, 0.072, 0.004);
      bag.add(steel, ring2, gCylZ(0.003, 0.014, 0, 0.07, 0.004, 6).rotateZ(Math.PI / 2));
      parts.muzzle.position.set(0, 0, -0.1);
      parts.gripMain = marker(0, 0, 0, 0);
      break;
    }
  }
  bag.build(g);
  g.add(parts.muzzle);
  if (!parts.gripMain) parts.gripMain = marker(0, -0.03, 0, 0);
  g.add(parts.gripMain);
  if (parts.gripSupport) g.add(parts.gripSupport);
  return parts;
}

// Weapon family (drives muzzle flash / casing style in the VFX system).
export function weaponFamily(defId) {
  switch (defId) {
    case 'karst-p9': return 'pistol';
    case 'boreal-k5': return 'smg';
    case 'halcyon-hc4': return 'rifle';
    case 'vanta-s12': return 'shotgun';
    case 'meridian-lr8': return 'sniper';
    default: return 'none';
  }
}

const WEAPON_ASSETS = {
  'karst-p9': ['WPN-P9', 'Karst P9 service pistol'],
  'boreal-k5': ['WPN-K5', 'Boreal K5 SMG'],
  'halcyon-hc4': ['WPN-HC4', 'Halcyon HC-4 carbine'],
  'vanta-s12': ['WPN-S12', 'Vanta S-12 pump shotgun'],
  'meridian-lr8': ['WPN-LR8', 'Meridian LR-8 precision rifle'],
  'cq-blade': ['WPN-CQ', 'Fieldman CQ field knife'],
  'fb-3': ['WPN-FB3', 'FB-3 Dazzler flash device'],
  'sg-2': ['WPN-SG2', 'SG-2 Veil smoke device'],
};
for (const [defId, [assetId, name]] of Object.entries(WEAPON_ASSETS)) {
  registerAsset(assetId, {
    name, category: 'weapon', agent: 'Fable 4', files: ['src/weapons/models.js'],
    build: () => {
      const p = buildWeaponModel(defId);
      p.group.scale.setScalar(3);
      p.group.position.y = 0.8;
      return p;
    },
  });
}
