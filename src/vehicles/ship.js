// A ship promoted from the instanced traffic to a real vehicle: collision, carry and boarding for one ship of the
// fleet while the player is near it (see ShipTraffic.promote / autoPromote). The ship's pose and its animation
// state stay pure functions of the route time, so the instance keeps drawing it (animated parts, interior lighting)
// and this class only owns the collision grid, the riders and the door interlocks:
//   - the grid follows the port cycle: landed-open (ramp / doors down) while boarding, landed-closed once the doors
//     seal at closure, flight (gear up, wings folded) in the air - so nobody walks through a closed door,
//   - a passenger caught in the doorway when the doors seal is nudged to the nearer side (aboard or onto the pad),
//     so the ship never departs with a player half in the door,
//   - riders are carried in ship space with the ship's continuous yaw (toWorld / toGrid are exact rotations, not
//     the 90 degree quadrants of the base class), so a passenger's position is stable relative to the moving craft
//     while the world turns outside the windows,
//   - onUse() (right-click on the hull) boards through the open door / ramp or leaves the landed ship; leave()
//     refuses in flight.
import { Vehicle } from './vehicle.js';
import { AABB } from '../player.js';
import { TICK_RATE } from '../constants.js';
import { routePose, shipState } from '../ships/traffic.js';

const OPEN_PHASES = new Set(['boarding', 'servicing', 'repair']);      // doors fully open on the pad
const LANDED_PHASES = new Set(['touchdown', 'shutdown', 'doors', 'boarding', 'servicing', 'closure', 'repair']);

function padName(ship) {
  if (typeof ship.pad === 'number') return `Pad ${ship.pad + 1}`;
  if (ship.pad === 'frontier') return 'the frontier pad';
  if (ship.repair) return 'the repair berth';
  return 'the pad';
}

export class ShipVehicle extends Vehicle {
  constructor(traffic, ship) {
    const model = traffic.models[ship.type];
    // the instance geometry is centred on the footprint with the gear on y = 0 (see buildShipGeometry)
    super({ grid: model.grid, origin: { x: model.w / 2, y: 0, z: model.d / 2 }, interiors: model.interiors, name: ship.name });
    this.traffic = traffic;
    this.ship = ship;
    this.model = model;
    this.state = { gear: 0, cls: 0, door: 0, lights: 0, phase: 'fly' };
    this.doorOpen = false;
    this.lastPhase = null;
    this._pose = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, roll: 0, thrust: 0, phase: 'fly', speed: 0 };
    this._box = new AABB(0, 0, 0, 0, 0, 0);
  }

  // ---------------------------------------------------------------- pose / transforms (continuous yaw)
  pose(tick) { return routePose(this.ship.route, tick / TICK_RATE + this.ship.offset, this._pose); }

  toWorld(gx, gy, gz, pose, out) {
    const c = Math.cos(pose.yaw), s = Math.sin(pose.yaw), dx = gx - this.origin.x, dz = gz - this.origin.z;
    out.x = pose.x + dx * c + dz * s; out.y = pose.y + gy - this.origin.y; out.z = pose.z - dx * s + dz * c;
    return out;
  }
  toGrid(wx, wy, wz, pose, out) {
    const c = Math.cos(pose.yaw), s = Math.sin(pose.yaw), dx = wx - pose.x, dz = wz - pose.z;
    out.x = dx * c - dz * s + this.origin.x; out.y = wy - pose.y + this.origin.y; out.z = dx * s + dz * c + this.origin.z;
    return out;
  }
  // conservative world AABB of a grid box (exact for cardinal yaws, the rotated box's hull otherwise)
  boxToWorld(x0, y0, z0, x1, y1, z1, pose, out) {
    const c = Math.cos(pose.yaw), s = Math.sin(pose.yaw), ax = x0 - this.origin.x, bx = x1 - this.origin.x, az = z0 - this.origin.z, bz = z1 - this.origin.z;
    const x00 = ax * c + az * s, x10 = bx * c + az * s, x01 = ax * c + bz * s, x11 = bx * c + bz * s;
    const z00 = -ax * s + az * c, z10 = -bx * s + az * c, z01 = -ax * s + bz * c, z11 = -bx * s + bz * c;
    out.x0 = pose.x + Math.min(x00, x10, x01, x11); out.x1 = pose.x + Math.max(x00, x10, x01, x11);
    out.z0 = pose.z + Math.min(z00, z10, z01, z11); out.z1 = pose.z + Math.max(z00, z10, z01, z11);
    out.y0 = pose.y + y0 - this.origin.y; out.y1 = pose.y + y1 - this.origin.y;
    return out;
  }
  boxToGrid(box, pose, out) {
    const c = Math.cos(pose.yaw), s = Math.sin(pose.yaw), ax = box.x0 - pose.x, bx = box.x1 - pose.x, az = box.z0 - pose.z, bz = box.z1 - pose.z;
    const x00 = ax * c - az * s, x10 = bx * c - az * s, x01 = ax * c - bz * s, x11 = bx * c - bz * s;
    const z00 = ax * s + az * c, z10 = bx * s + az * c, z01 = ax * s + bz * c, z11 = bx * s + bz * c;
    out.x0 = this.origin.x + Math.min(x00, x10, x01, x11); out.x1 = this.origin.x + Math.max(x00, x10, x01, x11);
    out.z0 = this.origin.z + Math.min(z00, z10, z01, z11); out.z1 = this.origin.z + Math.max(z00, z10, z01, z11);
    out.y0 = box.y0 - pose.y + this.origin.y; out.y1 = box.y1 - pose.y + this.origin.y;
    return out;
  }

  // ---------------------------------------------------------------- lifecycle
  // no mesh of its own: the traffic instance draws the ship (with its animated parts) at the same route time
  buildMeshes() { this.meshes = []; this.mesh = null; }
  onAdd(game) {
    super.onAdd(game);
    this.syncState(game.vehicles ? game.vehicles.tickCount : 0);
    this.lastPhase = this.state.phase;
  }
  onRemove(game) {
    for (const e of this.riders.keys()) if (e.vehicle === this) e.vehicle = null;
    this.riders.clear();
    super.onRemove(game);
  }

  // animation state + collision grid for a tick (the grid choice is the door interlock)
  syncState(tickCount) {
    const st = shipState(this.ship.route, tickCount / TICK_RATE + this.ship.offset, this.state);
    const wasOpen = this.doorOpen;
    this.doorOpen = OPEN_PHASES.has(st.phase) || (st.phase === 'doors' && st.door >= 0.5);
    this.grid = this.doorOpen ? this.model.grid : (st.gear >= 0.5 && LANDED_PHASES.has(st.phase) ? this.model.gridClosed : this.model.gridFlight);
    return wasOpen && !this.doorOpen;
  }

  tick(tickCount) {
    super.tick(tickCount);
    if (this.syncState(tickCount)) this.sealDoorway();
    if (this.state.phase !== this.lastPhase) { this.announce(this.state.phase); this.lastPhase = this.state.phase; }
  }

  update(dt, alpha, camera) {
    // the base class does this for its meshes; the instance is drawn by the traffic at the interpolated time
    if (this.playerCarried && camera) camera.position.addScaledVector(this.playerDelta, alpha - 1);
  }

  landed() { return LANDED_PHASES.has(this.state.phase); }
  hud(msg) { const h = this.game && this.game.hud; if (h && h.addMessage) h.addMessage(msg); }
  isAboard(entity) {
    if (this.riders.has(entity)) return true;
    if (!entity.pos) return false;
    const p = this.toGrid(entity.pos.x, entity.pos.y + 0.1, entity.pos.z, this.cur, { x: 0, y: 0, z: 0 });
    return this.interiors.some((v) => p.x >= v.x0 && p.x < v.x1 && p.z >= v.z0 && p.z < v.z1 && p.y >= v.y0 - 0.1 && p.y < v.y1);
  }

  // ---------------------------------------------------------------- interlocks
  // The doors just sealed: anyone whose body overlaps the now solid door / ramp cells steps to the nearer side.
  sealDoorway() {
    if (!this.game) return;
    const ents = new Set(this.riders.keys());
    if (this.game.player) ents.add(this.game.player);
    for (const e of ents) this.nudgeFromDoor(e);
  }
  nudgeFromDoor(entity) {
    const door = this.model.door;
    if (!door || !entity.pos) return false;
    if (!this.overlapsEntity(Vehicle.boxOf(entity))) return false;
    const pos = entity.pos, l = this.toGrid(pos.x, pos.y, pos.z, this.cur, { x: 0, y: 0, z: 0 });
    const d2 = (c) => (l.x - c[0] - 0.5) ** 2 + (l.z - c[2] - 0.5) ** 2;
    const inside = d2(door.inner) <= d2(door.outer);
    this.place(entity, inside ? door.inner : door.outer);
    if (inside) { this.hud(`Doors sealed - you are aboard the ${this.model.label}.`); }
    else { this.dropRider(entity); this.hud(`You stepped back from the closing door of the ${this.model.label}.`); }
    return true;
  }
  // puts an entity's feet on a grid standing cell [x, y, z] (cell centre), facing along the ship
  place(entity, cell, yawIn = null) {
    const w = this.toWorld(cell[0] + 0.5, cell[1], cell[2] + 0.5, this.cur, { x: 0, y: 0, z: 0 });
    entity.pos.set(w.x, w.y, w.z);
    if (entity.prevPos && entity.prevPos.copy) entity.prevPos.copy(entity.pos);
    if (entity.vel) { entity.vel.x = 0; entity.vel.y = 0; entity.vel.z = 0; }
    if (yawIn !== null && typeof entity.yaw === 'number') entity.yaw = yawIn;
    if (entity.onGround !== undefined) entity.onGround = true;
  }
  dropRider(entity) { this.riders.delete(entity); if (entity.vehicle === this) entity.vehicle = null; }

  // ---------------------------------------------------------------- boarding
  // Right-click on the hull: board through the open door (the passenger appears on the inner sill cell, looking
  // into the cabin) or leave a landed ship; a sealed door only answers with a message. Returns true when handled.
  onUse(player, game, hit) {
    if (this.isAboard(player)) {
      if (this.leave(player)) return true;
      this.hud(this.landed() ? `${this.model.label}: the doors are still closed.` : `${this.model.label}: in flight - doors sealed until landing at ${padName(this.ship)}.`);
      return true;
    }
    if (!this.doorOpen) {
      this.hud(this.landed() ? `${this.model.label}: doors closed - wait for the ramp.` : `${this.model.label} is in flight.`);
      return true;
    }
    const door = this.model.door;
    if (!door) return false;
    // face into the cabin: the door's outward side vector, reversed, turned by the ship's yaw
    const c = Math.cos(this.cur.yaw), s = Math.sin(this.cur.yaw), ix = -door.side[0], iz = -door.side[1];
    const yaw = Math.atan2(-(ix * c + iz * s), -(-ix * s + iz * c));
    this.place(player, door.inner, yaw);
    if (player.flying !== undefined) player.flying = false;
    const w = player.pos;
    this.riders.set(player, { dx: 0, dy: 0, dz: 0, x: w.x, y: w.y, z: w.z });
    player.vehicle = this;
    this.hud(`Boarded the ${this.model.label} (${this.ship.name}). Destination: ${this.ship.dest || 'a circuit and back'}.`);
    return true;
  }
  // Steps a passenger out onto the pad beside the door; false while the ship is airborne or the doors are closed.
  leave(entity) {
    if (!this.doorOpen || !this.landed() || !this.model.door) return false;
    this.place(entity, this.model.door.outer);
    this.dropRider(entity);
    this.hud(`Left the ${this.model.label} at ${padName(this.ship)}.`);
    return true;
  }

  // phase change announcements for the passengers of this ship
  announce(phase) {
    const player = this.game && this.game.player;
    if (!player || !this.riders.has(player)) return;
    const dest = this.ship.dest || 'a circuit and back';
    switch (phase) {
      case 'closure': this.hud(`${this.model.label}: doors closing. Departing for ${dest}.`); break;
      case 'departure': this.hud(`${this.model.label} departing: ${dest}.`); break;
      case 'reservation': this.hud(`${this.model.label}: ${padName(this.ship)} reserved, beginning the approach.`); break;
      case 'touchdown': this.hud(`${this.model.label}: touchdown at ${padName(this.ship)}.`); break;
      case 'doors': this.hud(`${this.model.label}: doors opening - right-click the hull or walk out to leave.`); break;
      default: break;
    }
  }
}
