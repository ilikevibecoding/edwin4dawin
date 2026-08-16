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

export function build(ctx) {
  const g = new THREE.Group();
  g.name = 'engineRoom';
  const C = ctx.collision;

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
  // grease lines to gland
  g.add(K.pipeRun([[0.35, DY + 1.3, 23.1], [0.2, DY + 0.75, 23.5], [0.12, DY + 0.6, 23.55]], {
    r: 0.014, material: M.copper(), flanges: 'none', cornerR: 0.08,
  }));

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
    ram.userData.static = true;
    g.add(ram);
    // hydraulic hoses
    g.add(K.cableRun([[s * 0.78, DY + 1.32, 22.9], [s * 0.5, DY + 1.6, 22.4], [s * 0.35, DY + 1.62, 21.9]], {
      r: 0.016, sag: 0.05, mat: M.rubberMat(), seed: 'hyd' + s,
    }));
  }
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

  // big collision block for the drivetrain
  C.addBox([-0.85, DY, 20.05], [0.85, 2.2, 23.6], { name: 'motor-block' });

  // ===================== port side: manifold, pumps, HX ======================
  // ballast/trim manifold with 3 valves
  const manifold = new THREE.Group();
  manifold.position.set(-0.98, DY, 18.3);
  const header = K.pipeRun([[0, 1.05, -0.65], [0, 1.05, 0.65]], { r: 0.07, color: 'green', flanges: 'ends', capEnds: true });
  manifold.add(header);
  const rngMan = makeRng('manifold');
  for (let i = 0; i < 3; i++) {
    const zOff = -0.42 + i * 0.42;
    const vv = K.valveAssembly(0.048, {});
    vv.position.set(0.06, 1.05, zOff);
    vv.rotation.z = -Math.PI / 2 + 0.35; // wheels toward walkway
    manifold.add(vv);
    const down = K.pipeRun([[0, 0.98, zOff], [0, 0.4, zOff], [-0.25, 0.2, zOff]], {
      r: 0.048, color: 'green', flanges: 'none', cornerR: 0.09, capEnds: true,
    });
    manifold.add(down);
    const gg = K.gauge({ r: 0.05, label: 'BAR', max: 16, value: 0.3 + rngMan() * 0.3 });
    gg.position.set(0.13, 1.38, zOff);
    gg.rotation.y = Math.PI / 2 - 0.3;
    manifold.add(gg);
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.045),
      M.labelMaterial(['MBT AFT', 'TRIM AFT', 'BILGE'][i], { w: 160, h: 44, size: 20 }));
    lab.position.set(0.16, 0.78, zOff);
    lab.rotation.y = Math.PI / 2;
    manifold.add(lab);
  }
  manifold.userData.static = false; // gauges animate
  g.add(manifold);
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
  // pump discharge piping up into the cooling run
  g.add(K.pipeRun([[-0.85, DY + 0.6, 19.75], [-0.85, DY + 1.7, 19.75], [-0.55, DY + 1.95, 19.4], [0.0, DY + 2.08, 18.9]], {
    r: 0.045, color: 'gray', flanges: [0.3, 0.75], cornerR: 0.12, clampEvery: 0.9, capEnds: true,
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

  // ===================== overhead systems ====================================
  // route pipes entering from the electrical passage and crossing to machines
  const bal = ROUTES.stbdBallast;
  g.add(K.pipeRun([
    [bal.x, bal.y, Z.frameRing - 0.05], [bal.x, bal.y, 17.5], [0.4, DY + 2.16, 17.9], [-0.6, DY + 1.86, 18.1], [-0.98, DY + 1.35, 18.3],
  ], { r: 0.065, color: 'green', flanges: [0.2, 0.55, 0.85], cornerR: 0.16, clampEvery: 1.1, capEnds: true }));
  const cool = ROUTES.stbdCool;
  g.add(K.pipeRun([
    [cool.x, cool.y, Z.frameRing - 0.05], [cool.x, cool.y, 17.9], [0.6, DY + 2.0, 18.35], [-0.35, DY + 1.98, 18.5], [-0.78, DY + 1.62, 18.5],
  ], { r: cool.r, color: 'gray', flanges: [0.3, 0.7], cornerR: 0.13, clampEvery: 1.0, capEnds: true }));
  // copper air lines to compressor
  const pa = ROUTES.portAir;
  g.add(K.pipeRun([
    [pa.x, pa.y, Z.frameRing - 0.05], [pa.x, pa.y, 17.3], [-0.6, DY + 2.2, 17.6], [0.5, DY + 2.1, 17.9], [0.92, DY + 0.95, 18.2],
  ], { r: pa.r, material: M.copper(), flanges: 'none', cornerR: 0.1, clampEvery: 0.9, capEnds: true }));
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
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.035, 0.03), M.galvanized());
    strap.position.set(0.22, 0.05, dz);
    strap.rotation.z = 0.55;
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

  // chain hoist on I-beam above motor
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 3.4), M.gunmetal());
  beam.position.set(0, DY + 2.52, 21.2);
  beam.userData.static = true;
  g.add(beam);
  for (const dz of [-1.66, 1.66]) {
    const endPlate = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.06), M.hazardStripe());
    endPlate.position.set(0, DY + 2.52, 21.2 + dz);
    endPlate.userData.static = true;
    g.add(endPlate);
  }
  const trolley = new THREE.Mesh(K.roundedBox(0.18, 0.14, 0.22, 0.02), M.darkSteel());
  trolley.position.set(0, DY + 2.42, 20.75);
  trolley.userData.static = true;
  g.add(trolley);
  // chain: small torus links instanced
  const linkGeo = new THREE.TorusGeometry(0.02, 0.006, 5, 10);
  const chain = new THREE.InstancedMesh(linkGeo, M.bareSteel(), 26);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (let i = 0; i < 26; i++) {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (i % 2) * Math.PI / 2);
    m4.compose(new THREE.Vector3(0, DY + 2.36 - i * 0.033, 20.75), q, new THREE.Vector3(1, 1, 1));
    chain.setMatrixAt(i, m4);
  }
  chain.instanceMatrix.needsUpdate = true;
  chain.userData.static = true;
  g.add(chain);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 8, 14, Math.PI * 1.5), M.bareSteel());
  hook.position.set(0, DY + 1.46, 20.75);
  hook.rotation.z = Math.PI * 0.75;
  hook.userData.static = true;
  g.add(hook);

  // cable trays dropping into cabinets
  const tray = K.cableTray(2.6, { width: 0.15 });
  tray.position.set(0.62, DY + 2.3, 18.6);
  g.add(tray);
  g.add(K.cableBundle([[0.62, DY + 2.27, 17.4], [0.62, DY + 2.27, 19.8]], { count: 3, r: 0.013, spread: 0.04, sag: 0.012, seed: 'er-tray' }));
  g.add(K.cableRun([[0.62, DY + 2.27, 19.55], [0.98, DY + 1.5, 19.55]], { r: 0.015, sag: 0.03, seed: 'drop-cab1' }));
  g.add(K.cableRun([[0.62, DY + 2.27, 20.25], [0.98, DY + 1.5, 20.25]], { r: 0.015, sag: 0.03, seed: 'drop-cab2' }));
  // thick power cables to the motor terminal box
  g.add(K.cableBundle([[0.62, DY + 2.25, 20.4], [0.3, DY + 1.9, 20.55], [0.05, DY + 1.35, 20.6]], {
    count: 3, r: 0.019, spread: 0.05, sag: 0.06, seed: 'motor-power',
  }));

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

  // cool fill from electrical cabinets
  const coolFill = new THREE.PointLight(0x9fb8c4, 1.6, 4.5, 2);
  coolFill.position.set(0.95, DY + 1.7, 19.9);
  g.add(coolFill);
  ctx.lights.register({ light: coolFill, role: 'instrument' });

  // silent-running red/amber practicals
  for (const [x, z] of [[-0.3, 18.8], [0.3, 20.8], [0, 22.4]]) {
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

  return g;
}
