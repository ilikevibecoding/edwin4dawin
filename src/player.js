// First-person controller: pointer lock, WASD + mouse look, sprint, head bob, capsule (vertical
// cylinder + eye height) vs axis-aligned box collision, and walkable floor patches (pits, stairs,
// catwalks, ramps) with step-up and gravity.
import * as THREE from "three";

const EYE_HEIGHT = 1.7;
const RADIUS = 0.32;
const SPEED = 2.8;
const SPRINT = 6.5;
const ACCEL = 14;
const MOUSE_SENS = 0.0022;
const PITCH_LIMIT = Math.PI / 2 - 0.05;
const STEP_UP = 0.6; // max ledge the player steps onto
const GRAVITY = 18;

export class Player {
  constructor(camera, domElement, colliders = [], walkables = []) {
    this.camera = camera;
    this.dom = domElement;
    this.colliders = colliders;
    this.walkables = walkables;
    this.position = new THREE.Vector3(0, 0, -1.6); // feet
    this.velocity = new THREE.Vector3();
    this.vy = 0;
    this.grounded = true;
    this.floorY = 0;
    this.yaw = 0; // yaw 0 looks down -Z; +90deg looks toward -X
    this.pitch = 0;
    this.keys = new Set();
    this.locked = false;
    this.enabled = true;
    this.bobPhase = 0;
    this.bobAmount = 0;
    this.headBob = true;
    this.frozen = false;
    this.shake = 0;
    this.onLockChange = null;
    this.speedScale = 1;

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

  setPose(x, z, yawDeg, pitchDeg, y = null) {
    this.position.set(x, y === null ? this.position.y : y, z);
    if (y !== null) this.floorY = y;
    this.yaw = THREE.MathUtils.degToRad(yawDeg);
    this.pitch = THREE.MathUtils.degToRad(pitchDeg);
    this.velocity.set(0, 0, 0);
    this.vy = 0;
    this.bobPhase = 0;
    this.bobAmount = 0;
    this.updateCamera(0);
    this.camera.updateMatrixWorld(true);
  }

  // Absolute placement (turbolift arrival, boarding). yaw in radians.
  teleport(x, y, z, yaw = this.yaw) {
    this.position.set(x, y, z);
    this.floorY = y;
    this.yaw = yaw;
    this.velocity.set(0, 0, 0);
    this.vy = 0;
    this.updateCamera(0);
    this.camera.updateMatrixWorld(true);
  }

  get eye() {
    return this.camera.position;
  }

  update(dt) {
    if (this.frozen || !this.enabled) {
      this.updateCamera(dt);
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
      wish.set(fx * fwd + rx * strafe, 0, fz * fwd + rz * strafe).normalize().multiplyScalar((sprint ? SPRINT : SPEED) * this.speedScale);
    }
    const t = 1 - Math.exp(-ACCEL * dt);
    this.velocity.lerp(wish, t);
    if (this.velocity.lengthSq() < 1e-6) this.velocity.set(0, 0, 0);

    // substep so a single frame never moves more than ~0.12 m: at the loop's 0.1 s dt clamp a sprint
    // step is 0.65 m, enough to tunnel through a thin partition
    const move = this.velocity.length() * dt;
    const n = Math.max(1, Math.ceil(move / 0.12));
    const step = this.velocity.clone().multiplyScalar(dt / n);
    for (let i = 0; i < n; i++) {
      this.position.x += step.x;
      this.resolveCollisions("x");
      this.position.z += step.z;
      this.resolveCollisions("z");
    }

    // ground: highest walkable under the feet within step height; otherwise fall
    const ground = this.groundHeight(this.position.x, this.position.z, this.position.y + STEP_UP);
    if (ground !== null) {
      this.floorY = ground;
      if (this.position.y <= ground + 0.02) {
        // step up smoothly, snap down instantly
        if (ground > this.position.y) this.position.y += Math.min(ground - this.position.y, dt * 6 + 0.02);
        else this.position.y = ground;
        this.vy = 0;
        this.grounded = true;
      } else {
        this.vy -= GRAVITY * dt;
        this.position.y = Math.max(ground, this.position.y + this.vy * dt);
        this.grounded = this.position.y <= ground + 1e-4;
      }
    } else {
      // nothing below within reach: fall toward the last known floor (never below it)
      this.vy -= GRAVITY * dt;
      this.position.y = Math.max(this.floorY - 0.001, this.position.y + this.vy * dt);
      if (this.position.y <= this.floorY) {
        this.position.y = this.floorY;
        this.vy = 0;
      }
    }

    const speed = this.velocity.length();
    const moving = speed > 0.2 && this.grounded;
    this.bobAmount += ((moving ? 1 : 0) - this.bobAmount) * Math.min(1, dt * 6);
    if (moving) this.bobPhase += dt * (6.2 + speed * 0.9);
    this.updateCamera(dt);
  }

  // Highest walkable surface under (x,z) whose height is <= maxY. null when none.
  groundHeight(x, z, maxY) {
    let best = null;
    for (const w of this.walkables) {
      if (x < w.min.x || x > w.max.x || z < w.min.z || z > w.max.z) continue;
      let y;
      if (w.axis) {
        const t = w.axis === "x" ? (x - w.min.x) / Math.max(1e-6, w.max.x - w.min.x) : (z - w.min.z) / Math.max(1e-6, w.max.z - w.min.z);
        y = w.y0 + (w.y1 - w.y0) * Math.min(1, Math.max(0, t));
      } else y = w.y;
      if (y > maxY) continue;
      if (best === null || y > best) best = y;
    }
    return best;
  }

  updateCamera() {
    const bob = this.headBob ? this.bobAmount : 0;
    const bobY = Math.sin(this.bobPhase * 2) * 0.028 * bob;
    const bobX = Math.cos(this.bobPhase) * 0.016 * bob;
    const roll = Math.cos(this.bobPhase) * 0.004 * bob;
    const rx = Math.cos(this.yaw);
    const rz = -Math.sin(this.yaw);
    const sh = this.shake ? this.shake : 0;
    const sx = sh ? (Math.random() - 0.5) * sh : 0;
    const sy = sh ? (Math.random() - 0.5) * sh : 0;
    this.camera.position.set(this.position.x + rx * bobX + sx, this.position.y + EYE_HEIGHT + bobY + sy, this.position.z + rz * bobX);
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(this.pitch, this.yaw, roll);
  }

  resolveCollisions(axis) {
    const p = this.position;
    const feet = p.y + 0.35; // knee height: low kerbs and step treads don't block
    const head = p.y + EYE_HEIGHT + 0.1;
    for (const c of this.colliders) {
      if (c.disabled) continue;
      if (c.max.y < feet || c.min.y > head) continue;
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

export { EYE_HEIGHT };
