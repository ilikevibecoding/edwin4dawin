// Turbolifts: real moving cars in tall shafts. The player rides the car (its floor is a `carry`
// surface), landing doors are lift-driven doors from the DoorSystem, and the zone streamer is told to
// swap decks at the midpoint of a ride so the destination is resident when the doors open.
import * as THREE from "three";
import { Kit } from "../kit.js";
import { PALETTE } from "../materials.js";
import { pointLight } from "./lib.js";
import { LIFTS, DECKS, ZONES } from "../config/shipSpec.js";

const CAR_H = 2.6;
const DOOR_W = 2.0;
const DOOR_H = 2.4;

export class LiftSystem {
  constructor(materials, doors) {
    this.materials = materials;
    this.doors = doors;
    this.lifts = [];
    this.group = new THREE.Group();
    this.group.name = "lifts";
    this.colliders = [];
    this.floors = [];
    this.fixtures = [];
    this.interactables = [];
    this.onZoneChange = null;
    this.onPrepareZone = null;
    this.audio = null;
  }

  build(parent) {
    parent.add(this.group);
    const kit = new Kit(this.materials);
    for (const [id, spec] of Object.entries(LIFTS)) this._buildLift(kit, id, spec);
    kit.build(this.group);
    this.colliders.push(...kit.colliders);
    this.floors.push(...kit.floors);
  }

  _buildLift(kit, id, spec) {
    const decks = spec.decks.map((d) => ({ id: d, y: DECKS[d].floorY, zone: DECKS[d].zone, name: DECKS[d].name }));
    const yMin = Math.min(...decks.map((d) => d.y)) - 1.0;
    const yMax = Math.max(...decks.map((d) => d.y)) + CAR_H + 1.6;
    const { x0, x1, z0, z1, doorSide } = spec;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const w = x1 - x0;
    const d = z1 - z0;
    const T = 0.16;

    // shaft walls (inside faces), corner rails, blue guide strips every 3 m on the side walls
    const walls = { "-x": x0, "+x": x1, "-z": z0, "+z": z1 };
    for (const [dir, c] of Object.entries(walls)) {
      const isDoor = dir === doorSide;
      if (dir === "-x" || dir === "+x") {
        if (!isDoor) kit.boxMM("paintedMetal", [c - (dir === "-x" ? T : 0), yMin, z0 - T], [c + (dir === "+x" ? T : 0), yMax, z1 + T], { color: PALETTE.darkMetal, uv: "world", texel: 0.5 });
      } else if (!isDoor) kit.boxMM("paintedMetal", [x0 - T, yMin, c - (dir === "-z" ? T : 0)], [x1 + T, yMax, c + (dir === "+z" ? T : 0)], { color: PALETTE.darkMetal, uv: "world", texel: 0.5 });
    }
    // door-side wall: solid except a portal at each landing
    const portals = decks.map((dk) => [dk.y - 0.02, dk.y + DOOR_H + 0.3]);
    portals.sort((a, b) => a[0] - b[0]);
    let yc = yMin;
    const doorWall = (ya, yb) => {
      if (yb - ya < 0.02) return;
      if (doorSide === "-x") kit.boxMM("paintedMetal", [x0 - T, ya, z0 - T], [x0, yb, z1 + T], { color: PALETTE.darkMetal, uv: "world", texel: 0.5 });
      else if (doorSide === "+x") kit.boxMM("paintedMetal", [x1, ya, z0 - T], [x1 + T, yb, z1 + T], { color: PALETTE.darkMetal, uv: "world", texel: 0.5 });
      else if (doorSide === "-z") kit.boxMM("paintedMetal", [x0 - T, ya, z0 - T], [x1 + T, yb, z0], { color: PALETTE.darkMetal, uv: "world", texel: 0.5 });
      else kit.boxMM("paintedMetal", [x0 - T, ya, z1], [x1 + T, yb, z1 + T], { color: PALETTE.darkMetal, uv: "world", texel: 0.5 });
    };
    for (const [a, b] of portals) {
      doorWall(yc, a);
      // side fill beside the 2 m portal (shaft is 3 m wide)
      const along = doorSide === "-x" || doorSide === "+x" ? [z0, z1] : [x0, x1];
      const mid = (along[0] + along[1]) / 2;
      for (const [s0, s1] of [[along[0] - T, mid - DOOR_W / 2], [mid + DOOR_W / 2, along[1] + T]]) {
        if (doorSide === "-x") kit.boxMM("paintedMetal", [x0 - T, a, s0], [x0, b, s1], { color: PALETTE.darkMetal, texel: 0.5 });
        else if (doorSide === "+x") kit.boxMM("paintedMetal", [x1, a, s0], [x1 + T, b, s1], { color: PALETTE.darkMetal, texel: 0.5 });
        else if (doorSide === "-z") kit.boxMM("paintedMetal", [s0, a, z0 - T], [s1, b, z0], { color: PALETTE.darkMetal, texel: 0.5 });
        else kit.boxMM("paintedMetal", [s0, a, z1], [s1, b, z1 + T], { color: PALETTE.darkMetal, texel: 0.5 });
      }
      yc = b;
    }
    doorWall(yc, yMax);
    kit.boxMM("paintedMetal", [x0 - T, yMax, z0 - T], [x1 + T, yMax + T, z1 + T], { color: PALETTE.darkMetal });
    kit.boxMM("paintedMetal", [x0 - T, yMin - T, z0 - T], [x1 + T, yMin, z1 + T], { color: PALETTE.darkMetal });
    for (const [sx, sz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) kit.boxMM("metal", [sx - 0.08, yMin, sz - 0.08], [sx + 0.08, yMax, sz + 0.08], { color: PALETTE.gunmetal, uv: "world", texel: 0.5 });
    const sideA = doorSide === "-x" || doorSide === "+x" ? "z" : "x";
    for (let y = yMin + 1.5; y < yMax - 1; y += 3) {
      if (sideA === "z") {
        kit.boxMM("emitBlue", [x0 + 0.3, y, z0 + 0.005], [x1 - 0.3, y + 0.06, z0 + 0.02]);
        kit.boxMM("emitBlue", [x0 + 0.3, y, z1 - 0.02], [x1 - 0.3, y + 0.06, z1 - 0.005]);
      } else {
        kit.boxMM("emitBlue", [x0 + 0.005, y, z0 + 0.3], [x0 + 0.02, y + 0.06, z1 - 0.3]);
        kit.boxMM("emitBlue", [x1 - 0.02, y, z0 + 0.3], [x1 - 0.005, y + 0.06, z1 - 0.3]);
      }
    }

    // landing doors (lift-driven) + portal frames, one per deck, built into the shared lifts kit
    const landingDoors = {};
    for (const dk of decks) {
      const axis = doorSide === "-x" || doorSide === "+x" ? "z" : "x";
      const px = doorSide === "-x" ? x0 : doorSide === "+x" ? x1 : cx;
      const pz = doorSide === "-z" ? z0 : doorSide === "+z" ? z1 : cz;
      landingDoors[dk.id] = this.doors.add(kit, { id: `${id}-${dk.id}`, x: px, z: pz, y: dk.y, width: DOOR_W, height: DOOR_H, axis, depth: 0.36, zone: null, lift: id });
      // deck plate + call panel beside the portal (on the landing side)
      const out = doorSide === "-x" ? -1 : 1;
      if (axis === "z") {
        kit.box("satinBlack", px + out * 0.1, dk.y + 1.35, pz + 1.35, 0.06, 0.34, 0.22);
        kit.box("emitBlue", px + out * 0.135, dk.y + 1.42, pz + 1.35, 0.01, 0.06, 0.12);
        kit.box("emitAmber", px + out * 0.135, dk.y + 1.28, pz + 1.35, 0.01, 0.04, 0.12);
      } else {
        const outZ = doorSide === "-z" ? -1 : 1;
        kit.box("satinBlack", px + 1.35, dk.y + 1.35, pz + outZ * 0.1, 0.22, 0.34, 0.06);
        kit.box("emitBlue", px + 1.35, dk.y + 1.42, pz + outZ * 0.135, 0.12, 0.06, 0.01);
        kit.box("emitAmber", px + 1.35, dk.y + 1.28, pz + outZ * 0.135, 0.12, 0.04, 0.01);
      }
    }

    // the car
    const car = new THREE.Group();
    car.name = id + "-car";
    car.position.set(cx, decks[0].y, cz);
    this.group.add(car);
    const ck = new Kit(this.materials);
    const hw = w / 2 - 0.12;
    const hd = d / 2 - 0.12;
    ck.boxMM("deck", [-hw, -0.1, -hd], [hw, 0.0, hd], { color: PALETTE.impGreyDark, uv: "world", texel: 1 });
    ck.boxMM("satinBlack", [-hw, 0, -hd], [hw, 0.006, hd]);
    ck.boxMM("deck", [-hw + 0.2, 0, -hd + 0.2], [hw - 0.2, 0.012, hd - 0.2], { color: PALETTE.impGrey, uv: "world", texel: 1 });
    const wallsCar = { "-x": [-hw - 0.06, -hw, -hd, hd], "+x": [hw, hw + 0.06, -hd, hd], "-z": [-hw, hw, -hd - 0.06, -hd], "+z": [-hw, hw, hd, hd + 0.06] };
    for (const [dir, [ax0, ax1, az0, az1]] of Object.entries(wallsCar)) {
      if (dir === doorSide) continue;
      ck.boxMM("painted", [ax0, 0, az0], [ax1, CAR_H, az1], { color: PALETTE.creamDark, uv: "world", texel: 1 });
      // black band + light bar
      const mid = dir === "-x" || dir === "+x" ? [ax0 + (dir === "-x" ? 0.062 : -0.002), null] : [null, az0 + (dir === "-z" ? 0.062 : -0.002)];
      if (dir === "-x" || dir === "+x") {
        ck.boxMM("satinBlack", [mid[0] - 0.005, 1.0, -hd + 0.15], [mid[0] + 0.005, 1.35, hd - 0.15]);
        ck.boxMM("emitWhiteSoft", [mid[0] - 0.006, 2.15, -hd + 0.2], [mid[0] + 0.006, 2.25, hd - 0.2], { uv: "keep" });
      } else {
        ck.boxMM("satinBlack", [-hw + 0.15, 1.0, mid[1] - 0.005], [hw - 0.15, 1.35, mid[1] + 0.005]);
        ck.boxMM("emitWhiteSoft", [-hw + 0.2, 2.15, mid[1] - 0.006], [hw - 0.2, 2.25, mid[1] + 0.006], { uv: "keep" });
      }
    }
    ck.boxMM("paintedMetal", [-hw - 0.06, CAR_H, -hd - 0.06], [hw + 0.06, CAR_H + 0.08, hd + 0.06], { color: PALETTE.gunmetal });
    ck.boxMM("satinBlack", [-0.6, CAR_H - 0.05, -0.6], [0.6, CAR_H, 0.6]);
    ck.boxMM("emitWhiteSoft", [-0.5, CAR_H - 0.07, -0.5], [0.5, CAR_H - 0.05, 0.5], { uv: "keep" });
    // control panel on the wall opposite the door
    const opp = { "-x": "+x", "+x": "-x", "-z": "+z", "+z": "-z" }[doorSide];
    let panelPos;
    if (opp === "-x") panelPos = [-hw + 0.05, 1.35, 0.6];
    else if (opp === "+x") panelPos = [hw - 0.05, 1.35, -0.6];
    else if (opp === "-z") panelPos = [-0.6, 1.35, -hd + 0.05];
    else panelPos = [0.6, 1.35, hd - 0.05];
    const panelMat = this.materials.satinBlack.clone();
    const panelGeo = new THREE.BoxGeometry(opp === "-x" || opp === "+x" ? 0.08 : 0.42, 0.62, opp === "-x" || opp === "+x" ? 0.42 : 0.08);
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(...panelPos);
    car.add(panel);
    // deck indicator screen + buttons on the panel face
    const face = opp === "-x" ? [0.045, 0, 0] : opp === "+x" ? [-0.045, 0, 0] : opp === "-z" ? [0, 0, 0.045] : [0, 0, -0.045];
    const scr = new THREE.Mesh(new THREE.BoxGeometry(opp === "-x" || opp === "+x" ? 0.01 : 0.3, 0.12, opp === "-x" || opp === "+x" ? 0.3 : 0.01), this.materials.screens[4]);
    scr.position.set(panelPos[0] + face[0], panelPos[1] + 0.18, panelPos[2] + face[2]);
    car.add(scr);
    for (let i = 0; i < decks.length; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(opp === "-x" || opp === "+x" ? 0.01 : 0.08, 0.08, opp === "-x" || opp === "+x" ? 0.08 : 0.01), i === 0 ? this.materials.emitAmber : this.materials.emitBlue);
      const off = (i - (decks.length - 1) / 2) * 0.11;
      b.position.set(panelPos[0] + face[0] + (opp === "-z" || opp === "+z" ? off : 0), panelPos[1] - 0.05, panelPos[2] + face[2] + (opp === "-x" || opp === "+x" ? off : 0));
      car.add(b);
    }
    ck.build(car);
    // car light fixture (moves with the car)
    const fx = pointLight(0xe8f0ff, 2.6, 5, [0, CAR_H - 0.3, 0]);
    fx.visible = false;
    fx.userData.moving = true; // rides with the car, so the light pool must not cache its position
    car.add(fx);
    this.fixtures.push(fx);

    // colliders: three car walls span the whole shaft (the car is the only thing in it); the door side
    // is blocked unless the car is parked at a landing with the door open
    const tall = (ax0, ax1, az0, az1) => this.colliders.push({ min: new THREE.Vector3(ax0, yMin, az0), max: new THREE.Vector3(ax1, yMax, az1), tag: id + "-carwall" });
    if (doorSide !== "-x") tall(x0 - 0.2, x0 + 0.14, z0, z1);
    if (doorSide !== "+x") tall(x1 - 0.14, x1 + 0.2, z0, z1);
    if (doorSide !== "-z") tall(x0, x1, z0 - 0.2, z0 + 0.14);
    if (doorSide !== "+z") tall(x0, x1, z1 - 0.14, z1 + 0.2);
    const doorCol = { min: new THREE.Vector3(), max: new THREE.Vector3(), tag: id + "-cardoor", disabled: false };
    if (doorSide === "-x") doorCol.min.set(x0 - 0.2, yMin, z0), doorCol.max.set(x0 + 0.1, yMax, z1);
    else if (doorSide === "+x") doorCol.min.set(x1 - 0.1, yMin, z0), doorCol.max.set(x1 + 0.2, yMax, z1);
    else if (doorSide === "-z") doorCol.min.set(x0, yMin, z0 - 0.2), doorCol.max.set(x1, yMax, z0 + 0.1);
    else doorCol.min.set(x0, yMin, z1 - 0.1), doorCol.max.set(x1, yMax, z1 + 0.2);
    this.colliders.push(doorCol);

    const lift = {
      id,
      spec,
      decks,
      car,
      panel,
      panelMat,
      buttons: car.children.filter((c) => c.geometry && c.geometry.parameters && c.geometry.parameters.height === 0.08),
      landingDoors,
      doorCol,
      state: "idle",
      deckIndex: 0,
      targetIndex: 0,
      v: 0,
      y: decks[0].y,
      zoneSwitched: false,
      floor: null,
    };
    const self = lift;
    lift.floor = { x0: cx - hw, z0: cz - hd, x1: cx + hw, z1: cz + hd, carry: true, get y() { return self.car.position.y; } };
    this.floors.push(lift.floor);
    landingDoors[decks[0].id].open = 1;
    landingDoors[decks[0].id].target = 1;
    this.lifts.push(lift);

    const item = {
      id: id + "-panel",
      key: "E",
      label: this._label(lift),
      object: panel,
      material: panelMat,
      freeze: false,
      action: async () => this.travelNext(lift),
    };
    lift.item = item;
    this.interactables.push(item);
  }

  _label(lift) {
    const next = lift.decks[(lift.deckIndex + 1) % lift.decks.length];
    return `Turbolift to ${next.name}`;
  }

  _start(lift, targetIndex) {
    lift.targetIndex = targetIndex;
    lift.state = "closing";
    lift.zoneSwitched = false;
    this.doors.setOpen(lift.landingDoors[lift.decks[lift.deckIndex].id], false);
    // build the destination zone now, behind the closing doors, not in the middle of the ride
    const to = lift.decks[targetIndex];
    if (this.onPrepareZone && to.zone !== lift.decks[lift.deckIndex].zone) this.onPrepareZone(to.zone);
    if (this.audio) this.audio.play("lift.start", lift.car);
    return true;
  }

  travelNext(lift) {
    if (lift.state !== "idle") return false;
    return this._start(lift, (lift.deckIndex + 1) % lift.decks.length);
  }

  travelTo(liftId, deckId) {
    const lift = this.lifts.find((l) => l.id === liftId);
    if (!lift || lift.state !== "idle") return false;
    const idx = lift.decks.findIndex((d) => d.id === deckId);
    if (idx < 0 || idx === lift.deckIndex) return false;
    return this._start(lift, idx);
  }

  update(dt) {
    for (const lift of this.lifts) {
      const from = lift.decks[lift.deckIndex];
      const to = lift.decks[lift.targetIndex];
      const door = lift.landingDoors[from.id];
      if (lift.state === "closing") {
        if (door.open < 0.02) {
          lift.state = "moving";
          lift.v = 0;
        }
      } else if (lift.state === "moving") {
        const { vmax, accel } = lift.spec;
        const dir = Math.sign(to.y - lift.y);
        const remaining = Math.abs(to.y - lift.y);
        // trapezoid profile: brake distance v²/2a
        const brake = (lift.v * lift.v) / (2 * accel);
        if (remaining <= brake + 0.01) lift.v = Math.max(0.6, lift.v - accel * dt);
        else lift.v = Math.min(vmax, lift.v + accel * dt);
        const step = Math.min(remaining, lift.v * dt);
        lift.y += dir * step;
        lift.car.position.y = lift.y;
        const total = Math.abs(to.y - from.y);
        if (!lift.zoneSwitched && Math.abs(lift.y - from.y) > total * 0.5) {
          lift.zoneSwitched = true;
          if (this.onZoneChange && to.zone !== from.zone) this.onZoneChange(to.zone, to.id);
        }
        if (remaining <= 0.001) {
          lift.y = to.y;
          lift.car.position.y = to.y;
          lift.deckIndex = lift.targetIndex;
          lift.state = "opening";
          this.doors.setOpen(lift.landingDoors[to.id], true);
          lift.landingDoors[to.id].timer = 1e9; // lift doors stay open until the next ride
          lift.item.label = this._label(lift);
          lift.buttons.forEach((b, i) => (b.material = i === lift.deckIndex ? this.materials.emitAmber : this.materials.emitBlue));
          if (this.audio) this.audio.play("lift.arrive", lift.car);
        }
      } else if (lift.state === "opening") {
        if (lift.landingDoors[to.id].open > 0.98) lift.state = "idle";
      }
      const atLanding = lift.state === "idle" || lift.state === "opening";
      lift.doorCol.disabled = atLanding && lift.landingDoors[lift.decks[lift.deckIndex].id].open > 0.55;
    }
  }

  serialize() {
    return this.lifts.map((l) => ({ id: l.id, state: l.state, deck: l.decks[l.deckIndex].id, target: l.decks[l.targetIndex].id, y: +l.y.toFixed(3), v: +l.v.toFixed(3), zoneSwitched: l.zoneSwitched }));
  }

  // Replay a serialised lift state (network sync / save): car height and velocity, phase, landing doors.
  applyState(states) {
    for (const st of states) {
      const lift = this.lifts.find((l) => l.id === st.id);
      if (!lift) continue;
      lift.deckIndex = Math.max(0, lift.decks.findIndex((d) => d.id === st.deck));
      lift.targetIndex = Math.max(0, lift.decks.findIndex((d) => d.id === st.target));
      lift.state = st.state;
      lift.y = st.y;
      lift.v = st.v || 0;
      lift.zoneSwitched = !!st.zoneSwitched;
      lift.car.position.y = lift.y;
      for (const dk of lift.decks) {
        const door = lift.landingDoors[dk.id];
        const open = lift.state === "idle" && dk === lift.decks[lift.deckIndex] ? 1 : 0;
        door.open = open;
        door.target = open;
      }
      lift.item.label = this._label(lift);
      lift.buttons.forEach((b, i) => (b.material = i === lift.deckIndex ? this.materials.emitAmber : this.materials.emitBlue));
    }
    if (this.doors.mesh) this.doors.applyState(this.doors.serialize());
  }

  zoneOfDeck(deckId) {
    return DECKS[deckId].zone;
  }
}

export { ZONES };
