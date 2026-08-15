// Wheel kit: lathe AT carcass with rounded shoulders + proud ribs/lugs,
// dedicated sidewall lettering bands (tire map UV remapped to the letter
// row; flipY=false / repeat(1,3) left intact), 5-spoke beadlock rim (lip,
// barrel, ring + 16 bolts), hub + 5 chrome lugs, vented rotor, painted
// caliper on the unsprung group, valve stem. Axles: pumpkins, pinions,
// transfer case, control-arm nubs.

import * as THREE from 'three';
import { add, box, cyl, group, sphere, torus } from '../geo.js';
import { SPEC as S } from './spec.js';

function shaded(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function openCyl(rTop, rBot, h, segs, mat) {
  return shaded(new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segs, 1, true), mat));
}

// Tire map: u across width, v around tread; lettering at V 0.78–0.92.
// Material repeat is (1, 3), so mesh UV.y must be divided by 3.
function mapLetterUV(geometry) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const v = uv.getY(i);
    uv.setY(i, (0.785 + v * 0.13) / 3);
  }
  uv.needsUpdate = true;
}

function mapTreadUV(geometry) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const v = uv.getY(i);
    uv.setY(i, (0.06 + v * 0.62) / 3);
  }
  uv.needsUpdate = true;
}

function mapCarcassUV(geometry) {
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const v = uv.getY(i);
    const mid = 1 - Math.abs(v - 0.5) * 2;
    uv.setY(i, (0.16 + mid * 0.48) / 3);
  }
  uv.needsUpdate = true;
}

function addLetterBand(spin, x, rTowardTread, rTowardBead, mat) {
  const rTop = x > 0 ? rTowardTread : rTowardBead;
  const rBot = x > 0 ? rTowardBead : rTowardTread;
  const geo = new THREE.CylinderGeometry(rTop, rBot, 0.044, 40, 1, true);
  mapLetterUV(geo);
  const band = shaded(new THREE.Mesh(geo, mat.tire));
  band.rotation.z = Math.PI / 2;
  band.position.x = x;
  spin.add(band);
}

export function buildWheel(mat, side = 1) {
  const g = group('wheel');
  const spin = group('spin');
  g.add(spin);

  // --- carcass: 33" AT profile, axis along X after z = PI/2 ---
  const w = S.wheelWidth;
  const R = S.wheelRadius;
  const bead = S.rimRadius + 0.014;
  const pts = [
    new THREE.Vector2(bead, -w * 0.5),
    new THREE.Vector2(bead + 0.028, -w * 0.5 + 0.007),
    new THREE.Vector2(0.352, -w * 0.47),
    new THREE.Vector2(0.394, -w * 0.37),
    new THREE.Vector2(0.414, -w * 0.26),
    new THREE.Vector2(R - 0.006, -w * 0.16),
    new THREE.Vector2(R - 0.004, 0),
    new THREE.Vector2(R - 0.006, w * 0.16),
    new THREE.Vector2(0.414, w * 0.26),
    new THREE.Vector2(0.394, w * 0.37),
    new THREE.Vector2(0.352, w * 0.47),
    new THREE.Vector2(bead + 0.028, w * 0.5 - 0.007),
    new THREE.Vector2(bead, w * 0.5),
  ];
  const carcassGeo = new THREE.LatheGeometry(pts, 48);
  mapCarcassUV(carcassGeo);
  const carcass = shaded(new THREE.Mesh(carcassGeo, mat.tire));
  carcass.rotation.z = Math.PI / 2;
  spin.add(carcass);

  // Proud circumferential ribs (groove volume between them)
  for (const x of [-0.068, -0.022, 0.022, 0.068]) {
    const ribGeo = new THREE.CylinderGeometry(R, R, 0.036, 40, 1, true);
    mapTreadUV(ribGeo);
    const rib = shaded(new THREE.Mesh(ribGeo, mat.tire));
    rib.rotation.z = Math.PI / 2;
    rib.position.x = x;
    spin.add(rib);
  }

  // Outer-shoulder AT lugs — readable in the wheel close-up
  const lugN = 14;
  const lugR = R - 0.01;
  for (let i = 0; i < lugN; i++) {
    const a = (i / lugN) * Math.PI * 2 + (i % 2) * 0.08;
    const lug = box(0.052, 0.028, 0.058, mat.tire);
    lug.position.set(side * 0.108, Math.sin(a) * lugR, Math.cos(a) * lugR);
    lug.rotation.x = a;
    spin.add(lug);
  }

  // Sidewall lettering sits on the bulge (both faces)
  addLetterBand(spin, side * w * 0.385, 0.392, 0.362, mat);
  addLetterBand(spin, -side * w * 0.385, 0.392, 0.362, mat);

  // Bead rubber where the carcass meets the rim
  for (const sx of [-1, 1]) {
    const beadRing = openCyl(S.rimRadius + 0.02, S.rimRadius + 0.03, 0.018, 24, mat.rubber);
    beadRing.rotation.z = Math.PI / 2;
    beadRing.position.x = sx * (w * 0.48);
    spin.add(beadRing);
  }

  // --- 5-spoke aftermarket rim + beadlock ---
  const barrel = cyl(S.rimRadius * 0.9, S.rimRadius * 0.84, 0.155, 24, mat.rim);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.x = -side * 0.015;
  spin.add(barrel);

  const outerLip = cyl(S.rimRadius + 0.012, S.rimRadius * 0.97, 0.028, 28, mat.rim);
  outerLip.rotation.z = Math.PI / 2;
  outerLip.position.x = side * 0.102;
  spin.add(outerLip);

  const innerLip = cyl(S.rimRadius * 0.95, S.rimRadius + 0.008, 0.022, 24, mat.rim);
  innerLip.rotation.z = Math.PI / 2;
  innerLip.position.x = -side * 0.118;
  spin.add(innerLip);

  const lock = torus(S.rimRadius + 0.005, 0.011, 8, 28, mat.steel);
  lock.rotation.y = Math.PI / 2;
  lock.position.x = side * 0.118;
  spin.add(lock);

  const boltR = S.rimRadius + 0.003;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const bolt = cyl(0.0065, 0.0075, 0.015, 6, mat.steel);
    bolt.rotation.z = Math.PI / 2;
    bolt.position.set(side * 0.128, Math.sin(a) * boltR, Math.cos(a) * boltR);
    spin.add(bolt);
  }

  // Spokes offset so a window sits on +Z (caliper peek)
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.PI / 5;
    const spoke = box(0.05, S.rimRadius * 0.56, 0.074, mat.rim);
    spoke.position.set(side * 0.04, Math.sin(a) * S.rimRadius * 0.38, Math.cos(a) * S.rimRadius * 0.38);
    spoke.rotation.x = a;
    spin.add(spoke);
  }

  // --- hub + 5 lugs ---
  const hub = cyl(0.08, 0.07, 0.052, 16, mat.steel);
  hub.rotation.z = Math.PI / 2;
  hub.position.x = side * 0.055;
  spin.add(hub);

  const cap = cyl(0.04, 0.036, 0.016, 12, mat.chrome);
  cap.rotation.z = Math.PI / 2;
  cap.position.x = side * 0.084;
  spin.add(cap);

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + Math.PI / 10;
    const lug = cyl(0.01, 0.0135, 0.02, 6, mat.chrome);
    lug.rotation.z = Math.PI / 2;
    lug.position.set(side * 0.09, Math.sin(a) * 0.05, Math.cos(a) * 0.05);
    spin.add(lug);
  }

  // --- vented rotor (spins) ---
  const r1 = cyl(0.166, 0.166, 0.007, 32, mat.steel);
  r1.rotation.z = Math.PI / 2;
  r1.position.x = -side * 0.036;
  spin.add(r1);
  const r2 = cyl(0.166, 0.166, 0.007, 32, mat.steel);
  r2.rotation.z = Math.PI / 2;
  r2.position.x = -side * 0.054;
  spin.add(r2);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const vane = box(0.02, 0.05, 0.014, mat.steel);
    vane.position.set(-side * 0.045, Math.sin(a) * 0.118, Math.cos(a) * 0.118);
    vane.rotation.x = a;
    spin.add(vane);
  }

  // --- valve stem ---
  const va = 0.52;
  const vr = S.rimRadius + 0.01;
  const stem = cyl(0.005, 0.005, 0.024, 6, mat.chrome);
  stem.rotation.z = Math.PI / 2;
  stem.position.set(side * 0.136, Math.sin(va) * vr, Math.cos(va) * vr);
  spin.add(stem);
  const vcap = cyl(0.0065, 0.0065, 0.007, 6, mat.chrome);
  vcap.rotation.z = Math.PI / 2;
  vcap.position.set(side * 0.148, Math.sin(va) * vr, Math.cos(va) * vr);
  spin.add(vcap);

  // --- painted caliper stays on the knuckle (does not roll) ---
  add(
    g,
    box(0.07, 0.092, 0.15, mat.rusty, -side * 0.045, 0.068, 0.128),
    box(0.052, 0.038, 0.055, mat.rusty, -side * 0.045, 0.118, 0.128),
  );
  const piston = cyl(0.026, 0.026, 0.036, 10, mat.steel);
  piston.rotation.z = Math.PI / 2;
  piston.position.set(-side * 0.018, 0.068, 0.128);
  g.add(piston);

  return { group: g, spin };
}

export function buildAxles(mat) {
  const g = group('axles');
  const y = S.axleY;
  const tube = S.trackHalf * 2 - 0.3;

  add(
    g,
    cyl(0.048, 0.048, tube, 12, mat.rusty, 0, y, S.frontAxleZ, 0, 0, Math.PI / 2),
    cyl(0.05, 0.05, tube, 12, mat.rusty, 0, y, S.rearAxleZ, 0, 0, Math.PI / 2),
  );

  // Front Dana-style pumpkin (passenger offset) + pinion
  const fx = -0.16;
  add(
    g,
    sphere(0.132, 10, mat.rusty, fx, y - 0.016, S.frontAxleZ),
    cyl(0.108, 0.12, 0.17, 10, mat.rusty, fx, y - 0.016, S.frontAxleZ, 0, 0, Math.PI / 2),
    cyl(0.042, 0.05, 0.2, 8, mat.steel, fx, y - 0.01, S.frontAxleZ + 0.15),
  );

  // Rear pumpkin + pinion toward the transfer case
  const rx = 0.1;
  add(
    g,
    sphere(0.148, 10, mat.rusty, rx, y - 0.02, S.rearAxleZ),
    cyl(0.118, 0.13, 0.2, 10, mat.rusty, rx, y - 0.02, S.rearAxleZ, 0, 0, Math.PI / 2),
    cyl(0.048, 0.055, 0.22, 8, mat.steel, rx, y, S.rearAxleZ + 0.17),
  );

  add(
    g,
    box(0.24, 0.2, 0.36, mat.rusty, 0.05, y + 0.055, -0.1),
    cyl(0.03, 0.03, 1.02, 8, mat.steel, 0.08, y + 0.02, -0.64),
    cyl(0.026, 0.026, 1.12, 8, mat.steel, -0.06, y + 0.03, 0.52),
  );

  for (const z of [S.frontAxleZ, S.rearAxleZ]) {
    const fwd = z > 0 ? 1 : -1;
    for (const sx of [-1, 1]) {
      const x = sx * (S.trackHalf - 0.14);
      add(
        g,
        cyl(0.055, 0.05, 0.1, 8, mat.rusty, x, y, z, 0, 0, Math.PI / 2),
        box(0.07, 0.046, 0.07, mat.rusty, x, y - 0.056, z),
        box(0.05, 0.04, 0.06, mat.steel, sx * (S.trackHalf - 0.22), y + 0.042, z + fwd * 0.055),
        cyl(0.018, 0.018, 0.11, 6, mat.steel, sx * (S.trackHalf - 0.28), y - 0.018, z + fwd * 0.08, 0.55, 0, 0),
      );
    }
  }

  return g;
}
