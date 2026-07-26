// Vehicles — owner: Fable 4b (VFX & atmosphere). The AEGIS TRU armored
// response van parked in the extraction garage: beveled armor panels, canvas
// "AEGIS TRU" livery with the star-north roundel, light bar, bullbar/grille,
// mirrors, detailed wheels, rear doors OPEN toward the extraction zone with a
// visible interior (bench seats + warm dome light), headlights on, idling
// exhaust, and a green signal-smoke canister marking the exfil.
// Contract (unchanged): createExtractionVan(world, group) places the van at
// MAP.EXTRACTION.vanAt, registers its collider, returns the THREE.Group.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getMaterial } from './materials.js';
import * as MAP from './map.js';
import { registerAmbientEmitter } from '../fx/vfx.js';

// ---------------------------------------------------------------------------
// Canvas artwork (module-cached: built once per page)
// ---------------------------------------------------------------------------
let ART = null;
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// star-north roundel — same geometry as the game emblem (menus.js starNorth):
// ring + 4 cardinal ticks + 4-point star with the elongated north limb.
function drawRoundel(ctx, cx, cy, r, ink, ice) {
  const s = r / 32; // emblem authored in a 64-box around (32,34)
  ctx.save();
  ctx.translate(cx - 32 * s, cy - 34 * s);
  ctx.scale(s, s);
  ctx.strokeStyle = ice; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(32, 34, 21, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.8; ctx.beginPath();
  ctx.moveTo(32, 9); ctx.lineTo(32, 13); ctx.moveTo(32, 55); ctx.lineTo(32, 59);
  ctx.moveTo(7, 34); ctx.lineTo(11, 34); ctx.moveTo(53, 34); ctx.lineTo(57, 34);
  ctx.stroke();
  ctx.globalAlpha = 1; ctx.fillStyle = ice;
  ctx.beginPath();
  ctx.moveTo(32, 3); ctx.lineTo(36, 30); ctx.lineTo(48, 34); ctx.lineTo(36, 38);
  ctx.lineTo(32, 51); ctx.lineTo(28, 38); ctx.lineTo(16, 34); ctx.lineTo(28, 30);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(32, 3); ctx.lineTo(36, 30); ctx.lineTo(32, 34); ctx.lineTo(28, 30);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Side livery. frontOnRight controls which end of the canvas is the vehicle's
// nose so lettering reads left→right on BOTH sides of the van.
function liveryTexture(frontOnRight) {
  return canvasTex(1024, 256, (ctx, w, h) => {
    // armored base coat with a subtle vertical sheen
    const base = ctx.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, '#4a545e');
    base.addColorStop(0.55, '#414b55');
    base.addColorStop(1, '#39424b');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    // panel seams + rivets
    ctx.strokeStyle = 'rgba(20,26,32,0.55)';
    ctx.lineWidth = 3;
    for (const fx of [0.18, 0.46, 0.74]) {
      const x = fx * w;
      ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x, h - 8); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(6, h * 0.86); ctx.lineTo(w - 6, h * 0.86); ctx.stroke();
    ctx.fillStyle = 'rgba(24,30,36,0.7)';
    for (let i = 0; i < 26; i++) {
      ctx.beginPath(); ctx.arc(20 + i * ((w - 40) / 25), 16, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(20 + i * ((w - 40) / 25), h * 0.83, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    // ice stripe with a dim tail
    ctx.fillStyle = '#3e7ea6';
    ctx.fillRect(0, h * 0.62, w, 8);
    ctx.fillStyle = '#7fd2ff';
    ctx.fillRect(0, h * 0.56, w, 10);
    // roundel toward the nose, lettering mid-panel
    const noseX = frontOnRight ? w - 132 : 132;
    const textX = frontOnRight ? w * 0.42 : w * 0.58;
    drawRoundel(ctx, noseX, h * 0.42, 62, '#e8f1f8', '#9fd4f4');
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8f1f8';
    ctx.font = '700 74px system-ui, sans-serif';
    ctx.save();
    ctx.translate(textX, h * 0.44);
    ctx.fillText('A E G I S', 0, 0);
    ctx.font = '600 26px system-ui, sans-serif';
    ctx.fillStyle = '#9db4c6';
    ctx.fillText('TACTICAL RESPONSE UNIT', 0, 42);
    ctx.restore();
    // "TRU" block between lettering and rear (clear of the open door)
    const rearX = frontOnRight ? w * 0.24 : w * 0.76;
    ctx.fillStyle = '#7fd2ff';
    ctx.font = '800 56px system-ui, sans-serif';
    ctx.fillText('TRU', rearX, h * 0.46);
    ctx.fillStyle = '#5d7284';
    ctx.font = '600 20px system-ui, sans-serif';
    ctx.fillText('7-311', rearX, h * 0.46 + 28);
  });
}

function grilleTexture() {
  return canvasTex(256, 96, (ctx, w, h) => {
    ctx.fillStyle = '#1c2126';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#454e56';
    ctx.lineWidth = 5;
    for (let i = 1; i <= 5; i++) {
      const y = (i / 6) * h;
      ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(w - 10, y); ctx.stroke();
    }
    ctx.strokeStyle = '#30373d';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, w - 6, h - 6);
  });
}

function beamTexture() {
  return canvasTex(128, 64, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(255,238,200,0.85)');
    g.addColorStop(0.5, 'rgba(255,232,190,0.25)');
    g.addColorStop(1, 'rgba(255,228,180,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.42);
    ctx.lineTo(w, h * 0.08);
    ctx.lineTo(w, h * 0.92);
    ctx.lineTo(0, h * 0.58);
    ctx.closePath();
    ctx.fill();
  });
}

function glowTexture() {
  return canvasTex(64, 64, (ctx, s) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,244,220,0.9)');
    g.addColorStop(1, 'rgba(255,236,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
}

function art() {
  if (ART) return ART;
  const mat = (o) => new THREE.MeshStandardMaterial(o);
  ART = {
    paint: mat({ color: 0x46505a, roughness: 0.52, metalness: 0.35 }),
    paintDark: mat({ color: 0x2e353c, roughness: 0.6, metalness: 0.3 }),
    glassDark: mat({ color: 0x11161c, roughness: 0.16, metalness: 0.4 }),
    interior: mat({ color: 0x757d84, roughness: 0.85, metalness: 0.05 }),
    floorMat: mat({ color: 0x33383d, roughness: 0.95 }),
    bench: mat({ color: 0x39505f, roughness: 0.95 }),
    headlight: mat({ color: 0xfff4dc, emissive: 0xffe9c0, emissiveIntensity: 2.4, roughness: 0.3 }),
    tail: mat({ color: 0x8a2320, emissive: 0xff5a4e, emissiveIntensity: 0.9, roughness: 0.4 }),
    barBlue: mat({ color: 0x9fd4ff, emissive: 0x66b8ff, emissiveIntensity: 2.4, roughness: 0.3 }),
    dome: mat({ color: 0xffe0b0, emissive: 0xffc890, emissiveIntensity: 1.8, roughness: 0.4 }),
    signalGreen: mat({ color: 0x9fe8a8, emissive: 0x7dd87d, emissiveIntensity: 1.6, roughness: 0.5 }),
    liveryR: new THREE.MeshStandardMaterial({ map: liveryTexture(true), roughness: 0.52, metalness: 0.3 }),
    liveryL: new THREE.MeshStandardMaterial({ map: liveryTexture(false), roughness: 0.52, metalness: 0.3 }),
    grille: new THREE.MeshStandardMaterial({ map: grilleTexture(), roughness: 0.6, metalness: 0.5 }),
    beam: new THREE.MeshBasicMaterial({ map: beamTexture(), transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    glow: new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }),
  };
  return ART;
}

// ---------------------------------------------------------------------------
// Geometry batcher: collect transformed geometries per material, merge into
// one mesh each (keeps the whole van at ~15 draw calls).
// ---------------------------------------------------------------------------
class VanBatch {
  constructor() { this.byMat = new Map(); }
  add(matKey, geo, x, y, z, rx = 0, ry = 0, rz = 0) {
    if (rz) geo.rotateZ(rz);
    if (rx) geo.rotateX(rx);
    if (ry) geo.rotateY(ry);
    geo.translate(x, y, z);
    if (!this.byMat.has(matKey)) this.byMat.set(matKey, []);
    this.byMat.get(matKey).push(geo);
  }
  box(matKey, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    this.add(matKey, new THREE.BoxGeometry(sx, sy, sz), x, y, z, rx, ry, rz);
  }
  cyl(matKey, x, y, z, r0, r1, hgt, seg = 10, rx = 0, ry = 0, rz = 0) {
    this.add(matKey, new THREE.CylinderGeometry(r0, r1, hgt, seg), x, y, z, rx, ry, rz);
  }
  build(target, materials, { shadowKeys = [] } = {}) {
    for (const [key, geos] of this.byMat) {
      const merged = mergeGeometries(geos, false);
      const mesh = new THREE.Mesh(merged, materials[key]);
      mesh.castShadow = shadowKeys.includes(key);
      target.add(mesh);
    }
  }
}

// ---------------------------------------------------------------------------
// Local space: width = X (2.1), height = Y (2.2), length = Z (5.2).
// Front (cab, headlights) at -Z; rear doors at +Z. The van is rotated so the
// nose faces the garage shutter (east) and the open rear doors face the
// extraction zone to the west.
// ---------------------------------------------------------------------------
export function createExtractionVan(world, group) {
  const A = art();
  const van = new THREE.Group();
  van.name = 'extraction_van';
  const B = new VanBatch();

  // ---- rolling chassis ----
  B.box('paintDark', 0, 0.5, 0, 1.94, 0.3, 4.72);                       // skirt
  B.box('paintDark', 0, 0.5, 2.7, 2.08, 0.14, 0.34);                    // rear step bumper
  B.box('paintDark', 0, 0.55, -2.62, 2.02, 0.26, 0.14);                 // front bumper
  for (const [wx, wz] of [[-0.88, -1.72], [0.88, -1.72], [-0.88, 1.62], [0.88, 1.62]]) {
    B.cyl('rubber', wx, 0.42, wz, 0.42, 0.42, 0.28, 16, 0, 0, Math.PI / 2);
    B.cyl('alu', wx * 1.02, 0.42, wz, 0.19, 0.19, 0.3, 12, 0, 0, Math.PI / 2);
    B.cyl('paintDark', wx * 1.06, 0.42, wz, 0.055, 0.055, 0.31, 8, 0, 0, Math.PI / 2);
    for (let i = 0; i < 6; i++) { // lug detail
      const a = (i / 6) * Math.PI * 2;
      B.box('paintDark', wx * 1.045, 0.42 + Math.sin(a) * 0.105, wz + Math.cos(a) * 0.105, 0.035, 0.035, 0.035);
    }
    B.box('paintDark', wx, 0.86, wz, 0.34, 0.1, 1.0);                   // wheel arch brow
  }

  // ---- cargo shell (rear face open — interior visible) ----
  B.box('floorMat', 0, 0.72, 0.85, 2.02, 0.1, 3.4);                    // cargo floor
  B.box('paint', -1.015, 1.42, 0.85, 0.07, 1.3, 3.4);                   // left wall
  B.box('paint', 1.015, 1.42, 0.85, 0.07, 1.3, 3.4);                    // right wall
  B.box('paint', 0, 2.1, 0.75, 2.06, 0.1, 3.6);                         // roof
  B.box('interior', 0, 1.42, -0.86, 1.96, 1.3, 0.07);                   // bulkhead
  // beveled armor edges (45° chamfer strips along the roofline + rear corners)
  B.box('paintDark', -1.02, 2.06, 0.75, 0.1, 0.1, 3.6, 0, 0, Math.PI / 4);
  B.box('paintDark', 1.02, 2.06, 0.75, 0.1, 0.1, 3.6, 0, 0, Math.PI / 4);
  B.box('paintDark', -1.02, 1.42, 2.53, 0.1, 1.34, 0.1, 0, Math.PI / 4, 0);
  B.box('paintDark', 1.02, 1.42, 2.53, 0.1, 1.34, 0.1, 0, Math.PI / 4, 0);
  // roof kit: vent + antenna base
  B.box('paintDark', -0.3, 2.18, 1.3, 0.5, 0.08, 0.5);
  B.cyl('paintDark', 0.7, 2.42, 0.4, 0.012, 0.02, 0.55, 6);

  // ---- cab ----
  B.box('paint', 0, 1.1, -1.5, 2.06, 0.9, 1.3);                         // cab mass below glassline
  B.box('paint', 0, 0.98, -2.2, 1.96, 0.62, 0.85);                      // hood block
  B.box('paint', 0, 2.06, -1.32, 1.98, 0.09, 0.95);                     // cab roof
  B.box('glassDark', 0, 1.66, -1.98, 1.78, 0.78, 0.07, 0.52);           // windshield (raked back)
  B.box('paint', -0.95, 1.66, -1.97, 0.12, 0.82, 0.14, 0.52);           // A pillars
  B.box('paint', 0.95, 1.66, -1.97, 0.12, 0.82, 0.14, 0.52);
  B.box('glassDark', -1.045, 1.72, -1.35, 0.05, 0.5, 0.8);              // cab side glass
  B.box('glassDark', 1.045, 1.72, -1.35, 0.05, 0.5, 0.8);
  // mirrors
  for (const mx of [-1, 1]) {
    B.box('paintDark', mx * 1.12, 1.78, -1.78, 0.2, 0.05, 0.05);
    B.box('glassDark', mx * 1.2, 1.72, -1.78, 0.05, 0.26, 0.16);
  }

  // ---- face: grille, bullbar, lights ----
  B.add('grille', new THREE.PlaneGeometry(1.5, 0.4), 0, 1.0, -2.635, 0, Math.PI, 0);
  B.box('headlight', -0.74, 1.2, -2.64, 0.34, 0.13, 0.05);
  B.box('headlight', 0.74, 1.2, -2.64, 0.34, 0.13, 0.05);
  B.box('tail', -0.98, 1.9, 2.56, 0.12, 0.3, 0.06);                     // tail markers
  B.box('tail', 0.98, 1.9, 2.56, 0.12, 0.3, 0.06);
  // bullbar
  for (const bx of [-0.62, 0.62]) B.cyl('steel', bx, 0.98, -2.82, 0.035, 0.035, 0.9, 8);
  B.cyl('steel', 0, 1.32, -2.82, 0.035, 0.035, 1.42, 8, 0, 0, Math.PI / 2);
  B.cyl('steel', 0, 0.78, -2.82, 0.035, 0.035, 1.42, 8, 0, 0, Math.PI / 2);
  for (const bx of [-0.62, 0.62]) B.box('paintDark', bx, 0.56, -2.72, 0.08, 0.1, 0.3);
  // light bar (steady blue — nothing strobes)
  B.box('paintDark', 0, 2.14, -1.32, 1.3, 0.08, 0.34);
  B.box('barBlue', -0.4, 2.2, -1.32, 0.44, 0.1, 0.28);
  B.box('barBlue', 0.4, 2.2, -1.32, 0.44, 0.1, 0.28);
  B.box('paintDark', 0, 2.2, -1.32, 0.3, 0.1, 0.28);
  // exhaust pipe (rear-left)
  B.cyl('steel', -0.78, 0.34, 2.66, 0.042, 0.048, 0.24, 8, Math.PI / 2);

  // ---- interior furnishing (seen through the open rear) ----
  for (const sx of [-1, 1]) {
    B.box('bench', sx * 0.7, 0.94, 0.9, 0.44, 0.12, 2.5);               // bench seat
    B.box('bench', sx * 0.94, 1.28, 0.9, 0.08, 0.56, 2.5);              // backrest
    for (const bz of [0.0, 0.9, 1.8]) B.box('paintDark', sx * 0.7, 0.83, bz, 0.4, 0.12, 0.08); // seat frames
  }
  B.box('interior', 0, 1.42, -0.78, 1.2, 0.6, 0.06);                    // bulkhead window frame
  B.box('glassDark', 0, 1.42, -0.8, 1.0, 0.44, 0.03);
  B.box('dome', 0, 2.03, 1.5, 0.3, 0.035, 0.2);                         // warm dome lamp

  B.build(van, {
    paint: A.paint, paintDark: A.paintDark, glassDark: A.glassDark,
    interior: A.interior, floorMat: A.floorMat, bench: A.bench, headlight: A.headlight, tail: A.tail,
    barBlue: A.barBlue, dome: A.dome, grille: A.grille,
    rubber: getMaterial('rubber'), steel: getMaterial('steel'), alu: getMaterial('aluminum'),
  }, { shadowKeys: ['paint', 'paintDark', 'rubber'] });

  // ---- livery panels (planes riding just off each side wall) ----
  const liv = new THREE.PlaneGeometry(3.3, 1.06);
  const livR = new THREE.Mesh(liv, A.liveryR);
  livR.rotation.y = Math.PI / 2;
  livR.position.set(1.056, 1.42, 0.8);
  van.add(livR);
  const livL = new THREE.Mesh(liv, A.liveryL);
  livL.rotation.y = -Math.PI / 2;
  livL.position.set(-1.056, 1.42, 0.8);
  van.add(livL);

  // ---- rear doors, swung open toward the extraction zone ----
  for (const side of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.position.set(side * 1.03, 1.44, 2.56);
    const door = new VanBatch();
    door.box('paint', -side * 0.47, 0, 0, 0.94, 1.26, 0.05);
    door.box('interior', -side * 0.47, 0, 0.032, 0.9, 1.2, 0.02);
    door.box('glassDark', -side * 0.47, 0.34, -0.032, 0.4, 0.34, 0.02);
    door.box('paintDark', -side * 0.16, -0.1, -0.045, 0.1, 0.26, 0.02); // handle/latch
    door.build(hinge, { paint: A.paint, interior: A.interior, glassDark: A.glassDark, paintDark: A.paintDark }, { shadowKeys: ['paint'] });
    hinge.rotation.y = -side * THREE.MathUtils.degToRad(118); // thrown open past 90°, flared along the flanks
    van.add(hinge);
  }

  // ---- lamps that sell it: headlight beams + warm dome point light ----
  const beamGeo = new THREE.PlaneGeometry(1.5, 0.5);
  for (const bx of [-0.74, 0.74]) {
    const beam = new THREE.Mesh(beamGeo, A.beam);
    beam.rotation.y = Math.PI / 2;
    beam.position.set(bx, 1.12, -3.42);
    van.add(beam);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.85, 20), A.glow);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(bx, 0.03, -3.5);
    van.add(pool);
  }
  const domeLight = new THREE.PointLight(0xffc890, 4.5, 4, 2);
  domeLight.position.set(0, 1.8, 1.6);
  van.add(domeLight);

  // ---- placement: nose east toward the shutter, open rear facing the
  // extraction point to the west ----
  const v = MAP.EXTRACTION.vanAt;
  van.position.set(v.x, MAP.EXTRACTION.y, v.z);
  van.rotation.y = -Math.PI / 2;
  group.add(van);

  // collider: same approximate footprint as before (rear-door area walkable)
  world.addCollider({
    x0: v.x - 2.4, y0: MAP.EXTRACTION.y, z0: v.z - 1.3, x1: v.x + 2.4, y1: MAP.EXTRACTION.y + 2.2, z1: v.z + 1.3,
    blocksMove: true, blocksSight: true, kind: 'prop', surface: 'metal',
  });

  // ---- idling exhaust (tiny loop via the vfx ambient system) ----
  // local (-0.78, 0.34, 2.66) → world (rotation.y = -90°): x' = -lz, z' = lx
  registerAmbientEmitter({
    type: 'exhaust', rate: 1.6,
    pos: { x: v.x - 2.66, y: MAP.EXTRACTION.y + 0.34, z: v.z - 0.78 },
    dir: { x: -1, z: 0 },
  });

  // ---- green signal smoke canister beside the van (marks the exfil) ----
  const sig = new THREE.Group();
  const sigX = v.x - 2.2, sigZ = v.z + 2.1;
  const can = new VanBatch();
  can.cyl('paintDark', 0, 0.07, 0, 0.05, 0.05, 0.14, 10);
  can.cyl('signalGreen', 0, 0.125, 0, 0.048, 0.048, 0.035, 10);
  can.build(sig, { paintDark: A.paintDark, signalGreen: A.signalGreen });
  sig.position.set(sigX, MAP.EXTRACTION.y, sigZ);
  van.userData.signal = sig;
  group.add(sig);
  const sigLight = new THREE.PointLight(0x7dd87d, 3.2, 4, 2);
  sigLight.position.set(0, 0.9, 0);
  sig.add(sigLight);
  registerAmbientEmitter({
    type: 'signal', rate: 2.4,
    pos: { x: sigX, y: MAP.EXTRACTION.y + 0.16, z: sigZ },
  });

  return van;
}
