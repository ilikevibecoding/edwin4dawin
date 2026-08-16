// Reusable machinery builders: propulsion motor, gearbox, pumps, compressors,
// cabinets, heat exchangers, switchboards. Owner: aft machinery agent.

import * as THREE from 'three';
import { makeRng } from './rng.js';
import * as M from './materials.js';
import * as K from './greebles.js';
import { makeCanvas, fillBase, stencilText, canvasTexture, mottle, speckle } from './textures.js';

// ---------------------------------------------------------------------------
// Deferred fasteners. Builders are constructed in LOCAL space and positioned
// by the room afterwards, but K.addBolt wants WORLD coordinates. Builders (and
// rooms) record bolt specs on any group's userData.bolts; the room calls
// emitBolts(roomGroup) once, after all placement, to convert and emit them.
// ---------------------------------------------------------------------------
function noteBolt(g, pos, normal, size = 'S') {
  if (!g.userData.bolts) g.userData.bolts = [];
  g.userData.bolts.push({ p: pos, n: normal, s: size });
}

export function emitBolts(root) {
  root.updateWorldMatrix(true, true);
  const q = new THREE.Quaternion();
  root.traverse((o) => {
    const list = o.userData.bolts;
    if (!list || !list.length) return;
    o.getWorldQuaternion(q);
    for (const b of list) {
      K.addBolt(o.localToWorld(b.p.clone()), b.n.clone().applyQuaternion(q).normalize(), b.s);
    }
    o.userData.bolts = [];
  });
}

// ---------------------------------------------------------------------------
// Main propulsion motor: finned stator, cast end bells, feet, terminal box.
// Axis along Z. Forward face (-z) is the hero face seen from the catwalk.
// ---------------------------------------------------------------------------
export function propulsionMotor({ r = 0.58, len = 2.1 } = {}) {
  const g = new THREE.Group();
  g.userData.static = true;
  const half = len / 2, bellLen = 0.26;

  // stator body
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 36, 1, false), M.gunmetal());
  body.rotation.x = Math.PI / 2;
  body.castShadow = true; body.receiveShadow = true;
  g.add(body);

  // cooling fins: thin annular discs, low protrusion (12 mm), matte dark
  const finBand = len * 0.72;
  const finStep = 0.036;
  const nFins = Math.floor(finBand / finStep);
  const finGeo = K.ringPlate(r - 0.006, r + 0.012, 0.006, 44);
  const fins = new THREE.InstancedMesh(finGeo, M.gunmetal(), nFins);
  const m4 = new THREE.Matrix4();
  const qFin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  const one = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < nFins; i++) {
    m4.compose(new THREE.Vector3(0, 0, -finBand / 2 + (i + 0.5) * finStep), qFin, one);
    fins.setMatrixAt(i, m4);
  }
  fins.instanceMatrix.needsUpdate = true;
  fins.receiveShadow = true;
  fins.userData.static = true;
  g.add(fins);
  // stator frame rings closing the fin band
  for (const s of [-1, 1]) {
    const ring = new THREE.Mesh(K.ringPlate(r - 0.004, r + 0.018, 0.055, 44), M.gunmetal());
    ring.rotation.x = Math.PI / 2;
    ring.position.z = s * (finBand / 2 + 0.032);
    ring.receiveShadow = true;
    g.add(ring);
  }

  // end bells (large radius toward the body)
  for (const s of [-1, 1]) {
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.99, r * 0.85, bellLen, 36), M.gunmetal());
    bell.rotation.x = s < 0 ? Math.PI / 2 : -Math.PI / 2;
    bell.position.z = s * (half + bellLen / 2);
    bell.castShadow = true; bell.receiveShadow = true;
    g.add(bell);
  }

  // ---- forward face: bolted end-bell with casting detail -------------------
  {
    const s = -1;
    const faceZ = s * (half + bellLen);
    const face = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.70, r * 0.70, 0.05, 32), M.gunmetal());
    face.rotation.x = Math.PI / 2;
    face.position.z = faceZ + s * 0.006;
    face.castShadow = true; face.receiveShadow = true;
    g.add(face);
    // raised, bolted rim ring
    const rim = new THREE.Mesh(K.ringPlate(r * 0.66, r * 0.85, 0.07, 40), M.gunmetal());
    rim.rotation.x = Math.PI / 2;
    rim.position.z = faceZ + s * 0.012;
    rim.castShadow = true; rim.receiveShadow = true;
    g.add(rim);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
      noteBolt(g, new THREE.Vector3(Math.cos(a) * r * 0.755, Math.sin(a) * r * 0.755, faceZ + s * 0.045), new THREE.Vector3(0, 0, s), 'M');
    }
    // radial casting ribs between hub and rim
    const ribLen = r * 0.38;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rib = new THREE.Mesh(K.roundedBox(0.034, ribLen, 0.032, 0.008), M.gunmetal());
      rib.position.set(Math.cos(a) * r * 0.44, Math.sin(a) * r * 0.44, faceZ + s * 0.026);
      rib.rotation.z = a - Math.PI / 2;
      rib.receiveShadow = true;
      g.add(rib);
    }
    // bearing housing boss + cap + center plug
    const boss = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.34, r * 0.29, 0.07, 26), M.gunmetal());
    boss.rotation.x = Math.PI / 2; // large end toward body
    boss.position.z = faceZ + s * 0.055;
    boss.castShadow = true;
    g.add(boss);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.165, r * 0.165, 0.05, 22), M.darkSteel());
    cap.rotation.x = Math.PI / 2;
    cap.position.z = faceZ + s * 0.10;
    cap.castShadow = true;
    g.add(cap);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      noteBolt(g, new THREE.Vector3(Math.cos(a) * r * 0.115, Math.sin(a) * r * 0.115, faceZ + s * 0.126), new THREE.Vector3(0, 0, s), 'S');
    }
    const plug = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.05, r * 0.05, 0.02, 12), M.bareSteel());
    plug.rotation.x = Math.PI / 2;
    plug.position.z = faceZ + s * 0.132;
    g.add(plug);
    // grease fitting on the boss, lower-left
    const ga = Math.PI * 1.14;
    const nip = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.035, 8), M.brass());
    nip.rotation.x = Math.PI / 2;
    nip.position.set(Math.cos(ga) * r * 0.28, Math.sin(ga) * r * 0.28, faceZ + s * 0.10);
    g.add(nip);
    const nipTip = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 8, 6), M.brass());
    nipTip.position.set(Math.cos(ga) * r * 0.28, Math.sin(ga) * r * 0.28, faceZ + s * 0.12);
    g.add(nipTip);
    // maker's plate riveted between two ribs, upper area
    const pa = Math.PI * 0.31;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.055),
      M.labelMaterial('ELEKTRA 990 kW', { w: 224, h: 72, size: 22 }));
    plate.position.set(Math.cos(pa) * r * 0.45, Math.sin(pa) * r * 0.45, faceZ + s * 0.034);
    plate.rotation.y = Math.PI;
    g.add(plate);
  }

  // ---- aft face: plain bolted disc + shaft stub into the coupling -----------
  {
    const s = 1;
    const faceZ = s * (half + bellLen);
    const face = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.78, r * 0.78, 0.05, 32), M.gunmetal());
    face.rotation.x = Math.PI / 2;
    face.position.z = faceZ + s * 0.006;
    g.add(face);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      noteBolt(g, new THREE.Vector3(Math.cos(a) * r * 0.60, Math.sin(a) * r * 0.60, faceZ + s * 0.035), new THREE.Vector3(0, 0, s), 'M');
    }
    const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.34, 16), M.bareSteel());
    stub.rotation.x = Math.PI / 2;
    stub.position.z = faceZ + s * 0.16;
    g.add(stub);
  }

  // feet + sole pads
  for (const sz of [-0.7, 0.7]) for (const sx of [-1, 1]) {
    const foot = new THREE.Mesh(K.roundedBox(0.22, 0.3, 0.18, 0.015), M.gunmetal());
    foot.position.set(sx * (r * 0.72), -r * 0.78, sz);
    foot.receiveShadow = true;
    g.add(foot);
    const pad = new THREE.Mesh(K.roundedBox(0.3, 0.05, 0.24, 0.01), M.oilySteel());
    pad.position.set(sx * (r * 0.72), -r * 0.95, sz);
    g.add(pad);
    noteBolt(g, new THREE.Vector3(sx * (r * 0.72) - 0.1, -r * 0.905, sz), new THREE.Vector3(0, 1, 0), 'M');
    noteBolt(g, new THREE.Vector3(sx * (r * 0.72) + 0.1, -r * 0.905, sz), new THREE.Vector3(0, 1, 0), 'M');
  }

  // terminal box on a saddle plinth, bolted lid, gland plate, conduit drop
  const tz = -len * 0.18;
  const plinth = new THREE.Mesh(K.roundedBox(0.34, 0.10, 0.26, 0.015), M.gunmetal());
  plinth.position.set(0, r - 0.01, tz);
  plinth.receiveShadow = true;
  g.add(plinth);
  const tbox = new THREE.Mesh(K.roundedBox(0.42, 0.26, 0.30, 0.02), M.machineBlue());
  tbox.position.set(0, r + 0.16, tz);
  tbox.castShadow = true; tbox.receiveShadow = true;
  g.add(tbox);
  const lid = new THREE.Mesh(K.roundedBox(0.36, 0.20, 0.016, 0.008), M.machineBlue());
  lid.position.set(0, r + 0.16, tz - 0.155);
  g.add(lid);
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    noteBolt(g, new THREE.Vector3(sx * 0.15, r + 0.16 + sy * 0.078, tz - 0.164), new THREE.Vector3(0, 0, -1), 'S');
  }
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.075),
    M.labelMaterial('PROPULSION MTR 1', { w: 288, h: 80, size: 24 }));
  label.position.set(0, r + 0.175, tz - 0.165);
  label.rotation.y = Math.PI;
  g.add(label);
  // three cable glands on top (feeder cables from the room land here)
  for (const sx of [-0.11, 0, 0.11]) {
    const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.030, 0.09, 10), M.bareSteel());
    gl.position.set(sx, r + 0.33, tz);
    g.add(gl);
    const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.016, 6), M.bareSteel());
    nut.position.set(sx, r + 0.30, tz);
    g.add(nut);
  }
  // rigid conduit from box flank down to a field junction box on the body
  g.add(K.pipeRun([[0.20, r + 0.13, tz + 0.02], [0.37, r + 0.01, tz + 0.13], [0.50, r * 0.66, tz + 0.24], [0.525, r * 0.47, tz + 0.26]], {
    r: 0.015, material: M.galvanized(), flanges: 'none', cornerR: 0.06, capEnds: true,
  }));
  const sbDir = new THREE.Vector3(Math.sin(1.05), Math.cos(1.05), 0);
  const sideBox = new THREE.Mesh(K.roundedBox(0.15, 0.19, 0.09, 0.012), M.machineBlue());
  sideBox.position.copy(sbDir.clone().multiplyScalar(r + 0.04));
  sideBox.position.z = tz + 0.27;
  sideBox.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), sbDir);
  sideBox.castShadow = true;
  g.add(sideBox);

  // lifting eyes on bosses
  for (const sz of [-len * 0.4, len * 0.4]) {
    const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 0.035, 10), M.gunmetal());
    boss.position.set(0, r + 0.005, sz);
    g.add(boss);
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.011, 6, 14), M.bareSteel());
    eye.position.set(0, r + 0.05, sz);
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
      noteBolt(g, new THREE.Vector3(s * 0.5, 0.028, -0.33 + i * 0.11), new THREE.Vector3(0, 1, 0), 'M');
    }
  }
  // round inspection cover
  const cover = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.03, 16), M.darkSteel());
  cover.rotation.x = Math.PI / 2;
  cover.position.set(0, 0.16, 0.41);
  g.add(cover);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    noteBolt(g, new THREE.Vector3(Math.cos(a) * 0.115, 0.16 + Math.sin(a) * 0.115, 0.425), new THREE.Vector3(0, 0, 1), 'S');
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
    noteBolt(g, new THREE.Vector3(sx * scale, 0.065 * scale, sz * scale), new THREE.Vector3(0, 1, 0), 'S');
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
      noteBolt(g, new THREE.Vector3(s * (len / 2 + 0.012), Math.cos(a) * r * 1.1, Math.sin(a) * r * 1.1), new THREE.Vector3(s, 0, 0), 'S');
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
  const oil = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, d * 0.86), M.oilySteel());
  oil.rotation.x = -Math.PI / 2;
  oil.position.y = 0.042;
  g.add(oil);
  return g;
}
