import * as THREE from 'three';
import { CELL, BUILD_COST, MATERIAL_ORDER, MATERIALS, WALL_T } from './config.js';
import { aabbIntersects } from './utils.js';
import { createStructure, createGhost, structureKey, RAMP_LEN } from './structures.js';

const PIECES = ['wall', 'floor', 'ramp'];
const PIECE_KEYS = { KeyZ: 'wall', KeyX: 'floor', KeyC: 'ramp' };

export class Building {
  constructor(game) {
    this.game = game;
    this.byKey = new Map();
    this.ghost = createGhost();
    game.scene.add(this.ghost.group);
    this.lastPlacedKey = null;
    this.placeTimer = 0;
    this.placement = null;
    this.builtCount = 0;
  }

  // ---------- registry ----------

  addStructure(solid) {
    if (this.byKey.has(solid.key)) return null;
    this.byKey.set(solid.key, solid);
    this.game.world.addSolid(solid);
    this.game.scene.add(solid.mesh);
    solid.mesh.updateMatrixWorld(true);
    return solid;
  }

  removeStructure(solid) {
    this.byKey.delete(solid.key);
    this.game.world.removeSolid(solid);
    this.game.scene.remove(solid.mesh);
  }

  neighbors(solid) {
    const b = solid.bounds;
    const near = this.game.world.query(b.minX - 0.6, b.minZ - 0.6, b.maxX + 0.6, b.maxZ + 0.6, []);
    const out = [];
    for (const s of near) {
      if (s === solid || s.kind !== 'structure') continue;
      if (aabbIntersects(b, s.bounds, 0.35)) out.push(s);
    }
    return out;
  }

  isGrounded(solid) {
    const b = solid.bounds;
    const h = this.game.world.heightAt;
    const cx = (b.minX + b.maxX) / 2;
    const cz = (b.minZ + b.maxZ) / 2;
    const t = Math.max(h(cx, cz), h(b.minX, b.minZ), h(b.maxX, b.minZ), h(b.minX, b.maxZ), h(b.maxX, b.maxZ));
    return t >= b.minY - 1.3;
  }

  /** Destroys unsupported components touching the given seeds (run after a piece disappears). */
  checkSupport(seeds) {
    const visited = new Set();
    const world = this.game.world;
    for (const seed of seeds) {
      if (visited.has(seed) || !world.solids.has(seed)) continue;
      const comp = [];
      const stack = [seed];
      visited.add(seed);
      let grounded = false;
      while (stack.length) {
        const c = stack.pop();
        comp.push(c);
        if (this.isGrounded(c) || comp.length > 600) {
          grounded = true;
          break;
        }
        for (const n of this.neighbors(c)) {
          if (!visited.has(n)) {
            visited.add(n);
            stack.push(n);
          }
        }
      }
      if (!grounded) {
        comp.forEach((c, idx) => setTimeout(() => this.game.destroySolid(c, 'collapse', false), Math.min(600, idx * 25)));
      }
    }
  }

  // ---------- player build mode ----------

  enterBuildMode() {
    const p = this.game.player;
    if (p.mode === 'build') return;
    p.mode = 'build';
    p.wantAds = false;
    p.reload = null;
    p.using = null;
    this.game.audio.play('switch');
  }

  exitBuildMode() {
    const p = this.game.player;
    if (p.mode !== 'build') return;
    p.mode = 'combat';
    this.ghost.group.visible = false;
    this.placement = null;
  }

  update(dt, input) {
    const game = this.game;
    const p = game.player;
    if (!p.alive || p.phase !== 'ground') {
      this.ghost.group.visible = false;
      return;
    }
    if (input.wasPressed('KeyQ')) {
      if (p.mode === 'build') this.exitBuildMode();
      else this.enterBuildMode();
    }
    for (const [code, piece] of Object.entries(PIECE_KEYS)) {
      if (input.wasPressed(code)) {
        p.buildPiece = piece;
        this.enterBuildMode();
      }
    }
    if (p.mode !== 'build') {
      this.ghost.group.visible = false;
      return;
    }
    if (input.wheel !== 0) {
      const idx = (PIECES.indexOf(p.buildPiece) + (input.wheel > 0 ? 1 : -1) + PIECES.length) % PIECES.length;
      p.buildPiece = PIECES[idx];
    }
    if (input.clicked[2]) {
      const idx = (MATERIAL_ORDER.indexOf(p.buildMat) + 1) % MATERIAL_ORDER.length;
      p.buildMat = MATERIAL_ORDER[idx];
      game.audio.play('switch');
    }
    if (input.wasPressed('KeyR')) p.buildRot = (p.buildRot + 1) % 4;

    const pl = this.computePlacement(p);
    this.placement = pl;
    this.showGhost(pl);

    this.placeTimer -= dt;
    if (input.buttons[0]) {
      const fresh = input.clicked[0] || pl.key !== this.lastPlacedKey || this.placeTimer <= 0;
      if (fresh) {
        if (pl.valid) {
          this.place(pl, p);
          this.lastPlacedKey = pl.key;
          this.placeTimer = 0.15;
        } else if (input.clicked[0]) {
          game.audio.play('build_fail');
          if (pl.reason) game.hud.toast(pl.reason);
        }
      }
    }
  }

  computePlacement(p) {
    const fx = p.flatForward.x;
    const fz = p.flatForward.z;
    const px = p.pos.x;
    const pz = p.pos.z;
    const k = Math.floor((p.pos.y + 1.2) / CELL);
    const lookingDown = p.pitch < -0.95;
    const domX = Math.abs(fx) >= Math.abs(fz);
    const piece = p.buildPiece;
    let i;
    let j;
    let orient = 0;
    if (piece === 'wall') {
      if (domX) {
        orient = 0;
        i = fx > 0 ? Math.ceil(px / CELL) : Math.floor(px / CELL);
        j = Math.floor(pz / CELL);
        if (Math.abs(i * CELL - px) < 0.6) i += fx > 0 ? 1 : -1;
      } else {
        orient = 1;
        j = fz > 0 ? Math.ceil(pz / CELL) : Math.floor(pz / CELL);
        i = Math.floor(px / CELL);
        if (Math.abs(j * CELL - pz) < 0.6) j += fz > 0 ? 1 : -1;
      }
    } else {
      const reach = lookingDown ? 0 : 2.6;
      i = Math.floor((px + fx * reach) / CELL);
      j = Math.floor((pz + fz * reach) / CELL);
      if (piece === 'ramp') {
        const base = domX ? (fx > 0 ? 0 : 2) : fz > 0 ? 1 : 3;
        orient = (base + p.buildRot) % 4;
      }
    }
    const key = structureKey(piece, i, k, j, orient);
    const pl = { piece, i, k, j, orient, key, valid: true, reason: '' };
    if (this.byKey.has(key)) {
      pl.valid = false;
      pl.reason = '';
      return pl;
    }
    if (p.mats[p.buildMat] < BUILD_COST) {
      pl.valid = false;
      pl.reason = `Not enough ${MATERIALS[p.buildMat].name.toLowerCase()}`;
      return pl;
    }
    // bounds of the would-be piece
    const y0 = k * CELL;
    let bounds;
    if (piece === 'wall') {
      bounds = orient === 0
        ? { minX: i * CELL - WALL_T / 2, maxX: i * CELL + WALL_T / 2, minY: y0, maxY: y0 + CELL, minZ: j * CELL, maxZ: (j + 1) * CELL }
        : { minX: i * CELL, maxX: (i + 1) * CELL, minY: y0, maxY: y0 + CELL, minZ: j * CELL - WALL_T / 2, maxZ: j * CELL + WALL_T / 2 };
    } else if (piece === 'floor') {
      bounds = { minX: i * CELL, maxX: (i + 1) * CELL, minY: y0 - 0.1, maxY: y0 + 0.2, minZ: j * CELL, maxZ: (j + 1) * CELL };
    } else {
      bounds = { minX: i * CELL, maxX: (i + 1) * CELL, minY: y0, maxY: y0 + CELL, minZ: j * CELL, maxZ: (j + 1) * CELL };
    }
    pl.bounds = bounds;
    const world = this.game.world;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minZ + bounds.maxZ) / 2;
    const terrainC = world.heightAt(cx, cz);
    if (terrainC > bounds.maxY - 0.8) {
      pl.valid = false;
      pl.reason = 'Blocked by terrain';
      return pl;
    }
    // support: touches ground or another structure
    const grounded = this.isGrounded({ bounds });
    if (!grounded) {
      const near = world.query(bounds.minX - 0.6, bounds.minZ - 0.6, bounds.maxX + 0.6, bounds.maxZ + 0.6, []);
      const supported = near.some((s) => s.kind === 'structure' && aabbIntersects(bounds, s.bounds, 0.35));
      if (!supported) {
        pl.valid = false;
        pl.reason = 'Needs support';
        return pl;
      }
    }
    // don't trap the player inside a slab
    if (piece !== 'wall') {
      const r = p.radius;
      const overlaps = px + r > bounds.minX && px - r < bounds.maxX && pz + r > bounds.minZ && pz - r < bounds.maxZ;
      if (overlaps && bounds.maxY > p.pos.y + p.step && bounds.minY < p.pos.y + p.height) {
        pl.valid = false;
        pl.reason = 'Move out of the way';
        return pl;
      }
    }
    return pl;
  }

  showGhost(pl) {
    const g = this.ghost;
    for (const m of Object.values(g.meshes)) m.visible = false;
    g.group.visible = true;
    const mat = pl.valid ? g.okMat : g.badMat;
    const y0 = pl.k * CELL;
    let mesh;
    if (pl.piece === 'wall') {
      mesh = pl.orient === 0 ? g.meshes.wallZ : g.meshes.wallX;
      if (pl.orient === 0) mesh.position.set(pl.i * CELL, y0 + CELL / 2, pl.j * CELL + CELL / 2);
      else mesh.position.set(pl.i * CELL + CELL / 2, y0 + CELL / 2, pl.j * CELL);
    } else if (pl.piece === 'floor') {
      mesh = g.meshes.floor;
      mesh.position.set(pl.i * CELL + CELL / 2, y0 + 0.05, pl.j * CELL + CELL / 2);
    } else {
      const alongX = pl.orient === 0 || pl.orient === 2;
      mesh = alongX ? g.meshes.rampX : g.meshes.rampZ;
      mesh.position.set(pl.i * CELL + CELL / 2, y0 + CELL / 2 - 0.12, pl.j * CELL + CELL / 2);
      mesh.rotation.set(0, 0, 0);
      if (pl.orient === 0) mesh.rotation.z = Math.PI / 4;
      else if (pl.orient === 2) mesh.rotation.z = -Math.PI / 4;
      else if (pl.orient === 1) mesh.rotation.x = -Math.PI / 4;
      else mesh.rotation.x = Math.PI / 4;
    }
    mesh.material = mat;
    mesh.visible = true;
  }

  place(pl, p) {
    const solid = createStructure(pl.piece, pl.i, pl.k, pl.j, pl.orient, p.buildMat, 'solid', true);
    if (!this.addStructure(solid)) return false;
    p.mats[p.buildMat] -= BUILD_COST;
    this.builtCount++;
    this.game.audio.play('build');
    const b = solid.bounds;
    this.game.effects.burst(new THREE.Vector3((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, (b.minZ + b.maxZ) / 2), MATERIALS[p.buildMat].color, 6, 2, 4, 0.3);
    // nudge bots out of freshly placed walls
    this.game.bots.onStructurePlaced(solid);
    return true;
  }

  /** Bots drop a wall between themselves and a threat. */
  botPlaceWall(bot, tx, tz, material = 'wood') {
    const dx = tx - bot.pos.x;
    const dz = tz - bot.pos.z;
    const k = Math.floor((bot.pos.y + 1.2) / CELL);
    let i;
    let j;
    let orient;
    if (Math.abs(dx) >= Math.abs(dz)) {
      orient = 0;
      i = dx > 0 ? Math.ceil(bot.pos.x / CELL) : Math.floor(bot.pos.x / CELL);
      j = Math.floor(bot.pos.z / CELL);
      if (Math.abs(i * CELL - bot.pos.x) < 0.6) i += dx > 0 ? 1 : -1;
    } else {
      orient = 1;
      j = dz > 0 ? Math.ceil(bot.pos.z / CELL) : Math.floor(bot.pos.z / CELL);
      i = Math.floor(bot.pos.x / CELL);
      if (Math.abs(j * CELL - bot.pos.z) < 0.6) j += dz > 0 ? 1 : -1;
    }
    const key = structureKey('wall', i, k, j, orient);
    if (this.byKey.has(key)) return false;
    const solid = createStructure('wall', i, k, j, orient, material, 'solid', true);
    if (this.game.world.heightAt(solid.centerX, solid.centerZ) > solid.bounds.maxY - 1) return false;
    if (!this.isGrounded(solid)) return false;
    this.addStructure(solid);
    this.game.audio.play('build', 0.5);
    return true;
  }
}
