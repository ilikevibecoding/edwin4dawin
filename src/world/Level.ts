import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { MaterialLibrary, type MaterialKey } from '../render/Materials';
import { RNG } from '../render/Noise';
import { QUALITY } from '../core/Config';
import { SKY_PRESETS } from '../render/Sky';
import type { LightingSystem } from '../render/Lighting';
import type { PhysicsSystem } from '../physics/Physics';
import type { SurfaceKind } from '../core/Signals';
import { buildProps } from './Props';

/**
 * "Al-Rahim" — a two-block section of a North African border town.
 *
 * The layout is authored rather than random: a central market street with
 * long sightlines, two flanking alley routes, and elevated firing positions on
 * the roofs. Cover is placed on a roughly 8 m rhythm so a player can always
 * break line of sight within a second of being shot at, which is the single
 * most important thing a shooter map has to get right.
 *
 * Geometry is generated procedurally but deterministically, and every static
 * mesh is merged per-material into a handful of draw calls before being handed
 * to the BVH — a town's worth of individual boxes would otherwise cost more in
 * draw-call overhead than in pixels.
 */

export interface SpawnPoint {
  position: THREE.Vector3;
  yaw: number;
  team: 'player' | 'enemy';
}

export interface CoverPoint {
  position: THREE.Vector3;
  /** Direction the cover protects from. */
  normal: THREE.Vector3;
  /** Crouch-height cover can be shot over; full cover requires leaning. */
  height: 'low' | 'high';
  occupiedBy: number;
}

interface BuildQueue {
  key: MaterialKey;
  scale: number;
  geos: THREE.BufferGeometry[];
  surface: SurfaceKind;
}

export class LevelSystem implements System {
  readonly name = 'level';
  readonly order = -60;

  materials!: MaterialLibrary;
  readonly root = new THREE.Group();
  readonly spawns: SpawnPoint[] = [];
  readonly coverPoints: CoverPoint[] = [];
  readonly navNodes: THREE.Vector3[] = [];
  /** Axis-aligned playable bounds; used to clamp AI and airstrike targeting. */
  readonly bounds = new THREE.Box3(
    new THREE.Vector3(-62, -4, -62),
    new THREE.Vector3(62, 40, 62),
  );

  private ctx!: EngineContext;
  private readonly queues = new Map<string, BuildQueue>();
  private readonly rng = new RNG(20240617);
  private readonly collisionMeshes: THREE.Mesh[] = [];

  async init(ctx: EngineContext): Promise<void> {
    this.ctx = ctx;
    this.root.name = 'level';
    ctx.scene.add(this.root);

    this.materials = new MaterialLibrary(ctx.renderer);
    this.materials.init();

    const lighting = ctx.get<LightingSystem>('lighting');
    lighting?.applyPreset(SKY_PRESETS.desertMorning);

    this.buildGround();
    this.buildStreetGrid();
    this.buildBuildings();
    this.buildPerimeter();
    this.flush();

    buildProps(this, this.rng);
    this.flush();

    this.registerCollision();
    this.buildSpawnsAndCover();

    ctx.engine.pipeline.resetExposure(1.0);
  }

  // ------------------------------------------------------------ geometry ---

  /** Queues a geometry to be merged into the batch for `key`. */
  push(
    key: MaterialKey,
    geometry: THREE.BufferGeometry,
    matrix: THREE.Matrix4,
    opts: { scale?: number; uvScale?: number } = {},
  ): void {
    const scale = opts.scale ?? 1;
    const id = `${key}|${scale}`;
    let q = this.queues.get(id);
    if (!q) {
      q = { key, scale, geos: [], surface: 'concrete' };
      this.queues.set(id, q);
    }
    const g = geometry.clone();
    g.applyMatrix4(matrix);
    // World-space triplanar-ish UVs: scale UVs by object size so texel density
    // is constant regardless of how big the piece is.
    q.geos.push(g);
  }

  /**
   * Box helper that generates per-face UVs scaled to world size, so a 12 m wall
   * and a 1 m crate built from the same material have identical texel density.
   */
  box(
    key: MaterialKey,
    w: number,
    h: number,
    d: number,
    matrix: THREE.Matrix4,
    tileMetres?: number,
  ): void {
    const geo = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
    const tile = tileMetres ?? 4;
    const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
    // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z (4 verts each).
    const dims: Array<[number, number]> = [
      [d, h], [d, h], [w, d], [w, d], [w, h], [w, h],
    ];
    for (let f = 0; f < 6; f++) {
      const [fw, fh] = dims[f];
      for (let i = 0; i < 4; i++) {
        const idx = f * 4 + i;
        uv.setXY(idx, uv.getX(idx) * (fw / tile), uv.getY(idx) * (fh / tile));
      }
    }
    uv.needsUpdate = true;
    this.push(key, geo, matrix);
    geo.dispose();
  }

  /** Merges every queued geometry into one mesh per material. */
  flush(): void {
    for (const [, q] of this.queues) {
      if (q.geos.length === 0) continue;
      const merged = mergeGeometries(q.geos);
      for (const g of q.geos) g.dispose();
      if (!merged) continue;

      merged.computeBoundingBox();
      merged.computeBoundingSphere();

      const mat = this.materials.get(q.key, { scale: 1 });
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      mesh.name = `batch:${q.key}`;
      mesh.userData.surface = this.materials.surfaceKind(mat);
      this.root.add(mesh);
      this.collisionMeshes.push(mesh);
    }
    this.queues.clear();
  }

  private registerCollision(): void {
    const physics = this.ctx.get<PhysicsSystem>('physics');
    if (!physics) return;
    for (const m of this.collisionMeshes) {
      physics.addCollider(m, (m.userData.surface as SurfaceKind) ?? 'concrete');
    }
  }

  // -------------------------------------------------------------- ground ---

  private buildGround(): void {
    const size = 260;
    const segs = 96;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.getAttribute('position') as THREE.BufferAttribute;
    const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      // Keep the playable core flat and let the ground roll away at the edges,
      // which hides the map boundary without a visible wall.
      const r = Math.max(Math.abs(x), Math.abs(z));
      const edge = THREE.MathUtils.smoothstep(r, 55, 130);
      const dunes =
        Math.sin(x * 0.031) * Math.cos(z * 0.027) * 2.4 +
        Math.sin(x * 0.077 + 1.3) * Math.cos(z * 0.061 - 0.7) * 0.9;
      const local = Math.sin(x * 0.21) * Math.cos(z * 0.19) * 0.06;
      pos.setY(i, dunes * edge + local * (1 - edge) - edge * 1.2);
      uv.setXY(i, (x / size) * (size / 6), (z / size) * (size / 6));
    }
    pos.needsUpdate = true;
    uv.needsUpdate = true;
    geo.computeVertexNormals();

    const mat = this.materials.get('sand', { scale: 1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.castShadow = false;
    mesh.name = 'terrain';
    mesh.userData.surface = 'sand';
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    this.root.add(mesh);
    this.collisionMeshes.push(mesh);
  }

  private buildStreetGrid(): void {
    const m = new THREE.Matrix4();

    // Main north-south market street.
    m.makeTranslation(0, 0.02, 0);
    this.box('asphalt', 14, 0.04, 108, m, 5);

    // East-west cross street.
    m.makeTranslation(0, 0.025, -14);
    this.box('asphalt', 104, 0.04, 11, m, 5);

    // Pavements flanking the main street.
    for (const x of [-8.6, 8.6]) {
      m.makeTranslation(x, 0.09, 0);
      this.box('concreteFloor', 3.2, 0.18, 108, m, 3);
    }
    for (const z of [-20.2, -7.8]) {
      m.makeTranslation(0, 0.09, z);
      this.box('concreteFloor', 104, 0.18, 3.0, m, 3);
    }

    // Dirt side lanes.
    for (const x of [-34, 34]) {
      m.makeTranslation(x, 0.015, 6);
      this.box('dirt', 8, 0.03, 84, m, 5);
    }
  }

  // ----------------------------------------------------------- buildings ---

  private buildBuildings(): void {
    const rng = this.rng;

    // Hand-placed blocks: [x, z, width, depth, floors, style]
    const blocks: Array<[number, number, number, number, number, number]> = [
      [-22, -40, 16, 14, 2, 0],
      [-22, -22, 16, 12, 3, 1],
      [-24, 2, 20, 18, 2, 0],
      [-22, 26, 16, 16, 3, 2],
      [-22, 46, 16, 12, 2, 1],

      [22, -42, 18, 14, 3, 1],
      [22, -22, 14, 12, 2, 2],
      [24, 4, 20, 20, 4, 0],
      [22, 30, 16, 18, 2, 1],
      [22, 50, 14, 12, 3, 2],

      [-46, -12, 14, 16, 2, 2],
      [-46, 18, 14, 14, 3, 0],
      [46, -8, 16, 18, 3, 1],
      [46, 24, 14, 14, 2, 2],
    ];

    for (const [x, z, w, d, floors, style] of blocks) {
      this.buildBuilding(x, z, w, d, floors, style, rng);
    }
  }

  private buildBuilding(
    cx: number,
    cz: number,
    w: number,
    d: number,
    floors: number,
    style: number,
    rng: RNG,
  ): void {
    const m = new THREE.Matrix4();
    const floorH = 3.2;
    const wallT = 0.34;
    const totalH = floors * floorH;

    const wallMat: MaterialKey = style === 0 ? 'plaster' : style === 1 ? 'brick' : 'concrete';
    const tile = style === 1 ? 2.4 : 4.5;

    // ---- foundation plinth ----
    m.makeTranslation(cx, 0.12, cz);
    this.box('concrete', w + 0.5, 0.24, d + 0.5, m, 4);

    // ---- floors ----
    for (let f = 0; f < floors; f++) {
      const y = 0.24 + f * floorH;

      // Slab
      m.makeTranslation(cx, y + floorH - 0.14, cz);
      this.box('concreteFloor', w, 0.28, d, m, 5);

      // Interior floor surface
      if (f === 0) {
        m.makeTranslation(cx, y + 0.03, cz);
        this.box(style === 2 ? 'tile' : 'concreteFloor', w - wallT * 2, 0.06, d - wallT * 2, m, 2);
      }

      // Walls with window and door cut-outs, built as segments.
      this.buildWallRow(cx, y, cz, w, d, floorH, wallT, wallMat, tile, f, rng);
    }

    // ---- roof ----
    const roofY = 0.24 + totalH;
    m.makeTranslation(cx, roofY + 0.06, cz);
    this.box('concreteFloor', w, 0.12, d, m, 4);

    // Parapet: the cover that makes rooftops playable.
    const pH = 1.05;
    const pT = 0.28;
    for (const [ox, oz, pw, pd] of [
      [0, -d / 2 + pT / 2, w, pT],
      [0, d / 2 - pT / 2, w, pT],
      [-w / 2 + pT / 2, 0, pT, d],
      [w / 2 - pT / 2, 0, pT, d],
    ]) {
      m.makeTranslation(cx + ox, roofY + pH / 2 + 0.12, cz + oz);
      this.box(wallMat, pw, pH, pd, m, tile);
    }

    // Roof clutter: water tanks, satellite dishes, AC units, laundry lines.
    const clutter = rng.int(2, 5);
    for (let i = 0; i < clutter; i++) {
      const px = cx + rng.range(-w / 2 + 1.6, w / 2 - 1.6);
      const pz = cz + rng.range(-d / 2 + 1.6, d / 2 - 1.6);
      const kind = rng.next();
      if (kind < 0.35) {
        // Cylindrical water tank on a stand.
        const r = rng.range(0.5, 0.78);
        const hgt = rng.range(1.0, 1.5);
        const cyl = new THREE.CylinderGeometry(r, r, hgt, 16, 1);
        applyCylinderUV(cyl, r, hgt, 1.6);
        m.makeTranslation(px, roofY + 0.12 + hgt / 2 + 0.35, pz);
        this.push('paintedMetalTan', cyl, m);
        cyl.dispose();
        for (const [lx, lz] of [[-r * 0.6, -r * 0.6], [r * 0.6, -r * 0.6], [-r * 0.6, r * 0.6], [r * 0.6, r * 0.6]]) {
          m.makeTranslation(px + lx, roofY + 0.12 + 0.175, pz + lz);
          this.box('corrugated', 0.07, 0.35, 0.07, m, 0.6);
        }
      } else if (kind < 0.6) {
        // AC condenser unit.
        m.makeTranslation(px, roofY + 0.12 + 0.42, pz);
        this.box('paintedMetalTan', rng.range(0.7, 1.0), 0.84, rng.range(0.6, 0.9), m, 1.4);
      } else if (kind < 0.8) {
        // Stacked crates / stored material.
        const n = rng.int(1, 3);
        for (let s = 0; s < n; s++) {
          const sz = rng.range(0.55, 0.85);
          m.makeTranslation(px + rng.range(-0.2, 0.2), roofY + 0.12 + sz / 2 + s * sz, pz + rng.range(-0.2, 0.2));
          this.box('woodCrate', sz, sz, sz, m, 1.1);
        }
      } else {
        // Satellite dish on a pole.
        m.makeTranslation(px, roofY + 0.12 + 0.6, pz);
        this.box('corrugated', 0.08, 1.2, 0.08, m, 0.6);
        const dish = new THREE.SphereGeometry(0.45, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42);
        const dm = new THREE.Matrix4()
          .makeRotationX(rng.range(0.7, 1.2))
          .setPosition(px, roofY + 0.12 + 1.25, pz);
        this.push('paintedMetalTan', dish, dm);
        dish.dispose();
      }
    }

    // External staircase to the roof on some buildings — vertical routes are
    // what stop a map from playing as a flat plane.
    if (rng.next() < 0.55) {
      this.buildStairs(cx + w / 2 + 0.6, cz + rng.range(-d / 4, d / 4), roofY + 0.12, rng.next() < 0.5 ? 0 : Math.PI);
    }
  }

  private buildWallRow(
    cx: number,
    y: number,
    cz: number,
    w: number,
    d: number,
    floorH: number,
    t: number,
    mat: MaterialKey,
    tile: number,
    floor: number,
    rng: RNG,
  ): void {
    const m = new THREE.Matrix4();
    const sillH = 0.95;
    const winH = 1.5;
    const headH = floorH - sillH - winH;

    const sides: Array<{ axis: 'x' | 'z'; sign: number; len: number }> = [
      { axis: 'z', sign: -1, len: w },
      { axis: 'z', sign: 1, len: w },
      { axis: 'x', sign: -1, len: d },
      { axis: 'x', sign: 1, len: d },
    ];

    for (const side of sides) {
      const openings = Math.max(1, Math.floor(side.len / 3.4));
      const spacing = side.len / openings;
      const winW = Math.min(1.25, spacing * 0.42);

      for (let i = 0; i < openings; i++) {
        const off = -side.len / 2 + spacing * (i + 0.5);
        // Ground floor gets doorways on the street-facing sides.
        const isDoor = floor === 0 && i === Math.floor(openings / 2) &&
          ((side.axis === 'z' && side.sign === (cx < 0 ? 1 : -1)) ||
           (side.axis === 'x' && side.sign === (cz < 0 ? 1 : -1)));
        const openW = isDoor ? 1.15 : winW;
        const openBottom = isDoor ? 0 : sillH;
        const openTop = isDoor ? 2.15 : sillH + winH;

        const place = (
          segCenter: number,
          segLen: number,
          segBottom: number,
          segTop: number,
        ): void => {
          const h = segTop - segBottom;
          if (h <= 0.001 || segLen <= 0.001) return;
          const cyy = y + segBottom + h / 2;
          if (side.axis === 'z') {
            m.makeTranslation(cx + segCenter, cyy, cz + side.sign * (d / 2 - t / 2));
            this.box(mat, segLen, h, t, m, tile);
          } else {
            m.makeTranslation(cx + side.sign * (w / 2 - t / 2), cyy, cz + segCenter);
            this.box(mat, t, h, segLen, m, tile);
          }
        };

        // Pier left of the opening.
        const pierLen = (spacing - openW) / 2;
        place(off - openW / 2 - pierLen / 2, pierLen, 0, floorH);
        place(off + openW / 2 + pierLen / 2, pierLen, 0, floorH);
        // Sill below and header above.
        place(off, openW, 0, openBottom);
        place(off, openW, openTop, floorH);

        // Window frame + glass.
        if (!isDoor && rng.next() < 0.72) {
          const frameT = 0.06;
          if (side.axis === 'z') {
            m.makeTranslation(cx + off, y + sillH + winH / 2, cz + side.sign * (d / 2 - t / 2));
            this.box('wood', openW - 0.06, winH - 0.06, frameT, m, 1.0);
          } else {
            m.makeTranslation(cx + side.sign * (w / 2 - t / 2), y + sillH + winH / 2, cz + off);
            this.box('wood', frameT, winH - 0.06, openW - 0.06, m, 1.0);
          }
        }
      }
      void headH;
    }
  }

  private buildStairs(x: number, z: number, topY: number, rot: number): void {
    const steps = Math.ceil(topY / 0.19);
    const stepH = topY / steps;
    const stepD = 0.28;
    const width = 1.15;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot);
    const s = new THREE.Vector3(1, 1, 1);

    for (let i = 0; i < steps; i++) {
      const localZ = -i * stepD;
      const p = new THREE.Vector3(0, stepH * (i + 0.5), localZ).applyQuaternion(q);
      m.compose(new THREE.Vector3(x + p.x, p.y, z + p.z), q, s);
      const geo = new THREE.BoxGeometry(width, stepH, stepD);
      scaleBoxUV(geo, width, stepH, stepD, 2);
      this.push('concrete', geo, m);
      geo.dispose();
    }
    // Side stringer for solidity and to block shots under the flight.
    const runLen = steps * stepD;
    const p = new THREE.Vector3(width / 2 + 0.08, topY / 2, -runLen / 2).applyQuaternion(q);
    m.compose(new THREE.Vector3(x + p.x, p.y, z + p.z), q, s);
    const wall = new THREE.BoxGeometry(0.16, topY, runLen);
    scaleBoxUV(wall, 0.16, topY, runLen, 3);
    this.push('concrete', wall, m);
    wall.dispose();
  }

  private buildPerimeter(): void {
    const m = new THREE.Matrix4();
    const h = 3.4;
    const t = 0.4;
    const half = 60;

    // Segmented perimeter wall with gaps and collapsed sections, so it reads
    // as a real edge of town rather than a box.
    for (const [axis, sign] of [['x', -1], ['x', 1], ['z', -1], ['z', 1]] as const) {
      const segments = 14;
      const segLen = (half * 2) / segments;
      for (let i = 0; i < segments; i++) {
        const off = -half + segLen * (i + 0.5);
        const r = this.rng.next();
        if (r < 0.1) continue;
        const segH = r < 0.24 ? h * this.rng.range(0.3, 0.65) : h;
        if (axis === 'x') {
          m.makeTranslation(sign * half, segH / 2, off);
          this.box('concrete', t, segH, segLen * 0.995, m, 4);
        } else {
          m.makeTranslation(off, segH / 2, sign * half);
          this.box('concrete', segLen * 0.995, segH, t, m, 4);
        }
      }
    }

    // Ring of distant silhouette buildings outside the play space; they cost
    // almost nothing and remove the "floating diorama" feeling.
    const rng = new RNG(777);
    for (let i = 0; i < 60; i++) {
      const ang = (i / 60) * Math.PI * 2 + rng.range(-0.04, 0.04);
      const dist = rng.range(78, 190);
      const bw = rng.range(8, 26);
      const bd = rng.range(8, 26);
      const bh = rng.range(4, 18);
      m.makeTranslation(Math.sin(ang) * dist, bh / 2 - 1.5, Math.cos(ang) * dist);
      this.box(rng.next() < 0.5 ? 'plaster' : 'concrete', bw, bh, bd, m, 5);
    }
  }

  // ---------------------------------------------------- spawns and cover ---

  private buildSpawnsAndCover(): void {
    this.spawns.push(
      { position: new THREE.Vector3(0, 0.2, 44), yaw: Math.PI, team: 'player' },
      { position: new THREE.Vector3(-6, 0.2, 40), yaw: Math.PI, team: 'player' },
      { position: new THREE.Vector3(6, 0.2, 40), yaw: Math.PI, team: 'player' },
    );

    const enemySpots: Array<[number, number, number]> = [
      [0, -44, 0], [-10, -38, 0.3], [10, -38, -0.3],
      [-30, -20, 1.2], [30, -18, -1.2], [-38, 10, 1.6],
      [38, 14, -1.6], [-14, 0, 0.6], [14, 4, -0.6],
      [0, -20, 0], [-24, -6, 1.0], [24, -8, -1.0],
    ];
    for (const [x, z, yaw] of enemySpots) {
      this.spawns.push({ position: new THREE.Vector3(x, 0.2, z), yaw, team: 'enemy' });
    }

    // Cover points are sampled on a grid and validated against the collision
    // world, so they stay correct as the layout changes.
    const physics = this.ctx.get<PhysicsSystem>('physics');
    if (!physics) return;

    const step = 4;
    const probe = new THREE.Vector3();
    const dirs = [
      new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
    ];

    for (let x = -52; x <= 52; x += step) {
      for (let z = -52; z <= 52; z += step) {
        probe.set(x, 3, z);
        const ground = physics.trace(probe, new THREE.Vector3(0, -1, 0), 6);
        if (!ground.hit) continue;
        const groundY = ground.point.y;
        if (groundY < -1 || groundY > 12) continue;

        // A position is cover if something blocks at chest height on at least
        // one side but the position itself is open.
        const eye = new THREE.Vector3(x, groundY + 1.35, z);
        const crouch = new THREE.Vector3(x, groundY + 0.75, z);
        for (const dir of dirs) {
          const highHit = physics.trace(eye, dir, 1.6);
          const lowHit = physics.trace(crouch, dir, 1.6);
          if (lowHit.hit && !highHit.hit) {
            this.coverPoints.push({
              position: new THREE.Vector3(x, groundY, z),
              normal: dir.clone().negate(),
              height: 'low',
              occupiedBy: -1,
            });
            break;
          }
          if (highHit.hit && highHit.distance > 0.5) {
            this.coverPoints.push({
              position: new THREE.Vector3(x, groundY, z),
              normal: dir.clone().negate(),
              height: 'high',
              occupiedBy: -1,
            });
            break;
          }
        }

        // Anything walkable becomes a nav node.
        if (ground.normal.y > 0.7) {
          this.navNodes.push(new THREE.Vector3(x, groundY, z));
        }
      }
    }
  }

  /** Nearest free cover point to `from` that is not too close to `threat`. */
  findCover(from: THREE.Vector3, threat: THREE.Vector3, actorId: number, maxDist = 22): CoverPoint | null {
    let best: CoverPoint | null = null;
    let bestScore = -Infinity;
    const toThreat = new THREE.Vector3();

    for (const c of this.coverPoints) {
      if (c.occupiedBy !== -1 && c.occupiedBy !== actorId) continue;
      const dist = c.position.distanceTo(from);
      if (dist > maxDist) continue;
      toThreat.copy(threat).sub(c.position).normalize();
      // The cover must actually face the threat.
      const facing = c.normal.dot(toThreat);
      if (facing < 0.25) continue;
      const threatDist = c.position.distanceTo(threat);
      const score = facing * 3 - dist * 0.35 + Math.min(threatDist, 30) * 0.12 +
        (c.height === 'high' ? 1.2 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (best) best.occupiedBy = actorId;
    return best;
  }

  releaseCover(actorId: number): void {
    for (const c of this.coverPoints) if (c.occupiedBy === actorId) c.occupiedBy = -1;
  }

  dispose(): void {
    this.materials?.dispose();
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
  }
}

// ------------------------------------------------------------- helpers -----

/** Rescales a BoxGeometry's UVs so texel density matches world size. */
export function scaleBoxUV(
  geo: THREE.BoxGeometry,
  w: number,
  h: number,
  d: number,
  tile: number,
): void {
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  const dims: Array<[number, number]> = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [fw, fh] = dims[f];
    for (let i = 0; i < 4; i++) {
      const idx = f * 4 + i;
      uv.setXY(idx, uv.getX(idx) * (fw / tile), uv.getY(idx) * (fh / tile));
    }
  }
  uv.needsUpdate = true;
}

export function applyCylinderUV(
  geo: THREE.CylinderGeometry,
  radius: number,
  height: number,
  tile: number,
): void {
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  const circumference = Math.PI * 2 * radius;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * (circumference / tile), uv.getY(i) * (height / tile));
  }
  uv.needsUpdate = true;
}

/**
 * Merges geometries that share an attribute layout.
 * Written inline rather than imported so the level builder can guarantee the
 * exact attribute set (position/normal/uv) it needs and drop everything else.
 */
export function mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry | null {
  if (geos.length === 0) return null;

  let vertexCount = 0;
  let indexCount = 0;
  for (const g of geos) {
    const pos = g.getAttribute('position');
    if (!pos) continue;
    vertexCount += pos.count;
    indexCount += g.index ? g.index.count : pos.count;
  }
  if (vertexCount === 0) return null;

  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const indices = vertexCount > 65535 ? new Uint32Array(indexCount) : new Uint16Array(indexCount);

  let vo = 0;
  let io = 0;
  for (const g of geos) {
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    if (!pos) continue;
    let nor = g.getAttribute('normal') as THREE.BufferAttribute | undefined;
    if (!nor) {
      g.computeVertexNormals();
      nor = g.getAttribute('normal') as THREE.BufferAttribute;
    }
    const uv = g.getAttribute('uv') as THREE.BufferAttribute | undefined;

    positions.set(pos.array as Float32Array, vo * 3);
    normals.set(nor.array as Float32Array, vo * 3);
    if (uv) uvs.set(uv.array as Float32Array, vo * 2);

    if (g.index) {
      const src = g.index.array;
      for (let i = 0; i < src.length; i++) indices[io + i] = src[i] + vo;
      io += src.length;
    } else {
      for (let i = 0; i < pos.count; i++) indices[io + i] = vo + i;
      io += pos.count;
    }
    vo += pos.count;
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  out.setIndex(new THREE.BufferAttribute(indices, 1));
  return out;
}
