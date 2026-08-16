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
  // bathymetric contours
  for (let c = 0; c < 9; c++) {
    ctx2d.strokeStyle = `rgba(70,90,110,${0.35 + c * 0.03})`;
    ctx2d.lineWidth = 1.4;
    ctx2d.beginPath();
    const yBase = H * (0.15 + c * 0.09);
    ctx2d.moveTo(0, yBase);
    for (let x = 0; x <= W; x += 20) {
      ctx2d.lineTo(x, yBase + Math.sin(x * 0.02 + c * 1.7) * 22 + rng.gauss() * 5);
    }
    ctx2d.stroke();
  }
  // grid
  ctx2d.strokeStyle = 'rgba(60,60,65,0.25)';
  ctx2d.lineWidth = 1;
  for (let x = 0; x < W; x += W / 8) { ctx2d.beginPath(); ctx2d.moveTo(x, 0); ctx2d.lineTo(x, H); ctx2d.stroke(); }
  for (let y = 0; y < H; y += H / 6) { ctx2d.beginPath(); ctx2d.moveTo(0, y); ctx2d.lineTo(W, y); ctx2d.stroke(); }
  // depth labels
  ctx2d.font = `${H * 0.032}px "DejaVu Sans", sans-serif`;
  ctx2d.fillStyle = 'rgba(60,70,90,0.8)';
  for (let c = 0; c < 5; c++) ctx2d.fillText(`${150 + c * 50}`, W * 0.06 + c * 14, H * (0.18 + c * 0.135));
  // planned route
  ctx2d.strokeStyle = 'rgba(142,48,48,0.85)';
  ctx2d.lineWidth = 2.5;
  ctx2d.setLineDash([10, 7]);
  ctx2d.beginPath();
  ctx2d.moveTo(W * 0.12, H * 0.78);
  ctx2d.lineTo(W * 0.4, H * 0.6);
  ctx2d.lineTo(W * 0.62, H * 0.64);
  ctx2d.lineTo(W * 0.88, H * 0.34);
  ctx2d.stroke();
  ctx2d.setLineDash([]);
  for (const [px, py] of [[0.12, 0.78], [0.4, 0.6], [0.62, 0.64], [0.88, 0.34]]) {
    ctx2d.strokeStyle = 'rgba(142,48,48,0.9)';
    ctx2d.beginPath(); ctx2d.arc(W * px, H * py, 6, 0, 7); ctx2d.stroke();
  }
  stencilText(ctx2d, 'TRENCH SURVEY 7 — LEG 3', W * 0.5, H * 0.06, { size: H * 0.045, color: 'rgba(50,50,55,0.85)', spacing: 2 });
  // coffee ring + pencil marks (lived-in)
  ctx2d.strokeStyle = 'rgba(90,60,30,0.28)';
  ctx2d.lineWidth = 4;
  ctx2d.beginPath(); ctx2d.arc(W * 0.72, H * 0.82, 26, 0, 7); ctx2d.stroke();
  ctx2d.font = `italic ${H * 0.03}px "DejaVu Sans", sans-serif`;
  ctx2d.fillStyle = 'rgba(50,50,60,0.6)';
  ctx2d.fillText('chk current 04:00', W * 0.44, H * 0.5);
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
  g.add(fc);
  C.addBox([-1.16, 0, 0.5], [1.16, 1.15, 1.32], { name: 'fwd-console' });

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
  // round PPI display with hood
  const ppiCanvas = makeCanvas(256, 256);
  const ppiMat = M.displayMaterial(ppiCanvas, { intensity: 1.0 });
  ppiMat.userData.noMerge = true;
  const ppi = new THREE.Mesh(new THREE.CircleGeometry(0.17, 28), ppiMat);
  ppi.position.set(-0.28, 1.22, 0.16);
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
  // waterfall display
  const wfCanvas = makeCanvas(128, 192);
  const wfMat = M.displayMaterial(wfCanvas, { intensity: 0.9 });
  wfMat.userData.noMerge = true;
  const wf = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.28), wfMat);
  wf.position.set(0.12, 1.22, 0.152);
  sonar.add(wf);
  const wfFrame = new THREE.Mesh(K.roundedBox(0.23, 0.32, 0.02, 0.008), M.bakelite());
  wfFrame.position.set(0.12, 1.22, 0.14);
  sonar.add(wfFrame);
  // gain knobs column
  for (let i = 0; i < 3; i++) {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.025, 12), M.bakelite());
    knob.rotation.x = Math.PI / 2;
    knob.position.set(0.42, 1.06 + i * 0.14, 0.155);
    sonar.add(knob);
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.018, 0.004), M.whiteEnamel());
    mark.position.set(0.42, 1.075 + i * 0.14, 0.168);
    sonar.add(mark);
  }
  // keypad strip on desk + ping button
  const keys = switchBank(5, 2, 'sonar-keys');
  keys.position.set(0.1, 0.77, 0.16);
  sonar.add(keys);
  const pingBtnMat = M.instrumentLampMaterial('#79c98d', 0.9);
  const pingBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.02, 14), pingBtnMat);
  pingBtn.position.set(-0.3, 0.775, 0.18);
  sonar.add(pingBtn);
  const pingGuard = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.006, 6, 16), M.bareSteel());
  pingGuard.rotation.x = Math.PI / 2;
  pingGuard.position.set(-0.3, 0.785, 0.18);
  sonar.add(pingGuard);
  const sonarLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.06),
    M.labelMaterial('ACTIVE SONAR', { w: 256, h: 52, size: 26 }));
  sonarLabel.position.set(0, 1.68, 0.12);
  sonar.add(sonarLabel);
  g.add(sonar);
  C.addBox([-1.48, 0, 2.4], [-0.68, 1.7, 3.8], { name: 'sonar-desk' });

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
  const chart = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 0.6), chartMat);
  chart.rotation.x = -Math.PI / 2;
  chart.position.y = 0.895;
  nav.add(chart);
  const chartGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.24, 0.62), M.glassInstrument());
  chartGlass.rotation.x = -Math.PI / 2;
  chartGlass.position.y = 0.9;
  chartGlass.userData.noRaycast = true;
  nav.add(chartGlass);
  // table legs / cabinet
  const under = new THREE.Mesh(K.roundedBox(1.25, 0.8, 0.6, 0.015), M.cabinetGreen());
  under.position.y = 0.42;
  nav.add(under);
  // drawers
  for (let i = 0; i < 2; i++) {
    const dh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.025), M.bareSteel());
    dh.position.set(-0.28 + i * 0.56, 0.62, 0.31);
    nav.add(dh);
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
  lampGlow.lookAt(new THREE.Vector3(1.04, 0.9, 3.0));
  nav.add(lampGlow);
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
  pencil.position.set(-0.2, 0.925, 0.18);
  nav.add(pencil);
  g.add(nav);
  C.addBox([0.62, 0, 2.55], [1.5, 1.0, 3.45], { name: 'nav-table' });

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
  g.add(comms);

  // ======================= periscope-style optical column ====================
  const peri = new THREE.Group();
  peri.position.set(0.48, 0, 4.85);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.4, 18), M.bareSteel());
  col.position.y = 1.2;
  col.castShadow = true;
  peri.add(col);
  const headBox = new THREE.Mesh(K.roundedBox(0.34, 0.3, 0.26, 0.02), M.gunmetal());
  headBox.position.y = 1.42;
  headBox.castShadow = true;
  peri.add(headBox);
  // eyepieces
  for (const s of [-0.06, 0.06]) {
    const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.035, 0.09, 10), M.bakelite());
    eye.rotation.x = Math.PI / 2;
    eye.position.set(s, 1.38, -0.16);
    peri.add(eye);
  }
  // fold-down handles
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.3, 8), M.bareSteel());
    arm.position.set(s * 0.24, 1.3, 0);
    arm.rotation.z = s * 0.5;
    peri.add(arm);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.14, 8), M.rubberMat());
    grip.position.set(s * 0.33, 1.19, 0);
    grip.rotation.z = s * 0.5;
    peri.add(grip);
  }
  const periBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.1, 16), M.gunmetal());
  periBase.position.y = 0.05;
  peri.add(periBase);
  g.add(peri);
  C.addBox([0.3, 0, 4.67], [0.66, 2.3, 5.03], { name: 'periscope' });

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
  g.add(rack);
  C.addBox([-1.45, 0, 4.14], [-0.72, 1.8, 5.06], { name: 'aft-rack' });

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
