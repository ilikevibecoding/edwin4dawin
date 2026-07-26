// Exterior dressing — owner: Fable 2 (map architecture / snowbound atmosphere).
// Entrance canopy + facade band, plaza furniture, trampled-snow trails,
// snowbound backdrop (conifer ring, distant buildings, parking lot, fence),
// east courtyard composition, and the garage-ramp exterior that the extraction
// shutter opens onto.
//
// Also repairs the builder's snow field: buildExterior emits one 220×190 m
// snow plane at y=-0.04 that spans the building footprint and caps both open
// stair shafts as a bright ceiling. We sink that plane below the basement and
// rebuild the snow field as a ring of planes with a hole under the building
// (and under the garage-ramp trench).

import * as THREE from 'three';
import * as MAP from './map.js';
import { aabb } from './worldRuntime.js';
import { Rng } from '../core/rng.js';
import { DetailBatch, recordDetailMeshes } from './archdetail.js';

export function buildExteriorDetail(world, group) {
  const batch = new DetailBatch();
  const rng = new Rng(20260221);
  fixSnowField(group, batch);
  buildEntrance(world, batch);
  buildPlazaFurniture(world, batch);
  buildTrails(batch);
  buildBackdrop(world, batch, rng);
  buildCourtyard(world, batch);
  buildGarageRamp(world, batch);
  recordDetailMeshes(batch.build(group));
}

// ---------------------------------------------------------------------------
// Snow-field repair. The builder's single giant plane is merged into the
// world 'snow' mesh; its 4 vertices are the only ones beyond |x-32| > 90, so
// we sink exactly those below the basement, then lay a non-overlapping ring.
// ---------------------------------------------------------------------------
function fixSnowField(group, batch) {
  for (const child of group.children) {
    if (!child.isMesh || child.material?.name !== 'snow') continue;
    const pos = child.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      if (Math.abs(pos.getX(i) - 32) > 90) pos.setY(i, -4.6);
    }
    pos.needsUpdate = true;
    child.geometry.computeBoundingSphere();
    child.geometry.computeBoundingBox();
  }
  // ring of ground planes (y=-0.03, tucked under the floor slabs), leaving
  // holes under the building interior and the garage-ramp trench
  const Y = -0.03;
  const rects = [
    [-78, -71, 142, 0.08],      // north field
    [-78, 55.9, 142, 119],      // south field
    [-78, 0.08, 0.08, 55.9],    // west field
    [63.92, 0.08, 142, 3.3],    // east field, north of the ramp trench
    [63.92, 12.7, 142, 55.9],   // east field, south of the ramp trench
    [80.6, 3.3, 142, 12.7],     // east field beyond the ramp crest
    [0.08, 44.08, 22.08, 55.9], // south-west notch (west of the plaza)
    [39.92, 44.08, 63.92, 55.9],// south-east notch (east of the plaza)
    // outdoor pockets inside the building's bounding box (the plan is not a
    // full rectangle): NW corner, west strip, stair_w notch
    [0.08, 0.08, 18.08, 10.08],
    [0.08, 10.08, 10.08, 30.08],
    [10.08, 10.08, 14.08, 16.08],
  ];
  for (const [x0, z0, x1, z1] of rects) {
    batch.plane('snow', (x0 + x1) / 2, Y, (z0 + z1) / 2, x1 - x0, z1 - z0, 'up');
  }
  // NW corner: the basement landing (b_landing_w) extends to z=8 while the
  // ground floor above starts at z=10 — cap that open-to-sky strip with a
  // snowed ground slab (reads as grade from outside, concrete from below).
  batch.box('concrete', 15.95, 0.03, 8.94, 4.3, 0.24, 2.4);
  batch.box('snow', 15.95, 0.19, 8.94, 4.2, 0.1, 2.3);
}

// ---------------------------------------------------------------------------
// Entrance composition: canopy over the vestibule doors, wall lamps, facade
// accent band. Facade outer face is z = 44.16.
// ---------------------------------------------------------------------------
function buildEntrance(world, batch) {
  const F = 44.16;
  // canopy: dark steel frame + panel + snow, on two posts
  batch.box('metal_dark', 31, 3.02, F + 1.25, 4.9, 0.1, 2.5);       // panel
  batch.box('metal_dark', 31, 3.11, F + 2.44, 4.9, 0.28, 0.12);     // front fascia
  batch.box('metal_dark', 28.62, 3.11, F + 1.25, 0.12, 0.28, 2.5);  // side fascias
  batch.box('metal_dark', 33.38, 3.11, F + 1.25, 0.12, 0.28, 2.5);
  batch.box('snow', 31, 3.13, F + 1.2, 4.7, 0.12, 2.3);             // snow load
  for (const px of [28.8, 33.2]) {
    batch.box('metal_dark', px, 1.51, F + 2.3, 0.12, 3.02, 0.12);   // posts
    world.addCollider(aabb(px - 0.08, 0, F + 2.22, px + 0.08, 3.0, F + 2.38,
      { kind: 'post', surface: 'metal' }));
  }
  // wall lamps beside the doors (warm) + glow pools on the snow
  for (const lx of [28.3, 33.7]) {
    batch.box('metal_dark', lx, 2.32, F + 0.08, 0.1, 0.34, 0.16);
    batch.box('@fix_warm', lx, 2.3, F + 0.14, 0.14, 0.22, 0.12);
    batch.disc('@glow', lx, 0.02, F + 0.7, 0.8);
  }
  // Northstar-blue accent band above the glazing line, south + east facades
  const BY = 3.1, BH = 0.32;
  batch.box('@accent_blue', 18, BY, F + 0.01, 8, BH, 0.07);         // waiting wing
  batch.box('@accent_blue', 45.5, BY, F + 0.01, 37, BH, 0.07);      // vestibule→exec
  batch.box('@accent_blue', 64.17, BY, 22, 0.07, BH, 44);           // east facade
}

// ---------------------------------------------------------------------------
// Plaza furniture (plaza x 22..40, z 44..56; spawn 31,51.5; trail x≈31).
// ---------------------------------------------------------------------------
function bench(world, batch, x, z, alongX = true) {
  const sx = alongX ? 1.7 : 0.55, sz = alongX ? 0.55 : 1.7;
  batch.box('wood_dark', x, 0.44, z, sx, 0.07, sz);                  // seat
  batch.box('wood_dark', x, 0.34, z, sx, 0.05, sz - 0.12);           // lower slat
  const lx = alongX ? 0.7 : 0, lz = alongX ? 0 : 0.7;
  batch.box('metal_dark', x - lx, 0.2, z - lz, alongX ? 0.08 : sx - 0.1, 0.4, alongX ? sz - 0.1 : 0.08);
  batch.box('metal_dark', x + lx, 0.2, z + lz, alongX ? 0.08 : sx - 0.1, 0.4, alongX ? sz - 0.1 : 0.08);
  batch.box('snow', x, 0.51, z, sx - 0.08, 0.07, sz - 0.08);         // snow cap
  world.addCollider(aabb(x - sx / 2, 0, z - sz / 2, x + sx / 2, 0.55, z + sz / 2,
    { kind: 'bench', surface: 'wood', blocksSight: false }));
}

function lampPost(world, batch, x, z) {
  batch.cyl('metal_dark', x, 2.1, z, 0.055, 0.075, 4.2, 8);
  batch.box('metal_dark', x, 4.25, z, 0.3, 0.14, 0.3);
  batch.box('@lamp_cool', x, 4.14, z, 0.24, 0.1, 0.24);
  batch.disc('@glow', x, 0.02, z, 1.3);
  world.addCollider(aabb(x - 0.09, 0, z - 0.09, x + 0.09, 4.3, z + 0.09,
    { kind: 'lamp', surface: 'metal', blocksSight: false }));
}

function planterBox(world, batch, x, z) {
  batch.box('concrete_dark', x, 0.26, z, 1.2, 0.52, 1.2);
  batch.box('snow', x, 0.55, z, 1.24, 0.08, 1.24);
  batch.cone('@tree_green', x - 0.2, 0.95, z - 0.15, 0.42, 0.9, 8);
  batch.cone('@tree_green', x + 0.28, 0.85, z + 0.24, 0.3, 0.62, 8);
  batch.cone('snow', x - 0.2, 1.28, z - 0.15, 0.24, 0.3, 8);
  world.addCollider(aabb(x - 0.62, 0, z - 0.62, x + 0.62, 0.6, z + 0.62,
    { kind: 'planter', surface: 'concrete' }));
}

function buildPlazaFurniture(world, batch) {
  bench(world, batch, 25.5, 47.2);
  bench(world, batch, 36.5, 47.2);
  // bike rack along the west planter: 4 hoops
  for (let i = 0; i < 4; i++) {
    const z = 51.6 + i * 0.9;
    batch.box('metal_brushed', 23.4, 0.42, z, 0.7, 0.07, 0.06);
    batch.box('metal_brushed', 23.1, 0.21, z, 0.07, 0.42, 0.06);
    batch.box('metal_brushed', 23.7, 0.21, z, 0.07, 0.42, 0.06);
  }
  world.addCollider(aabb(22.9, 0, 51.2, 23.9, 0.5, 54.7,
    { kind: 'rack', surface: 'metal', blocksSight: false }));
  // flagpole with a stylized Northstar flag
  batch.cyl('steel', 37.5, 3.6, 50.5, 0.05, 0.08, 7.2, 10);
  batch.box('fabric_blue', 38.2, 6.4, 50.5, 1.3, 0.85, 0.03);
  batch.box('@accent_blue', 37.62, 6.4, 50.5, 0.14, 0.9, 0.06); // hoist band
  world.addCollider(aabb(37.38, 0, 50.38, 37.62, 7.2, 50.62, { kind: 'pole', surface: 'metal', blocksSight: false }));
  // lamp posts flanking the trail
  lampPost(world, batch, 27.5, 52);
  lampPost(world, batch, 34.5, 52);
  // bollards lining the gate approach
  for (const [bx, bz] of [[29.2, 55.2], [32.8, 55.2], [29.2, 53.4], [32.8, 53.4]]) {
    batch.box('metal_dark', bx, 0.34, bz, 0.16, 0.68, 0.16);
    batch.box('snow', bx, 0.71, bz, 0.18, 0.07, 0.18);
    world.addCollider(aabb(bx - 0.09, 0, bz - 0.09, bx + 0.09, 0.72, bz + 0.09,
      { kind: 'bollard', surface: 'metal', blocksSight: false }));
  }
  // trash bin near the west bench
  batch.box('metal_painted', 23.6, 0.45, 45.6, 0.42, 0.9, 0.42);
  batch.box('plastic_dark', 23.6, 0.93, 45.6, 0.46, 0.07, 0.46);
  world.addCollider(aabb(23.38, 0, 45.38, 23.82, 0.97, 45.82, { kind: 'bin', surface: 'metal' }));
  // planter boxes with snowed shrubs
  planterBox(world, batch, 23.3, 49.3);
  planterBox(world, batch, 38.7, 49.3);
  // snow drifts piled against the facade between the porch and the windows
  batch.box('snow', 24.5, 0.16, 44.6, 4.6, 0.42, 0.9);
  batch.box('snow', 37.6, 0.2, 44.6, 4.0, 0.5, 0.9);
  batch.box('snow', 21.2, 0.3, 47, 1.4, 0.7, 5.5); // drift against west planter
}

// ---------------------------------------------------------------------------
// Trampled-snow trails (thin planes, polygon-offset material).
// ---------------------------------------------------------------------------
function buildTrails(batch) {
  batch.plane('@trample', 31, 0.012, 50.3, 1.7, 11.4, 'up');   // gate → canopy
  batch.plane('@trample', 31, 0.013, 44.9, 3.4, 1.6, 'up');    // splay at the doors
  batch.plane('@trample', 28.4, 0.012, 48.6, 0.9, 4.4, 'up');  // side path to bench/bikes
  batch.plane('@trample', 26.9, 0.0125, 47.3, 2.5, 0.9, 'up');
}

// ---------------------------------------------------------------------------
// Backdrop: conifer ring, distant silhouettes, north parking with snowed
// cars, perimeter fence. Solid items inside MAP bounds get colliders.
// ---------------------------------------------------------------------------
function conifer(batch, x, z, s = 1) {
  batch.cyl('wood_dark', x, 0.5 * s, z, 0.12 * s, 0.16 * s, 1.0 * s, 6);
  batch.cone('@tree_green', x, 2.0 * s, z, 1.55 * s, 2.6 * s, 8);
  batch.cone('@tree_green', x, 3.6 * s, z, 1.15 * s, 2.2 * s, 8);
  batch.cone('@tree_green', x, 4.9 * s, z, 0.75 * s, 1.7 * s, 8);
  batch.cone('snow', x, 5.75 * s, z, 0.42 * s, 0.75 * s, 8);
}

function car(world, batch, x, z) {
  batch.box('plastic_dark', x, 0.24, z, 1.7, 0.34, 4.1);        // skirt/wheel shadow
  batch.box('@car_paint', x, 0.62, z, 1.8, 0.5, 4.3);           // body
  batch.box('@car_paint', x, 1.08, z - 0.25, 1.62, 0.46, 2.3);  // cabin
  batch.box('plastic_dark', x, 1.1, z - 0.25, 1.66, 0.26, 2.34);// glass band
  batch.box('snow', x, 1.36, z - 0.25, 1.6, 0.12, 2.2);         // roof snow
  batch.box('snow', x, 0.92, z + 1.55, 1.7, 0.1, 1.1);          // hood snow
  world.addCollider(aabb(x - 0.9, 0, z - 2.15, x + 0.9, 1.4, z + 2.15,
    { kind: 'car', surface: 'metal' }));
}

function fenceRun(world, batch, x0, z0, x1, z1) {
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const len = alongX ? x1 - x0 : z1 - z0;
  const n = Math.max(1, Math.round(Math.abs(len) / 3));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    batch.box('metal_dark', x0 + (x1 - x0) * t, 0.9, z0 + (z1 - z0) * t, 0.08, 1.8, 0.08);
  }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  batch.box('metal_dark', cx, 1.72, cz, alongX ? Math.abs(len) : 0.05, 0.06, alongX ? 0.05 : Math.abs(len));
  batch.box('metal_dark', cx, 1.0, cz, alongX ? Math.abs(len) : 0.04, 0.05, alongX ? 0.04 : Math.abs(len));
  world.addCollider(aabb(Math.min(x0, x1) - 0.06, 0, Math.min(z0, z1) - 0.06,
    Math.max(x0, x1) + 0.06, 1.8, Math.max(z0, z1) + 0.06,
    { kind: 'fence', surface: 'metal', blocksSight: false }));
}

function buildBackdrop(world, batch, rng) {
  // conifer ring beyond the perimeter (kept outside the map-bounds colliders)
  const beltN = []; // [x, z, scale]
  for (let x = -20; x <= 76; x += 7) beltN.push([x + rng.range(-2, 2), -17 + rng.range(-4, 1), rng.range(0.85, 1.3)]);
  for (let x = -14; x <= 86; x += 9) beltN.push([x + rng.range(-2, 2), -26 + rng.range(-4, 3), rng.range(0.9, 1.45)]);
  for (let z = -8; z <= 56; z += 8) beltN.push([-18 + rng.range(-4, 1), z + rng.range(-2, 2), rng.range(0.85, 1.3)]);
  for (let z = 0; z <= 52; z += 9) beltN.push([-27 + rng.range(-4, 3), z + rng.range(-2, 2), rng.range(0.9, 1.4)]);
  for (let z = 20; z <= 60; z += 8) beltN.push([86 + rng.range(-2, 4), z + rng.range(-2, 2), rng.range(0.85, 1.3)]);
  for (let x = 0; x <= 76; x += 8) beltN.push([x + rng.range(-2, 2), 66 + rng.range(-1, 5), rng.range(0.85, 1.35)]);
  for (const [x, z, s] of beltN) conifer(batch, x, z, s);
  // a few conifers up the ramp exit for the extraction view (beyond x=80.6)
  conifer(batch, 86, 3, 1.15);
  conifer(batch, 89, 12.5, 1.3);
  conifer(batch, 93, 7, 1.0);
  // distant low-poly building silhouettes, dissolved in fog
  batch.box('@building_far', -46, 7, -38, 22, 14, 16);
  batch.box('@building_far', -30, 5, -44, 14, 10, 12);
  batch.box('@building_far', 88, 9, -34, 18, 18, 14);
  batch.box('@building_far', 108, 6, 26, 16, 12, 20);
  batch.box('@building_far', -52, 6, 58, 18, 12, 14);
  // parking area north of the building (seen from break/training windows)
  batch.box('concrete_dark', 43, -0.02, -8.5, 34, 0.08, 7); // plowed pad
  batch.plane('@trample', 43, 0.045, -8.5, 33, 6, 'up');
  for (const cx of [31, 36.4, 41.2, 46.6, 52]) car(world, batch, cx, -8.2);
  // perimeter chain-rail fence
  fenceRun(world, batch, -6, -4, 70, -4);            // north
  fenceRun(world, batch, -6, -4, -6, 58);            // west
  fenceRun(world, batch, -6, 58, 27, 58);            // south, west of the gate
  fenceRun(world, batch, 35, 58, 70, 58);            // south, east of the gate
  fenceRun(world, batch, 70, -4, 70, 3);             // east, north of the ramp
  fenceRun(world, batch, 70, 13, 70, 25);            // east, between ramp and courtyard
  fenceRun(world, batch, 78, 25, 78, 47);            // east, around the courtyard
  fenceRun(world, batch, 70, 47, 70, 58);            // east, south of the courtyard
}

// ---------------------------------------------------------------------------
// East courtyard (x 64..76, z 26..44) — seen from exec office / corridor.
// ---------------------------------------------------------------------------
function buildCourtyard(world, batch) {
  // one bare winter tree
  const tx = 71, tz = 30.5;
  batch.cyl('wood_dark', tx, 1.3, tz, 0.13, 0.2, 2.6, 7);
  for (const [dx, dz, ry, rz] of [[0.5, 0.2, 0.5, 0.7], [-0.55, -0.1, 2.4, -0.6], [0.1, -0.5, 4.2, 0.5], [-0.2, 0.55, 5.6, -0.5]]) {
    const g = new THREE.BoxGeometry(0.07, 1.5, 0.07);
    g.rotateZ(rz); g.rotateY(ry);
    g.translate(tx + dx, 3.05, tz + dz);
    batch.geo('wood_dark', g);
  }
  batch.box('snow', tx, 0.18, tz, 1.4, 0.14, 1.4); // snow ring at the base
  world.addCollider(aabb(tx - 0.22, 0, tz - 0.22, tx + 0.22, 2.6, tz + 0.22, { kind: 'tree', surface: 'wood' }));
  // benches facing the exec windows + planters
  bench(world, batch, 67.4, 34, false);
  bench(world, batch, 67.4, 38.6, false);
  planterBox(world, batch, 74.2, 28.5);
  planterBox(world, batch, 74.2, 42);
  // snowed star obelisk — Northstar motif landmark
  const ox = 70.5, oz = 39.5;
  batch.box('concrete_dark', ox, 0.3, oz, 1.1, 0.6, 1.1);       // plinth
  batch.box('snow', ox, 0.63, oz, 1.14, 0.1, 1.14);
  const shaft = new THREE.CylinderGeometry(0.16, 0.3, 2.6, 4);
  shaft.rotateY(Math.PI / 4);
  shaft.translate(ox, 1.9, oz);
  batch.geo('metal_brushed', shaft);
  const star1 = new THREE.BoxGeometry(0.1, 1.15, 0.1);
  star1.translate(ox, 3.55, oz);
  batch.geo('metal_brushed', star1);
  for (const a of [0, Math.PI / 2]) {
    const arm = new THREE.BoxGeometry(0.08, 0.08, 0.9);
    arm.rotateY(a + Math.PI / 4);
    arm.translate(ox, 3.55, oz);
    batch.geo('metal_brushed', arm);
  }
  batch.cone('snow', ox, 4.2, oz, 0.12, 0.18, 6);
  world.addCollider(aabb(ox - 0.57, 0, oz - 0.57, ox + 0.57, 4.1, oz + 0.57, { kind: 'sculpture', surface: 'metal' }));
  // trampled path across the court toward the exec corridor window
  batch.plane('@trample', 68.5, 0.135, 36.2, 1.1, 7.2, 'up'); // courtyard snow box top is y=0.12
}

// ---------------------------------------------------------------------------
// Garage-ramp exterior. The extraction shutter (x=64, z 4..12, basement) used
// to open onto void; build the trench: stepped ramp climbing east to grade,
// retaining walls with snow caps, crest mound, colliders sealing the route.
// ---------------------------------------------------------------------------
function buildGarageRamp(world, batch) {
  const by = -3.6;
  const X0 = 64.16, X1 = 79.4;
  const steps = 8;
  const stepLen = (X1 - X0) / steps;
  const rise = (by + 0.55) * -1 / steps; // climbs from -3.6 to -0.55 (~0.38/step)
  for (let i = 0; i < steps; i++) {
    const x0 = X0 + i * stepLen, x1 = x0 + stepLen;
    const top = by + rise * (i + 1);
    const bottom = by - 0.4;
    batch.box('concrete', (x0 + x1) / 2, (top + bottom) / 2, 8, stepLen, top - bottom, 7.9);
    world.addCollider(aabb(x0, bottom, 4.05, x1, top, 11.95, { kind: 'floor', surface: 'concrete' }));
    // snow builds up on the upper half of the ramp
    if (i >= 3) batch.box('snow', (x0 + x1) / 2, top + 0.035, 8, stepLen + 0.02, 0.07, 7.9);
  }
  // retaining walls flanking the trench, snow-capped
  for (const wz of [3.62, 12.38] ) {
    batch.box('concrete', (X0 + X1 + 1.2) / 2, -1.62, wz, X1 - X0 + 1.2, 3.85, 0.76);
    batch.box('snow', (X0 + X1 + 1.2) / 2, 0.36, wz, X1 - X0 + 1.2, 0.12, 0.9);
    world.addCollider(aabb(X0 - 0.6, -4, wz - 0.38, X1 + 0.6, 0.42, wz + 0.38,
      { kind: 'wall', surface: 'concrete' }));
  }
  // crest: snow mound closing the top of the ramp against the horizon
  batch.box('snow', X1 + 0.7, -0.32, 8, 1.6, 0.62, 9.2);
  batch.box('snow', X1 + 1.9, -0.12, 8, 1.4, 0.5, 10.4);
  world.addCollider(aabb(X1 - 0.1, -1.2, 3.4, X1 + 2.6, 1.2, 12.6,
    { kind: 'bounds', surface: 'snow', blocksSight: false }));
}
