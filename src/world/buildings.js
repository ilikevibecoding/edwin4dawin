import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { getMaterialLib, scaleBoxUVs } from './textures.js';
import { makeRNG } from '../core/math.js';
import { buildWaterTank, buildAntenna, buildACUnit, buildShopSign, buildRubblePile, shadow } from './props.js';

/** Tiles-per-meter for each textured wall material (world-space UVs). */
let UV_K = null;
function uvScaleFor(mat) {
  if (!UV_K) {
    const lib = getMaterialLib();
    UV_K = new Map([
      [lib.plasterSand, [0.3, 0.3]],
      [lib.plasterWhite, [0.3, 0.3]],
      [lib.plasterOchre, [0.3, 0.3]],
      [lib.plasterRose, [0.3, 0.3]],
      [lib.brick, [0.55, 0.72]],
      [lib.concreteDark, [0.5, 0.5]],
      [lib.wood, [0.9, 0.9]],
      [lib.corrugated, [0.42, 0.42]],
      [lib.concrete, [0.35, 0.35]],
    ]);
  }
  return UV_K.get(mat) ?? null;
}

/**
 * Building factory. Facades are assembled from real geometry — punched
 * window openings with recessed glass, frames, sills, cornices, parapets,
 * balconies — then merged per-material for performance. Invisible collision
 * proxy boxes are attached (userData.collider) for the physics set.
 */

const STORY_H = 3.1;
const GROUND_H = 3.7;

function collProxy(group, x, y, z, sx, sy, sz) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz));
  m.position.set(x, y, z);
  m.visible = false;
  m.userData.collider = true;
  group.add(m);
}

class GeoBucket {
  constructor() { this.map = new Map(); }
  add(mat, geo, x, y, z, ry = 0, rx = 0, rz = 0) {
    const g = geo.clone();
    if (rx) g.rotateX(rx);
    if (ry) g.rotateY(ry);
    if (rz) g.rotateZ(rz);
    g.translate(x, y, z);
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(g);
  }
  box(mat, x, y, z, sx, sy, sz, ry = 0) {
    const geo = new THREE.BoxGeometry(sx, sy, sz);
    const k = uvScaleFor(mat);
    if (k) scaleBoxUVs(geo, sx, sy, sz, k[0], k[1]);
    this.add(mat, geo, x, y, z, ry);
  }
  build(group) {
    for (const [mat, geos] of this.map) {
      const merged = BufferGeometryUtils.mergeGeometries(geos, false);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
}

const WALL_STYLES = ['plasterSand', 'plasterWhite', 'plasterOchre', 'plasterRose', 'brick'];

/**
 * A city building. Front facade faces +Z in local space.
 * opts: { w, d, stories, styleIdx, seed, storefront, signText }
 */
export function buildBuilding(opts = {}) {
  const lib = getMaterialLib();
  const r = makeRNG((opts.seed ?? 1) * 7717 + 11);
  const w = opts.w ?? 12;
  const d = opts.d ?? 10;
  const stories = opts.stories ?? 2;
  const style = WALL_STYLES[(opts.styleIdx ?? r.int(0, WALL_STYLES.length - 1)) % WALL_STYLES.length];
  const wallMat = lib[style];
  const trimMat = lib.concreteDark;
  const H = GROUND_H + (stories - 1) * STORY_H;

  const group = new THREE.Group();
  const B = new GeoBucket();
  const wallT = 0.4;

  /* Facade builder for one side. Writes untransformed geometry into `sub`;
     the placement wrapper rotates/translates it into position. */
  const facade = (faceW, hasStorefront) => {
    const sub = new GeoBucket();
    const winW = 1.15, winH = 1.5;
    const bays = Math.max(1, Math.round(faceW / 2.35));
    const bayW = faceW / bays;

    for (let s = 0; s < stories; s++) {
      const y0 = s === 0 ? 0 : GROUND_H + (s - 1) * STORY_H;
      const h = s === 0 ? GROUND_H : STORY_H;
      const sillY = y0 + (s === 0 ? 1.15 : 0.95);
      const lintelY = sillY + winH;

      if (s === 0 && hasStorefront) {
        // Storefront: big central opening w/ roll shutter, flanking wall
        const openW = Math.min(faceW - 2.4, 5.2);
        const sideW = (faceW - openW) / 2;
        sub.box(wallMat, -faceW / 2 + sideW / 2, h / 2, 0, sideW, h, wallT);
        sub.box(wallMat, faceW / 2 - sideW / 2, h / 2, 0, sideW, h, wallT);
        sub.box(wallMat, 0, h - 0.45, 0, openW, 0.9, wallT); // header
        // Roll shutter (recessed)
        sub.box(lib.corrugated, 0, (h - 0.9) / 2, -0.1, openW, h - 0.9, 0.06);
        continue;
      }

      // Regular floor with punched windows
      for (let b = 0; b < bays; b++) {
        const bx = -faceW / 2 + bayW * (b + 0.5);
        const hasWin = !(s === 0 && b === 0 && r.chance(0.5)); // sometimes a door instead
        const pierW = bayW - winW;
        // Piers (walls between windows)
        sub.box(wallMat, bx - bayW / 2 + pierW / 4, y0 + h / 2, 0, pierW / 2, h, wallT);
        sub.box(wallMat, bx + bayW / 2 - pierW / 4, y0 + h / 2, 0, pierW / 2, h, wallT);

        if (hasWin || s > 0) {
          // Below sill + above lintel
          sub.box(wallMat, bx, y0 + (sillY - y0) / 2, 0, winW, sillY - y0, wallT);
          sub.box(wallMat, bx, lintelY + (y0 + h - lintelY) / 2, 0, winW, y0 + h - lintelY, wallT);
          // Window: recessed interior + glass + frame + sill
          const state = r();
          sub.box(lib.darkInterior, bx, sillY + winH / 2, -0.16, winW - 0.06, winH - 0.06, 0.02);
          if (state < 0.45) {
            sub.box(lib.glassWindow, bx, sillY + winH / 2, -0.12, winW - 0.14, winH - 0.14, 0.02);
            // Cross mullion
            sub.box(lib.wood, bx, sillY + winH / 2, -0.1, winW - 0.1, 0.05, 0.04);
            sub.box(lib.wood, bx, sillY + winH / 2, -0.1, 0.05, winH - 0.1, 0.04);
          } else if (state < 0.75) {
            // Closed wooden shutters
            sub.box(lib.wood, bx - winW / 4 + 0.02, sillY + winH / 2, -0.08, winW / 2 - 0.05, winH - 0.1, 0.04);
            sub.box(lib.wood, bx + winW / 4 - 0.02, sillY + winH / 2, -0.08, winW / 2 - 0.05, winH - 0.1, 0.04);
          } else if (state < 0.88) {
            // Boarded planks
            for (let p = 0; p < 4; p++) {
              sub.add(lib.woodDark, new THREE.BoxGeometry(winW + 0.15, 0.22, 0.04),
                bx, sillY + 0.22 + p * 0.36, -0.06, 0, 0, r.spread(0.09));
            }
          }
          // Frame
          sub.box(trimMat, bx, sillY - 0.045, 0.05, winW + 0.22, 0.09, wallT * 0.35); // sill ledge
          sub.box(trimMat, bx, lintelY + 0.04, 0.02, winW + 0.14, 0.08, wallT * 0.3);
          sub.box(trimMat, bx - winW / 2 - 0.035, sillY + winH / 2, 0.01, 0.07, winH + 0.1, wallT * 0.3);
          sub.box(trimMat, bx + winW / 2 + 0.035, sillY + winH / 2, 0.01, 0.07, winH + 0.1, wallT * 0.3);
        } else {
          // Door bay on ground floor
          const doorW = 1.0, doorH = 2.2;
          sub.box(wallMat, bx, doorH + (h - doorH) / 2, 0, winW, h - doorH, wallT);
          sub.box(wallMat, bx - winW / 2 + (winW - doorW) / 4, doorH / 2, 0, (winW - doorW) / 2, doorH, wallT);
          sub.box(wallMat, bx + winW / 2 - (winW - doorW) / 4, doorH / 2, 0, (winW - doorW) / 2, doorH, wallT);
          sub.box(lib.wood, bx, doorH / 2, -0.08, doorW, doorH, 0.06);
          sub.box(trimMat, bx, doorH + 0.05, 0.03, doorW + 0.2, 0.1, wallT * 0.4);
        }
      }
      // Floor cornice line
      if (s < stories - 1) {
        sub.box(trimMat, 0, y0 + h - 0.02, 0.07, faceW, 0.16, wallT * 0.5);
      }
    }
    return sub;
  };

  // Four facades: +Z front, -Z back, +X right, -X left
  const halfW = w / 2, halfD = d / 2;
  const facadePlace = (faceW, yaw, cx, cz, storefront) => {
    const sub = facade(faceW, storefront);
    for (const [mat, geos] of sub.map) {
      for (const g of geos) {
        g.rotateY(yaw);
        g.translate(cx, 0, cz);
        if (!B.map.has(mat)) B.map.set(mat, []);
        B.map.get(mat).push(g);
      }
    }
  };

  facadePlace(w, 0, 0, halfD - wallT / 2, !!opts.storefront);
  facadePlace(w, Math.PI, 0, -(halfD - wallT / 2), false);
  facadePlace(d, Math.PI / 2, halfW - wallT / 2, 0, false);
  facadePlace(d, -Math.PI / 2, -(halfW - wallT / 2), 0, false);

  // Corner columns to seal edges
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    B.box(wallMat, sx * (halfW - wallT / 2), H / 2, sz * (halfD - wallT / 2), wallT, H, wallT);
  }

  // Roof slab + parapet
  B.box(lib.concrete, 0, H + 0.08, 0, w, 0.16, d);
  const pp = 0.55;
  B.box(wallMat, 0, H + pp / 2, halfD - 0.11, w, pp, 0.22);
  B.box(wallMat, 0, H + pp / 2, -(halfD - 0.11), w, pp, 0.22);
  B.box(wallMat, halfW - 0.11, H + pp / 2, 0, 0.22, pp, d);
  B.box(wallMat, -(halfW - 0.11), H + pp / 2, 0, 0.22, pp, d);
  B.box(trimMat, 0, H + pp + 0.03, halfD - 0.11, w + 0.1, 0.07, 0.3);
  B.box(trimMat, 0, H + pp + 0.03, -(halfD - 0.11), w + 0.1, 0.07, 0.3);
  B.box(trimMat, halfW - 0.11, H + pp + 0.03, 0, 0.3, 0.07, d + 0.1);
  B.box(trimMat, -(halfW - 0.11), H + pp + 0.03, 0, 0.3, 0.07, d + 0.1);

  B.build(group);

  // Balconies on upper floors (front)
  if (stories > 1 && r.chance(0.75)) {
    const nBalc = r.int(1, 2);
    for (let i = 0; i < nBalc; i++) {
      const s = r.int(1, stories - 1);
      const y0 = GROUND_H + (s - 1) * STORY_H;
      const bx = r.spread(w * 0.28);
      const balc = new THREE.Group();
      const slab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.95), lib.concreteDark);
      slab.position.set(0, 0, 0.45);
      balc.add(slab);
      const railMat = new THREE.MeshStandardMaterial({ color: 0x2c2620, roughness: 0.6, metalness: 0.7 });
      for (let p = 0; p <= 6; p++) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.85, 6), railMat);
        post.position.set(-0.9 + p * 0.3, 0.48, 0.88);
        balc.add(post);
      }
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.05, 0.05), railMat);
      rail.position.set(0, 0.9, 0.88);
      balc.add(rail);
      for (const side of [-1, 1]) {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.9), railMat);
        sp.position.set(side * 0.92, 0.9, 0.44);
        balc.add(sp);
      }
      balc.position.set(bx, y0 + 0.9, halfD - wallT / 2 + 0.05);
      shadow(balc);
      group.add(balc);
    }
  }

  // Drain pipe
  if (r.chance(0.8)) {
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x5a5248, roughness: 0.7, metalness: 0.4 });
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, H - 0.2, 8), pipeMat);
    pipe.position.set(r.chance(0.5) ? halfW - 0.4 : -(halfW - 0.4), H / 2, halfD + 0.08);
    pipe.castShadow = true;
    group.add(pipe);
  }

  // AC units under some windows
  const acCount = r.int(0, 2);
  for (let i = 0; i < acCount; i++) {
    const ac = buildACUnit();
    ac.position.set(r.spread(w * 0.3), GROUND_H + r.int(0, Math.max(0, stories - 2)) * STORY_H + 1.5, halfD + 0.18);
    group.add(ac);
  }

  // Roof clutter
  if (r.chance(0.8)) {
    const tank = buildWaterTank();
    tank.position.set(r.spread(w * 0.25), H, r.spread(d * 0.25));
    group.add(tank);
  }
  if (r.chance(0.65)) {
    const ant = buildAntenna(2.4 + r() * 2);
    ant.position.set(r.spread(w * 0.3), H, r.spread(d * 0.3));
    group.add(ant);
  }

  // Shop sign above storefront
  if (opts.storefront && opts.signText) {
    const sign = buildShopSign(opts.signText, Math.min(5.4, w * 0.5), 0.85,
      ['#7a2c20', '#274a42', '#6a5220', '#31404f'][r.int(0, 3)]);
    sign.position.set(0, GROUND_H - 0.55, halfD + 0.12);
    group.add(sign);
    // Awning
    if (r.chance(0.7)) {
      const awnMat = new THREE.MeshStandardMaterial({ color: [0x8a3428, 0x3c5a50, 0x8a6a28][r.int(0, 2)], roughness: 0.9, side: THREE.DoubleSide });
      const awn = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(5.6, w * 0.52), 1.35, 8, 1), awnMat);
      const pa = awn.geometry.attributes.position;
      for (let i = 0; i < pa.count; i++) {
        const x = pa.getX(i);
        pa.setZ(i, Math.sin((x + 10) * 4) * 0.03);
      }
      awn.geometry.computeVertexNormals();
      awn.rotation.x = -Math.PI / 2 + 0.5;
      awn.position.set(0, GROUND_H - 1.05, halfD + 0.62);
      awn.castShadow = true;
      group.add(awn);
    }
  }

  // Collision proxy: full footprint
  collProxy(group, 0, H / 2, 0, w, H, d);
  group.userData.height = H;
  group.userData.footprint = [w, d];
  return group;
}

/** Ruined building: broken walls with jagged tops, interior rubble. */
export function buildRuinedBuilding(opts = {}) {
  const lib = getMaterialLib();
  const r = makeRNG((opts.seed ?? 2) * 3313 + 5);
  const w = opts.w ?? 12, d = opts.d ?? 10;
  const group = new THREE.Group();
  const B = new GeoBucket();
  const wallMat = lib[WALL_STYLES[(opts.styleIdx ?? 0) % WALL_STYLES.length]];
  const wallT = 0.42;
  const maxH = opts.h ?? 6.5;

  // Jagged walls made from vertical strips
  const wall = (len, yaw, cx, cz, gapChance = 0.22) => {
    const strips = Math.floor(len / 0.85);
    const sw = len / strips;
    let hPrev = maxH * (0.4 + r() * 0.6);
    for (let i = 0; i < strips; i++) {
      if (r.chance(gapChance) && i > 1 && i < strips - 2) { hPrev = maxH * (0.15 + r() * 0.3); continue; }
      let h = hPrev + r.spread(1.1);
      h = Math.max(1.1, Math.min(maxH, h));
      hPrev = h;
      const x = -len / 2 + sw * (i + 0.5);
      const geo = new THREE.BoxGeometry(sw + 0.02, h, wallT);
      scaleBoxUVs(geo, sw + 0.02, h, wallT, 0.3, 0.3);
      geo.rotateY(yaw);
      const off = new THREE.Vector3(x, h / 2, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      geo.translate(cx + off.x, off.y, cz + off.z);
      if (!B.map.has(wallMat)) B.map.set(wallMat, []);
      B.map.get(wallMat).push(geo);
    }
  };

  wall(w, 0, 0, d / 2 - wallT / 2, 0.3);
  wall(w, 0, 0, -(d / 2 - wallT / 2), 0.18);
  wall(d, Math.PI / 2, w / 2 - wallT / 2, 0, 0.24);
  wall(d, Math.PI / 2, -(w / 2 - wallT / 2), 0, 0.35);
  B.build(group);

  // Collapsed floor slab
  const slab = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.18, d * 0.5), lib.concrete);
  slab.position.set(w * 0.1, 1.5, -d * 0.12);
  slab.rotation.z = 0.38;
  slab.castShadow = slab.receiveShadow = true;
  group.add(slab);

  // Rubble inside and spilling out front
  const rub1 = buildRubblePile(Math.min(w, d) * 0.32, 1.3, (opts.seed ?? 2) * 3 + 1);
  rub1.position.set(0, 0, 0);
  group.add(rub1);
  const rub2 = buildRubblePile(2.2, 0.8, (opts.seed ?? 2) * 5 + 2);
  rub2.position.set(w * 0.2, 0, d / 2 + 1.2);
  group.add(rub2);

  // Colliders: perimeter walls + interior rubble mound
  collProxy(group, 0, 2, d / 2 - wallT / 2, w, 4, wallT);
  collProxy(group, 0, 2, -(d / 2 - wallT / 2), w, 4, wallT);
  collProxy(group, w / 2 - wallT / 2, 2, 0, wallT, 4, d);
  collProxy(group, -(w / 2 - wallT / 2), 2, 0, wallT, 4, d);
  collProxy(group, 0, 0.5, 0, w * 0.5, 1, d * 0.5);
  group.userData.height = maxH;
  return group;
}

/** Compound wall segment with gate (map boundary flavor). */
export function buildCompoundWall(len = 10, h = 2.6, styleIdx = 0) {
  const lib = getMaterialLib();
  const group = new THREE.Group();
  const wallMat = lib[WALL_STYLES[styleIdx % WALL_STYLES.length]];
  const wallGeo = scaleBoxUVs(new THREE.BoxGeometry(len, h, 0.4), len, h, 0.4, 0.3, 0.3);
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.y = h / 2;
  group.add(wall);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(len + 0.1, 0.12, 0.55), lib.concreteDark);
  cap.position.y = h + 0.06;
  group.add(cap);
  shadow(group);
  collProxy(group, 0, h / 2, 0, len, h + 0.4, 0.5);
  return group;
}
