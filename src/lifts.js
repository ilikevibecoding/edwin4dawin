// Turbolift system. Every lobby has one car per shaft; a ride closes the car door, streams the
// shaft lights past the car windows, shakes the eye a little, then relocates the player to the same
// shaft's car on the destination deck and opens the door. Horizontal travel (hangar deck) is canon.
import * as THREE from "three";
import { ROOMS, ROOM_BY_ID, DECKS, DECK_ORDER } from "./spec.js";

const RIDE_BASE = 2.2; // s
const RIDE_PER_DECK = 0.7; // s per deck of separation

export class LiftSystem {
  constructor({ cells, player, hud, audio = null }) {
    this.cells = cells;
    this.player = player;
    this.hud = hud;
    this.audio = audio;
    this.cars = ROOMS.filter((r) => r.kind === "lift");
    this.byShaftDeck = new Map();
    for (const c of this.cars) this.byShaftDeck.set(`${c.shaft}:${c.deck}`, c);
    this.state = "idle"; // idle | boarding | riding
    this.currentCar = null;
    this.ride = null;
    this.closeTimer = 0;
    this.onArrive = null;
    this.menuShown = false;
  }

  doorFor(car) {
    return this.cells.doors.get(`${car.lobby}__${car.id}`);
  }

  /** Deck menu entries for the HUD (excludes the current deck). */
  menuFor(car) {
    return DECK_ORDER.filter((d) => d !== car.deck).map((d) => ({ key: String(DECK_ORDER.indexOf(d) + 1), deck: d, name: DECKS[d].name }));
  }

  update(dt, t) {
    const p = this.player.position;
    const cur = this.cells.current;
    if (this.state === "riding") {
      this.updateRide(dt, t);
      return;
    }
    // player inside a car?
    if (cur && cur.room.kind === "lift") {
      const car = cur.room;
      const door = this.doorFor(car);
      if (this.currentCar !== car) {
        this.currentCar = car;
        this.closeTimer = 0.9;
      }
      // walking up to a closed door from inside reopens it (leaving without riding)
      if (door && door.target === 0) {
        const nearDoor = Math.abs(p.z - door.pos.z) < 1.0 && Math.abs(p.x - door.pos.x) < 1.2;
        if (nearDoor) {
          door.open();
          this.closeTimer = 1.0;
          if (this.menuShown) {
            this.menuShown = false;
            this.hud.hideLiftMenu();
          }
        }
      }
      this.closeTimer -= dt;
      if (door && this.closeTimer <= 0 && door.target === 1) door.close();
      if (door && door.openness === 0 && !this.menuShown) {
        this.menuShown = true;
        this.hud.showLiftMenu(this.menuFor(car), car.deck);
      }
      return;
    }
    // player in a lobby: open the nearest car's door when approached; close others
    if (this.menuShown) {
      this.menuShown = false;
      this.hud.hideLiftMenu();
    }
    this.currentCar = null;
    for (const car of this.cars) {
      const door = this.doorFor(car);
      if (!door) continue;
      if (cur && car.lobby === cur.id && door.inTrigger(p)) {
        door.open();
        door.holdTimer = 1.0;
      } else if (door.target === 1) {
        door.holdTimer -= dt;
        if (door.holdTimer <= 0) door.close();
      }
    }
  }

  /** Called by the input layer when the player picks a deck while inside a car. */
  select(deckId) {
    if (this.state !== "idle" || !this.currentCar) return false;
    const car = this.currentCar;
    if (deckId === car.deck) return false;
    const dest = this.byShaftDeck.get(`${car.shaft}:${deckId}`);
    if (!dest) return false;
    const door = this.doorFor(car);
    if (door && door.openness > 0) return false;
    const decks = Math.abs(DECK_ORDER.indexOf(deckId) - DECK_ORDER.indexOf(car.deck));
    const dy = ROOM_BY_ID[dest.id].origin[1] - car.origin[1];
    this.ride = { from: car, to: dest, t: 0, dur: RIDE_BASE + RIDE_PER_DECK * decks, dir: Math.sign(dy) || 1, decks };
    this.state = "riding";
    this.menuShown = false;
    this.hud.hideLiftMenu();
    this.hud.setStatus(`Turbolift: ${DECKS[deckId].name}`);
    this.player.frozen = true;
    if (this.audio) this.audio.play("lift_start", new THREE.Vector3(...car.origin));
    // tell the car cells to animate their shaft lights
    this.setCarAnim(car, true, this.ride.dir);
    return true;
  }

  setCarAnim(car, on, dir = 1) {
    const cell = this.cells.cells.get(car.id);
    if (cell && cell.liftAnim) cell.liftAnim(on, dir);
  }

  updateRide(dt) {
    const r = this.ride;
    r.t += dt;
    const k = r.t / r.dur;
    // acceleration / deceleration shake on the eye
    const accel = k < 0.2 ? k / 0.2 : k > 0.8 ? (1 - k) / 0.2 : 1;
    this.player.eyeOffset.y = Math.sin(r.t * 31) * 0.006 * accel + Math.sin(r.t * 7.3) * 0.004 * accel;
    this.player.eyeOffset.x = Math.sin(r.t * 23.1) * 0.003 * accel;
    if (r.t >= r.dur) {
      this.player.eyeOffset.set(0, 0, 0);
      this.setCarAnim(r.from, false);
      // relocate: keep the player's position relative to the car
      const from = r.from.origin;
      const to = r.to.origin;
      const p = this.player.position;
      const lx = p.x - from[0];
      const lz = p.z - from[2];
      this.player.setPose(to[0] + lx, to[2] + lz, THREE.MathUtils.radToDeg(this.player.yaw), THREE.MathUtils.radToDeg(this.player.pitch), to[1]);
      this.cells.setCurrent(r.to.id);
      this.currentCar = r.to;
      this.closeTimer = 2.5; // hold the arrival door open long enough to step out
      const door = this.doorFor(r.to);
      if (door) {
        door.open();
        door.holdTimer = 2.5;
      }
      this.player.frozen = false;
      this.state = "idle";
      this.hud.setStatus(`${DECKS[r.to.deck].name}. ${ROOM_BY_ID[r.to.lobby].name}.`);
      if (this.audio) this.audio.play("lift_arrive", new THREE.Vector3(...to));
      if (this.onArrive) this.onArrive(r.to);
      this.ride = null;
    }
  }

  getState() {
    return { state: this.state, car: this.currentCar ? this.currentCar.id : null, ride: this.ride ? { to: this.ride.to.id, from: this.ride.from.id, t: +this.ride.t.toFixed(2), dur: +this.ride.dur.toFixed(2) } : null };
  }
  /** Apply a replicated ride (a remote passenger's lift is in motion): only the animation state matters here. */
  setState(s) {
    if (!s || !s.ride) return;
    const from = ROOM_BY_ID[s.ride.from];
    const to = ROOM_BY_ID[s.ride.to];
    if (!from || !to) return;
    if (this.state !== "riding") this.setCarAnim(from, true, Math.sign(to.origin[1] - from.origin[1]) || 1);
  }
}
