// Camera rig: first-person (owned by Player), exterior orbit, exterior free-fly, and the animated
// transitions between inside and outside. The near plane adapts per mode so 24-bit depth stays
// usable both at 0.3 m from a console and 5 km from a 1.6 km hull.
import * as THREE from "three";
import { EXTERIOR_VIEWS, ROOM_BY_ID, TOWER, HANGAR } from "./spec.js";

const NEAR_IN = 0.1;
const NEAR_OUT = 1.2;
const FAR = 400000;
const ORBIT_MIN = 25;
const ORBIT_MAX = 9000;

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class CameraRig {
  constructor({ camera, player, dom, hud, cells }) {
    this.camera = camera;
    this.player = player;
    this.dom = dom;
    this.hud = hud;
    this.cells = cells;
    this.mode = "interior";
    this.orbit = { target: new THREE.Vector3(0, 40, -150), distance: 2600, yaw: -0.8, pitch: 0.22, fov: 55 };
    this.fly = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, speed: 60, vel: new THREE.Vector3() };
    this.transition = null;
    this.keys = new Set();
    this.drag = null;
    this.onModeChange = null;
    this.savedFov = camera.fov;
    this.dust = null; // set by main: dust lines toggled with the exterior

    dom.addEventListener("mousedown", (e) => {
      if (this.mode === "orbit") this.drag = { x: e.clientX, y: e.clientY, button: e.button };
    });
    window.addEventListener("mouseup", () => (this.drag = null));
    window.addEventListener("mousemove", (e) => {
      if (this.mode === "orbit" && this.drag) {
        const dx = e.clientX - this.drag.x;
        const dy = e.clientY - this.drag.y;
        this.drag.x = e.clientX;
        this.drag.y = e.clientY;
        if (this.drag.button === 2 || e.shiftKey) {
          // pan the target in the view plane
          const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
          const up = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
          const k = this.orbit.distance * 0.0012;
          this.orbit.target.addScaledVector(right, -dx * k).addScaledVector(up, dy * k);
        } else {
          this.orbit.yaw -= dx * 0.005;
          this.orbit.pitch = THREE.MathUtils.clamp(this.orbit.pitch + dy * 0.005, -1.45, 1.45);
        }
      } else if (this.mode === "fly" && document.pointerLockElement === dom) {
        this.fly.yaw -= e.movementX * 0.0022;
        this.fly.pitch = THREE.MathUtils.clamp(this.fly.pitch - e.movementY * 0.0022, -1.5, 1.5);
      }
    });
    dom.addEventListener("contextmenu", (e) => e.preventDefault());
    dom.addEventListener(
      "wheel",
      (e) => {
        if (this.mode === "orbit") {
          this.orbit.distance = THREE.MathUtils.clamp(this.orbit.distance * Math.exp(e.deltaY * 0.0012), ORBIT_MIN, ORBIT_MAX);
        } else if (this.mode === "fly") {
          this.fly.speed = THREE.MathUtils.clamp(this.fly.speed * Math.exp(-e.deltaY * 0.0015), 2, 1500);
          this.hud.setStatus(`Fly speed ${this.fly.speed.toFixed(0)} m/s`);
        }
      },
      { passive: true },
    );
    document.addEventListener("keydown", (e) => this.keys.add(e.code));
    document.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.keys.clear());
  }

  get exterior() {
    return this.mode === "orbit" || this.mode === "fly";
  }

  setMode(mode) {
    if (mode === this.mode) return;
    const prev = this.mode;
    this.mode = mode;
    this.player.enabled = mode === "interior";
    if (mode === "interior") {
      this.camera.fov = this.savedFov;
      this.camera.near = NEAR_IN;
      this.player.updateCamera(0);
    } else if (mode !== "transition") {
      this.camera.near = NEAR_OUT;
    }
    this.camera.updateProjectionMatrix();
    if (this.dust) this.dust.visible = this.exterior || mode === "transition";
    if (this.onModeChange) this.onModeChange(mode, prev);
  }

  /** Apply an exterior preset instantly (orbit mode). */
  applyPreset(name) {
    const v = EXTERIOR_VIEWS[name];
    if (!v) throw new Error("unknown exterior view " + name);
    const pos = new THREE.Vector3(...v.pos);
    const look = new THREE.Vector3(...v.look);
    this.orbit.target.copy(look);
    const d = pos.clone().sub(look);
    this.orbit.distance = d.length();
    this.orbit.yaw = Math.atan2(d.x, d.z);
    this.orbit.pitch = Math.asin(THREE.MathUtils.clamp(d.y / this.orbit.distance, -1, 1));
    this.orbit.fov = v.fov || 55;
    this.setMode("orbit");
    this.applyOrbit();
  }

  applyOrbit() {
    const o = this.orbit;
    const cp = Math.cos(o.pitch);
    const pos = new THREE.Vector3(Math.sin(o.yaw) * cp, Math.sin(o.pitch), Math.cos(o.yaw) * cp).multiplyScalar(o.distance).add(o.target);
    this.camera.position.copy(pos);
    this.camera.lookAt(o.target);
    if (this.camera.fov !== o.fov) {
      this.camera.fov = o.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  applyFly() {
    const f = this.fly;
    this.camera.position.copy(f.pos);
    this.camera.rotation.order = "YXZ";
    this.camera.rotation.set(f.pitch, f.yaw, 0);
  }

  /** Where the camera leaves / re-enters the hull for the player's current room. */
  portalFor(roomId) {
    const r = ROOM_BY_ID[roomId];
    if (!r) return null;
    if (roomId === "bridge" || roomId === "observation") {
      const b = TOWER.bridge;
      return { point: new THREE.Vector3(0, r.origin[1] + 3, b.z0 - 40), preset: "ext_bridge_close" };
    }
    if (r.deck === "E") {
      const o = HANGAR.opening;
      return { point: new THREE.Vector3((o.x0 + o.x1) / 2, HANGAR.floorY - 90, (o.z0 + o.z1) / 2), preset: "ext_hangar_mouth" };
    }
    return null; // no line of sight: fade-cut
  }

  /** Interior -> exterior. Returns a promise resolved when the camera settles in orbit. */
  toExterior(presetName = null) {
    if (this.mode !== "interior") return Promise.resolve();
    const roomId = this.cells.current ? this.cells.current.id : null;
    const portal = this.portalFor(roomId);
    const preset = presetName || (portal ? portal.preset : "ext_hero");
    const v = EXTERIOR_VIEWS[preset];
    const endPos = new THREE.Vector3(...v.pos);
    const endLook = new THREE.Vector3(...v.look);
    const startPos = this.camera.position.clone();
    const startLook = startPos.clone().add(this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(30));
    if (!portal) return this.fadeCut(() => this.applyPreset(preset));
    const pts = [startPos, portal.point, endPos];
    return this.runTransition(pts, startLook, endLook, 3.6, NEAR_IN, NEAR_OUT, () => {
      this.applyPreset(preset);
    });
  }

  /** Exterior -> interior (back to the player's eye). */
  toInterior() {
    if (this.mode === "interior" || this.mode === "transition") return Promise.resolve();
    const roomId = this.cells.current ? this.cells.current.id : null;
    const portal = this.portalFor(roomId);
    this.player.updateCamera(0);
    const eye = this.player.camera.position.clone();
    const eyeLook = eye.clone().add(new THREE.Vector3(-Math.sin(this.player.yaw), Math.sin(this.player.pitch) * 0.5, -Math.cos(this.player.yaw)).multiplyScalar(30));
    const startPos = this.camera.position.clone();
    const startLook = startPos.clone().add(this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(30));
    if (!portal) return this.fadeCut(() => this.setMode("interior"));
    const pts = [startPos, portal.point, eye];
    return this.runTransition(pts, startLook, eyeLook, 3.2, NEAR_OUT, NEAR_IN, () => this.setMode("interior"));
  }

  async fadeCut(apply) {
    this.setMode("transition");
    await this.hud.fadeIn(350);
    apply();
    await this.hud.fadeOut(450);
  }

  runTransition(points, look0, look1, dur, near0, near1, done) {
    this.setMode("transition");
    const curve = new THREE.CatmullRomCurve3(points, false, "centripetal", 0.5);
    return new Promise((resolve) => {
      this.transition = { curve, look0, look1, t: 0, dur, near0, near1, done, resolve };
    });
  }

  update(dt) {
    if (this.mode === "transition" && this.transition) {
      const tr = this.transition;
      tr.t = Math.min(tr.dur, tr.t + dt);
      const k = ease(tr.t / tr.dur);
      const p = tr.curve.getPointAt(k);
      this.camera.position.copy(p);
      const look = tr.look0.clone().lerp(tr.look1, k);
      this.camera.lookAt(look);
      this.camera.near = THREE.MathUtils.lerp(tr.near0, tr.near1, k);
      this.camera.updateProjectionMatrix();
      if (tr.t >= tr.dur) {
        this.transition = null;
        tr.done();
        tr.resolve();
      }
      return;
    }
    if (this.mode === "orbit") {
      // keyboard nudges for the orbit too
      const k = this.keys;
      if (k.has("KeyA") || k.has("ArrowLeft")) this.orbit.yaw += dt * 0.8;
      if (k.has("KeyD") || k.has("ArrowRight")) this.orbit.yaw -= dt * 0.8;
      if (k.has("KeyW") || k.has("ArrowUp")) this.orbit.distance = Math.max(ORBIT_MIN, this.orbit.distance * (1 - dt * 0.9));
      if (k.has("KeyS") || k.has("ArrowDown")) this.orbit.distance = Math.min(ORBIT_MAX, this.orbit.distance * (1 + dt * 0.9));
      if (k.has("KeyQ")) this.orbit.pitch = Math.min(1.45, this.orbit.pitch + dt * 0.6);
      if (k.has("KeyE")) this.orbit.pitch = Math.max(-1.45, this.orbit.pitch - dt * 0.6);
      this.applyOrbit();
    } else if (this.mode === "fly") {
      const k = this.keys;
      const f = this.fly;
      const fwd = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(f.pitch, f.yaw, 0, "YXZ"));
      const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, f.yaw, 0, "YXZ"));
      const wish = new THREE.Vector3();
      if (k.has("KeyW")) wish.add(fwd);
      if (k.has("KeyS")) wish.sub(fwd);
      if (k.has("KeyD")) wish.add(right);
      if (k.has("KeyA")) wish.sub(right);
      if (k.has("KeyE") || k.has("Space")) wish.y += 1;
      if (k.has("KeyQ") || k.has("KeyC")) wish.y -= 1;
      const boost = k.has("ShiftLeft") || k.has("ShiftRight") ? 4 : 1;
      if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(f.speed * boost);
      f.vel.lerp(wish, 1 - Math.exp(-dt * 6));
      f.pos.addScaledVector(f.vel, dt);
      this.applyFly();
    }
  }

  /** Switch orbit <-> fly keeping the current view. */
  toggleFly() {
    if (this.mode === "orbit") {
      this.fly.pos.copy(this.camera.position);
      const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, "YXZ");
      this.fly.yaw = e.y;
      this.fly.pitch = e.x;
      this.fly.vel.set(0, 0, 0);
      this.setMode("fly");
      this.dom.requestPointerLock();
    } else if (this.mode === "fly") {
      // orbit around the point 300 m ahead
      const fwd = this.camera.getWorldDirection(new THREE.Vector3());
      this.orbit.target.copy(this.camera.position).addScaledVector(fwd, 300);
      this.orbit.distance = 300;
      this.orbit.yaw = Math.atan2(-fwd.x, -fwd.z);
      this.orbit.pitch = Math.asin(THREE.MathUtils.clamp(-fwd.y, -1, 1));
      this.setMode("orbit");
      if (document.pointerLockElement) document.exitPointerLock();
    }
  }

  /** Direct pose for the harness. */
  setExterior(pos, look, fov = 55) {
    this.setMode("orbit");
    this.orbit.target.set(look[0], look[1], look[2]);
    const d = new THREE.Vector3(...pos).sub(this.orbit.target);
    this.orbit.distance = d.length();
    this.orbit.yaw = Math.atan2(d.x, d.z);
    this.orbit.pitch = Math.asin(THREE.MathUtils.clamp(d.y / this.orbit.distance, -1, 1));
    this.orbit.fov = fov;
    this.applyOrbit();
  }

  getState() {
    return { mode: this.mode, pos: this.camera.position.toArray().map((v) => +v.toFixed(1)), near: this.camera.near, fov: this.camera.fov };
  }
}

export { NEAR_IN, NEAR_OUT, FAR };
