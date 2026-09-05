// d4-hangar machinery: the ceiling crane (two full-length gantry rails at y -16 hung from the ceiling
// ribs with a segmented lit channel under each, an underslung bridge of two 2.4 m deep box girders in
// Imperial hull grey with steel flanges, segmented lit under-girder channels, big amber beacons along
// the girders and on both end trucks and a maintenance walkway, a trolley with two housed work lights
// (spot descriptors) and amber beacons, hoist and a 2.6 m black/yellow hook block on a pair of heavy
// cables with a slung 3.6 m container, driven by t on a park-travel-park schedule that leaves it at
// layout.CRANE_PARK at t = 40 - over the port taxi lane at z 20 with the block down at y -54, in the
// deck, balcony and racks frames), and the
// deck-level utility clutter clustered under the racks, along the end walls and by the spawn: fuel
// bowsers, ground-power carts, tool carts, crate stacks, cable reels, mobile access platforms, drums,
// each on its contact shadow. Nothing stands on a landing pad, taxi lane or door approach.
import * as THREE from "three";
import { Batch, Batcher, sharedCylinder } from "./batch.js";
import { FLOOR, CEIL, WALL_T, HALL, RIB_Z, RIB_D, RAIL_H, HG, EM, CRANE_PARK } from "./layout.js";
import { label, railRun, litChannel } from "./util.js";
import { contactShadow } from "./deck.js";

// ---------------------------------------------------------------------------
// Crane
// ---------------------------------------------------------------------------
const RAIL_X = 64;
const RAIL_TOP = -16;
const RIB_BOTTOM = CEIL - WALL_T - RIB_D; // underside of the transverse ceiling ribs
const GIRDER_Z = 1.4; // half distance between the two bridge girders
const GIRDER_TOP = -16.9, GIRDER_H = 2.4; // box girders: 2.4 m deep, so from the deck 140 m away the pair is a 4 px light bar across the roof, not a hairline
const GIRDER_BOT = GIRDER_TOP - GIRDER_H; // -19.3
const HOIST_TOP = GIRDER_BOT - 0.15; // the hoist body hangs under the girders
const DRUM_Y = HOIST_TOP - 2.55; // hoist drum axis (trolley local)
const WL_Y = HOIST_TOP - 1.7; // work-light lens plane (the spot descriptors shine from here)
// schedule (module clock, 200 s cycle, offset so t = 40 lands mid-dwell at the aft park): dwell forward
// over pad 05 with the hook part-lowered, 40 s travel aft, 60 s dwell at CRANE_PARK (bridge z 20,
// trolley x -54, block at y -54 over the port taxi lane between the bay-3 door and the first rack slot:
// see layout.js for the framing from the three cameras) with the hook down, travel back. The hover
// column of the traffic system is at (0, *, 32) and its slot transfers leave the column toward +-x
// along z 30 .. 90, so the slung load (z 18 .. 22) is clear of every approach.
const PARK_AFT = CRANE_PARK;
const PARK_FWD = { z: -52, x: -20, hook: -30 };
const HOOK_TRAVEL = -22;
const BLOCK_H = 2.6; // hook block height (its centre is the hook group origin)
const smooth = (k) => k * k * (3 - 2 * k);
const seg = (u, a, b) => smooth(Math.min(1, Math.max(0, (u - a) / (b - a))));

/** static rails + hangers (kit) and the moving bridge/trolley/hook (meshes on ctx.group). Returns {update}. */
export function buildCrane(ctx) {
  const { kit, group, materials, PALETTE } = ctx;
  const B = new Batcher(kit);
  const impDark = PALETTE.impDark, impMid = PALETTE.impMid;
  const z0 = HALL.z0 + 1.5, z1 = HALL.z1 - 1.5;
  for (const s of [-1, 1]) {
    const x = s * RAIL_X;
    const mm = (a, b) => [Math.min(x + s * a, x + s * b), Math.max(x + s * a, x + s * b)];
    // I-beam rail: top flange, web, light-grey bottom flange (the trucks ride it), then a segmented lit
    // channel under the flange (8 m lenses in a housed trough, a tenth of them dead): the two rails read
    // as jointed lit lines along the roof, not two bare bars the length of the hall
    B.boxMM("paintedMetal", impDark, [x - 0.32, RAIL_TOP - 0.12, z0], [x + 0.32, RAIL_TOP, z1], { texel: 0.5 });
    B.boxMM("paintedMetal", impDark, [x - 0.07, RAIL_TOP - 0.9, z0 + 0.02], [x + 0.07, RAIL_TOP - 0.12, z1 - 0.02], { texel: 0.5 });
    B.boxMM("hgEmit", EM.hullLight, [x - 0.32, RAIL_TOP - 1.02, z0], [x + 0.32, RAIL_TOP - 0.9, z1]);
    litChannel(B, PALETTE, [x, RAIL_TOP - 1.3, z0 + 0.3], [x, RAIL_TOP - 1.3, z1 - 0.3], [0, -1, 0], { w: 0.44, depth: 0.28, lensW: 0.22, level: EM.channel, seg: 8, gap: 0.5, cap: 0.4, off: 0.1, seed: s + 3, body: { mat: "hgEmit", color: EM.housing }, capStyle: { mat: "hgEmit", color: EM.housingCap } });
    // hangers to the transverse ceiling ribs with foot plates and a knee gusset toward the wall
    for (const z of RIB_Z) {
      B.boxMM("paintedMetal", impDark, [x - 0.25, RAIL_TOP + 0.1, z - 0.25], [x + 0.25, RIB_BOTTOM, z + 0.25], { texel: 0.5 });
      B.boxMM("paintedMetal", impMid, [x - 0.5, RAIL_TOP - 0.02, z - 0.5], [x + 0.5, RAIL_TOP + 0.14, z + 0.5], { texel: 0.5 });
      B.tube("metal", HG.gunmetal, [x + s * 0.3, RAIL_TOP + 0.3, z], [x + s * 2.4, RIB_BOTTOM - 0.05, z], 0.08, 8);
    }
    // festoon cable tray outboard of the truck path (feeds the bridge), on brackets off the top flange
    let [a, b] = mm(1.7, 2.0);
    B.boxMM("paintedMetal", PALETTE.impBlack, [a, RAIL_TOP - 0.5, z0], [b, RAIL_TOP - 0.2, z1], { texel: 0.5 });
    [a, b] = mm(1.75, 1.95);
    B.boxMM("rubber", HG.rubber, [a, RAIL_TOP - 0.42, z0 + 0.1], [b, RAIL_TOP - 0.28, z1 - 0.1]);
    [a, b] = mm(0.3, 2.0);
    for (let z = z0 + 6; z < z1 - 2; z += 12) B.boxMM("metal", HG.gunmetal, [a, RAIL_TOP - 0.1, z - 0.06], [b, RAIL_TOP, z + 0.06]);
    // end stops in the truck path (black/yellow chevron)
    for (const z of [z0 + 0.6, z1 - 0.6]) B.boxMM("hazard", 0xffffff, [x - 0.6, RAIL_TOP - 2.5, z - 0.2], [x + 0.6, RAIL_TOP - 1.15, z + 0.2], { texel: 1 });
  }
  B.flush();

  // ---- bridge (moves along z): two 2.4 m deep box girders and the end trucks in Imperial hull grey on
  // the self-lit level (EM.hull: nothing of the light plan reaches the roof, and hull-grey paint lit by
  // the environment alone measured 26 sRGB against a 23 ceiling - invisible; on the emitter it sits at
  // the value of the lit base storey, a light bar across a dark roof), lighter self-lit steel flanges,
  // dark stiffeners, and a row of big amber beacons along each girder's outer face
  const bridge = new THREE.Group();
  bridge.name = "crane-bridge";
  const bb = new Batch(), bh = new Batch(), be = new Batch(), ba = new Batch();
  const hull = { color: EM.hull }, flange = { color: EM.hullLight };
  const L = 2 * RAIL_X - 2.2; // girder length (ends buried 10 cm in the trucks)
  const gY = GIRDER_TOP - GIRDER_H / 2; // girder centre
  for (const s of [-1, 1]) {
    const x = s * RAIL_X;
    bh.box(x, (GIRDER_TOP + 0.7 + GIRDER_BOT + 0.25) / 2, 0, 2.4, GIRDER_TOP + 0.7 - GIRDER_BOT - 0.25, 4.0, hull); // end truck around the rail
    for (const dz of [-1.3, 1.3]) bb.box(x, -17.0, dz, 2.6, 0.7, 0.9, { color: impDark, texel: 0.5 }); // wheel covers
    bh.box(x + s * 1.3, -16.7, 0, 0.2, 0.2, 3.6, flange);
    // amber beacon at each end of the bridge: a gunmetal housing on the truck's outer face with a big
    // lens toward the wall and a second on its underside (the one the deck sees), plus a rooftop lamp
    bb.box(x + s * 1.35, -18.2, 0, 0.3, 1.0, 1.4, { color: HG.gunmetal });
    ba.box(x + s * 1.52, -18.2, 0, 0.04, 0.9, 1.3);
    ba.box(x + s * 1.35, -18.71, 0, 0.28, 0.02, 1.3);
    bb.box(x - s * 0.8, -16.1, 0, 0.9, 0.2, 0.9, { color: HG.gunmetal });
    ba.box(x - s * 0.8, -15.97, 0, 0.8, 0.06, 0.8);
  }
  for (const zs of [-GIRDER_Z, GIRDER_Z]) {
    const out = Math.sign(zs);
    bh.box(0, gY, zs, L, GIRDER_H, 0.7, hull);
    bh.box(0, GIRDER_TOP + 0.06, zs, L, 0.12, 0.9, flange);
    // steel bottom flange (the underside is what the deck sees) carrying a black channel with a
    // segmented lit lens (6 m lenses, mid-grey joints): a jointed lit line across the roof, housed
    bh.box(0, GIRDER_BOT - 0.06, zs, L, 0.12, 0.9, flange);
    bb.box(0, GIRDER_BOT - 0.16, zs, L - 3, 0.08, 0.52, { color: PALETTE.impBlack });
    for (let x = -L / 2 + 1.7; x < L / 2 - 1.7 - 1; x += 6.5) {
      const len = Math.min(6, L / 2 - 1.7 - x);
      be.box(x + len / 2, GIRDER_BOT - 0.205, zs, len, 0.01, 0.4);
      if (x + 6.5 < L / 2 - 1.7) bh.box(x + 6.25, GIRDER_BOT - 0.18, zs, 0.3, 0.06, 0.56, flange);
    }
    // dark stiffener plates every 6 m on the outer face (ribs on the light girder); a big amber beacon
    // every 20 m - a 1.2 m gunmetal housing on the outer face with a 1.1 m lens toward the hall and a
    // second under it (1.8 px at 140 m, a row of blooming amber dots that no ceiling fixture has: the
    // crane's signature from the spawn and the balcony)
    for (let x = -60; x <= 60; x += 6) bb.box(x, gY, zs + out * 0.36, 0.25, GIRDER_H - 0.1, 0.04, { color: impDark });
    for (let x = -50; x <= 50; x += 20) {
      bb.box(x, gY + 0.3, zs + out * 0.55, 1.2, 0.8, 0.4, { color: HG.gunmetal });
      ba.box(x, gY + 0.3, zs + out * 0.76, 1.1, 0.7, 0.03);
      ba.box(x, gY - 0.11, zs + out * 0.55, 1.1, 0.03, 0.36);
    }
  }
  for (let x = -60; x <= 60; x += 12) bb.box(x, -17.15, 0, 0.3, 0.3, 2 * GIRDER_Z - 0.6, { color: impDark });
  // maintenance walkway along the +z girder with a 1.02 m rail
  const wz = GIRDER_Z + 0.35 + 0.05;
  bh.box(0, -16.95, wz + 0.4, L - 2, 0.1, 0.8, hull);
  for (let x = -60; x <= 60; x += 6) bb.box(x, -17.15, wz + 0.4, 0.15, 0.3, 0.8, { color: impDark });
  for (let x = -61; x <= 61; x += 2.5) bb.box(x, -16.9 + RAIL_H / 2, wz + 0.78, 0.06, RAIL_H, 0.06, { color: HG.gunmetal });
  bh.box(0, -16.9 + RAIL_H, wz + 0.78, L - 2, 0.05, 0.06, flange);
  bh.box(0, -16.9 + RAIL_H * 0.55, wz + 0.78, L - 2, 0.04, 0.05, flange);
  bb.box(0, -16.8, wz + 0.78, L - 2, 0.2, 0.03, { color: HG.gunmetal });
  // housed lamps under both girders every 10 m (housing in the body batch, lens in the emitter batch)
  for (let x = -55; x <= 55; x += 10) {
    for (const zs of [-GIRDER_Z, GIRDER_Z]) {
      bb.box(x, GIRDER_BOT - 0.32, zs, 0.9, 0.16, 0.6, { color: impDark });
      be.box(x, GIRDER_BOT - 0.405, zs, 0.8, 0.02, 0.5);
    }
  }
  const meshB = new THREE.Mesh(bb.geometry(), materials.paintedMetal);
  const meshH = new THREE.Mesh(bh.geometry(), materials.hgEmit);
  const meshE = new THREE.Mesh(be.geometry(EM.crane), materials.hgEmit);
  const meshA = new THREE.Mesh(ba.geometry(0xffffff), materials.emitAmber);
  bridge.add(meshB, meshH, meshE, meshA);

  // ---- trolley (moves along x on the bridge): hull-grey carriages riding inside the girder pocket, a
  // yoke down through it to the hoist body under the girders, two housed work lights under that (the
  // spot descriptors below shine from their lenses), amber beacons on the body's x faces
  const trolley = new THREE.Group();
  trolley.name = "crane-trolley";
  const tb = new Batch(), th = new Batch();
  const hY = HOIST_TOP - 0.55; // hoist body centre (1.1 m tall)
  for (const sx of [-1, 1]) th.box(sx * 1.1, -18.05, 0, 0.8, 0.9, 2.0, hull); // wheel carriages between the girders
  for (const sx of [-1, 1]) th.box(sx * 1.1, (HOIST_TOP - 18.5) / 2, 0, 0.8, -18.5 - HOIST_TOP, 2.0, hull); // yoke plates down to the body
  th.box(0, hY, 0, 2.6, 1.1, 3.4, hull); // hoist body
  for (const sx of [-1, 1]) tb.box(sx * 1.31, hY, 0, 0.02, 0.7, 2.6, { color: impDark }); // side panels
  for (const sx of [-1, 1]) tb.box(sx * 1.0, hY - 1.0, 0, 0.2, 0.9, 0.6, { color: impDark }); // drum mounts
  tb.addGeometry(new THREE.CylinderGeometry(0.45, 0.45, 1.8, 14), { pos: [0, DRUM_Y, 0], quat: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2), color: HG.gunmetal });
  tb.addGeometry(new THREE.CylinderGeometry(0.2, 0.2, 0.4, 10), { pos: [0, hY, -1.9], quat: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), color: HG.steel }); // motor stub
  // amber beacon housings on the body's x faces at both z ends (lenses in the amber batch below)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) tb.box(sx * 1.45, hY, sz * 1.3, 0.3, 0.5, 0.6, { color: HG.gunmetal });
  // work-light housings: two 0.9 m gunmetal boxes under the hoist body, open downward, lens recessed
  const WL = [[-0.85, 1.25], [0.85, -1.25]]; // [dx, dz] of the two work lights
  for (const [dx, dz] of WL) {
    tb.box(dx, WL_Y + 0.25, dz, 0.9, 0.4, 0.9, { color: HG.gunmetal });
    for (const s of [-1, 1]) {
      tb.box(dx + s * 0.44, WL_Y - 0.02, dz, 0.04, 0.14, 0.9, { color: HG.gunmetal });
      tb.box(dx, WL_Y - 0.02, dz + s * 0.44, 0.9, 0.14, 0.04, { color: HG.gunmetal });
    }
  }
  const meshT = new THREE.Mesh(tb.geometry(), materials.paintedMetal);
  const te = new Batch();
  for (const [dx, dz] of WL) te.box(dx, WL_Y + 0.04, dz, 0.76, 0.02, 0.76);
  const meshTE = new THREE.Mesh(te.geometry(EM.lens), materials.hgEmit);
  const ta = new Batch();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) ta.box(sx * 1.61, hY, sz * 1.3, 0.02, 0.4, 0.5);
  const meshTA = new THREE.Mesh(ta.geometry(0xffffff), materials.emitAmber);
  // two hoist cables: unit-height boxes hanging from the drum, scaled to the hook height each frame
  // (14 cm heavy wire rope: the pair reads from the racks camera 17 m away)
  const cb = new Batch();
  for (const sx of [-0.5, 0.5]) cb.box(sx, -0.5, 0, 0.14, 1, 0.14, { color: HG.steel });
  const cables = new THREE.Mesh(cb.geometry(), materials.paintedMetal);
  cables.position.y = DRUM_Y;
  // hook block, 2.6 m tall: a sheave block in four 0.65 m black/yellow bands (yellow top and bottom),
  // steel cheek plates and sheave axle, amber lamp housing on top, shank + hook under it
  const hook = new THREE.Group();
  const hb = new Batch(), hy = new Batch();
  const BW = 1.6, BD = 0.9, band = BLOCK_H / 4;
  for (let i = 0; i < 4; i++) {
    const yc = BLOCK_H / 2 - band * (i + 0.5);
    (i % 2 === 0 ? hy : hb).box(0, yc, 0, BW, band, BD, i % 2 === 0 ? undefined : { color: HG.black });
  }
  for (const sz of [-1, 1]) hb.box(0, 0.1, sz * (BD / 2 + 0.02), BW + 0.2, BLOCK_H - 0.5, 0.04, { color: HG.steel });
  hb.box(0, BLOCK_H / 2 + 0.08, 0, BW + 0.3, 0.16, 0.16, { color: HG.steel });
  for (const sx of [-0.5, 0.5]) hb.box(sx, BLOCK_H / 2 + 0.06, 0, 0.2, 0.12, BD + 0.1, { color: HG.gunmetal });
  hb.box(0, -BLOCK_H / 2 - 0.35, 0, 0.24, 0.7, 0.24, { color: HG.steel });
  // J hook: half torus whose upper end meets the shank, curving down and round on +x
  hb.addGeometry(new THREE.TorusGeometry(0.45, 0.12, 8, 18, Math.PI), { pos: [0, -BLOCK_H / 2 - 1.1, 0], quat: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI / 2), color: HG.steel });
  // amber lamp housings on the block top corners (the lowered block reads as lit amber points)
  const hl = new Batch();
  for (const sx of [-1, 1]) {
    hb.box(sx * 0.55, BLOCK_H / 2 + 0.22, 0, 0.4, 0.16, 0.5, { color: HG.gunmetal });
    hl.box(sx * 0.55, BLOCK_H / 2 + 0.31, 0, 0.32, 0.02, 0.42);
  }
  // slung load: a spreader bar on two slings from the hook, a 3.6 m cargo container in hull grey on four
  // slings under it (recessed dark side panels, corner posts, dark lid, amber lamps on the spreader
  // ends) - the crane is at work, and the load is big enough to read at 140 m. The container is on the
  // girders' self-lit hull level: its sides face the spawn 137 m away with nothing of the light plan on
  // them (the work lights are straight over it), and on plain paint it was a black 6 px box against the
  // dark wall on a half-size frame - the one thing hanging from the crane has to read as a light-grey load
  const lb = new Batch(), lp = new Batch();
  const sling = (batch, a, b, r) => {
    const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    batch.addGeometry(sharedCylinder(1, 1, 6), { pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], quat: q, scale: [r, len, r], color: HG.steel });
  };
  const hookTip = -BLOCK_H / 2 - 1.55, spY = hookTip - 1.1;
  lb.box(0, spY, 0, 4.4, 0.2, 0.2, { color: HG.steel });
  for (const sx of [-1, 1]) {
    lb.box(sx * 2.1, spY, 0, 0.24, 0.36, 0.36, { color: impDark });
    hl.box(sx * 2.1, spY - 0.2, 0, 0.22, 0.02, 0.3);
    sling(lb, [0, hookTip, 0], [sx * 2.1, spY + 0.1, 0], 0.04);
  }
  const C = 3.6, cTop = spY - 1.6, cy = cTop - C / 2;
  lp.box(0, cy, 0, C, C, C, { color: EM.hull });
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (const vy of [-0.85, 0.85]) lp.box(dx * (C / 2 + 0.01), cy + vy, dz * (C / 2 + 0.01), dx ? 0.02 : 2.6, 1.1, dz ? 0.02 : 2.6, { color: EM.housingCap });
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) lb.box((dx * C) / 2, cy, (dz * C) / 2, 0.14, C + 0.04, 0.14, { color: HG.gunmetal });
  lp.box(0, cTop + 0.06, 0, C - 0.16, 0.12, C - 0.16, { color: EM.housing });
  lb.box(0, cy, 0, C + 0.04, 0.08, C + 0.04, { color: HG.gunmetal });
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) sling(lb, [dx * 2.1, spY - 0.1, 0], [dx * 1.65, cTop, dz * 1.65], 0.035);
  hook.add(new THREE.Mesh(hb.geometry(), materials.paintedMetal), new THREE.Mesh(hy.geometry(EM.hazard), materials.hgEmit), new THREE.Mesh(hl.geometry(0xffffff), materials.emitAmber), new THREE.Mesh(lb.geometry(), materials.paintedMetal), new THREE.Mesh(lp.geometry(), materials.hgEmit));
  trolley.add(meshT, meshTE, meshTA, cables, hook);
  bridge.add(trolley);
  group.add(bridge);

  // the two work lights: spot descriptors from the trolley's lenses straight down (pos / target are
  // re-read every frame by the pool). Priority 0.8 with a 170 m range: on the harness's score the pair
  // beats the rack key lights (0.85) from the spawn and balcony cameras (they are 140-160 m out, so the
  // in-range bonus decides it) and sits under the port key from the racks camera (which keeps its
  // fighter shadows) - two of the four spot slots become the crane pool wherever the crane is in frame
  // 1100 / 52 m^1.2 each in a 0.17 rad cone (a 9 m radius on the deck, the inner 4 m at full strength):
  // the pair puts ~20 lux on the lane under the block, the brightest patch of deck in the racks frame
  // (three times the plates round it on a half-size frame), a disc at 140 m, and the bowser group 9 m
  // off the axis at (-64, 30) sits in the last of the penumbra. At 1500 in a 0.22 cone the pool measured
  // 226 sRGB with the bowser blown out; at 450 it was a 37 against 25 - not a pool anyone would notice
  const lights = WL.map(([dx, dz]) => ({ type: "spot", pos: [PARK_AFT.x + dx, -20.1, PARK_AFT.z + dz], target: [PARK_AFT.x + dx, FLOOR, PARK_AFT.z + dz], color: 0xfff1dc, intensity: 1100, distance: 170, decay: 1.2, angle: 0.17, penumbra: 0.55, priority: 0.8 }));
  for (const l of lights) ctx.lights.push(l);

  const update = (t) => {
    const u = (t + 50) % 200; // t = 40 -> u = 90: mid-dwell over the aft apron, hook down
    let zc, xt;
    if (u < 20 || u >= 160) {
      zc = PARK_FWD.z;
      xt = PARK_FWD.x;
    } else if (u < 60) {
      const k = seg(u, 20, 60);
      zc = PARK_FWD.z + (PARK_AFT.z - PARK_FWD.z) * k;
      xt = PARK_FWD.x + (PARK_AFT.x - PARK_FWD.x) * k;
    } else if (u < 120) {
      zc = PARK_AFT.z;
      xt = PARK_AFT.x;
    } else {
      const k = seg(u, 120, 160);
      zc = PARK_AFT.z + (PARK_FWD.z - PARK_AFT.z) * k;
      xt = PARK_AFT.x + (PARK_FWD.x - PARK_AFT.x) * k;
    }
    // hook: at travel height while moving, lowered over 12 s after each arrival and raised in the 12 s
    // before each departure
    const aft = u >= 60 && u < 120 ? seg(u, 60, 72) * (1 - seg(u, 108, 120)) : 0;
    const fwd = u < 20 ? 1 - seg(u, 8, 20) : u >= 160 ? seg(u, 160, 172) : 0;
    const yH = HOOK_TRAVEL + (PARK_AFT.hook - HOOK_TRAVEL) * aft + (PARK_FWD.hook - HOOK_TRAVEL) * fwd;
    bridge.position.z = zc;
    trolley.position.x = xt;
    hook.position.y = yH;
    cables.scale.y = DRUM_Y - (yH + BLOCK_H / 2);
    lights.forEach((l, i) => {
      const [dx, dz] = WL[i];
      l.pos[0] = l.target[0] = xt + dx;
      l.pos[2] = l.target[2] = zc + dz;
    });
  };
  update(0);
  return { update };
}

// ---------------------------------------------------------------------------
// Deck clutter. Placer maps prop-local coordinates (origin on the deck, +lz = prop front) into the
// world with a quarter-turn yaw so everything stays axis-aligned for the box batcher.
// ---------------------------------------------------------------------------
class Placer {
  constructor(ctx, B, x, z, q) {
    this.ctx = ctx;
    this.B = B;
    this.kit = ctx.kit;
    this.P = ctx.PALETTE;
    this.x = x;
    this.z = z;
    this.q = ((q % 4) + 4) % 4;
  }
  dir(lx, lz) {
    switch (this.q) {
      case 0: return [lx, lz];
      case 1: return [lz, -lx];
      case 2: return [-lx, -lz];
      default: return [-lz, lx];
    }
  }
  w(lx, lz) {
    const [dx, dz] = this.dir(lx, lz);
    return [this.x + dx, this.z + dz];
  }
  ext(sx, sz) {
    return this.q & 1 ? [sz, sx] : [sx, sz];
  }
  box(mat, color, lx, ly, lz, sx, sy, sz, opts) {
    const [x, z] = this.w(lx, lz);
    const [ex, ez] = this.ext(sx, sz);
    this.B.box(mat, color, x, ly, z, ex, sy, ez, opts);
  }
  /** batched cylinder from shared geometry (wheels, drums, hubs: the primitive's own UVs are fine) */
  cyl(mat, color, lx, ly, lz, r, len, axis = "y", opts = {}) {
    const [x, z] = this.w(lx, lz);
    const a = axis === "y" ? "y" : this.q & 1 ? (axis === "x" ? "z" : "x") : axis;
    this.B.cyl(mat, color, x, ly, z, r, len, a, opts.segments || 12);
  }
  /** textured cylinder through the kit (world-scaled UVs: hazard rings, big tanks) */
  kcyl(mat, color, lx, ly, lz, r, len, axis = "y", opts = {}) {
    const [x, z] = this.w(lx, lz);
    const a = axis === "y" ? "y" : this.q & 1 ? (axis === "x" ? "z" : "x") : axis;
    this.kit.cyl(mat, x, ly, z, r, len, a, { color, ...opts });
  }
  tube(mat, color, a, b, r, opts = {}) {
    const [ax, az] = this.w(a[0], a[2]);
    const [bx, bz] = this.w(b[0], b[2]);
    this.B.tube(mat, color, [ax, a[1], az], [bx, b[1], bz], r, opts.segments || 8);
  }
  label(mat, name, l, normal, width, opts) {
    const [x, z] = this.w(l[0], l[2]);
    const [nx, nz] = this.dir(normal[0], normal[2]);
    label(this.kit, mat, name, [x, l[1], z], [nx, normal[1], nz], width, opts);
  }
  /** geometry tilted about its own x axis then yawed into the world (leaning ladders etc.) */
  add(mat, geo, l, tilt, opts = {}) {
    const [x, z] = this.w(l[0], l[2]);
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (this.q * Math.PI) / 2);
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), tilt));
    this.kit.add(mat, geo, { pos: [x, l[1], z], quat: q, ...opts });
  }
  collider(lmin, lmax, tag) {
    const [ax, az] = this.w(lmin[0], lmin[2]);
    const [bx, bz] = this.w(lmax[0], lmax[2]);
    this.kit.collider([Math.min(ax, bx), lmin[1], Math.min(az, bz)], [Math.max(ax, bx), lmax[1], Math.max(az, bz)], tag);
  }
  /** contact shadow under a prop footprint (local centre + size; grown 0.5 m beyond it by contactShadow) */
  shadow(lx, lz, sx, sz, grow) {
    const [x, z] = this.w(lx, lz);
    const [ex, ez] = this.ext(sx, sz);
    contactShadow(this.kit, x, z, ex, ez, grow);
  }
}

const F = FLOOR;
const CRATE_TEXT = ["CAUTION", "DECK 4", "SEALED", "FUEL", "KEEP CLEAR"];
let crateSeq = 0;

/**
 * Cargo crate (s m cube) whose skids stand at `base`: painted-panel body, recessed dark side panels split
 * by a steel mid band, steel corner posts with caps, a proud dark lid with a steel rim plate, two latch
 * plates on the front and back faces, a stencil on the front (every crate gets one; the text cycles when
 * none is given).
 */
function crateAt(P, lx, lz, s, tone, base, text) {
  const color = tone === "dark" ? P.P.impDark : tone === "grey" ? P.P.impGrey : P.P.impMid;
  const cy = base + 0.08 + s / 2, top = base + 0.08 + s;
  P.box("impPanel", color, lx, cy, lz, s, s, s, { texel: 1 });
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const w = s * 0.72, h = s * 0.32;
    for (const vy of [-s * 0.24, s * 0.24]) P.box("paintedMetal", P.P.impBlack, lx + dx * (s / 2 + 0.01), cy + vy, lz + dz * (s / 2 + 0.01), dx ? 0.02 : w, h, dz ? 0.02 : w, { texel: 1 });
  }
  for (const d of [-1, 1]) P.box("metal", HG.gunmetal, lx + d * s * 0.35, base + 0.04, lz, 0.12, 0.08, s * 0.9);
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
    P.box("metal", HG.gunmetal, lx + (dx * s) / 2, cy, lz + (dz * s) / 2, 0.09, s + 0.02, 0.09);
    P.box("metal", HG.steel, lx + dx * (s / 2 - 0.03), top + 0.07, lz + dz * (s / 2 - 0.03), 0.17, 0.14, 0.17);
  }
  P.box("metal", HG.gunmetal, lx, cy, lz, s + 0.03, 0.06, s + 0.03);
  // lid: proud slab, steel rim plate, a dark grip recess across the middle
  P.box("paintedMetal", P.P.impDark, lx, top + 0.05, lz, s - 0.12, 0.1, s - 0.12, { texel: 1 });
  P.box("metal", HG.steel, lx, top + 0.11, lz, s - 0.3, 0.02, s - 0.3);
  P.box("paintedMetal", P.P.impBlack, lx, top + 0.125, lz, s * 0.3, 0.01, 0.08, { texel: 1 });
  // latch plates (steel with a dark keeper slot) under the top edge of the front and back faces
  for (const dz of [-1, 1]) {
    for (const dx of [-0.3, 0.3]) {
      P.box("metal", HG.steel, lx + dx * s, top - 0.16, lz + dz * (s / 2 + 0.02), 0.14, 0.2, 0.04);
      P.box("paintedMetal", P.P.impBlack, lx + dx * s, top - 0.18, lz + dz * (s / 2 + 0.045), 0.06, 0.08, 0.01, { texel: 1 });
    }
  }
  const txt = text || CRATE_TEXT[crateSeq++ % CRATE_TEXT.length];
  P.label("hgDecal", txt, [lx, cy - s * 0.24, lz - s / 2 - 0.03], [0, 0, -1], s * 0.5, { color: HG.white });
}

/** crate on the deck; `level` stacks it on a same-size crate below (skids resting on its corner caps) */
function crate(P, lx, lz, s = 1.2, tone = "mid", level = 0, text = null) {
  crateAt(P, lx, lz, s, tone, F + level * (s + 0.22), text);
  if (level === 0) P.shadow(lx, lz, s, s, 0.55);
}

/** deck tug: low cab with a canopy, four wheels, headlights, beacon, tow hitch at +lz */
function tug(P, lx, lz) {
  P.shadow(lx, lz, 2.4, 3.8);
  P.box("paintedMetal", HG.yellow, lx, F + 0.75, lz, 2.2, 0.7, 3.6, { texel: 0.5 });
  P.box("paintedMetal", P.P.impDark, lx, F + 0.42, lz, 2.3, 0.14, 3.7, { texel: 1 });
  for (const dx of [-1.0, 1.0]) for (const dz of [-1.2, 1.2]) {
    P.cyl("rubber", HG.rubber, lx + dx, F + 0.42, lz + dz, 0.42, 0.34, "x", { segments: 14 });
    P.cyl("metal", HG.steel, lx + dx, F + 0.42, lz + dz, 0.2, 0.36, "x", { segments: 10 });
  }
  // cab: seat well, canopy on four posts, control column
  P.box("paintedMetal", P.P.impBlack, lx, F + 1.25, lz - 0.6, 1.6, 0.3, 1.6, { texel: 1 });
  P.box("paintedMetal", P.P.impMid, lx, F + 1.55, lz - 1.2, 1.4, 0.5, 0.35, { texel: 1 });
  P.box("darkGloss", 0x101214, lx, F + 1.75, lz - 1.0, 1.3, 0.12, 0.08);
  for (const dx of [-0.9, 0.9]) for (const dz of [-1.4, 0.3]) P.box("metal", HG.gunmetal, lx + dx, F + 1.95, lz + dz, 0.07, 1.7, 0.07);
  P.box("paintedMetal", P.P.impDark, lx, F + 2.82, lz - 0.55, 2.0, 0.08, 2.0, { texel: 1 });
  P.box("emitAmber", 0xffffff, lx, F + 2.98, lz - 0.55, 0.22, 0.24, 0.22);
  for (const dx of [-0.8, 0.8]) P.box("emitWhite", 0xffffff, lx + dx, F + 0.9, lz - 1.81, 0.3, 0.14, 0.02);
  for (const dx of [-0.8, 0.8]) P.box("emitRedImp", 0xffffff, lx + dx, F + 0.9, lz + 1.81, 0.24, 0.1, 0.02);
  P.box("metal", HG.gunmetal, lx, F + 0.55, lz + 2.0, 0.2, 0.2, 0.5);
  P.label("hgDecal", "DECK 4", [lx - 1.101, F + 0.85, lz], [-1, 0, 0], 1.6, { color: P.P.impBlack });
  P.label("hgDecal", "DECK 4", [lx + 1.101, F + 0.85, lz], [1, 0, 0], 1.6, { color: P.P.impBlack });
}

/** flatbed trailer (4.4 x 2.4) on four wheels with a draw bar toward -lz and a load of crates */
function trailer(P, lx, lz, load = "crates") {
  P.shadow(lx, lz, 2.6, 5.4);
  P.box("paintedMetal", P.P.impDark, lx, F + 0.72, lz, 2.4, 0.16, 4.4, { texel: 0.5 });
  P.box("hazard", 0xffffff, lx, F + 0.72, lz + 2.21, 2.4, 0.17, 0.02, { texel: 1 });
  for (const dx of [-1.1, 1.1]) for (const dz of [-1.4, 1.4]) {
    P.cyl("rubber", HG.rubber, lx + dx, F + 0.4, lz + dz, 0.4, 0.3, "x", { segments: 14 });
    P.cyl("metal", HG.steel, lx + dx, F + 0.4, lz + dz, 0.18, 0.32, "x", { segments: 10 });
  }
  P.tube("metal", HG.gunmetal, [lx, F + 0.66, lz - 2.2], [lx, F + 0.62, lz - 3.1], 0.06, { segments: 8 });
  for (const dx of [-1.15, 1.15]) P.box("metal", HG.gunmetal, lx + dx, F + 1.0, lz, 0.06, 0.4, 4.3);
  if (load === "crates") {
    // crates ride on the bed (top at 0.8 m)
    const bed = 0.8;
    crateOn(P, lx - 0.55, lz - 1.0, 1.1, "mid", bed, "CAUTION");
    crateOn(P, lx + 0.6, lz - 1.0, 1.0, "grey", bed);
    crateOn(P, lx, lz + 1.1, 1.3, "dark", bed, "DECK 4");
  } else {
    // a horizontal tank
    P.kcyl("paintedMetal", P.P.impGrey, lx, F + 1.7, lz, 0.85, 3.8, "z", { segments: 18, texel: 0.5 });
    for (const dz of [-1.6, 1.6]) P.cyl("metal", HG.gunmetal, lx, F + 1.7, lz + dz, 0.7, 0.16, "z", { segments: 18 });
    for (const dz of [-1.2, 1.2]) P.box("metal", HG.gunmetal, lx, F + 1.0, lz + dz, 1.8, 0.4, 0.2);
    P.kcyl("hazard", 0xffffff, lx, F + 1.7, lz, 0.865, 0.3, "z", { segments: 18, texel: 1 });
    P.label("hgDecal", "FUEL", [lx - 0.855, F + 1.75, lz + 1.0], [-1, 0, 0], 1.2, { color: HG.red });
    P.label("hgDecal", "FUEL", [lx + 0.855, F + 1.75, lz + 1.0], [1, 0, 0], 1.2, { color: HG.red });
  }
}

/** crate whose skids sit `lift` above the deck (trailer loads) */
function crateOn(P, lx, lz, s, tone, lift, text = null) {
  crateAt(P, lx, lz, s, tone, F + lift - 0.08, text);
}

/** tug + two trailers in a train along +lz (tug at the -lz end) */
function train(P, lx, lz) {
  tug(P, lx, lz);
  trailer(P, lx, lz + 5.4, "crates");
  trailer(P, lx, lz + 10.6, "tank");
}

/**
 * tall rolling maintenance gantry: 6 x 3 m castored base, four 8 m columns with cross bracing, a top
 * work platform with rails at 7 m, an intermediate platform at 3.5 m, a caged ladder, work lamps
 */
function tallGantry(P, lx, lz) {
  const W = 6, D = 3, Ht = 7.0;
  P.shadow(lx, lz, W, D, 0.7);
  P.box("paintedMetal", P.P.impDark, lx, F + 0.35, lz, W, 0.25, D, { texel: 0.5 });
  for (const dx of [-W / 2 + 0.4, W / 2 - 0.4]) for (const dz of [-D / 2 + 0.3, D / 2 - 0.3]) {
    P.cyl("rubber", HG.rubber, lx + dx, F + 0.22, lz + dz, 0.22, 0.2, "x", { segments: 12 });
    P.box("metal", HG.gunmetal, lx + dx, F + 0.4, lz + dz, 0.4, 0.14, 0.4);
  }
  for (const dz of [-D / 2, D / 2]) P.box("hazard", 0xffffff, lx, F + 0.35, lz + dz, W + 0.02, 0.26, 0.03, { texel: 1 });
  for (const dx of [-W / 2 + 0.15, W / 2 - 0.15]) for (const dz of [-D / 2 + 0.15, D / 2 - 0.15]) P.box("paintedMetal", P.P.impMid, lx + dx, F + 0.47 + (Ht + 0.6) / 2, lz + dz, 0.22, Ht + 0.6, 0.22, { texel: 0.5 });
  // cross bracing on the long faces, two bays
  for (const dz of [-D / 2 + 0.15, D / 2 - 0.15]) {
    for (const [y0, y1] of [[0.6, 3.3], [3.8, 6.6]]) {
      P.tube("metal", HG.steel, [lx - W / 2 + 0.2, F + y0, lz + dz], [lx + W / 2 - 0.2, F + y1, lz + dz], 0.04, { segments: 6 });
      P.tube("metal", HG.steel, [lx - W / 2 + 0.2, F + y1, lz + dz], [lx + W / 2 - 0.2, F + y0, lz + dz], 0.04, { segments: 6 });
    }
  }
  for (const dx of [-W / 2 + 0.15, W / 2 - 0.15]) for (const y of [3.5, 7.0]) P.box("paintedMetal", P.P.impMid, lx + dx, F + y - 0.15, lz, 0.22, 0.3, D - 0.3, { texel: 0.5 });
  // platforms + rails (top: three sides; mid: outer side only)
  for (const [y, full] of [[3.5, false], [Ht, true]]) {
    P.box("grate", 0xffffff, lx, F + y - 0.05, lz, W - 0.5, 0.1, D - 0.5, { texel: 0.8 });
    const c = (a, b) => P.w(a, b);
    const yy = F + y;
    const p0 = c(lx - W / 2 + 0.3, lz - D / 2 + 0.3), p1 = c(lx + W / 2 - 0.3, lz - D / 2 + 0.3), p2 = c(lx + W / 2 - 0.3, lz + D / 2 - 0.3), p3 = c(lx - W / 2 + 0.3, lz + D / 2 - 0.3);
    railRun(P.B, P.kit, p0, p1, yy, { collide: false, postEvery: 1.5 });
    if (full) {
      railRun(P.B, P.kit, p1, p2, yy, { collide: false, postEvery: 1.5 });
      railRun(P.B, P.kit, p3, p0, yy, { collide: false, postEvery: 1.5 });
    }
  }
  // caged ladder on the +lz face, work lamps under the top platform
  const [wx, wz] = P.w(lx - 1.0, lz + D / 2);
  const [nx, nz] = P.dir(0, 1);
  ladderLite(P, wx, wz, nx, nz, F + 0.5, F + Ht);
  for (const dx of [-1.8, 1.8]) P.box("emitWhite", 0xffffff, lx + dx, F + Ht - 0.14, lz, 0.7, 0.06, 0.3);
  for (const dx of [-1.8, 1.8]) P.box("paintedMetal", P.P.impDark, lx + dx, F + Ht - 0.13, lz, 0.8, 0.1, 0.4, { texel: 1 });
  P.box("emitAmber", 0xffffff, lx + W / 2 - 0.15, F + Ht + 1.35, lz - D / 2 + 0.15, 0.2, 0.3, 0.2);
  P.label("hgDecal", "CAUTION", [lx, F + 1.6, lz - D / 2 - 0.16], [0, 0, -1], 2.4, { color: HG.yellow });
}

/** plain ladder (no cage) standing off a face with normal (nx, nz), in world coordinates */
function ladderLite(P, x, z, nx, nz, y0, y1) {
  const h = y1 - y0;
  const ox = nx * 0.2, oz = nz * 0.2;
  const along = Math.abs(nx) > 0.5 ? [0, 0.25] : [0.25, 0];
  for (const s of [-1, 1]) P.B.box("metal", HG.gunmetal, x + ox + s * along[0], (y0 + y1) / 2, z + oz + s * along[1], 0.05, h, 0.05);
  for (let y = y0 + 0.3; y < y1; y += 0.3) P.B.box("metal", HG.steel, x + ox, y, z + oz, Math.abs(nx) > 0.5 ? 0.03 : 0.5, 0.03, Math.abs(nx) > 0.5 ? 0.5 : 0.03);
}

function drum(P, lx, lz, color) {
  P.shadow(lx, lz, 0.6, 0.6, 0.4);
  P.kcyl("paintedMetal", color, lx, F + 0.45, lz, 0.3, 0.9, "y", { segments: 14, texel: 1 });
  for (const y of [0.28, 0.62]) P.cyl("metal", HG.steel, lx, F + y, lz, 0.315, 0.05, "y", { segments: 14 });
}

/**
 * tool cart: red drawer cabinet on a dark chassis with four visible castors, four drawer fronts with
 * steel pulls, a rubber mat top carrying a tray and a toolbox, a push handle at +lx and a hose reel on
 * the -lx end with its hose trailing onto the deck
 */
function toolCart(P, lx, lz) {
  P.shadow(lx - 0.1, lz, 1.9, 0.7);
  P.box("paintedMetal", P.P.impBlack, lx, F + 0.21, lz, 1.04, 0.06, 0.54, { texel: 1 });
  for (const dx of [-0.4, 0.4]) for (const dz of [-0.2, 0.2]) {
    P.cyl("rubber", HG.rubber, lx + dx, F + 0.11, lz + dz, 0.11, 0.07, "x", { segments: 10 });
    P.box("metal", HG.gunmetal, lx + dx, F + 0.17, lz + dz, 0.05, 0.14, 0.1);
  }
  P.box("paintedMetal", HG.red, lx, F + 0.63, lz, 1.1, 0.78, 0.6, { texel: 1 });
  for (let i = 0; i < 4; i++) {
    const y = F + 0.33 + i * 0.17;
    P.box("paintedMetal", P.P.impMid, lx, y, lz - 0.31, 1.0, 0.13, 0.02, { texel: 1 });
    P.box("metal", HG.steel, lx, y, lz - 0.335, 0.34, 0.03, 0.03);
  }
  P.box("metal", HG.gunmetal, lx, F + 1.03, lz, 1.14, 0.04, 0.64);
  P.box("rubber", HG.rubber, lx, F + 1.06, lz, 1.06, 0.02, 0.56);
  P.box("metal", HG.steel, lx - 0.25, F + 1.11, lz + 0.05, 0.4, 0.08, 0.25);
  P.box("paintedMetal", P.P.impDark, lx + 0.25, F + 1.14, lz - 0.1, 0.3, 0.14, 0.2, { texel: 1 });
  P.box("metal", HG.steel, lx + 0.25, F + 1.22, lz - 0.1, 0.12, 0.02, 0.04);
  // push handle: two uprights and a cross bar with a rubber grip
  for (const dz of [-0.24, 0.24]) P.tube("metal", HG.steel, [lx + 0.6, F + 0.45, lz + dz], [lx + 0.6, F + 1.12, lz + dz], 0.02, { segments: 8 });
  P.tube("metal", HG.steel, [lx + 0.6, F + 1.12, lz - 0.26], [lx + 0.6, F + 1.12, lz + 0.26], 0.025, { segments: 8 });
  P.box("rubber", HG.rubber, lx + 0.6, F + 1.12, lz, 0.07, 0.07, 0.3);
  // hose reel on the -lx end (axis along lx): two flanges, the hose wound between, bracket, hose to the deck
  P.box("metal", HG.gunmetal, lx - 0.6, F + 0.72, lz, 0.1, 0.06, 0.5);
  for (const dx of [-0.64, -0.82]) P.cyl("metal", HG.gunmetal, lx + dx, F + 0.72, lz, 0.22, 0.04, "x", { segments: 14 });
  P.cyl("rubber", HG.rubber, lx - 0.73, F + 0.72, lz, 0.17, 0.15, "x", { segments: 12 });
  P.cyl("metal", HG.steel, lx - 0.73, F + 0.72, lz, 0.03, 0.3, "x", { segments: 8 });
  P.tube("rubber", HG.rubber, [lx - 0.76, F + 0.56, lz + 0.12], [lx - 1.15, F + 0.05, lz + 0.45], 0.03, { segments: 8 });
}

/** ground power unit: dark cabinet on wheels, vents, indicator panel, a heavy cable on the deck */
function gpu(P, lx, lz, cableTo = null) {
  P.shadow(lx, lz, 1.6, 1.0);
  P.box("paintedMetal", P.P.impDark, lx, F + 0.77, lz, 1.5, 0.9, 0.95, { texel: 1 });
  for (const dx of [-0.55, 0.55]) for (const dz of [-0.38, 0.38]) P.cyl("metal", HG.gunmetal, lx + dx, F + 0.2, lz + dz, 0.2, 0.14, "x", { segments: 10 });
  for (let i = 0; i < 3; i++) P.box("paintedMetal", P.P.impBlack, lx + 0.76, F + 0.55 + i * 0.2, lz, 0.02, 0.1, 0.7, { texel: 1 });
  P.box("paintedMetal", P.P.impBlack, lx, F + 1.0, lz - 0.485, 0.6, 0.32, 0.02, { texel: 1 });
  P.box("emitBlue", 0xffffff, lx - 0.18, F + 1.05, lz - 0.5, 0.06, 0.06, 0.02);
  P.box("emitGreen", 0xffffff, lx - 0.06, F + 1.05, lz - 0.5, 0.06, 0.06, 0.02);
  P.box("emitAmber", 0xffffff, lx + 0.12, F + 0.93, lz - 0.5, 0.2, 0.04, 0.02);
  P.cyl("metal", HG.gunmetal, lx - 0.45, F + 1.4, lz + 0.2, 0.09, 0.36, "y", { segments: 10 });
  P.tube("metal", HG.steel, [lx - 0.75, F + 0.5, lz], [lx - 0.75, F + 1.05, lz], 0.025, { segments: 8 });
  if (cableTo) {
    P.tube("rubber", HG.rubber, [lx + 0.5, F + 0.6, lz + 0.48], [lx + 0.5, F + 0.06, lz + 1.1], 0.05, { segments: 8 });
    P.tube("rubber", HG.rubber, [lx + 0.5, F + 0.06, lz + 1.1], [cableTo[0], F + 0.06, cableTo[1]], 0.05, { segments: 8 });
  }
}

/** fuel bowser: tank trailer with pump cabinet, hose reel, beacon and tow bar (long axis local z) */
function bowser(P, lx, lz) {
  P.shadow(lx, lz - 0.2, 2.6, 5.6);
  P.box("paintedMetal", P.P.impDark, lx, F + 0.68, lz, 2.0, 0.25, 4.4, { texel: 0.5 });
  for (const dx of [-1.05, 1.05]) for (const dz of [-1.45, 1.45]) {
    P.cyl("rubber", HG.rubber, lx + dx, F + 0.45, lz + dz, 0.45, 0.34, "x", { segments: 16 });
    P.cyl("metal", HG.steel, lx + dx, F + 0.45, lz + dz, 0.2, 0.38, "x", { segments: 10 });
  }
  // mid-grey tank (the forward port bowser stands in the crane's work-light pool: a light-grey tank there clipped to white)
  P.kcyl("paintedMetal", P.P.impMid, lx, F + 1.75, lz - 0.3, 0.95, 3.4, "z", { segments: 20, texel: 0.5 });
  for (const dz of [-2.05, 1.45]) P.cyl("metal", HG.gunmetal, lx, F + 1.75, lz + dz, 0.8, 0.14, "z", { segments: 20 });
  P.kcyl("hazard", 0xffffff, lx, F + 1.75, lz + 0.6, 0.965, 0.3, "z", { segments: 20, texel: 1 });
  for (const dx of [-0.92, 0.92]) for (const dz of [-1.2, 0.6]) P.box("metal", HG.gunmetal, lx + dx, F + 1.25, lz + dz, 0.12, 0.9, 0.16);
  P.cyl("metal", HG.gunmetal, lx, F + 2.72, lz - 0.3, 0.3, 0.24, "y", { segments: 14 });
  P.box("paintedMetal", P.P.impMid, lx, F + 1.36, lz + 2.0, 1.6, 1.1, 0.8, { texel: 1 });
  P.box("paintedMetal", P.P.impBlack, lx - 0.3, F + 1.4, lz + 2.41, 0.7, 0.5, 0.02, { texel: 1 });
  P.box("emitGreen", 0xffffff, lx - 0.5, F + 1.55, lz + 2.425, 0.06, 0.06, 0.02);
  P.box("emitRedImp", 0xffffff, lx - 0.38, F + 1.55, lz + 2.425, 0.06, 0.06, 0.02);
  P.box("screenImp1", 0xffffff, lx - 0.2, F + 1.32, lz + 2.425, 0.4, 0.22, 0.02, { fit: true });
  P.cyl("metal", HG.gunmetal, lx + 0.4, F + 2.25, lz + 2.0, 0.34, 0.3, "x", { segments: 16 });
  P.cyl("rubber", HG.rubber, lx + 0.4, F + 2.25, lz + 2.0, 0.28, 0.34, "x", { segments: 16 });
  P.box("metal", HG.gunmetal, lx + 0.4, F + 2.05, lz + 2.0, 0.08, 0.3, 0.4);
  P.box("metal", HG.gunmetal, lx - 0.5, F + 2.05, lz + 2.0, 0.08, 0.3, 0.08);
  P.box("emitAmber", 0xffffff, lx - 0.5, F + 2.3, lz + 2.0, 0.18, 0.2, 0.18);
  P.tube("metal", HG.steel, [lx, F + 0.62, lz - 2.2], [lx, F + 0.45, lz - 3.0], 0.05, { segments: 8 });
  P.cyl("metal", HG.gunmetal, lx, F + 0.16, lz - 3.0, 0.16, 0.12, "x", { segments: 10 });
  P.tube("metal", HG.steel, [lx, F + 0.45, lz - 3.0], [lx, F + 0.16, lz - 3.0], 0.03, { segments: 6 });
  P.label("hgDecal", "FUEL", [lx - 0.965, F + 1.85, lz - 0.3], [-1, 0, 0], 1.6, { color: HG.red });
  P.label("hgDecal", "FUEL", [lx + 0.965, F + 1.85, lz - 0.3], [1, 0, 0], 1.6, { color: HG.red });
}

function cableReel(P, lx, lz) {
  P.shadow(lx, lz, 1.6, 1.6);
  for (const dx of [-0.42, 0.42]) P.cyl("metal", HG.gunmetal, lx + dx, F + 0.95, lz, 0.75, 0.06, "x", { segments: 18 });
  P.cyl("rubber", HG.rubber, lx, F + 0.95, lz, 0.45, 0.8, "x", { segments: 16 });
  P.cyl("metal", HG.steel, lx, F + 0.95, lz, 0.05, 1.3, "x", { segments: 8 });
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) P.tube("metal", HG.gunmetal, [lx + dx * 0.6, F + 0.93, lz], [lx + dx * 0.72, F + 0.03, lz + dz * 0.55], 0.04, { segments: 8 });
  for (const dx of [-0.72, 0.72]) P.box("metal", HG.gunmetal, lx + dx, F + 0.03, lz, 0.14, 0.06, 1.3);
  P.tube("rubber", HG.rubber, [lx, F + 0.5, lz + 0.6], [lx, F + 0.05, lz + 1.8], 0.045, { segments: 8 });
}

/** mobile access platform: castored base, four posts, braces, grate at 2.9 m, rails, end ladder */
function accessPlatform(P, lx, lz) {
  P.shadow(lx, lz, 1.8, 2.6);
  P.box("paintedMetal", P.P.impDark, lx, F + 0.28, lz, 1.6, 0.12, 2.4, { texel: 0.5 });
  for (const dx of [-0.65, 0.65]) for (const dz of [-1.05, 1.05]) P.cyl("metal", HG.gunmetal, lx + dx, F + 0.11, lz + dz, 0.11, 0.08, "x", { segments: 10 });
  for (const dz of [-1.2, 1.2]) P.box("hazard", 0xffffff, lx, F + 0.28, lz + dz, 1.62, 0.13, 0.03, { texel: 1 });
  for (const dx of [-0.72, 0.72]) for (const dz of [-1.12, 1.12]) P.box("metal", HG.gunmetal, lx + dx, F + 1.84, lz + dz, 0.08, 3.0, 0.08);
  for (const dx of [-0.72, 0.72]) {
    P.tube("metal", HG.steel, [lx + dx, F + 0.4, lz - 1.1], [lx + dx, F + 2.8, lz + 1.1], 0.025, { segments: 6 });
    P.tube("metal", HG.steel, [lx + dx, F + 2.8, lz - 1.1], [lx + dx, F + 0.4, lz + 1.1], 0.025, { segments: 6 });
  }
  P.box("grate", 0xffffff, lx, F + 2.95, lz, 1.6, 0.1, 2.4, { texel: 0.8 });
  const y = F + 3.0;
  const [a, b] = P.w(lx - 0.76, lz - 1.16), [c, d] = P.w(lx + 0.76, lz - 1.16), [e, f] = P.w(lx + 0.76, lz + 1.16), [g, h] = P.w(lx - 0.76, lz + 1.16);
  railRun(P.B, P.kit, [a, b], [c, d], y, { collide: false, postEvery: 1.6 });
  railRun(P.B, P.kit, [c, d], [e, f], y, { collide: false, postEvery: 1.6 });
  railRun(P.B, P.kit, [g, h], [a, b], y, { collide: false, postEvery: 1.6 });
  // end ladder on the +lz face
  for (const dx of [-0.3, 0.3]) P.box("metal", HG.gunmetal, lx + dx, F + 1.7, lz + 1.32, 0.05, 2.7, 0.05);
  for (let yy = 0.6; yy < 3.0; yy += 0.3) P.box("metal", HG.steel, lx, F + yy, lz + 1.32, 0.6, 0.03, 0.03);
  P.box("emitWhite", 0xffffff, lx, F + 2.88, lz - 0.4, 0.5, 0.04, 0.2);
  P.box("paintedMetal", HG.red, lx + 0.4, F + 3.15, lz + 0.6, 0.5, 0.3, 0.3, { texel: 1 });
}

/** maintenance ladder with its foot at (lx, lz), leaning 14 deg toward -lz (its top lands 0.63 m back) */
function leanLadder(P, lx, lz, h = 2.6) {
  const g = new Batch();
  for (const dx of [-0.22, 0.22]) g.box(dx, h / 2, 0, 0.05, h, 0.04);
  for (let y = 0.3; y < h; y += 0.3) g.box(0, y, 0, 0.44, 0.03, 0.03);
  P.add("metal", g.geometry(), [lx, F, lz], -0.245, { color: HG.gunmetal, uv: "keep" });
}

// cluster definitions: [x, z, quarter turn, builder, local collider min/max]
function clusters(s) {
  const q0 = s > 0 ? 0 : 2;
  return [
    // under the racks, forward end (z 27..33): bowser + power cart + crates
    { x: s * 64, z: 30, q: q0, cmin: [-3.2, -3.3], cmax: [3.6, 3.3], f(P) { bowser(P, -1.7, 0.2); gpu(P, 1.8, -1.9, [3.3, 2.4]); crate(P, 1.7, 1.3, 1.2, "mid", 0, "CAUTION"); crate(P, 1.7, 1.3, 1.2, "dark", 1); crate(P, 3.0, 1.4, 1.0, "grey"); } },
    // under the racks, middle (z 60..64): crate stack + tool carts + drums
    { x: s * 66, z: 62, q: q0 + 1, cmin: [-3.4, -2.2], cmax: [3.4, 2.4], f(P) { crate(P, -2.2, 0.3); crate(P, -2.2, 0.3, 1.2, "dark", 1); crate(P, -0.9, 0.3, 1.2, "grey", 0, "DECK 4"); crate(P, -2.2, -1.0, 1.0, "mid"); toolCart(P, 1.0, -0.6); drum(P, 2.4, 0.4, HG.red); drum(P, 2.4, -0.4, P.P.impGrey); drum(P, 3.0, 0.0, P.P.impGrey); leanLadder(P, -2.2, 1.56); } },
    // under the racks, aft end (z 85..91): access platform + cable reel + crates
    { x: s * 65, z: 88, q: q0, cmin: [-3.6, -3.0], cmax: [3.4, 3.0], f(P) { accessPlatform(P, -2.2, 0); cableReel(P, 1.2, -1.6); crate(P, 1.6, 1.4, 1.2, "dark", 0, "FUEL"); crate(P, 2.8, 1.5, 1.0, "mid"); gpu(P, 2.6, -1.2); } },
    // bow wall corner (behind pad 05/06): crates + drums
    { x: s * 45, z: -64, q: q0 + 3, cmin: [-2.8, -2.4], cmax: [2.8, 2.4], f(P) { crate(P, -1.6, 0, 1.2, "mid", 0, "CAUTION"); crate(P, -0.3, 0, 1.2, "dark"); crate(P, -0.3, 0, 1.2, "mid", 1); crate(P, -1.6, 1.3, 1.0, "grey"); drum(P, 1.4, -0.6, HG.red); drum(P, 1.4, 0.3, HG.red); toolCart(P, 2.2, 1.0); } },
    // hall-scale props: a tug + trailer train parked across the aft apron between the pad rows (port
    // side only, heading +x), tall rolling gantries on both aprons
    ...(s < 0 ? [{ x: -22, z: 130, q: 1, cmin: [-1.6, -4.2], cmax: [1.6, 11.0], f(P) { train(P, 0, -2.0); } }] : []),
    { x: s * 44, z: 112, q: q0 + 1, cmin: [-3.2, -1.7], cmax: [3.2, 1.7], f(P) { tallGantry(P, 0, 0); } },
    { x: s * 40, z: -38, q: q0 + 1, cmin: [-3.2, -1.7], cmax: [3.2, 1.7], f(P) { tallGantry(P, 0, 0); } },
    // aft apron, forward of the cargo/repair doors (z 98..108): bowser + crates
    { x: s * 66, z: 103, q: q0, cmin: [-3.2, -3.4], cmax: [3.2, 3.4], f(P) { bowser(P, 1.2, 0.3); crate(P, -1.6, -1.6, 1.2, "grey", 0, "FUEL"); crate(P, -1.6, -0.3, 1.2, "dark"); crate(P, -1.6, -0.3, 1.2, "mid", 1); drum(P, -1.8, 1.4, P.P.impGrey); drum(P, -1.0, 1.6, P.P.impGrey); } },
    // aft apron, aft of the doors (z 134..146): access platform + power cart + tool cart
    { x: s * 66, z: 140, q: q0 + 2, cmin: [-3.4, -3.2], cmax: [3.4, 3.2], f(P) { accessPlatform(P, 1.8, -0.4); gpu(P, -1.6, 1.4, [-3.0, 2.8]); toolCart(P, -1.6, -1.4); crate(P, -0.2, -1.6, 1.0, "mid"); cableReel(P, -1.0, 0.0); } },
    // aft wall corner (z 156..164)
    { x: s * 60, z: 160, q: q0 + 1, cmin: [-3.0, -2.2], cmax: [3.0, 2.2], f(P) { crate(P, -1.8, 0); crate(P, -0.5, 0, 1.2, "dark", 0, "DECK 4"); crate(P, -1.8, 0, 1.2, "grey", 1); crate(P, 1.2, -0.4, 1.0, "mid"); drum(P, 2.4, 0.6, HG.red); leanLadder(P, -1.8, 1.26); } },
    // ahead of the spawn, either side of the aft door approach (z 147..152): close-range scale references
    { x: s * 8.5, z: 149.5, q: s > 0 ? 3 : 1, cmin: [-2.6, -1.6], cmax: [2.6, 1.6], f(P) { if (s > 0) { gpu(P, -0.9, 0, [0.4, -1.5]); drum(P, 1.3, -0.5, HG.red); drum(P, 1.3, 0.4, P.P.impGrey); crate(P, 2.2, 0.2, 1.0, "mid"); } else { toolCart(P, -1.4, 0.3); crate(P, 0.3, 0, 1.2, "dark", 0, "CAUTION"); crate(P, 0.3, 0, 1.2, "mid", 1); crate(P, 1.6, 0.1, 1.0, "grey"); } } },
  ];
}

export function buildClutter(ctx) {
  const { kit } = ctx;
  const B = new Batcher(kit);
  for (const s of [-1, 1]) {
    for (const c of clusters(s)) {
      const P = new Placer(ctx, B, c.x, c.z, c.q);
      c.f(P);
      P.collider([c.cmin[0], FLOOR, c.cmin[1]], [c.cmax[0], FLOOR + 3.4, c.cmax[1]], "clutter");
    }
  }
  B.flush();
}
