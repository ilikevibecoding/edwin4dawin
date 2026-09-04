// First-person controller: pointer lock, WASD + mouse look, head bob,
// capsule (vertical cylinder + eye height) vs axis-aligned box collision.
import * as THREE from "three";

const EYE_HEIGHT = 1.7;
const RADIUS = 0.32;
const SPEED = 2.6;
const RUN_SPEED = 5.2;
const ACCEL = 14;
const MOUSE_SENS = 0.0022;
const PITCH_LIMIT = Math.PI / 2 - 0.05;
const STEP_UP = 0.45; // tallest ledge / stair riser the player walks up
const FALL_SPEED = 6; // m/s when stepping down onto a lower floor

export class Player {
  /**
   * @param colliders wall AABBs [{min,max}] that block horizontal movement
   * @param floors walkable surfaces [{x0,z0,x1,z1,y}] (y may be a getter for moving platforms;
   *        `carry: true` makes the player ride the surface without the step-up limit)
   */
  constructor(camera, domElement, colliders, floors = []) {
    this.camera = camera;
    this.dom = domElement;
    this.colliders = colliders;
    this.floors = floors;
    this.groundFloor = null;
    this.position = new THREE.Vector3(0, 0, -1.6); // feet
    this.velocity = new THREE.Vector3();
    this.yaw = 0; // yaw 0 looks down -Z (toward the cockpit); +90deg looks toward -X
    this.pitch = 0;
    this.keys = new Set();
    this.locked = false;
    this.enabled = true;
    this.bobPhase = 0;
    this.bobAmount = 0;
    this.headBob = true;
    this.frozen = false;
    this.onLockChange = null;

    this._onMouseMove = (e) => {
      if (!this.locked || this.frozen) return;
      this.yaw -= e.movementX * MOUSE_SENS;
      this.pitch -= e.movementY * MOUSE_SENS;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -PITCH_LIMIT, PITCH_LIMIT);
    };
    this._onKeyDown = (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onLockChange = () => {
      this.locked = document.pointerLockElement === this.dom;
      if (!this.locked) this.keys.clear();
      if (this.onLockChange) this.onLockChange(this.locked);
    };
    document.addEventListener("mousemove", this._onMouseMove);
    document.addEventListener("keydown", this._onKeyDown);
    document.addEventListener("keyup", this._onKeyUp);
    document.addEventListener("pointerlockchange", this._onLockChange);
    window.addEventListener("blur", () => this.keys.clear());
  }

  requestLock() {
    if (this.locked) return;
    const p = this.dom.requestPointerLock({ unadjustedMovement: true });
    if (p && p.catch) p.catch(() => this.dom.requestPointerLock());
  }

  setPose(x, z, yawDeg, pitchDeg, y = null) {
    this.position.set(x, y ?? this.groundAt(x, z, Infinity) ?? 0, z);
    this.groundFloor = null;
    this.yaw = THREE.MathUtils.degToRad(yawDeg);
    this.pitch = THREE.MathUtils.degToRad(pitchDeg);
    this.velocity.set(0, 0, 0);
    this.bobPhase = 0;
    this.bobAmount = 0;
    this.updateCamera(0);
    this.camera.updateMatrixWorld(true);
  }

  get eye() {
    return this.camera.position;
  }

  update(dt) {
    if (this.frozen) {
      this.updateCamera(dt);
      return;
    }
    const k = this.keys;
    const fwd = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0);
    const strafe = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
    const wish = new THREE.Vector3();
    if (this.locked && (fwd || strafe)) {
      // camera forward / right on the XZ plane for the current yaw
      const fx = -Math.sin(this.yaw);
      const fz = -Math.cos(this.yaw);
      const rx = Math.cos(this.yaw);
      const rz = -Math.sin(this.yaw);
      const speed = k.has("ShiftLeft") || k.has("ShiftRight") ? RUN_SPEED : SPEED;
      wish.set(fx * fwd + rx * strafe, 0, fz * fwd + rz * strafe).normalize().multiplyScalar(speed);
    }
    // smooth acceleration
    const t = 1 - Math.exp(-ACCEL * dt);
    this.velocity.lerp(wish, t);
    if (this.velocity.lengthSq() < 1e-6) this.velocity.set(0, 0, 0);

    // ride a moving platform before integrating our own motion
    if (this.groundFloor && this.groundFloor.carry) this.position.y = this.groundFloor.y;

    // integrate with collision, axis by axis
    const step = this.velocity.clone().multiplyScalar(dt);
    this.position.x += step.x;
    this.resolveCollisions("x");
    this.position.z += step.z;
    this.resolveCollisions("z");
    this.resolveGround(dt);

    // head bob
    const speed = this.velocity.length();
    const moving = speed > 0.2;
    this.bobAmount += ((moving ? 1 : 0) - this.bobAmount) * Math.min(1, dt * 6);
    if (moving) this.bobPhase += dt * (6.2 + speed * 1.1);
    this.updateCamera(dt);
  }

  updateCamera() {
    const bob = this.headBob ? this.bobAmount : 0;
    const bobY = Math.sin(this.bobPhase * 2) * 0.028 * bob;
    const bobX = Math.cos(this.bobPhase) * 0.016 * bob;
    const roll = Math.cos(this.bobPhase) * 0.004 * bob;
    const rx = Math.cos(this.yaw);
    const rz = -Math.sin(this.yaw);
    this.camera.position.set(this.position.x + rx * bobX, this.position.y + EYE_HEIGHT + bobY, this.position.z + rz * bobX);
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(this.pitch, this.yaw, roll);
  }

  // Highest walkable surface under (x, z) that is no more than `reach` above the current feet.
  // Returns null when nothing is below (the player then keeps its height instead of falling forever).
  groundAt(x, z, reach = STEP_UP) {
    let best = null;
    let bestY = -Infinity;
    const limit = this.position.y + reach;
    for (const f of this.floors) {
      if (x < f.x0 || x > f.x1 || z < f.z0 || z > f.z1) continue;
      const y = floorHeight(f, x, z);
      if (y > limit || y <= bestY) continue;
      bestY = y;
      best = f;
    }
    this._groundCandidate = best;
    return best ? bestY : null;
  }

  resolveGround(dt) {
    const p = this.position;
    const y = this.groundAt(p.x, p.z);
    if (y === null) return;
    this.groundFloor = this._groundCandidate;
    if (y >= p.y) p.y = y; // step up (bounded by STEP_UP in groundAt)
    else p.y = Math.max(y, p.y - FALL_SPEED * dt); // ease down stairs / ledges
  }

  resolveCollisions(axis) {
    const p = this.position;
    const feet = p.y + 0.05;
    const head = p.y + EYE_HEIGHT + 0.1;
    for (const c of this.colliders) {
      if (c.disabled || c.max.y < feet || c.min.y > head) continue;
      // closest point on the AABB footprint to the player circle centre
      const cx = THREE.MathUtils.clamp(p.x, c.min.x, c.max.x);
      const cz = THREE.MathUtils.clamp(p.z, c.min.z, c.max.z);
      const dx = p.x - cx;
      const dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= RADIUS * RADIUS) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        const push = RADIUS - d;
        if (axis === "x") p.x += (dx / d) * push;
        else p.z += (dz / d) * push;
      } else {
        // centre inside the box: push out along the shallowest side on this axis
        if (axis === "x") {
          const left = p.x - c.min.x;
          const right = c.max.x - p.x;
          p.x += left < right ? -(left + RADIUS) : right + RADIUS;
        } else {
          const back = p.z - c.min.z;
          const front = c.max.z - p.z;
          p.z += back < front ? -(back + RADIUS) : front + RADIUS;
        }
      }
    }
  }
}

// Floor height at (x, z): flat floors have a single y; ramps interpolate y0..y1 along `axis`.
function floorHeight(f, x, z) {
  if (f.y0 === undefined) return f.y;
  const t = f.axis === "x" ? (x - f.x0) / (f.x1 - f.x0) : (z - f.z0) / (f.z1 - f.z0);
  return f.y0 + (f.y1 - f.y0) * THREE.MathUtils.clamp(t, 0, 1);
}

export { EYE_HEIGHT, STEP_UP };
