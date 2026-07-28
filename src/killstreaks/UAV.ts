/**
 * UAV recon.
 *
 * The reward here is information, and information is only satisfying if it is
 * *acquired*. A drone that sets a flag saying "show all enemies" is a cheat code;
 * a drone that carries a sensor which sweeps, paints what the beam crosses, and
 * lets the contact decay when the beam moves on is a piece of equipment. So the
 * reveal is a real beam: a wedge rotating about the airframe once every 2.6 s,
 * and every hostile it crosses becomes a contact with a lifetime. Watch the
 * minimap through one revolution and the map fills in a wedge at a time, which is
 * both the correct read and considerably more tense than a full picture, because
 * a contact three seconds old is a place someone *was*.
 *
 * The drone itself orbits outside the play space at 74 m, banked into the turn,
 * and its two-blade propeller is modelled rather than blurred because at that
 * range the blades are individually resolvable. The prop noise is delayed and
 * Doppler-shifted through the same acoustic path as the strike aircraft, which at
 * 27 m/s is a barely perceptible wow — correct, and free.
 *
 * Contacts are published on `killstreak:uavContacts` for the minimap, and the four
 * strongest also go to objective markers so a player who never looks at the corner
 * of the screen still gets the benefit.
 */
import * as THREE from 'three';
import { spinRotors, type AircraftModel } from './models/Aircraft';
import type { KillstreakAssets } from './Assets';
import type { KillstreakDeps } from './Deps';
import type { Acoustics } from './Acoustics';
import { SOUNDS, UAV as TUNING } from './Tuning';
import { normalizeBearing } from './MapMath';

interface Contact {
  readonly position: THREE.Vector3;
  /** Seconds since the beam last painted this contact. */
  age: number;
  live: boolean;
}

/** Contacts the payload can carry. The map holds far fewer enemies than this. */
const MAX_CONTACTS = 48;
/** Prop noise emission interval. */
const GRAIN_INTERVAL = 0.5;

export interface UAVContact {
  x: number;
  y: number;
  z: number;
  /** 1 at the moment of paint, falling to 0 as the contact goes stale. */
  strength: number;
}

export class UAV {
  active = false;
  /** Seconds left on station. */
  remaining = 0;

  private model: AircraftModel | null = null;
  private readonly contacts: Contact[] = [];
  private readonly enemies: THREE.Vector3[] = [];
  private readonly payload: { contacts: UAVContact[]; count: number; sweep: number } = {
    contacts: [],
    count: 0,
    sweep: 0,
  };

  private readonly centre = new THREE.Vector3();
  private readonly position = new THREE.Vector3();
  private readonly velocity = new THREE.Vector3();
  private readonly look = new THREE.Vector3();
  private readonly scratch = new THREE.Vector3();
  private orbitAngle = 0;
  private sweepAngle = 0;
  private groundY = 0;
  private grainTimer = 0;
  private markerTimer = 0;
  private markersShown = 0;
  private clock = 0;

  constructor(
    private readonly deps: KillstreakDeps,
    private readonly assets: KillstreakAssets,
    private readonly acoustics: Acoustics,
  ) {
    for (let i = 0; i < MAX_CONTACTS; i++) {
      this.contacts.push({ position: new THREE.Vector3(), age: 0, live: false });
      this.payload.contacts.push({ x: 0, y: 0, z: 0, strength: 0 });
    }
  }

  get diagnostics(): { remaining: number; contacts: number; altitude: number } {
    return {
      remaining: this.remaining,
      contacts: this.payload.count,
      altitude: this.position.y - this.groundY,
    };
  }

  launch(duration: number): void {
    const scene = this.deps.scene;
    if (!scene) return;
    if (this.active) {
      // A second UAV extends the station time rather than stacking two airframes,
      // which is what the player means by calling it again.
      this.remaining = Math.max(this.remaining, duration);
      return;
    }

    this.active = true;
    this.remaining = duration;
    this.clock = 0;
    this.grainTimer = 0;
    this.markerTimer = 0;
    for (const contact of this.contacts) contact.live = false;

    const bounds = this.deps.world?.bounds;
    this.centre.set(0, 0, 0);
    if (bounds) bounds.getCenter(this.centre);
    this.groundY = this.deps.groundAt(this.centre.x, this.centre.z, 0);
    this.centre.y = this.groundY;

    // Enter from the player's own quarter of the orbit: the drone should arrive
    // from somewhere they can see it, not materialise behind them.
    this.deps.playerPosition(this.scratch);
    this.orbitAngle = Math.atan2(
      this.scratch.z - this.centre.z,
      this.scratch.x - this.centre.x,
    );
    this.sweepAngle = 0;

    this.model ??= this.assets.createDrone();
    this.writeTransform(0);
    scene.add(this.model.root);
    this.model.root.updateMatrixWorld(true);

    this.deps.announce('UAV RECON ONLINE', 'HOSTILES PAINTED ON THE MAP', 2.6);
    this.deps.play2D(SOUNDS.streakReady, { volume: 0.8, pitch: 1.05 });
    // A drone orbiting overhead is not subtle. Survivors know they are being
    // looked at, which is the light nudge the brief asks for, not a full alert.
    this.deps.ai?.alertAll(this.centre, 200, 0.25);
  }

  update(dt: number): void {
    if (!this.active) return;
    this.clock += dt;
    this.remaining -= dt;
    if (this.remaining <= 0) {
      this.finish();
      return;
    }

    const angularRate = TUNING.speed / TUNING.orbitRadius;
    this.orbitAngle = normalizeBearing(this.orbitAngle + angularRate * dt);
    this.sweepAngle = normalizeBearing(this.sweepAngle + (Math.PI * 2 * dt) / TUNING.sweepPeriod);
    this.writeTransform(dt);
    this.sweep(dt);
    this.publish();
    this.updateMarkers(dt);

    this.grainTimer -= dt;
    if (this.grainTimer <= 0) {
      this.grainTimer = GRAIN_INTERVAL;
      this.acoustics.emit(
        SOUNDS.droneProp,
        this.position,
        this.velocity,
        this.deps.now,
        0.34,
        70,
        420,
      );
    }
  }

  private writeTransform(dt: number): void {
    const model = this.model;
    const radius = TUNING.orbitRadius;
    const cos = Math.cos(this.orbitAngle);
    const sin = Math.sin(this.orbitAngle);
    this.position.set(
      this.centre.x + cos * radius,
      this.groundY + TUNING.altitude,
      this.centre.z + sin * radius,
    );
    // Tangent of the circle, which is the heading, and also the velocity.
    this.velocity.set(-sin, 0, cos).multiplyScalar(TUNING.speed);
    if (!model) return;

    model.root.position.copy(this.position);
    this.look.copy(this.position).add(this.velocity);
    model.root.lookAt(this.look);
    // Bank into the turn. An aircraft in a level circle is banked or it is not
    // turning, and a flat-turning model is the first thing that looks wrong.
    model.root.rotateZ(TUNING.bank);
    model.root.updateMatrixWorld(true);

    spinRotors(model, dt, 62);
    if (model.strobe) model.strobe.visible = (this.clock * 1.1) % 1 < 0.1;
  }

  /**
   * Advances the beam and paints whatever it crosses. Bearings are taken from the
   * drone because the drone is the sensor; at an 88 m orbit radius over a 144 m map
   * that puts every hostile inside the scan, and the wedge still sweeps the ground
   * the way a radar display expects.
   */
  private sweep(dt: number): void {
    for (const contact of this.contacts) {
      if (!contact.live) continue;
      contact.age += dt;
      if (contact.age > TUNING.contactTtl) contact.live = false;
    }

    const ai = this.deps.ai;
    if (!ai) return;
    ai.getEnemyPositions(this.enemies);

    let cursor = 0;
    for (const enemy of this.enemies) {
      const bearing = Math.atan2(enemy.x - this.position.x, -(enemy.z - this.position.z));
      let delta = bearing - this.sweepAngle;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      if (Math.abs(delta) > TUNING.sweepWidth) continue;

      // Reuse the slot for a contact already near this position so a hostile
      // standing still stays one contact rather than accumulating a smear.
      let slot = -1;
      for (let i = 0; i < this.contacts.length; i++) {
        const c = this.contacts[i];
        if (c.live && c.position.distanceToSquared(enemy) < 36) {
          slot = i;
          break;
        }
      }
      if (slot < 0) {
        for (let i = cursor; i < this.contacts.length; i++) {
          if (!this.contacts[i].live) {
            slot = i;
            cursor = i + 1;
            break;
          }
        }
      }
      if (slot < 0) continue;

      const contact = this.contacts[slot];
      contact.position.copy(enemy);
      contact.age = 0;
      contact.live = true;
    }
  }

  private publish(): void {
    let count = 0;
    for (const contact of this.contacts) {
      if (!contact.live) continue;
      const out = this.payload.contacts[count];
      out.x = contact.position.x;
      out.y = contact.position.y;
      out.z = contact.position.z;
      // Linear decay, so a contact visibly ages out rather than blinking off.
      out.strength = 1 - contact.age / TUNING.contactTtl;
      count++;
    }
    this.payload.count = count;
    this.payload.sweep = this.sweepAngle;
    this.deps.emit('killstreak:uavContacts', this.payload);
  }

  /**
   * Objective markers refresh on a slow cadence. The HUD's marker set is small and
   * shared with the strike target; rewriting it every frame would fight whatever
   * else wants a marker, and a contact that jitters between four hostiles is worse
   * than four steady ones.
   */
  private updateMarkers(dt: number): void {
    this.markerTimer -= dt;
    if (this.markerTimer > 0) return;
    this.markerTimer = 0.85;

    this.deps.playerPosition(this.scratch);
    let shown = 0;
    for (const contact of this.contacts) {
      if (shown >= TUNING.markerCount) break;
      if (!contact.live || contact.age > TUNING.contactTtl * 0.6) continue;
      const range = Math.round(this.scratch.distanceTo(contact.position));
      this.deps.marker(`killstreak:uav:${shown}`, contact.position, `HOSTILE ${range}M`);
      shown++;
    }
    for (let i = shown; i < this.markersShown; i++) {
      this.deps.marker(`killstreak:uav:${i}`, null);
    }
    this.markersShown = shown;
  }

  private clearMarkers(): void {
    for (let i = 0; i < this.markersShown; i++) this.deps.marker(`killstreak:uav:${i}`, null);
    this.markersShown = 0;
  }

  private finish(): void {
    this.active = false;
    this.remaining = 0;
    this.model?.root.removeFromParent();
    for (const contact of this.contacts) contact.live = false;
    this.payload.count = 0;
    this.deps.emit('killstreak:uavContacts', this.payload);
    this.clearMarkers();
    this.deps.notify('UAV OFF STATION', undefined, 'info');
  }

  abort(): void {
    if (!this.active) return;
    this.finish();
  }

  dispose(): void {
    this.abort();
    this.model?.dispose();
    this.model = null;
  }
}
