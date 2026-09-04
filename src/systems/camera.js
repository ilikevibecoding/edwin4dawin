// Exterior camera rig: orbit (drag / wheel / auto-rotate) and free-fly (pointer lock + WASD) modes, with
// smooth damping and a scripted flight helper used by the boarding transition.
import * as THREE from "three";

const MIN_DIST = 120;
const MAX_DIST = 6000;

export class CameraRig {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.mode = "orbit"; // 'orbit' | 'fly' | 'off'
    this.target = new THREE.Vector3(0, 40, -150);
    this.spherical = new THREE.Spherical(1400, 1.25, 0.9); // radius, phi (from +Y), theta
    this.goal = { radius: 1400, phi: 1.25, theta: 0.9 };
    this.autoRotate = true;
    this.idle = 0;
    this.dragging = false;
    this.flyPos = new THREE.Vector3();
    this.flyYaw = 0;
    this.flyPitch = 0;
    this.flySpeed = 120;
    this.keys = new Set();
    this.locked = false;
    this.enabled = false;
    this.flight = null; // scripted flight { from, to, look, t, dur, onDone }
    this.onFlyToggle = null;

    dom.addEventListener("mousedown", (e) => {
      if (!this.enabled || this.mode !== "orbit") return;
      this.dragging = true;
      this.idle = 0;
      this.last = [e.clientX, e.clientY];
    });
    window.addEventListener("mouseup", () => (this.dragging = false));
    window.addEventListener("mousemove", (e) => {
      if (!this.enabled) return;
      if (this.mode === "orbit" && this.dragging) {
        const dx = e.clientX - this.last[0];
        const dy = e.clientY - this.last[1];
        this.last = [e.clientX, e.clientY];
        this.goal.theta -= dx * 0.005;
        this.goal.phi = THREE.MathUtils.clamp(this.goal.phi - dy * 0.005, 0.08, Math.PI - 0.08);
        this.idle = 0;
      } else if (this.mode === "fly" && this.locked) {
        this.flyYaw -= e.movementX * 0.0022;
        this.flyPitch = THREE.MathUtils.clamp(this.flyPitch - e.movementY * 0.0022, -1.5, 1.5);
      }
    });
    dom.addEventListener(
      "wheel",
      (e) => {
        if (!this.enabled) return;
        if (this.mode === "orbit") {
          this.goal.radius = THREE.MathUtils.clamp(this.goal.radius * Math.exp(e.deltaY * 0.0012), MIN_DIST, MAX_DIST);
          this.idle = 0;
        } else if (this.mode === "fly") {
          this.flySpeed = THREE.MathUtils.clamp(this.flySpeed * Math.exp(-e.deltaY * 0.001), 5, 800);
        }
        e.preventDefault();
      },
      { passive: false },
    );
    document.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
    });
    document.addEventListener("keyup", (e) => this.keys.delete(e.code));
    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === dom;
    });
  }

  /** Enter orbit mode around `target` from `pos` (camera position). */
  setOrbit(pos, target) {
    this.mode = "orbit";
    this.target.set(target[0], target[1], target[2]);
    const off = new THREE.Vector3(pos[0], pos[1], pos[2]).sub(this.target);
    this.spherical.setFromVector3(off);
    this.goal.radius = THREE.MathUtils.clamp(this.spherical.radius, MIN_DIST, MAX_DIST);
    this.goal.phi = this.spherical.phi;
    this.goal.theta = this.spherical.theta;
    this.idle = 0;
    this.apply();
  }

  toggleFly() {
    if (this.mode === "orbit") {
      this.mode = "fly";
      this.flyPos.copy(this.camera.position);
      const dir = new THREE.Vector3().subVectors(this.target, this.camera.position).normalize();
      this.flyYaw = Math.atan2(-dir.x, -dir.z);
      this.flyPitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1));
      this.dom.requestPointerLock();
    } else if (this.mode === "fly") {
      this.setOrbit(this.camera.position.toArray(), this.target.toArray());
      if (document.pointerLockElement === this.dom) document.exitPointerLock();
    }
    if (this.onFlyToggle) this.onFlyToggle(this.mode);
  }

  /** Scripted flight from the current pose to `to`, looking at `look`, over `dur` seconds. */
  flyTo(to, look, dur, onDone) {
    this.mode = "flight";
    const from = this.camera.position.clone();
    const q0 = this.camera.quaternion.clone();
    // the flight bows outward so the camera swings around rather than pushing straight through geometry
    const mid = from.clone().lerp(new THREE.Vector3(...to), 0.5);
    mid.y += from.distanceTo(new THREE.Vector3(...to)) * 0.12;
    this.flight = { curve: new THREE.QuadraticBezierCurve3(from, mid, new THREE.Vector3(...to)), look: new THREE.Vector3(...look), q0, t: 0, dur, onDone };
  }

  update(dt) {
    if (!this.enabled) return;
    if (this.mode === "flight" && this.flight) {
      const f = this.flight;
      f.t = Math.min(1, f.t + dt / f.dur);
      const e = f.t < 0.5 ? 4 * f.t ** 3 : 1 - Math.pow(-2 * f.t + 2, 3) / 2;
      this.camera.position.copy(f.curve.getPoint(e));
      const m = new THREE.Matrix4().lookAt(this.camera.position, f.look, new THREE.Vector3(0, 1, 0));
      const q = new THREE.Quaternion().setFromRotationMatrix(m);
      this.camera.quaternion.copy(f.q0).slerp(q, Math.min(1, e * 1.6));
      if (f.t >= 1) {
        this.flight = null;
        this.mode = "off";
        if (f.onDone) f.onDone();
      }
      return;
    }
    if (this.mode === "orbit") {
      this.idle += dt;
      if (this.autoRotate && this.idle > 2.5 && !this.dragging) this.goal.theta += dt * 0.035;
      const k = 1 - Math.exp(-dt * 6);
      this.spherical.radius += (this.goal.radius - this.spherical.radius) * k;
      this.spherical.phi += (this.goal.phi - this.spherical.phi) * k;
      this.spherical.theta += (this.goal.theta - this.spherical.theta) * k;
      this.apply();
    } else if (this.mode === "fly") {
      const k = this.keys;
      const fwd = (k.has("KeyW") ? 1 : 0) - (k.has("KeyS") ? 1 : 0);
      const strafe = (k.has("KeyD") ? 1 : 0) - (k.has("KeyA") ? 1 : 0);
      const up = (k.has("KeyE") || k.has("Space") ? 1 : 0) - (k.has("KeyQ") || k.has("KeyC") ? 1 : 0);
      const sp = this.flySpeed * (k.has("ShiftLeft") ? 4 : 1);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.flyPitch, this.flyYaw, 0, "YXZ"));
      const dir = new THREE.Vector3(strafe, 0, -fwd).applyQuaternion(q);
      dir.y += up;
      this.flyPos.addScaledVector(dir, sp * dt);
      this.camera.position.copy(this.flyPos);
      this.camera.quaternion.copy(q);
    }
  }

  apply() {
    const off = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(off);
    this.camera.lookAt(this.target);
  }
}
