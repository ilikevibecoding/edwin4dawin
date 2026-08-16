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

// hull tilt angle at height y (0 = vertical wall at axis height)
function hullTilt(y, radial = HULL.radius) {
  return Math.asin(Math.max(-1, Math.min(1, (y - HULL.axisY) / radial)));
}
// position on the hull wall at contact height y, pushed inboard by halfDepth
function wallPos(side, y, halfDepth, z) {
  const t = hullTilt(y);
  const r = HULL.radius - halfDepth;
  return new THREE.Vector3(side * r * Math.cos(t), HULL.axisY + r * Math.sin(t), z);
}
// quaternion that lays a +z-facing object flush on the curved hull wall
function wallQuat(side, y) {
  const t = hullTilt(y);
  const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), side > 0 ? -Math.PI / 2 : Math.PI / 2);
  const qz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), side > 0 ? t : -t);
  return qz.multiply(qy);
}

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

// floor stencil decal (transparent plane on deck). 320px canvas: 10 chars at
// size 44 span ~300px and would clip on a 256px canvas (K/R were cut off).
function floorStencil(text, w, l) {
  const c = makeCanvas(320, 128);
  const ctx2d = c.getContext('2d');
  ctx2d.clearRect(0, 0, 320, 128);
  stencilText(ctx2d, text, 160, 64, { size: 44, color: 'rgba(185,154,69,0.75)', spacing: 4 });
  // worn-off patches (kept light so the text still reads)
  const rng = makeRng('stencil' + text);
  ctx2d.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 14; i++) {
    ctx2d.fillStyle = 'rgba(0,0,0,0.4)';
    ctx2d.beginPath();
    ctx2d.arc(rng() * 320, rng() * 128, 2 + rng() * 5, 0, 7);
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
  // dense bundle laid through the tray, dipping between hold-down points
  const traySupportZ = [6.15, 7.65, 9.15, 10.65, 12.15, 13.1, 14.5, 15.95];
  const bundlePath = [z0 + 0.05, ...traySupportZ, z1 - 0.03]
    .map((z) => [ROUTES.portTrayX, ROUTES.portTrayY + 0.012, z]);
  g.add(K.cableBundle(bundlePath, { count: 9, r: 0.011, spread: 0.048, sag: 0.02, seed: 'tray-main' }));
  // overflow cables strapped under the tray, drooping between supports
  // (makes the tray read as full from eye level, where the rail hides the top)
  const underPath = [z0 + 0.1, ...traySupportZ, z1 - 0.06]
    .map((z) => [ROUTES.portTrayX + 0.015, ROUTES.portTrayY - 0.045, z]);
  g.add(K.cableBundle(underPath, { count: 4, r: 0.012, spread: 0.03, sag: 0.05, seed: 'tray-under' }));

  // tray wall brackets: arm under tray to hull + retaining strap over the lip
  for (const zS of traySupportZ) {
    const sup = new THREE.Group();
    sup.userData.static = true;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.014, 0.05), M.galvanized());
    arm.position.set(-1.05, 1.985, zS);
    sup.add(arm);
    // gusset dropping to the hull below the arm's outboard end
    const gusset = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.17, 0.04), M.galvanized());
    gusset.position.set(-1.185, 1.925, zS);
    gusset.rotation.z = -0.62;
    sup.add(gusset);
    // strap clamping the inboard tray lip
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.085, 0.035), M.galvanized());
    strap.position.set(-0.948, 2.028, zS);
    sup.add(strap);
    K.addBolt(new THREE.Vector3(-0.955, 1.976, zS), new THREE.Vector3(0, -1, 0), 'S');
    const tw = hullTilt(1.86);
    K.addBolt(new THREE.Vector3(-Math.cos(tw) * 1.6, 0.86 + Math.sin(tw) * 1.6, zS),
      new THREE.Vector3(Math.cos(tw), -Math.sin(tw), 0), 'M');
    g.add(sup);
  }
  // crown conduit pair with coupling sleeves
  for (const off of [-0.05, 0.05]) {
    g.add(K.pipeRun([[off, ROUTES.crownWireY, z0], [off, ROUTES.crownWireY, z1]], {
      r: 0.016, color: 'dark', flanges: 'none', clampEvery: 1.6, capEnds: false,
    }));
    for (const zC of [7.35, 9.55, 11.85, 14.3, 15.9]) {
      const cpl = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.055, 8), M.galvanized());
      cpl.rotation.x = Math.PI / 2;
      cpl.position.set(off, ROUTES.crownWireY, zC);
      cpl.userData.static = true;
      g.add(cpl);
    }
  }

  // bulkhead penetration collars
  for (const zB of [Z.bulkhead1, Z.bulkhead2]) {
    g.add(bulkheadCollar(bal.x, bal.y, zB, bal.r));
    g.add(bulkheadCollar(cool.x, cool.y, zB, cool.r));
    g.add(bulkheadCollar(pw.x, pw.y, zB, pw.r));
    g.add(bulkheadCollar(ROUTES.portTrayX, ROUTES.portTrayY, zB, 0.06));
  }

  // ===================== corridor fittings (5.9 .. 13.4) =====================
  // valve station on ballast main — in the electrical passage, clear of the
  // washroom alcove (which spans stbd z 11.15..12.5)
  const vs = new THREE.Group();
  vs.position.set(bal.x - 0.06, 0, 13.62);
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
  C.addBox([bal.x - 0.3, 0.2, 13.42], [bal.x + 0.15, 1.3, 13.82], { name: 'valve-station' });

  // spectacle flange (figure-8 blind, spare ring swung inboard) at z 10.55 —
  // the one main stretch left clear of the galley hutches and the washroom
  const zSpec = 10.55;
  const spec = new THREE.Group();
  spec.userData.static = true;
  spec.position.set(bal.x, bal.y, zSpec);
  const specFlGeo = new THREE.CylinderGeometry(0.114, 0.114, 0.026, 16);
  for (const s of [-1, 1]) {
    const fl = new THREE.Mesh(specFlGeo, M.darkSteel());
    fl.rotation.x = Math.PI / 2;
    fl.position.z = s * 0.026;
    spec.add(fl);
  }
  const blind = new THREE.Mesh(new THREE.CylinderGeometry(0.102, 0.102, 0.012, 16), M.safetyOrangePaint());
  blind.rotation.x = Math.PI / 2;
  spec.add(blind);
  const spare = new THREE.Mesh(K.ringPlate(0.05, 0.102, 0.012), M.safetyOrangePaint());
  spare.rotation.x = Math.PI / 2;
  spare.position.x = -0.204;
  spec.add(spare);
  const specWeb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.012), M.safetyOrangePaint());
  specWeb.position.x = -0.1;
  spec.add(specWeb);
  g.add(spec);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.39;
    K.addBolt(new THREE.Vector3(bal.x + Math.cos(a) * 0.1, bal.y + Math.sin(a) * 0.1, zSpec + 0.046), new THREE.Vector3(0, 0, 1), 'M');
    K.addBolt(new THREE.Vector3(bal.x + Math.cos(a) * 0.1, bal.y + Math.sin(a) * 0.1, zSpec - 0.046), new THREE.Vector3(0, 0, -1), 'M');
  }

  // reachable isolation valve on the main at z 9.7, painted wheel + hung tag
  const iso = K.valveAssembly(0.06, { wheelR: 0.1, wheelMat: M.safetyOrangePaint() });
  iso.position.set(bal.x, bal.y, 9.7);
  iso.rotation.z = Math.PI * 0.75; // stem down-inboard so the wheel is in reach
  g.add(iso);
  const isoTag = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.05),
    M.labelMaterial('MBT 2 ISOL', { w: 192, h: 48, size: 24, bg: '#b99a45', fg: '#26261f' }));
  isoTag.position.set(0.915, 1.69, 9.7);
  isoTag.rotation.y = -Math.PI / 2;
  isoTag.userData.static = true;
  g.add(isoTag);
  g.add(K.cableRun([[0.945, 1.8, 9.7], [0.918, 1.72, 9.7]], { r: 0.0035, sag: 0.008, mat: M.bareSteel(), seed: 'isotagwire' }));
  C.addBox([0.84, 1.66, 9.56], [1.17, 2.08, 9.84], { name: 'ballast-iso-valve' });

  // flow-direction bands on the ballast main, arrow tags hung on wires below
  // the pipe (the main sits at the very top of the porthole view frame, so
  // tags on the centerline get cropped; hanging them drops them into frame)
  const bandGeo = new THREE.CylinderGeometry(bal.r + 0.006, bal.r + 0.006, 0.1, 14, 1, true, -Math.PI / 2 - 1.2, 2.4);
  for (const zB of [7.05, 9.35, 14.9]) {
    const band = new THREE.Mesh(bandGeo, M.pipePaint('yellow'));
    band.rotation.x = Math.PI / 2;
    band.position.set(bal.x, bal.y, zB);
    band.userData.static = true;
    g.add(band);
    const arrow = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.048),
      M.labelMaterial('>> FLOOD >>', { w: 224, h: 48, size: 24, bg: '#b99a45', fg: '#26261f' }));
    arrow.position.set(bal.x - 0.032, bal.y - bal.r - 0.033, zB);
    arrow.rotation.y = -Math.PI / 2;
    arrow.userData.static = true;
    g.add(arrow);
    for (const zw of [-0.07, 0.07]) {
      g.add(K.cableRun([[bal.x, bal.y - bal.r + 0.01, zB + zw], [bal.x - 0.03, bal.y - bal.r - 0.012, zB + zw]],
        { r: 0.003, sag: 0.004, mat: M.bareSteel(), seed: 'floww' + zB + zw }));
    }
  }
  // content band + tag on the cooling line, placed to land mid-frame in the
  // porthole view (camera looks at the stbd wall around z 6.9..7.6)
  const coolBand = new THREE.Mesh(
    new THREE.CylinderGeometry(cool.r + 0.005, cool.r + 0.005, 0.08, 12, 1, true, -Math.PI / 2 - 1.2, 2.4),
    M.pipePaint('yellow'));
  coolBand.rotation.x = Math.PI / 2;
  coolBand.position.set(cool.x, cool.y, 7.15);
  coolBand.userData.static = true;
  g.add(coolBand);
  const coolTag = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.044),
    M.labelMaterial('SW COOLING', { w: 192, h: 44, size: 24, bg: '#b99a45', fg: '#26261f' }));
  coolTag.position.set(cool.x - 0.026, cool.y - cool.r - 0.028, 7.15);
  coolTag.rotation.y = -Math.PI / 2;
  coolTag.userData.static = true;
  g.add(coolTag);
  g.add(K.cableRun([[cool.x, cool.y - cool.r + 0.008, 7.15], [cool.x - 0.024, cool.y - cool.r - 0.008, 7.15]],
    { r: 0.003, sag: 0.003, mat: M.bareSteel(), seed: 'coolw' }));

  // junction boxes: flush on the port wall at eye height, each fed visibly
  // (rigid conduit from the tray and/or sagging drip-loop cables into glands)
  const mountJB = (zJ, yJ, label, { w = 0.24, h = 0.3, d = 0.12, conduit = false, drips = [0.3], dip = 0.14, tagSide = false } = {}) => {
    const q = wallQuat(-1, yJ);
    const jb = K.junctionBox(w, h, d, { label, glands: 2, mat: M.machineBlue() });
    jb.position.copy(wallPos(-1, yJ, d / 2 + 0.006, zJ));
    jb.quaternion.copy(q);
    g.add(jb);
    const cx = jb.position;
    for (let i = 0; i < drips.length; i++) {
      const gp = new THREE.Vector3((i % 2 ? 1 : -1) * w / 4, -h / 2 - 0.045, 0).applyQuaternion(q).add(cx);
      const zOff = drips[i];
      g.add(K.cableRun([
        [-1.09, 2.035, zJ + zOff],
        [gp.x + 0.015, gp.y - dip, gp.z + zOff * 0.3],
        [gp.x, gp.y, gp.z],
      ], { r: 0.011, sag: Math.min(0.05, dip * 0.4), seed: 'jbdrip' + label + i }));
    }
    if (conduit) {
      const top = new THREE.Vector3(0, h / 2 + 0.012, 0).applyQuaternion(q).add(cx);
      g.add(K.pipeRun([
        [-1.06, 2.0, zJ],
        [(top.x - 1.28) / 2, (top.y + 2.0) / 2 + 0.02, zJ],
        [top.x, top.y, top.z],
      ], { r: 0.017, color: 'dark', flanges: 'none', cornerR: 0.08, capEnds: false }));
    }
    // readable circuit tag (beside the box when the wall below is taken)
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.048),
      M.labelMaterial(label, { w: 160, h: 44, size: 26, bg: '#3f443f', fg: '#cfccc0' }));
    // side tag goes aft (local -x = world +z on the port wall)
    const tagLocal = tagSide ? new THREE.Vector3(-w / 2 - 0.105, 0, 0.01) : new THREE.Vector3(0, -h / 2 - 0.085, 0.01);
    tag.position.copy(tagLocal.applyQuaternion(q).add(cx));
    tag.quaternion.copy(q);
    g.add(tag);
    C.addBox([-1.52, yJ - h / 2 - 0.06, zJ - w / 2 - 0.03], [cx.x + d / 2 + 0.02, yJ + h / 2 + 0.06, zJ + w / 2 + 0.03], { name: 'jb-' + label });
  };
  // placement: 2B in the clear stretch aft of the bunks, 2C high beside the
  // porthole (clear of the deadlight swing, fwd edge 11.27), DIST 2 right
  // under the tray above the stow cabinet. The old spots at eye height z
  // 12.0..13.2 are buried behind the crew curtain and the fire-hose bundle.
  mountJB(6.32, 1.5, 'JB-2A', { conduit: true, drips: [0.3] });
  mountJB(10.85, 1.52, 'JB-2B', { w: 0.26, h: 0.32, drips: [0.3, 0.55] });
  mountJB(11.06, 1.85, 'JB-2C', { w: 0.18, h: 0.24, d: 0.1, drips: [-0.3], dip: 0.05 });
  mountJB(12.72, 1.78, 'DIST 2', { w: 0.26, h: 0.34, drips: [0.3, -0.35], tagSide: true });

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

  // floor grates over bilge, held down by corner clips
  const clipGeo = new THREE.BoxGeometry(0.055, 0.012, 0.03);
  for (const zG of [6.9, 9.7, 12.5]) {
    const grate = K.floorGrate(0.62, 0.92);
    grate.position.set(0, 0.006, zG);
    g.add(grate);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const clip = new THREE.Mesh(clipGeo, M.darkSteel());
      clip.position.set(sx * 0.318, 0.02, zG + sz * 0.468);
      clip.rotation.y = -sx * sz * Math.PI / 4;
      clip.userData.static = true;
      g.add(clip);
      K.addBolt(new THREE.Vector3(sx * 0.332, 0.027, zG + sz * 0.482), new THREE.Vector3(0, 1, 0), 'S');
    }
  }

  // drainage channel along the starboard deck edge (dark oily gutter)
  const drainL = 7.4, drainZ = (5.95 + 13.35) / 2;
  const drain = new THREE.Group();
  drain.userData.static = true;
  const dBase = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.006, drainL), M.bilge());
  dBase.position.set(0.7, 0.004, drainZ);
  drain.add(dBase);
  for (const dx of [-0.04, 0.04]) {
    const lip = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.02, drainL), M.oilySteel());
    lip.position.set(0.7 + dx, 0.01, drainZ);
    drain.add(lip);
  }
  for (let i = 0; i < 5; i++) {
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.008, 0.2), M.grateSteel());
    cover.position.set(0.7, 0.017, 6.4 + i * 1.55);
    drain.add(cover);
  }
  const sump = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.02, 0.16), M.oilySteel());
  sump.position.set(0.7, 0.012, 13.14);
  drain.add(sump);
  const sumpHole = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.006, 12), M.bilge());
  sumpHole.position.set(0.7, 0.024, 13.14);
  drain.add(sumpHole);
  g.add(drain);

  // overhead transverse braces
  for (const zB of [8.25, 11.0]) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.07, 0.05), M.panelPaint('ribPaint', '#bcb7a6'));
    brace.position.set(0, 2.2, zB);
    brace.userData.static = true;
    brace.receiveShadow = true;
    g.add(brace);
  }

  // overhead lamp feeds: transverse conduits from the port tray over the crown
  // to every lamp, with junction elbows at the drop and clamps to the shell
  const elbowGeo = new THREE.BoxGeometry(0.075, 0.055, 0.075);
  const crossGeo = new THREE.BoxGeometry(0.12, 0.06, 0.08);
  const lampFeed = (xl, z, thin = false) => {
    const pts = [[-1.0, 2.05, z], [-0.72, 2.21, z]];
    if (xl > -0.1) pts.push([-0.3, 2.3, z]);
    pts.push([xl, xl > -0.1 ? 2.3 : 2.29, z], [xl, 2.222, z]);
    g.add(K.pipeRun(pts, {
      r: thin ? 0.011 : 0.016, color: 'dark', flanges: 'none', cornerR: 0.09,
      clampEvery: 0.6, capEnds: false,
    }));
    const elbow = new THREE.Mesh(elbowGeo, M.galvanized());
    elbow.position.set(xl, 2.285, z);
    elbow.userData.static = true;
    elbow.receiveShadow = true;
    g.add(elbow);
    if (xl > 0.1) { // pull box where the run crosses the crown conduit pair
      const cross = new THREE.Mesh(crossGeo, M.galvanized());
      cross.position.set(0, 2.295, z);
      cross.userData.static = true;
      cross.receiveShadow = true;
      g.add(cross);
    }
  };
  lampFeed(0.28, 6.6);
  lampFeed(-0.28, 9.0);
  lampFeed(0.28, 11.4);
  lampFeed(-0.2, 13.1);
  lampFeed(-0.3, 7.8, true);
  lampFeed(0.3, 10.2, true);

  // extinguisher + hose reel
  const ext = K.extinguisher();
  ext.position.set(-1.38, 0.62, 8.62);
  ext.rotation.y = Math.PI / 2;
  g.add(ext);
  const reel = K.hoseReel();
  reel.position.set(1.35, 1.35, 10.9);
  reel.rotation.y = -Math.PI / 2;
  g.add(reel);

  // frame number plates: vertical dark tags riveted to the port rib flanges
  // (were buried in the wall). z 11.25 is a deep web frame (flange further in)
  for (const [zF, n, yP, rr] of [
    [6.75, 'FR 9', 1.6, 1.502], [9.0, 'FR 12', 1.6, 1.502], [11.25, 'FR 15', 1.64, 1.442],
    [14.25, 'FR 19', 1.95, 1.502], [15.75, 'FR 21', 1.95, 1.502],
  ]) {
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.055),
      M.labelMaterial(n, { w: 144, h: 48, size: 28, bg: '#3f443f', fg: '#cfccc0' }));
    const px = -Math.sqrt(Math.max(0, rr * rr - (yP - HULL.axisY) ** 2));
    plate.position.set(px, yP, zF - 0.025);
    plate.lookAt(0, yP, zF - 0.025); // vertical, facing the walkway
    plate.userData.static = true;
    g.add(plate);
    K.addBolt(new THREE.Vector3(px * 0.997, yP + 0.019, zF - 0.025), new THREE.Vector3(-px, 0, 0).normalize(), 'R');
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

  // floor stencils at hatches (kept clear of the bilge grates: 6.44.. / ..12.96)
  const st1 = floorStencil('KEEP CLEAR', 0.78, 0.39);
  st1.position.set(0, 0.016, 6.22);
  st1.rotation.z = Math.PI; // readable walking aft
  g.add(st1);
  const st2 = floorStencil('KEEP CLEAR', 0.78, 0.39);
  st2.position.set(0, 0.016, 13.16);
  st2.rotation.z = Math.PI;
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

  // damage-control station: red tool board flat on the fwd face of bulkhead 2,
  // port of the hatch (the hull wall there is masked by the deep frame flange
  // and the crew curtain, so the flat bulkhead plate is the one readable spot)
  const dc = new THREE.Group();
  dc.userData.static = true;
  dc.position.set(-1.13, 1.4, Z.bulkhead2 - 0.052);
  dc.rotation.y = Math.PI;
  const dcBoard = new THREE.Mesh(K.roundedBox(0.34, 0.4, 0.024, 0.01), M.functionalRedPaint());
  dcBoard.receiveShadow = true;
  dc.add(dcBoard);
  const dcTitle = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.052),
    M.labelMaterial('DAMAGE CONTROL', { w: 384, h: 56, size: 26, bg: '#8e3030', fg: '#d8d4c8' }));
  dcTitle.position.set(0, 0.155, 0.016);
  dc.add(dcTitle);
  // hose wrench on clips (flat silhouette tool)
  const wrShaft = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.24, 0.012), M.gunmetal());
  wrShaft.position.set(-0.075, -0.06, 0.032);
  wrShaft.rotation.z = 0.3;
  dc.add(wrShaft);
  const wrHead = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.011, 6, 12, 4.2), M.gunmetal());
  wrHead.position.set(-0.112, 0.056, 0.032);
  wrHead.rotation.z = 2.2;
  dc.add(wrHead);
  const wrHook = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.045, 0.012), M.gunmetal());
  wrHook.position.set(-0.038, -0.172, 0.032);
  wrHook.rotation.z = 0.85;
  dc.add(wrHook);
  for (const [cy, cx] of [[0.02, -0.099], [-0.12, -0.057]]) {
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.015, 0.024), M.bareSteel());
    clip.position.set(cx, cy, 0.036);
    clip.rotation.z = 0.3;
    dc.add(clip);
  }
  // crowbar on clips
  const cbShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.34, 8), M.bareSteel());
  cbShaft.position.set(0.085, -0.045, 0.034);
  dc.add(cbShaft);
  const cbHook = new THREE.Mesh(new THREE.TorusGeometry(0.023, 0.009, 6, 10, 2.6), M.bareSteel());
  cbHook.position.set(0.064, 0.128, 0.034);
  cbHook.rotation.z = -0.15;
  dc.add(cbHook);
  const cbTip = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.045, 0.007), M.bareSteel());
  cbTip.position.set(0.085, -0.235, 0.034);
  dc.add(cbTip);
  for (const cy of [0.045, -0.145]) {
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.015, 0.026), M.galvanized());
    clip.position.set(0.085, cy, 0.036);
    dc.add(clip);
  }
  g.add(dc);
  // labeled kit box on the deck in the bulkhead corner below the board
  const dcBox = new THREE.Group();
  dcBox.userData.static = true;
  dcBox.position.set(-1.04, 0.105, 13.23);
  const dcBoxBody = new THREE.Mesh(K.roundedBox(0.3, 0.2, 0.24, 0.014), M.functionalRedPaint());
  dcBoxBody.castShadow = true;
  dcBox.add(dcBoxBody);
  const dcBoxLab = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.046),
    M.labelMaterial('DC KIT NO 2', { w: 224, h: 48, size: 22 }));
  dcBoxLab.position.set(0, 0.025, -0.123);
  dcBoxLab.rotation.y = Math.PI;
  dcBox.add(dcBoxLab);
  const dcLatch = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.05, 0.02), M.bareSteel());
  dcLatch.position.set(0, -0.062, -0.124);
  dcBox.add(dcLatch);
  // carry handles on the ends
  for (const sx of [-1, 1]) {
    const becket = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.008, 6, 10, Math.PI), M.bareSteel());
    becket.position.set(sx * 0.152, 0.02, 0);
    becket.rotation.y = Math.PI / 2;
    dcBox.add(becket);
  }
  g.add(dcBox);
  C.addBox([-1.22, 0, 13.08], [-0.86, 0.24, 13.38], { name: 'dc-kit-box' });

  // porthole deadlight latch + label + condensation streak below stbd porthole
  for (const ph of PORTHOLES) {
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.05),
      M.labelMaterial(ph.side > 0 ? 'PORT 2' : 'PORT 3', { w: 128, h: 40, size: 22 }));
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
  // Crown-splash control. A point light parked under the dome glass (old
  // y 1.98) torched the paint straight above it — 1/d^2 with d~0.5 m gave the
  // crown ~17x the deck irradiance — and 7 overlapping warm points washed the
  // whole vault even. Each warm fixture is now a DOWNWARD pool spot (the cone
  // never touches the vault: a wall point above ~1.1 m falls outside the 64
  // degree half-angle) plus a small short-range glow point at the fixture that
  // grazes the grime halo, so the lamp still reads as the source. Dome
  // emissive raised so fixtures read switched on; the paint no longer glows.
  const mkLamp = (x, z, role = 'warm', color = 0xffd9a3, intensity = 4.2, shadow = false) => {
    const fixture = K.lampCage({ r: 0.065, color, intensity: role === 'red' ? 0 : 3.4 });
    fixture.position.set(x, 2.2, z);
    fixture.rotation.x = Math.PI;
    g.add(fixture);
    if (role === 'red') {
      // red practicals stay omni: they are the whole mood in red states
      const light = new THREE.PointLight(color, intensity, 3.9, 2);
      light.position.set(x, 1.72, z);
      g.add(light);
      ctx.lights.register({ light, lampMats: [fixture.userData.lampMat], role });
    } else {
      const glow = new THREE.PointLight(color, Math.min(1.0, 0.3 * intensity), 2.0, 2);
      glow.position.set(x, 1.9, z);
      g.add(glow);
      ctx.lights.register({ light: glow, lampMats: [fixture.userData.lampMat], role });
      const pool = new THREE.SpotLight(color, intensity, 4.8, 1.2, 0.55, 2);
      pool.position.set(x, 1.98, z);
      pool.target.position.set(x * 0.72, 0, z);
      g.add(pool, pool.target);
      ctx.lights.register({ light: pool, role });
      if (shadow) {
        pool.castShadow = true;
        pool.shadow.mapSize.set(512, 512);
        pool.shadow.bias = -0.004;
      }
    }
    // dust/soot halo the fixture has cooked onto the crown right above itself
    g.add(K.hullDecal({ z, thetaCenter: K.hullThetaAtX(x), arc: 0.62, len: 0.72, mat: M.crownGrime() }));
  };
  // staggered brightness: hatch ends anchor the run, mid-tunnel lamps sit low
  // so the vault dips toward shadow between pools
  mkLamp(0.28, 6.6, 'warm', 0xffd9a3, 4.6, true);
  mkLamp(-0.28, 9.0, 'warm', 0xffd9a3, 3.3, false);
  mkLamp(0.28, 11.4, 'warm', 0xffd9a3, 3.3, false);
  mkLamp(-0.2, 13.1, 'warm', 0xffd9a3, 2.2, false);
  mkLamp(-0.3, 7.8, 'red', 0xb03a28, 2.4, false);
  mkLamp(0.3, 10.2, 'red', 0xb03a28, 2.4, false);

  // cool porthole spill (small spots aimed inward)
  for (const ph of PORTHOLES) {
    const spot = new THREE.SpotLight(0x6f97a8, 4.5, 5, 0.7, 0.6, 1.8);
    spot.position.set(ph.side * 2.1, ph.y + 0.3, ph.z);
    spot.target.position.set(0, 0.4, ph.z + 0.4);
    g.add(spot, spot.target);
    ctx.lights.register({ light: spot, role: 'cool' });
  }

  // grime runs bleeding down from crown seams / rib feet on the upper walls,
  // placed in the dim stretches between fixtures where they read as tone
  for (const [side, y, zR, lenR] of [
    [+1, 2.06, 7.95, 0.6], [+1, 1.98, 10.35, 0.55], [+1, 2.04, 12.4, 0.6],
    [-1, 2.14, 8.4, 0.55], [-1, 2.12, 11.05, 0.5], [-1, 1.72, 12.62, 0.5],
  ]) {
    g.add(K.hullDecal({
      z: zR, thetaCenter: K.hullThetaAtY(side, y) + (side > 0 ? -0.09 : 0.09),
      arc: 0.5, len: lenR, mat: M.hullRunGrime(side > 0),
    }));
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

  // dense overhead trays in the electrical passage: stbd tray2 + new port tray3
  const trapeze = (x, z, w) => {
    const t = new THREE.Group();
    t.userData.static = true;
    const chan = new THREE.Mesh(new THREE.BoxGeometry(w, 0.014, 0.045), M.galvanized());
    chan.position.set(x, 2.088, z);
    t.add(chan);
    for (const s of [-1, 1]) {
      const rx = x + s * w / 2;
      const hy = HULL.axisY + Math.sqrt(Math.max(0, HULL.radius ** 2 - rx * rx));
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, hy - 2.09, 6), M.bareSteel());
      rod.position.set(rx, (hy + 2.09) / 2, z);
      t.add(rod);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.014, 8), M.galvanized());
      pad.position.set(rx, hy - 0.02, z);
      t.add(pad);
    }
    g.add(t);
  };
  const tray2 = K.cableTray(3.1, { width: 0.16 });
  tray2.position.set(0.55, 2.12, 15.15);
  g.add(tray2);
  g.add(K.cableBundle(
    [13.66, 14.3, 15.35, 16.35, 16.66].map((z) => [0.55, 2.13, z]),
    { count: 4, r: 0.012, spread: 0.04, sag: 0.016, seed: 'tray2c' }
  ));
  for (const z of [14.3, 15.35, 16.35]) trapeze(0.55, z, 0.2);
  const tray3 = K.cableTray(3.22, { width: 0.16 });
  tray3.position.set(-0.55, 2.12, 15.11);
  g.add(tray3);
  g.add(K.cableBundle(
    [13.54, 13.9, 14.7, 15.6, 16.4, 16.68].map((z) => [-0.55, 2.13, z]),
    { count: 5, r: 0.012, spread: 0.04, sag: 0.018, seed: 'tray3c' }
  ));
  for (const z of [13.9, 14.7, 15.6, 16.4]) trapeze(-0.55, z, 0.2);
  // tray3 bulkhead penetration frame
  const trayPen = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.15, 0.06), M.darkSteel());
  trayPen.position.set(-0.55, 2.11, 13.46);
  trayPen.userData.static = true;
  g.add(trayPen);

  // drops into cabinets (from wall tray + both crown trays, landing on the tops)
  g.add(K.cableRun([[ROUTES.portTrayX, ROUTES.portTrayY - 0.02, 14.35], [-1.06, 1.71, 14.35]], { r: 0.016, sag: 0.04, seed: 'dropsw1' }));
  g.add(K.cableRun([[ROUTES.portTrayX, ROUTES.portTrayY - 0.02, 15.55], [-1.06, 1.71, 15.55]], { r: 0.016, sag: 0.04, seed: 'dropsw2' }));
  for (const [zD, s] of [[14.15, 'a'], [14.55, 'b'], [15.35, 'c'], [15.75, 'd']]) {
    g.add(K.cableRun([[-0.58, 2.12, zD], [-0.82, 1.95, zD], [-1.04, 1.71, zD]], { r: 0.013, sag: 0.045, seed: 'drop3' + s }));
  }
  g.add(K.cableRun([[0.55, 2.09, 14.3], [1.05, 1.49, 14.3]], { r: 0.016, sag: 0.03, seed: 'dropbat' }));
  g.add(K.cableRun([[0.58, 2.1, 14.6], [1.05, 1.49, 14.62]], { r: 0.013, sag: 0.04, seed: 'dropbat2' }));
  g.add(K.cableRun([[0.55, 2.09, 15.5], [1.05, 1.49, 15.5]], { r: 0.016, sag: 0.03, seed: 'dropconv' }));
  g.add(K.cableRun([[0.58, 2.1, 15.78], [1.05, 1.49, 15.76]], { r: 0.013, sag: 0.04, seed: 'dropconv2' }));

  // battery vent duct (galvanized) along the crown, off through bulkhead 2 and
  // aft toward the engine room, with an inline fan housing
  g.add(K.pipeRun([[-0.78, 2.17, Z.bulkhead2 + 0.02], [-0.78, 2.17, 16.78]], {
    r: 0.068, material: M.galvanized(), flanges: [0.12, 0.6, 0.985], clampEvery: 1.3, capEnds: false,
  }));
  g.add(bulkheadCollar(-0.78, 2.17, Z.bulkhead2, 0.068));
  const fan = new THREE.Group();
  fan.userData.static = true;
  fan.position.set(-0.78, 2.17, 16.15);
  const fanBody = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.3, 14), M.galvanized());
  fanBody.rotation.x = Math.PI / 2;
  fanBody.castShadow = true;
  fan.add(fanBody);
  for (const s of [-1, 1]) {
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(s > 0 ? 0.07 : 0.105, s > 0 ? 0.105 : 0.07, 0.07, 14), M.galvanized());
    cone.rotation.x = Math.PI / 2;
    cone.position.z = s * 0.185;
    fan.add(cone);
    const collar = new THREE.Mesh(K.ringPlate(0.068, 0.118, 0.018), M.darkSteel());
    collar.rotation.x = Math.PI / 2;
    collar.position.z = s * 0.145;
    fan.add(collar);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      K.addBolt(new THREE.Vector3(-0.78 + Math.cos(a) * 0.11, 2.17 + Math.sin(a) * 0.11, 16.15 + s * 0.157),
        new THREE.Vector3(0, 0, s), 'S');
    }
  }
  const fanMotor = new THREE.Mesh(K.roundedBox(0.09, 0.08, 0.13, 0.012), M.gunmetal());
  fanMotor.position.set(0.075, -0.075, 0);
  fan.add(fanMotor);
  g.add(fan);
  const fanLab = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.045),
    M.labelMaterial('BATT VENT FAN 1', { w: 224, h: 44, size: 20 }));
  fanLab.position.set(-0.705, 2.05, 16.15);
  fanLab.rotation.y = Math.PI / 2;
  fanLab.rotation.x = -0.28;
  fanLab.userData.static = true;
  g.add(fanLab);

  // lamp feeds in the passage come off tray3
  const aftFeed = (xl, z, thin = false) => {
    g.add(K.pipeRun([[-0.52, 2.14, z], [(xl - 0.6) / 2, 2.29, z], [xl, 2.29, z], [xl, 2.222, z]], {
      r: thin ? 0.01 : 0.013, color: 'gray', flanges: 'none', cornerR: 0.08, clampEvery: 0.55, capEnds: false,
    }));
    const elbow = new THREE.Mesh(elbowGeo, M.galvanized());
    elbow.position.set(xl, 2.278, z);
    elbow.userData.static = true;
    g.add(elbow);
  };
  aftFeed(0.24, 14.6);
  aftFeed(-0.24, 16.2);
  aftFeed(0.0, 15.4, true);

  // HV warning sign: flush on the fwd face of bulkhead 2 beside the hatch
  const hv = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.12),
    M.labelMaterial('DANGER 440V', { w: 256, h: 96, size: 30, bg: '#b99a45', fg: '#26261f' }));
  hv.position.set(-0.78, 1.45, Z.bulkhead2 - 0.045);
  hv.rotation.y = Math.PI;
  hv.userData.static = true;
  g.add(hv);

  // aft passage lighting (kept a touch brighter than the corridor: the glow
  // through bulkhead 2's hatch is the corridor view's depth cue)
  mkLamp(0.24, 14.6, 'warm', 0xffd9a3, 3.9, false);
  mkLamp(-0.24, 16.2, 'warm', 0xffd9a3, 3.3, false);
  mkLamp(0.0, 15.4, 'red', 0xb03a28, 2.6, false);

  return g;
}
