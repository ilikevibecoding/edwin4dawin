// Decal system — owner: fable3-b.
//
// 1. placeStaticDecals(world, group)  — baked wear & storytelling marks
//    (called from the facilities decorate pass during buildWorld()).
// 2. spawnImpactDecal(surface, point, normal) — pooled runtime bullet marks
//    (VFX agent imports and calls this; signature is a contract).
// 3. spawnBloodDecal(point, normal) — pooled, honors the 'reducedBlood'
//    setting.
//
// Implementation notes: every static decal samples ONE shared 1024² canvas
// atlas and all quads merge into a single transparent mesh per level, so the
// whole static pass costs 2 draw calls. Planes float 5 mm off their surface
// with polygonOffset -2 (no z-fighting at grazing angles). Runtime marks are
// InstancedMesh pools (~120 impacts across 6 surface families, 40 blood),
// oldest-recycled. Module is import-safe: nothing touches the world until
// placeStaticDecals runs.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Rng, worldRng } from '../core/rng.js';
import { getSetting } from '../core/settings.js';
import { DOORS as MAP_DOORS } from './map.js';

// ---------------------------------------------------------------------------
// atlas

const ATLAS = 1024;
let atlasCanvas = null;
let atlasMat = null;
const REG = {}; // name -> {x,y,w,h}

function ctx2d() { return atlasCanvas.getContext('2d'); }

function region(name, x, y, w, h, draw) {
  REG[name] = { x, y, w, h };
  const c = ctx2d();
  c.save();
  c.beginPath(); c.rect(x, y, w, h); c.clip();
  c.translate(x, y);
  draw(c, w, h);
  c.restore();
}

function blob(c, cx, cy, rx, ry, color, alpha, rng, lobes = 7) {
  c.save();
  c.translate(cx, cy);
  c.beginPath();
  const pts = [];
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    const r = 0.72 + rng.random() * 0.38;
    pts.push([Math.cos(a) * rx * r, Math.sin(a) * ry * r]);
  }
  c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < lobes; i++) {
    const p = pts[i], q = pts[(i + 1) % lobes];
    c.quadraticCurveTo(p[0] * 1.22, p[1] * 1.22, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
  }
  c.closePath();
  c.globalAlpha = alpha;
  c.fillStyle = color;
  c.fill();
  c.restore();
}

function softEllipse(c, cx, cy, rx, ry, color, alpha) {
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
  g.addColorStop(0, color.replace('A)', `${alpha})`));
  g.addColorStop(1, color.replace('A)', '0)'));
  c.save();
  c.translate(cx, cy); c.scale(1, ry / rx); c.translate(-cx, -cy);
  c.fillStyle = g;
  c.beginPath(); c.arc(cx, cy, rx, 0, Math.PI * 2); c.fill();
  c.restore();
}

function buildAtlas() {
  if (atlasCanvas) return;
  atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = atlasCanvas.height = ATLAS;
  const rng = new Rng(360921);

  // carpet wear path: soft dark elongated smudge
  region('wear', 0, 0, 256, 128, (c, w, h) => {
    softEllipse(c, w / 2, h / 2, w * 0.46, h * 0.4, 'rgba(20,18,14,A)', 0.34);
    softEllipse(c, w * 0.35, h * 0.55, w * 0.25, h * 0.28, 'rgba(16,14,10,A)', 0.2);
  });
  // hard-floor (vinyl/concrete) traffic wear: much fainter dull path with
  // sparse streaks. The carpet 'wear' alpha on light vinyl read as a row of
  // detached dark blobs down the north corridor (audit 2).
  region('wear_hard', 0, 512, 256, 128, (c, w, h) => {
    softEllipse(c, w / 2, h / 2, w * 0.48, h * 0.36, 'rgba(30,29,26,A)', 0.13);
    for (let i = 0; i < 14; i++) {
      c.globalAlpha = 0.04 + rng.random() * 0.07;
      c.fillStyle = i % 3 ? '#33302a' : '#3c3831';
      c.fillRect(rng.random() * w * 0.8, h * (0.25 + rng.random() * 0.5),
        10 + rng.random() * 40, 1.5 + rng.random() * 2);
    }
    c.globalAlpha = 1;
  });
  // wall scuff cluster (near handles)
  region('scuff', 256, 0, 128, 128, (c, w, h) => {
    for (let i = 0; i < 9; i++) {
      c.save();
      c.translate(w * (0.2 + rng.random() * 0.6), h * (0.2 + rng.random() * 0.6));
      c.rotate(rng.random() * 1.2 - 0.6);
      c.globalAlpha = 0.14 + rng.random() * 0.2;
      c.fillStyle = i % 3 ? '#26221c' : '#3a352c';
      c.fillRect(-w * 0.18, -1.6, w * (0.2 + rng.random() * 0.22), 2.4 + rng.random() * 2.4);
      c.restore();
    }
  });
  // threshold dirt
  region('dirt', 384, 0, 128, 128, (c, w, h) => {
    softEllipse(c, w / 2, h / 2, w * 0.44, h * 0.36, 'rgba(30,26,18,A)', 0.4);
    for (let i = 0; i < 26; i++) {
      c.globalAlpha = 0.1 + rng.random() * 0.24;
      c.fillStyle = '#241f16';
      c.fillRect(w * rng.random(), h * rng.random(), 2 + rng.random() * 3, 1.6 + rng.random() * 2.4);
    }
  });
  // water stain (ceiling corner)
  region('stain', 512, 0, 192, 192, (c, w, h) => {
    blob(c, w / 2, h / 2, w * 0.36, h * 0.34, 'rgba(96,84,56,0.30)', 1, rng);
    blob(c, w / 2 + 6, h / 2 + 4, w * 0.26, h * 0.24, 'rgba(84,70,44,0.28)', 1, rng);
    c.strokeStyle = 'rgba(70,58,36,0.5)'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(w / 2, h / 2, w * 0.37, h * 0.33, 0.3, 0, Math.PI * 2); c.stroke();
  });
  // leak ring (crisper ring, floor or ceiling)
  region('ring', 704, 0, 128, 128, (c, w, h) => {
    c.strokeStyle = 'rgba(74,64,42,0.55)'; c.lineWidth = 3;
    c.beginPath(); c.ellipse(w / 2, h / 2, w * 0.4, h * 0.36, 0.2, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(74,64,42,0.3)'; c.lineWidth = 5;
    c.beginPath(); c.ellipse(w / 2 + 3, h / 2 + 2, w * 0.31, h * 0.27, 0.2, 0, Math.PI * 2); c.stroke();
    softEllipse(c, w / 2, h / 2, w * 0.28, h * 0.24, 'rgba(60,52,34,A)', 0.18);
  });
  // tape residue patch
  region('tape', 832, 0, 96, 96, (c, w, h) => {
    for (let i = 0; i < 4; i++) {
      c.save();
      c.translate(w / 2, h / 2);
      c.rotate(rng.random() * 0.5 - 0.25 + (i % 2) * 1.57);
      c.globalAlpha = 0.2 + rng.random() * 0.14;
      c.fillStyle = '#57503e';
      c.fillRect(-w * 0.3, -5 - i * 8, w * 0.55, 9);
      c.restore();
    }
  });
  // cable-path mark (floor, long)
  region('cable', 0, 128, 256, 64, (c, w, h) => {
    c.strokeStyle = 'rgba(26,24,20,0.4)'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(4, h * 0.5); c.bezierCurveTo(w * 0.3, h * 0.3, w * 0.6, h * 0.72, w - 4, h * 0.45); c.stroke();
    c.strokeStyle = 'rgba(40,36,28,0.28)'; c.lineWidth = 9;
    c.beginPath(); c.moveTo(4, h * 0.55); c.bezierCurveTo(w * 0.34, h * 0.4, w * 0.6, h * 0.8, w - 4, h * 0.52); c.stroke();
  });
  // wet footprints ×3 fade levels (pair per tile, walking up)
  for (let f = 0; f < 3; f++) {
    region(`foot${f}`, 256 + f * 96, 128, 96, 128, (c, w, h) => {
      const a = 0.42 - f * 0.13;
      const foot = (fx, fy, mirror) => {
        c.save();
        c.translate(fx, fy);
        if (mirror) c.scale(-1, 1);
        c.fillStyle = `rgba(34,44,52,${a})`;
        c.beginPath(); c.ellipse(0, 0, 9, 17, 0.06, 0, Math.PI * 2); c.fill();   // sole
        c.beginPath(); c.ellipse(1, 26, 7, 9, -0.05, 0, Math.PI * 2); c.fill();  // heel
        c.restore();
      };
      foot(w * 0.32, h * 0.62, false);
      foot(w * 0.68, h * 0.26, true);
    });
  }
  // oil stain (garage)
  region('oil', 0, 256, 224, 224, (c, w, h) => {
    blob(c, w / 2, h / 2, w * 0.34, h * 0.3, 'rgba(16,16,18,0.62)', 1, rng, 9);
    blob(c, w / 2 - 10, h / 2 + 8, w * 0.2, h * 0.16, 'rgba(10,10,12,0.7)', 1, rng, 6);
    blob(c, w * 0.72, h * 0.3, w * 0.09, h * 0.08, 'rgba(16,16,18,0.5)', 1, rng, 5);
    softEllipse(c, w / 2, h / 2, w * 0.42, h * 0.38, 'rgba(18,18,20,A)', 0.22);
  });
  // drain ring (basement floor)
  region('drain', 224, 256, 128, 128, (c, w, h) => {
    softEllipse(c, w / 2, h / 2, w * 0.42, h * 0.4, 'rgba(38,40,38,A)', 0.35);
    c.fillStyle = 'rgba(20,22,22,0.85)';
    c.beginPath(); c.arc(w / 2, h / 2, w * 0.13, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(60,62,58,0.8)'; c.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      c.beginPath(); c.moveTo(w / 2 - w * 0.1, h / 2 + i * 5); c.lineTo(w / 2 + w * 0.1, h / 2 + i * 5); c.stroke();
    }
    c.strokeStyle = 'rgba(46,48,46,0.5)';
    c.beginPath(); c.arc(w / 2, h / 2, w * 0.3, 0, Math.PI * 2); c.stroke();
  });
  // painted line (solid, slightly worn white — parking stripes / lane edges)
  region('stripe', 352, 256, 64, 256, (c, w, h) => {
    c.fillStyle = 'rgba(214,218,214,0.85)';
    c.fillRect(w * 0.2, 4, w * 0.6, h - 8);
    // wear chips
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 26; i++) {
      c.globalAlpha = 0.5 + rng.random() * 0.5;
      c.fillRect(w * 0.2 + rng.random() * w * 0.6, rng.random() * h, 2 + rng.random() * 5, 2 + rng.random() * 6);
    }
    c.globalCompositeOperation = 'source-over';
  });
  // wainscot-height scuff band (long horizontal wall wear, cart/kick marks)
  region('wainscot', 544, 256, 384, 96, (c, w, h) => {
    // soft grime gradient hugging the band's lower half
    const grad = c.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(40,38,32,0)');
    grad.addColorStop(0.55, 'rgba(40,38,32,0.10)');
    grad.addColorStop(1, 'rgba(34,32,26,0.22)');
    c.fillStyle = grad; c.fillRect(0, 0, w, h);
    // horizontal cart-bumper streaks
    for (let i = 0; i < 26; i++) {
      c.save();
      c.translate(rng.random() * w, h * (0.3 + rng.random() * 0.6));
      c.rotate((rng.random() - 0.5) * 0.1);
      c.globalAlpha = 0.10 + rng.random() * 0.16;
      c.fillStyle = i % 4 ? '#2c2822' : '#3d382e';
      c.fillRect(-14 - rng.random() * 30, -1.2, 28 + rng.random() * 60, 1.8 + rng.random() * 2.6);
      c.restore();
    }
    // a few darker heel scuffs near the bottom edge
    for (let i = 0; i < 8; i++) {
      c.globalAlpha = 0.14 + rng.random() * 0.18;
      c.fillStyle = '#221f1a';
      c.fillRect(rng.random() * w, h - 10 - rng.random() * 14, 5 + rng.random() * 9, 3 + rng.random() * 4);
    }
    c.globalAlpha = 1;
  });
  // lane arrow (painted)
  region('arrow', 416, 256, 128, 192, (c, w, h) => {
    c.fillStyle = 'rgba(214,218,214,0.8)';
    c.fillRect(w * 0.42, h * 0.35, w * 0.16, h * 0.55);
    c.beginPath();
    c.moveTo(w * 0.5, h * 0.06); c.lineTo(w * 0.82, h * 0.4); c.lineTo(w * 0.18, h * 0.4);
    c.closePath(); c.fill();
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 20; i++) {
      c.globalAlpha = 0.4 + rng.random() * 0.5;
      c.fillRect(rng.random() * w, rng.random() * h, 3 + rng.random() * 4, 2 + rng.random() * 5);
    }
    c.globalCompositeOperation = 'source-over';
  });
}

function decalMaterial() {
  if (atlasMat) return atlasMat;
  buildAtlas();
  const tex = new THREE.CanvasTexture(atlasCanvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  atlasMat = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, depthWrite: false, roughness: 0.9, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  atlasMat.name = 'decal_static_atlas';
  return atlasMat;
}

// quad with UVs into a named region. face: 'up' | 'down' | {nx,nz} wall normal
function quadGeo(name, x, y, z, w, h, yaw = 0, face = 'up') {
  const r = REG[name];
  const g = new THREE.PlaneGeometry(w, h);
  const u0 = r.x / ATLAS, u1 = (r.x + r.w) / ATLAS;
  const vT = 1 - r.y / ATLAS, vB = 1 - (r.y + r.h) / ATLAS;
  const uv = g.attributes.uv;
  uv.setXY(0, u0, vT); uv.setXY(1, u1, vT); uv.setXY(2, u0, vB); uv.setXY(3, u1, vB);
  const m = new THREE.Matrix4();
  const rot = new THREE.Matrix4();
  if (face === 'up') rot.makeRotationX(-Math.PI / 2);
  else if (face === 'down') rot.makeRotationX(Math.PI / 2);
  else rot.makeRotationY(Math.atan2(face.nx, face.nz));
  m.makeRotationY(face === 'up' || face === 'down' ? yaw : 0).multiply(rot);
  if (face !== 'up' && face !== 'down') m.copy(rot);
  m.setPosition(x, y, z);
  g.applyMatrix4(m);
  return g;
}

// ---------------------------------------------------------------------------
// 1. static decals

export function placeStaticDecals(world, group) {
  initRuntimeRoot(group);
  buildAtlas();
  const rng = new Rng(771003);
  const geos = [];
  const G = 0.006;           // lift off surface
  const q = (...a) => geos.push(quadGeo(...a));

  // ---- carpet wear paths along main aisles --------------------------------
  const wearPaths = [
    // hallway_w: door-to-door diagonal
    [[12, 29.2], [14, 25.0], 1.3], [[14, 26.8], [17.2, 26.8], 1.2],
    // north_corridor spine
    [[20, 12], [38, 12], 1.5], [[42, 12], [62, 12], 1.5],
    // east_hall spine
    [[41.5, 28], [54.5, 28], 1.4],
    // training center aisle from doors
    [[48.9, 9.2], [48.9, 4.4], 1.2],
    // break room to vending
    [[28, 9.4], [32.6, 5.2], 1.1],
  ];
  for (const [a, b, wid] of wearPaths) {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const yaw = Math.atan2(dx, dz) + Math.PI / 2;
    const n = Math.max(1, Math.round(len / 2.2));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const px = a[0] + dx * t + rng.range(-0.15, 0.15);
      const pz = a[1] + dz * t + rng.range(-0.15, 0.15);
      const gr = world.groundAt(px, pz, 1, 2);
      const hard = gr.surface !== 'carpet';
      // hard floors: longer + overlapping quads so the faint patches chain
      // into one continuous traffic lane instead of discrete smudges
      q(hard ? 'wear_hard' : 'wear', px, gr.y + G, pz, hard ? 3.4 : 2.6,
        wid * rng.range(0.85, 1.15), yaw + rng.range(-0.12, 0.12), 'up');
    }
  }

  // ---- door thresholds: dirt + wall scuffs near handles -------------------
  const doorMarks = [
    ['d_corr_break', 'd_corr_storage', 'd_corr_fac', 'd_corr_training1', 'd_janitor',
      'd_hallw_copy', 'd_rr_m', 'd_rr_w', 'd_bcorr_utility', 'd_bcorr_loading', 'd_corr_mech'],
  ][0];
  for (const id of doorMarks) {
    const d = findDoor(id);
    if (!d) continue;
    const mid = (d.span[0] + d.span[1]) / 2;
    const fy = d.level === 'b' ? -3.6 : 0;
    const [px, pz] = d.dir === 'x' ? [mid, d.line] : [d.line, mid];
    q('dirt', px, fy + G, pz, 1.5, 1.1, rng.range(0, 3.14), 'up');
    // scuff patch on the wall at handle height, latch side, both faces
    const latch = d.span[1] + 0.28;
    for (const s of [-1, 1]) {
      const off = s * 0.095;
      if (d.dir === 'x') q('scuff', latch, fy + 1.02, d.line + off, 0.5, 0.5, 0, { nx: 0, nz: s });
      else q('scuff', d.line + off, fy + 1.02, latch, 0.5, 0.5, 0, { nx: s, nz: 0 });
    }
  }

  // ---- water stains: copy + janitor ceiling corners, leak rings -----------
  q('stain', 10.8, 2.93, 16.9, 1.4, 1.4, 0.4, 'down');       // copy_mail NW ceiling
  q('stain', 13.4, 2.93, 43.3, 1.2, 1.2, 2.2, 'down');       // janitor S ceiling
  q('ring', 12.9, G, 42.8, 0.9, 0.9, 0.7, 'up');             // janitor floor ring under stain
  q('stain', 19.2, -3.6 + 2.53, 11.4, 1.3, 1.3, 1.1, 'down'); // service corridor ceiling
  q('ring', 33.5, -3.6 + G, 10.1, 0.8, 0.8, 2.6, 'up');       // corridor leak ring

  // ---- restroom hall wainscot scuff band (audit 1: bare west wall) --------
  // west wall face x=6.08 (+X normal), segments skip both restroom doors;
  // one echo band behind the bench on the east wall face x=9.92 (-X normal).
  for (const [zc, len] of [[31.4, 2.0], [36.7, 5.2], [42.3, 2.4]]) {
    q('wainscot', 6.086, 0.42, zc, len, 0.55, 0, { nx: 1, nz: 0 });
  }
  q('wainscot', 9.914, 0.42, 37.0, 4.6, 0.55, 0, { nx: -1, nz: 0 });

  // ---- tape residue + cable marks -----------------------------------------
  q('tape', 13.2, 1.35, 23.90, 0.35, 0.35, 0, { nx: 0, nz: -1 });  // copy south wall
  q('tape', 17.92, 1.5, 21.4, 0.4, 0.4, 0, { nx: -1, nz: 0 });     // copy east wall
  q('tape', 52.5, 1.4, 9.90, 0.4, 0.4, 0, { nx: 0, nz: -1 });      // training poster wall
  q('cable', 59.6, G, 17.4, 2.6, 0.7, 0, 'up');                    // server room floor
  q('cable', 58.9, G, 19.3, 2.2, 0.6, 0.5, 'up');
  q('cable', 61.5, -3.6 + G, 13.2, 2.8, 0.7, 1.2, 'up');           // garage near shutter

  // ---- snow-wet footprints: vestibule -> lobby, fading ---------------------
  const trail = [
    [31.0, 43.4, 0], [30.7, 42.3, 0], [31.1, 41.2, 0],
    [30.8, 40.0, 1], [31.2, 38.8, 1], [30.9, 37.6, 2], [31.2, 36.4, 2],
  ];
  for (const [px, pz, fade] of trail) {
    q(`foot${fade}`, px + rng.range(-0.08, 0.08), G + 0.001, pz, 0.5, 0.66, rng.range(-0.15, 0.15) + Math.PI, 'up');
  }
  // second lighter trail veering toward reception
  q('foot1', 30.2, G + 0.001, 38.9, 0.5, 0.66, 0.5 + Math.PI, 'up');
  q('foot2', 29.3, G + 0.001, 38.1, 0.5, 0.66, 0.8 + Math.PI, 'up');

  // ---- garage: parking bays, lane arrows, oil ------------------------------
  const by = -3.6;
  // 5 stripes -> 4 bays along the south wall (z 12..15.8), 0.12 m wide
  for (let i = 0; i < 5; i++) {
    const x = 45.4 + i * 2.6;
    q('stripe', x, by + G, 13.9, 0.12, 3.8, 0, 'up');
  }
  for (let i = 0; i < 4; i++) {
    const x = 46.7 + i * 2.6;
    if (rng.chance(0.75)) q('oil', x + rng.range(-0.5, 0.5), by + G, 13.6 + rng.range(-0.8, 0.6), rng.range(0.8, 1.6), rng.range(0.7, 1.4), rng.range(0, 6.3), 'up');
  }
  q('oil', 51.5, by + G, 7.0, 2.0, 1.7, 1.2, 'up');   // old stain in the drive lane
  q('oil', 47.2, by + G, 9.8, 1.1, 0.9, 4.2, 'up');
  // lane guidance from the corridor doors toward the extraction bay
  q('arrow', 47.0, by + G, 10.0, 0.7, 1.05, Math.PI / 2, 'up');
  q('arrow', 51.5, by + G, 9.4, 0.7, 1.05, Math.PI / 2, 'up');
  q('stripe', 48.5, by + G, 12.1, 0.12, 6.0, Math.PI / 2, 'up'); // lane edge line
  q('stripe', 52.0, by + G, 12.1, 0.12, 1.0, Math.PI / 2, 'up');

  // ---- basement drains ------------------------------------------------------
  q('drain', 24.0, by + G, 10.1, 0.6, 0.6, 0.3, 'up');   // service corridor
  q('drain', 28.5, by + G, 4.2, 0.6, 0.6, 1.9, 'up');    // utility
  q('drain', 37.0, by + G, 2.0, 0.6, 0.6, 0.9, 'up');    // loading
  q('drain', 55.0, by + G, 8.2, 0.7, 0.7, 2.4, 'up');    // garage center
  q('wear_hard', 31, by + G, 10.1, 3.0, 1.2, Math.PI / 2, 'up'); // corridor traffic polish
  q('wear_hard', 38, by + G, 10.1, 3.0, 1.2, Math.PI / 2, 'up');

  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  const mesh = new THREE.Mesh(merged, decalMaterial());
  mesh.renderOrder = 2;
  mesh.matrixAutoUpdate = false;
  mesh.receiveShadow = false;
  mesh.castShadow = false;
  group.add(mesh);
  return mesh;
}

function findDoor(id) { return MAP_DOORS.find((d) => d.id === id); }

// ---------------------------------------------------------------------------
// 2/3. runtime pools

let runtimeRoot = null;
const pools = new Map(); // key -> {mesh, next, size}

function initRuntimeRoot(group) { runtimeRoot = group; }

function impactTexture(kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const rng = new Rng(9200 + kind.length * 37);
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  if (kind === 'metal') {
    grad.addColorStop(0, 'rgba(30,32,36,0.9)');
    grad.addColorStop(0.4, 'rgba(70,74,80,0.55)');
    grad.addColorStop(1, 'rgba(90,95,100,0)');
  } else if (kind === 'wood') {
    grad.addColorStop(0, 'rgba(28,20,12,0.95)');
    grad.addColorStop(0.45, 'rgba(60,44,26,0.6)');
    grad.addColorStop(1, 'rgba(80,60,36,0)');
  } else if (kind === 'tile') {
    grad.addColorStop(0, 'rgba(40,44,46,0.95)');
    grad.addColorStop(0.35, 'rgba(120,126,128,0.5)');
    grad.addColorStop(1, 'rgba(160,166,168,0)');
  } else if (kind === 'drywall') {
    grad.addColorStop(0, 'rgba(50,46,40,0.95)');
    grad.addColorStop(0.4, 'rgba(150,146,136,0.55)');
    grad.addColorStop(1, 'rgba(170,166,156,0)');
  } else { // concrete / generic
    grad.addColorStop(0, 'rgba(30,30,28,0.95)');
    grad.addColorStop(0.4, 'rgba(80,80,76,0.5)');
    grad.addColorStop(1, 'rgba(110,110,105,0)');
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  // chips / splinters radiating out
  g.globalCompositeOperation = kind === 'metal' ? 'source-over' : 'source-over';
  for (let i = 0; i < (kind === 'wood' ? 7 : 5); i++) {
    const a = rng.random() * Math.PI * 2;
    const l = 8 + rng.random() * (kind === 'wood' ? 20 : 12);
    g.save();
    g.translate(32, 32); g.rotate(a);
    g.fillStyle = kind === 'wood' ? 'rgba(46,32,18,0.55)' : 'rgba(40,40,38,0.4)';
    g.fillRect(6, -1.2, l, kind === 'wood' ? 3 : 2);
    g.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const SURFACE_KIND = {
  concrete: 'concrete', drywall: 'drywall', wood: 'wood', metal: 'metal',
  tile: 'tile', vinyl: 'tile', carpet: 'drywall', plastic: 'metal',
  cardboard: 'wood', rubber: 'metal', snow: 'concrete',
};

function getPool(key, makeTex, size, quad = 0.11) {
  let p = pools.get(key);
  if (p) return p;
  if (!runtimeRoot) return null;
  const mat = new THREE.MeshStandardMaterial({
    map: makeTex(), transparent: true, depthWrite: false, roughness: 0.95,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(quad, quad), mat, size);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < size; i++) mesh.setMatrixAt(i, zero);
  mesh.instanceMatrix.needsUpdate = true;
  mesh.count = size;
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  mesh.castShadow = mesh.receiveShadow = false;
  runtimeRoot.add(mesh);
  p = { mesh, next: 0, size };
  pools.set(key, p);
  return p;
}

const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const Z_AXIS = new THREE.Vector3(0, 0, 1);

function stamp(pool, point, normal, scale) {
  _n.set(normal.x ?? 0, normal.y ?? 0, normal.z ?? 0);
  if (_n.lengthSq() < 1e-6) _n.set(0, 1, 0);
  _n.normalize();
  _q.setFromUnitVectors(Z_AXIS, _n);
  _q2.setFromAxisAngle(_n, worldRng.random() * Math.PI * 2);
  _q.premultiply(_q2);
  _v.set(point.x + _n.x * 0.008, point.y + _n.y * 0.008, point.z + _n.z * 0.008);
  _m.compose(_v, _q, new THREE.Vector3(scale, scale, scale));
  pool.mesh.setMatrixAt(pool.next, _m);
  pool.mesh.instanceMatrix.needsUpdate = true;
  pool.next = (pool.next + 1) % pool.size; // oldest recycled
}

// Runtime bullet impact mark. `surface` is the collider surface string
// ('concrete'|'drywall'|'wood'|'metal'|'tile'|...); point/normal are
// {x,y,z} or THREE.Vector3. Max ~120 marks live (24 per surface family).
export function spawnImpactDecal(surface, point, normal) {
  if (!runtimeRoot || !point) return;
  const kind = SURFACE_KIND[surface] || 'concrete';
  const pool = getPool(`impact_${kind}`, () => impactTexture(kind), 24, 0.12);
  if (!pool) return;
  stamp(pool, point, normal || { x: 0, y: 1, z: 0 }, 0.7 + worldRng.random() * 0.6);
}

function bloodTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d');
  const rng = new Rng(66610);
  blob(g, 48, 48, 26, 22, 'rgba(52,10,10,0.88)', 1, rng, 9);
  blob(g, 42, 54, 14, 12, 'rgba(38,6,6,0.9)', 1, rng, 6);
  for (let i = 0; i < 12; i++) {
    const a = rng.random() * Math.PI * 2, d = 26 + rng.random() * 18;
    g.fillStyle = `rgba(52,10,10,${0.4 + rng.random() * 0.4})`;
    g.beginPath();
    g.arc(48 + Math.cos(a) * d, 48 + Math.sin(a) * d, 1 + rng.random() * 2.6, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Small dark pool/spray. No-op when the 'reducedBlood' accessibility setting
// is on. Pool of 40, oldest recycled.
export function spawnBloodDecal(point, normal) {
  if (getSetting('reducedBlood')) return;
  if (!runtimeRoot || !point) return;
  const pool = getPool('blood', bloodTexture, 40, 0.42);
  if (!pool) return;
  stamp(pool, point, normal || { x: 0, y: 1, z: 0 }, 0.6 + worldRng.random() * 0.9);
}

// test/QA helper
export function decalPoolStats() {
  const out = {};
  for (const [k, p] of pools) out[k] = { size: p.size, cursor: p.next };
  return out;
}
