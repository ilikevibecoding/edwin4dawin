// Aft machinery room: propulsion motor, gearbox, shaft line, pumps, compressor,
// cabinets, manifold, heat exchanger, fans, hoist, catwalk, rails, stern gear.
// Owner: aft machinery agent. THE hero compartment.

import * as THREE from 'three';
import { Z, DECK, ROUTES } from './layout.js';
import * as M from './materials.js';
import * as K from './greebles.js';
import * as MC from './machinery.js';
import { makeRng } from './rng.js';

const DY = DECK.engineY; // -0.34
const AXIS_Y = 0.86;     // hull axis height
const PLATE_R = 1.51;    // visual inner plating radius (hull liner)

export function build(ctx) {
  const g = new THREE.Group();
  g.name = 'engineRoom';
  const C = ctx.collision;

  // ---- local helpers ---------------------------------------------------------
  const crownY = (x) => AXIS_Y + Math.sqrt(Math.max(0.01, PLATE_R * PLATE_R - x * x));
  // note a bolt in a group's local frame; MC.emitBolts(g) converts to world later
  const note = (grp, x, y, z, nx, ny, nz, s = 'S') => {
    if (!grp.userData.bolts) grp.userData.bolts = [];
    grp.userData.bolts.push({ p: new THREE.Vector3(x, y, z), n: new THREE.Vector3(nx, ny, nz), s });
  };
  // hanger: strap around a pipe/duct + threaded rod up to the hull crown + pad
  const hangerRod = (x, y, z, pipeR, dir = [0, 0, 1]) => {
    const grp = new THREE.Group();
    grp.userData.static = true;
    const tube = Math.max(0.0065, pipeR * 0.06);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(pipeR + 0.009, tube, 6, 18), M.galvanized());
    strap.position.set(x, y, z);
    strap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...dir).normalize());
    grp.add(strap);
    const top = crownY(x) + 0.012;
    const rodLen = Math.max(0.05, top - (y + pipeR + 0.006));
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0078, 0.0078, rodLen, 8), M.bareSteel());
    rod.position.set(x, y + pipeR + 0.006 + rodLen / 2, z);
    grp.add(rod);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.042, 0.016, 10), M.darkSteel());
    pad.position.set(x, top - 0.006, z);
    pad.rotation.z = -Math.atan2(x, top - AXIS_Y);
    grp.add(pad);
    K.addBolt(new THREE.Vector3(x, y + pipeR + 0.016, z), new THREE.Vector3(0, 1, 0), 'S');
    g.add(grp);
    return grp;
  };
  // small bolted junction box (own build so lid bolts land in world space)
  const jbox = (x, y, z, { w = 0.16, h = 0.2, d = 0.09, label = null, lookAt = null, rotY = 0 } = {}) => {
    const grp = new THREE.Group();
    grp.userData.static = true;
    grp.position.set(x, y, z);
    if (lookAt) grp.lookAt(lookAt[0], lookAt[1], lookAt[2]);
    else grp.rotation.y = rotY;
    const body = new THREE.Mesh(K.roundedBox(w, h, d, 0.012), M.machineBlue());
    body.receiveShadow = true;
    grp.add(body);
    const lid = new THREE.Mesh(K.roundedBox(w * 0.86, h * 0.86, 0.014, 0.008), M.machineBlue());
    lid.position.z = d / 2 + 0.004;
    grp.add(lid);
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      note(grp, sx * w * 0.36, sy * h * 0.36, d / 2 + 0.012, 0, 0, 1, 'S');
    }
    for (const sx of [-w / 4, w / 4]) {
      const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.017, 0.05, 8), M.bareSteel());
      gl.position.set(sx, -h / 2 - 0.02, 0);
      grp.add(gl);
    }
    if (label) {
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.82, h * 0.2), M.labelMaterial(label, { w: 144, h: 36, size: 16 }));
      lab.position.set(0, h * 0.26, d / 2 + 0.013);
      grp.add(lab);
    }
    g.add(grp);
    return grp;
  };

  // ===================== motor + drivetrain (aft, centered) ==================
  const motor = MC.propulsionMotor({ r: 0.56, len: 1.9 });
  motor.position.set(0, DY + 0.62, 20.95);
  g.add(motor);
  // foundation rails under motor
  for (const sx of [-0.45, 0.45]) {
    const found = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 2.6), M.darkSteel());
    found.position.set(sx, DY + 0.11, 21.0);
    found.receiveShadow = true;
    found.userData.static = true;
    g.add(found);
  }
  const dripUnder = MC.dripPan(1.3, 2.3);
  dripUnder.position.set(0, DY + 0.002, 21.0);
  g.add(dripUnder);

  // reduction gear aft of motor
  const gear = MC.reductionGear();
  gear.position.set(0, DY + 0.55, 22.45);
  g.add(gear);
  // coupling guard between motor and gear (half-round orange guard)
  const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.34, 16, 1, false, 0, Math.PI), M.safetyOrangePaint());
  guard.rotation.x = Math.PI / 2;
  guard.rotation.z = Math.PI / 2;
  guard.position.set(0, DY + 0.62, 22.03);
  guard.castShadow = true;
  guard.userData.static = true;
  g.add(guard);
  // shaft from gear into stern gland
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.9, 16), M.bareSteel());
  shaft.rotation.x = Math.PI / 2;
  shaft.position.set(0, DY + 0.55, 23.25);
  shaft.userData.static = true;
  g.add(shaft);
  // stern gland / stuffing box on aft dome
  const gland = new THREE.Group();
  gland.position.set(0, DY + 0.55, 23.62);
  const glandBody = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.3, 16), M.gunmetal());
  glandBody.rotation.x = Math.PI / 2;
  gland.add(glandBody);
  const glandFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.05, 16), M.darkSteel());
  glandFlange.rotation.x = Math.PI / 2;
  glandFlange.position.z = 0.12;
  gland.add(glandFlange);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    K.addBolt(new THREE.Vector3(Math.cos(a) * 0.245, DY + 0.55 + Math.sin(a) * 0.245, 23.47), new THREE.Vector3(0, 0, -1), 'M');
  }
  gland.userData.static = true;
  g.add(gland);
  // stern tube continuing the shaft line into the dome boss
  const sternTube = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.64, 18), M.gunmetal());
  sternTube.rotation.x = Math.PI / 2;
  sternTube.position.set(0, DY + 0.55, 24.08);
  sternTube.receiveShadow = true;
  sternTube.userData.static = true;
  g.add(sternTube);
  const tubeBoss = new THREE.Mesh(K.ringPlate(0.145, 0.25, 0.06, 24), M.darkSteel());
  tubeBoss.rotation.x = Math.PI / 2;
  tubeBoss.position.set(0, DY + 0.55, 24.4);
  tubeBoss.userData.static = true;
  g.add(tubeBoss);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    K.addBolt(new THREE.Vector3(Math.cos(a) * 0.2, DY + 0.55 + Math.sin(a) * 0.2, 24.375), new THREE.Vector3(0, 0, -1), 'M');
  }
  // dome stiffener rings (break up the pale stern void)
  for (const [rr, zz, tt] of [[0.85, 24.41, 0.03], [1.3, 24.15, 0.032]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, tt, 8, 56), M.panelPaint('domeRib', '#9b9889'));
    ring.position.set(0, AXIS_Y, zz);
    ring.receiveShadow = true;
    ring.userData.static = true;
    g.add(ring);
  }
  // gland greaser: brass pot on a bracket, copper line into the packing
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.085, 10), M.brass());
  pot.position.set(0.16, DY + 0.81, 23.5);
  pot.userData.static = true;
  g.add(pot);
  const potCap = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), M.brass());
  potCap.position.set(0.16, DY + 0.856, 23.5);
  potCap.userData.static = true;
  g.add(potCap);
  const potBracket = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.03), M.darkSteel());
  potBracket.position.set(0.16, DY + 0.67, 23.6);
  potBracket.userData.static = true;
  g.add(potBracket);
  g.add(K.pipeRun([[0.16, DY + 0.77, 23.5], [0.14, DY + 0.65, 23.55], [0.1, DY + 0.6, 23.56]], {
    r: 0.011, material: M.copper(), flanges: 'none', cornerR: 0.05,
  }));
  // shaft earthing brush: copper strap around the shaft, bonding lead to a box
  const earthStrap = new THREE.Mesh(new THREE.TorusGeometry(0.093, 0.012, 6, 20), M.copper());
  earthStrap.position.set(0, DY + 0.55, 23.05);
  earthStrap.userData.static = true;
  g.add(earthStrap);
  const brushBox = new THREE.Mesh(K.roundedBox(0.05, 0.07, 0.05, 0.008), M.darkSteel());
  brushBox.position.set(0.075, DY + 0.63, 23.05);
  brushBox.rotation.z = -0.7;
  brushBox.userData.static = true;
  g.add(brushBox);

  // steering rams on the stern dome (port/stbd, angled)
  for (const s of [-1, 1]) {
    const ram = new THREE.Group();
    ram.position.set(s * 0.78, DY + 1.15, 23.15);
    ram.rotation.y = s * 0.5;
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.55, 14), M.machineBlue());
    cyl.rotation.x = Math.PI / 2;
    ram.add(cyl);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.4, 10), M.chrome());
    rod.rotation.x = Math.PI / 2;
    rod.position.z = 0.42;
    ram.add(rod);
    const clevis = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.1), M.darkSteel());
    clevis.position.z = 0.64;
    ram.add(clevis);
    // hose connection block bolted on top of the cylinder rear
    const hblock = new THREE.Mesh(K.roundedBox(0.09, 0.07, 0.1, 0.01), M.darkSteel());
    hblock.position.set(0, 0.1, -0.24);
    ram.add(hblock);
    note(ram, -0.03, 0.138, -0.24, 0, 1, 0, 'S');
    note(ram, 0.03, 0.138, -0.24, 0, 1, 0, 'S');
    for (const fx of [-0.025, 0.025]) {
      const fit = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.04, 8), M.brass());
      fit.position.set(fx, 0.15, -0.24);
      ram.add(fit);
    }
    ram.userData.static = true;
    g.add(ram);
  }
  // hydraulic hoses: ram blocks down to the power-pack manifold (world coords)
  const hppBlock = new THREE.Mesh(K.roundedBox(0.11, 0.09, 0.16, 0.012), M.darkSteel());
  hppBlock.position.set(0.8, DY + 0.69, 22.56);
  hppBlock.userData.static = true;
  g.add(hppBlock);
  for (const [fx, fz] of [[0.77, 22.5], [0.83, 22.5], [0.77, 22.62], [0.83, 22.62]]) {
    const fit = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.035, 8), M.brass());
    fit.position.set(fx, DY + 0.75, fz);
    fit.userData.static = true;
    g.add(fit);
  }
  g.add(K.cableRun([[0.688, DY + 1.31, 22.93], [0.76, DY + 1.05, 22.76], [0.77, DY + 0.78, 22.62]], { r: 0.013, sag: 0.03, mat: M.rubberMat(), seed: 'hyd-s-a' }));
  g.add(K.cableRun([[0.644, DY + 1.31, 22.95], [0.79, DY + 1.1, 22.72], [0.83, DY + 0.78, 22.58]], { r: 0.013, sag: 0.03, mat: M.rubberMat(), seed: 'hyd-s-b' }));
  g.add(K.cableRun([[-0.688, DY + 1.31, 22.93], [-0.3, DY + 0.96, 23.12], [0.25, DY + 0.84, 23.02], [0.77, DY + 0.78, 22.5]], { r: 0.013, sag: 0.035, mat: M.rubberMat(), seed: 'hyd-p-a' }));
  g.add(K.cableRun([[-0.644, DY + 1.31, 22.95], [-0.35, DY + 1.0, 23.18], [0.2, DY + 0.89, 23.08], [0.83, DY + 0.78, 22.55]], { r: 0.013, sag: 0.035, mat: M.rubberMat(), seed: 'hyd-p-b' }));
  // hydraulic power pack (small motor+tank) stbd aft
  const hpp = new THREE.Group();
  hpp.position.set(0.85, DY, 22.5);
  const hppTank = new THREE.Mesh(K.roundedBox(0.36, 0.3, 0.3, 0.02), M.machineBlue());
  hppTank.position.y = 0.5;
  hpp.add(hppTank);
  const hppMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.24, 12), M.gunmetal());
  hppMotor.position.y = 0.75;
  hpp.add(hppMotor);
  const hppBase = new THREE.Mesh(K.roundedBox(0.4, 0.4, 0.34, 0.01), M.darkSteel());
  hppBase.position.y = 0.2;
  hpp.add(hppBase);
  const hppLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.05),
    M.labelMaterial('HYD OIL', { w: 160, h: 48, size: 22 }));
  hppLabel.position.set(-0.185, 0.5, 0);
  hppLabel.rotation.y = -Math.PI / 2;
  hpp.add(hppLabel);
  hpp.userData.static = true;
  g.add(hpp);

  // escape trunk overhead aft: ladder + circular hatch
  const trunk = new THREE.Group();
  trunk.position.set(0, 0, 22.6);
  const trunkRing = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.3, 20, 1, true), M.panelPaint('trunkPaint', '#a7ab9e'));
  trunkRing.position.y = 2.16;
  trunkRing.material.side = THREE.DoubleSide;
  trunk.add(trunkRing);
  const trunkHatch = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 20), M.panelPaint('doorPaint', '#98a091'));
  trunkHatch.position.y = 2.32;
  trunk.add(trunkHatch);
  const trunkWheel = K.doorWheel(0.14);
  trunkWheel.rotation.x = Math.PI / 2;
  trunkWheel.position.y = 2.26;
  trunk.add(trunkWheel);
  // ladder rungs up the aft dome
  for (let i = 0; i < 4; i++) {
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.34, 8), M.bareSteel());
    rung.rotation.z = Math.PI / 2;
    rung.position.set(0, DY + 0.9 + i * 0.32, 23.35 - i * 0.16);
    rung.userData.static = true;
    trunk.add(rung);
  }
  const escLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.06),
    M.labelMaterial('ESCAPE TRUNK', { w: 256, h: 52, size: 24, bg: '#b99a45' }));
  escLabel.position.set(0, 1.95, 22.28);
  escLabel.rotation.x = -0.4;
  trunk.add(escLabel);
  trunk.userData.static = true;
  g.add(trunk);

  // stern equipment stands flanking the shaft line (ground the dome clutter)
  {
    // starboard: gland instruments + shaft earth box
    const postGeo = new THREE.BoxGeometry(0.045, 1.76, 0.045);
    for (const px of [0.29, 0.59]) {
      const post = new THREE.Mesh(postGeo, M.darkSteel());
      post.position.set(px, DY + 0.88, 23.19);
      post.userData.static = true;
      g.add(post);
    }
    const plateS = new THREE.Mesh(K.roundedBox(0.38, 0.62, 0.03, 0.012), M.cabinetGray());
    plateS.position.set(0.44, DY + 1.39, 23.24);
    plateS.rotation.y = Math.PI;
    plateS.receiveShadow = true;
    plateS.userData.static = true;
    g.add(plateS);
    const glandGauge = K.gauge({ r: 0.045, label: 'GLAND', max: 120, value: 0.38 });
    glandGauge.position.set(0.36, DY + 1.6, 23.21);
    glandGauge.rotation.y = Math.PI;
    g.add(glandGauge);
    jbox(0.53, DY + 1.34, 23.2, { w: 0.15, h: 0.18, d: 0.08, label: 'SHAFT EARTH', rotY: Math.PI });
    const plateLab = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.05),
      M.labelMaterial('STERN GLAND', { w: 224, h: 44, size: 20 }));
    plateLab.position.set(0.44, DY + 1.65, 23.222);
    plateLab.rotation.y = Math.PI;
    plateLab.userData.static = true;
    g.add(plateLab);
    // bonding lead from the shaft brush up to the earth box
    g.add(K.cableRun([[0.09, DY + 0.64, 23.05], [0.32, DY + 0.96, 23.18], [0.49, DY + 1.23, 23.2]], { r: 0.006, sag: 0.03, mat: M.copper(), seed: 'earth-lead' }));

    // port: fire hose reel mounted LOW on its stand (below the motor-top
    // sightline from aftWide so it never reads as a floating disc)
    const postGeoP = new THREE.BoxGeometry(0.05, 1.66, 0.05);
    for (const px of [-0.27, -0.57]) {
      const post = new THREE.Mesh(postGeoP, M.darkSteel());
      post.position.set(px, DY + 0.83, 23.19);
      post.userData.static = true;
      g.add(post);
    }
    const plateP = new THREE.Mesh(K.roundedBox(0.4, 0.66, 0.03, 0.012), M.cabinetGray());
    plateP.position.set(-0.42, DY + 1.12, 23.24);
    plateP.rotation.y = Math.PI;
    plateP.receiveShadow = true;
    plateP.userData.static = true;
    g.add(plateP);
    const reelArm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.1), M.darkSteel());
    reelArm.position.set(-0.42, DY + 1.02, 23.18);
    reelArm.userData.static = true;
    g.add(reelArm);
    const reel = K.hoseReel();
    reel.position.set(-0.42, DY + 1.02, 23.11);
    reel.rotation.y = Math.PI;
    g.add(reel);
    // charged hose looping from the fire-main outlet down to the reel nozzle
    g.add(K.cableRun([[-0.6, 1.0, 23.22], [-0.66, 0.74, 23.1], [-0.54, 0.57, 23.05]], { r: 0.013, sag: 0.05, mat: M.rubberMat(), seed: 'fire-hose' }));
    const reelLab = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.05),
      M.labelMaterial('FIRE HOSE', { w: 192, h: 44, size: 20, bg: '#8e3030', fg: '#d8d4c8' }));
    reelLab.position.set(-0.42, DY + 1.38, 23.222);
    reelLab.rotation.y = Math.PI;
    reelLab.userData.static = true;
    g.add(reelLab);
    // aft lighting junction on the stand, fed from the port wall conduit
    jbox(-0.57, DY + 1.52, 23.16, { w: 0.13, h: 0.16, d: 0.08, label: 'LTG STN', rotY: Math.PI });
    g.add(K.cableRun([[-1.31, 1.6, 22.98], [-1.02, 1.44, 23.1], [-0.61, 1.09, 23.12]], { r: 0.008, sag: 0.05, seed: 'stern-ltg' }));
  }

  // big collision block for the drivetrain
  C.addBox([-0.85, DY, 20.05], [0.85, 2.2, 23.6], { name: 'motor-block' });

  // ===================== port side: manifold, pumps, HX ======================
  // ballast/trim manifold: header + drops built in world space (flange bolts),
  // valves/gauges/labels in a positioned group
  g.add(K.pipeRun([[-0.98, DY + 1.05, 17.62], [-0.98, DY + 1.05, 18.98]], { r: 0.07, color: 'green', flanges: 'ends', capEnds: true }));
  const manifold = new THREE.Group();
  manifold.position.set(-0.98, DY, 18.3);
  const rngMan = makeRng('manifold');
  for (let i = 0; i < 3; i++) {
    const zOff = -0.42 + i * 0.42;
    const zW = 18.3 + zOff;
    const vv = K.valveAssembly(0.048, {});
    vv.position.set(0.06, 1.05, zOff);
    vv.rotation.z = -Math.PI / 2 + 0.35; // wheels toward walkway
    manifold.add(vv);
    g.add(K.pipeRun([[-0.98, DY + 0.98, zW], [-0.98, DY + 0.39, zW], [-1.22, DY + 0.22, zW]], {
      r: 0.048, color: 'green', flanges: [0.94], cornerR: 0.09, capEnds: true,
    }));
    const gg = K.gauge({ r: 0.05, label: 'BAR', max: 16, value: 0.3 + rngMan() * 0.3 });
    gg.position.set(0.13, 1.38, zOff);
    gg.rotation.y = Math.PI / 2 - 0.3;
    manifold.add(gg);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.045),
      M.labelMaterial(['MBT AFT', 'TRIM AFT', 'BILGE'][i], { w: 160, h: 44, size: 20 }));
    lab.position.set(0.16, 0.78, zOff);
    lab.rotation.y = Math.PI / 2;
    manifold.add(lab);
    // flow tag on the header (walkway side of the pipe)
    const flow = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.042),
      M.labelMaterial(['MBT AFT >>', 'TRIM >>', '<< BILGE'][i], { w: 176, h: 40, size: 17, bg: '#6f7d6d', fg: '#d8d4c8' }));
    flow.position.set(-0.906, DY + 1.05, zW);
    flow.rotation.y = Math.PI / 2;
    flow.userData.static = true;
    g.add(flow);
  }
  manifold.userData.static = false; // gauges animate
  g.add(manifold);
  // drip tray under the manifold
  const manTray = MC.dripPan(0.42, 1.5);
  manTray.position.set(-0.87, DY + 0.002, 18.3);
  g.add(manTray);
  C.addBox([-1.25, DY, 17.55], [-0.62, 1.75, 19.05], { name: 'manifold' });

  // two pumps on the port side
  const pumpA = MC.pump({ scale: 1.0, seed: 'pumpA' });
  pumpA.position.set(-0.85, DY, 19.55);
  pumpA.rotation.y = Math.PI / 2;
  g.add(pumpA);
  const pumpB = MC.pump({ scale: 0.8, seed: 'pumpB' });
  pumpB.position.set(-0.88, DY + 0.42, 19.55);
  pumpB.rotation.y = Math.PI / 2;
  g.add(pumpB);
  C.addBox([-1.2, DY, 19.1], [-0.58, 1.0, 20.0], { name: 'pumps' });
  // pump discharge rises and lands on the heat-exchanger inlet nozzle
  g.add(K.pipeRun([[-0.85, DY + 0.6, 19.75], [-0.85, DY + 1.64, 19.75], [-0.9, DY + 1.86, 19.32], [-0.92, DY + 1.86, 18.84]], {
    r: 0.045, color: 'gray', flanges: [0.3, 0.68], cornerR: 0.15, capEnds: true,
  }));

  // heat exchanger above pumps, hung from the hull on straps
  const hx = MC.heatExchanger({ r: 0.14, len: 1.05 });
  hx.position.set(-0.92, DY + 1.62, 18.5);
  hx.rotation.y = Math.PI / 2;
  g.add(hx);
  for (const dz of [18.2, 18.8]) {
    const hang = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.5, 0.05), M.galvanized());
    hang.position.set(-1.15, DY + 1.95, dz);
    hang.rotation.z = 0.45;
    hang.userData.static = true;
    g.add(hang);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.014, 6, 18, Math.PI), M.galvanized());
    strap.position.set(-0.92, DY + 1.62, dz);
    strap.rotation.y = Math.PI / 2;
    strap.rotation.z = Math.PI;
    strap.userData.static = true;
    g.add(strap);
  }
  // HX outlet: short overboard-discharge leg into the port hull plating
  g.add(K.pipeRun([[-0.92, DY + 1.86, 18.16], [-1.02, DY + 2.06, 17.98], [-1.22, DY + 2.1, 17.82]], {
    r: 0.045, color: 'gray', flanges: [0.55, 0.94], cornerR: 0.12, capEnds: true,
  }));

  // expansion tank upper port aft with sight glass
  const expTank = new THREE.Group();
  expTank.position.set(-0.8, DY + 1.9, 20.6);
  const tk = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.3, 6, 14), M.pipePaint('gray'));
  tk.rotation.z = Math.PI / 2;
  expTank.add(tk);
  const sg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 8), M.glassInstrument());
  sg.position.set(0, -0.12, 0.12);
  expTank.add(sg);
  expTank.userData.static = true;
  g.add(expTank);

  // ---- port aft: steering-hydraulics cabinet, wall conduit, sea line --------
  const cab3 = MC.electricalCabinet({ w: 0.6, h: 1.2, d: 0.36, title: 'STEER HYD', kind: 'mimic', seed: 'steerhyd', lampColors: ['#79c98d', '#8e3030'] });
  cab3.position.set(-0.88, DY, 21.45);
  cab3.rotation.y = Math.PI / 2;
  g.add(cab3);
  C.addBox([-1.14, DY, 21.12], [-0.6, 0.92, 21.78], { name: 'steer-cab' });
  // conduit run along the port plating with a junction box + drop to the cabinet
  g.add(K.pipeRun([[-1.33, 1.62, 20.55], [-1.33, 1.62, 22.95]], {
    r: 0.016, material: M.galvanized(), flanges: 'none', clampEvery: 0.8, capEnds: true,
  }));
  jbox(-1.263, 1.582, 22.0, { w: 0.15, h: 0.19, d: 0.09, label: 'LTG AFT', lookAt: [-0.395, 1.086, 22.0] });
  g.add(K.cableRun([[-1.3, 1.6, 21.45], [-1.05, 1.15, 21.45], [-0.9, 0.9, 21.45]], { r: 0.012, sag: 0.04, seed: 'cab3-drop' }));
  // sea-water line feeding the aft fire main / hose reel
  g.add(K.pipeRun([[-1.4, 1.3, 20.9], [-1.4, 1.3, 22.5], [-0.95, 1.1, 22.95], [-0.6, 1.0, 23.27]], {
    r: 0.04, color: 'green', flanges: [0.02], clampEvery: 0.8, cornerR: 0.14, capEnds: true,
  }));
  const seaValveP = K.valveAssembly(0.04, { wheelR: 0.07 });
  seaValveP.position.set(-1.4, 1.3, 21.8);
  seaValveP.rotation.z = -0.85;
  g.add(seaValveP);
  const seaLabP = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.045),
    M.labelMaterial('FIRE MAIN >>', { w: 192, h: 40, size: 17, bg: '#8e3030', fg: '#d8d4c8' }));
  seaLabP.position.set(-1.352, 1.3, 22.2);
  seaLabP.rotation.y = Math.PI / 2;
  seaLabP.userData.static = true;
  g.add(seaLabP);
  // dress the steering cabinet's forward flank (faces the closeup camera)
  const cabVent = K.ventGrille(0.3, 0.16);
  cabVent.position.set(-0.88, DY + 0.32, 21.135);
  cabVent.rotation.y = Math.PI;
  g.add(cabVent);
  const cabSideLab = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.055),
    M.labelMaterial('HPU 2  440V', { w: 208, h: 48, size: 19 }));
  cabSideLab.position.set(-0.88, DY + 0.92, 21.138);
  cabSideLab.rotation.y = Math.PI;
  cabSideLab.userData.static = true;
  g.add(cabSideLab);
  // access cover leaning against the cabinet (maintenance in progress)
  {
    const lean = new THREE.Group();
    lean.position.set(-0.9, DY + 0.325, 21.7);
    lean.rotation.set(-0.15, 0.06, 0);
    const panelMesh = new THREE.Mesh(K.roundedBox(0.46, 0.66, 0.02, 0.01), M.cabinetGray());
    panelMesh.castShadow = true;
    lean.add(panelMesh);
    note(lean, -0.19, 0.27, 0.012, 0, 0, 1, 'S');
    note(lean, 0.19, 0.27, 0.012, 0, 0, 1, 'S');
    note(lean, -0.19, -0.27, 0.012, 0, 0, 1, 'S');
    note(lean, 0.19, -0.27, 0.012, 0, 0, 1, 'S');
    const leanLab = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.05),
      M.labelMaterial('BILGE ACCESS', { w: 192, h: 44, size: 18 }));
    leanLab.position.set(0, 0.1, 0.012);
    lean.add(leanLab);
    const leanHandle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.025), M.bareSteel());
    leanHandle.position.set(0, -0.08, 0.02);
    lean.add(leanHandle);
    lean.userData.static = true;
    g.add(lean);
    C.addBox([-1.12, DY, 21.6], [-0.68, 0.35, 21.95], { name: 'lean-panel' });
  }

  // ===================== starboard side: compressor, cabinets, tools =========
  const comp = MC.compressor();
  comp.position.set(0.92, DY, 18.35);
  comp.rotation.y = -Math.PI / 2;
  g.add(comp);
  C.addBox([0.6, DY, 17.85], [1.25, 0.95, 18.85], { name: 'compressor' });

  const cab1 = MC.electricalCabinet({ w: 0.62, h: 1.45, d: 0.4, title: 'PROP CTRL', kind: 'mimic', seed: 'propctl', lampColors: ['#79c98d', '#d8a04c', '#8e3030'] });
  cab1.position.set(0.98, DY, 19.55);
  cab1.rotation.y = -Math.PI / 2;
  g.add(cab1);
  const cab2 = MC.electricalCabinet({ w: 0.62, h: 1.45, d: 0.4, title: 'AUX DIST', kind: 'breakers', seed: 'auxdist' });
  cab2.position.set(0.98, DY, 20.25);
  cab2.rotation.y = -Math.PI / 2;
  g.add(cab2);
  C.addBox([0.72, DY, 19.2], [1.3, 1.55, 20.6], { name: 'aft-cabinets' });

  const tools = MC.toolCabinet();
  tools.position.set(0.95, DY, 17.35);
  tools.rotation.y = -Math.PI / 2 - 0.15;
  g.add(tools);
  C.addBox([0.62, DY, 17.0], [1.3, 1.0, 17.75], { name: 'tool-cab' });
  // maintenance props on the tool cabinet top (local coords, inherit rotation)
  {
    const gg = new THREE.Group();
    gg.position.set(0.1, 0.962, 0.02);
    gg.rotation.y = 0.6;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.22, 12), M.gunmetal());
    body.rotation.z = Math.PI / 2;
    gg.add(body);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.035, 12), M.gunmetal());
    head.rotation.z = Math.PI / 2;
    head.position.x = -0.125;
    gg.add(head);
    const rodG = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 8), M.bareSteel());
    rodG.rotation.z = Math.PI / 2;
    rodG.position.x = 0.165;
    gg.add(rodG);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.014, 0.06), M.bakelite());
    grip.position.x = 0.225;
    gg.add(grip);
    const hose = K.cableRun([[-0.125, -0.012, 0.01], [-0.19, 0.0, 0.06], [-0.11, -0.005, 0.1]], { r: 0.006, sag: 0.012, mat: M.rubberMat(), seed: 'ggun-hose' });
    gg.add(hose);
    gg.userData.static = true;
    tools.add(gg);
    // oil can
    const can = new THREE.Group();
    can.position.set(-0.17, 0.93, 0.09);
    const canBody = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.045, 0.07, 14), M.galvanized());
    canBody.position.y = 0.035;
    can.add(canBody);
    const canCone = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.042, 0.05, 12), M.galvanized());
    canCone.position.y = 0.095;
    can.add(canCone);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.007, 0.13, 8), M.galvanized());
    spout.position.set(0.04, 0.155, 0);
    spout.rotation.z = -0.85;
    can.add(spout);
    const canHandle = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.005, 6, 14), M.galvanized());
    canHandle.position.set(-0.045, 0.09, 0);
    canHandle.rotation.y = Math.PI / 2;
    can.add(canHandle);
    can.userData.static = true;
    tools.add(can);
  }

  // sea-suction line with valve along the starboard plating, into the stern stand
  g.add(K.pipeRun([[1.43, 1.32, 20.62], [1.37, 1.33, 21.0], [1.37, 1.33, 22.3], [1.02, 1.3, 22.95], [0.6, 1.28, 23.27]], {
    r: 0.05, color: 'green', flanges: [0.02], clampEvery: 0.8, cornerR: 0.16, capEnds: true,
  }));
  const seaValveS = K.valveAssembly(0.05, {});
  seaValveS.position.set(1.37, 1.33, 21.55);
  seaValveS.rotation.z = 0.85;
  g.add(seaValveS);
  const seaGauge = K.gauge({ r: 0.05, label: 'SW BAR', max: 10, value: 0.35 });
  seaGauge.position.set(1.26, 1.63, 21.55);
  seaGauge.lookAt(0.6, 1.1, 21.55);
  g.add(seaGauge);
  const seaGB = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.06), M.darkSteel());
  seaGB.position.set(1.29, 1.65, 21.55);
  seaGB.userData.static = true;
  g.add(seaGB);
  const seaLabS = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.045),
    M.labelMaterial('SEA SUCTION >>', { w: 208, h: 40, size: 16, bg: '#6f7d6d', fg: '#d8d4c8' }));
  seaLabS.position.set(1.315, 1.33, 21.9);
  seaLabS.rotation.y = -Math.PI / 2;
  seaLabS.userData.static = true;
  g.add(seaLabS);

  // ===================== overhead systems ====================================
  // route pipes entering from the electrical passage and crossing to machines
  const bal = ROUTES.stbdBallast;
  g.add(K.pipeRun([
    [bal.x, bal.y, Z.frameRing - 0.05], [bal.x, bal.y, 17.5], [0.4, DY + 2.16, 17.9], [-0.6, DY + 1.86, 18.1], [-0.98, DY + 1.26, 18.25], [-0.98, DY + 1.13, 18.3],
  ], { r: 0.065, color: 'green', flanges: [0.2, 0.55, 0.85], cornerR: 0.16, capEnds: true }));
  const cool = ROUTES.stbdCool;
  g.add(K.pipeRun([
    [cool.x, cool.y, Z.frameRing - 0.05], [cool.x, cool.y, 17.9], [0.6, DY + 2.0, 18.35], [-0.35, DY + 1.98, 18.5], [-0.78, DY + 1.62, 18.5],
  ], { r: cool.r, color: 'gray', flanges: [0.3, 0.7], cornerR: 0.13, capEnds: true }));
  // copper HP-air line: hugs the port wall aft, crosses the crown just forward
  // of fan 1, then dives down the starboard plating onto the compressor head.
  // (Kept well clear of the engineRoom hero camera at (0.42, 1.28, 17.45).)
  const pa = ROUTES.portAir;
  g.add(K.pipeRun([
    [pa.x, pa.y, Z.frameRing - 0.05], [pa.x, pa.y, 17.85], [-1.24, DY + 1.9, 18.4], [-0.5, DY + 2.28, 18.46], [0.45, DY + 2.24, 18.44], [1.12, DY + 1.78, 18.36], [1.3, DY + 1.26, 18.28], [1.04, DY + 0.78, 18.26], [0.92, DY + 0.62, 18.23],
  ], { r: pa.r, material: M.copper(), flanges: 'none', cornerR: 0.1, capEnds: true }));
  // hangers wherever runs cross open air
  hangerRod(-0.05, DY + 2.262, 18.45, 0.022, [1, -0.04, 0]);
  hangerRod(0.78, DY + 2.013, 18.4, 0.022, [0.82, -0.56, 0]);
  hangerRod(0.3, DY + 2.13, 17.92, 0.065, [-1, -0.3, 0.2]);
  hangerRod(0.457, DY + 1.997, 18.372, 0.048, [-1, -0.02, 0.16]);
  // oil day tank + copper lines to gear
  const dayTank = new THREE.Group();
  dayTank.position.set(0.72, DY + 1.95, 21.3);
  const dt = new THREE.Mesh(K.roundedBox(0.3, 0.34, 0.24, 0.02), M.pipePaint('yellow'));
  dayTank.add(dt);
  const dtLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.05),
    M.labelMaterial('LUB OIL', { w: 192, h: 48, size: 22 }));
  dtLabel.position.set(0, -0.05, 0.125);
  dayTank.add(dtLabel);
  // mounting straps to the hull
  for (const dz of [-0.08, 0.08]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.035, 0.03), M.galvanized());
    strap.position.set(0.24, 0.06, dz);
    strap.rotation.z = 0.62;
    dayTank.add(strap);
  }
  const dtSight = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.2, 8), M.glassInstrument());
  dtSight.position.set(-0.13, -0.06, 0.13);
  dayTank.add(dtSight);
  dayTank.userData.static = true;
  g.add(dayTank);
  g.add(K.pipeRun([[0.72, DY + 1.78, 21.3], [0.6, DY + 1.2, 21.9], [0.25, DY + 0.9, 22.35]], {
    r: 0.016, material: M.copper(), flanges: 'none', cornerR: 0.09, capEnds: true,
  }));

  // fans in duct rings at the crown
  for (const [zF, speed] of [[18.7, 7], [20.1, -5.5]]) {
    const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.22, 20, 1, true), M.galvanized());
    duct.rotation.x = Math.PI / 2;
    duct.position.set(0, DY + 2.42, zF);
    duct.material.side = THREE.DoubleSide;
    duct.userData.static = true;
    g.add(duct);
    const fan = K.axialFan(0.16, { blades: 6, speed });
    fan.position.set(0, DY + 2.42, zF);
    g.add(fan);
  }
  // ventilation trunking: forward stub off fan 1, long aft run off fan 2
  {
    const ductMat = M.galvanized();
    const collarGeo = K.ringPlate(0.185, 0.216, 0.05, 30);
    // forward stub toward the electrical passage
    g.add(K.pipeRun([[0, DY + 2.42, 18.58], [0, DY + 2.49, 17.95], [0, DY + 2.49, 17.32]], {
      r: 0.19, material: ductMat, flanges: 'none', cornerR: 0.25, capEnds: false, radialSegments: 14,
    }));
    for (const [cy, cz] of [[DY + 2.42, 18.59], [DY + 2.42, 20.23]]) {
      const collar = new THREE.Mesh(collarGeo, ductMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, cy, cz);
      collar.userData.static = true;
      g.add(collar);
    }
    const fRing = new THREE.Mesh(K.ringPlate(0.15, 0.216, 0.04, 30), ductMat);
    fRing.rotation.x = Math.PI / 2;
    fRing.position.set(0, DY + 2.49, 17.33);
    fRing.userData.static = true;
    g.add(fRing);
    const fGrille = K.ventGrille(0.36, 0.36);
    fGrille.position.set(0, DY + 2.49, 17.32);
    fGrille.rotation.y = Math.PI;
    g.add(fGrille);
    hangerRod(0, DY + 2.49, 17.62, 0.195, [0, 0, 1]);
    // aft run: over the motor, dodging the escape trunk, ends in a down register
    g.add(K.pipeRun([[0, DY + 2.42, 20.25], [0.28, DY + 2.4, 20.9], [0.5, DY + 2.34, 21.9], [0.55, DY + 2.19, 22.7], [0.55, DY + 1.96, 23.0], [0.55, DY + 1.72, 23.06]], {
      r: 0.19, material: ductMat, flanges: 'none', cornerR: 0.28, capEnds: false, radialSegments: 14,
    }));
    hangerRod(0.368, DY + 2.376, 21.3, 0.195, [0.21, -0.06, 0.97]);
    hangerRod(0.525, DY + 2.265, 22.3, 0.195, [0.06, -0.18, 0.98]);
    const aRing = new THREE.Mesh(K.ringPlate(0.14, 0.21, 0.035, 30), ductMat);
    aRing.position.set(0.55, DY + 1.74, 23.06);
    aRing.userData.static = true;
    g.add(aRing);
    const aGrille = K.ventGrille(0.34, 0.34);
    aGrille.position.set(0.55, DY + 1.7, 23.06);
    aGrille.rotation.x = Math.PI / 2;
    g.add(aGrille);
  }
  // lagged vent silencer along the port crown (silhouette layering over motor)
  {
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.3, 22), M.pipePaint('white'));
    shell.rotation.x = Math.PI / 2;
    shell.position.set(-0.45, DY + 2.36, 21.55);
    shell.castShadow = true; shell.receiveShadow = true;
    shell.userData.static = true;
    g.add(shell);
    for (const [s, zc] of [[-1, 20.85], [1, 22.25]]) {
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.15, 0.11, 22), M.galvanized());
      cone.rotation.x = s < 0 ? -Math.PI / 2 : Math.PI / 2;
      cone.position.set(-0.45, DY + 2.36, zc);
      cone.userData.static = true;
      g.add(cone);
    }
    // lagging bands
    for (const zb of [21.05, 21.55, 22.05]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.153, 0.008, 6, 24), M.galvanized());
      band.position.set(-0.45, DY + 2.36, zb);
      band.userData.static = true;
      g.add(band);
    }
    // intake elbow into the crown plating
    g.add(K.pipeRun([[-0.45, DY + 2.36, 20.82], [-0.46, DY + 2.48, 20.62], [-0.5, DY + 2.64, 20.5]], {
      r: 0.05, color: 'dark', flanges: [0.9], cornerR: 0.09, capEnds: true,
    }));
    // capped spare port aft (blind flange)
    const stubA = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.07, 14), M.pipePaint('dark'));
    stubA.rotation.x = Math.PI / 2;
    stubA.position.set(-0.45, DY + 2.36, 22.34);
    stubA.userData.static = true;
    g.add(stubA);
    const blind = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.028, 16), M.darkSteel());
    blind.rotation.x = Math.PI / 2;
    blind.position.set(-0.45, DY + 2.36, 22.39);
    blind.userData.static = true;
    g.add(blind);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      K.addBolt(new THREE.Vector3(-0.45 + Math.cos(a) * 0.065, DY + 2.36 + Math.sin(a) * 0.065, 22.405), new THREE.Vector3(0, 0, 1), 'S');
    }
    hangerRod(-0.45, DY + 2.36, 21.15, 0.155, [0, 0, 1]);
    hangerRod(-0.45, DY + 2.36, 21.95, 0.155, [0, 0, 1]);
    const silLab = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.05),
      M.labelMaterial('VENT SILENCER', { w: 224, h: 44, size: 18 }));
    silLab.position.set(-0.295, DY + 2.36, 21.5);
    silLab.rotation.y = Math.PI / 2;
    silLab.userData.static = true;
    g.add(silLab);
  }

  // chain hoist on I-beam above motor (tucked to the crown, clear of fans)
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 2.7), M.gunmetal());
  beam.position.set(0, DY + 2.69, 20.85);
  beam.userData.static = true;
  g.add(beam);
  for (const dz of [-1.32, 1.32]) {
    const endPlate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.06), M.hazardStripe());
    endPlate.position.set(0, DY + 2.69, 20.85 + dz);
    endPlate.userData.static = true;
    g.add(endPlate);
  }
  const trolley = new THREE.Mesh(K.roundedBox(0.18, 0.14, 0.22, 0.02), M.darkSteel());
  trolley.position.set(0, DY + 2.61, 20.75);
  trolley.userData.static = true;
  g.add(trolley);
  // chain: small torus links instanced
  const linkGeo = new THREE.TorusGeometry(0.02, 0.006, 5, 10);
  const chain = new THREE.InstancedMesh(linkGeo, M.bareSteel(), 26);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < 26; i++) {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (i % 2) * Math.PI / 2);
    m4.compose(new THREE.Vector3(0, DY + 2.53 - i * 0.033, 20.75), q, new THREE.Vector3(1, 1, 1));
    chain.setMatrixAt(i, m4);
  }
  chain.instanceMatrix.needsUpdate = true;
  chain.userData.static = true;
  g.add(chain);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 8, 14, Math.PI * 1.5), M.bareSteel());
  hook.position.set(0, DY + 1.65, 20.75);
  hook.rotation.z = Math.PI * 0.75;
  hook.userData.static = true;
  g.add(hook);

  // cable trays dropping into cabinets, extended aft to feed the motor
  const tray = K.cableTray(2.6, { width: 0.15 });
  tray.position.set(0.62, DY + 2.3, 18.6);
  g.add(tray);
  const tray2 = K.cableTray(1.9, { width: 0.15 });
  tray2.position.set(0.62, DY + 2.3, 20.87);
  g.add(tray2);
  g.add(K.cableBundle([[0.62, DY + 2.27, 17.4], [0.62, DY + 2.27, 21.7]], { count: 3, r: 0.013, spread: 0.04, sag: 0.012, seed: 'er-tray' }));
  g.add(K.cableRun([[0.62, DY + 2.27, 19.55], [0.98, DY + 1.5, 19.55]], { r: 0.015, sag: 0.03, seed: 'drop-cab1' }));
  g.add(K.cableRun([[0.62, DY + 2.27, 20.25], [0.98, DY + 1.5, 20.25]], { r: 0.015, sag: 0.03, seed: 'drop-cab2' }));
  // three feeder cables drop from the tray into the motor terminal-box glands
  for (let i = 0; i < 3; i++) {
    const gx = -0.11 + i * 0.11;
    g.add(K.cableRun(
      [[0.62, DY + 2.27, 20.32 + i * 0.06], [0.4, DY + 2.02, 20.46 + i * 0.04], [gx + 0.03, DY + 1.74, 20.59], [gx, DY + 1.56, 20.608]],
      { r: 0.018, sag: 0.04, mat: i === 1 ? M.rubberMat() : M.plasticBlack(), seed: 'motor-power' + i }
    ));
  }

  // ===================== catwalk, rails, signage =============================
  // catwalk grating strip down the center
  for (let zG = 17.9; zG < 19.9; zG += 0.95) {
    const grate = K.floorGrate(0.78, 0.92);
    grate.position.set(0, DY + 0.012, zG + 0.45);
    g.add(grate);
  }
  // kick plates along catwalk
  for (const s of [-1, 1]) {
    const kick = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 2.4), M.hazardStripe());
    kick.position.set(s * 0.42, DY + 0.05, 19.0);
    kick.userData.static = true;
    g.add(kick);
  }
  // guardrail across at motor front + flanking rails
  g.add(K.handrail(
    [[-0.52, DY + 1.0, 19.9], [0.0, DY + 1.0, 19.98], [0.52, DY + 1.0, 19.9]],
    { r: 0.021, stanchionEvery: 0.5, baseY: DY }
  ));
  g.add(K.handrail([[-0.5, DY + 1.0, 18.6], [-0.5, DY + 1.0, 19.85]], { r: 0.019, stanchionEvery: 0.65, baseY: DY }));
  g.add(K.handrail([[0.5, DY + 1.0, 18.9], [0.5, DY + 1.0, 19.85]], { r: 0.019, stanchionEvery: 0.65, baseY: DY }));
  // mid-rails
  g.add(K.handrail([[-0.5, DY + 0.55, 18.6], [-0.5, DY + 0.55, 19.85]], { r: 0.014, stanchionEvery: 0, baseY: DY }));
  g.add(K.handrail([[0.5, DY + 0.55, 18.9], [0.5, DY + 0.55, 19.85]], { r: 0.014, stanchionEvery: 0, baseY: DY }));
  C.addBox([-0.56, DY, 19.82], [0.56, DY + 1.05, 20.02], { name: 'rail-motor' });
  C.addBox([-0.54, DY, 18.55], [-0.46, DY + 1.05, 19.9], { name: 'rail-port' });
  C.addBox([0.46, DY, 18.85], [0.54, DY + 1.05, 19.9], { name: 'rail-stbd' });
  // clipboard hung on the starboard rail
  {
    const hookRing = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 6, 14), M.bareSteel());
    hookRing.position.set(0.5, DY + 1.0, 19.35);
    hookRing.userData.static = true;
    g.add(hookRing);
    const board = new THREE.Mesh(K.roundedBox(0.2, 0.28, 0.012, 0.006), M.bakelite());
    board.position.set(0.505, DY + 0.86, 19.35);
    board.rotation.y = -Math.PI / 2;
    board.userData.static = true;
    g.add(board);
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.24),
      M.labelMaterial('MACHY LOG', { w: 176, h: 240, size: 26, bg: '#c9c3b0' }));
    paper.position.set(0.497, DY + 0.85, 19.35);
    paper.rotation.y = -Math.PI / 2;
    paper.userData.static = true;
    g.add(paper);
    const clip = new THREE.Mesh(K.roundedBox(0.06, 0.025, 0.02, 0.006), M.bareSteel());
    clip.position.set(0.503, DY + 0.985, 19.35);
    clip.rotation.y = -Math.PI / 2;
    clip.userData.static = true;
    g.add(clip);
  }
  // shop rag draped over the port rail (pale cloth, hangs mostly down)
  {
    const ragMat = M.fabricSheet();
    const top = new THREE.Mesh(K.roundedBox(0.11, 0.012, 0.075, 0.005), ragMat);
    top.position.set(-0.5, DY + 1.008, 19.19);
    top.rotation.y = 0.18;
    top.userData.static = true;
    g.add(top);
    for (const [zz, rx, drop] of [[19.152, -1.42, 0.1], [19.228, 1.42, 0.075]]) {
      const side = new THREE.Mesh(K.roundedBox(0.11, 0.01, drop * 2, 0.004), ragMat);
      side.position.set(-0.5, DY + 0.94 - drop * 0.3, zz);
      side.rotation.x = rx;
      side.rotation.y = 0.18;
      side.userData.static = true;
      g.add(side);
    }
  }

  // signage
  const sign1 = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.09),
    M.labelMaterial('PROPULSION SPACE', { w: 448, h: 72, size: 30 }));
  sign1.position.set(0, 1.9, 16.86);
  sign1.rotation.y = Math.PI;
  sign1.userData.static = true;
  g.add(sign1);
  const sign2 = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.1),
    M.labelMaterial('HEARING PROTECTION', { w: 320, h: 88, size: 22, bg: '#b99a45' }));
  sign2.position.set(-1.18, 1.35, 17.1);
  sign2.rotation.y = Math.PI / 2 + 0.35;
  sign2.rotation.z = 0.1;
  sign2.userData.static = true;
  g.add(sign2);

  // condensation film on cold ballast pipe underside + streak on hull
  const condPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35), M.condensation());
  condPlane.position.set(-1.03, DY + 1.0, 18.3);
  condPlane.rotation.y = Math.PI / 2;
  condPlane.userData.static = true;
  condPlane.userData.noRaycast = true;
  g.add(condPlane);

  // steam wisp near cooling vent (subtle)
  {
    const count = 14;
    const rng = makeRng('steam');
    const pos = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = -0.7 + rng.range(-0.05, 0.05);
      pos[i * 3 + 1] = DY + 1.75 + rng.range(0, 0.5);
      pos[i * 3 + 2] = 18.52 + rng.range(-0.05, 0.05);
      phase[i] = rng.range(0, 6.28);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    const steamMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false,
      uniforms: { uTime: { value: 0 }, uFactor: { value: 1 } },
      vertexShader: `
        attribute float aPhase;
        uniform float uTime;
        varying float vA;
        void main() {
          vec3 p = position;
          float cycle = fract(uTime * 0.14 + aPhase);
          p.y += cycle * 0.55;
          p.x += sin(uTime * 0.7 + aPhase * 3.0) * 0.05 * cycle;
          vA = (1.0 - cycle) * smoothstep(0.0, 0.15, cycle);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (14.0 + cycle * 30.0) * clamp(2.2 / -mv.z, 0.2, 2.0) * 30.0 / 14.0;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vA;
        uniform float uFactor;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          float d = length(uv);
          float a = smoothstep(0.5, 0.1, d) * vA * 0.06 * uFactor;
          gl_FragColor = vec4(vec3(0.75, 0.8, 0.8), a);
        }
      `,
    });
    const steam = new THREE.Points(geo, steamMat);
    steam.frustumCulled = false;
    steam.userData.static = false;
    g.add(steam);
    ctx.anim.add((t) => {
      steamMat.uniforms.uTime.value = t;
      steamMat.uniforms.uFactor.value = K.getMachineryFactor();
    });
  }

  // ===================== silent-running panel (interactable) ==================
  const panel = new THREE.Group();
  panel.position.set(0.68, DY, 17.95);
  panel.rotation.y = -Math.PI / 2 + 0.5;
  const ped = new THREE.Mesh(K.roundedBox(0.4, 1.02, 0.28, 0.015), M.consoleGray());
  ped.position.y = 0.51;
  ped.castShadow = true;
  panel.add(ped);
  const face = new THREE.Mesh(K.roundedBox(0.38, 0.3, 0.05, 0.012), M.consoleGray());
  face.position.set(0, 1.08, 0.02);
  face.rotation.x = -0.5;
  panel.add(face);
  // big rotary mode switch
  const rotBase = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.03, 16), M.bakelite());
  rotBase.position.set(-0.08, 1.11, 0.062);
  rotBase.rotation.x = -0.5 + Math.PI / 2;
  panel.add(rotBase);
  const rotHandle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.11, 0.035), M.bakelite());
  rotHandle.position.set(-0.08, 1.125, 0.075);
  rotHandle.rotation.x = -0.5;
  panel.add(rotHandle);
  // mode lamps
  const lampNorm = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), M.instrumentLampMaterial('#79c98d', 2.0));
  lampNorm.position.set(0.07, 1.145, 0.075);
  panel.add(lampNorm);
  const lampSilentMat = M.instrumentLampMaterial('#8e3030', 0.15);
  const lampSilent = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 8), lampSilentMat);
  lampSilent.position.set(0.12, 1.145, 0.07);
  panel.add(lampSilent);
  const modeLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.06),
    M.labelMaterial('MACHY MODE', { w: 256, h: 52, size: 24 }));
  modeLabel.position.set(0, 1.3, 0.01);
  modeLabel.rotation.x = -0.5;
  panel.add(modeLabel);
  const silentLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.045),
    M.labelMaterial('SILENT RUN', { w: 224, h: 44, size: 22, bg: '#8e3030', fg: '#d8d4c8' }));
  silentLabel.position.set(0, 0.82, 0.145);
  panel.add(silentLabel);
  g.add(panel);
  C.addBox([0.5, DY, 17.7], [0.95, 1.35, 18.3], { name: 'silent-panel' });

  let silent = false;
  ctx.interact.register({
    id: 'silentRunning',
    prompt: () => (silent ? 'E: Silent Running (disengage)' : 'E: Silent Running'),
    root: panel,
    highlight: [lampSilent],
    onUse: () => {
      silent = !silent;
      rotHandle.rotation.z = silent ? Math.PI / 2 : 0;
      lampSilentMat.emissiveIntensity = silent ? 2.2 : 0.15;
      ctx.env.setState(silent ? 'silentRunning' : 'cruising', { duration: 2.8 });
      ctx.hud.setStatus(silent ? 'Silent running engaged.' : 'Silent running disengaged.');
    },
  });
  // expose current mode for tests
  ctx.getSilent = () => silent;

  // ===================== lighting =============================================
  const mkWork = (x, z, intensity = 5.2, shadow = false) => {
    const fixture = K.lampCage({ r: 0.075, color: 0xffd2a0, intensity: 2.6 });
    fixture.position.set(x, DY + 2.5, z);
    fixture.rotation.x = Math.PI;
    g.add(fixture);
    const light = new THREE.PointLight(0xffd2a0, intensity, 6.5, 2);
    light.position.set(x, DY + 2.26, z);
    g.add(light);
    ctx.lights.register({ light, lampMats: [fixture.userData.lampMat], role: 'work' });
    if (shadow) {
      const spot = new THREE.SpotLight(0xffd2a0, intensity * 0.75, 7, 1.1, 0.6, 2);
      spot.position.set(x, DY + 2.32, z);
      spot.target.position.set(x * 0.4, DY, z);
      spot.castShadow = true;
      spot.shadow.mapSize.set(1024, 1024);
      spot.shadow.bias = -0.0035;
      g.add(spot, spot.target);
      ctx.lights.register({ light: spot, role: 'work' });
    }
  };
  mkWork(-0.45, 18.2, 4.6, false);
  mkWork(0.45, 19.4, 5.2, true); // hero shadow light
  mkWork(-0.4, 21.2, 4.6, false);
  mkWork(0.35, 22.6, 3.6, false);

  // inspection lamps aimed at machinery (small, warm)
  for (const [x, y, z, tx, ty, tz] of [
    [-0.55, DY + 1.5, 19.5, -0.9, DY + 0.4, 19.55],
    [0.4, DY + 1.75, 21.0, 0, DY + 0.7, 21.0],
  ]) {
    const spot = new THREE.SpotLight(0xffe0b5, 3.2, 3.5, 0.75, 0.6, 1.8);
    spot.position.set(x, y, z);
    spot.target.position.set(tx, ty, tz);
    g.add(spot, spot.target);
    ctx.lights.register({ light: spot, role: 'work' });
    const lampBody = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.09, 10, 1, true), M.darkSteel());
    lampBody.position.set(x, y, z);
    lampBody.lookAt(tx, ty, tz);
    lampBody.rotateX(Math.PI / 2);
    lampBody.material.side = THREE.DoubleSide;
    lampBody.userData.static = true;
    g.add(lampBody);
  }
  // small work light over the stern gland / stands
  {
    const spot = new THREE.SpotLight(0xffe0b5, 2.6, 4.0, 0.85, 0.6, 1.8);
    spot.position.set(0.3, DY + 2.24, 22.9);
    spot.target.position.set(0, DY + 0.64, 23.5);
    g.add(spot, spot.target);
    ctx.lights.register({ light: spot, role: 'work' });
    const lampBody = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.09, 10, 1, true), M.darkSteel());
    lampBody.position.set(0.3, DY + 2.24, 22.9);
    lampBody.lookAt(0, DY + 0.64, 23.5);
    lampBody.rotateX(Math.PI / 2);
    lampBody.material.side = THREE.DoubleSide;
    lampBody.userData.static = true;
    g.add(lampBody);
  }

  // cool fill from electrical cabinets
  const coolFill = new THREE.PointLight(0x9fb8c4, 1.6, 4.5, 2);
  coolFill.position.set(0.95, DY + 1.7, 19.9);
  g.add(coolFill);
  ctx.lights.register({ light: coolFill, role: 'instrument' });
  // faint instrument glow at the steering-hydraulics cabinet
  const steerGlow = new THREE.PointLight(0x9fb8c4, 1.1, 2.6, 2);
  steerGlow.position.set(-0.55, DY + 1.4, 21.45);
  g.add(steerGlow);
  ctx.lights.register({ light: steerGlow, role: 'instrument' });

  // silent-running red/amber practicals
  for (const [x, z] of [[-0.3, 18.8], [-0.3, 20.5], [0, 22.4]]) {
    const fixture = K.lampCage({ r: 0.06, color: 0xb03a28, intensity: 0 });
    fixture.position.set(x, DY + 2.48, z);
    fixture.rotation.x = Math.PI;
    g.add(fixture);
    const light = new THREE.PointLight(0xb03a28, 3.0, 5.5, 2);
    light.position.set(x, DY + 2.36, z);
    g.add(light);
    ctx.lights.register({ light, lampMats: [fixture.userData.lampMat], role: 'red' });
  }

  // gauge board near entrance (RPM + temps)
  const board = new THREE.Group();
  board.position.set(-0.72, DY + 1.3, 17.15);
  board.rotation.y = Math.PI - 0.5;
  const bPanel = new THREE.Mesh(K.roundedBox(0.5, 0.42, 0.04, 0.012), M.consoleGray());
  board.add(bPanel);
  const rpm = K.gauge({ r: 0.085, label: 'RPM x100', max: 12, value: 0.45 });
  rpm.position.set(-0.11, 0.06, 0.035);
  board.add(rpm);
  const temp = K.gauge({ r: 0.06, label: '°C', max: 120, value: 0.55 });
  temp.position.set(0.13, 0.08, 0.035);
  board.add(temp);
  const oilP = K.gauge({ r: 0.06, label: 'OIL', max: 10, value: 0.6 });
  oilP.position.set(0.13, -0.12, 0.035);
  board.add(oilP);
  g.add(board);

  // convert every deferred (local-space) bolt note into world instances
  MC.emitBolts(g);

  return g;
}
