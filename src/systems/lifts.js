// Turbolifts: cab rooms behind each lobby wall, sliding doors, a destination panel (interactable), and the
// ride — doors close, cab hums and pulses, the destination cluster streams in, the player is moved to the
// same cab in the destination lobby, doors open. Lift state is snapshot-able for sync.
import * as THREE from "three";
import { Kit } from "../core/kit.js";
import { Placer, doorFrame, wallPanel } from "../core/props.js";
import { Frame, panelGrid, UP } from "../core/frame.js";
import { IMP } from "../core/palette.js";
import { ROOM_BY_ID, LIFT_LOBBIES, DECK_NAMES, WALL_T } from "../core/layout.js";
import { DECAL } from "../textures.js";

const CAB_H = 3.0;
const DOOR_W = 2.6;
const DOOR_H = 2.6;

export class LiftSystem {
  constructor({ scene, materials, player, hud, audio = null }) {
    this.scene = scene;
    this.materials = materials;
    this.player = player;
    this.hud = hud;
    this.audio = audio;
    this.group = new THREE.Group();
    this.group.name = "lifts";
    scene.add(this.group);
    this.cabs = new Map(); // key lobbyId:index -> cab
    this.manager = null;
    this.ride = null; // { from, to, cabIndex, phase, t }
    this._tmp = new THREE.Vector3();
  }

  attach(manager) {
    this.manager = manager;
    manager.extras.push(this);
  }

  /** Cab world box for lobby `def`, cab index i. */
  cabBox(def, i) {
    const L = def.lift;
    const c = L.cabs[i];
    const t = WALL_T / 2;
    // the cab sits beyond the lobby wall: from the wall line (z0/z1 of the lobby box) outward
    return { x0: c.x0, x1: c.x1, z0: L.z0, z1: L.z1, floor: def.floor, wall: L.wall, doorZ: L.wall === "zmax" ? def.box[3] : def.box[2], inward: L.wall === "zmax" ? -1 : 1, t };
  }

  roomBuilt(roomId) {
    const def = ROOM_BY_ID[roomId];
    if (!def || !def.lift) return;
    for (let i = 0; i < def.lift.cabs.length; i++) {
      const key = roomId + ":" + i;
      if (this.cabs.has(key)) continue;
      this.cabs.set(key, this.buildCab(def, i));
    }
  }

  roomReleased(roomId) {
    for (const [key, cab] of this.cabs) {
      if (cab.lobby !== roomId) continue;
      cab.group.traverse((o) => o.isMesh && o.geometry.dispose());
      this.group.remove(cab.group);
      this.cabs.delete(key);
    }
  }

  buildCab(def, i) {
    const b = this.cabBox(def, i);
    const kit = new Kit(this.materials);
    const group = new THREE.Group();
    group.name = `lift_${def.id}_${i}`;
    group.visible = false;
    const y = b.floor;
    const cx = (b.x0 + b.x1) / 2;
    const inward = b.inward; // +1: cab is at larger z than the lobby wall? no: direction from cab toward the lobby
    // cab interior box (cab spans z0..z1 which lies beyond the wall line doorZ)
    const zNear = b.wall === "zmax" ? b.z0 : b.z1; // face adjacent to the lobby wall
    const zFar = b.wall === "zmax" ? b.z1 : b.z0;
    const zc = (b.z0 + b.z1) / 2;
    const depth = Math.abs(b.z1 - b.z0);
    // floor / ceiling / floor collider (covers the wall gap too)
    kit.boxMM("deckBlack", [b.x0 - 0.3, y - 0.3, Math.min(b.z0, b.doorZ) - 0.1], [b.x1 + 0.3, y, Math.max(b.z1, b.doorZ) + 0.1], { color: IMP.plateDark, texel: 0.8 });
    kit.collider([b.x0 - 0.3, y - 0.6, Math.min(b.z0, b.doorZ) - 0.1], [b.x1 + 0.3, y, Math.max(b.z1, b.doorZ) + 0.1], "liftfloor");
    kit.boxMM("paintedMetal", [b.x0 - 0.3, y + CAB_H, Math.min(b.z0, b.doorZ) - 0.1], [b.x1 + 0.3, y + CAB_H + 0.3, Math.max(b.z1, b.doorZ) + 0.1], { color: IMP.black, texel: 0.5 });
    // walls: three panelled walls (back + two sides), the fourth is the lobby wall with the door
    const back = wallFrame2(kit, b.wall === "zmax" ? [b.x1, zFar] : [b.x0, zFar], b.wall === "zmax" ? [b.x0, zFar] : [b.x1, zFar], y);
    panelGrid(back.frame, back.length, CAB_H, { rows: [0, 0.35, 1.5, 1.7, CAB_H], panelW: 1.3, seed: 41 + i, styles: { plate: 1 }, tag: "cab", depth: 0.12 });
    const sideA = wallFrame2(kit, b.wall === "zmax" ? [b.x0, zFar] : [b.x0, zNear], b.wall === "zmax" ? [b.x0, zNear] : [b.x0, zFar], y);
    panelGrid(sideA.frame, sideA.length, CAB_H, { rows: [0, 0.35, 1.5, 1.7, CAB_H], panelW: 1.5, seed: 43 + i, styles: { plate: 1 }, tag: "cab", depth: 0.12 });
    const sideB = wallFrame2(kit, b.wall === "zmax" ? [b.x1, zNear] : [b.x1, zFar], b.wall === "zmax" ? [b.x1, zFar] : [b.x1, zNear], y);
    panelGrid(sideB.frame, sideB.length, CAB_H, { rows: [0, 0.35, 1.5, 1.7, CAB_H], panelW: 1.5, seed: 45 + i, styles: { plate: 1 }, tag: "cab", depth: 0.12 });
    // ceiling light
    kit.box("paintedMetal", cx, y + CAB_H - 0.06, zc, 1.2, 0.12, 1.0, { color: IMP.black });
    const lightGeo = kit.box("emitWhiteSoft", cx, y + CAB_H - 0.125, zc, 1.0, 0.01, 0.8, { uv: "keep" });
    // destination panel on the back wall (interactable)
    const panelZ = zFar + (b.wall === "zmax" ? -0.14 : 0.14);
    const panelGroup = new THREE.Group();
    const pmat = this.materials.darkGloss.clone();
    const pm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.05), pmat);
    pm.position.set(cx + 0.9, y + 1.45, panelZ);
    panelGroup.add(pm);
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.3), this.materials.screen);
    sm.position.set(cx + 0.9, y + 1.55, panelZ + (b.wall === "zmax" ? -0.03 : 0.03));
    sm.rotation.y = b.wall === "zmax" ? Math.PI : 0;
    panelGroup.add(sm);
    const lm = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.08), this.materials.leds);
    lm.position.set(cx + 0.9, y + 1.25, panelZ + (b.wall === "zmax" ? -0.03 : 0.03));
    lm.rotation.y = b.wall === "zmax" ? Math.PI : 0;
    panelGroup.add(lm);
    group.add(panelGroup);
    // door frame on the lobby wall, doors slide apart
    const doorPos = [cx, y, b.doorZ];
    doorFrame(kit, { pos: doorPos, yaw: 0, w: DOOR_W, h: DOOR_H, d: WALL_T, accent: "emitWhite", sill: false }); // the lobbies lay their own thresholds
    kit.build(group);
    const cab = { lobby: def.id, index: i, group, box: b, center: new THREE.Vector3(cx, y, zc), doorZ: b.doorZ, openness: 0, target: 0, closeTimer: 0, slabs: [], colliders: kit.colliders, doorCollider: null, light: this.materials.emitWhiteSoft, panel: pm, pmat };
    for (const s of [-1, 1]) {
      const sk = new Kit(this.materials);
      const P = new Placer(sk, [0, 0, 0], 0);
      P.box("paintedMetal", s * DOOR_W / 4, DOOR_H / 2, 0, DOOR_W / 2 - 0.02, DOOR_H - 0.04, 0.12, { color: IMP.black });
      P.box("plate", s * DOOR_W / 4, DOOR_H / 2, 0, DOOR_W / 2 - 0.06, DOOR_H - 0.08, 0.14, { color: IMP.plate, uv: "world", texel: 1 });
      P.box("paintedMetal", s * DOOR_W / 4, DOOR_H * 0.45, 0, DOOR_W / 2 - 0.1, 0.04, 0.16, { color: IMP.black });
      P.box("emitWhite", s * 0.04, DOOR_H / 2, 0, 0.02, DOOR_H - 0.3, 0.15);
      const sg = new THREE.Group();
      sk.build(sg);
      sg.position.set(cx, y, b.doorZ);
      group.add(sg);
      cab.slabs.push({ group: sg, base: sg.position.clone(), dir: new THREE.Vector3(s, 0, 0), travel: DOOR_W / 2 + 0.1 });
    }
    cab.doorCollider = { min: new THREE.Vector3(cx - DOOR_W / 2, y, b.doorZ - 0.25), max: new THREE.Vector3(cx + DOOR_W / 2, y + DOOR_H, b.doorZ + 0.25), tag: "liftdoor", enabled: true };
    // interactable: the destination panel
    const label = "Turbolift — select deck";
    this.manager.interactables.push({ object: panelGroup, material: pmat, id: `lift:${def.id}:${i}`, label, key: "E", action: () => this.openMenu(cab) });
    this.manager.interactablesVersion++;
    this.group.add(group);
    return cab;
  }

  refreshVisibility(visibleIds, activeColliders) {
    for (const cab of this.cabs.values()) {
      const v = visibleIds.has(cab.lobby);
      cab.group.visible = v;
      if (v) {
        activeColliders.push(...cab.colliders);
        activeColliders.push(cab.doorCollider);
      }
    }
  }

  openMenu(cab) {
    if (this.ride) return;
    const others = LIFT_LOBBIES.filter((id) => id !== cab.lobby);
    this.menu = { cab, options: others };
    this.hud.showMenu(
      "TURBOLIFT — DESTINATION",
      others.map((id, k) => ({ key: String(k + 1), label: DECK_NAMES[id] })),
      (k) => this.choose(k),
    );
    this.player.frozen = true;
  }

  choose(k) {
    const m = this.menu;
    this.hud.hideMenu();
    this.player.frozen = false;
    if (!m) return;
    this.menu = null;
    if (k === null) return;
    const dest = m.options[k];
    if (!dest) return;
    this.startRide(m.cab, dest);
  }

  startRide(cab, destLobby) {
    const destDef = ROOM_BY_ID[destLobby];
    this.ride = { cab, dest: destDef, phase: "closing", t: 0, dur: 5.0 };
    cab.target = 0;
    cab.forceClosed = true;
    this.manager.prefetch(destDef.cluster);
    this.hud.setStatus(`Turbolift to ${DECK_NAMES[destLobby]}…`);
    if (this.audio) this.audio.event("lift_start", { position: cab.center });
  }

  update(dt, playerPos) {
    // doors
    for (const cab of this.cabs.values()) {
      if (!cab.group.visible) continue;
      const near = Math.abs(playerPos.x - cab.center.x) < DOOR_W / 2 + 1.2 && Math.abs(playerPos.z - cab.doorZ) < 3.0 && Math.abs(playerPos.y - cab.center.y) < 2;
      const want = !cab.forceClosed && near;
      if (want) {
        cab.closeTimer = 1.2;
        cab.target = 1;
      } else if (cab.target === 1 && !cab.forceClosed) {
        cab.closeTimer -= dt;
        if (cab.closeTimer <= 0) cab.target = 0;
      }
      if (cab.forceClosed) cab.target = 0;
      const prev = cab.openness;
      const speed = 1.6 * dt;
      if (cab.openness < cab.target) cab.openness = Math.min(cab.target, cab.openness + speed);
      else if (cab.openness > cab.target) cab.openness = Math.max(cab.target, cab.openness - speed);
      if (prev !== cab.openness) {
        const e = cab.openness < 0.5 ? 2 * cab.openness * cab.openness : 1 - Math.pow(-2 * cab.openness + 2, 2) / 2;
        for (const s of cab.slabs) s.group.position.copy(s.base).addScaledVector(s.dir, e * s.travel);
        cab.doorCollider.enabled = cab.openness < 0.8;
      }
    }
    // ride state machine
    const r = this.ride;
    if (!r) return;
    r.t += dt;
    if (r.phase === "closing") {
      if (r.cab.openness <= 0.001) {
        r.phase = "riding";
        r.t = 0;
        this.player.shake = 0.012;
      }
    } else if (r.phase === "riding") {
      const k = Math.sin((r.t / r.dur) * Math.PI);
      this.player.shake = 0.004 + 0.012 * k;
      if (r.t >= r.dur) {
        // arrive: same cab index in the destination lobby
        this.manager.ensureCluster(r.dest.cluster);
        const destCab = this.cabs.get(r.dest.id + ":" + r.cab.index) || this.cabs.get(r.dest.id + ":0");
        const rel = this._tmp.copy(this.player.position).sub(r.cab.center);
        const p = destCab.center.clone().add(rel);
        // the cab depth axis flips when the destination lobby wall is on the other side
        if (Math.sign(r.cab.box.inward) !== Math.sign(destCab.box.inward)) {
          p.z = destCab.center.z - rel.z;
          this.player.yaw += Math.PI;
        }
        p.y = destCab.center.y;
        this.player.position.copy(p);
        this.player.velocity.set(0, 0, 0);
        this.manager.teleport(p);
        r.cab.forceClosed = false;
        destCab.forceClosed = false;
        destCab.target = 1;
        destCab.closeTimer = 3;
        this.player.shake = 0;
        this.hud.setStatus(`${DECK_NAMES[r.dest.id]} — ${r.dest.title}`);
        if (this.audio) this.audio.event("lift_arrive", { position: destCab.center });
        this.manager.trimClusters(2);
        this.ride = null;
      }
    }
  }

  snapshot() {
    return this.ride ? { cab: this.ride.cab.lobby + ":" + this.ride.cab.index, dest: this.ride.dest.id, phase: this.ride.phase, t: +this.ride.t.toFixed(2) } : null;
  }
}

function wallFrame2(kit, from, to, base) {
  const o = new THREE.Vector3(from[0], base, from[1]);
  const U = new THREE.Vector3(to[0] - from[0], 0, to[1] - from[1]);
  return { frame: new Frame(kit, o, U, UP), length: U.length() };
}

export { DECAL, wallPanel };
