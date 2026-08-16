// Crew quarters, galley, mess corner and washroom alcove. Owner: crew agent.
// Bunks port z 6.6-10.6, lockers stbd 7.3-8.2, galley stbd 8.5-10.8,
// mess table port 11.0-12.3, washroom stbd 11.0-12.6.

import * as THREE from 'three';
import * as M from './materials.js';
import * as K from './greebles.js';
import { makeRng } from './rng.js';
import { makeCanvas, fillBase, mottle, stencilText, canvasTexture, speckle } from './textures.js';

// wavy cloth plane (for curtains / hanging towel)
function clothPlane(w, h, mat, seed, waveAmp = 0.03) {
  const geo = new THREE.PlaneGeometry(w, h, 16, 8);
  const rng = makeRng(seed);
  const phase = rng.range(0, 6);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const hang = (y / h + 0.5); // more wave at bottom
    pos.setZ(i, Math.sin(x * 14 + phase) * waveAmp * (1.2 - hang) + Math.sin(x * 31 + phase * 2) * waveAmp * 0.4);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.userData.static = true;
  return mesh;
}

// pin board with taped notes
function pinBoardCanvas() {
  const c = makeCanvas(256, 192);
  const ctx = c.getContext('2d');
  fillBase(ctx, '#6a5a44');
  mottle(ctx, 'corkboard', { cells: 10, octaves: 3, amount: 0.16 });
  const rng = makeRng('notes');
  const notes = [
    ['WATCH BILL', '0400 VOSS', '0800 OKAFOR', '1200 LINDQVIST'],
    ['GALLEY DUTY', 'MON: KAI', 'TUE: R.V.', 'WED: A.O.'],
    ['REMINDER', 'CO2 SCRUB', 'FILTERS @ 1800'],
  ];
  let x = 12;
  for (const note of notes) {
    const w = 70 + rng() * 8, h = 76 + rng() * 20;
    const y = 16 + rng() * 40;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rng.range(-0.08, 0.08));
    ctx.fillStyle = '#c9c2ac';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = 'rgba(150,150,150,0.8)';
    ctx.fillRect(-6, -h / 2 - 2, 12, 6); // tape
    ctx.fillStyle = '#33322c';
    ctx.font = '9px "DejaVu Sans", sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < note.length; i++) ctx.fillText(note[i], 0, -h / 2 + 16 + i * 13);
    ctx.restore();
    x += w + 10;
  }
  speckle(ctx, 'board-wear', { count: 60, colors: ['rgba(30,25,20,0.3)'], size: 1.5 });
  return c;
}

function mug(color) {
  const g = new THREE.Group();
  g.userData.static = true;
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0, envMapIntensity: 0.7 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.03, 0.08, 12, 1, false), mat);
  body.position.y = 0.04;
  g.add(body);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 6, 12, Math.PI * 1.4), mat);
  handle.position.set(0.036, 0.045, 0);
  handle.rotation.z = -0.6;
  g.add(handle);
  return g;
}

export function build(ctx) {
  const g = new THREE.Group();
  g.name = 'crewQuarters';
  const C = ctx.collision;

  // ============================ bunks (port) =================================
  // two columns along z, two stacked each: frames + bedding
  const bunkW = 0.64, bunkL = 1.86;
  const wallX = -1.36;
  let restBunkRoot = null;
  let restHighlight = null;

  const crewNames = ['R. VOSS', 'A. OKAFOR', 'M. LINDQVIST', 'T. KAI'];
  let nameIdx = 0;

  for (const zc of [7.72, 9.68]) {
    const col = new THREE.Group();
    col.position.set(0, 0, zc);
    // vertical posts
    for (const [px, pz] of [[-0.72, -bunkL / 2], [-0.72, bunkL / 2]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 1.86, 10), M.bareSteel());
      post.position.set(px, 0.93, pz);
      post.userData.static = true;
      col.add(post);
    }
    for (const baseY of [0.32, 1.12]) {
      const bunk = new THREE.Group();
      bunk.position.set(-1.02, baseY, 0);
      // frame rails
      const railF = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, bunkL), M.panelPaint('bunkFrame', '#77806f'));
      railF.position.set(0.3, 0, 0);
      bunk.add(railF);
      const railB = railF.clone();
      railB.position.x = -0.31;
      bunk.add(railB);
      // base panel
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.025, bunkL), M.panelPaint('bunkFrame', '#77806f'));
      base.position.y = -0.02;
      bunk.add(base);
      // mattress
      const mattress = new THREE.Mesh(K.roundedBox(bunkW - 0.06, 0.09, bunkL - 0.06, 0.03), M.mattressTicking());
      mattress.position.y = 0.055;
      mattress.castShadow = true;
      bunk.add(mattress);
      // sheet (folded back at head end)
      const sheet = new THREE.Mesh(K.roundedBox(bunkW - 0.08, 0.03, (bunkL - 0.12) * 0.72, 0.014), M.fabricSheet());
      sheet.position.set(0, 0.11, 0.11);
      bunk.add(sheet);
      // blanket with fold
      const blanket = new THREE.Mesh(K.roundedBox(bunkW - 0.05, 0.045, (bunkL - 0.1) * 0.62, 0.02), M.fabricBlanket());
      blanket.position.set(0, 0.115, 0.22);
      blanket.rotation.x = 0.012;
      blanket.castShadow = true;
      bunk.add(blanket);
      const fold = new THREE.Mesh(K.roundedBox(bunkW - 0.05, 0.028, 0.16, 0.013), M.fabricBlanket());
      fold.position.set(0, 0.145, -0.28 + bunkL * 0.31);
      bunk.add(fold);
      // pillow
      const pillow = new THREE.Mesh(K.roundedBox(0.34, 0.07, 0.26, 0.032), M.fabricSheet());
      pillow.position.set(0, 0.115, -bunkL / 2 + 0.2);
      pillow.rotation.y = 0.05;
      pillow.rotation.x = -0.06;
      pillow.castShadow = true;
      bunk.add(pillow);
      // lee strap (keeps sleeper in): canvas strap diagonal
      const strap = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.5), M.fabricSheet());
      strap.position.set(0.315, 0.12, 0.32);
      strap.rotation.y = Math.PI / 2;
      strap.rotation.x = 0.25;
      strap.userData.static = true;
      bunk.add(strap);
      // reading light
      const rl = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.036, 0.05, 10, 1, true), M.darkSteel());
      rl.position.set(-0.24, 0.52, -bunkL / 2 + 0.16);
      rl.rotation.z = 1.0;
      rl.material.side = THREE.DoubleSide;
      bunk.add(rl);
      const rlGlow = new THREE.Mesh(new THREE.CircleGeometry(0.024, 10), M.instrumentLampMaterial('#ffd9a3', 1.6));
      rlGlow.position.set(-0.215, 0.505, -bunkL / 2 + 0.16);
      rlGlow.rotation.z = 1.0;
      rlGlow.rotation.y = 1.2;
      bunk.add(rlGlow);
      const rLight = new THREE.PointLight(0xffd9a3, 0.55, 1.3, 2);
      rLight.position.set(-0.15, 0.45, -bunkL / 2 + 0.3);
      bunk.add(rLight);
      ctx.lights.register({ light: rLight, lampMats: [rlGlow.material], role: 'reading' });
      // name plate
      const name = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.045),
        M.labelMaterial(crewNames[nameIdx++ % 4], { w: 160, h: 44, size: 20 }));
      name.position.set(0.325, 0.28, -bunkL / 2 + 0.3);
      name.rotation.y = Math.PI / 2;
      bunk.add(name);
      col.add(bunk);

      if (zc < 9 && baseY < 1) { restBunkRoot = bunk; restHighlight = blanket; }
    }
    // curtain rail + partially drawn curtain on upper bunk
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, bunkL, 8), M.bareSteel());
    rail.rotation.x = Math.PI / 2;
    rail.position.set(-0.7, 1.78, 0);
    rail.userData.static = true;
    col.add(rail);
    const curtainMat = new THREE.MeshStandardMaterial({
      color: 0x4a5548, roughness: 0.95, metalness: 0,
      normalMap: M.fabricBlanket().normalMap, normalScale: new THREE.Vector2(0.7, 0.7),
      side: THREE.DoubleSide, envMapIntensity: 0.25,
    });
    const curtain = clothPlane(0.5, 0.62, curtainMat, 'curtain' + zc, 0.045);
    curtain.rotation.y = Math.PI / 2;
    curtain.position.set(-0.7, 1.46, -bunkL / 2 + 0.28);
    col.add(curtain);
    // lower bunk curtain, mostly open
    const curtain2 = clothPlane(0.3, 0.6, curtainMat, 'curtain2' + zc, 0.05);
    curtain2.rotation.y = Math.PI / 2;
    curtain2.position.set(-0.7, 0.62, bunkL / 2 - 0.18);
    col.add(curtain2);
    g.add(col);
    C.addBox([-1.45, 0, zc - bunkL / 2 - 0.05], [-0.68, 1.9, zc + bunkL / 2 + 0.05], { name: 'bunks' + zc });
  }

  // cubbies between bunk columns
  const cubby = new THREE.Group();
  cubby.position.set(-1.15, 0, 8.7);
  for (let i = 0; i < 3; i++) {
    const box = new THREE.Mesh(K.roundedBox(0.34, 0.3, 0.5, 0.01), M.cabinetGreen());
    box.position.y = 0.35 + i * 0.52;
    box.rotation.y = Math.PI / 2;
    cubby.add(box);
  }
  // book stack + mug on middle cubby
  const rngProps = makeRng('cubby-props');
  for (let i = 0; i < 3; i++) {
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.02, 0.18),
      M.panelPaint('book' + i, ['#5a4a3a', '#3a4a5a', '#4a3a3a'][i]));
    book.position.set(-1.12 + rngProps.range(-0.02, 0.02) + 1.15, 1.05 + i * 0.022, 8.7 + rngProps.range(-0.02, 0.02) - 8.7);
    book.rotation.y = rngProps.range(-0.2, 0.2);
    book.userData.static = true;
    cubby.add(book);
  }
  g.add(cubby);

  // ============================ lockers (starboard fwd) ======================
  const lockers = new THREE.Group();
  lockers.position.set(1.18, 0, 7.75);
  lockers.rotation.y = -Math.PI / 2;
  for (let i = 0; i < 2; i++) {
    const lk = new THREE.Mesh(K.roundedBox(0.44, 1.68, 0.42, 0.012), M.cabinetGreen());
    lk.position.set(-0.23 + i * 0.47, 0.86, 0);
    lk.castShadow = true; lk.receiveShadow = true;
    lockers.add(lk);
    const vent = K.ventGrille(0.3, 0.09, { mat: M.cabinetGreen() });
    vent.position.set(-0.23 + i * 0.47, 0.3, 0.215);
    lockers.add(vent);
    const vent2 = K.ventGrille(0.3, 0.09, { mat: M.cabinetGreen() });
    vent2.position.set(-0.23 + i * 0.47, 1.5, 0.215);
    lockers.add(vent2);
    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.09, 0.03), M.bareSteel());
    latch.position.set(-0.06 + i * 0.47, 0.95, 0.22);
    lockers.add(latch);
    const num = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.05),
      M.labelMaterial(String(i + 1), { w: 64, h: 40, size: 26 }));
    num.position.set(-0.23 + i * 0.47, 1.62, 0.216);
    lockers.add(num);
  }
  g.add(lockers);
  C.addBox([0.94, 0, 7.28], [1.5, 1.75, 8.24], { name: 'lockers' });

  // ============================ galley (starboard) ===========================
  const galley = new THREE.Group();
  galley.position.set(1.12, 0, 9.65);
  galley.rotation.y = -Math.PI / 2;
  // counter
  const counter = new THREE.Mesh(K.roundedBox(2.2, 0.06, 0.56, 0.012), M.bareSteel());
  counter.position.y = 0.9;
  counter.castShadow = true;
  galley.add(counter);
  // fiddles (sea rails on counter edge)
  for (const dz of [0.27, -0.27]) {
    const fiddle = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.05, 0.012), M.bareSteel());
    fiddle.position.set(0, 0.955, dz);
    galley.add(fiddle);
  }
  // under-counter cabinets
  const under = new THREE.Mesh(K.roundedBox(2.16, 0.82, 0.52, 0.012), M.cabinetGreen());
  under.position.y = 0.44;
  galley.add(under);
  for (let i = 0; i < 3; i++) {
    const door = new THREE.Mesh(K.roundedBox(0.6, 0.66, 0.02, 0.01), M.cabinetGreen());
    door.position.set(-0.7 + i * 0.7, 0.42, 0.265);
    galley.add(door);
    const dh = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.1, 0.028), M.bareSteel());
    dh.position.set(-0.48 + i * 0.7, 0.42, 0.28);
    galley.add(dh);
  }
  // sink
  const sinkCut = new THREE.Mesh(K.roundedBox(0.4, 0.16, 0.32, 0.02), M.whiteEnamel());
  sinkCut.position.set(-0.62, 0.845, 0);
  galley.add(sinkCut);
  const sinkIn = new THREE.Mesh(K.roundedBox(0.34, 0.13, 0.26, 0.02), M.darkSteel());
  sinkIn.position.set(-0.62, 0.87, 0);
  galley.add(sinkIn);
  const tap = K.pipeRun([[-0.82, 0.94, 0], [-0.82, 1.12, 0], [-0.62, 1.12, 0], [-0.62, 1.05, 0]], {
    r: 0.014, material: M.chrome(), flanges: 'none', cornerR: 0.05, capEnds: true,
  });
  galley.add(tap);
  const tapWheelA = K.valveWheel(0.03, M.functionalRedPaint());
  tapWheelA.rotation.x = Math.PI / 2;
  tapWheelA.position.set(-0.82, 1.0, 0.08);
  galley.add(tapWheelA);
  // two-burner cooktop with pot rails
  const stove = new THREE.Mesh(K.roundedBox(0.6, 0.035, 0.42, 0.01), M.gunmetal());
  stove.position.set(0.35, 0.93, 0);
  galley.add(stove);
  for (const dx of [0.18, 0.52]) {
    const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.018, 16), M.oilySteel());
    burner.position.set(dx, 0.952, 0);
    galley.add(burner);
    const potRail = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.008, 6, 16), M.bareSteel());
    potRail.rotation.x = Math.PI / 2;
    potRail.position.set(dx, 0.975, 0);
    galley.add(potRail);
  }
  // kettle on burner
  const kettle = new THREE.Group();
  const kBody = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.12, 14), M.bareSteel());
  kBody.position.y = 0.06;
  kettle.add(kBody);
  const kSpout = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.1, 8), M.bareSteel());
  kSpout.position.set(0.09, 0.09, 0);
  kSpout.rotation.z = -0.7;
  kettle.add(kSpout);
  const kHandle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 12, Math.PI), M.bakelite());
  kHandle.position.y = 0.13;
  kettle.add(kHandle);
  kettle.position.set(0.18, 0.955, 0);
  kettle.userData.static = true;
  galley.add(kettle);
  // overhead cabinets with sliding doors
  const ohc = new THREE.Mesh(K.roundedBox(2.0, 0.5, 0.34, 0.012), M.cabinetGreen());
  ohc.position.set(0, 1.72, -0.1);
  galley.add(ohc);
  for (let i = 0; i < 2; i++) {
    const slide = new THREE.Mesh(K.roundedBox(0.46, 0.4, 0.015, 0.008), M.cabinetCream());
    slide.position.set(-0.5 + i * 1.0, 1.72, 0.078 + i * 0.012);
    galley.add(slide);
  }
  const retBar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.9, 8), M.bareSteel());
  retBar.rotation.z = Math.PI / 2;
  retBar.position.set(0, 1.52, 0.1);
  galley.add(retBar);
  // labeled storage bins on shelf
  const binLabels = ['RICE', 'TEA', 'COFFEE'];
  for (let i = 0; i < 3; i++) {
    const bin = new THREE.Mesh(K.roundedBox(0.16, 0.2, 0.16, 0.01), M.plasticBeige());
    bin.position.set(0.62 + 0 - i * 0.19, 1.42, 0.02);
    galley.add(bin);
    const bl = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.045),
      M.labelMaterial(binLabels[i], { w: 96, h: 40, size: 18 }));
    bl.position.set(0.62 - i * 0.19, 1.42, 0.105);
    galley.add(bl);
  }
  // mugs on hooks under cabinet
  for (let i = 0; i < 3; i++) {
    const m = mug(['#7a4a3a', '#4a5a6a', '#5a6a4a'][i]);
    m.position.set(-0.3 + i * 0.14, 1.38, 0.12);
    m.rotation.y = i;
    galley.add(m);
  }
  // galley extract hood + duct
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.2, 4), M.galvanized());
  hood.rotation.y = Math.PI / 4;
  hood.position.set(0.35, 2.0, -0.12);
  galley.add(hood);
  g.add(galley);
  C.addBox([0.82, 0, 8.55], [1.5, 1.05, 10.78], { name: 'galley' });

  // ============================ mess corner (port aft) =======================
  const mess = new THREE.Group();
  mess.position.set(-1.34, 0, 11.6); // against port hull
  mess.rotation.y = Math.PI / 2;
  // bench along the hull
  const bench = new THREE.Mesh(K.roundedBox(0.9, 0.06, 0.34, 0.02), M.vinylSeat());
  bench.position.set(0, 0.46, 0.2);
  bench.castShadow = true;
  mess.add(bench);
  const benchBase = new THREE.Mesh(K.roundedBox(0.84, 0.4, 0.3, 0.01), M.cabinetGreen());
  benchBase.position.set(0, 0.22, 0.2);
  mess.add(benchBase);
  // fold-down table between bench and walkway, on hinge brackets from the bunk post
  const table = new THREE.Mesh(K.roundedBox(0.86, 0.035, 0.42, 0.012), M.cabinetCream());
  table.position.set(0, 0.76, 0.58);
  table.castShadow = true;
  mess.add(table);
  for (const dx of [-0.33, 0.33]) {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.38), M.bareSteel());
    bracket.position.set(dx, 0.72, 0.52);
    bracket.rotation.x = 0.3;
    mess.add(bracket);
  }
  // single support leg to deck
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.75, 10), M.bareSteel());
  leg.position.set(0, 0.38, 0.74);
  mess.add(leg);
  // condiment rack on table + mug
  const rack = new THREE.Mesh(K.roundedBox(0.2, 0.08, 0.1, 0.008), M.bareSteel());
  rack.position.set(-0.26, 0.82, 0.52);
  mess.add(rack);
  const tMug = mug('#6a4a3a');
  tMug.position.set(0.2, 0.78, 0.62);
  tMug.rotation.y = 2.2;
  mess.add(tMug);
  g.add(mess);
  // pin board on the hull above the bench, tilted with the hull curve
  const boardMat = new THREE.MeshStandardMaterial({
    map: canvasTexture(pinBoardCanvas(), { srgb: true, wrap: false }), roughness: 0.85, metalness: 0, envMapIntensity: 0.3,
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.44), boardMat);
  board.position.set(-1.38, 1.35, 11.6);
  board.rotation.y = Math.PI / 2;
  board.rotation.x = -0.32; // lean with hull curvature
  board.userData.static = true;
  g.add(board);
  const boardFrame = new THREE.Mesh(K.roundedBox(0.64, 0.5, 0.02, 0.008), M.panelPaint('boardFrame', '#5a5148'));
  boardFrame.position.set(-1.395, 1.35, 11.6);
  boardFrame.rotation.y = Math.PI / 2;
  boardFrame.rotation.x = -0.32;
  boardFrame.userData.static = true;
  g.add(boardFrame);
  C.addBox([-1.5, 0, 11.14], [-0.58, 0.95, 12.06], { name: 'mess' });

  // ============================ washroom alcove (stbd aft) ===================
  const wash = new THREE.Group();
  wash.position.set(1.05, 0, 11.8);
  wash.rotation.y = -Math.PI / 2;
  // partition walls
  const partMat = M.panelPaint('washPanel', '#9aA098'.toLowerCase());
  for (const dx of [-0.78, 0.78]) {
    const part = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.05, 0.6), partMat);
    part.position.set(dx, 1.02, 0.12);
    part.castShadow = true; part.receiveShadow = true;
    part.userData.static = true;
    wash.add(part);
  }
  // sliding door, half open
  const doorTrack = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.06), M.bareSteel());
  doorTrack.position.set(0, 2.02, 0.42);
  wash.add(doorTrack);
  const slideDoor = new THREE.Mesh(K.roundedBox(0.7, 1.9, 0.03, 0.01), partMat);
  slideDoor.position.set(-0.42, 1.02, 0.4);
  slideDoor.castShadow = true;
  wash.add(slideDoor);
  const doorPull = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.14, 0.03), M.bareSteel());
  doorPull.position.set(-0.12, 1.0, 0.43);
  wash.add(doorPull);
  const wcLabel = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.05),
    M.labelMaterial('WASHRM', { w: 128, h: 44, size: 20 }));
  wcLabel.position.set(-0.42, 1.72, 0.425);
  wash.add(wcLabel);
  // basin + mirror + towel inside
  const basin = new THREE.Mesh(K.roundedBox(0.4, 0.14, 0.3, 0.03), M.whiteEnamel());
  basin.position.set(0.3, 0.82, 0.02);
  wash.add(basin);
  const basinIn = new THREE.Mesh(K.roundedBox(0.32, 0.1, 0.22, 0.03), M.whiteEnamel());
  basinIn.position.set(0.3, 0.85, 0.02);
  wash.add(basinIn);
  const pedestal = new THREE.Mesh(K.roundedBox(0.3, 0.75, 0.24, 0.01), M.cabinetCream());
  pedestal.position.set(0.3, 0.4, 0.0);
  wash.add(pedestal);
  const wTap = K.pipeRun([[0.3, 0.9, -0.12], [0.3, 1.02, -0.12], [0.3, 1.02, -0.02]], {
    r: 0.011, material: M.chrome(), flanges: 'none', cornerR: 0.03,
  });
  wash.add(wTap);
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), new THREE.MeshStandardMaterial({
    color: 0xcfd8d4, roughness: 0.03, metalness: 1.0, envMapIntensity: 2.0,
  }));
  mirror.position.set(0.3, 1.42, -0.14);
  mirror.userData.static = true;
  wash.add(mirror);
  const mirrorFrame = new THREE.Mesh(K.roundedBox(0.35, 0.45, 0.02, 0.008), M.bareSteel());
  mirrorFrame.position.set(0.3, 1.42, -0.15);
  wash.add(mirrorFrame);
  // towel ring + towel
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 6, 16), M.chrome());
  ring.position.set(0.62, 1.15, 0.1);
  ring.rotation.y = Math.PI / 2;
  wash.add(ring);
  const towel = clothPlane(0.2, 0.3, M.towel(), 'towel', 0.03);
  towel.rotation.y = Math.PI / 2;
  towel.position.set(0.64, 0.98, 0.1);
  wash.add(towel);
  // shelf with bottles
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.12), M.bareSteel());
  shelf.position.set(0.3, 1.08, -0.1);
  wash.add(shelf);
  for (let i = 0; i < 2; i++) {
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.09, 10), M.plasticBeige());
    bottle.position.set(0.22 + i * 0.14, 1.14, -0.1);
    wash.add(bottle);
  }
  g.add(wash);
  C.addBox([0.75, 0, 11.15], [1.5, 2.0, 12.5], { name: 'washroom' });

  // ============================ ventilation ==================================
  for (const [x, z] of [[-0.8, 7.0], [-0.8, 10.2], [0.8, 9.6]]) {
    const vent = K.ventGrille(0.34, 0.16, { mat: M.cabinetGray() });
    vent.position.set(x, 2.14, z);
    vent.rotation.x = Math.PI / 2 + (x < 0 ? -0.5 : 0.5);
    g.add(vent);
  }

  // ============================ lighting =====================================
  const mkWarm = (x, z, intensity = 3.2, shadow = false) => {
    const fixture = K.lampCage({ r: 0.06, color: 0xffd9a3, intensity: 2.0 });
    fixture.position.set(x, 2.16, z);
    fixture.rotation.x = Math.PI;
    g.add(fixture);
    const light = new THREE.PointLight(0xffd9a3, intensity, 4.5, 2);
    light.position.set(x, 1.96, z);
    g.add(light);
    ctx.lights.register({ light, lampMats: [fixture.userData.lampMat], role: 'warm' });
    if (shadow) {
      const spot = new THREE.SpotLight(0xffd9a3, intensity * 0.7, 5.5, 1.05, 0.65, 2);
      spot.position.set(x, 2.02, z);
      spot.target.position.set(x * 0.5, 0, z);
      spot.castShadow = true;
      spot.shadow.mapSize.set(512, 512);
      spot.shadow.bias = -0.004;
      g.add(spot, spot.target);
      ctx.lights.register({ light: spot, role: 'warm' });
    }
  };
  mkWarm(-0.55, 8.7, 3.0, true); // over bunks walkway
  mkWarm(0.6, 10.1, 2.8, false); // galley
  mkWarm(-0.6, 11.7, 2.6, false); // mess
  // washroom small lamp
  const wLight = new THREE.PointLight(0xffe6c0, 1.4, 2.2, 2);
  wLight.position.set(1.1, 1.9, 11.8);
  g.add(wLight);
  ctx.lights.register({ light: wLight, role: 'warm' });

  // ============================ rest interaction =============================
  let restBusy = false;
  ctx.interact.register({
    id: 'rest',
    prompt: 'E: Rest',
    root: restBunkRoot,
    highlight: [restHighlight],
    onUse: () => {
      if (restBusy) return;
      restBusy = true;
      ctx.player.setEnabled(false);
      ctx.hud.fadeTo(1, 950).then(() => {
        ctx.env.setState('restCycle', { duration: 0.6 });
        ctx.hud.setStatus('6 hours pass.', 2400);
        ctx.sched.after(1.9, () => {
          ctx.hud.fadeTo(0, 1100).then(() => {
            ctx.player.setEnabled(true);
            ctx.sched.after(1.3, () => {
              ctx.env.setState('cruising', { duration: 5.5 });
              ctx.hud.setStatus('Rested.', 3200);
              restBusy = false;
            });
          });
        });
      });
    },
  });

  return g;
}
