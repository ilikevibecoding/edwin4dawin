// Pressure hull, ribs, decks, bulkheads, hatches, portholes, forward viewport
// structure, stern/bow closures, underfloor structure. Owner: hull/layout agent.

import * as THREE from 'three';
import { HULL, Z, DECK, HATCH, PORTHOLES, VIEWPORT, floorHalfWidth } from './layout.js';
import * as M from './materials.js';
import * as K from './greebles.js';
import * as C from './collision.js';
import { makeRng } from './rng.js';

const R = HULL.radius, AY = HULL.axisY;

// angle where hull circle crosses a given deck height (measured from bottom)
function betaAtY(y) { return Math.acos((AY - y) / R); }

export function scaleUv(geo, sx, sy) {
  const uv = geo.attributes.uv;
  if (!uv) return geo;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
  return geo;
}

// ---------------------------------------------------------------------------
// Hull shell with cut-outs for portholes (quad skipping, covered by frames)
// ---------------------------------------------------------------------------
function buildHullShell(z0, z1, holes) {
  const bFloor = betaAtY(-0.35); // extend below deck into bilge
  const b0 = bFloor, b1 = Math.PI * 2 - bFloor;
  const nB = 96;
  const nZ = Math.max(2, Math.round((z1 - z0) / 0.25));
  const pos = [], nor = [], uv = [], idx = [];
  const vFor = (b) => (b - betaAtY(0)) / (Math.PI * 2 - 2 * betaAtY(0));
  for (let iz = 0; iz <= nZ; iz++) {
    const z = z0 + ((z1 - z0) * iz) / nZ;
    for (let ib = 0; ib <= nB; ib++) {
      const b = b0 + ((b1 - b0) * ib) / nB;
      const x = -Math.sin(b) * R;
      const y = AY - Math.cos(b) * R;
      pos.push(x, y, z);
      nor.push(Math.sin(b), Math.cos(b), 0);
      uv.push(z / 1.5, vFor(b));
    }
  }
  const inHole = (b, z) => {
    for (const h of holes) {
      const dz = z - h.z;
      const arc = R * (b - h.beta);
      if ((dz * dz) / (h.rz * h.rz) + (arc * arc) / (h.rb * h.rb) < 1) return true;
    }
    return false;
  };
  for (let iz = 0; iz < nZ; iz++) {
    for (let ib = 0; ib < nB; ib++) {
      const bMid = b0 + ((b1 - b0) * (ib + 0.5)) / nB;
      const zMid = z0 + ((z1 - z0) * (iz + 0.5)) / nZ;
      if (inHole(bMid, zMid)) continue;
      const a = iz * (nB + 1) + ib;
      const b = a + 1;
      const c = a + nB + 1;
      const d = c + 1;
      idx.push(a, b, c, b, d, c); // wound so faces are visible from inside
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, M.hullPaint());
  mesh.receiveShadow = true;
  mesh.userData.static = true;
  return mesh;
}

// ---------------------------------------------------------------------------
// Frame ribs: T-profile ring sectors
// ---------------------------------------------------------------------------
function ribGeometry(depth = HULL.ribDepth, thick = HULL.ribThick) {
  const bFloor = betaAtY(-0.1);
  const a0 = -(Math.PI - bFloor) - Math.PI / 2 + Math.PI; // convert: shape built in XY around hull axis
  // Build annular sector in polar coords directly:
  const shape = new THREE.Shape();
  const rOut = R - 0.005, rIn = R - depth;
  const start = bFloor, end = Math.PI * 2 - bFloor;
  const toXY = (b, r) => [-Math.sin(b) * r, -Math.cos(b) * r];
  const n = 64;
  let p = toXY(start, rOut);
  shape.moveTo(p[0], p[1]);
  for (let i = 1; i <= n; i++) { p = toXY(start + ((end - start) * i) / n, rOut); shape.lineTo(p[0], p[1]); }
  for (let i = n; i >= 0; i--) { p = toXY(start + ((end - start) * i) / n, rIn); shape.lineTo(p[0], p[1]); }
  shape.closePath();
  const web = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 4 });
  scaleUv(web, 0.5, 0.5);
  // flange (inner cap of the T)
  const shape2 = new THREE.Shape();
  const r2Out = rIn + 0.028, r2In = rIn - 0.012;
  p = toXY(start, r2Out); shape2.moveTo(p[0], p[1]);
  for (let i = 1; i <= n; i++) { p = toXY(start + ((end - start) * i) / n, r2Out); shape2.lineTo(p[0], p[1]); }
  for (let i = n; i >= 0; i--) { p = toXY(start + ((end - start) * i) / n, r2In); shape2.lineTo(p[0], p[1]); }
  shape2.closePath();
  const flange = new THREE.ExtrudeGeometry(shape2, { depth: thick * 2.4, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 4 });
  flange.translate(0, 0, -thick * 0.7);
  scaleUv(flange, 0.5, 0.5);
  return { web, flange };
}

function buildRibs(group, z0, z1) {
  const { web, flange } = ribGeometry();
  const deep = ribGeometry(0.17, 0.07);
  const mat = M.panelPaint('ribPaint', '#a09a8b');
  const matF = M.panelPaint('ribFlange', '#7f7a6c');
  let i = 0;
  for (let z = Math.ceil(z0 / HULL.ribEvery) * HULL.ribEvery; z < z1; z += HULL.ribEvery) {
    // skip ribs where bulkheads sit
    if (Math.abs(z - Z.bulkhead1) < 0.3 || Math.abs(z - Z.bulkhead2) < 0.3 || Math.abs(z - Z.frameRing) < 0.3) continue;
    const heavy = i % 4 === 1; // every 4th frame is a deep web frame
    const w = new THREE.Mesh(heavy ? deep.web : web, mat);
    w.position.set(0, AY, z - HULL.ribThick / 2);
    w.receiveShadow = true; w.userData.static = true;
    group.add(w);
    const f = new THREE.Mesh(heavy ? deep.flange : flange, matF);
    f.position.set(0, AY, z - HULL.ribThick / 2);
    f.receiveShadow = true; f.userData.static = true;
    group.add(f);
    i++;
  }
}

// ---------------------------------------------------------------------------
// Stadium (rounded-rect) helpers for hatches
// ---------------------------------------------------------------------------
function stadiumShape(w, h, into = null) {
  const r = w / 2;
  const s = into || new THREE.Shape();
  const hh = h / 2 - r;
  s.absarc(0, hh, r, 0, Math.PI, false);
  s.absarc(0, -hh, r, Math.PI, Math.PI * 2, false);
  s.closePath();
  return s;
}

function stadiumPath3(w, h, cx, cy, cz) {
  const r = w / 2, hh = h / 2 - r;
  const pts = [];
  const n = 24;
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI; pts.push(new THREE.Vector3(cx + Math.cos(a) * r, cy + hh + Math.sin(a) * r, cz)); }
  for (let i = 0; i <= n; i++) { const a = Math.PI + (i / n) * Math.PI; pts.push(new THREE.Vector3(cx + Math.cos(a) * r, cy - hh + Math.sin(a) * r, cz)); }
  return new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0);
}

// ---------------------------------------------------------------------------
// Bulkhead with oval hatch + open pressure door
// ---------------------------------------------------------------------------
function buildBulkhead(group, z, { doorSide = 1, name = 'BH' } = {}) {
  const thick = 0.07;
  const cx = 0, cy = HATCH.centerY + HATCH.height / 2 - HATCH.height / 2; // opening center y
  const openCY = HATCH.bottomY + HATCH.height / 2;

  // wall disc with stadium hole
  const disc = new THREE.Shape();
  disc.absarc(0, 0, R - 0.005, 0, Math.PI * 2);
  const hole = new THREE.Path();
  stadiumShape(HATCH.width, HATCH.height, hole);
  // hole coordinates are relative to hull axis
  const holeOffsetY = openCY - AY;
  hole.curves.forEach(() => {});
  const hole2 = new THREE.Path();
  {
    const r = HATCH.width / 2, hh = HATCH.height / 2 - r;
    hole2.absarc(0, holeOffsetY + hh, r, 0, Math.PI, false);
    hole2.absarc(0, holeOffsetY - hh, r, Math.PI, Math.PI * 2, false);
    hole2.closePath();
  }
  disc.holes.push(hole2);
  const geo = new THREE.ExtrudeGeometry(disc, { depth: thick, bevelEnabled: false, curveSegments: 48 });
  scaleUv(geo, 0.4, 0.4);
  const wall = new THREE.Mesh(geo, M.panelPaint('bulkheadPaint', '#a7ab9e'));
  wall.position.set(0, AY, z - thick / 2);
  wall.receiveShadow = true; wall.castShadow = true; wall.userData.static = true;
  group.add(wall);

  // vertical stiffeners on aft face
  const stiffGeo = new THREE.BoxGeometry(0.05, 1.0, 0.05);
  for (const sx of [-0.62, 0.62, -1.05, 1.05]) {
    const st = new THREE.Mesh(stiffGeo, M.panelPaint('bulkheadPaint', '#a7ab9e'));
    const h = Math.sqrt(Math.max(0.2, R * R - sx * sx));
    st.scale.y = (h * 2) / 1.0 * 0.86;
    st.position.set(sx, AY, z + thick / 2 + 0.03);
    st.userData.static = true;
    st.receiveShadow = true;
    group.add(st);
  }

  // coaming ring (rounded lip) around the opening, both sides
  const ringCurve = stadiumPath3(HATCH.width + 0.02, HATCH.height + 0.02, 0, openCY, z);
  const ring = new THREE.Mesh(new THREE.TubeGeometry(ringCurve, 64, 0.028, 10, true), M.panelPaint('hatchRim', '#79806f'));
  ring.userData.static = true; ring.receiveShadow = true;
  group.add(ring);

  // reinforcement plate with bolts
  const plateShape = new THREE.Shape();
  {
    const r = HATCH.width / 2 + 0.085, hh = HATCH.height / 2 - HATCH.width / 2;
    plateShape.absarc(0, hh, r, 0, Math.PI, false);
    plateShape.absarc(0, -hh, r, Math.PI, Math.PI * 2, false);
    plateShape.closePath();
    const ph = new THREE.Path();
    const r2 = HATCH.width / 2 + 0.03;
    ph.absarc(0, hh, r2, 0, Math.PI, false);
    ph.absarc(0, -hh, r2, Math.PI, Math.PI * 2, false);
    ph.closePath();
    plateShape.holes.push(ph);
  }
  for (const zz of [z - thick / 2 - 0.012, z + thick / 2 + 0.012]) {
    const pg = new THREE.ExtrudeGeometry(plateShape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 24 });
    scaleUv(pg, 0.4, 0.4);
    const plate = new THREE.Mesh(pg, M.panelPaint('hatchRim', '#79806f'));
    plate.position.set(0, openCY, zz - 0.006);
    plate.userData.static = true; plate.receiveShadow = true;
    group.add(plate);
    // bolt ring
    const curve = stadiumPath3(HATCH.width + 0.12, HATCH.height + 0.12, 0, openCY, zz + (zz > z ? 0.014 : -0.002));
    for (let i = 0; i < 18; i++) {
      const p = curve.getPointAt(i / 18);
      K.addBolt(p, new THREE.Vector3(0, 0, zz > z ? 1 : -1), 'S');
    }
  }

  // the pressure door, swung open ~105 degrees against the aft-side wall
  const doorShape = stadiumShape(HATCH.width + 0.09, HATCH.height + 0.09);
  const dg = new THREE.ExtrudeGeometry(doorShape, { depth: 0.055, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 24 });
  scaleUv(dg, 0.4, 0.4);
  const doorGroup = new THREE.Group();
  const door = new THREE.Mesh(dg, M.panelPaint('doorPaint', '#98a091'));
  door.castShadow = true; door.receiveShadow = true; door.userData.static = true;
  doorGroup.add(door);
  // gasket
  const gasketCurve = stadiumPath3(HATCH.width + 0.02, HATCH.height + 0.02, 0, 0, 0.058);
  const gasket = new THREE.Mesh(new THREE.TubeGeometry(gasketCurve, 48, 0.014, 8, true), M.rubberMat());
  gasket.userData.static = true;
  doorGroup.add(gasket);
  // door wheel on both faces
  const wheel = K.doorWheel(0.16);
  wheel.position.set(0, 0, -0.045);
  doorGroup.add(wheel);
  const wheel2 = K.doorWheel(0.16);
  wheel2.position.set(0, 0, 0.1);
  doorGroup.add(wheel2);
  // dogs (clamps) around edge
  const dogCurve = stadiumPath3(HATCH.width + 0.09, HATCH.height + 0.09, 0, 0, 0.027);
  for (let i = 0; i < 6; i++) {
    const t = i / 6 + 0.06;
    const p = dogCurve.getPointAt(t % 1);
    const dog = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.028, 0.028), M.bareSteel());
    dog.position.copy(p);
    dog.lookAt(0, 0, p.z);
    dog.userData.static = true;
    doorGroup.add(dog);
  }
  // hinge arms
  for (const hy of [-0.35, 0.35]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.05), M.darkSteel());
    arm.position.set((HATCH.width + 0.09) / 2 + 0.05, hy, 0.027);
    arm.userData.static = true;
    doorGroup.add(arm);
  }
  doorGroup.position.set(doorSide * (HATCH.width / 2 + 0.13), openCY, z + 0.10);
  doorGroup.rotation.y = doorSide * 1.85; // swung open toward aft wall
  doorGroup.userData.static = true;
  group.add(doorGroup);

  // sill / coaming step (walkable)
  const sill = new THREE.Mesh(new THREE.BoxGeometry(HATCH.width + 0.1, HATCH.sillY, 0.22), M.panelPaint('hatchRim', '#8f948a'));
  sill.position.set(0, HATCH.sillY / 2, z);
  sill.userData.static = true; sill.receiveShadow = true;
  group.add(sill);
  const sillTop = new THREE.Mesh(new THREE.BoxGeometry(HATCH.width + 0.1, 0.012, 0.24), M.hazardStripe());
  scaleUv(sillTop.geometry, 1, 1);
  sillTop.position.set(0, HATCH.sillY + 0.006, z);
  sillTop.userData.static = true;
  group.add(sillTop);

  // collision: sides + top + sill + open door
  const hw = HATCH.width / 2;
  C.addBox([-2, -0.5, z - 0.12], [-hw, 3, z + 0.12], { name: name + '-port' });
  C.addBox([hw, -0.5, z - 0.12], [2, 3, z + 0.12], { name: name + '-stbd' });
  C.addBox([-2, HATCH.bottomY + HATCH.height - 0.06, z - 0.12], [2, 3, z + 0.12], { name: name + '-top' });
  C.addBox([-hw - 0.05, 0, z - 0.13], [hw + 0.05, HATCH.sillY + 0.012, z + 0.13], { walkable: true, name: name + '-sill' });
  C.addBox([doorSide * (hw + 0.02), 0, z + 0.06], [doorSide * (hw + 0.75), 2.2, z + 0.34], { name: name + '-door' });
  return group;
}

// ---------------------------------------------------------------------------
// Decks
// ---------------------------------------------------------------------------
function buildDecks(group) {
  const deckMat = M.deckPlate();

  const mkDeck = (z0, z1, y, w) => {
    const geo = new THREE.BoxGeometry(w, 0.035, z1 - z0);
    const mesh = new THREE.Mesh(geo, deckMat);
    mesh.position.set(0, y - 0.0175, (z0 + z1) / 2);
    mesh.receiveShadow = true;
    mesh.userData.static = true;
    // retile uv so the 1.5m deck texture repeats correctly in both directions
    const uv = mesh.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / 1.5), uv.getY(i) * ((z1 - z0) / 1.5));
    group.add(mesh);
    return mesh;
  };

  // gutter fillets between deck edge and hull (dark steel angled strips)
  const mkGutters = (z0, z1, y, w) => {
    for (const s of [-1, 1]) {
      const g = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, z1 - z0), M.oilySteel());
      g.position.set(s * (w / 2 + 0.1), y - 0.045, (z0 + z1) / 2);
      g.rotation.z = s * 0.5;
      g.receiveShadow = true;
      g.userData.static = true;
      group.add(g);
    }
  };

  const mainW = floorHalfWidth(0) * 2 - 0.34;
  mkDeck(Z.controlStart, Z.bulkhead1 - 0.12, 0, mainW);
  mkDeck(Z.bulkhead1 + 0.12, Z.bulkhead2 - 0.12, 0, mainW);
  mkDeck(Z.bulkhead2 + 0.12, DECK.stepZ0, 0, mainW);
  mkGutters(Z.controlStart, DECK.stepZ0, 0, mainW);

  const engW = floorHalfWidth(DECK.engineY) * 2 - 0.3;
  mkDeck(DECK.stepZ1, Z.engineEnd + 0.5, DECK.engineY, engW);
  mkGutters(DECK.stepZ1, Z.engineEnd + 0.5, DECK.engineY, engW);

  // foot-traffic wear strips along the walking route
  const mkWear = (z0, z1, y, w = 0.6) => {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(w, z1 - z0), M.deckWear());
    strip.rotation.x = -Math.PI / 2;
    strip.rotation.z = Math.PI; // texture v along z
    strip.position.set(0, y + 0.019, (z0 + z1) / 2);
    strip.userData.static = true;
    strip.userData.noRaycast = true;
    group.add(strip);
  };
  mkWear(1.4, Z.bulkhead1 - 0.15, 0);
  mkWear(Z.bulkhead1 + 0.15, Z.bulkhead2 - 0.15, 0);
  mkWear(Z.bulkhead2 + 0.15, DECK.stepZ0, 0);
  mkWear(DECK.stepZ1, 20.1, DECK.engineY, 0.66);

  // stairs down into engine room: 2 treads
  const dy = DECK.mainY - DECK.engineY;
  const treads = 3;
  for (let i = 0; i < treads; i++) {
    const ty = DECK.mainY - (dy * (i + 1)) / treads;
    const tz = DECK.stepZ0 + ((DECK.stepZ1 - DECK.stepZ0) * (i + 0.5)) / treads;
    const tread = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.03, (DECK.stepZ1 - DECK.stepZ0) / treads + 0.06), deckMat);
    tread.position.set(0, ty - 0.015, tz);
    tread.receiveShadow = true; tread.userData.static = true;
    group.add(tread);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.012, 0.05), M.hazardStripe());
    nose.position.set(0, ty + 0.002, tz - (DECK.stepZ1 - DECK.stepZ0) / treads / 2 + 0.02);
    nose.userData.static = true;
    group.add(nose);
    C.addBox([-0.55, ty - 0.2, tz - 0.18], [0.55, ty, tz + 0.18], { walkable: true, name: 'stair' + i });
  }
  // stair rails
  for (const s of [-1, 1]) {
    group.add(K.handrail(
      [[s * 0.56, 0.95, DECK.stepZ0 - 0.25], [s * 0.56, 0.95 - dy * 0.8, DECK.stepZ1 + 0.15]],
      { r: 0.019, stanchionEvery: 0.5, baseY: DECK.engineY }
    ));
  }
}

// underfloor structure visible through grates (transverse beams + bilge pipes)
function buildBilge(group, z0, z1, y = 0, grateZs = []) {
  const bilgeMat = M.bilge();
  const trench = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, z1 - z0), bilgeMat);
  trench.position.set(0, y - 0.42, (z0 + z1) / 2);
  trench.userData.static = true;
  group.add(trench);
  const beamGeo = new THREE.BoxGeometry(1.15, 0.08, 0.04);
  for (let z = z0 + 0.25; z < z1; z += HULL.ribEvery) {
    const b = new THREE.Mesh(beamGeo, M.darkSteel());
    b.position.set(0, y - 0.2, z);
    b.userData.static = true;
    group.add(b);
  }
  group.add(K.pipeRun([[-0.28, y - 0.32, z0], [-0.28, y - 0.32, z1]], { r: 0.045, color: 'dark', flanges: [0.5], capEnds: false }));
  group.add(K.pipeRun([[0.24, y - 0.34, z0], [0.24, y - 0.34, z1]], { r: 0.03, color: 'copper', material: M.copper(), flanges: 'none', capEnds: false }));
  // faint warm spill under grates so the underfloor depth reads
  for (const zg of grateZs) {
    const l = new THREE.PointLight(0xd8b47e, 0.5, 1.1, 2);
    l.position.set(0, y - 0.16, zg);
    group.add(l);
  }
}

// ---------------------------------------------------------------------------
// Portholes through the hull
// ---------------------------------------------------------------------------
function buildPorthole(group, ph) {
  const beta = Math.acos((AY - ph.y) / R) * (ph.side > 0 ? -1 : 1);
  const b = ph.side > 0 ? Math.PI * 2 - Math.acos((AY - ph.y) / R) : Math.acos((AY - ph.y) / R);
  const cx = -Math.sin(b) * R, cy = AY - Math.cos(b) * R;
  const normal = new THREE.Vector3(Math.sin(b), Math.cos(b), 0); // inward
  const pos = new THREE.Vector3(cx, cy, ph.z);

  const g = new THREE.Group();
  g.position.copy(pos);
  // orient +z of assembly inward
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

  // sleeve through hull
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(ph.r + 0.035, ph.r + 0.035, 0.34, 24, 1, true), M.darkSteel());
  sleeve.rotation.x = Math.PI / 2;
  sleeve.material.side = THREE.DoubleSide;
  sleeve.userData.static = true;
  g.add(sleeve);
  // inner ring frame
  const ring = new THREE.Mesh(new THREE.TorusGeometry(ph.r + 0.045, 0.028, 10, 28), M.panelPaint('portholeBrass', '#7a6a4a'));
  ring.position.z = 0.16;
  ring.userData.static = true;
  g.add(ring);
  const ring2 = new THREE.Mesh(K.ringPlate(ph.r + 0.01, ph.r + 0.075, 0.03, 28), M.panelPaint('portholeBrass', '#7a6a4a'));
  ring2.rotation.x = Math.PI / 2;
  ring2.position.z = 0.135;
  ring2.userData.static = true;
  g.add(ring2);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    K.addBolt(
      new THREE.Vector3(Math.cos(a) * (ph.r + 0.062), Math.sin(a) * (ph.r + 0.062), 0.152).applyQuaternion(g.quaternion).add(pos),
      normal, 'S'
    );
  }
  // glass: two panes for thickness + tinted edge
  const glassGeo = new THREE.CircleGeometry(ph.r, 28);
  const glass1 = new THREE.Mesh(glassGeo, M.glassThick());
  glass1.position.z = 0.1;
  glass1.userData.noRaycast = true;
  const glass2 = new THREE.Mesh(glassGeo, M.glassThick());
  glass2.position.z = 0.02;
  glass2.userData.noRaycast = true;
  g.add(glass1, glass2);
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(ph.r + 0.002, ph.r + 0.002, 0.08, 28, 1, true), M.glassEdge());
  edge.rotation.x = Math.PI / 2;
  edge.position.z = 0.06;
  edge.material.side = THREE.BackSide;
  edge.userData.static = true;
  g.add(edge);
  // hinged deadlight cover stowed flush against the hull above the port
  const cover = new THREE.Mesh(new THREE.CylinderGeometry(ph.r + 0.04, ph.r + 0.04, 0.016, 24), M.darkSteel());
  cover.rotation.x = Math.PI / 2 - 0.16; // hug the hull curvature
  cover.position.set(0, ph.r * 2 + 0.14, 0.1);
  cover.userData.static = true;
  g.add(cover);
  const coverHinge = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.09, 8), M.bareSteel());
  coverHinge.rotation.z = Math.PI / 2;
  coverHinge.position.set(0, ph.r + 0.09, 0.13);
  coverHinge.userData.static = true;
  g.add(coverHinge);
  // butterfly retaining clips holding the stowed cover
  for (const s of [-1, 1]) {
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.05, 0.03), M.bareSteel());
    clip.position.set(s * (ph.r - 0.02), ph.r * 2 + 0.2, 0.09);
    clip.userData.static = true;
    g.add(clip);
  }
  group.add(g);
}

// ---------------------------------------------------------------------------
// Forward pressure bulkhead with observation viewports
// ---------------------------------------------------------------------------
function buildForwardBulkhead(group) {
  const z = Z.controlStart; // 0.4
  const thick = 0.12;
  const disc = new THREE.Shape();
  disc.absarc(0, 0, R - 0.005, 0, Math.PI * 2);
  // main viewport hole + two side ports
  const mkHole = (hx, hy, hr) => {
    const p = new THREE.Path();
    p.absarc(hx, hy - AY, hr, 0, Math.PI * 2, true);
    disc.holes.push(p);
  };
  mkHole(0, VIEWPORT.y, VIEWPORT.r + 0.01);
  mkHole(-0.78, 1.12, 0.15);
  mkHole(0.78, 1.12, 0.15);
  const geo = new THREE.ExtrudeGeometry(disc, { depth: thick, bevelEnabled: false, curveSegments: 48 });
  scaleUv(geo, 0.4, 0.4);
  const wall = new THREE.Mesh(geo, M.panelPaint('bowBulkhead', '#a3a294'));
  wall.position.set(0, AY, z - thick);
  wall.receiveShadow = true; wall.castShadow = true; wall.userData.static = true;
  group.add(wall);

  // main viewport: deep conical seat + thick glass + bolted retainer ring
  const vg = new THREE.Group();
  vg.position.set(0, VIEWPORT.y, z);
  // conical sleeve, opens outward-forward
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(VIEWPORT.r + 0.005, VIEWPORT.r + 0.13, 0.55, 36, 1, true), M.darkSteel());
  cone.rotation.x = -Math.PI / 2;
  cone.material.side = THREE.DoubleSide;
  cone.position.z = -0.27;
  cone.userData.static = true;
  vg.add(cone);
  // heavy retainer ring inside
  const ret = new THREE.Mesh(new THREE.TorusGeometry(VIEWPORT.r + 0.075, 0.055, 12, 40), M.gunmetal());
  ret.position.z = 0.03;
  ret.userData.static = true;
  vg.add(ret);
  const retPlate = new THREE.Mesh(K.ringPlate(VIEWPORT.r + 0.03, VIEWPORT.r + 0.15, 0.045), M.gunmetal());
  retPlate.rotation.x = Math.PI / 2;
  retPlate.position.z = -0.005;
  retPlate.userData.static = true;
  vg.add(retPlate);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    K.addBolt(new THREE.Vector3(Math.cos(a) * (VIEWPORT.r + 0.115), VIEWPORT.y + Math.sin(a) * (VIEWPORT.r + 0.115), z + 0.025), new THREE.Vector3(0, 0, 1), 'M');
  }
  // glass panes (thick, 2 surfaces) + tinted edge ring — faces toward interior
  const glassGeo = new THREE.CircleGeometry(VIEWPORT.r, 36);
  const g1 = new THREE.Mesh(glassGeo, M.glassThick());
  g1.position.z = -0.02; g1.userData.noRaycast = true;
  const g2 = new THREE.Mesh(glassGeo, M.glassThick());
  g2.position.z = -0.13; g2.userData.noRaycast = true;
  vg.add(g1, g2);
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(VIEWPORT.r + 0.002, VIEWPORT.r + 0.002, 0.11, 36, 1, true), M.glassEdge());
  edge.rotation.x = Math.PI / 2;
  edge.position.z = -0.075;
  edge.material.side = THREE.BackSide;
  edge.userData.static = true;
  vg.add(edge);
  // condensation film at the lower glass rim (annular arc, not a pie wedge)
  const condGeo = new THREE.RingGeometry(VIEWPORT.r * 0.72, VIEWPORT.r * 0.97, 28, 2, Math.PI + 0.5, Math.PI - 1.0);
  const cond = new THREE.Mesh(condGeo, M.condensation());
  cond.position.z = 0.005;
  cond.userData.noRaycast = true; cond.userData.static = true;
  vg.add(cond);
  group.add(vg);

  // side ports
  for (const sx of [-0.78, 0.78]) {
    const sp = new THREE.Group();
    sp.position.set(sx, 1.12, z);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.19, 0.4, 24, 1, true), M.darkSteel());
    sleeve.rotation.x = -Math.PI / 2; sleeve.position.z = -0.2;
    sleeve.material.side = THREE.DoubleSide;
    sleeve.userData.static = true;
    sp.add(sleeve);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.03, 8, 24), M.gunmetal());
    ring.position.z = 0.02; ring.userData.static = true;
    sp.add(ring);
    const gl = new THREE.Mesh(new THREE.CircleGeometry(0.145, 24), M.glassThick());
    gl.position.z = -0.06; gl.userData.noRaycast = true;
    sp.add(gl);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      K.addBolt(new THREE.Vector3(sx + Math.cos(a) * 0.165, 1.12 + Math.sin(a) * 0.165, z + 0.038), new THREE.Vector3(0, 0, 1), 'S');
    }
    group.add(sp);
  }

  // collision: whole forward wall (opening is glass)
  C.addBox([-1.7, -0.5, z - 0.2], [1.7, 3.2, z + 0.02], { name: 'fwd-bulkhead' });
}

// ---------------------------------------------------------------------------
// Stern closure: dome + shaft gland boss
// ---------------------------------------------------------------------------
function buildStern(group) {
  const domeMat = M.panelPaint('domePaint', '#aaa798').clone();
  domeMat.side = THREE.BackSide;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
  dome.rotation.x = Math.PI / 2; // opens toward -z; local +Y (pole) -> world +Z
  dome.scale.y = 0.62; // squash along the boat axis (local Y = pole axis)
  dome.position.set(0, AY, Z.engineEnd + 0.35);
  dome.userData.static = true;
  dome.receiveShadow = true;
  group.add(dome);
  C.addBox([-1.7, -1, Z.engineEnd + 0.15], [1.7, 3.2, Z.engineEnd + 2], { name: 'stern' });
}

// exterior bow fairing seen through the forward viewport (ring shroud with an
// open cone forward so the viewports look into open water)
function buildBowExterior(group) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x11181a, roughness: 0.9, metalness: 0.3, envMapIntensity: 0.2, side: THREE.DoubleSide });
  const fair = new THREE.Mesh(new THREE.SphereGeometry(1.95, 36, 18, 0, Math.PI * 2, 0.52, Math.PI / 2 - 0.52), mat);
  fair.rotation.x = -Math.PI / 2;
  fair.scale.y = 1.15; // stretch along boat axis (local Y = pole axis)
  fair.position.set(0, AY, Z.controlStart - 0.35);
  fair.userData.static = true;
  group.add(fair);
  // floodlight housings on the fairing shoulders (cones added by water.js)
  for (const sx of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.3, 14), mat);
    h.position.set(sx * 1.05, 1.7, -1.15);
    h.rotation.x = -1.25;
    h.userData.static = true;
    group.add(h);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.085, 14), new THREE.MeshStandardMaterial({
      color: 0x222222, emissive: 0xbfd9dc, emissiveIntensity: 3.2, roughness: 0.2,
    }));
    lens.position.set(sx * 1.05, 1.75, -1.3);
    lens.rotation.x = -1.25 - Math.PI / 2;
    lens.userData.static = true;
    lens.userData.floodLens = true;
    group.add(lens);
  }
}

// ---------------------------------------------------------------------------

export function build(ctx) {
  const group = new THREE.Group();
  group.name = 'submarine';

  // porthole holes in hull shell
  const holes = PORTHOLES.map((ph) => {
    const b = ph.side > 0 ? Math.PI * 2 - Math.acos((AY - ph.y) / R) : Math.acos((AY - ph.y) / R);
    return { z: ph.z, beta: b, rz: ph.r + 0.045, rb: ph.r + 0.045 };
  });

  group.add(buildHullShell(Z.controlStart, Z.engineEnd + 0.4, holes));
  buildRibs(group, Z.controlStart + 0.25, Z.engineEnd + 0.3);
  buildDecks(group);
  buildBilge(group, 6.4, 13.0, 0, [6.9, 9.7, 12.5]);
  buildBilge(group, 18.0, 22.8, DECK.engineY, [18.35, 19.3]);
  buildBulkhead(group, Z.bulkhead1, { doorSide: 1, name: 'BH1' });
  buildBulkhead(group, Z.bulkhead2, { doorSide: -1, name: 'BH2' });
  buildForwardBulkhead(group);
  buildStern(group);
  buildBowExterior(group);
  for (const ph of PORTHOLES) buildPorthole(group, ph);

  // heavy frame ring at engine-room entrance (no door)
  const { web } = ribGeometry(0.2, 0.09);
  const ring = new THREE.Mesh(web, M.panelPaint('frameRing', '#8f948a'));
  ring.position.set(0, AY, Z.frameRing - 0.045);
  ring.userData.static = true; ring.receiveShadow = true;
  group.add(ring);

  return group;
}
