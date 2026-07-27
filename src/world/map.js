import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  plasterMaterial, brickMaterial, concreteMaterial, asphaltMaterial,
  dirtMaterial, flatMaterial, woodMaterial, shutterMaterial, signMaterial,
  posterMaterial, sandDriftMaterial, groundOverlayMaterial, muralMaterial,
  wheelPathMaterial, metalMaterial, wallGrimeMaterial, revealMaterial,
  underShadowMaterial, sootFanMaterial, scorchMarkMaterial, rubbleDustMaterial,
  impactChipMaterial, contactShadowMaterial,
} from './materials.js';
import {
  jerseyBarrier, sandbagWall, barrel, crate, wreckedCar, powerPole, wire,
  tireStack, rubblePile, metalFence, streetLight, awning, acUnit, waterTank,
  contactShadow, stackedCrates, flagLine, leaningPowerPole, cardboardCluster,
} from './props.js';
import { makeRNG } from '../core/utils.js';

// ===========================================================================
// "DUST DISTRICT" — war-torn urban combat map, ~170m x 170m.
// Classic 3-lane layout: main street (N-S), cross street (E-W), central
// intersection kill-zone. Buildings enclose the space; props provide cover.
// ===========================================================================

const FLOOR_H = 3.3;

// Scale a BoxGeometry's per-face UVs so 1 texture tile = texScale meters.
function scaleBoxUV(geo, w, h, d, texScale = 3) {
  const uv = geo.attributes.uv;
  // BoxGeometry face order: +x -x +y -y +z -z ; 4 verts each
  const faceDims = [
    [d, h], [d, h], [w, d], [w, d], [w, h], [w, h],
  ];
  for (let f = 0; f < 6; f++) {
    const [su, sv] = faceDims[f];
    for (let i = 0; i < 4; i++) {
      const idx = f * 4 + i;
      uv.setXY(idx, uv.getX(idx) * (su / texScale), uv.getY(idx) * (sv / texScale));
    }
  }
  uv.needsUpdate = true;
  return geo;
}

function texturedBox(w, h, d, mat, texScale = 3, uvOff = null) {
  const geo = scaleBoxUV(new THREE.BoxGeometry(w, h, d), w, h, d, texScale);
  if (uvOff) { // per-instance texture phase shift kills visible tiling repeats
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + uvOff[0], uv.getY(i) + uvOff[1]);
  }
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

// UV-scaled box geometry translated into world space, for merged trim meshes.
function trimBoxGeo(w, h, d, texScale, x, y, z) {
  return scaleBoxUV(new THREE.BoxGeometry(w, h, d), w, h, d, texScale).translate(x, y, z);
}

// Scale cylinder UVs so the texture tiles in meters (matches texturedBox).
function scaleCylUV(geo, radius, height, texScale = 3) {
  const uv = geo.attributes.uv;
  const su = (Math.PI * 2 * radius) / texScale;
  const sv = height / texScale;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
  return geo;
}

const FRONT = {
  px: { axis: 'x', nx: 1 }, nx: { axis: 'x', nx: -1 },
  pz: { axis: 'z', nx: 1 }, nz: { axis: 'z', nx: -1 },
};

export class GameMap {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.colliders = [];        // THREE.Box3 world-space, for physics + bullets
    this.spawnPoints = [];      // enemy spawns
    this.coverSpots = [];       // positions AI can take cover at
    this.rng = makeRNG(424242);

    this.windowGlassMatrices = [];
    this.windowGlassColors = [];
    this.windowFrameMatrices = [];
    this.windowFrameColors = [];
    this.litPaneMatrices = [];
    this.litPaneColors = [];

    // Facade detail batches (flushed once into merged/instanced meshes)
    this.trimGeos = [];       // light concrete string courses / cornices
    this.plinthGeos = [];     // dark grime band at building bases
    this.shutterMatrices = []; this.shutterColors = [];
    this.signMatrices = [[], [], []]; this.signColors = [[], [], []];
    this.posterMatrices = [[], [], []];
    this.pipeMatrices = [];
    this.antennaMatrices = [];
    this.wallAcMatrices = [];
    this.balconyMatrices = [];
    this.sootMatrices = [];    // black smoke fans above burned-out openings
    this.chipMatrices = [];    // bullet-pock / chip patches on walls
    this.rubbleSpecs = [];     // collapse spills queued by damaged buildings

    this.buildGround();
    this.buildRoads();
    this.buildBlocks();
    this.buildLandmarks();
    this.buildStreetProps();
    this.buildWarTornDressing();
    this.buildBoundary();
    this.buildDistantSkyline();
    this.flushWindowInstances();
    this.flushFacadeInstances();

    scene.add(this.group);
  }

  addCollider(cx, cy, cz, w, h, d) {
    const b = new THREE.Box3(
      new THREE.Vector3(cx - w / 2, cy - h / 2, cz - d / 2),
      new THREE.Vector3(cx + w / 2, cy + h / 2, cz + d / 2)
    );
    this.colliders.push(b);
    return b;
  }

  placeProp(builder, x, z, rotY = 0, registerCover = false) {
    const p = builder();
    p.position.set(x, 0, z);
    p.rotation.y = rotY;
    this.group.add(p);
    const c = p.userData.collider;
    if (c) {
      // Axis-align the box for 90° rotations; swap w/d when rotated ~90°
      const quarter = Math.abs(Math.sin(rotY));
      const w = c.w * (1 - quarter) + c.d * quarter;
      const d = c.d * (1 - quarter) + c.w * quarter;
      this.addCollider(x, c.h / 2, z, w, c.h, d);
      if (registerCover) this.coverSpots.push(new THREE.Vector3(x, 0, z));
    }
    return p;
  }

  // ------------------------------------------------------------------ ground
  buildGround() {
    const dirt = new THREE.Mesh(new THREE.PlaneGeometry(400, 400, 1, 1), dirtMaterial());
    dirt.geometry.attributes.uv.array.forEach((v, i, a) => { a[i] = v * 34; });
    dirt.rotation.x = -Math.PI / 2;
    dirt.receiveShadow = true;
    this.group.add(dirt);

    // Non-tiling macro overlay: large soil/sand patches kill texture repetition
    const overlay = new THREE.Mesh(new THREE.PlaneGeometry(390, 390), groundOverlayMaterial());
    overlay.rotation.x = -Math.PI / 2;
    overlay.position.y = 0.015;
    overlay.renderOrder = 1;
    overlay.receiveShadow = true;
    this.group.add(overlay);

    // Debris field: small stones/chunks scattered with intent (edges, walls)
    const r = makeRNG(60321);
    const n = 340;
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), flatMaterial(0xffffff, 0.95, 0, 0.5), n);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const col = new THREE.Color();
    const shades = [0x6e6a62, 0x86795f, 0x4a453e, 0x7b746a, 0x5c564e];
    for (let i = 0; i < n; i++) {
      let x, z;
      const roll = r();
      if (roll < 0.35) { // open dirt
        do { x = r.range(-82, 82); z = r.range(-82, 82); } while (Math.abs(x) < 7.5 && Math.abs(z) < 7.5);
      } else if (roll < 0.65) { // road gutters
        if (r.chance(0.5)) { x = r.pick([-1, 1]) * r.range(4.0, 6.4); z = r.range(-80, 80); }
        else { z = r.pick([-1, 1]) * r.range(3.6, 5.8); x = r.range(-80, 80); }
      } else { // building lines
        if (r.chance(0.5)) { x = r.pick([-1, 1]) * r.range(12.2, 14.2); z = r.range(-70, 70); }
        else { z = r.pick([-1, 1]) * r.range(11.6, 13.6); x = r.range(-70, 70); }
      }
      const s = r.range(0.05, 0.3);
      q.setFromEuler(new THREE.Euler(r.range(0, 3), r.range(0, 3), r.range(0, 3)));
      m4.compose(new THREE.Vector3(x, s * 0.28, z), q, new THREE.Vector3(s, s * r.range(0.5, 0.8), s * r.range(0.7, 1.4)));
      inst.setMatrixAt(i, m4);
      col.setHex(r.pick(shades)).multiplyScalar(r.range(0.8, 1.02));
      inst.setColorAt(i, col);
    }
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.castShadow = true; inst.receiveShadow = true;
    this.group.add(inst);

    // Wind-blown trash along the gutters (flat scraps, instanced); the last
    // batch is dumped across the main-street corridor so the combat lane
    // reads littered, not swept.
    const tn = 210;
    const trash = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), flatMaterial(0xffffff, 0.92, 0, 0.4), tn);
    const tShades = [0xb8b2a4, 0x8a8578, 0x4a5560, 0x746a58, 0x9aa08e, 0x99552f];
    for (let i = 0; i < tn; i++) {
      let x, z;
      if (i >= 130) { x = r.range(-7.4, 7.4); z = r.range(-4, 57); }
      else if (r.chance(0.55)) { x = r.pick([-1, 1]) * r.range(4.0, 6.6); z = r.range(-76, 76); }
      else { z = r.pick([-1, 1]) * r.range(3.5, 5.6); x = r.range(-76, 76); }
      const sx = i >= 130 ? r.range(0.14, 0.42) : r.range(0.1, 0.32);
      q.setFromEuler(new THREE.Euler(r.range(-0.15, 0.15), r.range(0, 3.14), r.range(-0.1, 0.1)));
      m4.compose(new THREE.Vector3(x, 0.035, z), q, new THREE.Vector3(sx, 0.014, sx * r.range(0.5, 0.9)));
      trash.setMatrixAt(i, m4);
      col.setHex(r.pick(tShades)).multiplyScalar(r.range(0.8, 1.05));
      trash.setColorAt(i, col);
    }
    trash.instanceMatrix.needsUpdate = true;
    if (trash.instanceColor) trash.instanceColor.needsUpdate = true;
    trash.receiveShadow = true;
    this.group.add(trash);
  }

  // Baked occlusion band under an overhang (dark at top edge, fades down).
  // yTop = the overhang line; the band hangs below it against the wall.
  addUnderShadow(wid, hgt, x, yTop, z, rotY) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(wid, hgt), underShadowMaterial());
    m.position.set(x, yTop - hgt / 2, z);
    m.rotation.y = rotY;
    m.renderOrder = 2;
    this.group.add(m);
  }

  // Dark grime gradient where a wall meets the ground (fades out ~1m up)
  addGrimeSkirt(wid, x, z, rotY, h = 0.95) {
    const geo = new THREE.PlaneGeometry(wid, h);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * (wid / 3.2));
    const m = new THREE.Mesh(geo, wallGrimeMaterial());
    m.position.set(x, h / 2 + 0.02, z);
    m.rotation.y = rotY;
    m.renderOrder = 2;
    m.receiveShadow = true;
    this.group.add(m);
  }

  addSandDrift(x, z, len, wid, rot) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, wid), sandDriftMaterial());
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = rot;
    m.position.set(x, 0.045, z);
    m.renderOrder = 4;
    m.receiveShadow = true;
    this.group.add(m);
  }

  // ------------------------------------------------------------------- roads
  buildRoads() {
    const road = asphaltMaterial();
    const mkRoad = (w, l, x, z, rot = 0) => {
      const geo = new THREE.PlaneGeometry(w, l);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / 9), uv.getY(i) * (l / 9));
      const m = new THREE.Mesh(geo, road);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = rot;
      m.position.set(x, 0.02, z);
      m.receiveShadow = true;
      this.group.add(m);
    };
    mkRoad(10, 168, 0, 0);                 // main N-S street
    mkRoad(9, 168, 0, 0, Math.PI / 2);     // cross E-W street

    // Sidewalks with curbs
    const walk = concreteMaterial(33, 0.7);
    const mkWalk = (w, l, x, z) => {
      const m = texturedBox(w, 0.14, l, walk, 1.9);
      m.position.set(x, 0.07, z);
      this.group.add(m);
      this.addCollider(x, 0.07, z, w, 0.14, l); // step-up handled by physics
    };
    // Along main street
    mkWalk(2.6, 66, -6.3, -41.5); mkWalk(2.6, 66, 6.3, -41.5);
    mkWalk(2.6, 66, -6.3, 41.5); mkWalk(2.6, 66, 6.3, 41.5);
    // Along cross street
    mkWalk(66, 2.6, -41.5, -5.8); mkWalk(66, 2.6, -41.5, 5.8);
    mkWalk(66, 2.6, 41.5, -5.8); mkWalk(66, 2.6, 41.5, 5.8);

    // Lane markings: worn dashed center line (some dashes missing)
    const rl = makeRNG(8181);
    const lineMat = flatMaterial(0x776f5f, 0.94);
    const dash = new THREE.PlaneGeometry(0.14, 1.9);
    for (let z = -78; z < 80; z += 6) {
      if (Math.abs(z) < 6 || rl.chance(0.28)) continue;
      const m = new THREE.Mesh(dash, lineMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(rl.range(-0.04, 0.04), 0.035, z);
      m.receiveShadow = true;
      this.group.add(m);
    }
    const dashH = new THREE.PlaneGeometry(1.9, 0.14);
    for (let x = -78; x < 80; x += 6) {
      if (Math.abs(x) < 6 || rl.chance(0.28)) continue;
      const m = new THREE.Mesh(dashH, lineMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.035, rl.range(-0.04, 0.04));
      m.receiveShadow = true;
      this.group.add(m);
    }
    // Crosswalk stripes at intersection (faded, chipped)
    const stripe = new THREE.PlaneGeometry(0.55, 3.4);
    for (const zSide of [-6.8, 6.8]) {
      for (let x = -3.8; x <= 3.8; x += 1.1) {
        if (rl.chance(0.3)) continue;
        const m = new THREE.Mesh(stripe, lineMat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(x, 0.033, zSide);
        this.group.add(m);
      }
    }
    // Manhole covers
    const mhMat = flatMaterial(0x33302b, 0.85, 0.5, 0.7);
    for (const [x, z] of [[1.6, -18], [-1.8, 26], [2.2, 52], [-24, 1.4], [30, -1.6]]) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), mhMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.032, z);
      m.receiveShadow = true;
      this.group.add(m);
    }
    // Traffic-polished wheel paths down each lane
    const wp = wheelPathMaterial();
    const mkPath = (x, z, rotZ) => {
      const geo = new THREE.PlaneGeometry(3.2, 168);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i) * (168 / 22));
      const m = new THREE.Mesh(geo, wp);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = rotZ;
      m.position.set(x, 0.028, z);
      m.renderOrder = 3;
      m.receiveShadow = true;
      this.group.add(m);
    };
    mkPath(-2.3, 0, 0); mkPath(2.3, 0, 0);
    mkPath(0, -2.1, Math.PI / 2); mkPath(0, 2.1, Math.PI / 2);
  }

  // ------------------------------------------------------- buildings & blocks
  buildBlocks() {
    const r = this.rng;
    const tints = [0xded6c2, 0xcbb89a, 0xb8b0a2, 0xc9a878, 0xd6c3a0, 0xcfae94, 0xbfae96];

    // Building slots: [x, z, facing] — facing is the direction the front looks
    const slots = [];
    // West side of main street (front faces +x)
    for (let z = -66; z <= 66; z += 17) { if (Math.abs(z) > 10) slots.push([-14.5, z, 'px']); }
    // East side (front faces -x)
    for (let z = -66; z <= 66; z += 17) { if (Math.abs(z) > 10) slots.push([14.5, z, 'nx']); }
    // North side of cross street (front faces +z)
    for (let x = -66; x <= 66; x += 19) { if (Math.abs(x) > 24) slots.push([x, -14, 'pz']); }
    // South side (front faces -z)
    for (let x = -66; x <= 66; x += 19) { if (Math.abs(x) > 24) slots.push([x, 14, 'nz']); }
    // Back-row filler for skyline depth
    for (let z = -60; z <= 60; z += 24) { slots.push([-34, z + 6, 'px', true]); slots.push([34, z - 6, 'nx', true]); }
    for (let x = -58; x <= 58; x += 26) { slots.push([x + 4, -34, 'pz', true]); slots.push([x - 4, 34, 'nz', true]); }

    // Shell-struck buildings: collapsed upper corner on the two mid-block
    // buildings that dominate the default view from the spawn at (0, 58).
    // cx picks the street-side corner, cz=+1 the camera-side corner, so the
    // roofline visibly steps down at the near corner and the interior brick
    // shear face (normal +z) looks straight back at the player, with sky
    // showing through the bite.
    // NOTE: east z=36 is the ruin slot (idx 13), so the east break lives at
    // z=19 where it still rises over the intersection skyline.
    const damageSlots = [
      { x: 14.5, z: 19, cx: -1, cz: 1 },   // east, over the intersection corner
      { x: -14.5, z: 36, cx: 1, cz: 1 },   // west mid-block hero break
    ];

    let idx = 0;
    for (const [x, z, facing, backRow] of slots) {
      idx++;
      const ruin = !backRow && (idx % 9 === 4); // a few street-front ruins
      const floors = backRow ? r.int(3, 5) : (r.chance(0.18) ? 4 : r.int(2, 3));
      let w = r.range(11, 15.5);
      let d = r.range(9, 13);
      const tint = tints[idx % tints.length];
      // Slight setback jitter perpendicular to the street for depth variety
      let bx = x, bz = z;
      const jit = r.range(-0.7, 0.5);
      if (facing === 'px') bx -= jit; if (facing === 'nx') bx += jit;
      if (facing === 'pz') bz -= jit; if (facing === 'nz') bz += jit;
      if (backRow) {
        // Keep second-row buildings out of the street corridors (|x|<8 / |z|<8)
        if (Math.abs(bz) < 10) bz = Math.sign(bz || 1) * 12;
        if (Math.abs(bx) < 10) bx = Math.sign(bx || 1) * 12;
        if (Math.abs(bz) < 20) d = Math.min(d, 2 * (Math.abs(bz) - 8));
        if (Math.abs(bx) < 20) w = Math.min(w, 2 * (Math.abs(bx) - 8));
      }
      if (ruin) {
        this.buildRuin(bx, bz, w, d, tint, idx);
      } else {
        const damage = !backRow
          ? damageSlots.find((s) => s.x === x && s.z === z) ?? null
          : null;
        this.buildBuilding(bx, bz, w, d, floors, facing, tint, idx, backRow, damage);
      }
    }
  }

  buildBuilding(x, z, w, d, floors, facing, tint, seed, backRow = false, damage = null) {
    const r = makeRNG(seed * 3131);
    const dr = makeRNG(seed * 977 + 13); // decal rng: soot fans / impact chips
    if (damage) floors = Math.max(floors, 4); // tall enough that the bite cuts sky, not skyline
    const h = floors * FLOOR_H;
    const brickRoll = r.chance(0.22);
    const isBrick = !damage && brickRoll; // damaged buildings stay plaster (brick shows at the break)
    // Damaged buildings get pale plaster so the dark break recess pops
    const mat = isBrick ? brickMaterial(21 + (seed % 3)) : plasterMaterial(damage ? 0xe3dbc6 : tint, 11 + (seed % 2));
    const uvOff = [r(), r()]; // texture phase per building — hides tiling repeats
    const texScale = isBrick ? 3.2 : r.pick([2.6, 3.4]);
    // Collapsed-corner parameters: cx/cz pick the corner, nw/nd the bite size.
    // The collapse is STEPPED so the skyline actually breaks from any angle:
    // the inboard slab (upA) keeps full height, the street-side strip (upB)
    // lost its top storey (torn roof at yStep), and the corner itself is
    // sheared all the way down to yBreak, two storeys below the parapet.
    const dmg = damage ? {
      cx: damage.cx, cz: damage.cz,
      nw: w * r.range(0.6, 0.68),
      nd: d * r.range(0.55, 0.65),
      yBreak: (floors - 2) * FLOOR_H,
      yStep: (floors - 1) * FLOOR_H,
    } : null;
    if (!dmg) {
      const body = texturedBox(w, h, d, mat, texScale, uvOff);
      body.position.set(x, h / 2, z);
      this.group.add(body);
    } else {
      // Body minus the bite: full lower slab + tall inboard slab + low strip
      const { cx, cz, nw, nd, yBreak, yStep } = dmg;
      const low = texturedBox(w, yBreak, d, mat, texScale, uvOff);
      low.position.set(x, yBreak / 2, z);
      this.group.add(low);
      const upOff = [uvOff[0], uvOff[1] + yBreak / texScale]; // keep texture rows continuous
      const upA = texturedBox(w - nw, h - yBreak, d, mat, texScale, upOff);
      upA.position.set(x - cx * nw / 2, yBreak + (h - yBreak) / 2, z);
      this.group.add(upA);
      const upB = texturedBox(nw, yStep - yBreak, d - nd, mat, texScale, upOff);
      upB.position.set(x + cx * (w - nw) / 2, yBreak + (yStep - yBreak) / 2, z - cz * nd / 2);
      this.group.add(upB);
    }
    this.addCollider(x, h / 2, z, w, h, d);

    // Grime where the walls meet the ground
    this.addGrimeSkirt(w + 0.2, x, z + d / 2 + 0.075, 0);
    this.addGrimeSkirt(w + 0.2, x, z - d / 2 - 0.075, Math.PI);
    this.addGrimeSkirt(d + 0.2, x + w / 2 + 0.075, z, Math.PI / 2);
    this.addGrimeSkirt(d + 0.2, x - w / 2 - 0.075, z, -Math.PI / 2);
    // Occlusion band under the cornice overhang (top of every wall face);
    // on damaged buildings the two notch-side faces only get the intact run.
    if (!dmg) {
      this.addUnderShadow(w + 0.1, 0.62, x, h - 0.2, z + d / 2 + 0.045, 0);
      this.addUnderShadow(w + 0.1, 0.62, x, h - 0.2, z - d / 2 - 0.045, Math.PI);
      this.addUnderShadow(d + 0.1, 0.62, x + w / 2 + 0.045, h - 0.2, z, Math.PI / 2);
      this.addUnderShadow(d + 0.1, 0.62, x - w / 2 - 0.045, h - 0.2, z, -Math.PI / 2);
    } else {
      const { cx, cz, nw, nd } = dmg;
      this.addUnderShadow(w + 0.1, 0.62, x, h - 0.2, z - cz * (d / 2 + 0.045), cz > 0 ? Math.PI : 0);
      this.addUnderShadow(d + 0.1, 0.62, x - cx * (w / 2 + 0.045), h - 0.2, z, cx > 0 ? -Math.PI / 2 : Math.PI / 2);
      this.addUnderShadow(w - nw + 0.1, 0.62, x - cx * nw / 2, h - 0.2, z + cz * (d / 2 + 0.045), cz > 0 ? 0 : Math.PI);
      // (street face over the torn strip gets no cornice band — its top is a tear)
    }

    const front = FRONT[facing];

    // --- Merged trim: plinth (grimy base), string courses, cornice ---
    this.plinthGeos.push(trimBoxGeo(w + 0.12, 1.05, d + 0.12, 1.6, x, 0.53, z));
    for (let f = 1; f < floors; f++) {
      this.trimGeos.push(trimBoxGeo(w + 0.16, 0.15, d + 0.16, 2.0, x, f * FLOOR_H + 0.02, z));
    }
    if (!dmg) {
      this.trimGeos.push(trimBoxGeo(w + 0.26, 0.22, d + 0.26, 2.0, x, h - 0.11, z));
    } else {
      const { cx, nw } = dmg;
      // Cornice survives only on the full-height inboard slab
      this.trimGeos.push(trimBoxGeo(w - nw + 0.26, 0.22, d + 0.26, 2.0, x - cx * nw / 2, h - 0.11, z));
    }

    // Parapet + concrete coping cap
    const ppH = r.range(0.5, 0.95);
    if (!dmg) {
      const pp = texturedBox(w + 0.3, ppH, d + 0.3, mat, isBrick ? 3.2 : 2.8, uvOff);
      pp.position.set(x, h + ppH / 2, z);
      this.group.add(pp);
      this.trimGeos.push(trimBoxGeo(w + 0.42, 0.09, d + 0.42, 2.0, x, h + ppH + 0.045, z));
    } else {
      const { cx, nw } = dmg;
      // Parapet + coping only over the intact slab; the strip's top is torn
      const ppA = texturedBox(w - nw + 0.3, ppH, d + 0.3, mat, 2.8, uvOff);
      ppA.position.set(x - cx * nw / 2, h + ppH / 2, z);
      this.group.add(ppA);
      this.trimGeos.push(trimBoxGeo(w - nw + 0.42, 0.09, d + 0.42, 2.0, x - cx * nw / 2, h + ppH + 0.045, z));
      this.addCollapseDressing(x, z, w, d, h, ppH, dmg, mat, r, seed);
    }

    // --- Roof clutter: stair bulkhead, tanks, AC, antennas ---
    // (skipped on damaged buildings — the collapse owns that roofline)
    if (!dmg && r.chance(0.55)) {
      const bw = r.range(2.0, 2.8), bh = r.range(2.0, 2.4), bd = r.range(2.2, 3.0);
      const bk = texturedBox(bw, bh, bd, mat, 2.4, uvOff);
      bk.position.set(x + r.range(-w / 4, w / 4), h + bh / 2, z + r.range(-d / 4, d / 4));
      this.group.add(bk);
      const doorPl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.9), flatMaterial(0x2a241d, 0.9));
      doorPl.position.set(bk.position.x, h + 1.0, bk.position.z + bd / 2 + 0.01);
      this.group.add(doorPl);
    }
    if (!dmg && r.chance(0.5)) { const t = waterTank(); t.position.set(x + r.range(-w / 4, w / 4), h + 0.5, z + r.range(-d / 4, d / 4)); this.group.add(t); }
    if (!dmg && r.chance(0.6)) { const a = acUnit(); a.position.set(x + r.range(-w / 4, w / 4), h + 0.8, z + r.range(-d / 4, d / 4)); this.group.add(a); }
    if (!dmg && r.chance(0.5)) {
      const ax = x + r.range(-w / 3, w / 3), az = z + r.range(-d / 3, d / 3);
      this.antennaMatrices.push(new THREE.Matrix4().compose(
        new THREE.Vector3(ax, h, az),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r.range(0, Math.PI), r.range(-0.04, 0.04))),
        new THREE.Vector3(1, 1, 1)
      ));
    }

    // --- Shopfront on street level? ---
    const shopfront = !backRow && r.chance(0.72);
    const frontLen = front.axis === 'x' ? d : w;
    // Per-building joinery color: dark timber, bleached teal, sun-grey...
    const frameCol = new THREE.Color(r.pick([0x574c3e, 0x5f7a72, 0x9a927e, 0x6b5f4c, 0x758a92]));

    // --- Windows on all four faces ---
    // Openings that fell with the collapsed corner are skipped entirely:
    // the nw x nd corner above yBreak, and the whole street strip's top
    // storey (above yStep) which sheared off.
    const inNotch = (wxx, wzz, cyy) => dmg && (wxx - x) * dmg.cx > w / 2 - dmg.nw - 0.45 && (
      (cyy > dmg.yBreak + 0.2 && (wzz - z) * dmg.cz > d / 2 - dmg.nd - 0.45) ||
      cyy > dmg.yStep + 0.2
    );
    const faces = [
      { axis: 'x', nx: 1 }, { axis: 'x', nx: -1 },
      { axis: 'z', nx: 1 }, { axis: 'z', nx: -1 },
    ];
    for (const face of faces) {
      const isFront = face.axis === front.axis && face.nx === front.nx;
      const isLong = face.axis === front.axis;
      const across = face.axis === 'x' ? d : w;
      const cols = Math.max(2, Math.round(across / (isLong ? 2.55 : 3.2)));
      let muralDone = false;
      for (let f = 0; f < floors; f++) {
        if (f === 0 && isFront && shopfront) continue; // shutters live here
        if (!isLong && r.chance(0.22)) {               // blank gable band...
          // ...gets a faded painted wall-ad instead of windows sometimes
          if (!muralDone && !backRow && f >= 1 && r.chance(0.55)) {
            muralDone = true;
            const my = f * FLOOR_H + 1.7;
            let mx = x, mz = z, mrot = 0;
            if (face.axis === 'x') { mx = x + face.nx * (w / 2 + 0.03); mrot = face.nx > 0 ? Math.PI / 2 : -Math.PI / 2; }
            else { mz = z + face.nx * (d / 2 + 0.03); mrot = face.nx > 0 ? 0 : Math.PI; }
            const mural = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 2.3), muralMaterial(851 + (seed % 3)));
            mural.position.set(mx, my, mz);
            mural.rotation.y = mrot;
            this.group.add(mural);
          }
          continue;
        }
        for (let c = 0; c < cols; c++) {
          if (r.chance(0.1)) continue;
          const cy = f * FLOOR_H + FLOOR_H * 0.58;
          const offset = (c - (cols - 1) / 2) * (across / cols);
          let wx = x, wz = z, roty = 0;
          if (face.axis === 'x') { wx = x + face.nx * (w / 2 + 0.02); wz = z + offset; roty = face.nx > 0 ? Math.PI / 2 : -Math.PI / 2; }
          else { wz = z + face.nx * (d / 2 + 0.02); wx = x + offset; roty = face.nx > 0 ? 0 : Math.PI; }
          if (inNotch(wx, wz, cy)) continue; // opening went down with the corner
          this.addWindow(wx, cy, wz, roty, r, frameCol);
          // Soot fan above the lintel: burned-out room behind this window
          if (!backRow && dr.chance(dmg ? 0.3 : 0.2)) {
            const sx3 = face.axis === 'x' ? x + face.nx * (w / 2 + 0.055) : wx;
            const sz3 = face.axis === 'z' ? z + face.nx * (d / 2 + 0.055) : wz;
            const s3 = dr.range(1.0, 1.45);
            this.sootMatrices.push(new THREE.Matrix4().compose(
              new THREE.Vector3(sx3, cy + 0.92, sz3),
              new THREE.Quaternion().setFromEuler(new THREE.Euler(0, roty, dr.range(-0.06, 0.06))),
              new THREE.Vector3(s3, s3, 1)
            ));
          }
          // Balcony on some upper front windows
          if (isFront && f >= 1 && r.chance(0.16)) {
            this.balconyMatrices.push(new THREE.Matrix4().compose(
              new THREE.Vector3(wx, f * FLOOR_H + 1.02, wz),
              new THREE.Quaternion().setFromEuler(new THREE.Euler(0, roty, 0)),
              new THREE.Vector3(1, 1, 1)
            ));
            // Occlusion pooled on the wall under the balcony slab
            const ux = face.axis === 'x' ? wx + face.nx * 0.015 : wx;
            const uz = face.axis === 'z' ? wz + face.nx * 0.015 : wz;
            this.addUnderShadow(2.15, 1.0, ux, f * FLOOR_H + 0.97, uz, roty);
          } else if (isLong && f >= 1 && r.chance(0.13)) {
            // Wall-mounted AC beside the window
            const lat = (r.chance(0.5) ? 1 : -1) * 1.0;
            let ax = wx, az = wz;
            if (face.axis === 'x') { az += lat; ax = x + face.nx * (w / 2 + 0.24); }
            else { ax += lat; az = z + face.nx * (d / 2 + 0.24); }
            this.wallAcMatrices.push(new THREE.Matrix4().compose(
              new THREE.Vector3(ax, cy + 0.1, az),
              new THREE.Quaternion().setFromEuler(new THREE.Euler(0, roty, 0)),
              new THREE.Vector3(1, 1, 1)
            ));
          }
        }
      }
    }

    // --- Front ground floor: shutters + signs + door + awnings or windows ---
    const fwx = front.axis === 'x' ? x + front.nx * (w / 2) : 0;
    const fwz = front.axis === 'z' ? z + front.nx * (d / 2) : 0;
    const rotY = front.axis === 'x' ? (front.nx > 0 ? Math.PI / 2 : -Math.PI / 2) : (front.nx > 0 ? 0 : Math.PI);
    const shutterPalette = [0xb0aa9a, 0x7d8a80, 0x9a8a6a, 0x74809a, 0xa89078, 0x8c8578];
    const signPalette = [0x9c4434, 0x2f6a5f, 0xa87b2f, 0x46648a, 0x8f887c];

    if (shopfront) {
      const nShops = Math.max(1, Math.floor((frontLen - 2.4) / 3.0));
      for (let s = 0; s < nShops; s++) {
        const off = (s - (nShops - 1) / 2) * (frontLen / nShops);
        let sx = x, sz = z;
        if (front.axis === 'x') { sx = x + front.nx * (w / 2 + 0.06); sz = z + off; }
        else { sz = z + front.nx * (d / 2 + 0.06); sx = x + off; }
        const m4 = new THREE.Matrix4().compose(
          new THREE.Vector3(sx, 1.27, sz),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)),
          new THREE.Vector3(1, 1, 1)
        );
        this.shutterMatrices.push(m4);
        this.shutterColors.push(new THREE.Color(r.pick(shutterPalette)).multiplyScalar(r.range(0.8, 1.05)));
        // Baked recess shadow: shutter bay reads darker than the lit wall
        {
          let ux = sx, uz = sz;
          if (front.axis === 'x') ux = x + front.nx * (w / 2 + 0.13); else uz = z + front.nx * (d / 2 + 0.13);
          this.addUnderShadow(2.5, 1.6, ux, 2.6, uz, rotY);
        }
        // Sign board above the shutter
        const sv = r.int(0, 2);
        let gx = sx, gz = sz;
        if (front.axis === 'x') gx = x + front.nx * (w / 2 + 0.1); else gz = z + front.nx * (d / 2 + 0.1);
        this.signMatrices[sv].push(new THREE.Matrix4().compose(
          new THREE.Vector3(gx, 2.86, gz),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)),
          new THREE.Vector3(1, 1, 1)
        ));
        this.signColors[sv].push(new THREE.Color(r.pick(signPalette)).multiplyScalar(r.range(0.75, 1.05)));
        // Awning over some shops
        if (r.chance(0.4)) {
          const aw = awning(2.6, r.pick([0x8c3b2e, 0x365a4d, 0x7a6232]));
          aw.position.set(front.axis === 'x' ? x + front.nx * (w / 2 + 0.03) : sx, 2.62, front.axis === 'x' ? sz : z + front.nx * (d / 2 + 0.03));
          aw.rotation.y = rotY;
          this.group.add(aw);
          // Awning underside: extra occlusion on the wall + shutter zone
          let ux = sx, uz = sz;
          if (front.axis === 'x') ux = x + front.nx * (w / 2 + 0.155); else uz = z + front.nx * (d / 2 + 0.155);
          this.addUnderShadow(2.9, 2.1, ux, 2.66, uz, rotY);
        }
        // Merchandise clutter dumped by the shutter
        if (r.chance(0.45)) {
          let cx2 = sx, cz2 = sz;
          if (front.axis === 'x') cx2 = x + front.nx * (w / 2 + r.range(0.9, 1.4));
          else cz2 = z + front.nx * (d / 2 + r.range(0.9, 1.4));
          const lat = r.range(-0.8, 0.8);
          if (front.axis === 'x') cz2 += lat; else cx2 += lat;
          const roll2 = r();
          if (roll2 < 0.35) this.placeProp(() => stackedCrates(seed * 7 + s), cx2, cz2, r.range(0, Math.PI));
          else if (roll2 < 0.7) this.placeProp(() => crate(r.range(0.5, 0.75)), cx2, cz2, r.range(0, Math.PI));
          else this.placeProp(() => barrel(r.pick([0x5a6b46, 0x6b4a3a])), cx2, cz2, r.range(0, Math.PI));
        }
      }
    }

    // Ground-floor door on facing side
    const doorMat = woodMaterial(83 + (seed % 4));
    const dw = 1.3, dh = 2.4;
    const door = texturedBox(dw, dh, 0.12, doorMat, 1.4);
    const doorOff = (frontLen / 2 - 1.4) * (r.chance(0.5) ? 1 : -1);
    if (front.axis === 'x') { door.position.set(x + front.nx * (w / 2 + 0.02), dh / 2, z + doorOff); door.rotation.y = Math.PI / 2; }
    else { door.position.set(x + doorOff, dh / 2, z + front.nx * (d / 2 + 0.02)); }
    this.group.add(door);
    // Doorway reveal shadow over the top of the door leaf
    {
      const ux = front.axis === 'x' ? x + front.nx * (w / 2 + 0.09) : door.position.x;
      const uz = front.axis === 'z' ? z + front.nx * (d / 2 + 0.09) : door.position.z;
      this.addUnderShadow(dw + 0.14, 1.15, ux, dh + 0.02, uz, rotY);
    }
    // Some doorways burned out: soot fan licking up from the frame
    if (!backRow && dr.chance(0.18)) {
      const sx3 = front.axis === 'x' ? x + front.nx * (w / 2 + 0.055) : door.position.x;
      const sz3 = front.axis === 'z' ? z + front.nx * (d / 2 + 0.055) : door.position.z;
      this.sootMatrices.push(new THREE.Matrix4().compose(
        new THREE.Vector3(sx3, dh - 0.05, sz3),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)),
        new THREE.Vector3(dr.range(0.9, 1.15), dr.range(0.9, 1.2), 1)
      ));
    }
          // Bullet-pock / chip patches at fighting height on the street face
          if (!backRow) {
            let nChips = dr.chance(0.62) ? dr.int(1, 3) : 0;
            if (dmg) nChips += 2;
      for (let i = 0; i < nChips; i++) {
        const off = dr.range(-frontLen / 2 + 0.9, frontLen / 2 - 0.9);
        let cxx = x, czz = z;
        if (front.axis === 'x') { cxx = x + front.nx * (w / 2 + 0.04); czz = z + off; }
        else { czz = z + front.nx * (d / 2 + 0.04); cxx = x + off; }
        const s3 = dr.range(0.8, 1.5);
        this.chipMatrices.push(new THREE.Matrix4().compose(
          new THREE.Vector3(cxx, dr.range(1.0, 2.2), czz),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, dr.range(-0.3, 0.3))),
          new THREE.Vector3(s3, s3 * 0.8, 1)
        ));
      }
    }

    // Rubble spill at a front corner of some buildings
    if (!backRow && r.chance(0.3)) {
      const side = r.chance(0.5) ? 1 : -1;
      let rx = x, rz = z;
      if (front.axis === 'x') { rx = x + front.nx * (w / 2 + 0.7); rz = z + side * (frontLen / 2 - 0.6); }
      else { rz = z + front.nx * (d / 2 + 0.7); rx = x + side * (frontLen / 2 - 0.6); }
      this.placeProp(() => rubblePile(r.range(0.6, 1.1), seed * 17), rx, rz, r.range(0, Math.PI));
    }

    // --- Posters glued at eye level on the front (kept off shopfronts) ---
    if (!backRow && !shopfront && r.chance(0.75)) {
      const nP = r.int(1, 2);
      for (let i = 0; i < nP; i++) {
        const off = r.range(-frontLen / 2 + 1, frontLen / 2 - 1);
        let pxx = x, pzz = z;
        if (front.axis === 'x') { pxx = x + front.nx * (w / 2 + 0.03); pzz = z + off; }
        else { pzz = z + front.nx * (d / 2 + 0.03); pxx = x + off; }
        this.posterMatrices[r.int(0, 2)].push(new THREE.Matrix4().compose(
          new THREE.Vector3(pxx, r.range(1.75, 2.15), pzz),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, r.range(-0.04, 0.04))),
          new THREE.Vector3(1, 1, 1)
        ));
      }
    }

    // --- Drain pipe down a front corner (skipped on collapsed corners) ---
    if (!dmg && r.chance(0.65)) {
      const side = r.chance(0.5) ? 1 : -1;
      const po = frontLen / 2 - 0.35;
      let pxx = x, pzz = z;
      if (front.axis === 'x') { pxx = x + front.nx * (w / 2 + 0.09); pzz = z + side * po; }
      else { pzz = z + front.nx * (d / 2 + 0.09); pxx = x + side * po; }
      const len = h - 0.4;
      this.pipeMatrices.push(new THREE.Matrix4().compose(
        new THREE.Vector3(pxx, len / 2 + 0.1, pzz),
        new THREE.Quaternion(),
        new THREE.Vector3(1, len, 1)
      ));
    }

    // Sand drift against the front wall base
    if (!backRow && r.chance(0.6)) {
      const off = r.range(-frontLen / 3, frontLen / 3);
      let sx = x, sz = z, rot = 0;
      if (front.axis === 'x') { sx = x + front.nx * (w / 2 + 0.5); sz = z + off; rot = Math.PI / 2; }
      else { sz = z + front.nx * (d / 2 + 0.5); sx = x + off; }
      this.addSandDrift(sx, sz, r.range(3, 6), r.range(0.9, 1.5), rot + r.range(-0.15, 0.15));
    }
  }

  // Collapsed-corner dressing for the stepped break: jagged torn-wall teeth
  // along both tear lines (corner floor at yBreak, strip roof at yStep),
  // sheared slab lips, leaning plates, exposed-brick shear faces, soot, and
  // rubble spills queued for the instanced debris system. All merged.
  addCollapseDressing(x, z, w, d, h, ppH, dmg, wallMat, r, seed) {
    const { cx, cz, nw, nd, yBreak, yStep } = dmg;
    const inner = concreteMaterial(39, 0.8);
    const ncx = x + cx * (w - nw) / 2; // notch (bite) center
    const ncz = z + cz * (d - nd) / 2;
    const scz = z - cz * nd / 2;       // torn strip center (z)
    const wallGeos = []; // plaster-textured torn-wall stubs
    const concGeos = []; // concrete slab plate + leaning plates + cap chunks

    // Sheared floor slabs lipping over both tear levels
    concGeos.push(trimBoxGeo(nw + 0.16, 0.17, nd + 0.16, 2.2, ncx + cx * 0.02, yBreak + 0.085, ncz + cz * 0.02));
    concGeos.push(trimBoxGeo(nw + 0.16, 0.17, d - nd + 0.16, 2.2, ncx + cx * 0.02, yStep + 0.085, scz));

    // Torn wall teeth along a wall line: length `run`, walking axis ax ('x'|'z')
    const teeth = (axis, wallC, runFrom, runDir, run, yBase, hMax) => {
      let c = 0.25;
      while (c < run - 0.35) {
        const tl = r.range(0.5, 1.1);
        const th = r.range(0.4, hMax) * (1.05 - (c / run) * 0.72);
        const gc = runFrom + runDir * (c + tl / 2);
        const geo = axis === 'x'
          ? scaleBoxUV(new THREE.BoxGeometry(0.42, th, tl), 0.42, th, tl, 3.0)
          : scaleBoxUV(new THREE.BoxGeometry(tl, th, 0.42), tl, th, 0.42, 3.0);
        if (axis === 'x') { geo.rotateX(r.range(-0.06, 0.06)); geo.translate(wallC, yBase + th / 2 - 0.03, gc); }
        else { geo.rotateZ(r.range(-0.06, 0.06)); geo.translate(gc, yBase + th / 2 - 0.03, wallC); }
        (r.chance(0.7) ? wallGeos : concGeos).push(geo);
        c += tl + r.range(0.15, 0.55);
      }
    };
    // Corner bite tear lines (down at yBreak)
    teeth('x', x + cx * (w / 2 - 0.21), z + cz * (d / 2 - nd), cz, nd, yBreak, 1.9);
    teeth('z', z + cz * (d / 2 - 0.21), x + cx * (w / 2 - nw), cx, nw, yBreak, 1.8);
    // Strip roof tear lines (at yStep): street edge + far gable end.
    // Street-edge teeth run tall — they are the skyline jag seen from spawn.
    teeth('x', x + cx * (w / 2 - 0.21), z - cz * d / 2, cz, d - nd, yStep, 2.2);
    teeth('z', z - cz * (d / 2 - 0.21), x + cx * (w / 2 - nw), cx, nw, yStep, 1.4);
    // Torn parapet ends: tilted cap chunks at the junctions with the intact run
    for (const [jx, jz, jy, rot] of [
      [x + cx * (w / 2 - nw + 0.25), z + cz * (d / 2 - 0.2), h, 0.3],
      [x + cx * (w / 2 - 0.2), z + cz * (d / 2 - nd + 0.25), yStep, -0.25],
    ]) {
      const geo = scaleBoxUV(new THREE.BoxGeometry(0.55, 0.5, 0.7), 0.55, 0.5, 0.7, 2.2);
      geo.rotateZ(cx * rot);
      geo.rotateX(cz * r.range(0.1, 0.35));
      geo.translate(jx, jy + 0.08, jz);
      concGeos.push(geo);
    }
    // Surviving wall shard spiking above the parapet at the tear — the
    // ragged finger against the sky that marks the building as shelled
    {
      const sh = r.range(1.3, 1.9);
      const geo = scaleBoxUV(new THREE.BoxGeometry(0.5, sh, 0.34), 0.5, sh, 0.34, 3.0);
      geo.rotateZ(cx * r.range(0.03, 0.1));
      geo.translate(x + cx * (w / 2 - nw + 0.3), h + ppH + sh / 2 - 0.35, z + cz * (d / 2 - 0.24));
      wallGeos.push(geo);
    }
    // Broken plates resting on the strip's exposed roof slab
    for (let i = 0; i < 2; i++) {
      const sw = r.range(nw * 0.3, nw * 0.45);
      const geo = scaleBoxUV(new THREE.BoxGeometry(sw, 0.13, sw * r.range(0.7, 1.1)), sw, 0.13, sw, 2.2);
      geo.rotateY(r.range(-0.5, 0.5));
      geo.rotateZ(cx * r.range(0.06, 0.2));
      geo.translate(
        ncx + r.range(-0.15, 0.15) * nw,
        yStep + 0.24 + i * 0.1,
        scz + r.range(-0.2, 0.2) * (d - nd) * 0.5
      );
      concGeos.push(geo);
    }
    // Collapsed floor plates leaning in the bite (kept below the roofline,
    // shifted toward the inner corner so the outer silhouette stays jagged)
    for (let i = 0; i < 3; i++) {
      const sw = r.range(nw * 0.32, nw * 0.5);
      const sd = r.range(nd * 0.28, nd * 0.46);
      const geo = scaleBoxUV(new THREE.BoxGeometry(sw, 0.14, sd), sw, 0.14, sd, 2.2);
      geo.rotateZ(cx * r.range(0.15, 0.38));
      geo.rotateX(-cz * r.range(0.1, 0.35));
      geo.rotateY(r.range(-0.35, 0.35));
      geo.translate(
        ncx - cx * nw * r.range(0.05, 0.2) + r.range(-0.2, 0.2),
        yBreak + 0.3 + i * 0.16,
        ncz - cz * nd * r.range(0.05, 0.2) + r.range(-0.2, 0.2)
      );
      concGeos.push(geo);
    }
    // Facade slabs that pancaked onto the street and lean against the wall
    // below the bite — the ground-level tell that the corner above is gone
    for (let i = 0; i < 2; i++) {
      const sw2 = r.range(1.6, 2.4);
      const tilt = r.range(0.92, 1.18); // steep lean propped on the facade
      const geo = scaleBoxUV(new THREE.BoxGeometry(sw2, 0.16, sw2 * r.range(0.7, 0.95)), sw2, 0.16, sw2 * 0.8, 2.2);
      geo.rotateZ(-cx * tilt);
      geo.rotateY(r.range(-0.22, 0.22));
      geo.translate(
        x + cx * (w / 2 + r.range(0.5, 0.85)),
        Math.sin(tilt) * sw2 * 0.42,
        z + cz * (d / 2 - nd * r.range(0.15, 0.55))
      );
      (i === 0 ? wallGeos : concGeos).push(geo);
    }
    for (const [geos, m2] of [[wallGeos, wallMat], [concGeos, inner]]) {
      if (!geos.length) continue;
      const m = new THREE.Mesh(mergeGeometries(geos), m2);
      m.castShadow = true; m.receiveShadow = true;
      this.group.add(m);
    }
    // Exposed brick on the shear faces: the tall inboard slab's flank above
    // both tear levels, and the strip's face into the corner bite. Merged
    // into a single mesh.
    const revealGeos = [];
    const mkReveal = (wid, hgt, px2, py2, pz2, roty) => {
      const geo = new THREE.PlaneGeometry(wid, hgt);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (wid / 3.2), uv.getY(i) * (hgt / 3.2));
      geo.rotateY(roty);
      geo.translate(px2, py2, pz2);
      revealGeos.push(geo);
    };
    const xFace = x + cx * (w / 2 - nw) + cx * 0.03;      // inboard slab flank
    const rotX = cx > 0 ? Math.PI / 2 : -Math.PI / 2;
    // ...against the corner bite (yBreak -> top)
    mkReveal(nd, h - yBreak + 0.34, xFace, yBreak + (h - yBreak + 0.34) / 2 - 0.15, ncz, rotX);
    // ...above the strip's torn roof (yStep -> top)
    mkReveal(d - nd, h - yStep + 0.34, xFace, yStep + (h - yStep + 0.34) / 2 - 0.15, scz, rotX);
    // Strip face into the bite (yBreak -> its torn roof at yStep)
    mkReveal(nw, yStep - yBreak + 0.3, ncx, yBreak + (yStep - yBreak + 0.3) / 2 - 0.15,
      z + cz * (d / 2 - nd) + cz * 0.03, cz > 0 ? 0 : Math.PI);
    {
      const m = new THREE.Mesh(mergeGeometries(revealGeos), brickMaterial(24));
      m.receiveShadow = true;
      this.group.add(m);
    }
    // Fire licked out of the collapsed floors: heavy soot on the shear faces
    this.sootMatrices.push(new THREE.Matrix4().compose(
      new THREE.Vector3(x + cx * (w / 2 - nw) + cx * 0.07, yBreak + 0.7, ncz),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, cx > 0 ? Math.PI / 2 : -Math.PI / 2, 0)),
      new THREE.Vector3(2.3, 1.8, 1)
    ));
    this.sootMatrices.push(new THREE.Matrix4().compose(
      new THREE.Vector3(ncx, yBreak + 0.7, z + cz * (d / 2 - nd) + cz * 0.07),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, cz > 0 ? 0 : Math.PI, 0)),
      new THREE.Vector3(2.3, 1.8, 1)
    ));
    // Debris spilled below the corner + heaped on the exposed floor
    this.rubbleSpecs.push({ x: x + cx * (w / 2 + 1.35), z: z + cz * (d / 2 - 1.3), r: 3.5, h: 1.35, seed: seed * 31 + 5, collide: true });
    this.rubbleSpecs.push({ x: x + cx * (w / 2 - 2.0), z: z + cz * (d / 2 + 1.3), r: 2.4, h: 0.9, seed: seed * 31 + 9, collide: false });
    this.rubbleSpecs.push({
      x: ncx, z: ncz, r: Math.min(nw, nd) * 0.4, h: 0.5,
      seed: seed * 31 + 7, baseY: yBreak + 0.17, collide: false, noSkirt: true,
    });
  }

  addWindow(x, y, z, rotY, r, frameCol) {
    const frameM = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)),
      new THREE.Vector3(1, 1, 1)
    );
    this.windowFrameMatrices.push(frameM);
    this.windowFrameColors.push(frameCol ?? new THREE.Color(0x574c3e));
    this.windowGlassMatrices.push(frameM.clone());
    // Vary glass: metalness-driven env reflections need brightish base colors.
    const roll = r();
    let c;
    if (roll < 0.18) c = new THREE.Color(0x141210);                                   // blown out / boarded
    else if (roll < 0.42) c = new THREE.Color(0x8a7a62).multiplyScalar(0.65 + r() * 0.4); // curtains behind glass
    else if (roll < 0.58) c = new THREE.Color(0x4a5a66).multiplyScalar(0.7 + r() * 0.4);  // dim interior
    else c = new THREE.Color(0xaec4d6).multiplyScalar(0.6 + r() * 0.5);               // sky-reflecting pane
    this.windowGlassColors.push(c);
    // Sparse warm lit interiors sell the dusk hour (upper floors only)
    if (y > 4.2 && r() < 0.1) {
      this.litPaneMatrices.push(frameM.clone());
      // deep amber, kept below the bloom knee so panes glow without whiting out
      const warm = new THREE.Color().setHSL(0.062 + r() * 0.03, 0.9, 0.44).multiplyScalar(0.85 + r() * 0.75);
      this.litPaneColors.push(warm);
    }
  }

  flushWindowInstances() {
    const n = this.windowFrameMatrices.length;
    if (!n) return;
    // Frame: hollow border of 4 bars + center mullion + sill + lintel, plus
    // inward jamb planes forming a real reveal box, merged. Vertex colors bake
    // occlusion into the jambs (multiplied with the per-instance frame tint).
    const vcol = (geo, v) => {
      const cnt = geo.attributes.position.count;
      const arr = new Float32Array(cnt * 3).fill(v);
      geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
      return geo;
    };
    const t = 0.08, W = 1.32, H = 1.72, D = 0.2;
    const jd = 0.155, jz = 0.14 - jd / 2; // jamb depth: frame front +0.14 back to wall
    const bars = [
      vcol(new THREE.BoxGeometry(W, t, D).translate(0, H / 2 - t / 2, 0.04), 1),
      vcol(new THREE.BoxGeometry(W, t, D).translate(0, -H / 2 + t / 2, 0.04), 1),
      vcol(new THREE.BoxGeometry(t, H - 2 * t, D).translate(-W / 2 + t / 2, 0, 0.04), 1),
      vcol(new THREE.BoxGeometry(t, H - 2 * t, D).translate(W / 2 - t / 2, 0, 0.04), 1),
      vcol(new THREE.BoxGeometry(t * 0.7, H - 2 * t, D * 0.5).translate(0, 0, -0.02), 0.72),          // center mullion (recessed)
      vcol(new THREE.BoxGeometry(t * 0.6, W - 2 * t, D * 0.5).rotateZ(Math.PI / 2).translate(0, -H * 0.14, -0.02), 0.72), // transom bar
      vcol(new THREE.BoxGeometry(W + 0.24, 0.1, D + 0.18).translate(0, -H / 2 - 0.05, 0.03), 1),   // sill
      vcol(new THREE.BoxGeometry(W + 0.22, 0.14, D + 0.08).translate(0, H / 2 + 0.07, 0.01), 1),   // lintel
      // Reveal jambs: darkened planes running from the frame front to the wall
      vcol(new THREE.PlaneGeometry(jd, H - 2 * t).rotateY(Math.PI / 2).translate(-(W / 2 - t), 0, jz), 0.4),
      vcol(new THREE.PlaneGeometry(jd, H - 2 * t).rotateY(-Math.PI / 2).translate(W / 2 - t, 0, jz), 0.4),
      vcol(new THREE.PlaneGeometry(W - 2 * t, jd).rotateX(Math.PI / 2).translate(0, H / 2 - t, jz), 0.32),
      vcol(new THREE.PlaneGeometry(W - 2 * t, jd).rotateX(-Math.PI / 2).translate(0, -H / 2 + t, jz), 0.5),
    ];
    const frameGeo = mergeGeometries(bars);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, vertexColors: true });
    const frames = new THREE.InstancedMesh(frameGeo, frameMat, n);
    for (let i = 0; i < n; i++) frames.setColorAt(i, this.windowFrameColors[i]);
    if (frames.instanceColor) frames.instanceColor.needsUpdate = true;
    // NOTE: window matrices sit +0.02 outside the wall plane, so anything at
    // local z < -0.02 is swallowed by the wall box. Layering (outermost first):
    // frame front (+0.12) > glass (+0.015) > dark reveal (+0.006) > wall (0).
    const revealGeo = new THREE.PlaneGeometry(W + 0.06, H + 0.06).translate(0, 0, -0.014);
    const reveals = new THREE.InstancedMesh(revealGeo, revealMaterial(), n);
    // Glass: pane just proud of the reveal
    const glassGeo = new THREE.PlaneGeometry(W - t, H - t).translate(0, 0, -0.005);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.08, metalness: 0.9, envMapIntensity: 1.25 });
    const glass = new THREE.InstancedMesh(glassGeo, glassMat, n);
    for (let i = 0; i < n; i++) {
      frames.setMatrixAt(i, this.windowFrameMatrices[i]);
      reveals.setMatrixAt(i, this.windowGlassMatrices[i]);
      glass.setMatrixAt(i, this.windowGlassMatrices[i]);
      glass.setColorAt(i, this.windowGlassColors[i]);
    }
    frames.castShadow = true; frames.receiveShadow = true;
    reveals.receiveShadow = true;
    glass.receiveShadow = true;
    frames.instanceMatrix.needsUpdate = true;
    reveals.instanceMatrix.needsUpdate = true;
    glass.instanceMatrix.needsUpdate = true;
    if (glass.instanceColor) glass.instanceColor.needsUpdate = true;
    this.group.add(frames);
    this.group.add(reveals);
    this.group.add(glass);
    // Warm lit panes: unlit material so they self-glow against dusk facades
    if (this.litPaneMatrices.length) {
      const litGeo = new THREE.PlaneGeometry(W - t * 1.5, H - t * 1.5).translate(0, 0, -0.002);
      const litMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const lit = new THREE.InstancedMesh(litGeo, litMat, this.litPaneMatrices.length);
      this.litPaneMatrices.forEach((m, i) => { lit.setMatrixAt(i, m); lit.setColorAt(i, this.litPaneColors[i]); });
      lit.instanceMatrix.needsUpdate = true;
      if (lit.instanceColor) lit.instanceColor.needsUpdate = true;
      this.group.add(lit);
    }
  }

  flushFacadeInstances() {
    // Merged concrete trims
    if (this.trimGeos.length) {
      const m = new THREE.Mesh(mergeGeometries(this.trimGeos), concreteMaterial(37, 0.97));
      m.castShadow = true; m.receiveShadow = true;
      this.group.add(m);
    }
    if (this.plinthGeos.length) {
      const m = new THREE.Mesh(mergeGeometries(this.plinthGeos), concreteMaterial(47, 0.66));
      m.castShadow = true; m.receiveShadow = true;
      this.group.add(m);
    }
    // Roller shutters
    if (this.shutterMatrices.length) {
      const g = new THREE.BoxGeometry(2.15, 2.5, 0.1);
      const inst = new THREE.InstancedMesh(g, shutterMaterial(), this.shutterMatrices.length);
      this.shutterMatrices.forEach((m, i) => { inst.setMatrixAt(i, m); inst.setColorAt(i, this.shutterColors[i]); });
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.castShadow = true; inst.receiveShadow = true;
      this.group.add(inst);
    }
    // Sign boards (3 texture variants)
    for (let v = 0; v < 3; v++) {
      const mats = this.signMatrices[v];
      if (!mats.length) continue;
      const g = new THREE.BoxGeometry(2.3, 0.6, 0.07);
      const inst = new THREE.InstancedMesh(g, signMaterial(601 + v * 13), mats.length);
      mats.forEach((m, i) => { inst.setMatrixAt(i, m); inst.setColorAt(i, this.signColors[v][i]); });
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.castShadow = true; inst.receiveShadow = true;
      this.group.add(inst);
    }
    // Posters
    for (let v = 0; v < 3; v++) {
      const mats = this.posterMatrices[v];
      if (!mats.length) continue;
      const g = new THREE.PlaneGeometry(0.78, 1.06);
      const inst = new THREE.InstancedMesh(g, posterMaterial(701 + v), mats.length);
      mats.forEach((m, i) => inst.setMatrixAt(i, m));
      inst.instanceMatrix.needsUpdate = true;
      inst.receiveShadow = true;
      this.group.add(inst);
    }
    // Drain pipes
    if (this.pipeMatrices.length) {
      const g = new THREE.CylinderGeometry(0.055, 0.06, 1, 8);
      const inst = new THREE.InstancedMesh(g, flatMaterial(0x746653, 0.92, 0, 0.5), this.pipeMatrices.length);
      this.pipeMatrices.forEach((m, i) => inst.setMatrixAt(i, m));
      inst.instanceMatrix.needsUpdate = true;
      inst.castShadow = true; inst.receiveShadow = true;
      this.group.add(inst);
    }
    // Wall-mounted AC units
    if (this.wallAcMatrices.length) {
      const parts = [
        new THREE.BoxGeometry(0.8, 0.52, 0.42),
        new THREE.BoxGeometry(0.86, 0.05, 0.48).translate(0, -0.29, 0),   // support tray
      ];
      const g = mergeGeometries(parts);
      const inst = new THREE.InstancedMesh(g, metalMaterial(0x9aa2a6, 811), this.wallAcMatrices.length);
      this.wallAcMatrices.forEach((m, i) => inst.setMatrixAt(i, m));
      inst.instanceMatrix.needsUpdate = true;
      inst.castShadow = true; inst.receiveShadow = true;
      this.group.add(inst);
    }
    // Balconies (slab + railing), sit proud of upper front windows
    if (this.balconyMatrices.length) {
      const parts = [new THREE.BoxGeometry(2.0, 0.11, 0.9).translate(0, 0, 0.45)];
      parts.push(new THREE.BoxGeometry(2.0, 0.05, 0.05).translate(0, 0.95, 0.88));
      for (const sx of [-1, 1]) parts.push(new THREE.BoxGeometry(0.05, 0.05, 0.86).translate(sx * 0.975, 0.95, 0.44));
      for (let i = 0; i < 7; i++) parts.push(new THREE.BoxGeometry(0.03, 0.9, 0.03).translate(-0.9 + i * 0.3, 0.5, 0.87));
      for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) parts.push(new THREE.BoxGeometry(0.03, 0.9, 0.03).translate(sx * 0.975, 0.5, 0.2 + i * 0.42));
      const g = mergeGeometries(parts);
      const inst = new THREE.InstancedMesh(g, flatMaterial(0x54503f, 0.8, 0.3, 0.6), this.balconyMatrices.length);
      this.balconyMatrices.forEach((m, i) => inst.setMatrixAt(i, m));
      inst.instanceMatrix.needsUpdate = true;
      inst.castShadow = true; inst.receiveShadow = true;
      this.group.add(inst);
    }
    // TV antennas
    if (this.antennaMatrices.length) {
      const parts = [
        new THREE.CylinderGeometry(0.016, 0.022, 2.6, 5).translate(0, 1.3, 0),
        new THREE.BoxGeometry(0.7, 0.02, 0.02).translate(0, 2.1, 0),
        new THREE.BoxGeometry(0.5, 0.02, 0.02).translate(0, 1.75, 0),
        new THREE.BoxGeometry(0.34, 0.02, 0.02).translate(0, 2.4, 0),
      ];
      const g = mergeGeometries(parts);
      const inst = new THREE.InstancedMesh(g, flatMaterial(0x2c2a27, 0.6, 0.7, 0.8), this.antennaMatrices.length);
      this.antennaMatrices.forEach((m, i) => inst.setMatrixAt(i, m));
      inst.instanceMatrix.needsUpdate = true;
      inst.castShadow = true;
      this.group.add(inst);
    }
    // Soot fans above burned-out windows / doors (base of the fan at origin)
    if (this.sootMatrices.length) {
      const g = new THREE.PlaneGeometry(1.9, 1.5).translate(0, 0.75, 0);
      const inst = new THREE.InstancedMesh(g, sootFanMaterial(), this.sootMatrices.length);
      this.sootMatrices.forEach((m, i) => inst.setMatrixAt(i, m));
      inst.instanceMatrix.needsUpdate = true;
      inst.renderOrder = 2;
      this.group.add(inst);
    }
    // Bullet-pock chip patches
    if (this.chipMatrices.length) {
      const g = new THREE.PlaneGeometry(1.0, 0.8);
      const inst = new THREE.InstancedMesh(g, impactChipMaterial(), this.chipMatrices.length);
      this.chipMatrices.forEach((m, i) => inst.setMatrixAt(i, m));
      inst.instanceMatrix.needsUpdate = true;
      inst.renderOrder = 2;
      this.group.add(inst);
    }
  }

  buildRuin(x, z, w, d, tint, seed) {
    const r = makeRNG(seed * 7373);
    const mat = plasterMaterial(tint, 11 + (seed % 2));
    const inner = concreteMaterial(39, 0.8);
    // Jagged standing walls: segments of varying height along the perimeter
    const segs = 7;
    for (let side = 0; side < 4; side++) {
      const horizontal = side % 2 === 0;
      const len = horizontal ? w : d;
      const segLen = len / segs;
      for (let s = 0; s < segs; s++) {
        if (r.chance(0.3)) continue; // gaps blasted through
        const hh = r.range(1.2, FLOOR_H * 2.1);
        const t = 0.4;
        const off = (s + 0.5) * segLen - len / 2;
        let bx = x, bz = z, bw, bd;
        if (side === 0) { bz = z - d / 2; bx = x + off; bw = segLen; bd = t; }
        if (side === 1) { bx = x + w / 2; bz = z + off; bw = t; bd = segLen; }
        if (side === 2) { bz = z + d / 2; bx = x + off; bw = segLen; bd = t; }
        if (side === 3) { bx = x - w / 2; bz = z + off; bw = t; bd = segLen; }
        const wall = texturedBox(bw, hh, bd, r.chance(0.75) ? mat : inner, 3.0, [r(), r()]);
        wall.position.set(bx, hh / 2, bz);
        wall.rotation.y = r.range(-0.02, 0.02);
        this.group.add(wall);
        this.addCollider(bx, hh / 2, bz, bw + 0.05, hh, bd + 0.05);
      }
    }
    // Rubble inside and spilling out
    const pile = rubblePile(Math.min(w, d) * 0.42, seed);
    pile.position.set(x, 0, z);
    this.group.add(pile);
    this.addCollider(x, 0.35, z, w * 0.5, 0.7, d * 0.5);
    this.coverSpots.push(new THREE.Vector3(x + w / 2 + 1, 0, z));
    this.spawnPoints.push(new THREE.Vector3(x, 0, z + d / 2 + 2));
  }

  // ---------------------------------------------------------------- landmarks
  buildLandmarks() {
    // Minaret tower at NE corner of the intersection — the map's visual anchor
    const x = 11.5, z = -11.5;
    const mat = plasterMaterial(0xd8c8b0, 17);
    const trim = concreteMaterial(41, 0.9);
    const tower = new THREE.Mesh(scaleCylUV(new THREE.CylinderGeometry(1.7, 2.1, 21, 16), 1.9, 21, 3), mat);
    tower.position.set(x, 10.5, z);
    tower.castShadow = true; tower.receiveShadow = true;
    this.group.add(tower);
    // Base plinth + grime skirt: the shaft grows out of a socle, not the dirt
    const socle = new THREE.Mesh(scaleCylUV(new THREE.CylinderGeometry(2.35, 2.55, 1.4, 16), 2.45, 1.4, 2.4), concreteMaterial(41, 0.72));
    socle.position.set(x, 0.7, z);
    socle.castShadow = true; socle.receiveShadow = true;
    this.group.add(socle);
    const skirtGeo = new THREE.CylinderGeometry(2.62, 2.62, 0.85, 16, 1, true);
    const skirt = new THREE.Mesh(skirtGeo, wallGrimeMaterial());
    skirt.position.set(x, 0.45, z);
    skirt.renderOrder = 2;
    this.group.add(skirt);
    this.group.add(contactShadow(5.4, 5.4, 0.36, x, z));
    // Decorative band rings up the shaft
    for (const by of [5.5, 11, 16.5]) {
      const br = 2.1 + (1.7 - 2.1) * (by / 21) + 0.09;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(br, br, 0.22, 16), trim);
      band.position.set(x, by, z);
      band.castShadow = true;
      this.group.add(band);
    }
    // Slit windows up the shaft (dark recess + pale surround)
    const slitMat = flatMaterial(0x241f19, 0.95);
    const surroundMat = concreteMaterial(41, 0.85);
    for (const [sy, ang] of [[7, 0.5], [11.8, 2.2], [15, 3.8], [18, 1.2]]) {
      const rr = 1.7 + (2.1 - 1.7) * (1 - sy / 21) + 0.02;
      const sxp = x + Math.sin(ang) * rr, szp = z + Math.cos(ang) * rr;
      const surround = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 1.34), surroundMat);
      surround.position.set(sxp, sy, szp);
      surround.rotation.y = ang;
      this.group.add(surround);
      const slit = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 1.08), slitMat);
      slit.position.set(x + Math.sin(ang) * (rr + 0.012), sy, z + Math.cos(ang) * (rr + 0.012));
      slit.rotation.y = ang;
      this.group.add(slit);
    }
    const balcony = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.2, 1.1, 16), trim);
    balcony.position.set(x, 21, z);
    balcony.castShadow = true;
    this.group.add(balcony);
    // Balcony railing: pickets + top ring merged into one mesh
    {
      const parts = [];
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        parts.push(new THREE.CylinderGeometry(0.022, 0.022, 0.78, 5).translate(Math.cos(a) * 2.45, 21.9, Math.sin(a) * 2.45));
      }
      parts.push(new THREE.TorusGeometry(2.45, 0.03, 5, 24).rotateX(Math.PI / 2).translate(0, 22.3, 0));
      const rail = new THREE.Mesh(mergeGeometries(parts), flatMaterial(0x4c463c, 0.7, 0.4, 0.6));
      rail.position.set(x, 0, z);
      rail.castShadow = true;
      this.group.add(rail);
    }
    const top = new THREE.Mesh(scaleCylUV(new THREE.CylinderGeometry(1.15, 1.5, 3.2, 12), 1.3, 3.2, 3), mat);
    top.position.set(x, 23.2, z);
    top.castShadow = true;
    this.group.add(top);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.6, 12), new THREE.MeshStandardMaterial({ color: 0x44635a, roughness: 0.5, metalness: 0.65, envMapIntensity: 1.2 }));
    cone.position.set(x, 26.1, z);
    cone.castShadow = true;
    this.group.add(cone);
    this.addCollider(x, 10.5, z, 4.2, 21, 4.2);

    // Small mosque body with dome next to it
    const bw = 14, bd = 12, bh = 7.5;
    const bx = 20, bz = -16;
    const body = texturedBox(bw, bh, bd, mat, 3.2, [0.37, 0.61]);
    body.position.set(bx, bh / 2, bz);
    this.group.add(body);
    this.addCollider(bx, bh / 2, bz, bw, bh, bd);
    this.addGrimeSkirt(bw + 0.2, bx, bz + bd / 2 + 0.03, 0);
    this.addGrimeSkirt(bw + 0.2, bx, bz - bd / 2 - 0.03, Math.PI);
    this.addGrimeSkirt(bd + 0.2, bx + bw / 2 + 0.03, bz, Math.PI / 2);
    this.addGrimeSkirt(bd + 0.2, bx - bw / 2 - 0.03, bz, -Math.PI / 2);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(4.4, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x4a675e, roughness: 0.45, metalness: 0.7, envMapIntensity: 1.25 }));
    dome.position.set(bx, bh, bz);
    dome.castShadow = true;
    this.group.add(dome);
    // Arched entry: dark recess + trim
    const arch = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 3.4), flatMaterial(0x1f1a14, 0.95));
    arch.position.set(bx - 3, 1.7, bz - bd / 2 - 0.02);
    arch.rotation.y = Math.PI;
    this.group.add(arch);

    // Central intersection: blasted fountain base as centerpiece cover
    const fx = 0, fz = 0;
    const rim = new THREE.Mesh(scaleCylUV(new THREE.CylinderGeometry(3.2, 3.4, 0.85, 18), 3.3, 0.85, 2.4), concreteMaterial(43, 0.72));
    rim.position.set(fx, 0.42, fz);
    rim.castShadow = true; rim.receiveShadow = true;
    this.group.add(rim);
    this.group.add(contactShadow(7.2, 7.2, 0.38, fx, fz));
    this.addCollider(fx, 0.42, fz, 6.4, 0.85, 6.4);
    // Dry basin fill: dark ash/soil hides the stretched cylinder-cap texture
    const basin = new THREE.Mesh(new THREE.CircleGeometry(3.06, 18), flatMaterial(0x39332a, 0.98, 0, 0.45));
    basin.rotation.x = -Math.PI / 2;
    basin.position.set(fx, 0.856, fz);
    basin.receiveShadow = true;
    this.group.add(basin);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 2.1, 12), concreteMaterial(43, 0.66));
    pillar.position.set(fx, 1.5, fz);
    pillar.castShadow = true;
    this.group.add(pillar);
    // Debris in the dry basin
    const rr = makeRNG(777);
    for (let i = 0; i < 5; i++) {
      const s = rr.range(0.3, 0.7);
      const chunk = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.5, s * rr.range(0.6, 1.2)), concreteMaterial(43, 0.66));
      const a = rr() * Math.PI * 2, dd = rr.range(0.8, 2.4);
      chunk.position.set(fx + Math.cos(a) * dd, 0.95, fz + Math.sin(a) * dd);
      chunk.rotation.set(rr.range(-0.4, 0.4), rr() * Math.PI, rr.range(-0.3, 0.3));
      chunk.castShadow = true; chunk.receiveShadow = true;
      this.group.add(chunk);
    }
    this.coverSpots.push(new THREE.Vector3(4.5, 0, 0), new THREE.Vector3(-4.5, 0, 0), new THREE.Vector3(0, 0, 4.5), new THREE.Vector3(0, 0, -4.5));
  }

  // ------------------------------------------------------------- street props
  buildStreetProps() {
    const r = this.rng;

    // Wrecked + abandoned cars: a few mid-road, more parked along the curbs
    const cars = [
      [2.4, -30, 0.5, true], [-2.8, 22, -0.4, false], [1.8, 48, 2.6, false],
      [-26, 2.2, 1.9, true], [33, -2.4, 1.2, false], [-3, -55, 0.2, false],
      [4.35, 36.5, 3.1, false], [-4.3, -24, 0.06, true], [16, 3.9, 1.6, false],
      [-2.6, 40.5, 2.45, true],   // burned hulk skewed across the left lane
      [4.1, -13.5, 2.25, false],  // abandoned at an angle past the intersection
    ];
    for (const [x, z, rot, burned] of cars) {
      this.placeProp(() => wreckedCar(burned, r.pick([0xa09b90, 0x71818f, 0x7a3529, 0x5d6b5a, 0x8e968f])), x, z, rot, true);
    }

    // Jersey barrier chains near the intersection (kill-zone cover)
    const barriers = [
      [-4.8, -12, 0], [-4.8, -14.2, 0], [-4.8, -16.4, 0],
      [4.8, 12, 0], [4.8, 14.2, 0], [4.8, 16.4, 0],
      [-12, 4.8, Math.PI / 2], [-14.2, 4.8, Math.PI / 2],
      [12, -4.8, Math.PI / 2], [14.2, -4.8, Math.PI / 2],
    ];
    for (const [x, z, rot] of barriers) this.placeProp(jerseyBarrier, x, z, rot, true);
    // Sand piled against a few barriers
    this.addSandDrift(-5.4, -14.2, 4.6, 1.1, Math.PI / 2);
    this.addSandDrift(5.4, 14.2, 4.6, 1.1, Math.PI / 2);
    this.addSandDrift(13, -5.4, 4.2, 1.0, 0);

    // Sandbag nests at corners
    const nests = [[-8.5, -8.5, Math.PI / 4], [8.5, 8.5, Math.PI / 4], [8.5, -8.5, -Math.PI / 4], [-8.5, 8.5, -Math.PI / 4]];
    for (const [x, z, rot] of nests) this.placeProp(() => sandbagWall(3, 5), x, z, rot, true);

    // Barrels + crates clusters
    const clusters = [[-9, -28], [10, 34], [-11, 52], [28, 8], [-30, -7], [9, -46], [-9, 63], [44, -8]];
    for (const [cx, cz] of clusters) {
      const n = r.int(2, 4);
      for (let i = 0; i < n; i++) {
        const px = cx + r.range(-1.6, 1.6), pz = cz + r.range(-1.6, 1.6);
        if (r.chance(0.55)) this.placeProp(() => barrel(r.pick([0x5a6b46, 0x6b4a3a, 0x46566b])), px, pz, r.range(0, Math.PI), i === 0);
        else this.placeProp(() => crate(r.range(0.6, 0.95)), px, pz, r.range(0, Math.PI), i === 0);
      }
    }

    // Tire stacks
    for (const [x, z] of [[-7.6, 30], [7.8, -22], [22, 7.6], [-19, -7.7]]) {
      this.placeProp(() => tireStack(r.int(2, 4)), x, z, r.range(0, Math.PI), true);
    }

    // Power poles with sagging wires along main street (west sidewalk).
    // The pole at z=50 snapped at the base and leans over the road right in
    // front of the spawn, its dead cable drooping down onto the asphalt.
    let prevTop = null;
    for (let z = -70; z <= 70; z += 20) {
      let top;
      if (z === 50) {
        // Steep lean keeps the snapped top below the collapsed-corner sky
        // notch at z=36 while still hanging over the road in the foreground.
        const lean = 0.62;
        this.placeProp(() => leaningPowerPole(lean), -7.2, z, Math.PI / 2);
        top = new THREE.Vector3(-7.2 + Math.sin(lean) * 7.4, Math.cos(lean) * 7.4, z);
        // Dead line drops into the west gutter (kept left of the spawn
        // camera's frustum: a cable crossing frame-center reads as an artifact)
        this.group.add(wire(top.clone(), new THREE.Vector3(-5.6, 0.08, 52.8), 1.4));
        this.group.add(wire(new THREE.Vector3(-5.6, 0.08, 52.8), new THREE.Vector3(-6.8, 0.06, 55.4), 0.02));
      } else {
        this.placeProp(powerPole, -7.2, z, r.range(-0.06, 0.06));
        top = new THREE.Vector3(-7.2, 6.9, z);
      }
      if (prevTop) {
        const dragged = top.y < 6.8 || prevTop.y < 6.8; // spans into the leaning pole sag hard
        const sag = dragged ? 1.7 : 0;
        this.group.add(wire(prevTop.clone().add(new THREE.Vector3(0.6, 0, 0)), top.clone().add(new THREE.Vector3(0.6, 0, 0)), 1.0 + sag));
        this.group.add(wire(prevTop.clone().add(new THREE.Vector3(-0.6, 0, 0)), top.clone().add(new THREE.Vector3(-0.6, 0, 0)), 1.15 + sag));
      }
      prevTop = top;
    }
    // Wires spanning the main street between rooftops
    for (const [z, y1, y2] of [[-24, 9.6, 9.1], [6, 10.2, 9.4], [27, 8.9, 9.8]]) {
      this.group.add(wire(new THREE.Vector3(-8.6, y1, z), new THREE.Vector3(8.6, y2, z + r.range(-2, 2)), 1.4));
    }
    // Strings of faded market flags near the intersection
    this.group.add(flagLine(new THREE.Vector3(-7.4, 6.4, -9.6), new THREE.Vector3(7.4, 6.7, -9.4), 5, 1.0));
    this.group.add(flagLine(new THREE.Vector3(-7.4, 6.6, 9.5), new THREE.Vector3(7.4, 6.3, 9.7), 11, 1.2));
    // (kept out of z=34..46 so it doesn't cross the collapsed-corner silhouettes)
    this.group.add(flagLine(new THREE.Vector3(-7.5, 6.9, 21), new THREE.Vector3(7.5, 6.5, 21.4), 23, 1.1));

    // Street lights along cross street
    for (const x of [-30, -55, 30, 55]) {
      this.placeProp(streetLight, x, -6.8, 0);
      this.placeProp(streetLight, -x, 6.8, Math.PI);
    }

    // Metal fences plugging alley gaps between some buildings
    const fences = [[-14.5, -23.5, 0, 10], [14.5, 25.5, 0, 10], [-40, -14, Math.PI / 2, 8], [42, 14, Math.PI / 2, 8]];
    for (const [x, z, rot, len] of fences) {
      this.placeProp(() => metalFence(len, 2.3), x, z, rot);
    }

    // Scattered rubble piles + debris in open areas
    for (const [x, z, s] of [[-22, 30, 1.4], [26, -34, 1.8], [-36, -30, 1.2], [38, 40, 1.5], [-52, 8, 1.1], [55, -9, 1.3]]) {
      this.placeProp(() => rubblePile(s, Math.floor(x * z)), x, z, 0, true);
    }

    // Sand drifts along road gutters (wind-blown against curbs)
    const rd = makeRNG(9944);
    for (let z = -74; z <= 74; z += 9) {
      if (Math.abs(z) < 8) continue;
      if (rd.chance(0.65)) this.addSandDrift(rd.pick([-1, 1]) * rd.range(4.3, 4.9), z + rd.range(-2, 2), rd.range(4, 9), rd.range(0.8, 1.6), Math.PI / 2 + rd.range(-0.2, 0.2));
    }
    for (let x = -74; x <= 74; x += 9) {
      if (Math.abs(x) < 8) continue;
      if (rd.chance(0.6)) this.addSandDrift(x + rd.range(-2, 2), rd.pick([-1, 1]) * rd.range(3.8, 4.4), rd.range(4, 9), rd.range(0.8, 1.5), rd.range(-0.2, 0.2));
    }

    // Enemy spawn points spread around the map edges + mid lanes
    const spawns = [
      [0, -62], [0, 62], [-62, 0], [62, 0],
      [-24, -40], [24, 40], [-40, 24], [40, -24],
      [-24, 44], [24, -44], [46, 22], [-46, -22],
    ];
    for (const [x, z] of spawns) this.spawnPoints.push(new THREE.Vector3(x, 0, z));

    // Cover spots along lanes
    for (const [x, z] of [[-4.8, -13], [4.8, 13], [-13, 4.8], [13, -4.8], [2.4, -30], [-2.8, 22], [-9, -28], [10, 34]]) {
      this.coverSpots.push(new THREE.Vector3(x, 0, z));
    }
  }

  // ------------------------------------------------- war-torn street dressing
  // Rubble mounds + instanced debris chunks, burn scars, defensive positions,
  // and ground clutter. Everything merged/instanced: ~20 draw calls total.
  buildWarTornDressing() {
    const r = makeRNG(515151);

    // ---- Rubble piles: low dust mounds + chunk debris on top ---------------
    // Street piles hug building bases / corners and spill off the sidewalks;
    // this.rubbleSpecs already holds the collapse spills queued by damaged
    // buildings. The road center (|x| < ~2.5) stays walkable.
    const piles = [
      { x: 7.1, z: 47.8, r: 2.5, h: 0.9, collide: true },    // east base, near spawn
      { x: -5.9, z: 54.2, r: 2.6, h: 0.9, collide: true },   // bottom-left foreground, in frame
      { x: -7.4, z: 9.2, r: 2.4, h: 0.85, collide: true },   // SW intersection corner
      { x: 6.5, z: -10.6, r: 2.1, h: 0.7, collide: true },   // NE intersection corner
      { x: -6.9, z: -27, r: 2.3, h: 0.8, collide: true },    // west, north block
      { x: 12.6, z: 6.6, r: 1.9, h: 0.65, collide: true },   // cross street east arm
      { x: -13.2, z: -6.6, r: 1.8, h: 0.6, collide: false }, // cross street west arm
      { x: 4.8, z: 63, r: 1.9, h: 0.7, collide: false },     // behind spawn
      ...this.rubbleSpecs,
    ];
    const moundGeos = [];
    const skirtGeos = [];
    const chunkMats = []; const chunkCols = [];
    const brickMats = []; const brickCols = [];
    const rebarMats = [];
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const col = new THREE.Color();
    const cShades = [0x8a857b, 0x9b968c, 0x726d63, 0xa8a094, 0x807a6e];
    const bShades = [0x9c6a4e, 0x8a5a42, 0xa87a58, 0x6e4a38];
    // position-hashed jitter keeps shared sphere-seam vertices coherent
    const hsh = (a, b) => { const t = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return t - Math.floor(t); };
    for (const p of piles) {
      const baseY = p.baseY ?? 0;
      const pr = makeRNG((p.seed ?? Math.floor(p.x * 13 + p.z * 7)) ^ 0x5f3759);
      // Irregular dust mound (crumpled half-sphere)
      const mg = new THREE.SphereGeometry(1, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2);
      const pos = mg.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
        const nmag = 0.78 + hsh(vx * 3.1, vz * 2.7) * 0.5;
        const ymag = 0.72 + hsh(vz * 2.3 + 3.1, vx * 3.7) * 0.5;
        pos.setXYZ(i, vx * p.r * nmag, vy * p.h * ymag, vz * p.r * 0.92 * nmag);
      }
      mg.computeVertexNormals();
      mg.rotateY(pr.range(0, Math.PI));
      mg.translate(p.x, baseY + 0.02, p.z);
      moundGeos.push(mg);
      // Dust skirt decal glues the mound to the ground
      if (!p.noSkirt && baseY === 0) {
        skirtGeos.push(new THREE.PlaneGeometry(p.r * 3.1, p.r * 2.9)
          .rotateX(-Math.PI / 2).rotateY(pr.range(0, Math.PI)).translate(p.x, 0.052, p.z));
      }
      // Broken concrete + brick chunks scattered over the mound
      const n = Math.floor(p.r * p.r * 6.5);
      for (let i = 0; i < n; i++) {
        const ang = pr() * Math.PI * 2;
        const dist = Math.pow(pr(), 0.6) * p.r * 1.06;
        const t = Math.max(0, 1 - dist / p.r);
        const my = p.h * Math.pow(t, 1.4) * 0.92;
        const brick = pr.chance(0.34);
        const s = brick ? pr.range(0.16, 0.3) : pr.range(0.24, 0.72);
        q.setFromEuler(new THREE.Euler(pr.range(-0.7, 0.7), pr.range(0, Math.PI), pr.range(-0.7, 0.7)));
        m4.compose(
          new THREE.Vector3(p.x + Math.cos(ang) * dist, baseY + Math.max(0.035, my) + s * 0.12, p.z + Math.sin(ang) * dist),
          q,
          brick ? new THREE.Vector3(s, s * 0.48, s * 0.62) : new THREE.Vector3(s, s * pr.range(0.35, 0.6), s * pr.range(0.6, 1.25))
        );
        if (brick) {
          brickMats.push(m4.clone());
          brickCols.push(col.setHex(pr.pick(bShades)).multiplyScalar(pr.range(0.75, 1.05)).clone());
        } else {
          chunkMats.push(m4.clone());
          chunkCols.push(col.setHex(pr.pick(cShades)).multiplyScalar(pr.range(0.8, 1.06)).clone());
        }
      }
      // Big slab pieces + rebar on the larger piles
      if (p.r >= 2.0) {
        const nS = 2 + (pr.chance(0.5) ? 1 : 0);
        for (let i = 0; i < nS; i++) {
          const sw = pr.range(0.8, 1.5);
          q.setFromEuler(new THREE.Euler(pr.range(-0.45, 0.45), pr.range(0, Math.PI), pr.range(-0.4, 0.4)));
          m4.compose(
            new THREE.Vector3(p.x + pr.range(-0.5, 0.5) * p.r * 0.5, baseY + p.h * pr.range(0.35, 0.7), p.z + pr.range(-0.5, 0.5) * p.r * 0.5),
            q, new THREE.Vector3(sw, 0.12, sw * pr.range(0.6, 0.9))
          );
          chunkMats.push(m4.clone());
          chunkCols.push(col.setHex(pr.pick(cShades)).multiplyScalar(pr.range(0.85, 1.05)).clone());
        }
        for (let i = 0; i < 3; i++) {
          q.setFromEuler(new THREE.Euler(pr.range(-1.1, 1.1), pr.range(0, Math.PI), pr.range(-1.1, 1.1)));
          m4.compose(
            new THREE.Vector3(p.x + pr.range(-0.4, 0.4) * p.r, baseY + p.h * pr.range(0.4, 0.8), p.z + pr.range(-0.4, 0.4) * p.r),
            q, new THREE.Vector3(1, pr.range(0.7, 1.4), 1)
          );
          rebarMats.push(m4.clone());
        }
      }
      if (p.collide && baseY === 0) {
        this.addCollider(p.x, p.h * 0.45, p.z, p.r * 1.25, p.h * 0.9, p.r * 1.25);
        this.coverSpots.push(new THREE.Vector3(p.x + p.r * 1.3, 0, p.z));
      }
    }
    if (moundGeos.length) {
      const m = new THREE.Mesh(mergeGeometries(moundGeos), rubbleDustMaterial());
      m.castShadow = true; m.receiveShadow = true;
      this.group.add(m);
    }
    const mkInst = (geo, mats, cols, material) => {
      if (!mats.length) return;
      const inst = new THREE.InstancedMesh(geo, material, mats.length);
      mats.forEach((m, i) => { inst.setMatrixAt(i, m); if (cols) inst.setColorAt(i, cols[i]); });
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      inst.castShadow = true; inst.receiveShadow = true;
      this.group.add(inst);
    };
    mkInst(new THREE.BoxGeometry(1, 1, 1), chunkMats, chunkCols, flatMaterial(0xffffff, 0.95, 0, 0.45));
    mkInst(new THREE.BoxGeometry(1, 1, 1), brickMats, brickCols, flatMaterial(0xffffff, 0.93, 0, 0.4));
    mkInst(new THREE.CylinderGeometry(0.016, 0.016, 1, 5), rebarMats, null, flatMaterial(0x3a2e24, 0.8, 0.6, 0.6));

    // ---- Burn scars on the road (blast rings + under burned vehicles) ------
    const ringGeos = [];
    const rings = [
      [-2.6, 40.5, 4.6], [1.1, 33.6, 3.4], [2.4, -30, 4.0], [-4.3, -24, 3.2],
      [0.6, 9.2, 3.6], [-26, 2.2, 4.2], [2.4, 53.6, 3.2], [-0.9, 15.5, 3.0],
      [5.2, 40.4, 3.8], [-5.9, 39.0, 3.2], [6.3, 23.2, 3.4], // blast scars by the broken corners
    ];
    for (const [sx2, sz2, ss] of rings) {
      ringGeos.push(new THREE.PlaneGeometry(ss, ss)
        .rotateZ(r.range(0, Math.PI)).rotateX(-Math.PI / 2).translate(sx2, 0.034, sz2));
    }
    const ringMesh = new THREE.Mesh(mergeGeometries(ringGeos), scorchMarkMaterial());
    ringMesh.renderOrder = 5;
    ringMesh.receiveShadow = true;
    this.group.add(ringMesh);

    // ---- Defensive positions ------------------------------------------------
    // Forward sandbag nest just ahead of the spawn (L-shaped, faces downstreet)
    this.placeProp(() => sandbagWall(3, 5), -4.15, 45.3, 0.07, true);
    this.placeProp(() => sandbagWall(3, 4), -5.75, 46.9, Math.PI / 2 - 0.06, true);
    this.placeProp(() => crate(0.72), -3.5, 47.9, 0.5);
    this.placeProp(() => barrel(0x5a6b46), -4.7, 48.5, 1.2);
    // Second nest covering the intersection from the east sidewalk
    this.placeProp(() => sandbagWall(3, 5), 5.0, 19.2, -1.2, true);
    this.placeProp(() => sandbagWall(2, 3), 6.4, 17.7, -2.5);
    // Jersey-barrier chicane mid-street (S-path through the middle stays open)
    this.placeProp(jerseyBarrier, -3.4, 30.0, Math.PI / 2 + 0.22, true);
    this.placeProp(jerseyBarrier, -1.4, 29.6, Math.PI / 2 + 0.12, true);
    this.placeProp(jerseyBarrier, 1.7, 24.0, Math.PI / 2 - 0.15, true);
    this.placeProp(jerseyBarrier, 3.7, 24.5, Math.PI / 2 - 0.3, true);

    // ---- Ground clutter ------------------------------------------------------
    this.placeProp(() => cardboardCluster(11, 3), -5.9, 43.4, 0.4);
    this.placeProp(() => cardboardCluster(23, 2), 6.05, 27.6, 1.9);
    this.placeProp(() => cardboardCluster(37, 3), 5.5, 50.6, 2.7);
    this.placeProp(() => cardboardCluster(41, 2), -6.3, 17.2, 4.1);
    // Loose tires dumped in the gutters (single instanced mesh)
    const tireSpots = [
      [4.6, 33.8, 0], [-5.15, 25.2, 0.45], [6.9, 52.4, 0], [2.6, 12.3, 0], [-6.2, -14.5, 0.4],
    ];
    const tireMats = [];
    for (const [tx, tz, lean] of tireSpots) {
      q.setFromEuler(new THREE.Euler(Math.PI / 2 + lean, 0, r.range(0, Math.PI)));
      m4.compose(new THREE.Vector3(tx, lean > 0 ? 0.24 : 0.135, tz), q, new THREE.Vector3(1, 1, 1));
      tireMats.push(m4.clone());
      skirtGeos.push(new THREE.PlaneGeometry(1.05, 1.05).rotateX(-Math.PI / 2).translate(tx, 0.05, tz));
    }
    mkInst(new THREE.TorusGeometry(0.34, 0.13, 8, 18), tireMats, null,
      new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.95 }));
    // Merged dust skirts under mounds + tires (one decal mesh)
    if (skirtGeos.length) {
      const sm = contactShadowMaterial().clone();
      sm.opacity = 0.3;
      const m = new THREE.Mesh(mergeGeometries(skirtGeos), sm);
      m.renderOrder = 6;
      this.group.add(m);
    }
  }

  // ------------------------------------------------------------------ boundary
  buildBoundary() {
    const mat = concreteMaterial(45, 0.8);
    const H = 4.2, T = 0.6, L = 172;
    const walls = [
      [0, -86, L, T], [0, 86, L, T], [-86, 0, T, L], [86, 0, T, L],
    ];
    for (const [x, z, w, d] of walls) {
      const m = texturedBox(w, H, d, mat, 3.4);
      m.position.set(x, H / 2, z);
      this.group.add(m);
      this.addCollider(x, H / 2, z, w, H, d);
    }
    // Buttress piers + cap beam break up the long runs
    const pierMat = concreteMaterial(45, 0.72);
    for (let p = -84; p <= 84; p += 12) {
      for (const [px, pz, pw, pd] of [[p, -86, 0.9, 1.0], [p, 86, 0.9, 1.0], [-86, p, 1.0, 0.9], [86, p, 1.0, 0.9]]) {
        const pier = texturedBox(pw, H + 0.35, pd, pierMat, 2.2);
        pier.position.set(px, (H + 0.35) / 2, pz);
        this.group.add(pier);
      }
    }
    for (const [x, z, w, d] of walls) {
      const cap = texturedBox(w + 0.3, 0.22, d + 0.5, pierMat, 2.6);
      cap.position.set(x, H + 0.11, z);
      this.group.add(cap);
    }
    // Grime along the inward faces
    this.addGrimeSkirt(L, 0, -86 + T / 2 + 0.04, 0, 1.1);
    this.addGrimeSkirt(L, 0, 86 - T / 2 - 0.04, Math.PI, 1.1);
    this.addGrimeSkirt(L, -86 + T / 2 + 0.04, 0, Math.PI / 2, 1.1);
    this.addGrimeSkirt(L, 86 - T / 2 - 0.04, 0, -Math.PI / 2, 1.1);
    // Wind-piled sand at the base
    const rb = makeRNG(4141);
    for (let p = -78; p <= 78; p += 13) {
      if (rb.chance(0.7)) this.addSandDrift(p + rb.range(-3, 3), -84.6, rb.range(5, 10), rb.range(1.2, 2.2), rb.range(-0.15, 0.15));
      if (rb.chance(0.7)) this.addSandDrift(p + rb.range(-3, 3), 84.6, rb.range(5, 10), rb.range(1.2, 2.2), rb.range(-0.15, 0.15));
      if (rb.chance(0.7)) this.addSandDrift(-84.6, p + rb.range(-3, 3), rb.range(5, 10), rb.range(1.2, 2.2), Math.PI / 2 + rb.range(-0.15, 0.15));
      if (rb.chance(0.7)) this.addSandDrift(84.6, p + rb.range(-3, 3), rb.range(5, 10), rb.range(1.2, 2.2), Math.PI / 2 + rb.range(-0.15, 0.15));
    }
  }

  // ----------------------------------------------------- distant skyline (set)
  buildDistantSkyline() {
    const r = makeRNG(5150);
    const haze = new THREE.Color(0xc9ab82);
    const dark = new THREE.Color(0x574b3c);
    const items = [];
    const count = 120;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + r.range(-0.05, 0.05);
      const dist = 200 + Math.pow(r(), 1.6) * 240;
      const tall = r.chance(0.13);
      const w = r.range(9, 26), d = r.range(9, 26);
      const h = tall ? r.range(26, 52) : r.range(7, 22);
      const x = Math.cos(ang) * dist, z = Math.sin(ang) * dist;
      items.push({ x, z, w, h, d, rot: r.range(0, Math.PI) });
      if (r.chance(0.4)) { // rooftop bulkhead bumps for silhouette interest
        items.push({ x: x + r.range(-5, 5), z: z + r.range(-5, 5), w: w * 0.24, h: h + r.range(1.5, 4.5), d: d * 0.24, rot: r.range(0, Math.PI) });
      }
    }
    const geo = new THREE.BoxGeometry(1, 1, 1);
    // Baked atmospheric-perspective colors; fog off so we control the fade.
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
    const inst = new THREE.InstancedMesh(geo, mat, items.length);
    const m4 = new THREE.Matrix4();
    const col = new THREE.Color();
    items.forEach((it, i) => {
      m4.compose(
        new THREE.Vector3(it.x, it.h / 2 - 1.5, it.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, it.rot, 0)),
        new THREE.Vector3(it.w, it.h, it.d)
      );
      inst.setMatrixAt(i, m4);
      const dist = Math.hypot(it.x, it.z);
      const t = Math.min(1, Math.max(0, (dist - 180) / 290));
      col.copy(dark).lerp(haze, Math.min(1, 0.3 + t * 0.62 + r.range(-0.04, 0.04)));
      inst.setColorAt(i, col);
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    this.group.add(inst);

    // A few distant minaret / tower silhouettes
    const towerGeo = new THREE.CylinderGeometry(1, 1.5, 1, 8);
    const towers = new THREE.InstancedMesh(towerGeo, mat.clone(), 4);
    [[0.4, 250, 34], [1.9, 300, 42], [3.6, 270, 30], [5.1, 320, 38]].forEach(([ang, dist, h], i) => {
      const x = Math.cos(ang) * dist, z = Math.sin(ang) * dist;
      m4.compose(new THREE.Vector3(x, h / 2 - 1.5, z), new THREE.Quaternion(), new THREE.Vector3(2.4, h, 2.4));
      towers.setMatrixAt(i, m4);
      const t = Math.min(1, Math.max(0, (dist - 180) / 290));
      col.copy(dark).lerp(haze, Math.min(1, 0.32 + t * 0.6));
      towers.setColorAt(i, col);
    });
    towers.instanceMatrix.needsUpdate = true;
    if (towers.instanceColor) towers.instanceColor.needsUpdate = true;
    this.group.add(towers);
  }
}
