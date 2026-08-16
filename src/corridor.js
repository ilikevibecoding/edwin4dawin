// Main pressure-hull corridor + aft electrical passage: utility spine (pipes,
// cables, trays), valve station, grates, rails, lamps, labels, switchboards.
// Owner: corridor agent.

import * as THREE from 'three';
import { Z, ROUTES, HULL, PORTHOLES } from './layout.js';
import * as M from './materials.js';
import * as K from './greebles.js';
import * as MC from './machinery.js';
import { makeRng } from './rng.js';
import { makeCanvas, stencilText, canvasTexture } from './textures.js';

function bulkheadCollar(x, y, z, r) {
  const g = new THREE.Group();
  g.userData.static = true;
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.3, r * 1.3, 0.3, 12, 1, true), M.darkSteel());
  sleeve.rotation.x = Math.PI / 2;
  sleeve.position.set(x, y, z);
  g.add(sleeve);
  for (const s of [-1, 1]) {
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.7, r * 1.7, 0.03, 14), M.darkSteel());
    fl.rotation.x = Math.PI / 2;
    fl.position.set(x, y, z + s * 0.15);
    g.add(fl);
  }
  return g;
}

// floor stencil decal (transparent plane on deck)
function floorStencil(text, w, l) {
  const c = makeCanvas(256, 128);
  const ctx2d = c.getContext('2d');
  ctx2d.clearRect(0, 0, 256, 128);
  stencilText(ctx2d, text, 128, 64, { size: 44, color: 'rgba(185,154,69,0.75)', spacing: 4 });
  // worn-off patches
  const rng = makeRng('stencil' + text);
  ctx2d.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 26; i++) {
    ctx2d.fillStyle = 'rgba(0,0,0,0.55)';
    ctx2d.beginPath();
    ctx2d.arc(rng() * 256, rng() * 128, 2 + rng() * 7, 0, 7);
    ctx2d.fill();
  }
  ctx2d.globalCompositeOperation = 'source-over';
  const mat = new THREE.MeshStandardMaterial({
    map: canvasTexture(c, { srgb: true, wrap: false }), transparent: true, roughness: 0.8, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, envMapIntensity: 0.3,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, l), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.userData.static = true;
  return mesh;
}

export function build(ctx) {
  const g = new THREE.Group();
  g.name = 'corridor';
  const C = ctx.collision;
  const z0 = 4.7, z1 = Z.frameRing - 0.05; // utility spine span

  // ===================== longitudinal utility spine ==========================
  // starboard ballast main (green) with flanged joints
  const bal = ROUTES.stbdBallast;
  g.add(K.pipeRun([[bal.x, bal.y, z0], [bal.x, bal.y, z1]], {
    r: bal.r, color: bal.color, flanges: [0.18, 0.5, 0.82], clampEvery: 1.5, capEnds: false,
  }));
  // starboard cooling line
  const cool = ROUTES.stbdCool;
  g.add(K.pipeRun([[cool.x, cool.y, z0], [cool.x, cool.y, z1]], {
    r: cool.r, color: cool.color, flanges: [0.33, 0.66], clampEvery: 1.5, capEnds: false,
  }));
  // port fresh water (blue)
  const pw = ROUTES.portWater;
  g.add(K.pipeRun([[pw.x, pw.y, z0], [pw.x, pw.y, z1]], {
    r: pw.r, color: pw.color, flanges: [0.5], clampEvery: 1.9, capEnds: false,
  }));
  // port twin HP air (copper)
  const pa = ROUTES.portAir;
  for (const off of [0, 0.062]) {
    g.add(K.pipeRun([[pa.x + off, pa.y, z0], [pa.x + off, pa.y, z1]], {
      r: pa.r, material: M.copper(), flanges: 'none', clampEvery: 1.9, capEnds: false,
    }));
  }
  // port cable tray with bundle
  const tray = K.cableTray(z1 - z0, { width: 0.17 });
  tray.position.set(ROUTES.portTrayX, ROUTES.portTrayY, (z0 + z1) / 2);
  g.add(tray);
  g.add(K.cableBundle(
    [[ROUTES.portTrayX, ROUTES.portTrayY - 0.02, z0], [ROUTES.portTrayX, ROUTES.portTrayY - 0.02, z1]],
    { count: 4, r: 0.012, spread: 0.05, sag: 0.012, seed: 'tray-main' }
  ));
  // crown conduit pair
  for (const off of [-0.05, 0.05]) {
    g.add(K.pipeRun([[off, ROUTES.crownWireY, z0], [off, ROUTES.crownWireY, z1]], {
      r: 0.016, color: 'white', flanges: 'none', clampEvery: 1.6, capEnds: false,
    }));
  }

  // bulkhead penetration collars
  for (const zB of [Z.bulkhead1, Z.bulkhead2]) {
    g.add(bulkheadCollar(bal.x, bal.y, zB, bal.r));
    g.add(bulkheadCollar(cool.x, cool.y, zB, cool.r));
    g.add(bulkheadCollar(pw.x, pw.y, zB, pw.r));
    g.add(bulkheadCollar(ROUTES.portTrayX, ROUTES.portTrayY, zB, 0.06));
  }

  // ===================== corridor fittings (5.9 .. 13.4) =====================
  // valve station on ballast main
  const vs = new THREE.Group();
  vs.position.set(bal.x - 0.06, 0, 12.15);
  const drop = K.pipeRun([[0.06, bal.y, 0], [0.06, 1.06, 0], [-0.12, 0.72, 0], [-0.12, 0.3, 0]], {
    r: 0.05, color: 'green', flanges: [0.45], cornerR: 0.09, capEnds: false,
  });
  vs.add(drop);
  const vv = K.valveAssembly(0.05, {});
  vv.position.set(0.02, 1.06, 0);
  vv.rotation.z = Math.PI / 2;
  vs.add(vv);
  const vg1 = K.gauge({ r: 0.055, label: 'BAR', max: 16, value: 0.42 });
  vg1.position.set(-0.12, 1.42, 0.02);
  vg1.rotation.y = Math.PI;
  vs.add(vg1);
  const vLab = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.055), M.labelMaterial('MBT 3 FLOOD', { w: 224, h: 56, size: 24 }));
  vLab.position.set(-0.14, 0.88, -0.001);
  vLab.rotation.y = Math.PI;
  vs.add(vLab);
  g.add(vs);
  C.addBox([bal.x - 0.3, 0.2, 11.95], [bal.x + 0.15, 1.3, 12.35], { name: 'valve-station' });

  // junction boxes under tray with drops
  for (const [zJ, label] of [[7.4, 'JB-2A'], [10.6, 'JB-2B'], [12.9, 'DIST 2']]) {
    const jb = K.junctionBox(0.22, 0.3, 0.12, { label, glands: 2 });
    jb.position.set(-1.42, 1.55, zJ);
    jb.rotation.y = Math.PI / 2;
    g.add(jb);
    g.add(K.cableRun([[ROUTES.portTrayX, ROUTES.portTrayY - 0.03, zJ], [-1.38, 1.72, zJ]], { r: 0.013, sag: 0.03, seed: 'jbdrop' + zJ }));
  }

  // handrails
  g.add(K.handrail([[1.28, 1.04, 6.1], [1.28, 1.04, 7.05]], { r: 0.019, stanchionEvery: 0, baseY: 3 }));
  g.add(K.handrail([[-1.35, 1.04, 10.9], [-1.35, 1.04, 13.15]], { r: 0.019, stanchionEvery: 0, baseY: 3 }));
  // handrail wall standoffs
  for (const [x, zz] of [[1.28, 6.25], [1.28, 6.9], [-1.35, 11.1], [-1.35, 12.9]]) {
    const so = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.03), M.bareSteel());
    so.position.set(x > 0 ? x + 0.06 : x - 0.06, 1.04, zz);
    so.userData.static = true;
    g.add(so);
  }

  // floor grates over bilge
  for (const zG of [6.9, 9.7, 12.5]) {
    const grate = K.floorGrate(0.62, 0.92);
    grate.position.set(0, 0.006, zG);
    g.add(grate);
  }

  // overhead transverse braces
  for (const zB of [8.25, 11.0]) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.07, 0.05), M.panelPaint('ribPaint', '#bcb7a6'));
    brace.position.set(0, 2.2, zB);
    brace.userData.static = true;
    brace.receiveShadow = true;
    g.add(brace);
  }

  // extinguisher + hose reel
  const ext = K.extinguisher();
  ext.position.set(-1.38, 0.62, 8.62);
  ext.rotation.y = Math.PI / 2;
  g.add(ext);
  const reel = K.hoseReel();
  reel.position.set(1.35, 1.35, 10.9);
  reel.rotation.y = -Math.PI / 2;
  g.add(reel);

  // frame number plates + compartment signs
  for (const [zF, n] of [[6.75, 'FR 9'], [9.0, 'FR 12'], [11.25, 'FR 15'], [14.25, 'FR 19'], [15.75, 'FR 21']]) {
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.045),
      M.labelMaterial(n, { w: 128, h: 44, size: 24, bg: '#8f948a' }));
    plate.position.set(-1.52 * Math.sign((zF % 2) - 0.5) * 0 - 1.5, 1.78, zF - 0.02);
    plate.rotation.y = Math.PI / 2;
    plate.userData.static = true;
    // put on port hull wall angle
    g.add(plate);
  }
  const signCtl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.07),
    M.labelMaterial('< CONTROL', { w: 384, h: 64, size: 30 }));
  signCtl.position.set(-0.55, 1.86, 6.25);
  signCtl.rotation.y = 0.35;
  signCtl.userData.static = true;
  g.add(signCtl);
  const signEng = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.07),
    M.labelMaterial('MACHINERY >', { w: 448, h: 56, size: 30 }));
  signEng.position.set(0.5, 1.86, 13.05);
  signEng.rotation.y = -0.35;
  signEng.userData.static = true;
  g.add(signEng);

  // floor stencils at hatches
  const st1 = floorStencil('KEEP CLEAR', 0.72, 0.36);
  st1.position.set(0, 0.028, 6.35);
  g.add(st1);
  const st2 = floorStencil('KEEP CLEAR', 0.72, 0.36);
  st2.position.set(0, 0.028, 12.95);
  g.add(st2);

  // small storage cabinet (port, near bulkhead 2)
  const stow = new THREE.Group();
  stow.position.set(-1.22, 0, 12.62);
  stow.rotation.y = Math.PI / 2;
  const stowBody = new THREE.Mesh(K.roundedBox(0.6, 0.9, 0.35, 0.012), M.cabinetGreen());
  stowBody.position.y = 0.47;
  stowBody.castShadow = true;
  stow.add(stowBody);
  for (const dy of [0.25, 0.68]) {
    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.03), M.bareSteel());
    latch.position.set(0.22, dy, 0.18);
    stow.add(latch);
  }
  const stowLab = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.06), M.labelMaterial('DC STORES', { w: 256, h: 52, size: 24 }));
  stowLab.position.set(0, 0.78, 0.181);
  stow.add(stowLab);
  g.add(stow);
  C.addBox([-1.5, 0, 12.32], [-0.95, 1.0, 12.94], { name: 'stow-cabinet' });

  // porthole deadlight latch + label + condensation streak below stbd porthole
  for (const ph of PORTHOLES) {
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.04),
      M.labelMaterial(ph.side > 0 ? 'PORT 2' : 'PORT 3', { w: 128, h: 40, size: 20 }));
    const wallX = ph.side * (Math.sqrt(Math.max(0, HULL.radius ** 2 - (ph.y - 0.6 - HULL.axisY) ** 2)) - 0.03);
    lab.position.set(wallX, ph.y - 0.42, ph.z);
    lab.rotation.y = -ph.side * Math.PI / 2;
    lab.userData.static = true;
    g.add(lab);
    const cond = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), M.condensation());
    cond.position.set(wallX * 0.985, ph.y - 0.35, ph.z);
    cond.rotation.y = -ph.side * Math.PI / 2;
    cond.rotation.x = 0;
    cond.userData.static = true;
    cond.userData.noRaycast = true;
    g.add(cond);
  }

  // ===================== lighting (corridor) =================================
  const mkLamp = (x, z, role = 'warm', color = 0xffd9a3, intensity = 4.2, shadow = false) => {
    const fixture = K.lampCage({ r: 0.065, color, intensity: role === 'red' ? 0 : 2.2 });
    fixture.position.set(x, 2.2, z);
    fixture.rotation.x = Math.PI;
    g.add(fixture);
    const light = new THREE.PointLight(color, intensity, 5.5, 2);
    light.position.set(x, 1.98, z);
    light.castShadow = shadow;
    if (shadow) { light.shadow.mapSize.set(512, 512); light.shadow.bias = -0.004; }
    g.add(light);
    ctx.lights.register({ light, lampMats: [fixture.userData.lampMat], role });
  };
  mkLamp(0.28, 6.6, 'warm', 0xffd9a3, 4.2, true);
  mkLamp(-0.28, 9.0, 'warm', 0xffd9a3, 4.2, false);
  mkLamp(0.28, 11.4, 'warm', 0xffd9a3, 4.2, false);
  mkLamp(-0.2, 13.1, 'warm', 0xffd9a3, 3.2, false);
  mkLamp(-0.3, 7.8, 'red', 0xb03a28, 2.4, false);
  mkLamp(0.3, 10.2, 'red', 0xb03a28, 2.4, false);

  // cool porthole spill (small spots aimed inward)
  for (const ph of PORTHOLES) {
    const spot = new THREE.SpotLight(0x6f97a8, 6, 5, 0.7, 0.6, 1.8);
    spot.position.set(ph.side * 2.1, ph.y + 0.3, ph.z);
    spot.target.position.set(0, 0.4, ph.z + 0.4);
    g.add(spot, spot.target);
    ctx.lights.register({ light: spot, role: 'cool' });
  }

  // ===================== aft electrical passage (13.5..16.8) =================
  const sw1 = MC.electricalCabinet({ w: 0.72, h: 1.72, d: 0.4, title: 'SWBD 1', kind: 'mimic', seed: 'swbd1' });
  sw1.position.set(-1.06, 0, 14.35);
  sw1.rotation.y = Math.PI / 2;
  g.add(sw1);
  const sw2 = MC.electricalCabinet({ w: 0.72, h: 1.72, d: 0.4, title: 'SWBD 2', kind: 'breakers', seed: 'swbd2' });
  sw2.position.set(-1.06, 0, 15.55);
  sw2.rotation.y = Math.PI / 2;
  g.add(sw2);
  C.addBox([-1.45, 0, 13.9], [-0.82, 1.8, 16.05], { name: 'swbd-port' });

  const bat = MC.electricalCabinet({ w: 0.8, h: 1.5, d: 0.42, title: 'BATT BKR', kind: 'breakers', seed: 'batbkr', lampColors: ['#d8a04c', '#8e3030'] });
  bat.position.set(1.08, 0, 14.3);
  bat.rotation.y = -Math.PI / 2;
  g.add(bat);
  const conv = MC.electricalCabinet({ w: 0.7, h: 1.5, d: 0.42, title: 'CONV 400', kind: 'mimic', seed: 'conv400' });
  conv.position.set(1.08, 0, 15.5);
  conv.rotation.y = -Math.PI / 2;
  g.add(conv);
  C.addBox([0.84, 0, 13.86], [1.5, 1.6, 15.96], { name: 'swbd-stbd' });

  // dense overhead trays in the electrical passage
  const tray2 = K.cableTray(3.1, { width: 0.16 });
  tray2.position.set(0.55, 2.12, 15.15);
  g.add(tray2);
  g.add(K.cableBundle([[0.55, 2.09, 13.6], [0.55, 2.09, 16.7]], { count: 3, r: 0.013, spread: 0.04, sag: 0.01, seed: 'tray2c' }));
  // drops into cabinets
  g.add(K.cableRun([[ROUTES.portTrayX, ROUTES.portTrayY - 0.02, 14.35], [-1.06, 1.78, 14.35]], { r: 0.016, sag: 0.04, seed: 'dropsw1' }));
  g.add(K.cableRun([[ROUTES.portTrayX, ROUTES.portTrayY - 0.02, 15.55], [-1.06, 1.78, 15.55]], { r: 0.016, sag: 0.04, seed: 'dropsw2' }));
  g.add(K.cableRun([[0.55, 2.09, 14.3], [1.05, 1.56, 14.3]], { r: 0.016, sag: 0.03, seed: 'dropbat' }));
  g.add(K.cableRun([[0.55, 2.09, 15.5], [1.05, 1.56, 15.5]], { r: 0.016, sag: 0.03, seed: 'dropconv' }));

  // HV warning sign
  const hv = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.12),
    M.labelMaterial('DANGER 440V', { w: 256, h: 96, size: 30, bg: '#b99a45', fg: '#26261f' }));
  hv.position.set(-0.86, 1.5, 13.62);
  hv.rotation.y = Math.PI / 2 - 0.4;
  hv.userData.static = true;
  g.add(hv);

  // aft passage lighting
  mkLamp(0.24, 14.6, 'warm', 0xffd9a3, 4.0, false);
  mkLamp(-0.24, 16.2, 'warm', 0xffd9a3, 3.6, false);
  mkLamp(0.0, 15.4, 'red', 0xb03a28, 2.6, false);

  return g;
}
