import * as THREE from 'three';
import { ROOMS, OPENINGS, FLOOR_Y } from '../map/layout.js';
import { SURFACE } from '../physics/world.js';
import { assets } from '../core/assets.js';
import { Rng } from '../core/rng.js';
import { settings } from '../core/settings.js';
import { bus, EVT } from '../core/events.js';
import {
  PROP_FACTORIES, monitor24, whiteboard, deptSign, roomPlate, wayfindSign,
  tapedNotice, coatOnHook, safetyPoster,
} from './library.js';

// ---------------------------------------------------------------------------
// Prop populator.  (owner: fable3)
//
// Dresses every room in map/layout.js with the factory props from library.js,
// registers their collision proxies, and exposes the five mission
// interactables (terminal / keycard / garage control / supplies / monitors).
//
// Conventions used throughout:
//  * yaw is the direction the prop FACES (its local +Z): S=0, E=PI/2, N=PI,
//    W=-PI/2.  Desks face their user; chairs face where the sitter looks.
//  * Wall-mounted props pivot on the wall plane. Interior walls are 0.10 m
//    thick (face 0.05 m off the centre-line), exteriors 0.24 m; WOFF/XOFF
//    leave a 2 mm air gap so nothing z-fights the wall.
//  * Placements under the same batch key are merged into InstancedMesh
//    batches when the key is used more than ~12 times; smaller groups are
//    cloned from the same cached geometry/materials.
//  * Small clutter is probabilistically culled by settings.quality.propDensity
//    unless flagged essential (storytelling set-pieces always survive).
// ---------------------------------------------------------------------------

const S = 0;               // faces +Z (south)
const E = Math.PI / 2;     // faces +X (east)
const N = Math.PI;         // faces -Z (north)
const W = -Math.PI / 2;    // faces -X (west)

const WOFF = 0.07;         // interior wall face offset from the centre-line
const XOFF = 0.13;         // exterior wall face offset

const DESK_H = 0.735;      // standard / exec desk worktop height
const RECEP_H = 0.734;     // reception staff worktop
const CONF_H = 0.77;       // conference table top
const BREAK_H = 0.735;     // round break table
const SIDE_H = 0.482;      // side table top
const COUNTER_H = 0.92;    // kitchen countertop
const FILE4_H = 1.32;      // 4-drawer filing cabinet top
const FILE2_H = 0.72;      // 2-drawer filing cabinet top
const COPIER_H = 0.978;    // copier scanner lid

const INSTANCE_MIN = 13;   // "more than ~12" -> InstancedMesh

/** Traversable openings that must keep a 1 m clear radius. */
const CLEAR_TYPES = new Set(['door', 'doubledoor', 'arch', 'shutter', 'passthrough']);

function openingSegments() {
  const segs = [];
  for (const o of OPENINGS) {
    if (!CLEAR_TYPES.has(o.type)) continue;
    const h = o.width / 2;
    if (o.axis === 'x') segs.push({ floor: o.floor, x0: o.at - h, z0: o.coord, x1: o.at + h, z1: o.coord, id: o.id });
    else segs.push({ floor: o.floor, x0: o.coord, z0: o.at - h, x1: o.coord, z1: o.at + h, id: o.id });
  }
  return segs;
}

/** Distance between an axis-aligned box (centre + half extents) and a segment. */
function boxToSegment(cx, cz, hw, hd, seg) {
  let best = Infinity;
  for (let i = 0; i <= 6; i++) {
    const t = i / 6;
    const px = seg.x0 + (seg.x1 - seg.x0) * t;
    const pz = seg.z0 + (seg.z1 - seg.z0) * t;
    const dx = Math.max(0, Math.abs(px - cx) - hw);
    const dz = Math.max(0, Math.abs(pz - cz) - hd);
    best = Math.min(best, Math.hypot(dx, dz));
  }
  return best;
}

export class PropPopulator {
  constructor(scene, collision, level) {
    this.scene = scene;
    this.collision = collision;
    this.level = level;
    this.group = new THREE.Group();
    this.group.name = 'props';

    this.rng = new Rng('props');
    this.density = settings.quality?.propDensity ?? 1;

    /** @type {Map<string, {id:string, factory:Function, places:Array}>} */
    this._batches = new Map();
    this._templates = new Map();
    this._uid = 0;

    this._interactables = [];
    this._openSegs = openingSegments();

    this.stats = {
      props: 0,
      culled: 0,
      collisionBoxes: 0,
      instancedBatches: 0,   // InstancedMesh objects created
      instancedGroups: 0,    // distinct batch keys that got instanced
      warnings: 0,
    };
  }

  // ------------------------------------------------------------------ utils

  /** Jitter helper: uniform in [-a, a]. */
  _j(a) {
    return this.rng.range(-a, a);
  }

  _template(key, factory) {
    if (!this._templates.has(key)) this._templates.set(key, factory());
    return this._templates.get(key);
  }

  /** Rotate a prop-local (lx, lz) offset by yaw into world deltas. */
  static _rot(lx, lz, yaw) {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return [lx * c + lz * s, -lx * s + lz * c];
  }

  /** World point offset from an anchor prop at (x, z, yaw). */
  off(x, z, yaw, lx, lz) {
    const [dx, dz] = PropPopulator._rot(lx, lz, yaw);
    return [x + dx, z + dz];
  }

  /**
   * Place one prop.
   * @param {string} id       asset id (in PROP_FACTORIES unless o.factory given)
   * @param {number} x @param {number} z  world position of the base pivot
   * @param {number} yaw      facing (local +Z direction)
   * @param {object} o        options:
   *   floor 'ground'|'upper', dy vertical offset (desk tops, wall heights),
   *   factory custom thunk, key batch key override, clutter+essential density
   *   culling, collide:false to skip collision, pose(group, rng) for tipped
   *   storytelling poses (forces an individual mesh, skips auto collision),
   *   ref:true to force an individual mesh and return the group.
   */
  place(id, x, z, yaw = 0, o = {}) {
    if (o.clutter && !o.essential && this.rng.float() > this.density) {
      this.stats.culled++;
      return null;
    }
    const floor = o.floor || 'ground';
    const fy = FLOOR_Y[floor] + (o.dy || 0);
    const factory = o.factory || PROP_FACTORIES[id];
    if (!factory) {
      console.warn(`[props] no factory for asset id "${id}"`);
      this.stats.warnings++;
      return null;
    }
    const key = o.key || (o.factory ? `${id}#u${this._uid++}` : id);

    let group = null;
    if (o.pose || o.ref) {
      group = factory();
      group.position.set(x, fy, z);
      group.rotation.y = yaw;
      if (o.pose) o.pose(group, this.rng);
      this.group.add(group);
      assets.tag(group, o.tag || id);
    } else {
      if (!this._batches.has(key)) this._batches.set(key, { id: o.tag || id, factory, places: [] });
      this._batches.get(key).places.push({ x, y: fy, z, yaw });
    }
    this.stats.props++;

    if (o.collide !== false && !o.pose) {
      const tpl = group || this._template(key, factory);
      this._collide(tpl, x, fy, z, yaw, o.tag || id, floor);
    }
    return group;
  }

  /** Register a prop's local collision boxes, rotated about Y into the world. */
  _collide(tpl, x, fy, z, yaw, tag, floor) {
    const boxes = tpl.userData?.collision || [];
    const base = FLOOR_Y[floor];
    for (const b of boxes) {
      const [lx, ly, lz] = b.pos;
      const [w, h, d] = b.size;
      const [dx, dz] = PropPopulator._rot(lx, lz, yaw);
      const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
      const ew = w * c + d * s;
      const ed = w * s + d * c;
      this.collision.addBox({
        pos: [x + dx, fy + ly, z + dz],
        size: [ew, h, ed],
        surface: b.surface || SURFACE.WOOD,
        tag,
        blocksSight: fy + ly + h / 2 - base >= 1.5,
      });
      this.stats.collisionBoxes++;
      this._checkClear(x + dx, z + dz, floor, ew / 2, ed / 2, tag);
    }
  }

  /** Dev sanity check: warn when a collidable prop crowds a doorway. */
  _checkClear(cx, cz, floor, hw, hd, tag) {
    for (const seg of this._openSegs) {
      if (seg.floor !== floor) continue;
      if (boxToSegment(cx, cz, hw, hd, seg) < 0.98) {
        console.warn(`[props] "${tag}" is within 1 m of opening ${seg.id} at (${cx.toFixed(2)}, ${cz.toFixed(2)})`);
        this.stats.warnings++;
        return;
      }
    }
  }

  /** Manually register a collision box (for posed / tipped props). */
  _box(x, y, z, w, h, d, surface, tag) {
    this.collision.addBox({ pos: [x, y, z], size: [w, h, d], surface, tag, blocksSight: false });
    this.stats.collisionBoxes++;
  }

  // ----------------------------------------------------------- interactables

  _addInteractable(def) {
    const it = {
      key: 'E',
      radius: 2.2,
      once: false,
      used: false,
      enabled: true,
      cooldownUntil: 0,
      ...def,
      position: def.position instanceof THREE.Vector3
        ? def.position
        : new THREE.Vector3().fromArray(def.position),
    };
    this._interactables.push(it);
    return it;
  }

  findInteractable(eye, dir, playerPos) {
    if (!eye || !dir) return null;
    let best = null;
    const v = new THREE.Vector3();
    for (const it of this._interactables) {
      if (!it.enabled || (it.once && it.used)) continue;
      if (it.cooldownUntil && Date.now() < it.cooldownUntil) continue;
      v.subVectors(it.position, eye);
      const dist = v.length();
      if (dist > it.radius) continue;
      const dot = v.normalize().dot(dir);
      // Either roughly under the crosshair, or close enough to grab blind.
      if (dot < 0.82 && dist > 1.0) continue;
      const score = dist * (1.7 - dot);
      if (!best || score < best.score) {
        best = {
          kind: it.kind,
          id: it.id,
          distance: dist,
          score,
          label: it.label,
          key: it.key,
          activate: (game) => this._activate(it, game),
        };
      }
    }
    return best;
  }

  interactablesNear(pos, radius = 4) {
    const p = pos instanceof THREE.Vector3 ? pos : new THREE.Vector3().fromArray(pos);
    const out = [];
    for (const it of this._interactables) {
      if (!it.enabled || (it.once && it.used)) continue;
      const dist = it.position.distanceTo(p);
      if (dist > radius) continue;
      out.push({
        id: it.id,
        kind: it.kind,
        label: it.label,
        position: it.position.toArray(),
        distance: +dist.toFixed(2),
      });
    }
    out.sort((a, b) => a.distance - b.distance);
    return out;
  }

  _activate(it, game) {
    if (!it.enabled || (it.once && it.used)) return;
    if (it.cooldownUntil && Date.now() < it.cooldownUntil) return;
    it.used = true;
    try {
      it.onActivate?.(game, it);
    } catch (err) {
      console.error(`[props] interactable "${it.id}" failed to activate`, err);
    }
    bus.emit(EVT.INTERACT, { kind: it.kind, id: it.id, label: it.label, position: it.position.toArray() });
  }

  /** Restore mission state: keycard back on the bench, supplies unspent... */
  reset() {
    for (const it of this._interactables) {
      it.used = false;
      it.enabled = true;
      it.cooldownUntil = 0;
      it.onReset?.(it);
    }
    return this;
  }

  // ---------------------------------------------------------------- populate

  populate() {
    this._exteriors();
    this._entrance();
    this._vestibule();
    this._lobby();
    this._waiting();
    this._stairwells();
    this._eastlink();
    this._openOffice();
    this._conference();
    this._breakroom();
    this._restrooms();
    this._midcorr();
    this._janitor();
    this._copyroom();
    this._itroom();
    this._serverroom();
    this._mechanical();
    this._servicecorr();
    this._loading();
    this._garage();
    this._upperLanding();
    this._execCorr();
    this._execOffice();
    this._archive();
    this._ceilingFixtures();

    this._buildBatches();
    this.scene.add(this.group);

    console.info(
      `[props] placed ${this.stats.props} props (${this.stats.culled} culled @density ${this.density}), ` +
      `${this.stats.instancedGroups} instanced prop types / ${this.stats.instancedBatches} InstancedMesh batches, ` +
      `${this.stats.collisionBoxes} collision boxes, ${this._interactables.length} interactables, ` +
      `${this.stats.warnings} placement warnings`
    );
    return this;
  }

  /** Materialise deferred placements: InstancedMesh when count > ~12. */
  _buildBatches() {
    const m4 = new THREE.Matrix4();
    const local = new THREE.Matrix4();
    for (const [key, batch] of this._batches) {
      const n = batch.places.length;
      if (n >= INSTANCE_MIN) {
        const tpl = this._template(key, batch.factory);
        tpl.updateMatrixWorld(true);
        const parts = [];
        tpl.traverse((o) => { if (o.isMesh) parts.push(o); });
        let firstIm = null;
        for (const part of parts) {
          const im = new THREE.InstancedMesh(part.geometry, part.material, n);
          im.name = `inst:${key}`;
          local.copy(part.matrixWorld);
          for (let i = 0; i < n; i++) {
            const p = batch.places[i];
            m4.makeRotationY(p.yaw);
            m4.setPosition(p.x, p.y, p.z);
            m4.multiply(local);
            im.setMatrixAt(i, m4);
          }
          im.instanceMatrix.needsUpdate = true;
          im.castShadow = part.castShadow;
          im.receiveShadow = part.receiveShadow;
          this.group.add(im);
          assets.tag(im, batch.id);
          firstIm = firstIm || im;
          this.stats.instancedBatches++;
        }
        // Bring the registry's instance count up to the real placement count.
        for (let i = parts.length; i < n; i++) assets.tag(firstIm, batch.id);
        this.stats.instancedGroups++;
      } else {
        for (const p of batch.places) {
          const g = batch.factory();
          g.position.set(p.x, p.y, p.z);
          g.rotation.y = p.yaw;
          this.group.add(g);
          assets.tag(g, batch.id);
        }
      }
    }
  }

  // ------------------------------------------------------- shared assemblies

  /** Desk + chair + monitor + peripherals. */
  _workstation(x, z, yaw, o = {}) {
    const floor = o.floor || 'ground';
    this.place('PROP-DESK-STD', x, z, yaw, { floor });
    if (!o.noChair) {
      const [cx, cz] = this.off(x, z, yaw, this._j(0.18), 0.72 + this._j(0.15));
      this.place('PROP-CHAIR-TASK', cx, cz, yaw + N + this._j(o.messy ? 0.9 : 0.35), { floor });
    }
    if (o.dual) {
      const [mx, mz] = this.off(x, z, yaw, this._j(0.05), -0.22);
      this.place('ELEC-MONITOR-DUAL', mx, mz, yaw, { floor, dy: DESK_H, collide: false });
    } else {
      this._monitor(x, z, yaw, o.content || 'os', floor);
    }
    const [kx, kz] = this.off(x, z, yaw, this._j(0.06), 0.12);
    this.place('ELEC-KEYBOARD', kx, kz, yaw + this._j(0.08), { floor, dy: DESK_H, collide: false });
    const [px, pz] = this.off(x, z, yaw, 0.32, 0.1);
    this.place('ELEC-MOUSEPAD', px, pz, yaw, { floor, dy: DESK_H, collide: false, clutter: true });
    this.place('ELEC-MOUSE', px + this._j(0.04), pz + this._j(0.04), yaw + this._j(0.5), { floor, dy: DESK_H + 0.004, collide: false, clutter: true });
    if (o.tower) {
      const [tx, tz] = this.off(x, z, yaw, 0.58, 0.18);
      this.place('ELEC-TOWER', tx, tz, yaw, { floor });
    }
    if (o.pedestal) {
      const [dx2, dz2] = this.off(x, z, yaw, -0.56, 0.08);
      this.place('PROP-PEDESTAL', dx2, dz2, yaw, { floor });
    }
    if (o.phone) {
      const [fx, fz] = this.off(x, z, yaw, -0.52, -0.18);
      this.place('ELEC-PHONE', fx, fz, yaw + this._j(0.3), { floor, dy: DESK_H, collide: false, clutter: true });
    }
  }

  /** A 24" monitor at the back of a desk anchored at (x, z, yaw). */
  _monitor(x, z, yaw, content, floor = 'ground') {
    const [mx, mz] = this.off(x, z, yaw, this._j(0.15), -0.24);
    if (content === 'off') {
      this.place('ELEC-MONITOR-24-OFF', mx, mz, yaw + this._j(0.12), { floor, dy: DESK_H, collide: false });
    } else {
      this.place('ELEC-MONITOR-24', mx, mz, yaw + this._j(0.12), {
        floor, dy: DESK_H, collide: false,
        key: `ELEC-MONITOR-24:${content}`,
        factory: () => monitor24(content),
      });
    }
  }

  /** Sprinkle believable desk clutter around a worktop anchor. */
  _deskClutter(x, z, yaw, h, list, floor = 'ground') {
    for (const [id, lx, lz, extraYaw = 0, dy = 0] of list) {
      const [wx, wz] = this.off(x, z, yaw, lx, lz);
      this.place(id, wx, wz, yaw + extraYaw + this._j(0.4), { floor, dy: h + dy, collide: false, clutter: true });
    }
  }

  // ------------------------------------------------------------------ rooms

  _exteriors() {
    // Courtyard: bollards flank the entrance walk, drifted cones by the lot.
    for (const sx of [-1, 1]) {
      this.place('MAINT-BOLLARD', sx * 2.35, -17.15, 0, {});
      this.place('MAINT-BOLLARD', sx * 2.35, -18.6, 0, {});
    }
    this.place('MAINT-CONE', -7.5 + this._j(0.3), -19.5 + this._j(0.3), this._j(3), { collide: false });
    this.place('MAINT-CONE', -8.4 + this._j(0.3), -20.6 + this._j(0.3), this._j(3), { collide: false });
    // East apron: pallet stack in the snow, bollards guarding the shutter.
    this.place('MAINT-PALLET', 29.4, 7.6, this._j(0.4), {});
    this.place('MAINT-PALLET', 29.42, 7.58, 0.22, { dy: 0.15 });
    for (const sz of [-1, 1]) this.place('MAINT-BOLLARD', 28.1, 12.5 + sz * 3.3, 0, {});
    this.place('MAINT-CRATE', 33.4, 17.6, this._j(0.4), {});
  }

  _entrance() {
    // Walk-off mats straight through; snow gets tracked in anyway.
    this.place('MAINT-FLOORMAT', 0, -15.1, this._j(0.05), { collide: false });
    this.place('MAINT-FLOORMAT', 0, -13.85, this._j(0.05), { collide: false });
    this.place('MAINT-WETFLOOR', 1.55, -14.4, this._j(0.8), { collide: false, essential: true });
    this.place('CLUT-UMBRELLA', -4.55, -13.1, 0.9, { collide: false, clutter: true, essential: true });
    this.place('BREAK-BIN-TRASH', 4.45, -15.4, this._j(0.4), {});
    this.place('SIGN-PICTO-EXIT', 0, -12.5 - XOFF, N, { dy: 2.42, collide: false });
  }

  _vestibule() {
    // Guard desk on the east side, monitors watching the doors.
    const dx = 5.55, dz = -10.5;
    this.place('PROP-DESK-STD', dx, dz, E, {});
    this.place('PROP-CHAIR-TASK', 6.32, -10.42, W + this._j(0.3), {});
    const bank = this.place('ELEC-SECMONITORS', dx + 0.02, dz, W, { dy: DESK_H, ref: true });
    this._deskClutter(dx, dz, E, DESK_H, [
      ['ELEC-HEADSET', -0.55, 0.22],
      ['BREAK-CUP-PAPER', -0.62, -0.2],
      ['CLUT-NOTEBOOK', 0.55, 0.25],
      ['CLUT-PEN', 0.52, 0.1],
    ]);
    this.place('ELEC-PHONE', 5.62, -9.85, W, { dy: DESK_H, collide: false });

    // Interactable: the CCTV bank briefly marks nearby hostiles.
    this._addInteractable({
      kind: 'monitors',
      id: 'int-monitors',
      label: 'CHECK SECURITY MONITORS',
      position: [dx, FLOOR_Y.ground + DESK_H + 0.45, dz],
      radius: 2.4,
      onActivate: (game, it) => {
        game?.enemies?.revealAll?.(8);
        game?.ui?.announce?.('CCTV: hostile positions marked');
        it.used = false;                        // reusable, but on a cooldown
        it.cooldownUntil = Date.now() + 9000;
      },
    });
    if (bank) bank.userData.interactable = 'int-monitors';

    this.place('MAINT-FLOORMAT', 0, -11.7, 0, { collide: false });
    // Card readers taped over by whoever released the doors this morning.
    for (const sx of [-1, 1]) {
      this.place('SIGN-NOTICE-TAPED', sx * 2.2 + 0.75, -8.5 - WOFF, N, {
        dy: 1.35, collide: false,
        key: `SIGN-NOTICE-TAPED:reader${sx}`,
        factory: () => tapedNotice('READER OFFLINE', 'doors released — security desk', sx + 2),
      });
    }
    this.place('SIGN-NOTICE-SEC', -6, -12.5 + XOFF, S, { dy: 1.5, collide: false });
    this.place('SIGN-EVAC-DIAGRAM', -3.4, -12.5 + XOFF, S, { dy: 1.45, collide: false });
    this.place('ELEC-CLOCK', 0, -8.5 - WOFF, N, { dy: 2.35, collide: false });
    this.place('CLUT-COAT-HOOK', -6.93, -8.95, E, {
      dy: 1.55, collide: false, essential: true,
      key: 'CLUT-COAT-HOOK:vest', factory: () => coatOnHook(1),
    });
    this.place('BREAK-BIN-RECYCLE', -6.5, -11.9, this._j(0.4), {});
  }

  _lobby() {
    // Reception desk faces the entrance doors.
    const rx = -4.2, rz = -2.3;
    this.place('PROP-DESK-RECEPTION', rx, rz, N, {});
    this.place('PROP-CHAIR-TASK', rx + 0.35, rz + 1.15, N + this._j(0.4), {});
    // The staff worktop sits on the desk's local -Z side -> world south.
    const [wx, wz] = this.off(rx, rz, N, 0, -0.55);
    const term = this.place('ELEC-MONITOR-24', wx - 0.25, wz - 0.05, N, {
      dy: RECEP_H, collide: false, ref: true,
      key: 'ELEC-MONITOR-24:recep', factory: () => monitor24('intel'),
    });
    this.place('ELEC-KEYBOARD', wx - 0.22, wz + 0.28, N + this._j(0.06), { dy: RECEP_H, collide: false });
    this.place('ELEC-PHONE', wx + 0.55, wz + 0.05, N + 0.3, { dy: RECEP_H, collide: false });
    this._deskClutter(wx, wz, N, RECEP_H, [
      ['CLUT-STICKY', 0.28, 0.25],
      ['CLUT-CLIPSDISH', 0.75, -0.1],
      ['CLUT-PAPERSTACK', 0.95, 0.2],
    ]);
    // "Back in 5" tent card on the visitor counter, brochures beside it.
    const [tcx, tcz] = this.off(rx, rz, N, 0.15, 1.28);
    this.place('CLUT-TENTCARD', tcx, tcz, N + this._j(0.15), { dy: 1.1, collide: false, essential: true });
    this.place('CLUT-BROCHURE', tcx - 0.7, tcz + 0.12, N + this._j(0.5), { dy: 1.1, collide: false, clutter: true });

    // Interactable: reception terminal reveals hostage intel.
    this._addInteractable({
      kind: 'terminal',
      id: 'int-terminal',
      label: 'ACCESS RECEPTION TERMINAL',
      position: [wx - 0.25, FLOOR_Y.ground + RECEP_H + 0.36, wz - 0.05],
      radius: 2.2,
      once: true,
      onActivate: (game) => {
        game?.director?.revealIntel?.();
        game?.ui?.announce?.('Visitor log: hostage locations pulled from the schedule');
      },
    });
    if (term) term.userData.interactable = 'int-terminal';

    // Brand wall behind reception.
    this.place('SIGN-LOGO', -4.2, -WOFF, N, { dy: 2.7, collide: false });

    // Seating nook along the north curtain wall.
    this.place('PROP-SOFA-3', -6.0, -7.85, S + this._j(0.04), {});
    this.place('PROP-TABLE-SIDE', -4.45, -7.8, this._j(1), {});
    this.place('CLUT-BROCHURE', -4.45, -7.8, this._j(2), { dy: SIDE_H, collide: false, clutter: true });
    this.place('CLUT-CAN', -4.35, -7.68, this._j(2), { dy: SIDE_H, collide: false, clutter: true });
    this.place('CLUT-PLANT-FICUS', -10.35, -0.7, this._j(2), {});
    this.place('CLUT-PLANT-FICUS', 9.3, -7.9, this._j(2), {});

    // The evacuation left a mess: toppled chair, dropped coffee, loose paper.
    this.place('PROP-CHAIR-SLED', -1.4, -5.3, 0, {
      essential: true, collide: false,
      pose: (g) => {
        g.rotation.set(0, 0.7, Math.PI / 2 - 0.08);
        g.position.y += 0.27;
      },
    });
    this._box(-1.4, FLOOR_Y.ground + 0.25, -5.3, 0.95, 0.5, 0.6, SURFACE.FABRIC, 'PROP-CHAIR-SLED');
    this.place('BREAK-CUP-PAPER', -2.15, -4.6, 0, {
      essential: true, collide: false,
      pose: (g) => { g.rotation.set(Math.PI / 2, 0, 1.2); g.position.y += 0.04; },
    });
    for (let i = 0; i < 4; i++) {
      this.place('CLUT-PAPER', -1.0 + this._j(1.4), -4.4 + this._j(1.2), this._j(3), { collide: false, clutter: true, essential: i < 2 });
    }

    // Wayfinding and safety furniture near the stair arch.
    this.place('SIGN-WAYFIND', 10.2, -WOFF, N, {
      dy: 1.62, collide: false,
      key: 'SIGN-WAYFIND:lobby',
      factory: () => wayfindSign([['RECEPTION', 'W'], ['OPEN OFFICE', 'S'], ['CONFERENCE', 'E'], ['EXECUTIVE SUITE', 'U']]),
    });
    this.place('SIGN-EVAC-DIAGRAM', 3.6, -8.5 + XOFF, S, { dy: 1.45, collide: false });
    // On the pier between the stair arch (z ends -2.6) and the east-link arch
    // (z starts -1.9) — the old spot is inside the relocated east-link arch.
    this.place('MAINT-EXTINGUISHER', 11 - WOFF, -2.25, W, { dy: 0.75, collide: false });
    this.place('BREAK-BIN-TRASH', 6.8, -8.05, this._j(0.4), {});
    this.place('ELEC-CLOCK', 4.2, -WOFF, N, { dy: 2.5, collide: false });
  }

  _waiting() {
    // Two facing rows of sled chairs with a low table off to the side.
    for (let i = 0; i < 3; i++) {
      this.place('PROP-CHAIR-SLED', -17.3 + i * 1.05 + this._j(0.06), -7.75 + this._j(0.05), S + this._j(0.12), {});
    }
    for (let i = 0; i < 2; i++) {
      this.place('PROP-CHAIR-SLED', -17.0 + i * 1.05 + this._j(0.06), -4.45 + this._j(0.06), N + this._j(0.14), {});
    }
    this.place('PROP-TABLE-SIDE', -14.6, -6.1, this._j(1), {});
    this.place('CLUT-BROCHURE', -14.6, -6.1, this._j(2), { dy: SIDE_H, collide: false, clutter: true });
    this.place('CLUT-BOTTLE', -14.5, -5.98, 0, { dy: SIDE_H, collide: false, clutter: true });
    this.place('CLUT-PLANT-FICUS', -18.4, -1.7, this._j(2), {});
    this.place('CLUT-PLANT-SNAKE', -12.0, -7.9, this._j(2), { collide: false });
    // A visitor left in a hurry: briefcase under a chair, dropped page.
    this.place('CLUT-BRIEFCASE', -16.9, -7.55, 0.5, { collide: false, essential: true });
    this.place('CLUT-PAPER', -15.8, -5.4, this._j(3), { collide: false, clutter: true });
    this.place('SIGN-DEPT', -13.2, -8.5 + XOFF, S, {
      dy: 2.1, collide: false,
      key: 'SIGN-DEPT:waiting', factory: () => deptSign('VISITOR WAITING', 'ESCORT REQUIRED BEYOND THIS POINT'),
    });
    this.place('SIGN-NOTICE-EMP', -19 + WOFF, -7.3, E, { dy: 1.5, collide: false });
    // East of the north window (glass spans x -16.5..-13.5, head 2.45).
    this.place('ELEC-CLOCK', -12.3, -8.5 + XOFF, S, { dy: 2.3, collide: false });
  }

  _stairwells() {
    // West service stair: bare concrete, emergency fittings only.
    this.place('MAINT-EXTINGUISHER', -19 - WOFF, -7.6, W, { dy: 0.75, collide: false });
    this.place('SIGN-EMERG-PLACARD', -19 - WOFF, -4.2, W, { dy: 1.45, collide: false });
    this.place('SIGN-PICTO-EXIT', -19 - WOFF, -5.5, W, { dy: 2.3, collide: false });
    this.place('MAINT-CONE', -22.55, -1.35, this._j(2), { collide: false });
    // Upper stair head.
    this.place('SIGN-PICTO-EXIT', -19 - WOFF, -2.4, W, { floor: 'upper', dy: 2.3, collide: false });
    this.place('SIGN-EMERG-PLACARD', -21, -XOFF, N, { floor: 'upper', dy: 1.45, collide: false });

    // Central stair hall: a plant pocket under the flight, wayfinding.
    this.place('CLUT-PLANT-FICUS', 17.25, -7.9, this._j(2), {});
    this.place('MAINT-EXTINGUISHER', 18 - WOFF, -3.0, W, { dy: 0.75, collide: false });
    this.place('SIGN-WAYFIND', 11.6, -8.5 + XOFF, S, {
      dy: 1.62, collide: false, key: 'SIGN-WAYFIND:stair',
      factory: () => wayfindSign([['EXECUTIVE SUITE', 'U'], ['LOBBY', 'W'], ['CONFERENCE', 'S']]),
    });
  }

  _eastlink() {
    this.place('CLUT-PLANT-SNAKE', 19.5, -1.55, this._j(2), { collide: false });
    this.place('SIGN-NOTICE-EMP', 12.8, -2 + WOFF, S, { dy: 1.5, collide: false });
    this.place('SIGN-ROOMPLATE', 16.35, -WOFF, N, {
      dy: 1.5, collide: false, key: 'SIGN-ROOMPLATE:conf', factory: () => roomPlate('B-120', 'SUNFIELD ROOM'),
    });
  }

  // -------------------------------------------------------------- open office

  _openOffice() {
    const contents = ['sheet', 'mail', 'code', 'os', 'off', 'sheet', 'mail', 'off', 'code', 'os', 'mail', 'sheet', 'off', 'os'];
    let cube = 0;

    // ---- north run: 6 cubicles backing the lobby wall, opening south ------
    const northCells = [-11.6, -9.9, -8.2, -6.5, 3.6, 5.3];
    const northBounds = [[-12.45, -10.75, -9.05, -7.35, -5.65], [2.75, 4.45, 6.15]];
    for (const cx of northCells) {
      this.place('PROP-CUBE-PANEL-HIGH', cx, 0.58, S, {});
      this._cubicleDesk(cx, 1.02, S, contents[cube], cube);
      cube++;
    }
    for (const bounds of northBounds) {
      for (const bx of bounds) {
        this.place('PROP-CUBE-PANEL-LOW', bx, 1.43, E, {});
        this.place('PROP-CUBE-POST', bx, 2.28, 0, {});
      }
    }

    // ---- south island: 8 cubicles back-to-back on a shared spine ----------
    const islandCells = [-7.45, -5.75, -4.05, -2.35];
    const islandBounds = [-8.3, -6.6, -4.9, -3.2, -1.5];
    for (const cx of islandCells) {
      this.place('PROP-CUBE-PANEL-HIGH', cx, 6.5, S, {});
      this._cubicleDesk(cx, 6.06, N, contents[cube], cube);   // north-facing row
      cube++;
      this._cubicleDesk(cx, 6.94, S, contents[cube], cube);   // south-facing row
      cube++;
    }
    for (const bx of islandBounds) {
      this.place('PROP-CUBE-PANEL-LOW', bx, 5.72, E, {});
      this.place('PROP-CUBE-PANEL-LOW', bx, 7.28, E, {});
      this.place('PROP-CUBE-POST', bx, 4.92, 0, {});
      this.place('PROP-CUBE-POST', bx, 8.08, 0, {});
    }

    // ---- structural columns breaking the long aisle sightline -------------
    this.place('PROP-COLUMN', -0.42, 4.05, 0, {});
    this.place('PROP-COLUMN', -10.05, 4.6, 0, {});
    this.place('CLUT-UMBRELLA', -10.2, 4.35, 2.2, { collide: false, clutter: true });

    // ---- aisle cover: filing groups, water cooler, print bay --------------
    this.place('PROP-CAB-FILE-4', 1.35, 3.35, N + this._j(0.05), {});
    this.place('PROP-CAB-FILE-4', 1.85, 3.35, N + this._j(0.05), {});
    this.place('CLUT-PLANT-SNAKE', 1.6, 3.3, 0, { dy: FILE4_H, collide: false, clutter: true });
    this.place('PROP-CAB-FILE-2', -11.9, 3.6, S + this._j(0.08), {});
    this.place('PROP-CAB-FILE-2', -11.42, 3.6, S + this._j(0.08), {});
    this.place('CLUT-PAPERSTACK', -11.66, 3.62, this._j(1), { dy: FILE2_H, collide: false, clutter: true });

    // Print bay against the east wall, north of the conference glass line.
    this.place('ELEC-COPIER', 10.42, 7.65, W, {});
    this.place('ELEC-PAPERTRAY', 10.4, 7.3, W + this._j(0.2), { dy: COPIER_H, collide: false });
    this.place('SIGN-NOTICE-TAPED', 10.05, 7.75, W, {
      dy: 0.8, collide: false, essential: true,
      key: 'SIGN-NOTICE-TAPED:jam', factory: () => tapedNotice('PAPER JAM — DO NOT USE', 'IT ticket #4482 raised. Use copy room.', 9),
    });
    this.place('MAINT-BOX-M', 10.35, 8.55, this._j(0.4), {});
    this.place('MAINT-BOX-S', 10.35, 8.53, this._j(0.4), { dy: 0.35 });
    this.place('BREAK-WATERCOOLER', 10.55, 6.6, W, {});
    this.place('BREAK-CUP-PAPER', 10.35, 6.25, 0, { collide: false, clutter: true });
    this.place('BREAK-BIN-RECYCLE', 9.85, 8.5, this._j(0.5), {});

    // ---- storytelling: the half-erased Q4 plan, coats, a shoved chair -----
    this.place('ELEC-WHITEBOARD', -4.4, WOFF, S, {
      dy: 1.35, collide: false,
      key: 'ELEC-WHITEBOARD:q4', factory: () => whiteboard('q4', 'Q4 ROLLOUT — DO NOT ERASE'),
    });
    this.place('PROP-COATRACK', -3.1, 0.52, this._j(1), {});
    this.place('CLUT-BACKPACK', -6.65, 2.05, this._j(1.5), { collide: false, essential: true });

    this.place('PROP-CHAIR-TASK', -9.1, 3.4, 0, {
      essential: true, collide: false,
      pose: (g) => { g.rotation.set(-0.12, 2.2, Math.PI / 2 - 0.1); g.position.y += 0.3; },
    });
    this._box(-9.1, FLOOR_Y.ground + 0.26, 3.4, 1.0, 0.52, 0.62, SURFACE.FABRIC, 'PROP-CHAIR-TASK');
    // Dropped mug and a fan of paper by the lobby doors.
    this.place('BREAK-MUG', -0.8, 1.35, 0, {
      essential: true, collide: false,
      pose: (g, rng) => { g.rotation.set(Math.PI / 2, 0, rng.range(0, 3)); g.position.y += 0.045; },
    });
    for (let i = 0; i < 5; i++) {
      this.place('CLUT-PAPER', -0.2 + this._j(1.6), 1.7 + this._j(0.9), this._j(3), { collide: false, clutter: true, essential: i < 2 });
    }
    this.place('ELEC-CABLE-LOOSE', 2.6, 4.35, this._j(0.5), { collide: false, clutter: true });

    // Signage.
    this.place('SIGN-DEPT', 1.9, WOFF, S, {
      dy: 2.35, collide: false, key: 'SIGN-DEPT:openoffice', factory: () => deptSign('OPEN OFFICE', 'TEAMS B-100 — B-113'),
    });
    this.place('SIGN-PICTO-EXIT', 0, WOFF, S, { dy: 2.42, collide: false });
    this.place('ELEC-CLOCK', -3.0, 9 - WOFF, N, { dy: 2.45, collide: false });
    this.place('SIGN-NOTICE-EMP', -14 + WOFF, 4.6, E, { dy: 1.5, collide: false });
    this.place('MAINT-EXTINGUISHER', 9.55, 9 - WOFF, N, { dy: 0.75, collide: false });
  }

  /** One cubicle desk with its chair and seeded personal effects. */
  _cubicleDesk(cx, dz, faceYaw, content, idx) {
    this.place('PROP-DESK-STD', cx + this._j(0.03), dz, faceYaw, {});
    const [chx, chz] = this.off(cx, dz, faceYaw, this._j(0.2), 0.68 + this._j(0.18));
    this.place('PROP-CHAIR-TASK', chx, chz, faceYaw + N + this._j(0.7), {});
    this._monitor(cx, dz, faceYaw, content);
    const [kx, kz] = this.off(cx, dz, faceYaw, this._j(0.08), 0.13);
    this.place('ELEC-KEYBOARD', kx, kz, faceYaw + this._j(0.1), { dy: DESK_H, collide: false });
    const [px, pz] = this.off(cx, dz, faceYaw, 0.33, 0.1);
    this.place('ELEC-MOUSEPAD', px, pz, faceYaw, { dy: DESK_H, collide: false, clutter: true });
    this.place('ELEC-MOUSE', px + this._j(0.05), pz + this._j(0.05), faceYaw + this._j(0.6), { dy: DESK_H + 0.004, collide: false, clutter: true });
    if (idx % 3 === 0) {
      const [tx, tz] = this.off(cx, dz, faceYaw, 0.58, 0.2);
      this.place('ELEC-TOWER', tx, tz, faceYaw, {});
    } else {
      const [ddx, ddz] = this.off(cx, dz, faceYaw, -0.56, 0.1);
      this.place('PROP-PEDESTAL', ddx, ddz, faceYaw, {});
    }
    // Personal effects rotate per cubicle so no two feel stamped.
    const kit = [
      [['ELEC-PHONE', -0.5, -0.15], ['CLUT-STICKY', -0.3, 0.02], ['BREAK-MUG', 0.55, -0.1]],
      [['CLUT-PHOTOFRAME', -0.52, -0.22], ['CLUT-PAPERSTACK', 0.55, -0.18], ['CLUT-PEN', 0.2, 0.28]],
      [['CLUT-ORGANISER', -0.55, -0.2], ['CLUT-NOTEBOOK', 0.48, 0.18], ['CLUT-CAN', 0.62, -0.05]],
      [['ELEC-PHONE', 0.52, -0.18], ['CLUT-FOLDER', -0.5, 0.1], ['CLUT-STICKY', 0.3, -0.28]],
      [['CLUT-CALENDAR', -0.55, -0.25], ['BREAK-CUP-PAPER', 0.5, 0.05], ['CLUT-PENCIL', 0.1, 0.3]],
    ][idx % 5];
    this._deskClutter(cx, dz, faceYaw, DESK_H, kit);
    if (idx === 2) {
      // The child's drawing, pinned to the back panel above the monitor.
      const [ax, az] = this.off(cx, dz, faceYaw, 0.25, -0.42);
      this.place('CLUT-DRAWING', ax, az, faceYaw, { dy: 1.16, collide: false, essential: true });
    }
    if (idx === 7) {
      const [lx2, lz2] = this.off(cx, dz, faceYaw, -0.15, -0.1);
      this.place('ELEC-LAPTOP-CLOSED', lx2, lz2, faceYaw + this._j(0.2), { dy: DESK_H, collide: false });
    }
  }

  // -------------------------------------------------------------- conference

  _conference() {
    // Boat table, long axis north-south (local X rotated to face east).
    this.place('PROP-TABLE-CONF', 15.4, 3.5, E, {});
    // Chairs along both long sides + one at the head; one flat on the floor.
    for (const sx of [-1, 1]) {
      const count = sx > 0 ? 2 : 3;   // the hostage corner (SE) stays clear
      for (let i = 0; i < count; i++) {
        const cz = 2.45 + i * 1.05;
        this.place('PROP-CHAIR-CONF', 15.4 + sx * 0.95 + this._j(0.08), cz + this._j(0.08), (sx > 0 ? W : E) + this._j(0.3), {});
      }
    }
    this.place('PROP-CHAIR-CONF', 15.45 + this._j(0.06), 1.75 + this._j(0.05), S + this._j(0.25), {});
    this.place('PROP-CHAIR-CONF', 14.15, 5.35, 0, {
      essential: true, collide: false,
      pose: (g) => { g.rotation.set(0, -0.6, -(Math.PI / 2 - 0.12)); g.position.y += 0.26; },
    });
    this._box(14.15, FLOOR_Y.ground + 0.25, 5.35, 0.95, 0.5, 0.6, SURFACE.FABRIC, 'PROP-CHAIR-CONF');

    // Tabletop: projector, an abandoned laptop, meeting debris.
    this.place('ELEC-PROJECTOR', 15.4, 3.45, N + this._j(0.15), { dy: CONF_H, collide: false });
    this.place('ELEC-LAPTOP-OPEN', 15.5, 2.55, N + this._j(0.3), { dy: CONF_H, collide: false, essential: true });
    this.place('ELEC-PHONE', 15.3, 4.35, E, { dy: CONF_H, collide: false });
    this.place('CLUT-PAPERSTACK', 15.7, 4.1, this._j(1), { dy: CONF_H, collide: false, clutter: true });
    this.place('CLUT-PAPER', 15.1, 2.9, this._j(3), { dy: CONF_H, collide: false, clutter: true });
    this.place('BREAK-MUG', 15.85, 3.0, this._j(2), { dy: CONF_H, collide: false, clutter: true });
    this.place('CLUT-BOTTLE', 14.9, 4.2, 0, { dy: CONF_H, collide: false, clutter: true });

    // Wall display north, whiteboard south, credenza cover, corner bookcase.
    this.place('ELEC-DISPLAY-WALL', 18.3, WOFF, S, { dy: 1.5, collide: false });
    this.place('ELEC-WHITEBOARD', 12.9, 7 - WOFF, N, {
      dy: 1.35, collide: false,
      key: 'ELEC-WHITEBOARD:conf', factory: () => whiteboard('conf', 'SUNFIELD — Q4 BUDGET REVIEW'),
    });
    this.place('PROP-CAB-FILE-4', 12.6, 6.55, N + this._j(0.05), {});
    this.place('PROP-CAB-FILE-4', 13.1, 6.55, N + this._j(0.05), {});
    this.place('CLUT-PLANT-SNAKE', 12.85, 6.55, 0, { dy: FILE4_H, collide: false, clutter: true });
    this.place('PROP-BOOKCASE', 19.75, 0.55, W + this._j(0.05), {});
    this.place('SIGN-ROOMPLATE', 11 + WOFF, 1.7, E, {
      dy: 1.5, collide: false, key: 'SIGN-ROOMPLATE:conf-in', factory: () => roomPlate('B-120', 'SUNFIELD'),
    });
    this.place('ELEC-CLOCK', 15.5, 7 - WOFF, N, { dy: 2.4, collide: false });
  }

  // ------------------------------------------------------------- break room

  _breakroom() {
    // Kitchen run against the west wall, under the window.
    this.place('BREAK-COUNTER-SINK', -21.56, 2.0, E, {});
    this.place('BREAK-CAB-BASE', -21.58, 0.72, E, {});
    this.place('BREAK-CAB-BASE', -21.58, 3.28, E, {});
    this.place('BREAK-CAB-WALL', -21.75, 0.4, E, { dy: 1.45, collide: false });
    this.place('BREAK-CAB-WALL', -21.75, 3.3, E, { dy: 1.45, collide: false, key: 'BREAK-CAB-WALL' });
    this.place('BREAK-FRIDGE', -21.5, 4.35, E + this._j(0.03), {});
    this.place('BREAK-MICROWAVE', -21.62, 0.72, E, { dy: 0.76, collide: false });
    // Coffee machine mid-brew; kettle and washing-up by the sink.
    this.place('BREAK-COFFEE', -21.62, 3.28, E, { dy: 0.76, collide: false, essential: true });
    this.place('BREAK-KETTLE', -21.6, 2.72, E + this._j(0.4), { dy: COUNTER_H, collide: false, clutter: true });
    this.place('BREAK-PLATE', -21.5, 1.35, this._j(1), { dy: COUNTER_H, collide: false, clutter: true });
    this.place('BREAK-MUG', -21.55, 1.6, this._j(2), { dy: COUNTER_H, collide: false, clutter: true });
    this.place('BREAK-TOWEL-DISP', -20.5, 0 + WOFF, S, { dy: 1.25, collide: false });

    // Vending machine on the south wall: the east wall's office arch (at
    // z=2.5) and the north door leave no 1 m-clear spot along x=-14 any more.
    this.place('BREAK-VENDING', -15.4, 4.5, N + this._j(0.02), {});
    this.place('BREAK-BIN-TRASH', -20.65, 4.55, this._j(0.5), {});
    this.place('BREAK-BIN-RECYCLE', -20.2, 4.62, this._j(0.5), {});

    // Two round tables; the near one still has somebody's abandoned lunch.
    this.place('PROP-TABLE-BREAK', -18.6, 1.0, this._j(1), {});
    this.place('PROP-TABLE-BREAK', -16.8, 3.3, this._j(1), {});
    const seats = [
      [-19.35, 0.7, E], [-17.9, 1.35, W], [-18.3, 0.15, N], [-18.9, 1.8, S],
      [-17.55, 3.65, E], [-16.05, 3.0, W], [-16.5, 4.05, S],
    ];
    for (const [sx, sz, yaw] of seats) {
      this.place('PROP-CHAIR-STACK', sx + this._j(0.08), sz + this._j(0.08), yaw + this._j(0.5), {});
    }
    // One chair tipped against the table edge.
    this.place('PROP-CHAIR-STACK', -16.15, 2.4, 0, {
      essential: true, collide: false,
      pose: (g) => { g.rotation.set(0.12, 1.1, Math.PI / 2 - 0.15); g.position.y += 0.24; },
    });
    // The abandoned lunch: opened container, snack, drink still standing.
    this.place('BREAK-FOODBOX', -16.7, 3.2, this._j(1), { dy: BREAK_H, collide: false, essential: true });
    this.place('CLUT-CAN', -16.5, 3.45, 0, { dy: BREAK_H, collide: false, essential: true });
    this.place('BREAK-SNACK', -16.95, 3.42, this._j(2), { dy: BREAK_H, collide: false, clutter: true });
    this.place('CLUT-WRAPPER', -18.5, 1.1, this._j(3), { dy: BREAK_H, collide: false, clutter: true });
    this.place('BREAK-MUG', -18.75, 0.8, this._j(2), { dy: BREAK_H, collide: false, clutter: true });

    this.place('BREAK-NOTICEBOARD', -17.2, 5 - WOFF, N, { dy: 1.4, collide: false });
    this.place('SIGN-FLYER', -15.9, 5 - WOFF, N, { dy: 1.5, collide: false });
    this.place('SIGN-SAFETY', -20.9, 5 - WOFF, N, { dy: 1.5, collide: false });
    this.place('ELEC-CLOCK', -18, 0 + WOFF, S, { dy: 2.35, collide: false });
    this.place('CLUT-COAT-HOOK', -14 - WOFF, 0.6, W, {
      dy: 1.55, collide: false, essential: true,
      key: 'CLUT-COAT-HOOK:break', factory: () => coatOnHook(2),
    });
  }

  // -------------------------------------------------------------- restrooms

  _restrooms() {
    // Stall block along the west wall: two WCs behind partitions.
    const bounds = [5.7, 7.4, 9.1];
    for (const bz of bounds) this.place('REST-STALL-PANEL', -21.28, bz, E, {});
    for (const tz of [6.55, 8.25]) {
      this.place('REST-TOILET', -21.5, tz, E, {});
      this.place('REST-STALL-DOOR', -20.55, tz, E, {});
    }
    // Urinals on the north wall, clear of the stalls.
    this.place('REST-URINAL', -18.6, 5 + WOFF, S, {});
    this.place('REST-URINAL', -17.7, 5 + WOFF, S, {});
    // Sinks + mirrors on the south wall.
    for (let i = 0; i < 2; i++) {
      const x = -19.2 + i * 0.9;
      this.place('REST-SINK', x, 11 - WOFF, N, {});
      this.place('REST-MIRROR', x, 11 - WOFF, N, { dy: 1.55, collide: false });
    }
    this.place('BREAK-SOAP-DISP', -18.3, 11 - WOFF, N, { dy: 1.15, collide: false });
    this.place('BREAK-TOWEL-DISP', -17.6, 11 - WOFF, N, { dy: 1.25, collide: false, key: 'BREAK-TOWEL-DISP' });
    this.place('REST-HANDDRYER', -16.9, 11 - WOFF, N, { dy: 1.15, collide: false });
    this.place('REST-BIN', -16.5, 10.6, this._j(0.5), {});
    // The ceiling leak: a mop bucket catching drips under the stained tile
    // (build.js stains restroom ceiling cell [2,3], centred near -20.5, 9.2).
    this.place('MAINT-MOPBUCKET', -20.3, 9.4, this._j(1), { essential: true });
    this.place('MAINT-WETFLOOR', -19.3, 9.3, this._j(0.8), { collide: false, essential: true });
    this.place('SIGN-PICTO-WC', -14 - WOFF, 8.5, E, { dy: 2.05, collide: false });
  }

  // -------------------------------------------------------------- corridors

  _midcorr() {
    // 2 m wide: shallow wall fittings only so lanes stay >= 1.2 m.
    this.place('MAINT-FIRECABINET', -3.4, 11 - WOFF, N, { dy: 1.1, collide: false });
    this.place('SIGN-WAYFIND', 0.6, 11 - WOFF, N, {
      dy: 1.6, collide: false, key: 'SIGN-WAYFIND:midcorr',
      factory: () => wayfindSign([['COPY & MAIL', 'W'], ['IT / SERVERS', 'N'], ['LOADING DOCK', 'E'], ['RESTROOMS', 'W']]),
    });
    this.place('SIGN-EVAC-DIAGRAM', -6.2, 11 - WOFF, N, { dy: 1.45, collide: false });
    this.place('SIGN-ROOMPLATE', -12.1, 11 - WOFF, N, {
      dy: 1.5, collide: false, key: 'SIGN-ROOMPLATE:jan', factory: () => roomPlate('B-131', 'JANITOR'),
    });
    this.place('SIGN-ROOMPLATE', -1.15, 11 - WOFF, N, {
      dy: 1.5, collide: false, key: 'SIGN-ROOMPLATE:it', factory: () => roomPlate('B-133', 'IT WORKSPACE'),
    });
    this.place('SIGN-ROOMPLATE', 4.85, 11 - WOFF, N, {
      dy: 1.5, collide: false, key: 'SIGN-ROOMPLATE:server', factory: () => roomPlate('B-134', 'SERVER ROOM'),
    });
    this.place('SIGN-NOTICE-SEC', 5.25, 11 - WOFF, N, { dy: 1.95, collide: false });
    this.place('SIGN-ROOMPLATE', 10.35, 11 - WOFF, N, {
      dy: 1.5, collide: false, key: 'SIGN-ROOMPLATE:mech', factory: () => roomPlate('B-135', 'MECHANICAL'),
    });
    this.place('SIGN-PICTO-WC', -13.2, 9 + WOFF, S, { dy: 2.05, collide: false });
    this.place('SIGN-PICTO-EXIT', 12.9, 11 - WOFF, N, { dy: 2.3, collide: false });
    this.place('MAINT-EXTINGUISHER', 7.8, 11 - WOFF, N, { dy: 0.75, collide: false });
    this.place('ELEC-CLOCK', -8, 9 + WOFF, S, { dy: 2.35, collide: false });
    this.place('BREAK-WATERCOOLER', 12.55, 9.45, S, {});
  }

  _janitor() {
    this.place('MAINT-WIRESHELF', -12.75, 13.62, N, {});
    this.place('MAINT-CLEANBOTTLE', -13.1, 13.6, this._j(2), { dy: 0.65, collide: false, clutter: true });
    this.place('MAINT-CLEANBOTTLE', -12.5, 13.58, this._j(2), { dy: 0.65, collide: false, clutter: true });
    this.place('MAINT-BOX-S', -12.3, 13.6, this._j(0.6), { dy: 0.135, collide: false });
    this.place('MAINT-JANITORCART', -13.35, 12.6, E + this._j(0.2), {});
    this.place('MAINT-BROOM', -11.68, 13.3, W, { collide: false });
    this.place('CLUT-PLANT-POT', -11.85, 13.55, this._j(2), { collide: false, clutter: true });
    this.place('MAINT-CONE', -12.1, 12.2, this._j(2), { collide: false });
    this.place('SIGN-EQUIP-LABEL', -14 + WOFF, 12.5, E, { dy: 1.6, collide: false });
  }

  _copyroom() {
    // Production copier on the west wall; supply shelving along the east.
    this.place('ELEC-COPIER', -11.0, 12.6, E, {});
    this.place('ELEC-PAPERTRAY', -11.0, 12.3, E + this._j(0.3), { dy: COPIER_H, collide: false });
    this.place('PROP-SHELF-OPEN', -5.35, 12.4, W, {});
    this.place('PROP-SHELF-OPEN', -5.35, 13.3, W, {});
    this.place('MAINT-BOX-M', -5.45, 12.4, this._j(0.4), { dy: 0.51, collide: false });
    this.place('MAINT-BOX-S', -5.4, 13.3, this._j(0.4), { dy: 0.51, collide: false });
    this.place('CLUT-PAPERSTACK', -5.42, 12.85, this._j(1), { dy: 0.94, collide: false, clutter: true });
    // Work table in the middle carries the mail sort.
    this.place('PROP-DESK-STD', -10.3, 14.35, N + this._j(0.04), {});
    this.place('CLUT-FOLDER', -10.4, 14.25, this._j(1), { dy: DESK_H, collide: false, clutter: true });
    this.place('CLUT-BINDER', -9.85, 14.45, this._j(0.6), { dy: DESK_H, collide: false, clutter: true });
    this.place('CLUT-PAPERSTACK', -10.8, 14.5, this._j(1), { dy: DESK_H, collide: false, clutter: true });
    this.place('CLUT-SCISSORS', -10.1, 14.15, this._j(2), { dy: DESK_H, collide: false, clutter: true });
    this.place('CLUT-TAPE', -10.6, 14.1, this._j(1), { dy: DESK_H, collide: false, clutter: true });
    // Mail pigeonholes: filing cabinets against the north wall, east of the arch.
    this.place('PROP-CAB-FILE-4', -6.2, 11.45, S + this._j(0.03), {});
    this.place('PROP-CAB-FILE-4', -5.7, 11.45, S + this._j(0.03), {});
    this.place('MAINT-BOX-OPEN', -10.7, 11.6, this._j(0.6), {});
    this.place('CLUT-PAPER', -10.2, 12.2, this._j(3), { collide: false, clutter: true });
    this.place('BREAK-BIN-RECYCLE', -5.5, 14.6, this._j(0.4), {});
    this.place('SIGN-FLYER', -6.2, 15.5 - WOFF, N, { dy: 1.55, collide: false });
    this.place('SIGN-NOTICE-EMP', -11.5 + WOFF, 14.6, E, { dy: 1.5, collide: false });
  }

  _itroom() {
    // Bench desks along the west wall, spares shelving on the south.
    this._workstation(-4.42, 12.35, E, { dual: true, tower: true, phone: true });
    this._workstation(-4.42, 13.95, E, { content: 'code', pedestal: true, messy: true });
    this.place('ELEC-SWITCH', -4.5, 12.0, E, { dy: DESK_H, collide: false });
    this.place('ELEC-CABLE-BUNDLE', -4.35, 13.1, E + this._j(0.3), { dy: DESK_H, collide: false });
    this.place('MAINT-TOOLCASE', -4.5, 14.2, this._j(0.6), { dy: DESK_H });
    this.place('ELEC-DOCK', -4.35, 14.32, E + this._j(0.4), { dy: DESK_H, collide: false, clutter: true });
    this.place('MAINT-WIRESHELF', -2.4, 15.18, N, {});
    this.place('MAINT-BOX-M', -2.7, 15.18, this._j(0.5), { dy: 0.135, collide: false });
    this.place('ELEC-TOWER', -2.0, 15.15, this._j(0.4), { dy: 0.655, collide: false });
    this.place('ELEC-CABLE-LOOSE', -3.3, 13.4, this._j(1), { collide: false, clutter: true });
    this.place('ELEC-CABLE-LOOSE', -2.2, 12.6, this._j(1), { collide: false, clutter: true });
    this.place('PROP-CAB-FILE-2', 0.45, 15.05, N + this._j(0.05), {});
    this.place('ELEC-MONITOR-24-OFF', 0.45, 15.02, N, { dy: FILE2_H, collide: false });
    this.place('SIGN-NOTICE-EMP', -5 + WOFF, 13.0, E, { dy: 1.6, collide: false, key: 'SIGN-NOTICE-EMP:it' });

    // Interactable: the level-2 keycard sitting on the repair bench.
    const card = this.place('CLUT-KEYCARD', -4.32, 13.65, E + 0.4, { dy: DESK_H, collide: false, ref: true, essential: true });
    this._addInteractable({
      kind: 'keycard',
      id: 'int-keycard',
      label: 'TAKE ACCESS KEYCARD (L2)',
      position: [-4.32, FLOOR_Y.ground + DESK_H + 0.05, 13.65],
      radius: 2.0,
      once: true,
      onActivate: (game) => {
        if (game?.combat) game.combat.hasKeycard = true;
        if (card) card.visible = false;
        game?.ui?.announce?.('Keycard taken — security doors released');
      },
      onReset: () => { if (card) card.visible = true; },
    });
  }

  _serverroom() {
    // Two rack pairs with the cold aisle kept clear between the doors.
    const racks = [[1.95, 13.25], [3.05, 13.25], [4.95, 13.25], [6.05, 13.25]];
    racks.forEach(([x, z], i) => {
      this.place('ELEC-RACK-42U', x, z, N, { key: `ELEC-RACK-42U:${i % 2}` });
    });
    this.place('ELEC-UPS', 1.35, 14.75, E, {});
    this.place('ELEC-UPS', 1.35, 14.05, E, {});
    this.place('ELEC-CABLE-BUNDLE', 2.5, 13.0, E + this._j(0.4), { dy: 2.02, collide: false });
    this.place('ELEC-CABLE-BUNDLE', 5.5, 13.1, E + this._j(0.4), { dy: 2.02, collide: false });
    this.place('ELEC-CABLE-LOOSE', 3.4, 14.4, this._j(1), { collide: false, clutter: true });
    this.place('MAINT-BOX-S', 6.35, 14.85, this._j(0.5), {});
    this.place('ELEC-SWITCH', 6.35, 14.85, this._j(0.3), { dy: 0.26, collide: false });
    this.place('SIGN-NOTICE-SEC', 1 + WOFF, 12.2, E, { dy: 1.55, collide: false, key: 'SIGN-NOTICE-SEC:server' });
    this.place('SIGN-EQUIP-LABEL', 1 + WOFF, 14.4, E, { dy: 1.6, collide: false, key: 'SIGN-EQUIP-LABEL:server' });
  }

  _mechanical() {
    this.place('MAINT-AHU', 7.7, 13.2, E, {});
    this.place('MAINT-TRANSFORMER', 11.6, 12.3, W + this._j(0.02), {});
    this.place('MAINT-PIPES', 11.75, 14.55, W, {});
    this.place('MAINT-ELECPANEL', 8.2, 11 + WOFF, S, { dy: 1.4, collide: false });
    this.place('MAINT-BREAKERBOX', 11.15, 11 + WOFF, S, { dy: 1.4, collide: false });
    this.place('MAINT-LADDER', 7.75, 14.7, this._j(0.5), {});
    this.place('MAINT-TOOLCASE', 7.55, 11.85, this._j(0.8), {});
    this.place('MAINT-CONE', 10.9, 14.9, this._j(2), { collide: false });
    this.place('MAINT-DUCT', 9.5, 13.0, E, { dy: 2.75, collide: false });
    this.place('SIGN-EQUIP-LABEL', 11.27, 12.3, W, { dy: 1.5, collide: false, key: 'SIGN-EQUIP-LABEL:mech' });
    this.place('SIGN-SAFETY', 12 - WOFF, 13.8, W, { dy: 1.5, collide: false, key: 'SIGN-SAFETY:mech', factory: () => safetyPoster(1) });
  }

  _servicecorr() {
    // 2.5 m spine: everything shallow or tight to the south wall.
    this.place('MAINT-PIPES', -13.83, 16.75, E, {});
    this.place('MAINT-HANDTRUCK', -11.2, 17.5, N + 0.5, {});
    this.place('MAINT-MOPBUCKET', -3.6, 17.55, this._j(1), {});
    this.place('MAINT-WETFLOOR', -2.5, 17.2, this._j(0.7), { collide: false, essential: true });
    this.place('MAINT-BOX-M', 6.7, 17.6, this._j(0.4), {});
    this.place('MAINT-BOX-S', 6.72, 17.58, this._j(0.6), { dy: 0.35 });
    this.place('MAINT-FIRECABINET', 1.8, 18 - WOFF, N, { dy: 1.1, collide: false, key: 'MAINT-FIRECABINET' });
    this.place('MAINT-BREAKERBOX', -6.5, 18 - WOFF, N, { dy: 1.4, collide: false, key: 'MAINT-BREAKERBOX' });
    this.place('SIGN-SAFETY', -9.8, 18 - WOFF, N, { dy: 1.5, collide: false, key: 'SIGN-SAFETY:corr0', factory: () => safetyPoster(0) });
    this.place('SIGN-SAFETY', 4.4, 18 - WOFF, N, { dy: 1.5, collide: false, key: 'SIGN-SAFETY:corr2', factory: () => safetyPoster(2) });
    this.place('SIGN-PICTO-EXIT', 12.8, 18 - WOFF, N, { dy: 2.25, collide: false });
    this.place('SIGN-EVAC-DIAGRAM', -12.6, 15.5 + WOFF, S, { dy: 1.45, collide: false });
    this.place('MAINT-EXTINGUISHER', 11.3, 15.5 + WOFF, S, { dy: 0.75, collide: false });
    this.place('SIGN-EMERG-PLACARD', 0.2, 15.5 + WOFF, S, { dy: 1.45, collide: false });
  }

  // ----------------------------------------------------------------- loading

  _loading() {
    // The half-loaded pallet mid-floor is the room's anchor and its cover.
    this.place('MAINT-PALLET', 17.4, 12.4, this._j(0.15), {});
    this.place('MAINT-BOX-L', 17.15, 12.25, this._j(0.3), { dy: 0.15 });
    this.place('MAINT-BOX-M', 17.7, 12.6, this._j(0.4), { dy: 0.15 });
    this.place('MAINT-BOX-M', 17.35, 12.5, this._j(0.4), { dy: 0.5 });
    this.place('MAINT-HANDTRUCK', 16.6, 13.3, E + 0.7, {});
    this.place('MAINT-BOX-L', 16.5, 14.0, this._j(0.5), {});

    // Crate stack between the doors - natural approach cover.
    this.place('MAINT-CRATE', 16.2, 8.9, this._j(0.2), {});
    this.place('MAINT-CRATE', 16.2, 9.72, this._j(0.25), {});
    this.place('MAINT-BOX-M', 16.2, 8.85, this._j(0.5), { dy: 0.8 });
    // Empty pallets by the west wall.
    this.place('MAINT-PALLET', 14.85, 13.6, this._j(0.2), {});
    this.place('MAINT-PALLET', 14.87, 13.62, this._j(0.2), { dy: 0.15 });

    // Shelving + the ammo crate along the east wall south of the garage arch.
    this.place('MAINT-WIRESHELF', 19.62, 16.3, W, {});
    this.place('MAINT-BOX-S', 19.6, 16.0, this._j(0.5), { dy: 0.655, collide: false });
    this.place('MAINT-BOX-M', 19.6, 16.6, this._j(0.5), { dy: 0.135, collide: false });
    const crate = this.place('MAINT-SUPPLYCRATE', 18.7, 17.3, N + this._j(0.2), { ref: true, essential: true });
    this._addInteractable({
      kind: 'supplies',
      id: 'int-supplies',
      label: 'TAKE AMMUNITION — 5.56MM',
      position: [18.7, FLOOR_Y.ground + 0.4, 17.3],
      radius: 2.0,
      once: true,
      onActivate: (game) => {
        game?.weapons?.refillReserve?.();
        game?.ui?.announce?.('Reserve ammunition replenished');
      },
    });
    if (crate) crate.userData.interactable = 'int-supplies';
    if (crate) this._collide(crate, 18.7, FLOOR_Y.ground, 17.3, N, 'MAINT-SUPPLYCRATE', 'ground');

    this.place('MAINT-DUCT', 17, 8.2, E, { dy: 3.9, collide: false, key: 'MAINT-DUCT:load' });
    this.place('SIGN-SHIPLABEL', 14 + WOFF, 12.9, E, { dy: 1.4, collide: false });
    this.place('SIGN-SAFETY', 14 + WOFF, 14.6, E, { dy: 1.5, collide: false, key: 'SIGN-SAFETY:dock', factory: () => safetyPoster(2) });
    this.place('SIGN-PICTO-EXIT', 14 + WOFF, 12.0, E, { dy: 2.3, collide: false });
    this.place('MAINT-EXTINGUISHER', 18.5, 7 + WOFF, S, { dy: 0.75, collide: false });
  }

  _garage() {
    // Extraction volume (x 21..26, z 9.5..15.5) stays empty for the vehicle.
    const ctrl = this.place('MAINT-GARAGECTRL', 27 - XOFF, 9.0, W, { dy: 1.25, collide: false, ref: true, essential: true });
    this._addInteractable({
      kind: 'garage_control',
      id: 'int-garage',
      label: 'OPEN BAY DOOR',
      position: [26.85, FLOOR_Y.ground + 1.25, 9.0],
      radius: 2.2,
      onActivate: (game, it) => {
        game?.director?.openGarage?.();
        it.used = false;                       // the director owns idempotence
        it.cooldownUntil = Date.now() + 4000;
      },
    });
    if (ctrl) ctrl.userData.interactable = 'int-garage';

    this.place('MAINT-WIRESHELF', 21.6, 7.48, S, {});
    this.place('MAINT-TOOLCASE', 21.4, 7.48, this._j(0.5), { dy: 0.655, collide: false });
    this.place('MAINT-BOX-L', 22.6, 7.6, this._j(0.4), {});
    this.place('MAINT-PIPES', 20.19, 8.4, E, {});
    this.place('MAINT-ELECPANEL', 24.2, 7 + XOFF, S, { dy: 1.4, collide: false, key: 'MAINT-ELECPANEL:garage' });
    this.place('MAINT-CRATE', 21.3, 16.9, this._j(0.3), {});
    this.place('MAINT-BOX-M', 21.3, 16.85, this._j(0.5), { dy: 0.8 });
    this.place('MAINT-BROOM', 20.2, 16.1, E, { collide: false });
    this.place('MAINT-CONE', 25.6, 16.4, this._j(2), { collide: false });
    this.place('SIGN-NOTICE-SEC', 20 + WOFF, 16.9, E, { dy: 1.5, collide: false, key: 'SIGN-NOTICE-SEC:garage' });
    this.place('SIGN-EQUIP-LABEL', 26.2, 7 + XOFF, S, { dy: 1.5, collide: false, key: 'SIGN-EQUIP-LABEL:garage' });
  }

  // ---------------------------------------------------------------- mezzanine

  _upperLanding() {
    // The landing floor is mostly the stair void: wall fittings only.
    this.place('SIGN-DEPT', 11 + WOFF, -7.75, E, {
      floor: 'upper', dy: 2.1, collide: false,
      key: 'SIGN-DEPT:exec', factory: () => deptSign('EXECUTIVE SUITE', 'REGIONAL DIRECTORATE'),
    });
    this.place('MAINT-EXTINGUISHER', 18 - WOFF, -6.9, W, { floor: 'upper', dy: 0.75, collide: false });
  }

  _execCorr() {
    // Gallery above the lobby: bench seating, planters, a history wall.
    for (const bx of [-6.6, 5.4]) {
      this.place('PROP-CHAIR-SLED', bx - 0.4, -7.8, S + this._j(0.08), { floor: 'upper' });
      this.place('PROP-CHAIR-SLED', bx + 0.4, -7.8, S + this._j(0.08), { floor: 'upper' });
    }
    this.place('PROP-TABLE-SIDE', -7.7, -7.75, this._j(1), { floor: 'upper' });
    this.place('CLUT-PLANT-SNAKE', -7.7, -7.72, 0, { floor: 'upper', dy: SIDE_H, collide: false, clutter: true });
    this.place('CLUT-PLANT-FICUS', 8.0, -7.95, this._j(2), { floor: 'upper' });
    this.place('CLUT-PLANT-FICUS', -9.1, -7.9, this._j(2), { floor: 'upper' });
    this.place('BREAK-NOTICEBOARD', -4.4, -8.5 + XOFF, S, { floor: 'upper', dy: 1.5, collide: false, key: 'BREAK-NOTICEBOARD:exec' });
    this.place('SIGN-NOTICE-EMP', 4.4, -8.5 + XOFF, S, { floor: 'upper', dy: 1.5, collide: false, key: 'SIGN-NOTICE-EMP:exec' });
    this.place('ELEC-CLOCK', -9.5, -8.5 + XOFF, S, { floor: 'upper', dy: 2.3, collide: false });
  }

  _execOffice() {
    // Director's desk in the north-west, facing the door across the room.
    const dx = -17.15, dz = -7.15;
    this.place('PROP-DESK-EXEC', dx, dz, W + this._j(0.04), { floor: 'upper' });
    this.place('PROP-CHAIR-CONF', dx - 0.85, dz + this._j(0.1), E + this._j(0.2), { floor: 'upper' });
    // Guest chairs facing the desk.
    this.place('PROP-CHAIR-CONF', dx + 1.15, dz - 0.45, W + this._j(0.3), { floor: 'upper' });
    this.place('PROP-CHAIR-CONF', dx + 1.2, dz + 0.5, W + this._j(0.3), { floor: 'upper' });
    // Desktop: laptop open on a half-written storm memo, family photo, phone.
    this.place('ELEC-LAPTOP-OPEN', dx - 0.1, dz + 0.05, E + this._j(0.15), { floor: 'upper', dy: DESK_H, collide: false, essential: true });
    this.place('ELEC-PHONE', dx + 0.1, dz - 0.55, E + 0.3, { floor: 'upper', dy: DESK_H, collide: false });
    this.place('CLUT-PHOTOFRAME', dx - 0.15, dz + 0.6, E - 0.5, { floor: 'upper', dy: DESK_H, collide: false, essential: true });
    this.place('CLUT-PAPERSTACK', dx + 0.25, dz + 0.4, this._j(1), { floor: 'upper', dy: DESK_H, collide: false, clutter: true });
    this.place('CLUT-PEN', dx + 0.05, dz + 0.2, this._j(2), { floor: 'upper', dy: DESK_H, collide: false, clutter: true });
    // Printer on a low cabinet under the north window.
    this.place('PROP-CAB-FILE-2', -14.2, -8.02, S + this._j(0.03), { floor: 'upper' });
    this.place('ELEC-PRINTER-DESK', -14.2, -8.05, S + this._j(0.1), { floor: 'upper', dy: FILE2_H, collide: false });

    // Bookcases against the archive wall; coats; the director's briefcase.
    this.place('PROP-BOOKCASE', -16.4, -3.79, N + this._j(0.02), { floor: 'upper' });
    this.place('PROP-BOOKCASE', -17.4, -3.79, N + this._j(0.02), { floor: 'upper' });
    this.place('PROP-COATRACK', -11.85, -4.35, this._j(1), { floor: 'upper' });
    this.place('CLUT-COAT-HOOK', -11 - WOFF, -7.4, W, {
      floor: 'upper', dy: 1.6, collide: false, essential: true,
      key: 'CLUT-COAT-HOOK:exec', factory: () => coatOnHook(3),
    });
    this.place('CLUT-BRIEFCASE', -16.3, -7.7, this._j(1), { floor: 'upper', collide: false, essential: true });
    this.place('REST-BIN', -17.8, -6.2, this._j(1), { floor: 'upper' });
    this.place('CLUT-PLANT-SNAKE', -18.55, -7.95, this._j(2), { floor: 'upper', collide: false });
    this.place('PROP-TABLE-SIDE', -13.15, -7.8, this._j(1), { floor: 'upper' });
    this.place('CLUT-BOTTLE', -13.15, -7.75, 0, { floor: 'upper', dy: SIDE_H, collide: false, clutter: true });
  }

  _archive() {
    // Rolling rack bays: two back-to-back pairs with one open aisle.
    for (const rz of [-1.7, -1.05, 1.05, 1.7]) {
      this.place('PROP-RACK-ARCHIVE', -14.6, rz, rz < 0 ? S : N, { floor: 'upper' });
    }
    this.place('MAINT-LADDER', -12.6, -0.1, this._j(0.6), { floor: 'upper' });
    this.place('MAINT-BOX-M', -12.3, 2.15, this._j(0.4), { floor: 'upper' });
    this.place('MAINT-BOX-S', -12.32, 2.13, this._j(0.5), { floor: 'upper', dy: 0.35 });
    this.place('MAINT-BOX-OPEN', -17.9, 2.05, this._j(0.6), { floor: 'upper' });
    this.place('CLUT-BINDER', -12.55, -0.6, this._j(1), { floor: 'upper', collide: false, clutter: true });
    this.place('CLUT-PAPER', -13.0, 0.3, this._j(3), { floor: 'upper', collide: false, clutter: true });
    this.place('PROP-CAB-FILE-4', -17.0, 2.1, N + this._j(0.03), { floor: 'upper' });
    this.place('SIGN-DEPT', -12.8, -3.5 + WOFF, S, {
      floor: 'upper', dy: 2.1, collide: false,
      key: 'SIGN-DEPT:archive', factory: () => deptSign('RECORDS ARCHIVE', 'AUTHORISED ACCESS ONLY'),
    });
    this.place('SIGN-NOTICE-EMP', -11 - WOFF, 0.5, W, { floor: 'upper', dy: 1.5, collide: false, key: 'SIGN-NOTICE-EMP:arch' });
  }

  // --------------------------------------------------------- ceiling fixtures

  _ceilingFixtures() {
    for (const room of ROOMS) {
      if (room.exterior || room.noCeiling || !room.ceilMat || room.ceiling <= 0) continue;
      const cy = room.ceiling - 0.005;
      const w = room.x1 - room.x0, d = room.z1 - room.z0;
      const nx = Math.max(1, Math.round(w / 4));
      const nz = Math.max(1, Math.round(d / 4));
      for (let ix = 0; ix < nx; ix++) {
        for (let iz = 0; iz < nz; iz++) {
          const x = room.x0 + w * ((ix + 0.5) / nx) + this._j(0.3);
          const z = room.z0 + d * ((iz + 0.5) / nz) + this._j(0.3);
          this.place('MAINT-SPRINKLER', x, z, 0, { floor: room.floor, dy: cy, collide: false });
        }
      }
      const sx = room.x0 + w * 0.5 + this._j(w * 0.2);
      const sz = room.z0 + d * 0.5 + this._j(d * 0.2);
      this.place('MAINT-SMOKEDET', sx, sz, 0, { floor: room.floor, dy: cy, collide: false });
    }
  }
}
