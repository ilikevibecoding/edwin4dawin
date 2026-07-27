import * as THREE from 'three';
import { buildHand, orientHand, gripCurl, curlFinger, aimForearm } from './hands.js';

/**
 * Procedural viewmodel builders. Gun local space: +Y up, muzzle along -Z,
 * bore axis ~y=0, receiver origin at the magwell. All sizes in metres,
 * proportioned from real M4A1 / M1911 reference.
 *
 * Each builder returns { group, rig } where rig exposes animation anchors:
 *   aim (Vector3)      — point that must sit on the camera axis at full ADS
 *   muzzle, eject      — Object3D anchors for muzzle flash / shell ejection
 *   mag, magHome       — detachable magazine + its rest transform
 *   bolt/charging or slide/hammer — moving action parts
 *   handL, handR       — hand groups (+ *Home rest transforms)
 */

const PI = Math.PI;

function mesh(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const ms = new THREE.Mesh(geo, mat);
  ms.position.set(x, y, z);
  ms.rotation.set(rx, ry, rz);
  return ms;
}
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const CZ = (r1, r2, len, seg = 20) => { const g = new THREE.CylinderGeometry(r1, r2, len, seg); g.rotateX(PI / 2); return g; };
const CX = (r, len, seg = 14) => { const g = new THREE.CylinderGeometry(r, r, len, seg); g.rotateZ(PI / 2); return g; };
const CY = (r, len, seg = 14) => new THREE.CylinderGeometry(r, r, len, seg);
const TOR = (r, t, seg = 10, tub = 22) => new THREE.TorusGeometry(r, t, seg, tub);

function scaleUV(geo, s) {
  const uv = geo.attributes.uv;
  if (!uv) return geo;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * s, uv.getY(i) * s);
  return geo;
}

/** Side-profile extrude: pts are [z, y] pairs; extruded to `width` along X. */
function profile(pts, width, mat, bevel = 0.0015) {
  const shape = new THREE.Shape();
  pts.forEach(([z, y], i) => (i ? shape.lineTo(z, y) : shape.moveTo(z, y)));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 1, steps: 1, curveSegments: 6,
  });
  geo.translate(0, 0, -width / 2);
  geo.rotateY(-PI / 2);          // shape.x -> world z, depth -> world x
  scaleUV(geo, 22);
  return new THREE.Mesh(geo, mat);
}

/** Cross-section extrude along Z: pts are [x, y] pairs. */
function crossExtrude(pts, zFrom, zTo, mat, bevel = 0.0008) {
  const shape = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: zTo - zFrom, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 1, steps: 1, curveSegments: 4,
  });
  geo.translate(0, 0, zFrom);
  scaleUV(geo, 22);
  return new THREE.Mesh(geo, mat);
}

function instRow(geo, mat, count, place) {
  const im = new THREE.InstancedMesh(geo, mat, count);
  const M = new THREE.Matrix4();
  for (let i = 0; i < count; i++) { place(i, M); im.setMatrixAt(i, M); }
  im.instanceMatrix.needsUpdate = true;
  return im;
}

function saveHome(obj) {
  return { pos: obj.position.clone(), quat: obj.quaternion.clone(), rot: obj.rotation.clone() };
}

// =============================================================================
// M4A1 CARBINE
// =============================================================================
export function buildM4A1(mats) {
  const g = new THREE.Group();
  const rig = {};
  const add = (...ms) => { ms.forEach((x) => g.add(x)); return ms[0]; };

  // ---- upper receiver (extruded silhouette) --------------------------------
  add(profile([
    [-0.090, -0.013], [-0.078, -0.020], [0.102, -0.020], [0.115, -0.006],
    [0.115, 0.026], [-0.090, 0.026],
  ], 0.036, mats.receiver));
  // integral top rail base + instanced picatinny ridges (receiver + handguard)
  // fine pitch: reads as serration from viewmodel distance, not LEGO blocks
  add(mesh(B(0.034, 0.005, 0.205), mats.receiver, 0, 0.0285, 0.0125));
  add(mesh(B(0.030, 0.0095, 0.233), mats.receiverDark, 0, 0.0263, -0.2075)); // handguard riser
  add(instRow(B(0.034, 0.0028, 0.0026), mats.receiverDark, 88, (i, M) => {
    M.makeTranslation(0, 0.0322, -0.320 + i * 0.005);
  }));

  // ---- lower receiver -------------------------------------------------------
  add(profile([
    [-0.078, -0.017], [-0.068, -0.070], [-0.018, -0.065], [-0.012, -0.030],
    [0.050, -0.030], [0.064, -0.044], [0.080, -0.030], [0.106, -0.030],
    [0.115, -0.016], [0.115, -0.017],
  ].reverse(), 0.033, mats.receiver));
  // magwell side ribs
  for (const zr of [-0.058, -0.044, -0.030]) {
    add(mesh(B(0.0012, 0.032, 0.007), mats.receiver, 0.0170, -0.042, zr));
    add(mesh(B(0.0012, 0.032, 0.007), mats.receiver, -0.0170, -0.042, zr));
  }

  // ---- trigger group ---------------------------------------------------------
  add(mesh(B(0.006, 0.030, 0.006), mats.receiver, 0, -0.045, -0.008));
  add(mesh(B(0.006, 0.005, 0.068), mats.receiver, 0, -0.0605, 0.024, 0.10, 0, 0));
  add(mesh(B(0.0055, 0.024, 0.0055), mats.steel, 0, -0.044, 0.024, 0.22, 0, 0));

  // ---- pistol grip -----------------------------------------------------------
  const grip = new THREE.Group();
  grip.position.set(0, -0.036, 0.070);
  grip.rotation.x = -0.35;
  grip.add(mesh(B(0.029, 0.105, 0.044), mats.gripPoly, 0, -0.048, 0.004));
  grip.add(mesh(B(0.0295, 0.005, 0.004), mats.gripPoly, 0, -0.052, -0.0185));
  grip.add(mesh(B(0.0295, 0.005, 0.004), mats.gripPoly, 0, -0.072, -0.0185));
  grip.add(mesh(B(0.031, 0.007, 0.047), mats.polymer, 0, -0.1025, 0.004));
  g.add(grip);

  // ---- magazine (curved PMAG, detachable) ------------------------------------
  const mag = new THREE.Group();
  mag.position.set(0, -0.062, -0.042);
  mag.rotation.x = 0.05;
  {
    const s1 = mesh(B(0.026, 0.058, 0.060), mats.polymer, 0, -0.027, 0);
    mag.add(s1);
    const j2 = new THREE.Group(); j2.position.y = -0.052; j2.rotation.x = 0.15; mag.add(j2);
    j2.add(mesh(B(0.026, 0.056, 0.060), mats.polymer, 0, -0.026, 0));
    for (const xr of [-0.0136, 0.0136]) {
      for (let i = 0; i < 3; i++) j2.add(mesh(B(0.0012, 0.04, 0.0035), mats.gripPoly, xr, -0.026, -0.018 + i * 0.017));
    }
    const j3 = new THREE.Group(); j3.position.y = -0.052; j3.rotation.x = 0.16; j2.add(j3);
    j3.add(mesh(B(0.026, 0.052, 0.060), mats.polymer, 0, -0.024, 0));
    j3.add(mesh(B(0.030, 0.011, 0.067), mats.gripPoly, 0, -0.052, -0.004));
    j3.add(mesh(B(0.0305, 0.002, 0.0672), mats.wearEdge, 0, -0.0575, -0.004)); // baseplate wear line
  }
  g.add(mag);
  rig.mag = mag;
  rig.magHome = saveHome(mag);

  // ---- stock + buffer tube (anodized aluminum, not polymer-warm) ----------------
  add(mesh(CZ(0.0145, 0.0145, 0.170, 16), mats.receiverDark, 0, 0.002, 0.200));
  add(mesh(CZ(0.0175, 0.0175, 0.011, 12), mats.receiver, 0, 0.002, 0.124));
  add(mesh(B(0.036, 0.036, 0.004), mats.receiver, 0, -0.002, 0.117));
  for (let i = 0; i < 6; i++) add(mesh(CY(0.0028, 0.0025, 8), mats.cavity, 0, -0.0125, 0.145 + i * 0.016));
  add(mesh(B(0.030, 0.020, 0.112), mats.polymer, 0, 0.024, 0.246));
  add(mesh(B(0.0045, 0.044, 0.112), mats.polymer, 0.0155, -0.001, 0.246));
  add(mesh(B(0.0045, 0.044, 0.112), mats.polymer, -0.0155, -0.001, 0.246));
  add(mesh(B(0.026, 0.012, 0.095), mats.polymer, 0, -0.024, 0.252, 0.10, 0, 0));
  add(mesh(B(0.034, 0.078, 0.013), mats.rubber, 0, -0.001, 0.306));
  add(mesh(B(0.013, 0.007, 0.030), mats.polymer, 0, -0.0285, 0.222));
  add(mesh(CX(0.0052, 0.0015, 10), mats.cavity, 0.0158, 0.010, 0.212));
  add(mesh(CX(0.0052, 0.0015, 10), mats.cavity, -0.0158, 0.010, 0.212));
  add(mesh(TOR(0.0062, 0.0016), mats.steel, 0, -0.020, 0.298, 0, PI / 2, 0));

  // ---- handguard (octagonal free-float rail) ----------------------------------
  const hg = mesh(CZ(0.0235, 0.0235, 0.233, 8), mats.receiverDark, 0, 0, -0.2075, 0, 0, PI / 8);
  scaleUV(hg.geometry, 3);
  add(hg);
  add(mesh(CZ(0.0245, 0.0245, 0.010, 8), mats.receiverDark, 0, 0, -0.320, 0, 0, PI / 8));
  // barrel nut — flush + dark so it doesn't read as a pale collar band
  add(mesh(CZ(0.0242, 0.0242, 0.016, 18), mats.steel, 0, 0, -0.0985));
  // M-LOK slots (sides + bottom)
  for (const zr of [-0.145, -0.185, -0.225, -0.265]) {
    add(mesh(B(0.0015, 0.007, 0.032), mats.cavity, 0.0230, 0, zr));
    add(mesh(B(0.0015, 0.007, 0.032), mats.cavity, -0.0230, 0, zr));
    add(mesh(B(0.007, 0.0015, 0.032), mats.cavity, 0, -0.0230, zr));
  }
  // vent holes on 45° faces
  for (let i = 0; i < 5; i++) {
    const z = -0.130 - i * 0.040;
    add(mesh(CX(0.0032, 0.002, 10), mats.cavity, 0.0160, 0.0160, z, 0, 0, -PI / 4));
    add(mesh(CX(0.0032, 0.002, 10), mats.cavity, -0.0160, 0.0160, z, 0, 0, PI / 4));
  }
  // front sling swivel
  add(mesh(TOR(0.007, 0.0018), mats.steel, -0.018, -0.0155, -0.295, 0, PI / 2, 0));

  // ---- barrel, gas block, flash hider -----------------------------------------
  add(mesh(CZ(0.0092, 0.0096, 0.068, 16), mats.steel, 0, 0, -0.376));
  add(mesh(B(0.019, 0.019, 0.020), mats.steel, 0, 0.0015, -0.339));
  add(mesh(CZ(0.0024, 0.0024, 0.024, 8), mats.steel, 0, 0.0125, -0.330));
  add(mesh(CZ(0.0112, 0.0112, 0.0045, 14), mats.steel, 0, 0, -0.4085));
  add(mesh(CZ(0.011, 0.0105, 0.058, 16), mats.steel, 0, 0, -0.4395));
  add(mesh(CZ(0.0113, 0.0113, 0.006, 16), mats.steel, 0, 0, -0.4665));
  add(mesh(TOR(0.0106, 0.0008), mats.wearEdge, 0, 0, -0.4695));
  for (const a of [-0.7, 0, 0.7]) add(mesh(B(0.0018, 0.0235, 0.030), mats.cavity, 0, 0, -0.4425, 0, 0, a));

  // ---- red dot optic (T2-style) ------------------------------------------------
  add(mesh(B(0.032, 0.007, 0.064), mats.receiverDark, 0, 0.040, -0.078));
  add(mesh(B(0.024, 0.010, 0.055), mats.receiverDark, 0, 0.0485, -0.078));
  add(mesh(CX(0.0032, 0.005, 8), mats.steelBright, 0.0165, 0.040, -0.060));
  add(mesh(CX(0.0032, 0.005, 8), mats.steelBright, 0.0165, 0.040, -0.096));
  add(mesh(B(0.004, 0.008, 0.050), mats.receiverDark, -0.0172, 0.040, -0.078));
  const opticTube = new THREE.CylinderGeometry(0.0165, 0.0165, 0.050, 24, 1, true);
  opticTube.rotateX(PI / 2);
  add(mesh(opticTube, mats.opticBody, 0, 0.067, -0.082));
  add(mesh(TOR(0.0155, 0.0032, 10, 24), mats.receiverDark, 0, 0.067, -0.108));
  add(mesh(TOR(0.0150, 0.0030, 10, 24), mats.receiverDark, 0, 0.067, -0.057));
  add(mesh(CZ(0.0142, 0.0142, 0.0012, 22), mats.glassBlue, 0, 0.067, -0.104, 0.14, 0, 0));
  add(mesh(CZ(0.0140, 0.0140, 0.0012, 22), mats.glass, 0, 0.067, -0.0585));
  // subtle dark rims just inside the tube so the lens edge reads as housing shadow
  add(mesh(TOR(0.0146, 0.0018, 8, 26), mats.cavity, 0, 0.067, -0.0995));
  add(mesh(TOR(0.0144, 0.0016, 8, 26), mats.cavity, 0, 0.067, -0.0625));
  // reticle: ~3 px at 1080p ADS, dead-center on the aim axis; visibility is
  // faded by view alignment in the animator (a dot is only visible near boresight)
  rig.reticle = add(mesh(new THREE.SphereGeometry(0.00055, 8, 8), mats.redDot, 0, 0.067, -0.074));
  add(mesh(CX(0.0072, 0.011, 12), mats.receiverDark, 0.020, 0.067, -0.080));
  add(mesh(CX(0.008, 0.006, 12), mats.receiverDark, -0.019, 0.067, -0.080));
  add(mesh(CY(0.0068, 0.008, 12), mats.receiverDark, 0, 0.0875, -0.080));
  rig.aim = new THREE.Vector3(0, 0.067, -0.082);

  // ---- folded backup irons (low-profile — hug the rail) --------------------------
  add(mesh(B(0.030, 0.006, 0.024), mats.receiverDark, 0, 0.0385, -0.300));
  add(mesh(B(0.024, 0.0035, 0.017), mats.receiverDark, 0, 0.0432, -0.302));
  add(mesh(B(0.032, 0.006, 0.026), mats.receiverDark, 0, 0.0385, 0.096));
  add(mesh(B(0.028, 0.0035, 0.020), mats.receiverDark, 0, 0.0432, 0.096));

  // ---- charging handle -----------------------------------------------------------
  const ch = new THREE.Group();
  ch.position.set(0, 0.0275, 0.118);
  ch.add(mesh(B(0.046, 0.0065, 0.012), mats.receiver, 0, 0, 0));
  ch.add(mesh(B(0.012, 0.0065, 0.010), mats.receiver, 0.026, 0, 0.002, 0, -0.35, 0));
  ch.add(mesh(B(0.012, 0.0065, 0.010), mats.receiver, -0.026, 0, 0.002, 0, 0.35, 0));
  ch.add(mesh(B(0.011, 0.0045, 0.062), mats.receiver, 0, 0.0005, -0.036));
  ch.add(mesh(B(0.010, 0.005, 0.007), mats.steel, -0.030, 0, -0.002));
  g.add(ch);
  rig.charging = ch;
  rig.chargingHome = saveHome(ch);

  // ---- ejection port + bolt + deflector -------------------------------------------
  add(mesh(B(0.0008, 0.019, 0.058), mats.cavity, 0.0185, 0.004, -0.0125));
  const bolt = mesh(CZ(0.0075, 0.0075, 0.052, 14), mats.steelBright, 0.0118, 0.004, -0.0125);
  add(bolt);
  rig.bolt = bolt;
  rig.boltHome = saveHome(bolt);
  add(mesh(CZ(0.0035, 0.0035, 0.016, 10), mats.brass, 0.0168, -0.004, -0.028));
  add(mesh(B(0.0014, 0.020, 0.058), mats.receiver, 0.0208, -0.0145, -0.0125, 0, 0, 2.45)); // open port door
  add(mesh(B(0.009, 0.013, 0.011), mats.receiver, 0.0175, 0.008, 0.022, 0, 0, PI / 4));
  add(mesh(CZ(0.0062, 0.0062, 0.013, 12), mats.receiver, 0.0168, 0.010, 0.070));
  add(mesh(CZ(0.0045, 0.0045, 0.004, 10), mats.steel, 0.0168, 0.010, 0.062));

  // ---- small controls / pins -------------------------------------------------------
  add(mesh(CX(0.0055, 0.003, 10), mats.steel, -0.0168, -0.024, 0.048));
  add(mesh(B(0.003, 0.006, 0.024), mats.steel, -0.0175, -0.024, 0.038));
  add(mesh(B(0.0035, 0.020, 0.012), mats.steel, -0.0170, -0.004, -0.004));
  add(mesh(B(0.003, 0.012, 0.020), mats.receiver, 0.0168, -0.026, 0.002));
  add(mesh(CX(0.0048, 0.004, 10), mats.steel, 0.0175, -0.026, -0.004));
  add(mesh(CX(0.0036, 0.0355, 8), mats.steel, 0, -0.024, 0.100));
  add(mesh(CX(0.0036, 0.0355, 8), mats.steel, 0, -0.022, -0.072));
  for (const xr of [-0.0173, 0.0173]) {
    add(mesh(CX(0.0048, 0.0015, 10), mats.steel, xr, -0.024, 0.100));
    add(mesh(CX(0.0048, 0.0015, 10), mats.steel, xr, -0.022, -0.072));
  }

  // ---- wear accents -------------------------------------------------------------------
  add(mesh(B(0.0025, 0.0012, 0.012), mats.wearEdge, 0.0175, 0.0315, -0.086));
  add(mesh(B(0.0025, 0.0012, 0.012), mats.wearEdge, -0.0175, 0.0315, -0.082));
  add(mesh(B(0.024, 0.0015, 0.0015), mats.wearEdge, 0, -0.0695, -0.0665));
  add(mesh(B(0.044, 0.0008, 0.0012), mats.wearEdge, 0, 0.0038, 0.1235));
  add(mesh(B(0.008, 0.0012, 0.0025), mats.wearEdge, 0, -0.0242, -0.320));

  // ---- hands -----------------------------------------------------------------------------
  const handR = buildHand(mats);
  handR.group.position.set(0.027, -0.080, 0.095);
  orientHand(handR.group, new THREE.Vector3(-0.85, -0.28, -0.40), new THREE.Vector3(-0.55, -0.12, -0.82));
  gripCurl(handR, 1.0, true);
  aimForearm(handR, new THREE.Vector3(0.35, -0.75, 0.65));
  g.add(handR.group);
  rig.handR = handR;
  rig.handRHome = saveHome(handR.group);

  const handL = buildHand(mats, { mirror: true, forearmLen: 0.185 });
  handL.group.position.set(-0.004, -0.040, -0.225);
  orientHand(handL.group, new THREE.Vector3(-0.70, 0.68, -0.12), new THREE.Vector3(0.42, 0.90, 0.10));
  gripCurl(handL, 1.0);
  curlFinger(handL.thumb, 0.15, 0.25, 0, 0);
  aimForearm(handL, new THREE.Vector3(-0.10, -0.76, 0.55), true);
  g.add(handL.group);
  rig.handL = handL;
  rig.handLHome = saveHome(handL.group);

  // ---- anchors ----------------------------------------------------------------------------
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0, -0.4705); // exactly at the flash hider exit plane
  g.add(muzzle);
  rig.muzzle = muzzle;
  const eject = new THREE.Object3D();
  eject.position.set(0.03, 0.012, -0.0125);
  g.add(eject);
  rig.eject = eject;

  return { group: g, rig };
}

// =============================================================================
// M1911 PISTOL
// =============================================================================
export function buildM1911(mats) {
  const g = new THREE.Group();
  const rig = {};
  const add = (...ms) => { ms.forEach((x) => g.add(x)); return ms[0]; };

  // ---- slide (cross-section extrude with chamfered top) --------------------------
  const slide = new THREE.Group();
  slide.add(crossExtrude([
    [-0.0125, -0.010], [0.0125, -0.010], [0.0125, 0.0075], [0.009, 0.016],
    [-0.009, 0.016], [-0.0125, 0.0075],
  ], -0.113, 0.092, mats.slideSteel));
  // serrations (rear + front, both sides)
  slide.add(instRow(B(0.0008, 0.018, 0.0022), mats.cavity, 28, (i, M) => {
    const side = i < 14 ? 1 : -1;
    const k = i % 14;
    const rear = k < 8;
    const z = rear ? 0.056 + k * 0.0046 : -0.088 + (k - 8) * 0.0046;
    M.makeTranslation(side * 0.0128, 0.002, z);
  }));
  // ejection port (right) + rear plate
  slide.add(mesh(B(0.0008, 0.014, 0.036), mats.cavity, 0.0126, 0.006, 0.006));
  slide.add(mesh(B(0.016, 0.015, 0.003), mats.steel, 0, 0.002, 0.0935));
  // bushing + recessed muzzle
  slide.add(mesh(CZ(0.009, 0.009, 0.007, 16), mats.steelBright, 0, 0.003, -0.1105));
  slide.add(mesh(CZ(0.0045, 0.0045, 0.003, 10), mats.cavity, 0, -0.0035, -0.1128));
  // sights (3-dot)
  slide.add(mesh(B(0.0028, 0.0125, 0.0055), mats.steel, 0, 0.0222, -0.104));
  slide.add(mesh(CZ(0.0012, 0.0012, 0.0011, 8), mats.sightDot, 0, 0.024, -0.1008));
  slide.add(mesh(B(0.0075, 0.0095, 0.009), mats.steel, 0.0057, 0.0238, 0.0865));
  slide.add(mesh(B(0.0075, 0.0095, 0.009), mats.steel, -0.0057, 0.0238, 0.0865));
  slide.add(mesh(B(0.019, 0.0042, 0.009), mats.steel, 0, 0.0198, 0.0865));
  slide.add(mesh(CZ(0.0012, 0.0012, 0.0011, 8), mats.sightDot, 0.0045, 0.024, 0.0912));
  slide.add(mesh(CZ(0.0012, 0.0012, 0.0011, 8), mats.sightDot, -0.0045, 0.024, 0.0912));
  // wear along slide edges
  slide.add(mesh(B(0.0012, 0.0008, 0.07), mats.wearEdge, 0.0122, 0.0092, -0.04));
  slide.add(mesh(B(0.0012, 0.0008, 0.05), mats.wearEdge, -0.0122, 0.0092, 0.02));
  g.add(slide);
  rig.slide = slide;
  rig.slideHome = saveHome(slide);

  // ---- barrel (frame-side, exposed when slide cycles) ------------------------------
  add(mesh(CZ(0.0075, 0.0075, 0.068, 14), mats.steelBright, 0, 0.004, -0.079));
  add(mesh(CZ(0.0038, 0.0038, 0.018, 10), mats.brass, 0.008, 0.006, 0.006));

  // ---- frame -----------------------------------------------------------------------
  add(mesh(B(0.023, 0.024, 0.135), mats.receiver, 0, -0.022, 0.0125));
  add(mesh(B(0.023, 0.018, 0.058), mats.receiver, 0, -0.019, -0.084));
  add(mesh(TOR(0.0155, 0.0032, 10, 22), mats.receiver, 0, -0.036, 0.008, 0, PI / 2, 0));
  add(mesh(B(0.009, 0.008, 0.006), mats.steel, 0, -0.0265, 0.026));

  // ---- grip -------------------------------------------------------------------------
  const grip = new THREE.Group();
  grip.position.set(0, -0.034, 0.058);
  grip.rotation.x = -0.30;
  grip.add(mesh(B(0.024, 0.092, 0.036), mats.receiver, 0, -0.044, 0));
  grip.add(mesh(B(0.0026, 0.078, 0.028), mats.wood, 0.0133, -0.044, 0));
  grip.add(mesh(B(0.0026, 0.078, 0.028), mats.wood, -0.0133, -0.044, 0));
  for (const xr of [-0.0148, 0.0148]) {
    grip.add(mesh(CX(0.0018, 0.0012, 8), mats.steelBright, xr, -0.012, 0));
    grip.add(mesh(CX(0.0018, 0.0012, 8), mats.steelBright, xr, -0.076, 0));
  }
  grip.add(mesh(B(0.020, 0.088, 0.006), mats.gripPoly, 0, -0.046, 0.020));
  g.add(grip);

  // detachable mag (baseplate visible at grip bottom)
  const mag = new THREE.Group();
  mag.add(mesh(B(0.019, 0.10, 0.030), mats.steelBright, 0, -0.048, 0));
  mag.add(mesh(B(0.026, 0.0065, 0.040), mats.polymer, 0, -0.0955, -0.001));
  mag.add(mesh(B(0.024, 0.0035, 0.036), mats.rubber, 0, -0.100, -0.001));
  grip.add(mag);
  rig.mag = mag;
  rig.magHome = saveHome(mag);

  // ---- rear details: beavertail, hammer ------------------------------------------------
  add(mesh(B(0.017, 0.005, 0.022), mats.receiver, 0, -0.013, 0.088, 0.55, 0, 0));
  const hammer = new THREE.Group();
  hammer.position.set(0, 0.004, 0.094);
  hammer.add(mesh(B(0.0068, 0.004, 0.017), mats.steel, 0, 0.002, 0.008));
  hammer.add(mesh(TOR(0.0038, 0.0014, 8, 14), mats.steel, 0, 0.002, 0.0175, 0, PI / 2, 0));
  hammer.rotation.x = -0.95; // cocked
  g.add(hammer);
  rig.hammer = hammer;
  rig.hammerCocked = -0.95;
  rig.hammerFired = -0.15;

  // ---- controls -------------------------------------------------------------------------
  add(mesh(B(0.0035, 0.006, 0.014), mats.steel, -0.0135, 0.0005, 0.070));
  add(mesh(B(0.0032, 0.0055, 0.020), mats.steel, -0.0135, -0.006, 0.010));
  add(mesh(CX(0.003, 0.002, 8), mats.steel, 0.0125, -0.006, 0.022));
  add(mesh(CX(0.003, 0.002, 8), mats.steel, -0.0125, -0.006, 0.022));
  add(mesh(CX(0.0045, 0.005, 10), mats.steel, -0.0125, -0.0125, 0.033));
  add(mesh(CZ(0.0018, 0.0018, 0.030, 8), mats.steel, -0.0128, 0.001, 0.045));

  // ---- hands (two-handed hold) -----------------------------------------------------------
  const handR = buildHand(mats);
  handR.group.position.set(0.021, -0.076, 0.070);
  orientHand(handR.group, new THREE.Vector3(-0.85, -0.30, -0.42), new THREE.Vector3(-0.55, -0.15, -0.80));
  gripCurl(handR, 1.0, true);
  aimForearm(handR, new THREE.Vector3(0.35, -0.85, 0.45));
  g.add(handR.group);
  rig.handR = handR;
  rig.handRHome = saveHome(handR.group);

  const handL = buildHand(mats, { mirror: true });
  handL.group.position.set(-0.029, -0.097, 0.053);
  orientHand(handL.group, new THREE.Vector3(0.80, -0.35, -0.25), new THREE.Vector3(0.55, 0.35, -0.60));
  gripCurl(handL, 1.12);
  curlFinger(handL.thumb, 0.1, 0.15, 0, 0);
  aimForearm(handL, new THREE.Vector3(-0.45, -0.80, 0.35), true);
  g.add(handL.group);
  rig.handL = handL;
  rig.handLHome = saveHome(handL.group);

  // ---- anchors ------------------------------------------------------------------------------
  rig.aim = new THREE.Vector3(0, 0.0285, 0);
  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.004, -0.1145); // exactly at the bushing exit plane
  g.add(muzzle);
  rig.muzzle = muzzle;
  const eject = new THREE.Object3D();
  eject.position.set(0.018, 0.014, 0.006);
  g.add(eject);
  rig.eject = eject;

  return { group: g, rig };
}

// =============================================================================
// M67 FRAG GRENADE (world object — used for thrown projectiles)
// =============================================================================
export function buildGrenade(mats) {
  const g = new THREE.Group();
  const body = mesh(new THREE.SphereGeometry(0.038, 18, 14), mats.olive);
  body.scale.y = 1.06;
  g.add(body);
  g.add(mesh(CY(0.012, 0.014, 12), mats.grenadeSteel, 0, 0.041, 0));
  g.add(mesh(CY(0.0065, 0.0075, 10), mats.grenadeSteel, 0, 0.051, 0));
  // spoon (safety lever) hugging one side
  g.add(mesh(B(0.014, 0.0024, 0.022), mats.grenadeSteel, 0, 0.051, 0.011, -0.30, 0, 0));
  g.add(mesh(B(0.014, 0.0024, 0.036), mats.grenadeSteel, 0, 0.035, 0.030, -1.00, 0, 0));
  g.add(mesh(B(0.013, 0.0024, 0.029), mats.grenadeSteel, 0, 0.011, 0.042, -1.40, 0, 0));
  // pin + pull ring
  g.add(mesh(CX(0.0017, 0.015, 6), mats.steelBright, 0.011, 0.046, -0.002));
  g.add(mesh(TOR(0.0074, 0.0014, 8, 16), mats.steelBright, 0.022, 0.044, -0.004, 0.3, 0.5, 0));
  g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = false; } });
  return g;
}
