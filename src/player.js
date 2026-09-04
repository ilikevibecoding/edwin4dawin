// First-person controller: pointer lock, WASD + mouse look, sprint, head bob, gravity with
// floor / ramp / pit support, capsule (vertical cylinder + eye height) vs axis-aligned box collision.
//
// Collider shapes ({min, max, tag, enabled?, type?}):
//   (default)          solid box: blocks XZ movement when it rises more than STEP above the feet, and is
//                      a standable surface (its top face) when it does not.
//   type "region"      non-blocking floor override: inside its XZ footprint the fallback floor is
//                      `floor` (crew pits, sunken decks). `min.y`/`max.y` are ignored.
//   type "ramp"        non-blocking ramp / stair: floor varies linearly from `y0` at the min end of
//                      `axis` ("x" | "z") to `y1` at the max end.
// Anything higher than STEP above the feet is a wall; anything lower is a step. Falling is resolved
// against the ground height at the player's centre, so pits, platforms and stairs need no extra code.
import * as THREE from "three";

const EYE_HEIGHT = 1.7;
const RADIUS = 0.32;
const SPEED = 2.6;
const SPRINT = 5.4;
const ACCEL = 14;
const GRAVITY = 22;
const STEP = 0.45;
const MOUSE_SENS = 0.0022;
const PITCH_LIMIT = Math.PI / 2 - 0.05;

export class Player {
  constructor(camera, domElement, colliders) {
    this.camera = camera;
    this.dom = domElement;
    this.colliders = colliders;
    this.position = new THREE.Vector3(0, 0, -1.6); // feet
    this.velocity = new THREE.Vector3();
    this.vy = 0;
    this.baseFloorY = 0; // fallback floor when no collider is under the player
    this.yaw = 0; // yaw 0 looks down -Z (forward); +90deg looks toward -X
    this.pitch = 0;
    this.keys = new Set();
    this.locked = false;
    this.enabled = true;
    this.bobPhase = 0;
    this.bobAmount = 0;
    this.headBob = true;
    this.frozen = false;
    this.onLockChange = null;
    this.onStep = null; // (position) => void, footstep hook for audio
    this._stepAcc = 0;

    this._onMouseMove = (e) => {
      if (!this.locked || this.frozen || !this.enabled) return;
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

  releaseLock() {
    if (this.locked && document.exitPointerLock) document.exitPointerLock();
  }

  /** Place the player. y is the feet height (defaults to the current base floor). */
  setPose(x, z, yawDeg, pitchDeg, y = null) {
    this.position.set(x, y === null ? this.baseFloorY : y, z);
    this.yaw = THREE.MathUtils.degToRad(yawDeg);
    this.pitch = THREE.MathUtils.degToRad(pitchDeg);
    this.velocity.set(0, 0, 0);
    this.vy = 0;
    this.bobPhase = 0;
    this.bobAmount = 0;
    this.updateCamera(0);
    this.camera.updateMatrixWorld(true);
  }

  get eye() {
    return this.camera.position;
  }

  get moving() {
    return this.velocity.lengthSq() > 0.04;
  }

  update(dt) {
    if (this.frozen || !this.enabled) {
      if (this.enabled) this.updateCamera(dt);
      return;
    }
    const k = this.keys;
    const fwd = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0);
    const strafe = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
    const sprint = k.has("ShiftLeft") || k.has("ShiftRight");
    const wish = new THREE.Vector3();
    if (this.locked && (fwd || strafe)) {
      const fx = -Math.sin(this.yaw);
      const fz = -Math.cos(this.yaw);
      const rx = Math.cos(this.yaw);
      const rz = -Math.sin(this.yaw);
      wish.set(fx * fwd + rx * strafe, 0, fz * fwd + rz * strafe).normalize().multiplyScalar(sprint ? SPRINT : SPEED);
    }
    const t = 1 - Math.exp(-ACCEL * dt);
    this.velocity.lerp(wish, t);
    if (this.velocity.lengthSq() < 1e-6) this.velocity.set(0, 0, 0);

    // integrate with collision, axis by axis; a move that would need a climb of more than STEP is a wall
    const p = this.position;
    const feet = p.y;
    const step = this.velocity.clone().multiplyScalar(dt);
    for (const axis of ["x", "z"]) {
      const before = p[axis];
      p[axis] += step[axis];
      this.resolveCollisions(axis, feet);
      if (this.groundAt(p.x, p.z, feet) > feet + STEP) p[axis] = before;
    }

    // vertical: fall onto / step up to the ground under the centre
    const g = this.groundAt(p.x, p.z, feet);
    if (p.y > g + 0.002) {
      this.vy -= GRAVITY * dt;
      p.y += this.vy * dt;
      if (p.y <= g) {
        p.y = g;
        this.vy = 0;
      }
    } else {
      this.vy = 0;
      p.y += (g - p.y) * Math.min(1, dt * 14);
      if (Math.abs(g - p.y) < 0.002) p.y = g;
    }

    // head bob + footsteps
    const speed = this.velocity.length();
    const moving = speed > 0.2;
    this.bobAmount += ((moving ? 1 : 0) - this.bobAmount) * Math.min(1, dt * 6);
    if (moving) {
      const rate = 6.2 + speed * 1.1;
      const prev = this.bobPhase;
      this.bobPhase += dt * rate;
      if (this.onStep && Math.floor(this.bobPhase / Math.PI) !== Math.floor(prev / Math.PI)) this.onStep(this.position, speed);
    }
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

  /** Ground height under (x, z) for a player whose feet are at `feet`. */
  groundAt(x, z, feet) {
    // fallback floor: the lowest region containing the point, else the deck floor
    let ground = this.baseFloorY;
    let regionHit = false;
    let rampHit = false;
    let rampY = -Infinity;
    for (const c of this.colliders) {
      if (c.enabled === false || !c.type) continue;
      if (x < c.min.x || x > c.max.x || z < c.min.z || z > c.max.z) continue;
      if (c.type === "region") {
        ground = regionHit ? Math.min(ground, c.floor) : c.floor;
        regionHit = true;
      } else if (c.type === "ramp") {
        const a = c.axis === "x" ? (x - c.min.x) / Math.max(1e-6, c.max.x - c.min.x) : (z - c.min.z) / Math.max(1e-6, c.max.z - c.min.z);
        rampY = Math.max(rampY, c.y0 + (c.y1 - c.y0) * THREE.MathUtils.clamp(a, 0, 1));
        rampHit = true;
      }
    }
    // a ramp overrides the deck floor, and rises out of a pit region it overlaps
    if (rampHit) ground = regionHit ? Math.max(ground, rampY) : rampY;
    // standable solids: highest top no more than STEP above the feet
    for (const c of this.colliders) {
      if (c.enabled === false || c.type) continue;
      if (x < c.min.x || x > c.max.x || z < c.min.z || z > c.max.z) continue;
      if (c.max.y <= feet + STEP && c.max.y > ground) ground = c.max.y;
    }
    return ground;
  }

  resolveCollisions(axis, feet) {
    const p = this.position;
    const head = feet + EYE_HEIGHT + 0.1;
    for (const c of this.colliders) {
      if (c.enabled === false || c.type) continue;
      // below the step height (standable) or above the head: not a wall
      if (c.max.y <= feet + STEP || c.min.y > head) continue;
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

export { EYE_HEIGHT, RADIUS, STEP };
