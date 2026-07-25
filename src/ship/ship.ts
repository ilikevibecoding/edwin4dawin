import * as THREE from 'three';
import { angleDelta, clamp, clamp01, damp, lerp, moveTowards, TAU } from '../core/math';
import { Environment } from '../world/environment';
import { IslandField } from '../world/islands';
import { Ocean } from '../world/ocean';
import { BUOYANCY_POINTS, buildSloop, hullShape, SHIP, ShipModel, SloopOptions } from './shipbuilder';

/** Physical tuning. Accelerations are in m/s^2, so terminal speed is sqrt(thrust/drag). */
const SAIL_POWER = 4.6;
/** Quadratic drag: terminal speed is sqrt(thrust / drag), about 11 knots downwind. */
const FORWARD_DRAG = 0.13;
const LATERAL_DRAG = 1.5;
const MAX_TURN_RATE = 0.5;
const FLOOD_CAPACITY = 100;
/** How much the hull sinks when completely swamped. */
const FLOOD_SINK = 1.85;
const SINK_DURATION = 14;

export interface Hole {
  /** Position on the hull in ship-local space. */
  local: THREE.Vector3;
  /** 0.6 (splinter) to 1.4 (gaping). Scales the leak rate. */
  size: number;
  repairProgress: number;
  mesh: THREE.Mesh;
  spray: THREE.Points | null;
}

export type ShipStation = 'helm' | 'sails' | 'capstan' | 'cannon' | 'none';

export interface ShipOptions extends SloopOptions {
  name?: string;
  crewed?: boolean;
}

const holeMaterial = new THREE.MeshBasicMaterial({ color: 0x140d07, side: THREE.DoubleSide });

/**
 * A sailing ship: buoyancy on the shared wave field, square-rig sail physics
 * where trim actually matters, a rudder, an anchor, and a hull that springs
 * leaks and floods until someone patches it.
 */
export class Ship {
  readonly model: ShipModel;
  readonly group: THREE.Group;
  readonly name: string;

  position = new THREE.Vector3();
  velocity = new THREE.Vector3();
  /** Bearing in radians: forward = (cos h, 0, sin h). */
  heading = 0;
  yawRate = 0;
  pitch = 0;
  roll = 0;

  /** 0 = furled, 1 = fully lowered and drawing. */
  sailAmount = 0;
  /** Yard angle relative to the keel, radians. */
  sailTrim = 0;
  /** -1 hard port .. +1 hard starboard. */
  rudder = 0;
  anchorUp = false;
  /** 0 = anchor down and biting, 1 = fully raised. */
  anchorRaise = 0;

  floodVolume = 0;
  holes: Hole[] = [];
  sinking = false;
  sinkTimer = 0;
  destroyed = false;

  /** Set by whoever is currently steering, then consumed by `update`. */
  helmInput = 0;
  private capstanSpin = 0;
  private anchorSway = 0;
  private wheelAngle = 0;
  private creakTimer = 3;
  private aground = 0;
  private lastAgroundDamage = 0;

  onCreak: () => void = () => {};
  onImpact: (worldPoint: THREE.Vector3, strength: number) => void = () => {};

  private scratchWorld = new THREE.Vector3();
  private scratchLocal = new THREE.Vector3();
  private buoyancySamples: number[] = [];

  constructor(options: ShipOptions = {}) {
    this.model = buildSloop(options);
    this.group = this.model.group;
    this.name = options.name ?? 'The Salty Regret';
    this.group.matrixAutoUpdate = true;
  }

  get forward(): THREE.Vector3 {
    return new THREE.Vector3(Math.cos(this.heading), 0, Math.sin(this.heading));
  }

  get starboard(): THREE.Vector3 {
    return new THREE.Vector3(-Math.sin(this.heading), 0, Math.cos(this.heading));
  }

  get speed(): number {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  /** Signed speed along the bow direction. */
  get forwardSpeed(): number {
    return this.velocity.x * Math.cos(this.heading) + this.velocity.z * Math.sin(this.heading);
  }

  get floodLevel(): number {
    return clamp01(this.floodVolume / FLOOD_CAPACITY);
  }

  get openHoles(): number {
    return this.holes.length;
  }

  localToWorld(local: THREE.Vector3, out = new THREE.Vector3()): THREE.Vector3 {
    return out.copy(local).applyMatrix4(this.group.matrixWorld);
  }

  worldToLocal(world: THREE.Vector3, out = new THREE.Vector3()): THREE.Vector3 {
    return out.copy(world).applyMatrix4(this.inverseMatrix);
  }

  /** Rotates a world-space direction into the ship's frame (no translation). */
  worldToLocalDirection(world: THREE.Vector3, out = new THREE.Vector3()): THREE.Vector3 {
    return out.copy(world).applyQuaternion(this.group.quaternion.clone().invert()).normalize();
  }

  private inverseMatrixCache = new THREE.Matrix4();
  private get inverseMatrix(): THREE.Matrix4 {
    return this.inverseMatrixCache.copy(this.group.matrixWorld).invert();
  }

  anchorWorld(name: string, out = new THREE.Vector3()): THREE.Vector3 {
    const anchor = this.model.anchors[name];
    if (!anchor) return out.copy(this.position);
    return anchor.getWorldPosition(out);
  }

  place(x: number, z: number, heading: number): void {
    this.position.set(x, 0, z);
    this.heading = heading;
    this.velocity.set(0, 0, 0);
    this.yawRate = 0;
    this.syncTransform();
    this.group.updateMatrixWorld(true);
  }

  private syncTransform(): void {
    this.group.position.copy(this.position);
    this.group.rotation.set(this.roll, -this.heading, this.pitch, 'YZX');
  }

  update(dt: number, env: Environment, ocean: Ocean, islands: IslandField): void {
    if (this.destroyed) return;

    if (this.sinking) {
      this.updateSinking(dt, ocean);
      return;
    }

    this.updateRig(dt, env);
    this.updateSteering(dt);
    this.updatePropulsion(dt, env);
    this.updateBuoyancy(dt, ocean);
    this.updateGrounding(dt, islands);
    this.updateFlooding(dt, ocean);
    this.syncTransform();
    this.group.updateMatrixWorld(true);
    this.updateVisuals(dt, env);
  }

  // ------------------------------------------------------------------- rig

  private updateRig(dt: number, env: Environment): void {
    // The anchor has to be cranked up before the sails will pull the ship along.
    if (this.anchorUp) this.anchorRaise = Math.min(1, this.anchorRaise + dt * 0.55);
    else this.anchorRaise = Math.max(0, this.anchorRaise - dt * 1.6);

    this.model.sailMaterial.uniforms.uFurl.value = 1 - this.sailAmount;
    this.model.jibMaterial.uniforms.uFurl.value = (1 - this.sailAmount) * 0.4;
    this.model.yard.rotation.y = this.sailTrim;
    this.model.flagMaterial.uniforms.uWind.value = env.windSpeed;
  }

  /** Wind push on the sail, signed: positive fills the canvas from astern. */
  sailPush(env: Environment): number {
    const relWind = angleDelta(this.heading, env.windAngle);
    return Math.cos(relWind + this.sailTrim);
  }

  /** How well the yard is trimmed for the current wind, 0..1. */
  trimQuality(env: Environment): number {
    const relWind = angleDelta(this.heading, env.windAngle);
    const ideal = clamp(-relWind / 2, -1.35, 1.35);
    return clamp01(Math.cos(angleDelta(this.sailTrim, ideal)));
  }

  /** Best achievable thrust factor for the current heading, 0..1. */
  headingQuality(env: Environment): number {
    const relWind = angleDelta(this.heading, env.windAngle);
    return Math.cos(relWind / 2) ** 2;
  }

  private updatePropulsion(dt: number, env: Environment): void {
    const push = this.sailPush(env);
    // A square rig backwinds badly rather than driving the ship astern.
    const effective = push < 0 ? push * 0.3 : push;
    const forwardFactor = Math.cos(this.sailTrim);
    const anchorFactor = this.anchorRaise;
    const floodPenalty = 1 - this.floodLevel * 0.55;

    let thrust = SAIL_POWER * this.sailAmount * effective * forwardFactor * anchorFactor * floodPenalty;
    thrust *= clamp(env.windSpeed, 0.2, 1.6);

    const fwd = this.forward;
    const stb = this.starboard;
    const forwardSpeed = this.velocity.dot(fwd);
    const lateralSpeed = this.velocity.dot(stb);

    // Quadratic drag along the keel, much stiffer sideways.
    const forwardDrag = -Math.sign(forwardSpeed) * FORWARD_DRAG * forwardSpeed * forwardSpeed;
    const lateralDrag = -lateralSpeed * LATERAL_DRAG;
    // An anchored ship is held fast; grounding scrubs off speed too.
    const anchorDrag = -forwardSpeed * (1 - anchorFactor) * 2.6;
    const groundDrag = -forwardSpeed * this.aground * 3.4;

    const accelForward = thrust + forwardDrag + anchorDrag + groundDrag;
    this.velocity.addScaledVector(fwd, accelForward * dt);
    this.velocity.addScaledVector(stb, lateralDrag * dt);

    // Waves shove the hull around a little, more so in a storm.
    const drift = env.localStorm * 0.35;
    if (drift > 0.01) {
      const flow = env.waves.flow(this.position.x, this.position.z);
      this.velocity.x += flow.x * drift * dt;
      this.velocity.z += flow.z * drift * dt;
    }

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    // Keep ships inside the map with a soft current at the edges.
    const extent = 2380;
    for (const axis of ['x', 'z'] as const) {
      const over = Math.abs(this.position[axis]) - extent;
      if (over > 0) {
        this.velocity[axis] -= Math.sign(this.position[axis]) * over * 0.02 * dt * 60;
        this.position[axis] = Math.sign(this.position[axis]) * (extent + Math.min(over, 60));
      }
    }
  }

  private updateSteering(dt: number): void {
    this.rudder = damp(this.rudder, clamp(this.helmInput, -1, 1), 5, dt);
    const speedFactor = clamp(Math.abs(this.forwardSpeed) / 2.6, 0.12, 1);
    const target = -this.rudder * MAX_TURN_RATE * speedFactor * (1 - this.floodLevel * 0.35);
    this.yawRate = damp(this.yawRate, target, 2.4, dt);
    this.heading += this.yawRate * dt;
    if (this.heading > Math.PI) this.heading -= TAU;
    if (this.heading < -Math.PI) this.heading += TAU;

    this.wheelAngle = damp(this.wheelAngle, this.rudder * 2.4, 6, dt);
    this.model.wheel.rotation.x = this.wheelAngle;
  }

  // -------------------------------------------------------------- buoyancy

  private updateBuoyancy(dt: number, ocean: Ocean): void {
    this.buoyancySamples.length = 0;
    let sum = 0;
    for (const local of BUOYANCY_POINTS) {
      this.scratchWorld.set(local.x, 0, local.z);
      // Sample on the flat-water plane rotated by heading only: cheaper than a
      // full matrix transform and stable while the hull pitches.
      const cos = Math.cos(this.heading);
      const sin = Math.sin(this.heading);
      const wx = this.position.x + local.x * cos - local.z * sin;
      const wz = this.position.z + local.x * sin + local.z * cos;
      const h = ocean.waterHeight(wx, wz);
      this.buoyancySamples.push(h);
      sum += h;
    }
    const average = sum / this.buoyancySamples.length;

    const bow = this.buoyancySamples[0];
    const stern = this.buoyancySamples[5];
    const port = (this.buoyancySamples[1] + this.buoyancySamples[3]) / 2;
    const starboard = (this.buoyancySamples[2] + this.buoyancySamples[4]) / 2;

    const targetY = average - this.floodLevel * FLOOD_SINK;
    this.position.y = damp(this.position.y, targetY, 6.5, dt);

    const lengthSpan = BUOYANCY_POINTS[0].x - BUOYANCY_POINTS[5].x;
    const beamSpan = BUOYANCY_POINTS[2].z - BUOYANCY_POINTS[1].z;
    const targetPitch = Math.atan2(bow - stern, lengthSpan) * 0.85;
    let targetRoll = -Math.atan2(starboard - port, beamSpan) * 0.9;
    // Heel into a turn, and list towards whichever side is flooded.
    targetRoll += this.yawRate * this.forwardSpeed * 0.09;
    targetRoll += Math.sin(this.floodLevel * Math.PI) * 0.04;

    this.pitch = damp(this.pitch, targetPitch, 3.4, dt);
    this.roll = damp(this.roll, targetRoll, 3.0, dt);

    this.creakTimer -= dt * (1 + Math.abs(this.roll) * 6 + Math.abs(this.pitch) * 4);
    if (this.creakTimer <= 0) {
      this.creakTimer = 2.5 + Math.random() * 5;
      this.onCreak();
    }
  }

  private updateGrounding(dt: number, islands: IslandField): void {
    const probes = [
      new THREE.Vector3(8.4, 0, 0),
      new THREE.Vector3(2, 0, 0),
      new THREE.Vector3(-6, 0, 0),
    ];
    let worst = 0;
    let pushX = 0;
    let pushZ = 0;

    const cos = Math.cos(this.heading);
    const sin = Math.sin(this.heading);
    for (const probe of probes) {
      const wx = this.position.x + probe.x * cos - probe.z * sin;
      const wz = this.position.z + probe.x * sin + probe.z * cos;
      const terrain = islands.heightAt(wx, wz);
      const keel = this.position.y - 2.0;
      const penetration = terrain - keel;
      if (penetration > 0) {
        worst = Math.max(worst, penetration);
        const normal = islands.normalAt(wx, wz);
        pushX += normal.x;
        pushZ += normal.z;
      }
    }

    this.aground = damp(this.aground, worst > 0 ? clamp01(worst / 1.4) : 0, 6, dt);

    if (worst > 0) {
      const shove = clamp(worst, 0, 2.2) * 1.6;
      this.velocity.x += pushX * shove * dt;
      this.velocity.z += pushZ * shove * dt;
      this.position.x += pushX * shove * dt * 0.4;
      this.position.z += pushZ * shove * dt * 0.4;

      // Grinding on rock opens the hull up, but only every so often.
      this.lastAgroundDamage -= dt;
      const impactSpeed = Math.abs(this.forwardSpeed);
      if (this.lastAgroundDamage <= 0 && impactSpeed > 1.4) {
        this.lastAgroundDamage = 1.6;
        const local = new THREE.Vector3(clamp(6 - Math.random() * 12, -8, 8), -1.1, Math.random() < 0.5 ? -2.3 : 2.3);
        this.punchHole(local, clamp(impactSpeed / 5, 0.5, 1.3));
        this.onImpact(this.localToWorld(local.clone()), clamp01(impactSpeed / 6));
      }
    }
  }

  // -------------------------------------------------------------- flooding

  private updateFlooding(dt: number, ocean: Ocean): void {
    let leak = 0;
    for (const hole of this.holes) {
      this.localToWorld(hole.local, this.scratchWorld);
      const surface = ocean.waterHeight(this.scratchWorld.x, this.scratchWorld.z);
      const submersion = surface - this.scratchWorld.y;
      if (submersion > 0) {
        // Deeper holes push water in faster.
        leak += hole.size * (0.9 + Math.min(submersion, 2.2) * 1.5);
        if (hole.spray) hole.spray.visible = true;
      } else if (hole.spray) {
        hole.spray.visible = false;
      }
    }

    this.floodVolume = clamp(this.floodVolume + leak * dt, 0, FLOOD_CAPACITY);

    const level = this.floodLevel;
    const water = this.model.holdWater;
    water.visible = level > 0.004;
    water.position.y = SHIP.holdFloorY + level * (SHIP.deckY - SHIP.holdFloorY - 0.1) + 0.02;
    this.model.holdWaterMaterial.uniforms.uTime.value += dt;

    if (level >= 1 && !this.sinking) this.beginSinking();
  }

  /** Water depth in the hold at a local point, for wading and bailing. */
  holdWaterDepth(localY: number): number {
    const level = this.floodLevel;
    const surface = SHIP.holdFloorY + level * (SHIP.deckY - SHIP.holdFloorY - 0.1);
    return surface - localY;
  }

  punchHole(local: THREE.Vector3, size: number): Hole {
    // Merge with a nearby breach rather than stacking holes on one plank.
    for (const hole of this.holes) {
      if (hole.local.distanceTo(local) < 1.1) {
        hole.size = Math.min(1.6, hole.size + size * 0.45);
        hole.repairProgress = 0;
        return hole;
      }
    }

    const radius = 0.22 + size * 0.22;
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 8), holeMaterial);
    mesh.position.copy(local);
    // Face the hole outwards through the hull side.
    mesh.lookAt(local.x, local.y, local.z + (local.z > 0 ? 4 : -4));
    this.group.add(mesh);

    const spray = this.buildSpray(local, radius);
    this.group.add(spray);

    const hole: Hole = { local: local.clone(), size, repairProgress: 0, mesh, spray };
    this.holes.push(hole);
    return hole;
  }

  private buildSpray(local: THREE.Vector3, radius: number): THREE.Points {
    const count = 26;
    const positions = new Float32Array(count * 3);
    const inward = local.z > 0 ? -1 : 1;
    for (let i = 0; i < count; i++) {
      const t = i / count;
      positions[i * 3] = local.x + (Math.random() - 0.5) * radius * 2;
      positions[i * 3 + 1] = local.y + Math.random() * 0.5 - t * 0.6;
      positions[i * 3 + 2] = local.z + inward * (0.1 + t * 1.3) + (Math.random() - 0.5) * 0.3;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xbfe8ee,
      size: 0.14,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const points = new THREE.Points(geometry, material);
    points.visible = false;
    return points;
  }

  /** Returns the nearest unrepaired hole within `range` of a local point. */
  findHole(local: THREE.Vector3, range = 2.2): Hole | null {
    let best: Hole | null = null;
    let bestDist = range;
    for (const hole of this.holes) {
      const d = hole.local.distanceTo(local);
      if (d < bestDist) {
        bestDist = d;
        best = hole;
      }
    }
    return best;
  }

  /** Hammering a plank over a breach. Returns true when it is sealed. */
  repairHole(hole: Hole, dt: number): boolean {
    hole.repairProgress += dt / (0.9 + hole.size * 0.9);
    if (hole.repairProgress < 1) return false;
    this.sealHole(hole);
    return true;
  }

  private sealHole(hole: Hole): void {
    this.group.remove(hole.mesh);
    hole.mesh.geometry.dispose();
    if (hole.spray) {
      this.group.remove(hole.spray);
      hole.spray.geometry.dispose();
      (hole.spray.material as THREE.Material).dispose();
    }
    this.holes = this.holes.filter((h) => h !== hole);
  }

  /** Tips a bucket of bilge water over the side. */
  bail(amount: number): number {
    const removed = Math.min(this.floodVolume, amount);
    this.floodVolume -= removed;
    return removed;
  }

  takeCannonHit(worldPoint: THREE.Vector3, power = 1): void {
    const local = this.worldToLocal(worldPoint.clone());
    // Clamp the impact onto the hull surface so holes always land on planking.
    const t = hullShape.tFromX(clamp(local.x, SHIP.stern, SHIP.bow));
    const side = local.z >= 0 ? 1 : -1;
    const y = clamp(local.y, -1.5, SHIP.deckY);
    const width = Math.max(0.6, hullShape.widthAt(hullShape.xFromT(t), y));
    const clamped = new THREE.Vector3(clamp(local.x, SHIP.stern + 0.6, SHIP.bow - 1.2), y, side * width * 0.96);
    this.punchHole(clamped, 0.7 + power * 0.5);
    this.onImpact(worldPoint, clamp01(power));
  }

  private beginSinking(): void {
    this.sinking = true;
    this.sinkTimer = 0;
    this.sailAmount = 0;
  }

  private updateSinking(dt: number, ocean: Ocean): void {
    this.sinkTimer += dt;
    const t = clamp01(this.sinkTimer / SINK_DURATION);
    const surface = ocean.waterHeight(this.position.x, this.position.z);
    this.position.y = lerp(surface - FLOOD_SINK, surface - 26, t * t);
    this.pitch = damp(this.pitch, -0.42, 0.7, dt);
    this.roll = damp(this.roll, 0.5, 0.5, dt);
    this.velocity.multiplyScalar(1 - dt * 0.6);
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.syncTransform();
    this.group.updateMatrixWorld(true);
    if (t >= 1) this.destroyed = true;
  }

  /** Resets a ship after it sinks (used for the player's respawn). */
  respawn(x: number, z: number, heading: number): void {
    for (const hole of [...this.holes]) this.sealHole(hole);
    this.floodVolume = 0;
    this.sinking = false;
    this.destroyed = false;
    this.sinkTimer = 0;
    this.sailAmount = 0;
    this.sailTrim = 0;
    this.rudder = 0;
    this.helmInput = 0;
    this.anchorUp = false;
    this.anchorRaise = 0;
    this.pitch = 0;
    this.roll = 0;
    this.place(x, z, heading);
  }

  // -------------------------------------------------------------- visuals

  private updateVisuals(dt: number, env: Environment): void {
    const push = this.sailPush(env);
    const billow = clamp01(Math.abs(push) * this.sailAmount * (0.35 + env.windSpeed * 0.65));
    const sailUniforms = this.model.sailMaterial.uniforms;
    sailUniforms.uTime.value += dt;
    sailUniforms.uBillow.value = damp(sailUniforms.uBillow.value as number, 0.15 + billow * 0.85, 2.5, dt);
    sailUniforms.uWindSide.value = push >= 0 ? 1 : -1;
    sailUniforms.uSunDir.value.copy(env.uniforms.uSunDir.value);
    sailUniforms.uSunColor.value.copy(env.uniforms.uSunColor.value);
    sailUniforms.uAmbient.value.copy(env.uniforms.uSkyHorizon.value);

    const jibUniforms = this.model.jibMaterial.uniforms;
    jibUniforms.uTime.value += dt;
    jibUniforms.uBillow.value = 0.15 + billow * 0.5;
    jibUniforms.uWindSide.value = push >= 0 ? 1 : -1;
    jibUniforms.uSunDir.value.copy(env.uniforms.uSunDir.value);
    jibUniforms.uSunColor.value.copy(env.uniforms.uSunColor.value);
    jibUniforms.uAmbient.value.copy(env.uniforms.uSkyHorizon.value);

    const flagUniforms = this.model.flagMaterial.uniforms;
    flagUniforms.uTime.value += dt;
    flagUniforms.uSunColor.value.copy(env.uniforms.uSunColor.value);
    // The flag streams downwind.
    this.model.flag.rotation.y = angleDelta(this.heading, env.windAngle + Math.PI);

    this.updateHoldLight(dt, env);

    this.capstanSpin = damp(this.capstanSpin, this.anchorUp && this.anchorRaise < 1 ? 3.2 : 0, 4, dt);
    this.model.capstan.rotation.y += this.capstanSpin * dt;
    this.updateAnchor(dt);
    // The rudder trails the wheel, and bites harder the faster the water flows.
    this.model.rudder.rotation.y = this.rudder * 0.52;

    const night = env.uniforms.uNightFactor.value as number;
    const lanternOn = Math.max(night, env.localStorm * 0.6);
    this.model.lanternLight.intensity = lanternOn * 9;
    this.model.holdLight.intensity = 6.5 + lanternOn * 3;
  }

  /**
   * Leans the hatch light shaft along the sun and fades it with the daylight, so
   * the hold is lit by a real beam that moves as the ship turns and the sun sets.
   */
  private updateHoldLight(dt: number, env: Environment): void {
    const shaft = this.model.lightShaft;
    const sunWorld = env.uniforms.uSunDir.value as THREE.Vector3;
    const elevation = clamp01(sunWorld.y);
    const strength = elevation * elevation * (1 - env.localStorm * 0.75) * 0.85;

    const shaftMat = (shaft.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;
    shaftMat.uniforms.uTime.value += dt;
    shaftMat.uniforms.uStrength.value = strength;
    shaft.visible = strength > 0.01;

    if (shaft.visible) {
      // The shaft points away from the sun, in the ship's own frame.
      const local = this.worldToLocalDirection(sunWorld.clone().negate().normalize());
      const down = new THREE.Vector3(0, -1, 0);
      const tilted = local.clone().normalize();
      // Keep it within 40 degrees of vertical: a low sun cannot reach the hold.
      if (tilted.y > -0.76) {
        tilted.y = -0.76;
        tilted.normalize();
      }
      shaft.quaternion.setFromUnitVectors(down, tilted);
    }

    // The bilge shader needs the lantern in world space to glint off the water.
    const lampLocal = this.model.holdLight.position;
    const lampUniform = this.model.holdWaterMaterial.uniforms.uLampPos.value as THREE.Vector3;
    this.localToWorld(lampLocal.clone(), lampUniform);

    this.model.hatchPool.intensity = strength * 7;

    const dustMat = this.model.dust.material as THREE.ShaderMaterial;
    dustMat.uniforms.uTime.value += dt;
    dustMat.uniforms.uStrength.value = Math.max(strength, 0.12);
  }

  /**
   * Slides the anchor between stowed at the cathead and hanging deep, and lays
   * the chain out link by link between the hawse and the anchor ring.
   */
  private updateAnchor(dt: number): void {
    const model = this.model;
    const stowed = 1.1;
    const dropped = -4.6;
    const target = lerp(dropped, stowed, this.anchorRaise);
    const anchor = model.anchorGroup;
    anchor.position.y = damp(anchor.position.y, target, 3.5, dt);
    // A hanging anchor sways; a stowed one is lashed still.
    const swing = (1 - this.anchorRaise) * 0.12;
    anchor.rotation.z = Math.sin(this.anchorSway) * swing;
    anchor.rotation.x = Math.cos(this.anchorSway * 0.7) * swing * 0.6;
    this.anchorSway += dt * (1.4 + this.speed * 0.1);

    // Chain links from the hawse down to the ring.
    const hawse = new THREE.Vector3(8.0, 1.66, 2.6);
    const ring = new THREE.Vector3(anchor.position.x, anchor.position.y + 1.36, anchor.position.z);
    const span = hawse.distanceTo(ring);
    const spacing = 0.135;
    const count = Math.min(model.chainLinks.count, Math.max(1, Math.floor(span / spacing)));
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    const zero = new THREE.Vector3(0, 0, 0);
    const along = new THREE.Vector3().subVectors(ring, hawse).normalize();
    const linkQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), along);
    const alternate = new THREE.Quaternion().setFromAxisAngle(along, Math.PI / 2);

    for (let i = 0; i < model.chainLinks.count; i++) {
      if (i < count) {
        position.lerpVectors(hawse, ring, (i + 0.5) / count);
        quaternion.copy(linkQuat);
        if (i % 2 === 1) quaternion.premultiply(alternate);
        matrix.compose(position, quaternion, scale);
      } else {
        // Park unused links at the origin with zero scale.
        matrix.compose(hawse, linkQuat, zero);
      }
      model.chainLinks.setMatrixAt(i, matrix);
    }
    model.chainLinks.instanceMatrix.needsUpdate = true;
    model.chainLinks.visible = this.anchorRaise < 0.995;
  }

  /** Cranks the capstan; returns true once the anchor is clear of the water. */
  turnCapstan(dt: number): boolean {
    this.anchorUp = true;
    this.anchorRaise = Math.min(1, this.anchorRaise + dt * 0.42);
    return this.anchorRaise >= 1;
  }

  dropAnchor(): void {
    this.anchorUp = false;
  }

  adjustSail(delta: number): void {
    this.sailAmount = clamp01(this.sailAmount + delta);
  }

  adjustTrim(delta: number): void {
    this.sailTrim = clamp(this.sailTrim + delta, -1.4, 1.4);
  }

  /** Nudges the yard towards the ideal angle for the current wind. */
  autoTrim(env: Environment, dt: number): void {
    const relWind = angleDelta(this.heading, env.windAngle);
    const ideal = clamp(-relWind / 2, -1.4, 1.4);
    this.sailTrim = moveTowards(this.sailTrim, ideal, dt * 0.9);
  }

  /** Heading the ship should steer to reach a point, plus the rudder to get there. */
  steerTowards(target: THREE.Vector3, dt: number): void {
    const desired = Math.atan2(target.z - this.position.z, target.x - this.position.x);
    const delta = angleDelta(this.heading, desired);
    this.helmInput = clamp(-delta * 1.6, -1, 1);
    void dt;
  }


  /** Rough hull silhouette test used for cannonball hits and ramming. */
  intersectsPoint(world: THREE.Vector3, padding = 0): boolean {
    const local = this.worldToLocal(world.clone(), this.scratchLocal);
    if (local.x < SHIP.stern - padding || local.x > SHIP.bow + padding) return false;
    if (local.y < -2.4 - padding || local.y > SHIP.mastTop) return false;
    const half = hullShape.widthAt(clamp(local.x, SHIP.stern, SHIP.bow), clamp(local.y, -2, SHIP.deckY + 1.4)) + padding;
    return Math.abs(local.z) <= Math.max(half, 0.9);
  }

  /** Distance from a world point to the hull centre line, for AI spacing. */
  distanceTo(point: THREE.Vector3): number {
    return Math.hypot(point.x - this.position.x, point.z - this.position.z);
  }

  /**
   * Wake source for the ocean shader. Foam is laid down at the stern rather than
   * the hull centre, so the trail appears behind the ship instead of under it.
   */
  wakeSource(): { position: THREE.Vector3; speed: number; width: number } {
    const stern = this.position
      .clone()
      .addScaledVector(this.forward, -8.5)
      .setY(0);
    return { position: stern, speed: this.speed, width: 1.7 };
  }

  /** Fraction of the hull's rated integrity remaining, for HUD bars. */
  get integrity(): number {
    const damage = this.holes.reduce((sum, hole) => sum + hole.size, 0);
    return clamp01(1 - damage / 5.5);
  }


  dispose(): void {
    this.group.removeFromParent();
    this.group.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    });
  }

  /** Local-space bounds check used to decide whether the player is aboard. */
  containsLocal(local: THREE.Vector3): boolean {
    return (
      local.x > SHIP.stern - 1.2 &&
      local.x < SHIP.bow + 1.4 &&
      local.y > SHIP.holdFloorY - 1.6 &&
      local.y < SHIP.crowsNestY + 2.5 &&
      Math.abs(local.z) < SHIP.beam + 1.4
    );
  }


}
