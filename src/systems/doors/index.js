// sys-doors — the ship-wide doors system (COORDINATION.md §9.1).
//
// Built after every room. Reads each room manifest's doors[], pairs entries by id and builds one
// assembly per pair: reveal frames on both faces, tunnel lining through the shared wall, threshold,
// two sliding leaves (instanced, animated here), lintel status light + jamb control panel. Unpaired
// doors are built locked with a sealed slab behind the leaves. See README.md in this folder.
import * as THREE from "three";
import { doorHole, WALL_T, FRAME_W } from "./helper.js";
import { doorMaterials } from "./materials.js";
import { KIND_SPEC, BAY_REF, OPEN_CLEAR, doorColours, leafLayout, leafGeometry, buildStatic, sidePocketNeeded } from "./assembly.js";

export const TRIGGER_RADIUS = 2.6; // m, horizontal distance from the opening centre (either side)
export const EASE_SECONDS = 0.6; // full open / close travel
export const CLOSE_DELAY = 1.5; // s after the player is clear
const FORCE_HOLD = 1.5; // s a forceOpen() counts as presence
const LEVEL_TOL = 1.6; // m, the player must stand on the door's floor level

// Status colours on an unlit material. The output pass is ACES filmic (input scaled by 1/0.6), which
// pushes bright saturated colours toward white/orange, so red and amber stay at ~1.3 (display ≈ #ff311c
// and #f6b548, no bloom) while the blue-white ready colour is HDR and blooms (threshold 1.15).
const STATUS = {
  ready: new THREE.Color(1.4, 1.8, 2.6), // blue-white: open or ready
  locked: new THREE.Color(1.3, 0.0, 0.0), // red
  cycling: new THREE.Color(1.3, 0.32, 0.02), // amber while moving
};

const smooth = (k) => k * k * (3 - 2 * k);
const _m = new THREE.Matrix4();
const _v = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

// Wall length available beside the hole (beyond hw) along -U / +U, limited by every declaring room.
function pocketAvail(list, hw, U) {
  const axis = Math.abs(U.x) > 0.5 ? 0 : 2;
  const sign = axis === 0 ? U.x : U.z;
  let neg = Infinity;
  let pos = Infinity;
  for (const { room, door } of list) {
    const b = room.bounds;
    if (!b) continue;
    const c = door.pos[axis];
    const plus = sign > 0 ? b.max[axis] - c : c - b.min[axis];
    const minus = sign > 0 ? c - b.min[axis] : b.max[axis] - c;
    pos = Math.min(pos, plus - hw);
    neg = Math.min(neg, minus - hw);
  }
  return [neg, pos];
}

export default {
  id: "sys-doors",
  name: "Doors",
  kind: "system",
  owner: "D",
  materials: doorMaterials,
  // Deterministic harness views (feet positions in the Deck 4 lobby; see README for the door layout)
  views: {
    "sys-doors-standard-closed": { pos: [6, -72, 171.75], yaw: -90, pitch: 2 },
    "sys-doors-standard-open": { pos: [8.2, -72, 171.75], yaw: -90, pitch: 2, advance: 2 },
    "sys-doors-blast": { pos: [0, -72, 176], yaw: 0, pitch: 3 },
    "sys-doors-blast-open": { pos: [0, -72, 172], yaw: 0, pitch: 3, advance: 2 },
    "sys-doors-blast-side": { pos: [3.6, -72, 173.6], yaw: 38, pitch: 8 },
    "sys-doors-standard-side": { pos: [7.4, -72, 175.2], yaw: -58, pitch: 6 },
    // side-sliding leaves (the stairs door has wall pockets on both sides)
    "sys-doors-stairs": { pos: [7, -72, 176.5], yaw: 180, pitch: 2 },
    "sys-doors-stairs-open": { pos: [7, -72, 179.2], yaw: 180, pitch: 2, advance: 2 },
  },
  build(ctx) {
    const { kit, PALETTE, group, world, materials } = ctx;
    const doors = [];
    const byId = new Map();
    const colliders = [];
    let lastT = typeof ctx.time === "function" ? ctx.time() : 0;
    const noop = { update() {}, api: null, colliders };
    if (!world || !world.rooms) {
      console.warn("[doors] built without ctx.world.rooms — nothing to pair");
      return noop;
    }
    const C = doorColours(PALETTE);

    // ---- collect declarations by id
    const decl = new Map();
    for (const [, e] of world.rooms) {
      const m = e.manifest;
      for (const dd of m.doors || []) {
        if (!dd.id || !dd.pos || !dd.dir) continue;
        if (!decl.has(dd.id)) decl.set(dd.id, []);
        decl.get(dd.id).push({ room: m, door: dd });
      }
    }

    // ---- per-door records + static geometry
    const groups = new Map(); // "kind:split" -> { geometry, items: [{leaf, tint}] }
    const lightSpecs = []; // { door, spec }
    for (const [id, list] of decl) {
      if (list.length > 2) console.warn(`[doors] ${id}: declared by ${list.length} rooms (${list.map((x) => x.room.id).join(", ")}); using the first two`);
      const A = list[0];
      const B = list[1] || null;
      let locked = false;
      if (!B) {
        locked = true;
        const to = A.door.to;
        if (to === null || to === undefined) console.log(`[doors] ${id}: future expansion, locked`);
        else if (world.rooms.has(to)) console.warn(`[doors] ${id}: ${to} does not declare this door id — built locked`);
        else console.warn(`[doors] ${id}: room ${to} not found — built locked`);
      }
      let hole;
      try {
        hole = doorHole(A.door);
      } catch (e) {
        console.warn(`[doors] ${id}: ${e.message}`);
        continue;
      }
      const kind = A.door.kind === "bay" ? "bay" : KIND_SPEC[A.door.kind] ? A.door.kind : "standard";
      const spec = KIND_SPEC[kind];
      const pos = [A.door.pos[0], A.door.pos[1], A.door.pos[2]];
      const N = new THREE.Vector3(A.door.dir[0], 0, A.door.dir[2]);
      if (Math.abs(N.x) >= Math.abs(N.z)) N.set(Math.sign(N.x) || 1, 0, 0);
      else N.set(0, 0, Math.sign(N.z) || 1);
      const U = new THREE.Vector3().crossVectors(UP, N);
      // leaf split: standard / hatch slide sideways when both rooms have wall beside the hole to
      // pocket a leaf; otherwise (or on a manifest hint split:"vertical") they split top / bottom.
      let split = spec.split;
      const hint = A.door.split || (B && B.door.split);
      if (hint === "vertical" || hint === "side") split = hint;
      else if (split === "side") {
        const need = sidePocketNeeded(kind, hole.w);
        const [neg, plus] = pocketAvail(list, hole.w / 2, U);
        if (neg < need || plus < need) {
          split = "vertical";
          console.log(`[doors] ${id}: ${neg.toFixed(2)} / ${plus.toFixed(2)} m of wall beside the opening (side pockets need ${need.toFixed(2)}), leaves split top/bottom`);
        }
      }
      const paired = !!B;
      const leafN = paired ? 0 : Math.min(0, WALL_T - 0.03 - spec.leafT / 2 - 0.07);
      const faces = [];
      const faceTop = (room) => Math.min(hole.h + FRAME_W, room.bounds ? room.bounds.max[1] - pos[1] - 0.02 : hole.h + FRAME_W);
      faces.push({ s: -1, top: faceTop(A.room) });
      if (B) faces.push({ s: 1, top: faceTop(B.room) });
      const { lights } = buildStatic(kit, C, { pos, U, N, w: hole.w, h: hole.h, kind, spec, split, paired, leafN, faces });

      const rot = new THREE.Matrix4().makeBasis(U, UP, N);
      const Mdoor = rot.clone().setPosition(pos[0], pos[1], pos[2]);
      const rec = {
        id,
        kind,
        w: hole.w,
        h: hole.h,
        pos,
        rooms: [A.room.id, B ? B.room.id : null],
        locked,
        paired,
        split,
        U,
        N,
        cx: pos[0],
        cy: pos[1] + hole.h / 2,
        cz: pos[2],
        leaves: [],
        lightIdx: [],
        open: 0,
        target: 0,
        from: 0,
        t0: 0,
        dur: EASE_SECONDS,
        clearAt: null,
        forcedAt: null,
        colorKey: null,
        dirty: true,
      };
      // leaves
      const key = `${kind}:${split}`;
      if (!groups.has(key)) {
        const gw = kind === "bay" ? BAY_REF.w : hole.w;
        const gh = kind === "bay" ? BAY_REF.h : hole.h;
        groups.set(key, { geometry: leafGeometry(kind, split, gw, gh, C), items: [] });
      }
      const L = leafLayout(kind, split, hole.w, hole.h);
      let sx = 1;
      let sy = 1;
      if (kind === "bay") {
        const Lr = leafLayout(kind, split, BAY_REF.w, BAY_REF.h);
        sx = (L.x1 - L.x0) / (Lr.x1 - Lr.x0);
        sy = L.y1 / Lr.y1;
      }
      const S = new THREE.Matrix4().makeScale(sx, sy, 1);
      const plane = new THREE.Matrix4().makeTranslation(0, 0, leafN);
      const defs =
        split === "side"
          ? [
              { R: new THREE.Matrix4(), dir: new THREE.Vector3(-1, 0, 0), travel: L.travel },
              { R: new THREE.Matrix4().makeRotationY(Math.PI), dir: new THREE.Vector3(1, 0, 0), travel: L.travel },
            ]
          : [
              { R: new THREE.Matrix4(), dir: new THREE.Vector3(0, -1, 0), travel: L.travelDown },
              {
                R: new THREE.Matrix4().makeTranslation(0, hole.h / 2, 0).multiply(new THREE.Matrix4().makeRotationZ(Math.PI)).multiply(new THREE.Matrix4().makeTranslation(0, -hole.h / 2, 0)),
                dir: new THREE.Vector3(0, 1, 0),
                travel: L.travelUp,
              },
            ];
      const tint = new THREE.Color(1, 1, 1).multiplyScalar(0.93 + 0.07 * ((Math.abs(pos[0] * 7 + pos[2] * 13) * 0.37) % 1));
      for (const def of defs) {
        const poseNoScale = Mdoor.clone().multiply(plane).multiply(def.R);
        const base = poseNoScale.clone().multiply(S);
        const slide = def.dir.clone().applyMatrix4(rot);
        // closed world AABB from the leaf-local box corners
        const min = new THREE.Vector3(Infinity, Infinity, Infinity);
        const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
        for (const x of [L.x0, L.x1]) for (const y of [L.y0, L.y1]) for (const z of [L.z0, L.z1]) {
          _v.set(x, y, z).applyMatrix4(poseNoScale);
          min.min(_v);
          max.max(_v);
        }
        const collider = { min: min.clone(), max: max.clone(), tag: "door-leaf:" + id };
        colliders.push(collider);
        const leaf = { base, slide, travel: def.travel, closedMin: min, closedMax: max, collider, mesh: null, index: -1 };
        rec.leaves.push(leaf);
        groups.get(key).items.push({ leaf, tint });
      }
      for (const ls of lights) lightSpecs.push({ door: rec, spec: ls });
      doors.push(rec);
      byId.set(id, rec);
    }

    // ---- instanced leaves: one InstancedMesh per kind+split (all leaves of the ship in ≤ 6 draw calls)
    const meshes = [];
    for (const [key, g] of groups) {
      if (!g.items.length) continue;
      const mesh = new THREE.InstancedMesh(g.geometry, materials.doorLeaf, g.items.length);
      mesh.name = "doors_leaves_" + key.replace(":", "_");
      mesh.frustumCulled = false;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.items.forEach((it, i) => {
        it.leaf.mesh = mesh;
        it.leaf.index = i;
        mesh.setMatrixAt(i, it.leaf.base);
        mesh.setColorAt(i, it.tint);
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      group.add(mesh);
      meshes.push(mesh);
    }
    // ---- status lights: one InstancedMesh, per-instance HDR colour
    let lightMesh = null;
    if (lightSpecs.length) {
      lightMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.doorLight, lightSpecs.length);
      lightMesh.name = "doors_status_lights";
      lightMesh.frustumCulled = false;
      lightSpecs.forEach(({ door, spec }, i) => {
        // door basis (U, up, N are world axes) scaled to the emitter size, at the spec position
        _m.makeBasis(door.U, UP, door.N);
        _m.scale(_v.set(spec.size[0], spec.size[1], spec.size[2]));
        _m.setPosition(spec.pos[0], spec.pos[1], spec.pos[2]);
        lightMesh.setMatrixAt(i, _m);
        lightMesh.setColorAt(i, STATUS.locked);
        door.lightIdx.push(i);
      });
      lightMesh.instanceMatrix.needsUpdate = true;
      lightMesh.instanceColor.needsUpdate = true;
      group.add(lightMesh);
    }

    // ---- animation helpers
    function setLeafPose(rec) {
      for (const lf of rec.leaves) {
        const d = rec.open * lf.travel;
        _m.copy(lf.base);
        _m.elements[12] += lf.slide.x * d;
        _m.elements[13] += lf.slide.y * d;
        _m.elements[14] += lf.slide.z * d;
        lf.mesh.setMatrixAt(lf.index, _m);
        lf.mesh.instanceMatrix.needsUpdate = true;
        // colliders: track the leaf, but park it fully once the door is clear enough to walk through
        const cd = rec.open >= OPEN_CLEAR ? lf.travel : d;
        lf.collider.min.copy(lf.closedMin).addScaledVector(lf.slide, cd);
        lf.collider.max.copy(lf.closedMax).addScaledVector(lf.slide, cd);
      }
    }
    function colorKey(rec) {
      if (rec.open !== rec.target) return "cycling";
      if (rec.locked && rec.open < 0.5) return "locked";
      return "ready";
    }
    function setLightColor(rec, key) {
      if (!lightMesh) return;
      for (const i of rec.lightIdx) lightMesh.setColorAt(i, STATUS[key]);
      lightMesh.instanceColor.needsUpdate = true;
    }
    function startMove(rec, target, t) {
      rec.from = rec.open;
      rec.target = target;
      rec.t0 = t;
      rec.dur = Math.max(0.05, EASE_SECONDS * Math.abs(target - rec.from));
      if (ctx.audio && typeof ctx.audio.play === "function") ctx.audio.play(target ? "door-open" : "door-close", [rec.cx, rec.cy, rec.cz]);
    }
    for (const r of doors) {
      setLeafPose(r);
      r.dirty = false;
      r.colorKey = colorKey(r);
      setLightColor(r, r.colorKey);
    }

    // ---- per-frame: proximity → state machine → eased leaves → light colour
    function update(dt, t) {
      if (t < lastT) {
        // the clock was rewound (harness setView): keep every timer relative
        const jump = t - lastT;
        for (const r of doors) {
          r.t0 += jump;
          if (r.clearAt !== null) r.clearAt += jump;
          if (r.forcedAt !== null) r.forcedAt += jump;
        }
      }
      lastT = t;
      const p = ctx.player && ctx.player.position;
      const R2 = TRIGGER_RADIUS * TRIGGER_RADIUS;
      for (const r of doors) {
        let near = false;
        if (p) {
          const dx = p.x - r.cx;
          const dz = p.z - r.cz;
          near = dx * dx + dz * dz <= R2 && Math.abs(p.y - r.pos[1]) < LEVEL_TOL;
        }
        if (r.forcedAt !== null && t - r.forcedAt >= FORCE_HOLD) r.forcedAt = null;
        const want = r.forcedAt !== null || (near && !r.locked);
        if (want) {
          r.clearAt = null;
          if (r.target !== 1) startMove(r, 1, t);
        } else if (r.target === 1) {
          if (r.clearAt === null) r.clearAt = t;
          else if (t - r.clearAt >= CLOSE_DELAY) {
            r.clearAt = null;
            startMove(r, 0, t);
          }
        }
        if (r.open !== r.target) {
          const k = Math.min(1, Math.max(0, (t - r.t0) / r.dur));
          const o = k >= 1 ? r.target : r.from + (r.target - r.from) * smooth(k);
          if (o !== r.open) {
            r.open = o;
            r.dirty = true;
          }
        }
        if (r.dirty) {
          setLeafPose(r);
          r.dirty = false;
        }
        const ck = colorKey(r);
        if (ck !== r.colorKey) {
          r.colorKey = ck;
          setLightColor(r, ck);
        }
      }
    }

    const api = {
      setLocked(id, locked) {
        const r = byId.get(id);
        if (!r) return false;
        r.locked = !!locked;
        if (r.locked && r.target === 1 && r.forcedAt === null) startMove(r, 0, lastT);
        return true;
      },
      getState(id) {
        const r = byId.get(id);
        return r ? { open: r.open, locked: r.locked } : null;
      },
      forceOpen(id) {
        const r = byId.get(id);
        if (!r) return false;
        r.forcedAt = lastT;
        r.clearAt = null;
        if (r.target !== 1) startMove(r, 1, lastT);
        return true;
      },
      list() {
        return doors.map((r) => ({ id: r.id, kind: r.kind, pos: [...r.pos], rooms: [...r.rooms], locked: r.locked }));
      },
      serialize() {
        const out = {};
        for (const r of doors) out[r.id] = { open: +r.open.toFixed(4), locked: r.locked, t: lastT };
        return { doors: out };
      },
      apply(state) {
        const src = state && state.doors ? state.doors : state || {};
        let n = 0;
        for (const [id, s] of Object.entries(src)) {
          const r = byId.get(id);
          if (!r || !s) continue;
          if (typeof s.locked === "boolean") r.locked = s.locked;
          if (typeof s.open === "number") {
            const o = Math.min(1, Math.max(0, s.open));
            r.open = o;
            r.from = o;
            r.target = typeof s.target === "number" ? (s.target ? 1 : 0) : o >= 0.5 ? 1 : 0;
            r.t0 = lastT;
            r.dur = Math.max(0.05, EASE_SECONDS * Math.abs(r.target - o));
            r.clearAt = null;
            r.forcedAt = null;
            r.dirty = true;
          }
          n++;
        }
        return n;
      },
    };

    console.log(`[doors] ${doors.length} doors (${doors.filter((d) => d.paired).length} paired, ${doors.filter((d) => !d.paired).length} locked/unpaired), ${meshes.length} leaf meshes, ${lightSpecs.length} status lights`);

    return {
      update,
      api,
      colliders,
      dispose() {
        for (const m of meshes) m.geometry.dispose();
        if (lightMesh) lightMesh.geometry.dispose();
      },
    };
  },
};
