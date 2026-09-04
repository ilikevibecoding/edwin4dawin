// First-person controller: pointer lock, WASD + Shift sprint, mouse look, head bob, gravity, step-up (stairs)
// and capsule-vs-AABB collision against the RoomManager's active collider list.
import * as THREE from "three";

export const EYE_HEIGHT = 1.7;
const RADIUS = 0.32;
const HEIGHT = 1.85;
const WALK = 4.2;
const SPRINT = 8.0;
const ACCEL = 14;
const MOUSE_SENS = 0.0022;
const PITCH_LIMIT = Math.PI / 2 - 0.05;
const STEP = 0.48; // max step-up height
const GRAVITY = 14;

export class Player {
  /** @param colliders array reference (rebuilt by the RoomManager); entries { min, max, enabled } */
  constructor(camera, domElement, colliders) {
    this.camera = camera;
    this.dom = domElement;
    this.colliders = colliders;
    this.position = new THREE.Vector3(0, 0, 0); // feet
    this.velocity = new THREE.Vector3();
    this.vy = 0;
    this.onGround = true;
    this.yaw = 0; // yaw 0 looks down -Z (toward the bow)
    this.pitch = 0;
    this.keys = new Set();
    this.locked = false;
    this.enabled = true; // false while the exterior camera is active
    this.bobPhase = 0;
    this.bobAmount = 0;
    this.headBob = true;
    this.frozen = false;
    this.shake = 0;
    this.onLockChange = null;
    this.onFall = null;
    this.floorRef = null;
    this._t = 0;
    // touch mode: no pointer lock; movement from a virtual stick, look from drag deltas
    this.touchMode = false;
    this.touch = { move: new THREE.Vector2(), sprint: false };

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
    if (this.touchMode) {
      this.locked = true;
      if (this.onLockChange) this.onLockChange(true);
      return;
    }
    const p = this.dom.requestPointerLock({ unadjustedMovement: true });
    if (p && p.catch) p.catch(() => this.dom.requestPointerLock());
  }

  releaseLock() {
    if (this.touchMode) {
      this.locked = false;
      return;
    }
    if (this.locked) document.exitPointerLock();
  }

  /** Touch look: apply yaw / pitch deltas in radians. */
  touchLook(dyaw, dpitch) {
    if (this.frozen || !this.enabled) return;
    this.yaw += dyaw;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dpitch, -PITCH_LIMIT, PITCH_LIMIT);
  }

  setPose(x, y, z, yawDeg, pitchDeg = 0) {
    this.position.set(x, y, z);
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

  update(dt) {
    this._t += dt;
    if (!this.enabled) return;
    if (this.frozen) {
      this.updateCamera(dt);
      return;
    }
    const k = this.keys;
    let fwd = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0);
    let strafe = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
    let sprint = k.has("ShiftLeft") || k.has("ShiftRight");
    let mag = 1;
    if (this.touchMode) {
      fwd += this.touch.move.y;
      strafe += this.touch.move.x;
      sprint = sprint || this.touch.sprint;
      mag = Math.min(1, Math.hypot(fwd, strafe));
    }
    const wish = new THREE.Vector3();
    if (this.locked && (fwd || strafe)) {
      const fx = -Math.sin(this.yaw);
      const fz = -Math.cos(this.yaw);
      const rx = Math.cos(this.yaw);
      const rz = -Math.sin(this.yaw);
      wish.set(fx * fwd + rx * strafe, 0, fz * fwd + rz * strafe).normalize().multiplyScalar((sprint ? SPRINT : WALK) * mag);
    }
    const t = 1 - Math.exp(-ACCEL * dt);
    this.velocity.lerp(wish, t);
    if (this.velocity.lengthSq() < 1e-6) this.velocity.set(0, 0, 0);

    // horizontal move with collision, axis by axis (sub-stepped so sprinting never tunnels)
    const step = this.velocity.clone().multiplyScalar(dt);
    const sub = Math.max(1, Math.ceil(step.length() / (RADIUS * 0.8)));
    for (let i = 0; i < sub; i++) {
      this.position.x += step.x / sub;
      this.resolveCollisions("x");
      this.position.z += step.z / sub;
      this.resolveCollisions("z");
    }

    // vertical: ground under the feet (step-up), gravity otherwise
    const ground = this.groundHeight();
    if (ground !== null && this.position.y <= ground + 0.02 && this.vy <= 0) {
      // snap up small steps smoothly, down instantly
      const rise = ground - this.position.y;
      if (rise > 0) this.position.y += Math.min(rise, Math.max(rise * 12 * dt, 0.02));
      else this.position.y = ground;
      this.vy = 0;
      this.onGround = true;
    } else {
      this.vy -= GRAVITY * dt;
      this.vy = Math.max(this.vy, -30);
      this.position.y += this.vy * dt;
      this.onGround = false;
      if (ground !== null && this.position.y < ground) {
        this.position.y = ground;
        this.vy = 0;
        this.onGround = true;
      }
      // fall tether: 25 m below the current deck (or 400 m absolute when no room is known)
      const limit = this.floorRef !== null && this.floorRef !== undefined ? this.floorRef - 25 : -400;
      if (ground === null && this.position.y < limit && this.onFall) this.onFall();
    }

    // head bob
    const speed = this.velocity.length();
    const moving = speed > 0.2 && this.onGround;
    this.bobAmount += ((moving ? 1 : 0) - this.bobAmount) * Math.min(1, dt * 6);
    if (moving) this.bobPhase += dt * (5.4 + speed * 0.7);
    this.updateCamera(dt);
  }

  updateCamera() {
    const bob = this.headBob ? this.bobAmount : 0;
    const bobY = Math.sin(this.bobPhase * 2) * 0.028 * bob;
    const bobX = Math.cos(this.bobPhase) * 0.016 * bob;
    const roll = Math.cos(this.bobPhase) * 0.004 * bob;
    const rx = Math.cos(this.yaw);
    const rz = -Math.sin(this.yaw);
    const sh = this.shake ? (Math.sin(this._t * 37) * 0.6 + Math.sin(this._t * 61) * 0.4) * this.shake : 0;
    const shx = this.shake ? Math.sin(this._t * 43 + 1) * this.shake * 0.6 : 0;
    this.camera.position.set(this.position.x + rx * (bobX + shx), this.position.y + EYE_HEIGHT + bobY + sh, this.position.z + rz * (bobX + shx));
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(this.pitch, this.yaw, roll);
  }

  /** Highest collider top under the player's footprint that is at most STEP above the feet. */
  groundHeight() {
    const p = this.position;
    let best = null;
    const r = RADIUS * 0.7;
    for (const c of this.colliders) {
      if (c.enabled === false) continue;
      if (c.max.y >= p.y + STEP || c.max.y < p.y - 3.0) continue;
      if (p.x + r < c.min.x || p.x - r > c.max.x || p.z + r < c.min.z || p.z - r > c.max.z) continue;
      if (c.min.y > p.y + STEP) continue;
      if (best === null || c.max.y > best) best = c.max.y;
    }
    return best;
  }

  resolveCollisions(axis) {
    const p = this.position;
    const feet = p.y + STEP; // anything below the step height is walkable, not a wall
    const head = p.y + HEIGHT;
    for (const c of this.colliders) {
      if (c.enabled === false) continue;
      if (c.max.y < feet || c.min.y >= head) continue;
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
