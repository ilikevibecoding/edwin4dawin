// Forward control room: helm, sonar, navigation, viewport furniture, overhead
// panels, periscope column, seats, displays. Owner: control-room agent.

import * as THREE from 'three';
import { Z, VIEWPORT } from './layout.js';
import * as M from './materials.js';
import * as K from './greebles.js';
import { makeRng } from './rng.js';
import { makeCanvas, fillBase, mottle, speckle, stencilText, canvasTexture } from './textures.js';

// ---------------------------------------------------------------------------
// Canvas display painters (all deterministic functions of simTime)
// ---------------------------------------------------------------------------

function paintSonarPPI(ctx2d, t, pingT) {
  const W = ctx2d.canvas.width, H = ctx2d.canvas.height;
  const cx = W / 2, cy = H / 2, R = W * 0.46;
  ctx2d.fillStyle = '#04120b';
  ctx2d.fillRect(0, 0, W, H);
  // range rings
  ctx2d.strokeStyle = 'rgba(90,190,120,0.28)';
  ctx2d.lineWidth = 1.5;
  for (let i = 1; i <= 4; i++) {
    ctx2d.beginPath(); ctx2d.arc(cx, cy, (R * i) / 4, 0, Math.PI * 2); ctx2d.stroke();
  }
  // bearing lines
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx2d.beginPath();
    ctx2d.moveTo(cx + Math.cos(a) * R * 0.1, cy + Math.sin(a) * R * 0.1);
    ctx2d.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx2d.strokeStyle = 'rgba(90,190,120,0.12)';
    ctx2d.stroke();
  }
  // sweep with trail
  const sweepA = (t * 0.9) % (Math.PI * 2);
  for (let i = 0; i < 26; i++) {
    const a = sweepA - i * 0.035;
    ctx2d.strokeStyle = `rgba(121,201,141,${0.55 * (1 - i / 26)})`;
    ctx2d.lineWidth = 2.5;
    ctx2d.beginPath();
    ctx2d.moveTo(cx, cy);
    ctx2d.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    ctx2d.stroke();
  }
  // deterministic contacts
  const rng = makeRng('sonar-contacts');
  for (let i = 0; i < 5; i++) {
    const a = rng() * Math.PI * 2, r = R * (0.3 + rng() * 0.62);
    const diff = ((sweepA - a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const glow = Math.max(0, 1 - diff / 1.4);
    if (glow > 0.02) {
      ctx2d.fillStyle = `rgba(150,235,170,${0.75 * glow})`;
      ctx2d.beginPath(); ctx2d.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3.4, 0, 7); ctx2d.fill();
    }
  }
  // ping pulse: expanding ring
  if (pingT >= 0 && pingT < 3.2) {
    const pr = (pingT / 3.2) * R;
    ctx2d.strokeStyle = `rgba(170,255,190,${0.8 * (1 - pingT / 3.2)})`;
    ctx2d.lineWidth = 4;
    ctx2d.beginPath(); ctx2d.arc(cx, cy, pr, 0, Math.PI * 2); ctx2d.stroke();
  }
  // bezel text
  ctx2d.fillStyle = 'rgba(121,201,141,0.85)';
  ctx2d.font = `${W * 0.045}px "DejaVu Sans Mono", monospace`;
  ctx2d.textAlign = 'left';
  ctx2d.fillText('SONAR A-SCAN', W * 0.04, H * 0.07);
  ctx2d.fillText('RNG 800M', W * 0.04, H * 0.955);
  ctx2d.textAlign = 'right';
  ctx2d.fillText(`BRG ${String(Math.floor((sweepA * 57.29) % 360)).padStart(3, '0')}`, W * 0.96, H * 0.955);
}

function paintWaterfall(ctx2d, t) {
  const W = ctx2d.canvas.width, H = ctx2d.canvas.height;
  ctx2d.fillStyle = '#050f0a';
  ctx2d.fillRect(0, 0, W, H);
  const rng = makeRng('waterfall');
  const bandJitter = [];
  for (let i = 0; i < 5; i++) bandJitter.push({ x: 0.14 + rng() * 0.72, w: 1.5 + rng() * 3, sp: 0.2 + rng() * 0.8 });
  for (let y = 0; y < H; y += 2) {
    const rowT = t * 8 - y * 0.5;
    for (let x = 0; x < W; x += 2) {
      const n = Math.sin(x * 12.9898 + rowT * 0.3) * Math.sin(rowT * 78.233 + x * 0.7) * 43758.55;
      const v = (n - Math.floor(n));
      if (v > 0.82) {
        ctx2d.fillStyle = `rgba(110,190,130,${(v - 0.82) * 2.2})`;
        ctx2d.fillRect(x, y, 2, 2);
      }
    }
  }
  // tonal bands (targets)
  for (const b of bandJitter) {
    for (let y = 0; y < H; y += 2) {
      const x = b.x * W + Math.sin((t * 8 - y * 0.5) * 0.02 * b.sp) * 6;
      ctx2d.fillStyle = 'rgba(150,230,170,0.5)';
      ctx2d.fillRect(x, y, b.w, 2);
    }
  }
  ctx2d.fillStyle = 'rgba(121,201,141,0.9)';
  ctx2d.font = `${W * 0.055}px "DejaVu Sans Mono", monospace`;
  ctx2d.textAlign = 'left';
  ctx2d.fillText('BB LOFAR', W * 0.04, H * 0.09);
}

function paintNavPanel(ctx2d, t) {
  const W = ctx2d.canvas.width, H = ctx2d.canvas.height;
  ctx2d.fillStyle = '#0a0e08';
  ctx2d.fillRect(0, 0, W, H);
  const green = '#79c98d', amber = '#d8a04c';
  const depth = 212 + Math.sin(t * 0.21) * 1.8;
  const hdg = (84 + Math.sin(t * 0.06) * 2) % 360;
  const spd = 4.2 + Math.sin(t * 0.13) * 0.15;
  ctx2d.font = `bold ${H * 0.16}px "DejaVu Sans Mono", monospace`;
  ctx2d.fillStyle = green;
  ctx2d.textAlign = 'left';
  ctx2d.fillText(`DEPTH  ${depth.toFixed(1)} M`, W * 0.07, H * 0.24);
  ctx2d.fillText(`HDG    ${String(Math.floor(hdg)).padStart(3, '0')}°`, W * 0.07, H * 0.46);
  ctx2d.fillStyle = amber;
  ctx2d.fillText(`SPD    ${spd.toFixed(1)} KT`, W * 0.07, H * 0.68);
  ctx2d.fillText(`TRIM   -0.5°`, W * 0.07, H * 0.90);
  // side blocks
  ctx2d.strokeStyle = 'rgba(121,201,141,0.4)';
  ctx2d.lineWidth = 2;
  ctx2d.strokeRect(W * 0.03, H * 0.06, W * 0.94, H * 0.9);
  // blinking cursor
  if (Math.floor(t * 1.4) % 2 === 0) {
    ctx2d.fillStyle = green;
    ctx2d.fillRect(W * 0.9, H * 0.86, W * 0.04, H * 0.05);
  }
}

function paintChart(ctx2d) {
  const W = ctx2d.canvas.width, H = ctx2d.canvas.height;
  fillBase(ctx2d, '#b3ac96');
  mottle(ctx2d, 'chart-paper', { cells: 6, octaves: 3, amount: 0.08 });
  const rng = makeRng('chart');
  // bathymetric contours (bolder so they read from standing height)
  for (let c = 0; c < 9; c++) {
    ctx2d.strokeStyle = `rgba(58,78,100,${0.5 + c * 0.04})`;
    ctx2d.lineWidth = 2.0;
    ctx2d.beginPath();
    const yBase = H * (0.15 + c * 0.09);
    ctx2d.moveTo(0, yBase);
    for (let x = 0; x <= W; x += 20) {
      ctx2d.lineTo(x, yBase + Math.sin(x * 0.02 + c * 1.7) * 22 + rng.gauss() * 5);
    }
    ctx2d.stroke();
  }
  // grid
  ctx2d.strokeStyle = 'rgba(60,60,65,0.3)';
  ctx2d.lineWidth = 1;
  for (let x = 0; x < W; x += W / 8) { ctx2d.beginPath(); ctx2d.moveTo(x, 0); ctx2d.lineTo(x, H); ctx2d.stroke(); }
  for (let y = 0; y < H; y += H / 6) { ctx2d.beginPath(); ctx2d.moveTo(0, y); ctx2d.lineTo(W, y); ctx2d.stroke(); }
  // margin ruler ticks (lat/long)
  ctx2d.fillStyle = 'rgba(50,50,55,0.75)';
  for (let x = 0; x < W; x += W / 32) ctx2d.fillRect(x, 0, 2, x % (W / 8) < 2 ? 14 : 8);
  for (let y = 0; y < H; y += H / 24) ctx2d.fillRect(0, y, y % (H / 6) < 2 ? 14 : 8, 2);
  // depth labels
  ctx2d.font = `${H * 0.036}px "DejaVu Sans", sans-serif`;
  ctx2d.fillStyle = 'rgba(50,62,84,0.9)';
  for (let c = 0; c < 5; c++) ctx2d.fillText(`${150 + c * 50}`, W * 0.06 + c * 14, H * (0.18 + c * 0.135));
  // scattered soundings
  for (let i = 0; i < 26; i++) {
    const sx = W * (0.08 + rng() * 0.84), sy = H * (0.12 + rng() * 0.8);
    ctx2d.fillText(String(140 + Math.floor(rng() * 180)), sx, sy);
  }
  // compass rose
  {
    const rx = W * 0.84, ry = H * 0.2, rr = H * 0.11;
    ctx2d.strokeStyle = 'rgba(60,66,80,0.85)';
    ctx2d.lineWidth = 1.6;
    ctx2d.beginPath(); ctx2d.arc(rx, ry, rr, 0, 7); ctx2d.stroke();
    ctx2d.beginPath(); ctx2d.arc(rx, ry, rr * 0.62, 0, 7); ctx2d.stroke();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r0 = i % 4 === 0 ? rr * 0.2 : rr * 0.75;
      ctx2d.beginPath();
      ctx2d.moveTo(rx + Math.cos(a) * r0, ry + Math.sin(a) * r0);
      ctx2d.lineTo(rx + Math.cos(a) * rr, ry + Math.sin(a) * rr);
      ctx2d.stroke();
    }
    // north arrow
    ctx2d.fillStyle = 'rgba(60,66,80,0.9)';
    ctx2d.beginPath();
    ctx2d.moveTo(rx, ry - rr * 1.18); ctx2d.lineTo(rx - rr * 0.14, ry - rr * 0.6);
    ctx2d.lineTo(rx + rr * 0.14, ry - rr * 0.6); ctx2d.closePath(); ctx2d.fill();
    stencilText(ctx2d, 'N', rx, ry - rr * 1.34, { size: H * 0.05, color: 'rgba(60,66,80,0.95)', spacing: 0 });
  }
  // planned route
  ctx2d.strokeStyle = 'rgba(142,48,48,0.95)';
  ctx2d.lineWidth = 3.5;
  ctx2d.setLineDash([12, 8]);
  ctx2d.beginPath();
  ctx2d.moveTo(W * 0.12, H * 0.78);
  ctx2d.lineTo(W * 0.4, H * 0.6);
  ctx2d.lineTo(W * 0.62, H * 0.64);
  ctx2d.lineTo(W * 0.88, H * 0.34);
  ctx2d.stroke();
  ctx2d.setLineDash([]);
  for (const [px, py] of [[0.12, 0.78], [0.4, 0.6], [0.62, 0.64], [0.88, 0.34]]) {
    ctx2d.strokeStyle = 'rgba(142,48,48,0.95)';
    ctx2d.lineWidth = 2.5;
    ctx2d.beginPath(); ctx2d.arc(W * px, H * py, 7, 0, 7); ctx2d.stroke();
    ctx2d.beginPath(); ctx2d.arc(W * px, H * py, 2, 0, 7); ctx2d.stroke();
  }
  stencilText(ctx2d, 'TRENCH SURVEY 7 — LEG 3', W * 0.5, H * 0.06, { size: H * 0.05, color: 'rgba(45,45,50,0.9)', spacing: 2 });
  // coffee ring + pencil marks (lived-in)
  ctx2d.strokeStyle = 'rgba(90,60,30,0.28)';
  ctx2d.lineWidth = 4;
  ctx2d.beginPath(); ctx2d.arc(W * 0.72, H * 0.82, 26, 0, 7); ctx2d.stroke();
  ctx2d.font = `italic ${H * 0.034}px "DejaVu Sans", sans-serif`;
  ctx2d.fillStyle = 'rgba(50,50,60,0.7)';
  ctx2d.fillText('chk current 04:00', W * 0.44, H * 0.5);
  ctx2d.fillText('dtg 12 nm', W * 0.7, H * 0.44);
}

// flat compass repeater card (viewed from above through the dome)
function paintCompassCard(size = 128) {
  const c = makeCanvas(size, size);
  const ctx2d = c.getContext('2d');
  fillBase(ctx2d, '#14170f');
  const cx = size / 2, cy = size / 2, r = size * 0.47;
  const hdg = 84; // matches nav panel heading
  ctx2d.strokeStyle = 'rgba(214,218,204,0.9)';
  for (let d = 0; d < 360; d += 10) {
    const a = ((d - hdg - 90) * Math.PI) / 180;
    const big = d % 30 === 0;
    ctx2d.lineWidth = big ? 2.2 : 1.1;
    ctx2d.beginPath();
    ctx2d.moveTo(cx + Math.cos(a) * r * (big ? 0.78 : 0.86), cy + Math.sin(a) * r * (big ? 0.78 : 0.86));
    ctx2d.lineTo(cx + Math.cos(a) * r * 0.97, cy + Math.sin(a) * r * 0.97);
    ctx2d.stroke();
  }
  ctx2d.font = `bold ${size * 0.14}px "DejaVu Sans", sans-serif`;
  ctx2d.textAlign = 'center'; ctx2d.textBaseline = 'middle';
  for (const [d, ch] of [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W']]) {
    const a = ((d - hdg - 90) * Math.PI) / 180;
    ctx2d.fillStyle = ch === 'N' ? 'rgba(216,160,76,0.95)' : 'rgba(214,218,204,0.85)';
    ctx2d.fillText(ch, cx + Math.cos(a) * r * 0.58, cy + Math.sin(a) * r * 0.58);
  }
  // lubber line at canvas top (bow direction)
  ctx2d.strokeStyle = 'rgba(216,160,76,0.95)';
  ctx2d.lineWidth = 2.6;
  ctx2d.beginPath(); ctx2d.moveTo(cx, cy - r); ctx2d.lineTo(cx, cy - r * 0.7); ctx2d.stroke();
  // center marker
  ctx2d.fillStyle = 'rgba(121,201,141,0.9)';
  ctx2d.beginPath(); ctx2d.arc(cx, cy, size * 0.02, 0, 7); ctx2d.fill();
  return c;
}

// engraved console strip with labels + painted switch positions
function consoleStripCanvas(labels, w = 1024, h = 128) {
  const c = makeCanvas(w, h);
  const ctx2d = c.getContext('2d');
  fillBase(ctx2d, '#6d736c');
  mottle(ctx2d, 'strip' + labels[0], { cells: 8, octaves: 2, amount: 0.06 });
  const n = labels.length;
  for (let i = 0; i < n; i++) {
    const x = ((i + 0.5) / n) * w;
    ctx2d.strokeStyle = 'rgba(30,32,28,0.6)';
    ctx2d.lineWidth = 2;
    ctx2d.strokeRect((i / n) * w + 6, 8, w / n - 12, h - 16);
    stencilText(ctx2d, labels[i], x, h * 0.82, { size: h * 0.17, color: 'rgba(222,225,214,0.9)', spacing: 1 });
  }
  speckle(ctx2d, 'stripwear' + labels[0], { count: 160, colors: ['rgba(20,20,18,0.2)'], size: 1.4 });
  return c;
}

// ---------------------------------------------------------------------------
// 3D helpers
// ---------------------------------------------------------------------------

function toggleSwitch(on = true) {
  const g = new THREE.Group();
  g.userData.static = true;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.012, 10), M.bakelite());
  g.add(base);
  const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.007, 0.035, 8), M.chrome());
  lever.position.y = 0.017;
  lever.rotation.x = on ? -0.5 : 0.5;
  lever.position.z = on ? -0.008 : 0.008;
  g.add(lever);
  return g;
}

function switchBank(cols, rows, seed) {
  const g = new THREE.Group();
  g.userData.static = true;
  const rng = makeRng(seed);
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const sw = toggleSwitch(rng() > 0.35);
      sw.position.set((i - (cols - 1) / 2) * 0.055, 0, (j - (rows - 1) / 2) * 0.055);
      g.add(sw);
    }
  }
  return g;
}

// small U-shaped guard bracket over a toggle switch (posts along z)
function toggleGuard() {
  const g = new THREE.Group();
  g.userData.static = true;
  const postGeo = new THREE.CylinderGeometry(0.0035, 0.0035, 0.048, 6);
  for (const s of [-1, 1]) {
    const post = new THREE.Mesh(postGeo, M.bareSteel());
    post.position.set(0, 0.024, s * 0.021);
    g.add(post);
  }
  const bar = new THREE.Mesh(new THREE.TorusGeometry(0.021, 0.0035, 5, 10, Math.PI), M.bareSteel());
  bar.rotation.y = Math.PI / 2;
  bar.position.y = 0.048;
  g.add(bar);
  return g;
}

// small colored indicator lamp (dome + steel collar)
function indicatorLamp(colorHex, intensity = 1.4) {
  const g = new THREE.Group();
  g.userData.static = true;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.008, 10), M.bareSteel());
  g.add(collar);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 8, 6), M.instrumentLampMaterial(colorHex, intensity));
  dome.position.y = 0.007;
  g.add(dome);
  return g;
}

// coiled handset cord between two world points
function coiledCord(a, b, { coils = 9, r = 0.016, tubeR = 0.0045, sag = 0.05, mat = null } = {}) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const dir = B.clone().sub(A).normalize();
  let u = new THREE.Vector3(0, 1, 0).cross(dir);
  if (u.lengthSq() < 0.01) u = new THREE.Vector3(1, 0, 0).cross(dir);
  u.normalize();
  const v = dir.clone().cross(u).normalize();
  const pts = [];
  const n = coils * 10;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = A.clone().lerp(B, t);
    p.y -= Math.sin(t * Math.PI) * sag;
    const ang = t * coils * Math.PI * 2;
    p.add(u.clone().multiplyScalar(Math.cos(ang) * r)).add(v.clone().multiplyScalar(Math.sin(ang) * r));
    pts.push(p);
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, n * 2, tubeR, 5, false), mat || M.plasticBlack());
  mesh.userData.static = true;
  return mesh;
}

// place an instanced bolt using a group-local position/normal (world computed)
const _bp = new THREE.Vector3();
const _bn = new THREE.Vector3();
function boltLocal(group, x, y, z, nx, ny, nz, size = 'S') {
  group.updateWorldMatrix(true, false);
  _bp.set(x, y, z).applyMatrix4(group.matrixWorld);
  _bn.set(nx, ny, nz).transformDirection(group.matrixWorld);
  K.addBolt(_bp, _bn, size);
}

function seat(seed = 'seat') {
  const g = new THREE.Group();
  g.userData.static = true;
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.36, 10), M.darkSteel());
  column.position.y = 0.18;
  g.add(column);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.03, 14), M.darkSteel());
  base.position.y = 0.015;
  g.add(base);
  const cushion = new THREE.Mesh(K.roundedBox(0.4, 0.08, 0.38, 0.03), M.vinylSeat());
  cushion.position.y = 0.4;
  cushion.castShadow = true;
  g.add(cushion);
  const back = new THREE.Mesh(K.roundedBox(0.38, 0.34, 0.06, 0.025), M.vinylSeat());
  back.position.set(0, 0.6, 0.19);
  back.rotation.x = 0.12;
  back.castShadow = true;
  g.add(back);
  const footring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.012, 6, 16), M.bareSteel());
  footring.rotation.x = Math.PI / 2;
  footring.position.y = 0.12;
  g.add(footring);
  return g;
}

// ---------------------------------------------------------------------------

export function build(ctx) {
  const g = new THREE.Group();
  g.name = 'controlRoom';
  const C = ctx.collision;

  // ======================= forward console under viewport ===================
  const fc = new THREE.Group();
  // main body: angled console from x -1.15..1.15
  const bodyGeo = K.roundedBox(2.3, 0.78, 0.62, 0.02);
  const body = new THREE.Mesh(bodyGeo, M.consoleGray());
  body.position.set(0, 0.39, 0.98);
  body.castShadow = true; body.receiveShadow = true;
  fc.add(body);
  // sloped instrument face
  const slopeGeo = K.roundedBox(2.26, 0.5, 0.06, 0.015);
  const slope = new THREE.Mesh(slopeGeo, M.consoleGray());
  slope.position.set(0, 0.98, 0.87);
  slope.rotation.x = -0.42;
  fc.add(slope);
  // dark bezel panels behind the gauge clusters + nav display (breaks monotone)
  const slopeN = new THREE.Vector3(0, Math.sin(0.42), Math.cos(0.42)); // slope face normal
  const bezelOff = slopeN.clone().multiplyScalar(-0.018);
  for (const bx of [-0.66, 0.66]) {
    const clusterBezel = new THREE.Mesh(K.roundedBox(0.78, 0.34, 0.014, 0.01), M.gunmetal());
    clusterBezel.position.set(bx + bezelOff.x, 1.06 + bezelOff.y, 0.895 + bezelOff.z);
    clusterBezel.rotation.x = -0.42;
    fc.add(clusterBezel);
    // bezel corner screws
    for (const [sx, sy] of [[-0.36, -0.14], [0.36, -0.14], [-0.36, 0.14], [0.36, 0.14]]) {
      K.addBolt(
        new THREE.Vector3(bx + sx, 1.06 + sy * Math.cos(0.42), 0.895 + sy * Math.sin(0.42)).add(slopeN.clone().multiplyScalar(-0.009)),
        slopeN, 'S');
    }
  }
  const navBezel = new THREE.Mesh(K.roundedBox(0.5, 0.28, 0.014, 0.01), M.bakelite());
  navBezel.position.set(bezelOff.x, 1.06 + bezelOff.y, 0.895 + bezelOff.z);
  navBezel.rotation.x = -0.42;
  fc.add(navBezel);
  // gauges row on sloped face
  const gaugeDefs = [
    { x: -0.94, label: 'BALLAST', max: 10, value: 0.42 },
    { x: -0.66, label: 'TRIM', max: 30, value: 0.5 },
    { x: -0.38, label: 'DEPTH', max: 400, value: 0.53, r: 0.085 },
    { x: 0.38, label: 'BAR', max: 25, value: 0.35, r: 0.085 },
    { x: 0.66, label: 'AMP', max: 600, value: 0.55 },
    { x: 0.94, label: 'VOLT', max: 300, value: 0.76 },
  ];
  for (const gd of gaugeDefs) {
    const gg = K.gauge({ r: gd.r || 0.065, label: gd.label, max: gd.max, value: gd.value });
    gg.position.set(gd.x, 1.06, 0.895);
    gg.rotation.x = -0.42;
    fc.add(gg);
  }
  // center nav digital panel between gauge groups
  const navCanvas = makeCanvas(512, 256);
  const navMat = M.displayMaterial(navCanvas, { intensity: 0.85 });
  navMat.userData.noMerge = true;
  const navDisp = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.21), navMat);
  navDisp.position.set(0, 1.06, 0.9);
  navDisp.rotation.x = -0.42;
  fc.add(navDisp);
  // switch strips on desk
  const stripTex = canvasTexture(consoleStripCanvas(['BLST 1', 'BLST 2', 'TRIM F', 'TRIM A', 'LIGHTS', 'VENT', 'PUMP', 'COMMS']), { srgb: true, wrap: false });
  const stripMat = new THREE.MeshStandardMaterial({ map: stripTex, roughness: 0.55, metalness: 0.2, envMapIntensity: 0.5 });
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.21), stripMat);
  strip.rotation.x = -Math.PI / 2 + 0.06;
  strip.position.set(0, 0.795, 1.12);
  fc.add(strip);
  const bank = switchBank(8, 1, 'fc-switches');
  bank.position.set(0, 0.815, 1.06);
  fc.add(bank);
  // guarded critical switches at both ends of the bank
  for (const gx of [-0.1925, 0.1925]) {
    const guard = toggleGuard();
    guard.position.set(gx, 0.815, 1.06);
    fc.add(guard);
  }
  // indicator lamp strip on the desk in front of the switch bank
  {
    const lampBase = new THREE.Mesh(K.roundedBox(1.0, 0.018, 0.05, 0.006), M.gunmetal());
    lampBase.position.set(0, 0.789, 1.0);
    fc.add(lampBase);
    const rngLamp = makeRng('fc-lamps');
    const lampCols = ['#79c98d', '#79c98d', '#d8a04c', '#79c98d', '#8e3030', '#d8a04c', '#79c98d', '#79c98d'];
    for (let i = 0; i < 8; i++) {
      const col = lampCols[Math.floor(rngLamp() * lampCols.length) % lampCols.length];
      const lamp = indicatorLamp(col, 1.4);
      lamp.position.set(-0.42 + i * 0.12, 0.8, 1.0);
      fc.add(lamp);
    }
  }
  // aft (room-facing) face of the console body: strip plate, station label, kick
  {
    const backStripTex = canvasTexture(consoleStripCanvas(['O2 GEN', 'CO2 SCRUB', 'HYD 1', 'HYD 2'], 512, 96), { srgb: true, wrap: false });
    const backStrip = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.15),
      new THREE.MeshStandardMaterial({ map: backStripTex, roughness: 0.55, metalness: 0.2, envMapIntensity: 0.5 }));
    backStrip.position.set(-0.6, 0.52, 1.292);
    fc.add(backStrip);
    const staLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.07),
      M.labelMaterial('HELM STA NO.1', { w: 256, h: 56, size: 24 }));
    staLabel.position.set(0.6, 0.56, 1.292);
    fc.add(staLabel);
    for (const s of [-1, 1]) {
      const lamp = indicatorLamp(s < 0 ? '#79c98d' : '#d8a04c', 1.3);
      lamp.rotation.x = Math.PI / 2;
      lamp.position.set(s * 0.92, 0.6, 1.292);
      fc.add(lamp);
    }
    const kick = new THREE.Mesh(K.roundedBox(2.24, 0.11, 0.012, 0.005), M.rubberMat());
    kick.position.set(0, 0.065, 1.292);
    fc.add(kick);
    // access panel screws along the aft face top edge
    for (const bx of [-1.02, -0.34, 0.34, 1.02]) {
      K.addBolt(new THREE.Vector3(bx, 0.73, 1.291), new THREE.Vector3(0, 0, 1), 'S');
    }
  }
  // helm yoke on pedestal
  const yokeCol = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.5, 12), M.gunmetal());
  yokeCol.position.set(0, 0.55, 1.42);
  yokeCol.rotation.x = 0.3;
  fc.add(yokeCol);
  const yoke = new THREE.Group();
  const yokeRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 10, 24, Math.PI * 1.35), M.bakelite());
  yokeRing.rotation.z = Math.PI * 0.83;
  yoke.add(yokeRing);
  const yokeBar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 8), M.bakelite());
  yokeBar.rotation.z = Math.PI / 2;
  yoke.add(yokeBar);
  yoke.position.set(0, 0.85, 1.32);
  yoke.rotation.x = -0.35;
  fc.add(yoke);
  // trim wheels beside helm
  for (const s of [-1, 1]) {
    const tw = K.valveWheel(0.09, M.bakelite());
    tw.rotation.y = Math.PI / 2;
    tw.position.set(s * 0.33, 0.8, 1.3);
    fc.add(tw);
  }
  // compass repeater dome on the desk, starboard of the yoke
  {
    const comp = new THREE.Group();
    comp.userData.static = true;
    comp.position.set(0.5, 0.78, 1.12);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.054, 0.05, 14), M.gunmetal());
    ped.position.y = 0.025;
    comp.add(ped);
    const cardMat = new THREE.MeshStandardMaterial({
      map: canvasTexture(paintCompassCard(128), { srgb: true, wrap: false }),
      roughness: 0.5, metalness: 0,
      emissive: 0xffffff, emissiveIntensity: 0.22,
      emissiveMap: canvasTexture(paintCompassCard(128), { srgb: true, wrap: false }),
      envMapIntensity: 0.3,
    });
    const card = new THREE.Mesh(new THREE.CircleGeometry(0.05, 22), cardMat);
    card.rotation.x = -Math.PI / 2;
    card.position.y = 0.0515;
    comp.add(card);
    const bezelRing = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.007, 8, 22), M.brass());
    bezelRing.rotation.x = Math.PI / 2;
    bezelRing.position.y = 0.052;
    comp.add(bezelRing);
    const lubber = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.012, 0.02), M.functionalRedPaint());
    lubber.position.set(0, 0.055, -0.048);
    comp.add(lubber);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.058, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.glassInstrument());
    dome.position.y = 0.05;
    dome.userData.noRaycast = true;
    comp.add(dome);
    fc.add(comp);
  }
  g.add(fc);
  C.addBox([-1.16, 0, 0.5], [1.16, 1.15, 1.32], { name: 'fwd-console' });

  // rudder / plane angle indicator cluster hung from the overhead band,
  // directly above the helm yoke (kept above the viewport sight line)
  {
    const cluster = new THREE.Group();
    cluster.userData.static = true;
    cluster.position.set(0, 1.72, 0.93);
    const box = new THREE.Mesh(K.roundedBox(0.64, 0.2, 0.1, 0.012), M.gunmetal());
    cluster.add(box);
    const defs = [
      { x: -0.21, label: 'RUDDER', max: 35, value: 0.5 },
      { x: 0, label: 'PLN FWD', max: 25, value: 0.48 },
      { x: 0.21, label: 'PLN AFT', max: 25, value: 0.52 },
    ];
    for (const d of defs) {
      const gg = K.gauge({ r: 0.054, label: d.label, max: d.max, value: d.value, unit: 'DEG' });
      gg.position.set(d.x, 0, 0.055);
      cluster.add(gg);
    }
    // hanger straps up to the overhead panel band
    for (const s of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.12, 0.014), M.bareSteel());
      strap.position.set(s * 0.24, 0.155, 0.002);
      cluster.add(strap);
    }
    g.add(cluster);
    K.addBolt(new THREE.Vector3(-0.24, 1.9, 0.94), new THREE.Vector3(0, 0, 1), 'S');
    K.addBolt(new THREE.Vector3(0.24, 1.9, 0.94), new THREE.Vector3(0, 0, 1), 'S');
  }

  // helm seat
  const helmSeat = seat('helm');
  helmSeat.position.set(0, 0, 1.95);
  g.add(helmSeat);
  C.addBox([-0.22, 0, 1.75], [0.22, 0.75, 2.16], { name: 'helm-seat' });

  // ======================= sonar station (port) =============================
  const sonar = new THREE.Group();
  sonar.position.set(-1.02, 0, 3.1);
  sonar.rotation.y = Math.PI / 2 * 0.94; // faces starboard (into room)
  // desk
  const desk = new THREE.Mesh(K.roundedBox(1.3, 0.75, 0.55, 0.02), M.consoleGray());
  desk.position.y = 0.375;
  desk.castShadow = true;
  sonar.add(desk);
  // upper bay with CRT hood
  const bay = new THREE.Mesh(K.roundedBox(1.3, 0.85, 0.42, 0.02), M.consoleGray());
  bay.position.set(0, 1.2, -0.06);
  bay.castShadow = true;
  sonar.add(bay);
  // recessed dark instrument panel behind the displays
  const sonarPanel = new THREE.Mesh(K.roundedBox(0.92, 0.62, 0.016, 0.01), M.gunmetal());
  sonarPanel.position.set(-0.14, 1.22, 0.148);
  sonar.add(sonarPanel);
  for (const [px, py] of [[-0.57, 0.92], [0.29, 0.92], [-0.57, 1.51], [0.29, 1.51]]) {
    boltLocal(sonar, px, py, 0.157, 0, 0, 1, 'S');
  }
  // round PPI display with hood
  const ppiCanvas = makeCanvas(256, 256);
  const ppiMat = M.displayMaterial(ppiCanvas, { intensity: 1.0 });
  ppiMat.userData.noMerge = true;
  const ppi = new THREE.Mesh(new THREE.CircleGeometry(0.17, 28), ppiMat);
  ppi.position.set(-0.28, 1.22, 0.163);
  sonar.add(ppi);
  const ppiBezel = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.02, 8, 28), M.bakelite());
  ppiBezel.position.copy(ppi.position);
  sonar.add(ppiBezel);
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.16, 20, 1, true, Math.PI * 0.9, Math.PI * 1.2), M.gunmetal());
  hood.rotation.x = Math.PI / 2;
  hood.rotation.y = Math.PI;
  hood.position.set(-0.28, 1.27, 0.2);
  hood.material.side = THREE.DoubleSide;
  sonar.add(hood);
  // hood front rim so it reads as rolled sheet metal, not a floating ribbon
  const hoodRim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.007, 6, 20, Math.PI * 1.2), M.gunmetal());
  hoodRim.position.set(-0.28, 1.27, 0.28);
  hoodRim.rotation.z = Math.PI * 0.9 + Math.PI / 2;
  sonar.add(hoodRim);
  // waterfall display
  const wfCanvas = makeCanvas(128, 192);
  const wfMat = M.displayMaterial(wfCanvas, { intensity: 0.9 });
  wfMat.userData.noMerge = true;
  const wf = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.28), wfMat);
  wf.position.set(0.12, 1.22, 0.164);
  sonar.add(wf);
  const wfFrame = new THREE.Mesh(K.roundedBox(0.23, 0.32, 0.02, 0.008), M.bakelite());
  wfFrame.position.set(0.12, 1.22, 0.152);
  sonar.add(wfFrame);
  // status lamp column on the dark panel
  {
    const cols = ['#79c98d', '#d8a04c', '#8e3030'];
    for (let i = 0; i < 3; i++) {
      const lamp = indicatorLamp(cols[i], 1.4);
      lamp.rotation.x = Math.PI / 2;
      lamp.position.set(0.27, 1.485 - i * 0.048, 0.158);
      sonar.add(lamp);
    }
    const lampLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.028),
      M.labelMaterial('XMIT', { w: 96, h: 28, size: 15 }));
    lampLabel.position.set(0.27, 1.545, 0.154);
    sonar.add(lampLabel);
  }
  // gain knobs column
  for (let i = 0; i < 3; i++) {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.025, 12), M.bakelite());
    knob.rotation.x = Math.PI / 2;
    knob.position.set(0.42, 1.06 + i * 0.14, 0.168);
    sonar.add(knob);
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.018, 0.004), M.whiteEnamel());
    mark.position.set(0.42, 1.075 + i * 0.14, 0.181);
    sonar.add(mark);
  }
  // engraved function labels under each knob
  {
    const knobNames = ['GAIN', 'RNG', 'TILT'];
    for (let i = 0; i < 3; i++) {
      const kl = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.022),
        M.labelMaterial(knobNames[i], { w: 96, h: 30, size: 17 }));
      kl.position.set(0.42, 1.018 + i * 0.14, 0.156);
      sonar.add(kl);
    }
  }
  // keypad strip on desk + ping button
  const keys = switchBank(5, 2, 'sonar-keys');
  keys.position.set(0.1, 0.77, 0.16);
  sonar.add(keys);
  for (const [gx, gz] of [[-0.01, 0.1325], [0.21, 0.1875]]) {
    const guard = toggleGuard();
    guard.position.set(gx, 0.77, gz);
    sonar.add(guard);
  }
  const pingBtnMat = M.instrumentLampMaterial('#79c98d', 0.9);
  const pingBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.02, 14), pingBtnMat);
  pingBtn.position.set(-0.3, 0.775, 0.18);
  sonar.add(pingBtn);
  const pingGuard = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.006, 6, 16), M.bareSteel());
  pingGuard.rotation.x = Math.PI / 2;
  pingGuard.position.set(-0.3, 0.785, 0.18);
  sonar.add(pingGuard);
  // operator headset resting on the desk, cord to a jack on the bay face
  {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.009, 6, 16, Math.PI), M.bakelite());
    band.rotation.x = -Math.PI / 2;
    band.position.set(-0.08, 0.765, 0.21);
    sonar.add(band);
    for (const s of [-1, 1]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.02, 12), M.bakelite());
      cup.position.set(-0.08 + s * 0.075, 0.762, 0.21);
      sonar.add(cup);
    }
    const jack = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.02, 8), M.bareSteel());
    jack.rotation.x = Math.PI / 2;
    jack.position.set(0.02, 0.82, 0.152);
    sonar.add(jack);
    sonar.add(K.cableRun([[-0.03, 0.762, 0.23], [0.0, 0.756, 0.19], [0.02, 0.815, 0.155]],
      { r: 0.0035, sag: 0.012, mat: M.rubberMat(), seed: 'headset-cord' }));
  }
  const sonarLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.06),
    M.labelMaterial('ACTIVE SONAR', { w: 256, h: 52, size: 26 }));
  sonarLabel.position.set(0, 1.68, 0.12);
  sonar.add(sonarLabel);
  // backing plate so the sign doesn't float above the bay
  const sonarLabelPlate = new THREE.Mesh(K.roundedBox(0.36, 0.09, 0.02, 0.008), M.gunmetal());
  sonarLabelPlate.position.set(0, 1.675, 0.105);
  sonar.add(sonarLabelPlate);

  // --- sonar back/outboard dressing (the aft end face seen from the room) ---
  {
    // service door on the bay end: proud panel with latches, vent and big label
    const door = new THREE.Mesh(K.roundedBox(0.34, 0.72, 0.018, 0.01), M.cabinetGray());
    door.rotation.y = -Math.PI / 2;
    door.position.set(-0.657, 1.2, -0.06);
    sonar.add(door);
    for (const [py, pz] of [[0.88, -0.2], [0.88, 0.08], [1.52, -0.2], [1.52, 0.08]]) {
      boltLocal(sonar, -0.668, py, pz, -1, 0, 0, 'S');
    }
    // quarter-turn latch handles
    for (const ly of [0.98, 1.42]) {
      const latch = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.07, 0.02), M.bareSteel());
      latch.rotation.x = 0.6;
      latch.position.set(-0.672, ly, 0.11);
      sonar.add(latch);
    }
    const bayVent = K.ventGrille(0.26, 0.18, { mat: M.cabinetGray() });
    bayVent.rotation.y = -Math.PI / 2;
    bayVent.position.set(-0.663, 0.98, -0.06);
    sonar.add(bayVent);
    const backLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.075),
      M.labelMaterial('SN-2 XCVR', { w: 256, h: 60, size: 30 }));
    backLabel.rotation.y = -Math.PI / 2;
    backLabel.position.set(-0.669, 1.36, -0.06);
    sonar.add(backLabel);
    // desk end: bolted access panel, data plate, second vent
    const access = new THREE.Mesh(K.roundedBox(0.34, 0.36, 0.016, 0.01), M.darkSteel());
    access.rotation.y = -Math.PI / 2;
    access.position.set(-0.653, 0.33, 0.06);
    sonar.add(access);
    for (const [py, pz] of [[0.18, -0.08], [0.18, 0.2], [0.48, -0.08], [0.48, 0.2]]) {
      boltLocal(sonar, -0.662, py, pz, -1, 0, 0, 'S');
    }
    const deskVent = K.ventGrille(0.2, 0.12, { mat: M.cabinetGray() });
    deskVent.rotation.y = -Math.PI / 2;
    deskVent.position.set(-0.655, 0.6, -0.16);
    sonar.add(deskVent);
    const accLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.05),
      M.labelMaterial('PROC UNIT 2', { w: 192, h: 44, size: 20 }));
    accLabel.rotation.y = -Math.PI / 2;
    accLabel.position.set(-0.662, 0.62, 0.06);
    sonar.add(accLabel);
    // cable entry gland on the bay top
    const gland = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.055, 10), M.bareSteel());
    gland.position.set(-0.5, 1.648, -0.15);
    sonar.add(gland);
    const glandNut = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.006, 6, 12), M.bareSteel());
    glandNut.rotation.x = Math.PI / 2;
    glandNut.position.set(-0.5, 1.632, -0.15);
    sonar.add(glandNut);
  }
  g.add(sonar);
  C.addBox([-1.48, 0, 2.4], [-0.68, 1.7, 3.86], { name: 'sonar-desk' });

  // sonar seat
  const sonarSeat = seat('sonar');
  sonarSeat.position.set(-0.4, 0, 3.1);
  sonarSeat.rotation.y = -Math.PI / 2;
  g.add(sonarSeat);
  C.addBox([-0.58, 0, 2.92], [-0.2, 0.7, 3.28], { name: 'sonar-seat' });

  // ======================= chart / nav station (starboard) ==================
  const nav = new THREE.Group();
  nav.position.set(1.04, 0, 3.0);
  nav.rotation.y = -Math.PI / 2 * 0.94;
  const table = new THREE.Mesh(K.roundedBox(1.35, 0.06, 0.72, 0.015), M.cabinetGreen());
  table.position.y = 0.86;
  table.castShadow = true;
  nav.add(table);
  // chart under glass
  const chartCanvas = makeCanvas(1024, 512);
  paintChart(chartCanvas.getContext('2d'));
  const chartMat = new THREE.MeshStandardMaterial({
    map: canvasTexture(chartCanvas, { srgb: true, wrap: false }), roughness: 0.7, metalness: 0, envMapIntensity: 0.4,
  });
  // NOTE: roundedBox bevel expands the slab; tabletop's real top is ~y 0.905
  const chart = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 0.6), chartMat);
  chart.rotation.x = -Math.PI / 2;
  chart.position.y = 0.907;
  nav.add(chart);
  // low-gloss cover glass (instrument glass whites the chart out from above)
  const chartGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.62), M.glassThick());
  chartGlass.rotation.x = -Math.PI / 2;
  chartGlass.position.y = 0.9085;
  chartGlass.userData.noRaycast = true;
  nav.add(chartGlass);
  // glass hold-down clips
  for (const [cx, cz] of [[-0.56, -0.26], [0.56, -0.26], [-0.56, 0.26], [0.56, 0.26]]) {
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.035), M.bareSteel());
    clip.position.set(cx, 0.91, cz);
    nav.add(clip);
    boltLocal(nav, cx, 0.917, cz, 0, 1, 0, 'S');
  }
  // table legs / cabinet
  const under = new THREE.Mesh(K.roundedBox(1.25, 0.8, 0.6, 0.015), M.cabinetGreen());
  under.position.y = 0.42;
  nav.add(under);
  // drawer fronts with handles on the room-facing side
  {
    const rngD = makeRng('nav-drawers');
    for (let col = 0; col < 2; col++) {
      for (let row = 0; row < 2; row++) {
        const front = new THREE.Mesh(K.roundedBox(0.52, 0.24, 0.02, 0.008), M.cabinetGreen());
        front.position.set(-0.29 + col * 0.58, 0.6 - row * 0.28, 0.308);
        nav.add(front);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.018, 0.022), M.bareSteel());
        handle.position.set(-0.29 + col * 0.58, 0.6 - row * 0.28 + 0.055, 0.328);
        nav.add(handle);
        for (const s of [-1, 1]) {
          const hFoot = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.016, 0.02), M.bareSteel());
          hFoot.position.set(-0.29 + col * 0.58 + s * 0.09, 0.6 - row * 0.28 + 0.055, 0.318);
          nav.add(hFoot);
        }
        // slightly ajar bottom-right drawer (lived-in)
        if (col === 1 && row === 1) front.position.z += 0.02 + rngD() * 0.008;
      }
    }
    const drawerLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.045),
      M.labelMaterial('CHARTS 12-18', { w: 160, h: 44, size: 17 }));
    drawerLabel.position.set(-0.29, 0.665, 0.322);
    nav.add(drawerLabel);
    // rubber kick strip at the cabinet base
    const kick = new THREE.Mesh(K.roundedBox(1.2, 0.1, 0.012, 0.005), M.rubberMat());
    kick.position.set(0, 0.07, 0.306);
    nav.add(kick);
  }
  // chart tube rack + binder shelf on the aft end of the table
  {
    const stow = new THREE.Group();
    stow.userData.static = true;
    // vertical chart tubes leaning in a rail rack
    const rngT = makeRng('chart-tubes');
    const tubeMats = [M.cabinetCream(), M.safetyOrangePaint(), M.machineBlue()];
    for (let i = 0; i < 3; i++) {
      const tube = new THREE.Group();
      tube.userData.static = true;
      const bodyT = new THREE.Mesh(new THREE.CylinderGeometry(0.051, 0.051, 0.74, 14), tubeMats[i]);
      bodyT.position.y = 0.37;
      tube.add(bodyT);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.054, 0.04, 14), M.darkSteel());
      cap.position.y = 0.75;
      tube.add(cap);
      const capRim = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.005, 6, 14), M.darkSteel());
      capRim.rotation.x = Math.PI / 2;
      capRim.position.y = 0.728;
      tube.add(capRim);
      tube.position.set(0.72, 0.02, -0.17 + i * 0.155);
      tube.rotation.x = rngT.range(-0.02, 0.02);
      tube.rotation.z = 0.03 + rngT.range(0, 0.025);
      stow.add(tube);
    }
    // two retaining rails + brackets into the table end
    for (const ry of [0.42, 0.78]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 8), M.bareSteel());
      rail.rotation.x = Math.PI / 2;
      rail.position.set(0.775, ry, 0.06);
      stow.add(rail);
      for (const rz of [-0.19, 0.31]) {
        const br = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.016), M.bareSteel());
        br.position.set(0.71, ry, rz);
        stow.add(br);
        boltLocal(nav, 0.655, ry, rz, 1, 0, 0, 'S');
      }
    }
    // binder shelf below the tubes
    const shelf = new THREE.Mesh(K.roundedBox(0.3, 0.02, 0.52, 0.008), M.cabinetGreen());
    shelf.position.set(0.72, 0.16, 0.08);
    stow.add(shelf);
    for (const bz of [-0.13, 0.29]) {
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.016), M.darkSteel());
      bracket.rotation.z = -0.5;
      bracket.position.set(0.66, 0.1, bz);
      stow.add(bracket);
    }
    const rngB = makeRng('nav-binders');
    const binderMats = [M.machineBlue(), M.functionalRedPaint(), M.cabinetCream(), M.gunmetal(), M.machineBlue()];
    for (let i = 0; i < 5; i++) {
      const binder = new THREE.Mesh(K.roundedBox(0.17, 0.235, 0.048, 0.008), binderMats[i]);
      binder.position.set(0.71, 0.29, -0.15 + i * 0.058);
      binder.rotation.y = rngB.range(-0.03, 0.03);
      if (i === 4) { binder.rotation.x = 0.16; binder.position.z += 0.025; binder.position.y -= 0.008; }
      stow.add(binder);
    }
    const binderLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.036, 0.11),
      M.labelMaterial('LOG 3', { w: 40, h: 120, size: 15 }));
    binderLabel.rotation.y = Math.PI / 2;
    binderLabel.position.set(0.797, 0.29, -0.092);
    stow.add(binderLabel);
    nav.add(stow);
  }
  // chart lamp on stalk
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 8), M.darkSteel());
  stalk.position.set(-0.52, 1.1, -0.22);
  stalk.rotation.z = 0.5;
  nav.add(stalk);
  const lampHead = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.075, 0.09, 14, 1, true), M.darkSteel());
  lampHead.position.set(-0.38, 1.26, -0.22);
  lampHead.rotation.z = 2.4;
  lampHead.material.side = THREE.DoubleSide;
  nav.add(lampHead);
  const lampGlow = new THREE.Mesh(new THREE.CircleGeometry(0.045, 12), M.instrumentLampMaterial('#ffd9a3', 2.4));
  lampGlow.position.set(-0.35, 1.23, -0.22);
  lampGlow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0.38, -0.36, 0.24).normalize());
  nav.add(lampGlow);
  // practical reading light so the chart pops from standing height
  const chartLight = new THREE.PointLight(0xffd9a3, 1.7, 1.25, 2);
  chartLight.position.set(-0.3, 1.16, -0.18);
  nav.add(chartLight);
  ctx.lights.register({ light: chartLight, role: 'reading' });
  // dividers + pencil props
  const divider = new THREE.Group();
  for (const a of [-0.06, 0.06]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.001, 0.14, 6), M.brass());
    leg.rotation.z = a;
    leg.position.x = a * 0.55;
    divider.add(leg);
  }
  divider.position.set(0.3, 0.93, 0.1);
  divider.rotation.z = Math.PI / 2 * 0.9;
  divider.rotation.y = 0.5;
  nav.add(divider);
  const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.16, 6), M.safetyOrangePaint());
  pencil.rotation.z = Math.PI / 2;
  pencil.rotation.y = 0.3;
  pencil.position.set(-0.2, 0.9135, 0.18);
  nav.add(pencil);
  // parallel ruler prop
  {
    const ruler = new THREE.Group();
    ruler.userData.static = true;
    for (const s of [0, 1]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.005, 0.028), M.plasticBeige());
      bar.position.set(0, 0.003, s * 0.04);
      ruler.add(bar);
    }
    for (const lx of [-0.08, 0.08]) {
      const link = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.004, 0.05), M.brass());
      link.position.set(lx, 0.008, 0.02);
      ruler.add(link);
    }
    ruler.position.set(0.18, 0.9065, -0.12);
    ruler.rotation.y = -0.4;
    nav.add(ruler);
  }
  g.add(nav);
  C.addBox([0.62, 0, 2.55], [1.5, 1.0, 3.45], { name: 'nav-table' });
  C.addBox([0.84, 0, 3.42], [1.42, 1.15, 3.92], { name: 'chart-stow' });

  // comms rack above chart table
  const comms = new THREE.Group();
  comms.position.set(1.28, 1.55, 3.0);
  comms.rotation.y = -Math.PI / 2 * 0.94;
  for (let i = 0; i < 2; i++) {
    const unit = new THREE.Mesh(K.roundedBox(0.5, 0.16, 0.3, 0.01), M.gunmetal());
    unit.position.set(-0.28 + i * 0.58, 0, 0);
    comms.add(unit);
    // radio dials
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 14), M.bakelite());
    dial.rotation.x = Math.PI / 2;
    dial.position.set(-0.42 + i * 0.58, 0, 0.16);
    comms.add(dial);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), M.instrumentLampMaterial(i ? '#d8a04c' : '#79c98d', 1.6));
    lamp.position.set(-0.2 + i * 0.58, 0.045, 0.155);
    comms.add(lamp);
  }
  // mounting shelf + support posts down to the chart table (no floating gear)
  {
    const shelf = new THREE.Mesh(K.roundedBox(1.24, 0.024, 0.34, 0.008), M.cabinetGray());
    shelf.position.set(0.01, -0.095, 0);
    comms.add(shelf);
    for (const s of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.2, 0.012), M.galvanized());
      strap.position.set(s * 0.58, 0.0, -0.165);
      strap.rotation.x = -0.3;
      comms.add(strap);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.57, 8), M.darkSteel());
      post.position.set(s * 0.45, -0.38, 0.06);
      comms.add(post);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 0.012, 8), M.darkSteel());
      foot.position.set(s * 0.45, -0.66, 0.06);
      comms.add(foot);
    }
    // vent on the aft-facing end of the starboard unit
    const endVent = K.ventGrille(0.12, 0.09, { mat: M.darkSteel() });
    endVent.rotation.y = Math.PI / 2;
    endVent.position.set(0.562, 0, 0.02);
    comms.add(endVent);
  }
  g.add(comms);
  // comms pigtail down to a junction box on the starboard wainscot
  {
    const jb2 = K.junctionBox(0.14, 0.18, 0.09, { label: 'JB-02', glands: 1 });
    jb2.position.set(1.47, 1.0, 3.85);
    jb2.rotation.y = -Math.PI / 2;
    g.add(jb2);
    g.add(K.cableRun([[1.33, 1.46, 3.55], [1.44, 1.24, 3.7], [1.47, 1.1, 3.84]],
      { r: 0.008, sag: 0.03, mat: M.plasticBlack(), seed: 'comms-pig' }));
  }

  // ======================= periscope-style optical column ====================
  const peri = new THREE.Group();
  peri.position.set(0.48, 0, 4.85);
  peri.rotation.y = 1.83; // trained toward port-aft so eyepieces read from the room
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.4, 18), M.bareSteel());
  col.position.y = 1.2;
  col.castShadow = true;
  peri.add(col);
  const headBox = new THREE.Mesh(K.roundedBox(0.34, 0.3, 0.26, 0.02), M.gunmetal());
  headBox.position.y = 1.42;
  headBox.castShadow = true;
  peri.add(headBox);
  // eyepieces with rubber cups
  for (const s of [-0.06, 0.06]) {
    const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.035, 0.09, 10), M.bakelite());
    eye.rotation.x = Math.PI / 2;
    eye.position.set(s, 1.38, -0.16);
    peri.add(eye);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.028, 0.032, 10), M.rubberMat());
    cup.rotation.x = Math.PI / 2;
    cup.position.set(s, 1.38, -0.215);
    peri.add(cup);
  }
  // brow pad between the eyepieces
  const brow = new THREE.Mesh(K.roundedBox(0.16, 0.04, 0.03, 0.012), M.rubberMat());
  brow.position.set(0, 1.44, -0.185);
  peri.add(brow);
  // training handles: port side deployed, starboard side folded up
  {
    for (const s of [-1, 1]) {
      const pivot = new THREE.Mesh(K.roundedBox(0.05, 0.06, 0.05, 0.012), M.gunmetal());
      pivot.position.set(s * 0.19, 1.34, 0);
      peri.add(pivot);
    }
    // deployed handle (local -X)
    const armA = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.22, 8), M.bareSteel());
    armA.rotation.z = 2.618;
    armA.position.set(-0.25, 1.245, 0);
    peri.add(armA);
    const gripA = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.13, 8), M.rubberMat());
    gripA.rotation.z = 2.618;
    gripA.position.set(-0.337, 1.093, 0);
    peri.add(gripA);
    // folded handle (local +X, flipped up against the head)
    const armB = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.2, 8), M.bareSteel());
    armB.rotation.z = -0.26;
    armB.position.set(0.222, 1.44, 0);
    peri.add(armB);
    const gripB = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.12, 8), M.rubberMat());
    gripB.rotation.z = -0.26;
    gripB.position.set(0.262, 1.59, 0);
    peri.add(gripB);
  }
  // rotating collar ring + bearing ring on the column
  {
    const collar = new THREE.Mesh(K.ringPlate(0.092, 0.128, 0.05, 24), M.gunmetal());
    collar.position.y = 1.64;
    peri.add(collar);
    const bearing = new THREE.Mesh(K.ringPlate(0.091, 0.112, 0.024, 24), M.brass());
    bearing.position.y = 1.71;
    peri.add(bearing);
    const rngC = makeRng('peri-collar');
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rngC.range(-0.05, 0.05);
      boltLocal(peri, Math.cos(a) * 0.11, 1.64, Math.sin(a) * 0.11, Math.cos(a), 0, Math.sin(a), 'S');
    }
    // lower hoist collar with lug
    const hoist = new THREE.Mesh(K.ringPlate(0.091, 0.115, 0.04, 24), M.darkSteel());
    hoist.position.y = 0.42;
    peri.add(hoist);
    const lug = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.02), M.darkSteel());
    lug.position.set(0.12, 0.42, 0);
    peri.add(lug);
  }
  const periBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.1, 16), M.gunmetal());
  periBase.position.y = 0.05;
  peri.add(periBase);
  // bolted floor ring plate under the column
  {
    const floorRing = new THREE.Mesh(K.ringPlate(0.13, 0.27, 0.016, 28), M.darkSteel());
    floorRing.position.y = 0.008;
    peri.add(floorRing);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.26;
      boltLocal(peri, Math.cos(a) * 0.21, 0.017, Math.sin(a) * 0.21, 0, 1, 0, 'M');
    }
  }
  g.add(peri);
  C.addBox([0.29, 0, 4.6], [0.7, 2.3, 5.2], { name: 'periscope' });

  // ======================= aft equipment racks ===============================
  const rack = new THREE.Group();
  rack.position.set(-1.08, 0, 4.6);
  rack.rotation.y = Math.PI / 2;
  const rackBody = new THREE.Mesh(K.roundedBox(0.9, 1.75, 0.5, 0.015), M.cabinetGray());
  rackBody.position.y = 0.875;
  rackBody.castShadow = true; rackBody.receiveShadow = true;
  rack.add(rackBody);
  // rack modules
  const rngRack = makeRng('rack-mods');
  for (let i = 0; i < 6; i++) {
    const mh = 0.16 + rngRack() * 0.1;
    const mod = new THREE.Mesh(K.roundedBox(0.78, mh, 0.03, 0.008), i % 2 ? M.gunmetal() : M.darkSteel());
    mod.position.set(0, 0.28 + i * 0.24, 0.26);
    rack.add(mod);
    // rack screws (world coords: rack sits at (-1.08, 0, 4.6) rotated +90°)
    for (const sx of [-0.35, 0.35]) {
      K.addBolt(new THREE.Vector3(-1.08 + 0.285, 0.28 + i * 0.24, 4.6 - sx), new THREE.Vector3(1, 0, 0), 'S');
    }
    // module lamps
    if (rngRack() > 0.3) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6),
        M.instrumentLampMaterial(rngRack() > 0.5 ? '#79c98d' : '#d8a04c', 1.4));
      lamp.position.set(-0.28 + rngRack() * 0.5, 0.28 + i * 0.24, 0.285);
      rack.add(lamp);
    }
    // small vent rows
    const vent = K.ventGrille(0.2, 0.05, { mat: M.gunmetal() });
    vent.position.set(0.2, 0.28 + i * 0.24, 0.285);
    rack.add(vent);
  }
  // aft end face (faces the walkway to the hatch): vent, label, cable gland
  {
    const sideVent = K.ventGrille(0.26, 0.5, { mat: M.gunmetal() });
    sideVent.rotation.y = -Math.PI / 2;
    sideVent.position.set(-0.455, 0.82, 0);
    rack.add(sideVent);
    const rackLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.07),
      M.labelMaterial('EQPT BAY 2 · 24V DC', { w: 288, h: 56, size: 20 }));
    rackLabel.rotation.y = -Math.PI / 2;
    rackLabel.position.set(-0.462, 1.32, 0);
    rack.add(rackLabel);
    for (const [py, pz] of [[0.35, -0.18], [0.35, 0.18], [1.55, -0.18], [1.55, 0.18]]) {
      boltLocal(rack, -0.458, py, pz, -1, 0, 0, 'S');
    }
    // cable gland on top of the aft end
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.055, 8), M.bareSteel());
    gl.position.set(-0.36, 1.772, 0.1);
    rack.add(gl);
  }
  g.add(rack);
  C.addBox([-1.45, 0, 4.14], [-0.72, 1.8, 5.06], { name: 'aft-rack' });

  // ======================= aft bulkhead safety gear ==========================
  {
    const ext = K.extinguisher();
    ext.position.set(-0.78, 0.12, 5.7);
    ext.rotation.y = Math.PI;
    g.add(ext);
    // measured: 'DC STATION 1' @34px = 292px wide -> fits 384 with margins
    const dcSign = K.signPlate('DC STATION 1', 0.3, 0.09, { w: 384, h: 116, bg: '#8e3030', fg: '#d8d4c8', size: 34 });
    dcSign.position.set(-0.78, 0.98, 5.752);
    dcSign.rotation.y = Math.PI;
    g.add(dcSign);
    const dcSub = K.signPlate('HOSE + AXE IN CORR.', 0.3, 0.05, { w: 448, h: 76, size: 24 });
    dcSub.position.set(-0.78, 0.89, 5.752);
    dcSub.rotation.y = Math.PI;
    g.add(dcSub);
    C.addBox([-0.94, 0, 5.5], [-0.64, 0.75, 5.8], { name: 'extinguisher' });
  }

  // ======================= overhead panels ===================================
  const oh = new THREE.Group();
  // panel band above viewport
  const ohPanel = new THREE.Mesh(K.roundedBox(1.7, 0.34, 0.1, 0.015), M.consoleGray());
  ohPanel.position.set(0, 2.02, 0.85);
  ohPanel.rotation.x = 0.5;
  oh.add(ohPanel);
  const ohStripTex = canvasTexture(consoleStripCanvas(['MAST', 'PLANES', 'BLOW', 'VENT', 'O2', 'CO2', 'BUS A', 'BUS B'], 1024, 96), { srgb: true, wrap: false });
  const ohStrip = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.15), new THREE.MeshStandardMaterial({ map: ohStripTex, roughness: 0.55, metalness: 0.2, envMapIntensity: 0.5 }));
  ohStrip.position.set(0, 1.99, 0.914);
  ohStrip.rotation.x = 0.5;
  oh.add(ohStrip);
  const ohBank = switchBank(8, 1, 'oh-switches');
  ohBank.position.set(0, 2.085, 0.878);
  ohBank.rotation.x = 0.5 + Math.PI / 2;
  oh.add(ohBank);
  // overhead valve pair with labels
  for (const s of [-1, 1]) {
    const vv = K.valveAssembly(0.035, { wheelMat: s < 0 ? M.functionalRedPaint() : M.safetyOrangePaint() });
    vv.position.set(s * 1.05, 2.02, 1.5);
    vv.rotation.x = Math.PI;
    oh.add(vv);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.05),
      M.labelMaterial(s < 0 ? 'EMER BLOW' : 'MBT VENT', { w: 192, h: 48, size: 22 }));
    lab.position.set(s * 1.05, 1.83, 1.5);
    lab.rotation.x = -0.25;
    oh.add(lab);
  }
  g.add(oh);

  // ---- overhead crown, z 2.5..5.5: cable tray with console drops ------------
  {
    const tray = K.cableTray(2.9, { width: 0.16 });
    tray.position.set(-0.9, 2.1, 4.0);
    g.add(tray);
    // hanger rods to the hull crown
    for (const hz of [2.75, 4.0, 5.25]) {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.1, 6), M.galvanized());
      rod.position.set(-0.9, 2.16, hz);
      g.add(rod);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.012, 8), M.galvanized());
      pad.position.set(-0.9, 2.208, hz);
      g.add(pad);
    }
    // cables lying in the tray
    g.add(K.cableBundle([[-0.9, 2.09, 2.6], [-0.9, 2.09, 4.0], [-0.9, 2.09, 5.4]],
      { count: 3, r: 0.011, spread: 0.03, sag: 0.008, seed: 'tray-run' }));
    // drop into the sonar bay top
    g.add(K.cableBundle([[-0.9, 2.08, 2.72], [-1.0, 1.92, 2.74], [-1.09, 1.66, 2.76]],
      { count: 3, r: 0.009, spread: 0.015, sag: 0.05, seed: 'drop-sonar' }));
    // drop into the equipment rack top
    g.add(K.cableBundle([[-0.9, 2.08, 4.75], [-0.98, 1.95, 4.8], [-1.05, 1.78, 4.85]],
      { count: 3, r: 0.009, spread: 0.015, sag: 0.045, seed: 'drop-rack' }));
    // thick feeder into the sonar cable gland (world position of the gland top)
    sonar.updateWorldMatrix(true, false);
    const glandTop = new THREE.Vector3(-0.5, 1.71, -0.15).applyMatrix4(sonar.matrixWorld);
    g.add(K.cableRun([[-0.9, 2.07, 3.6], [-1.08, 1.9, glandTop.z + 0.02], [glandTop.x, glandTop.y, glandTop.z]],
      { r: 0.018, sag: 0.09, mat: M.rubberMat(), seed: 'sonar-feed' }));
  }

  // ---- overhead crown: intercom speaker + coiled-cord handset by the scope --
  {
    const ic = new THREE.Group();
    ic.userData.static = true;
    ic.position.set(0.14, 2.08, 4.42);
    ic.rotation.x = -0.55; // face down-aft
    const icBox = new THREE.Mesh(K.roundedBox(0.2, 0.14, 0.09, 0.012), M.cabinetCream());
    ic.add(icBox);
    const icGrille = K.ventGrille(0.1, 0.075, { mat: M.darkSteel() });
    icGrille.position.set(-0.03, 0, 0.046);
    ic.add(icGrille);
    const icLamp = indicatorLamp('#d8a04c', 1.5);
    icLamp.rotation.x = Math.PI / 2;
    icLamp.position.set(0.06, 0.03, 0.046);
    ic.add(icLamp);
    const icLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.03),
      M.labelMaterial('1MC', { w: 80, h: 36, size: 20 }));
    icLabel.position.set(0.06, -0.03, 0.047);
    ic.add(icLabel);
    g.add(ic);
    // crown mounting plate
    const icPlate = new THREE.Mesh(K.roundedBox(0.24, 0.016, 0.12, 0.006), M.galvanized());
    icPlate.position.set(0.14, 2.15, 4.44);
    icPlate.rotation.x = -0.12;
    g.add(icPlate);
    K.addBolt(new THREE.Vector3(0.05, 2.157, 4.4), new THREE.Vector3(0, 1, 0.15), 'S');
    K.addBolt(new THREE.Vector3(0.23, 2.157, 4.4), new THREE.Vector3(0, 1, 0.15), 'S');
    // handset hooked on the periscope column at head height
    const hs = new THREE.Group();
    hs.userData.static = true;
    hs.position.set(0.375, 1.68, 4.77);
    const hsHandle = new THREE.Mesh(K.roundedBox(0.03, 0.15, 0.028, 0.01), M.bakelite());
    hs.add(hsHandle);
    for (const s of [-1, 1]) {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.019, 0.024, 10), M.bakelite());
      cup.position.set(0, s * 0.085, 0.012);
      cup.rotation.x = -0.15;
      hs.add(cup);
    }
    hs.rotation.y = 1.9; // face outward from the column
    g.add(hs);
    // hook bracket from the column to the handset
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, 0.016), M.bareSteel());
    hook.position.set(0.42, 1.75, 4.79);
    hook.rotation.y = 0.5;
    g.add(hook);
    // coiled cord up to the speaker box
    g.add(coiledCord([0.375, 1.6, 4.77], [0.17, 2.03, 4.46], { coils: 12, r: 0.0105, tubeR: 0.004, sag: 0.035 }));
  }

  // cable drops from crown into consoles
  g.add(K.cableBundle([[-0.3, 2.3, 0.9], [-0.9, 2.1, 2.2], [-1.15, 1.75, 3.0]], { count: 3, sag: 0.06, seed: 'cr-cables-port' }));
  g.add(K.cableBundle([[0.3, 2.3, 0.9], [1.0, 2.05, 2.4], [1.28, 1.7, 3.0]], { count: 2, sag: 0.05, seed: 'cr-cables-stbd' }));
  const jb = K.junctionBox(0.2, 0.26, 0.1, { label: 'JB-01' });
  jb.position.set(-1.28, 1.7, 4.0);
  jb.rotation.y = Math.PI / 2;
  g.add(jb);

  // rubber mat down the center
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 3.8), M.rubberMat());
  mat.rotation.x = -Math.PI / 2;
  mat.position.set(0, 0.012, 3.3);
  mat.receiveShadow = true;
  mat.userData.static = true;
  g.add(mat);

  // handrails
  g.add(K.handrail([[-0.7, 2.12, 2.2], [-0.7, 2.12, 5.4]], { r: 0.017, stanchionEvery: 0, baseY: 3 }));
  g.add(K.handrail([[0.7, 2.12, 2.2], [0.7, 2.12, 5.4]], { r: 0.017, stanchionEvery: 0, baseY: 3 }));

  // ======================= lighting ==========================================
  const mkDome = (x, z, role = 'warm', color = 0xffd9a3, intensity = 6, shadow = false) => {
    const fixture = K.lampCage({ r: 0.07, color, intensity: role === 'red' ? 0 : 2.4 });
    fixture.position.set(x, 2.16, z);
    fixture.rotation.x = Math.PI;
    g.add(fixture);
    const light = new THREE.PointLight(color, intensity, 7, 2);
    light.position.set(x, 1.94, z);
    g.add(light);
    ctx.lights.register({ light, lampMats: [fixture.userData.lampMat], role });
    if (shadow) {
      // shadows come from a cheap single-face spot aimed down, not the point
      const spot = new THREE.SpotLight(color, intensity * 0.7, 6.5, 1.05, 0.65, 2);
      spot.position.set(x, 2.0, z);
      spot.target.position.set(x * 0.5, 0, z);
      spot.castShadow = true;
      spot.shadow.mapSize.set(512, 512);
      spot.shadow.bias = -0.004;
      g.add(spot, spot.target);
      ctx.lights.register({ light: spot, role });
    }
  };
  mkDome(0.4, 2.3, 'warm', 0xffd9a3, 5.5, true);
  mkDome(-0.4, 4.5, 'warm', 0xffd9a3, 5.0, false);
  mkDome(-0.85, 1.1, 'red', 0xb03a28, 2.6, false);
  mkDome(0.95, 4.9, 'red', 0xb03a28, 2.2, false);

  // cool spill straight through the viewport glass
  const spill = new THREE.SpotLight(0x6f97a8, 30, 14, 0.55, 0.5, 1.5);
  spill.position.set(0, 1.42, -2.6);
  spill.target.position.set(0, 0.85, 4.6);
  spill.castShadow = true;
  spill.shadow.mapSize.set(1024, 1024);
  spill.shadow.bias = -0.002;
  g.add(spill, spill.target);
  ctx.lights.register({ light: spill, role: 'cool' });

  // instrument glow fills
  const instA = new THREE.PointLight(0x79c98d, 0.9, 2.2, 2);
  instA.position.set(-1.0, 1.35, 3.1);
  g.add(instA);
  ctx.lights.register({ light: instA, role: 'instrument' });
  const instB = new THREE.PointLight(0xd8a04c, 0.8, 2.4, 2);
  instB.position.set(0, 1.25, 1.15);
  g.add(instB);
  ctx.lights.register({ light: instB, role: 'instrument' });

  // ======================= displays animation ================================
  let lastDraw = -1;
  let pingStart = -100;
  ctx.anim.add((t) => {
    if (t - lastDraw < 0.12 && Math.abs(t - lastDraw) < 4) return;
    lastDraw = t;
    paintSonarPPI(ppiCanvas.getContext('2d'), t, t - pingStart);
    paintWaterfall(wfCanvas.getContext('2d'), t);
    paintNavPanel(navCanvas.getContext('2d'), t);
    ppiMat.emissiveMap.needsUpdate = true;
    wfMat.emissiveMap.needsUpdate = true;
    navMat.emissiveMap.needsUpdate = true;
  });

  // ======================= sonar interaction =================================
  let audioCtx = null;
  function playPing() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(1150, audioCtx.currentTime);
      o.frequency.exponentialRampToValueAtTime(320, audioCtx.currentTime + 1.4);
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.22, audioCtx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 2.2);
      o.connect(gain).connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + 2.3);
    } catch (e) { /* audio unavailable (headless) */ }
  }
  let sonarBusy = false;
  ctx.interact.register({
    id: 'sonar',
    prompt: 'E: Active Sonar Ping',
    root: sonar,
    highlight: [pingBtn],
    onUse: () => {
      if (sonarBusy) return;
      sonarBusy = true;
      pingStart = ctx.time.simTime;
      playPing();
      ctx.hud.setStatus('Sonar pulse transmitted.');
      // brief instrument surge
      const baseA = instA.intensity;
      instA.intensity = baseA * 3;
      ctx.sched.after(0.9, () => { instA.intensity = baseA; });
      ctx.sched.after(2.4, () => { ctx.hud.setStatus('No immediate contact.'); });
      ctx.sched.after(2.9, () => { sonarBusy = false; });
    },
  });

  return g;
}
