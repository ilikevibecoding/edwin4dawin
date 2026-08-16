// Reusable machinery builders: propulsion motor, gearbox, pumps, compressors,
// cabinets, heat exchangers, switchboards. Owner: aft machinery agent.

import * as THREE from 'three';
import { makeRng } from './rng.js';
import * as M from './materials.js';
import * as K from './greebles.js';
import { makeCanvas, fillBase, stencilText, canvasTexture, mottle, speckle } from './textures.js';

// ---------------------------------------------------------------------------
// Main propulsion motor: finned cylinder, end bells, feet, terminal box
// ---------------------------------------------------------------------------
export function propulsionMotor({ r = 0.58, len = 2.1 } = {}) {
  const g = new THREE.Group();
  g.userData.static = true;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 28, 1, false), M.gunmetal());
  body.rotation.x = Math.PI / 2;
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);
  // cooling fins: rings along the body
  const finGeo = new THREE.TorusGeometry(r + 0.022, 0.011, 4, 36);
  const nFins = Math.floor(len / 0.078);
  const fins = new THREE.InstancedMesh(finGeo, M.darkSteel(), nFins);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < nFins; i++) {
    m4.makeTranslation(0, 0, -len / 2 + 0.09 + i * 0.078);
    fins.setMatrixAt(i, m4);
  }
  fins.instanceMatrix.needsUpdate = true;
  fins.receiveShadow = true;
  g.add(fins);
  // end bells with bolted plates
  for (const s of [-1, 1]) {
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.99, r * 0.8, 0.3, 28), M.gunmetal());
    bell.rotation.x = Math.PI / 2;
    bell.position.z = s * (len / 2 + 0.15);
    if (s > 0) bell.rotation.z = Math.PI;
    bell.scale.y = s > 0 ? -1 : 1;
    bell.castShadow = true;
    g.add(bell);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, 0.05, 22), M.darkSteel());
    plate.rotation.x = Math.PI / 2;
    plate.position.z = s * (len / 2 + 0.31);
    g.add(plate);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      K.addBolt(new THREE.Vector3(Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36, s * (len / 2 + 0.335)), new THREE.Vector3(0, 0, s), 'M');
    }
  }
  // feet
  for (const sz of [-0.7, 0.7]) for (const sx of [-1, 1]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.18), M.gunmetal());
    foot.position.set(sx * (r * 0.72), -r * 0.78, sz);
    g.add(foot);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.24), M.oilySteel());
    pad.position.set(sx * (r * 0.72), -r * 0.95, sz);
    g.add(pad);
  }
  // terminal box on top with cable glands
  const tbox = new THREE.Mesh(K.roundedBox(0.42, 0.26, 0.3, 0.02), M.machineBlue());
  tbox.position.set(0, r + 0.1, -len * 0.18);
  tbox.castShadow = true;
  g.add(tbox);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.09),
    M.labelMaterial('PROPULSION MTR 1', { w: 256, h: 72, size: 26 }));
  label.position.set(0, r + 0.1, -len * 0.18 + 0.155);
  g.add(label);
  for (const sx of [-0.1, 0.1]) {
    const gland = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 0.09, 10), M.bareSteel());
    gland.position.set(sx, r + 0.26, -len * 0.18);
    g.add(gland);
  }
  // lifted inspection ring + eyebolts
  for (const sz of [-len * 0.4, len * 0.4]) {
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.012, 6, 14), M.bareSteel());
    eye.position.set(0, r + 0.03, sz);
    g.add(eye);
  }
  return g;
}

// ---------------------------------------------------------------------------
// Reduction gear casing: rounded volume with inspection covers
// ---------------------------------------------------------------------------
export function reductionGear() {
  const g = new THREE.Group();
  g.userData.static = true;
  const casing = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 0.78, 22, 1, false), M.machineBlue());
  casing.rotation.x = Math.PI / 2;
  casing.scale.y = 0.9;
  casing.castShadow = true; casing.receiveShadow = true;
  g.add(casing);
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.5, 18), M.machineBlue());
  upper.rotation.x = Math.PI / 2;
  upper.position.y = 0.28;
  upper.castShadow = true;
  g.add(upper);
  // horizontal split flange with bolts
  const split = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.045, 0.8), M.darkSteel());
  g.add(split);
  for (let i = 0; i < 7; i++) {
    for (const s of [-1, 1]) {
      K.addBolt(new THREE.Vector3(s * 0.5, 0.028, -0.33 + i * 0.11), new THREE.Vector3(0, 1, 0), 'M');
    }
  }
  // round inspection cover
  const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.03, 16), M.darkSteel());
  cover.rotation.x = Math.PI / 2;
  cover.position.set(0, 0.16, 0.41);
  g.add(cover);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    K.addBolt(new THREE.Vector3(Math.cos(a) * 0.115, 0.16 + Math.sin(a) * 0.115, 0.425), new THREE.Vector3(0, 0, 1), 'S');
  }
  // oil sight glass
  const sight = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.09, 10), M.brass());
  sight.position.set(0.42, -0.12, 0.3);
  g.add(sight);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 8), M.glassInstrument());
  glass.position.set(0.42, -0.12, 0.3);
  g.add(glass);
  return g;
}

// ---------------------------------------------------------------------------
// Pump skid: electric motor + volute + flanges
// ---------------------------------------------------------------------------
export function pump({ scale = 1, seed = 'pump' } = {}) {
  const rng = makeRng(seed);
  const g = new THREE.Group();
  g.userData.static = true;
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * scale, 0.13 * scale, 0.4 * scale, 18), M.machineBlue());
  motor.rotation.z = Math.PI / 2;
  motor.position.set(-0.18 * scale, 0.2 * scale, 0);
  motor.castShadow = true;
  g.add(motor);
  const finGeo = new THREE.BoxGeometry(0.4 * scale, 0.012, 0.012);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const fin = new THREE.Mesh(finGeo, M.machineBlue());
    fin.position.set(-0.18 * scale, 0.2 * scale + Math.cos(a) * 0.135 * scale, Math.sin(a) * 0.135 * scale);
    g.add(fin);
  }
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.135 * scale, 0.1 * scale, 0.07 * scale, 18), M.machineBlue());
  bell.rotation.z = Math.PI / 2;
  bell.position.set(-0.42 * scale, 0.2 * scale, 0);
  g.add(bell);
  // volute (snail casing)
  const volute = new THREE.Mesh(new THREE.TorusGeometry(0.1 * scale, 0.075 * scale, 12, 22), M.gunmetal());
  volute.position.set(0.12 * scale, 0.2 * scale, 0);
  volute.rotation.y = Math.PI / 2;
  volute.castShadow = true;
  g.add(volute);
  const inlet = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * scale, 0.055 * scale, 0.16 * scale, 12), M.gunmetal());
  inlet.rotation.z = Math.PI / 2;
  inlet.position.set(0.25 * scale, 0.2 * scale, 0);
  g.add(inlet);
  const outlet = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 0.2 * scale, 12), M.gunmetal());
  outlet.position.set(0.12 * scale, 0.38 * scale, 0);
  g.add(outlet);
  // skid
  const skid = new THREE.Mesh(new THREE.BoxGeometry(0.72 * scale, 0.06 * scale, 0.3 * scale), M.darkSteel());
  skid.position.y = 0.03 * scale;
  skid.receiveShadow = true;
  g.add(skid);
  const drip = new THREE.Mesh(new THREE.BoxGeometry(0.8 * scale, 0.015 * scale, 0.38 * scale), M.oilySteel());
  drip.position.y = 0.008 * scale;
  g.add(drip);
  for (const sx of [-0.3, 0.3]) for (const sz of [-0.11, 0.11]) {
    K.addBolt(new THREE.Vector3(sx * scale, 0.065 * scale, sz * scale), new THREE.Vector3(0, 1, 0), 'S');
  }
  const coupling = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 0.09 * scale, 12), M.safetyOrangePaint());
  coupling.rotation.z = Math.PI / 2;
  coupling.position.set(-0.02 * scale, 0.2 * scale, 0);
  g.add(coupling);
  return g;
}

// ---------------------------------------------------------------------------
// Air compressor with receiver tank
// ---------------------------------------------------------------------------
export function compressor() {
  const g = new THREE.Group();
  g.userData.static = true;
  const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.7, 8, 16), M.machineBlue());
  tank.rotation.z = Math.PI / 2;
  tank.position.y = 0.2;
  tank.castShadow = true; tank.receiveShadow = true;
  g.add(tank);
  for (const sx of [-0.25, 0.25]) {
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.3), M.darkSteel());
    saddle.position.set(sx, 0.08, 0);
    g.add(saddle);
  }
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.2), M.gunmetal());
  head.position.set(-0.12, 0.48, 0);
  head.castShadow = true;
  g.add(head);
  const finGeo = new THREE.BoxGeometry(0.24, 0.012, 0.22);
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(finGeo, M.gunmetal());
    f.position.set(-0.12, 0.4 + i * 0.036, 0);
    g.add(f);
  }
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.26, 14), M.machineBlue());
  motor.rotation.z = Math.PI / 2;
  motor.position.set(0.2, 0.46, 0);
  g.add(motor);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.014, 6, 20), M.rubberMat());
  belt.position.set(0.05, 0.47, 0.11);
  belt.scale.x = 1.9;
  g.add(belt);
  const airGauge = K.gauge({ r: 0.045, label: 'AIR', max: 30, value: 0.62 });
  airGauge.position.set(-0.3, 0.42, 0.12);
  g.add(airGauge);
  return g;
}

// ---------------------------------------------------------------------------
// Electrical cabinet with generated mimic/breaker panel
// ---------------------------------------------------------------------------
function cabinetFaceCanvas(seed, title, kind) {
  const W = 512, H = 1024;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  fillBase(ctx, '#767d75');
  mottle(ctx, seed + '-face', { cells: 5, octaves: 3, amount: 0.07 });
  // title strip
  ctx.fillStyle = '#2c2e2a';
  ctx.fillRect(30, 30, W - 60, 64);
  stencilText(ctx, title, W / 2, 62, { size: 30, color: '#cfd2c6', spacing: 3 });
  const rng = makeRng(seed);
  if (kind === 'breakers') {
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 3; col++) {
        const x = 70 + col * 140, y = 150 + row * 150;
        ctx.fillStyle = '#3a3d38';
        ctx.fillRect(x - 40, y - 45, 110, 115);
        ctx.strokeStyle = '#22241f'; ctx.lineWidth = 3;
        ctx.strokeRect(x - 40, y - 45, 110, 115);
        // breaker handle
        const on = rng() > 0.3;
        ctx.fillStyle = '#191a17';
        ctx.fillRect(x - 12, y - 30, 55, 85);
        ctx.fillStyle = on ? '#8a8f83' : '#5c5f57';
        ctx.fillRect(x - 4, on ? y - 22 : y + 18, 39, 36);
        ctx.fillStyle = on ? '#79c98d' : '#8e3030';
        ctx.beginPath(); ctx.arc(x - 26, y - 18, 7, 0, 7); ctx.fill();
        stencilText(ctx, `CB-${row + 1}${col + 1}`, x + 14, y + 82, { size: 17, color: '#c9ccc0', spacing: 1 });
      }
    }
  } else {
    // mimic diagram: bus lines and devices
    ctx.strokeStyle = '#c9ccc0'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(60, 180); ctx.lineTo(W - 60, 180); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const x = 90 + i * 110;
      ctx.beginPath(); ctx.moveTo(x, 180); ctx.lineTo(x, 300 + (i % 2) * 80); ctx.stroke();
      ctx.fillStyle = i % 2 ? '#d8a04c' : '#79c98d';
      ctx.beginPath(); ctx.arc(x, 320 + (i % 2) * 80, 12, 0, 7); ctx.fill();
      ctx.strokeStyle = '#c9ccc0';
      ctx.strokeRect(x - 26, 250 + (i % 2) * 80, 52, 44);
      stencilText(ctx, ['PORT BUS', 'STBD BUS', 'AUX', 'CHG'][i], x, 420 + (i % 2) * 60, { size: 15, color: '#c9ccc0', spacing: 1 });
    }
    // meters
    for (let i = 0; i < 3; i++) {
      const x = 110 + i * 150, y = 620;
      ctx.fillStyle = '#dad5c6';
      ctx.beginPath(); ctx.arc(x, y, 52, 0, 7); ctx.fill();
      ctx.strokeStyle = '#22221f'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, 52, 0, 7); ctx.stroke();
      const a = Math.PI * (0.75 + rng() * 0.5);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 40, y + Math.sin(a) * 40);
      ctx.strokeStyle = '#8e3030'; ctx.lineWidth = 3; ctx.stroke();
      stencilText(ctx, ['VOLTS', 'AMPS', 'KW'][i], x, y + 74, { size: 16, color: '#2e302b', spacing: 1 });
    }
    // switch row
    for (let i = 0; i < 5; i++) {
      const x = 80 + i * 90, y = 800;
      ctx.fillStyle = '#26282300';
      ctx.fillStyle = '#33352f';
      ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill();
      ctx.fillStyle = '#191a17';
      ctx.save(); ctx.translate(x, y); ctx.rotate(rng() > 0.5 ? 0 : Math.PI / 2);
      ctx.fillRect(-7, -24, 14, 48);
      ctx.restore();
    }
    stencilText(ctx, 'MAIN DISTRIBUTION', W / 2, 900, { size: 22, color: '#cfd2c6', spacing: 3 });
  }
  speckle(ctx, seed + '-wear', { count: 200, colors: ['rgba(30,28,24,0.18)'], size: 1.6 });
  return c;
}

export function electricalCabinet({ w = 0.62, h = 1.7, d = 0.42, title = 'SWBD', kind = 'mimic', seed = 'cab', lampColors = ['#79c98d', '#d8a04c'] } = {}) {
  const g = new THREE.Group();
  g.userData.static = true;
  const body = new THREE.Mesh(K.roundedBox(w, h, d, 0.015), M.cabinetGray());
  body.position.y = h / 2;
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);
  // face panel (canvas)
  const faceTex = canvasTexture(cabinetFaceCanvas(seed, title, kind), { srgb: true, wrap: false });
  const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.5, metalness: 0.15, envMapIntensity: 0.55 });
  faceMat.userData.noMerge = true;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, h * 0.9), faceMat);
  face.position.set(0, h / 2, d / 2 + 0.004);
  g.add(face);
  // vents at bottom
  const vent = K.ventGrille(w * 0.6, 0.12);
  vent.position.set(0, 0.12, d / 2 + 0.012);
  g.add(vent);
  // handle + hinges
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.03), M.bareSteel());
  handle.position.set(w / 2 - 0.06, h * 0.55, d / 2 + 0.02);
  g.add(handle);
  for (const hy of [h * 0.25, h * 0.78]) {
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.07, 8), M.bareSteel());
    hinge.position.set(-w / 2 + 0.015, hy, d / 2 - 0.005);
    g.add(hinge);
  }
  // indicator lamps (physical, emissive)
  let i = 0;
  for (const colorHex of lampColors) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), M.instrumentLampMaterial(colorHex, 1.8));
    lamp.position.set(-w / 2 + 0.09 + i * 0.07, h - 0.09, d / 2 + 0.01);
    g.add(lamp);
    i++;
  }
  // cable glands on top
  for (let j = 0; j < 3; j++) {
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.07, 8), M.bareSteel());
    gl.position.set(-w / 4 + (j * w) / 4, h + 0.03, 0);
    g.add(gl);
  }
  return g;
}

// ---------------------------------------------------------------------------
// Heat exchanger: shell and tube with bolted end caps
// ---------------------------------------------------------------------------
export function heatExchanger({ r = 0.15, len = 1.1 } = {}) {
  const g = new THREE.Group();
  g.userData.static = true;
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 20), M.pipePaint('gray'));
  shell.rotation.z = Math.PI / 2;
  shell.castShadow = true;
  g.add(shell);
  for (const s of [-1, 1]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 1.08, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.machineBlue());
    cap.rotation.z = s * Math.PI / 2;
    cap.position.x = s * len / 2;
    g.add(cap);
    const flange = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.16, r * 1.16, 0.035, 20), M.darkSteel());
    flange.rotation.z = Math.PI / 2;
    flange.position.x = s * (len / 2 - 0.01);
    g.add(flange);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      K.addBolt(new THREE.Vector3(s * (len / 2 + 0.012), Math.cos(a) * r * 1.1, Math.sin(a) * r * 1.1), new THREE.Vector3(s, 0, 0), 'S');
    }
    // nozzles
    const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 10), M.pipePaint('gray'));
    noz.position.set(s * len * 0.32, r + 0.05, 0);
    g.add(noz);
  }
  for (const sx of [-0.3, 0.3]) {
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.06, r + 0.06, 0.26), M.darkSteel());
    saddle.position.set(sx, -(r + 0.06) / 2, 0);
    g.add(saddle);
  }
  return g;
}

// ---------------------------------------------------------------------------
// Tool cabinet / workbench
// ---------------------------------------------------------------------------
export function toolCabinet() {
  const g = new THREE.Group();
  g.userData.static = true;
  const body = new THREE.Mesh(K.roundedBox(0.6, 0.85, 0.4, 0.012), M.functionalRedPaint());
  body.position.y = 0.475;
  body.castShadow = true;
  g.add(body);
  for (let i = 0; i < 4; i++) {
    const drawer = new THREE.Mesh(K.roundedBox(0.52, 0.15, 0.02, 0.008), M.functionalRedPaint());
    drawer.position.set(0, 0.22 + i * 0.18, 0.21);
    g.add(drawer);
    const dh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.022, 0.03), M.bareSteel());
    dh.position.set(0, 0.22 + i * 0.18, 0.235);
    g.add(dh);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.03, 0.44), M.bareSteel());
  top.position.y = 0.915;
  g.add(top);
  // wrench + rag on top (procedural props)
  const wrench = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.012, 0.03), M.bareSteel());
  wrench.position.set(0.08, 0.945, 0.05);
  wrench.rotation.y = 0.5;
  g.add(wrench);
  const rag = new THREE.Mesh(K.roundedBox(0.16, 0.03, 0.14, 0.014), M.towel());
  rag.position.set(-0.15, 0.945, -0.08);
  rag.rotation.y = -0.3;
  g.add(rag);
  return g;
}

// oil drip pan with dark fluid
export function dripPan(w = 0.5, d = 0.4) {
  const g = new THREE.Group();
  g.userData.static = true;
  const pan = new THREE.Mesh(K.roundedBox(w, 0.05, d, 0.01), M.darkSteel());
  pan.position.y = 0.025;
  g.add(pan);
  const oil = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, d * 0.86), new THREE.MeshPhysicalMaterial({
    color: 0x0a0908, roughness: 0.05, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.5,
  }));
  oil.rotation.x = -Math.PI / 2;
  oil.position.y = 0.042;
  g.add(oil);
  return g;
}
