// Turbolifts: a cab off each lobby wall with an auto-opening door, a deck selector panel and a ride
// sequence (doors seal, cab lights strobe, deck counter runs, subtle shake, then the far doors open).
// The ride is a teleport between cabs — cheap, deterministic and trivially network-syncable.
import * as THREE from "three";
import { LIFTS, CLUSTERS, ROOMS, STD } from "../config/layout.js";
import { Door } from "./doors.js";
import { IMP } from "../materials/imperial.js";
import { impDecalRect } from "../materials/imperialTextures.js";
import { pointLightDesc, walkable } from "./impKit.js";

const RIDE_TIME = 4.2;

export class LiftSystem {
  constructor({ zone, mats, player, hud, audio, onArrive }) {
    this.zone = zone;
    this.mats = mats;
    this.player = player;
    this.hud = hud;
    this.audio = audio;
    this.onArrive = onArrive;
    this.lifts = new Map();
    this.riding = null;
    this.selecting = null;
    this._onKey = (e) => this.onKey(e);
    document.addEventListener("keydown", this._onKey);
  }

  // Openings the lobby wall must leave for its lift doors
  static openingsFor(lobbyId) {
    const out = { west: [], east: [] };
    for (const l of LIFTS) {
      if (l.lobby !== lobbyId) continue;
      const room = ROOMS[lobbyId];
      const [, z0, , z1] = room.box;
      const key = l.side > 0 ? "east" : "west";
      const u = key === "east" ? l.c - z0 : z1 - l.c;
      out[key].push({ type: "door", u0: u - STD.doorW / 2, u1: u + STD.doorW / 2, v0: 0, v1: STD.doorH, lift: l });
    }
    return out;
  }

  // Called by the lobby room builder: cab geometry into the lobby's kit + door + panel interactable
  buildCabs(kit, ctx, lobbyId) {
    const y = ctx.floorY;
    for (const spec of LIFTS) {
      if (spec.lobby !== lobbyId) continue;
      const s = spec.side;
      const x0 = s > 0 ? spec.at : spec.at - STD.liftCabD; // cab x range
      const x1 = s > 0 ? spec.at + STD.liftCabD : spec.at;
      const z0 = spec.c - STD.liftCabW / 2;
      const z1 = spec.c + STD.liftCabW / 2;
      const h = STD.liftCabH;
      const t = 0.2;
      // floor / ceiling
      kit.boxMM("impDeck", [x0, y - 0.1, z0], [x1, y, z1], { color: IMP.wallDark, texel: 1 });
      kit.boxMM("impGloss", [x0 + 0.3, y - 0.001, z0 + 0.3], [x1 - 0.3, y + 0.004, z1 - 0.3], { color: IMP.white, texel: 0.5 });
      kit.boxMM("impPaintedMetal", [x0, y + h, z0], [x1, y + h + t, z1], { color: IMP.trim, texel: 1 });
      kit.boxMM("impPaintedMetal", [x0 + 0.4, y + h - 0.06, z0 + 0.4], [x1 - 0.4, y + h, z1 - 0.4], { color: IMP.trim, texel: 1 });
      // strobe light panel in the ceiling (own material so the ride can animate it)
      const strobeMat = new THREE.MeshStandardMaterial({ color: 0x0a0e14, emissive: IMP.coolWhite, emissiveIntensity: 2.2, roughness: 0.5 });
      const strobe = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 - 1.0, 0.02, z1 - z0 - 1.0), strobeMat);
      strobe.position.set((x0 + x1) / 2, y + h - 0.07, (z0 + z1) / 2);
      ctx.add(strobe);
      // walls: back (far x), two sides. dark panels, band, ribs
      const back = s > 0 ? x1 : x0;
      const bs = s > 0 ? -1 : 1; // normal into the cab
      kit.boxMM("impPaintedMetal", [Math.min(back, back + bs * t), y, z0], [Math.max(back, back + bs * t), y + h, z1], { color: IMP.trim, texel: 1 });
      kit.boxMM("impPanel", [Math.min(back + bs * t, back + bs * (t + 0.06)), y + 0.3, z0 + 0.15], [Math.max(back + bs * t, back + bs * (t + 0.06)), y + h - 0.2, z1 - 0.15], { color: IMP.wallMid, uv: "keep" });
      for (const zz of [z0, z1 - t]) {
        kit.boxMM("impPaintedMetal", [x0, y, zz], [x1, y + h, zz + t], { color: IMP.trim, texel: 1 });
        const inner = zz === z0 ? z0 + t : z1 - t;
        const dir = zz === z0 ? 1 : -1;
        kit.boxMM("impPanel", [x0 + 0.15, y + 0.3, Math.min(inner, inner + dir * 0.06)], [x1 - 0.15, y + h - 0.2, Math.max(inner, inner + dir * 0.06)], { color: IMP.wallMid, uv: "keep" });
        // light band on the side walls
        kit.boxMM("lightBand", [x0 + 0.3, y + 2.0, Math.min(inner + dir * 0.062, inner + dir * 0.07)], [x1 - 0.3, y + 2.12, Math.max(inner + dir * 0.062, inner + dir * 0.07)], { uv: "keep" });
        // handrail
        kit.cyl("impMetal", (x0 + x1) / 2, y + 1.0, inner + dir * 0.12, 0.02, x1 - x0 - 0.5, "x", { color: IMP.steel, segments: 8 });
      }
      // the wall the door sits in (lobby wall plane) inside the cab: jamb region built by the Door
      // deck panel on the back wall: indicator screen + selector grid (interactable)
      const panelMat = this.mats.impPaintedMetal.clone();
      const panel = new THREE.Group();
      panel.name = "liftPanel_" + spec.id;
      const px = back + bs * (t + 0.12);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.5), panelMat);
      body.position.set(px, y + 1.35, spec.c + 0.6);
      panel.add(body);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.2), this.mats.screens[3]);
      screen.position.set(px + bs * 0.062, y + 1.5, spec.c + 0.6);
      screen.rotation.y = bs > 0 ? Math.PI / 2 : -Math.PI / 2;
      panel.add(screen);
      const grid = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.22), this.mats.blinkSparse);
      grid.position.set(px + bs * 0.062, y + 1.2, spec.c + 0.6);
      grid.rotation.y = bs > 0 ? Math.PI / 2 : -Math.PI / 2;
      panel.add(grid);
      panel.children.forEach((m) => {
        m.castShadow = false;
        m.receiveShadow = true;
      });
      ctx.add(panel);
      const decal = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), this.mats.impDecal);
      decal.position.set(back + bs * (t + 0.064), y + 2.35, spec.c);
      decal.rotation.y = bs > 0 ? Math.PI / 2 : -Math.PI / 2;
      decal.geometry.setAttribute("uv", new THREE.Float32BufferAttribute(rectUV(impDecalRect(14)), 2));
      ctx.add(decal);
      // cab light + walkable + colliders
      pointLightDesc(ctx, 0xdfe8ff, 2.6, 5, [(x0 + x1) / 2, y + h - 0.5, (z0 + z1) / 2], 1);
      walkable(ctx, x0, z0, x1, z1, y, "lift:" + spec.id);
      kit.collider([Math.min(back, back + bs * (t + 0.2)), y, z0], [Math.max(back, back + bs * (t + 0.2)), y + h, z1], "liftBack");
      kit.collider([x0, y, z0 - 0.01], [x1, y + h, z0 + t], "liftSide");
      kit.collider([x0, y, z1 - t], [x1, y + h, z1 + 0.01], "liftSide");
      // door in the lobby wall plane
      const door = new Door({ id: spec.id + "_door", axis: "x", at: spec.at, c: spec.c, kind: "std", a: lobbyId, b: lobbyId }, y, this.mats);
      this.zone.addDoor(lobbyId, door);
      const lift = { spec, door, strobe, strobeMat, panel, panelMat, cab: { x0, x1, z0, z1, y }, cluster: spec.cluster, lobbyId };
      this.lifts.set(spec.id, lift);
      ctx.interactables.push({
        object: panel,
        material: panelMat,
        id: "lift:" + spec.id,
        label: "Select deck",
        key: "E",
        onActivate: () => this.openSelector(lift),
      });
      ctx.view("lift_" + spec.id, s > 0 ? x0 - 2.0 : x1 + 2.0, y + STD.eye, spec.c, s > 0 ? -90 : 90, -4);
    }
  }

  openSelector(lift) {
    if (this.riding) return false;
    this.selecting = lift;
    const decks = Object.values(CLUSTERS).filter((c) => c.id !== lift.cluster);
    this.hud.showMenu(
      "TURBOLIFT — SELECT DECK",
      decks.map((c, i) => ({ key: String(i + 1), label: `DECK ${String(c.deck).padStart(2, "0")}  ${c.name.split("—").pop().trim()}`, value: c.id })),
      "Esc cancel",
    );
    return true;
  }

  onKey(e) {
    if (!this.selecting) return;
    if (e.code === "Escape") {
      this.selecting = null;
      this.hud.hideMenu();
      return;
    }
    const decks = Object.values(CLUSTERS).filter((c) => c.id !== this.selecting.cluster);
    const idx = parseInt(e.key, 10) - 1;
    if (idx >= 0 && idx < decks.length) {
      const dest = decks[idx].id;
      const lift = this.selecting;
      this.selecting = null;
      this.hud.hideMenu();
      this.ride(lift, dest);
    }
  }

  // debug / scripted: ride from a lobby's first lift to a cluster
  rideFrom(lobbyId, destCluster) {
    const lift = [...this.lifts.values()].find((l) => l.lobbyId === lobbyId);
    if (!lift) return false;
    return this.ride(lift, destCluster);
  }

  ride(lift, destCluster) {
    if (this.riding) return false;
    const target = [...this.lifts.values()].find((l) => l.cluster === destCluster && l.spec.side === lift.spec.side) || [...this.lifts.values()].find((l) => l.cluster === destCluster);
    if (!target) return false;
    this.riding = { from: lift, to: target, t: 0, phase: "sealing" };
    lift.door.forceClosed = true;
    lift.door.setState("closing");
    this.player.frozen = true;
    this.hud.setStatus(`Turbolift: ${CLUSTERS[destCluster].name}`);
    if (this.audio) this.audio.play("lift_start");
    return true;
  }

  update(dt, t) {
    // forceClosed doors ignore their trigger
    for (const l of this.lifts.values()) {
      if (l.door.forceClosed && l.door.state !== "closed" && l.door.state !== "closing") l.door.setState("closing");
    }
    const r = this.riding;
    if (!r) return;
    r.t += dt;
    const { from, to } = r;
    if (r.phase === "sealing") {
      if (from.door.progress <= 0.001) {
        r.phase = "moving";
        r.t = 0;
        this.fromDeck = CLUSTERS[from.cluster].deck;
        this.toDeck = CLUSTERS[to.cluster].deck;
        if (this.audio) this.audio.play("lift_move");
      }
    } else if (r.phase === "moving") {
      const k = Math.min(1, r.t / RIDE_TIME);
      // strobe the cab light as shaft lights pass; ease in/out of the ride
      const speed = Math.sin(k * Math.PI);
      const strobe = 0.55 + 0.45 * Math.abs(Math.sin(r.t * (6 + 10 * speed)));
      from.strobeMat.emissiveIntensity = 1.2 + 1.6 * strobe;
      this.player.shake = 0.012 * speed;
      const deck = Math.round(this.fromDeck + (this.toDeck - this.fromDeck) * k);
      this.hud.setDeckIndicator(`DECK ${String(deck).padStart(2, "0")}`);
      if (k >= 1) {
        // teleport: keep the player's offset inside the cab
        const c0 = from.cab;
        const c1 = to.cab;
        const p = this.player.position;
        const ox = p.x - (c0.x0 + c0.x1) / 2;
        const oz = p.z - (c0.z0 + c0.z1) / 2;
        // cabs on opposite sides mirror in x
        const mirror = from.spec.side !== to.spec.side ? -1 : 1;
        this.player.teleport((c1.x0 + c1.x1) / 2 + ox * mirror, c1.y, (c1.z0 + c1.z1) / 2 + oz, mirror < 0 ? this.player.yaw + Math.PI : this.player.yaw);
        from.strobeMat.emissiveIntensity = 2.2;
        this.player.shake = 0;
        r.phase = "arriving";
        r.t = 0;
        from.door.forceClosed = false;
        to.door.forceClosed = false;
        if (this.audio) this.audio.play("lift_arrive");
        if (this.onArrive) this.onArrive(to.cluster);
      }
    } else if (r.phase === "arriving") {
      this.hud.setDeckIndicator("");
      this.player.frozen = false;
      this.hud.setStatus(`${CLUSTERS[to.cluster].name}.`);
      this.riding = null;
    }
  }

  getState() {
    return { riding: this.riding ? { from: this.riding.from.spec.id, to: this.riding.to.spec.id, phase: this.riding.phase, t: +this.riding.t.toFixed(2) } : null };
  }
}

function rectUV([u0, v0, u1, v1]) {
  return [u0, v1, u1, v1, u0, v0, u1, v0];
}
