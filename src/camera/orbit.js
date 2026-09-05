// Exterior orbit / fly camera. Left-drag orbits, wheel zooms (logarithmic), right-drag or WASD moves
// the focus point, Shift speeds movement up. The camera is kept outside the hull volume.
import * as THREE from "three";
import { HULL, TOWER, SUPERSTRUCTURE } from "../config/shipSpec.js";

const MIN_DIST = 40;
const MAX_DIST = 14000;
const DAMP = 8;

export class OrbitCamera {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.enabled = false;
    this.target = new THREE.Vector3(0, 60, 150);
    this.distance = 2600;
    this.yaw = 0.7; // around +Y
    this.pitch = 0.32; // above the horizon
    this.goal = { target: this.target.clone(), distance: this.distance, yaw: this.yaw, pitch: this.pitch };
    this.keys = new Set();
    this._drag = null;
    this._onDown = (e) => {
      if (!this.enabled) return;
      this._drag = { button: e.button, x: e.clientX, y: e.clientY };
      e.preventDefault();
    };
    this._onMove = (e) => {
      if (!this.enabled || !this._drag) return;
      const dx = e.clientX - this._drag.x;
      const dy = e.clientY - this._drag.y;
      this._drag.x = e.clientX;
      this._drag.y = e.clientY;
      if (this._drag.button === 0) {
        this.goal.yaw -= dx * 0.005;
        this.goal.pitch = THREE.MathUtils.clamp(this.goal.pitch + dy * 0.005, -1.35, 1.35);
      } else {
        // pan the focus point in the camera plane, scaled by distance
        const k = this.goal.distance * 0.0012;
        const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
        const upv = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
        this.goal.target.addScaledVector(right, -dx * k).addScaledVector(upv, dy * k);
      }
    };
    this._onUp = () => (this._drag = null);
    this._onWheel = (e) => {
      if (!this.enabled) return;
      this.goal.distance = THREE.MathUtils.clamp(this.goal.distance * Math.exp(e.deltaY * 0.0012), MIN_DIST, MAX_DIST);
      e.preventDefault();
    };
    this._onKey = (e) => {
      if (e.type === "keydown") this.keys.add(e.code);
      else this.keys.delete(e.code);
    };
    dom.addEventListener("mousedown", this._onDown);
    window.addEventListener("mousemove", this._onMove);
    window.addEventListener("mouseup", this._onUp);
    dom.addEventListener("wheel", this._onWheel, { passive: false });
    dom.addEventListener("contextmenu", (e) => this.enabled && e.preventDefault());
    document.addEventListener("keydown", this._onKey);
    document.addEventListener("keyup", this._onKey);
    window.addEventListener("blur", () => this.keys.clear());
  }

  setPose({ target, distance, yaw, pitch }, instant = true) {
    if (target) this.goal.target.set(target[0], target[1], target[2]);
    if (distance !== undefined) this.goal.distance = distance;
    if (yaw !== undefined) this.goal.yaw = yaw;
    if (pitch !== undefined) this.goal.pitch = pitch;
    if (instant) {
      this.target.copy(this.goal.target);
      this.distance = this.goal.distance;
      this.yaw = this.goal.yaw;
      this.pitch = this.goal.pitch;
      this.apply();
    }
  }

  getPose() {
    return { target: this.target.toArray(), distance: this.distance, yaw: this.yaw, pitch: this.pitch };
  }

  // camera position for a pose
  positionFor(target, distance, yaw, pitch, out = new THREE.Vector3()) {
    const cp = Math.cos(pitch);
    out.set(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp).multiplyScalar(distance).add(target);
    return out;
  }

  // coarse inside-hull test used to keep the camera out of the ship
  static insideHull(p) {
    const hw = HULL.halfWidthAt(p.z);
    if (p.z > HULL.bowZ && p.z < HULL.sternZ && Math.abs(p.x) < hw + 15) {
      if (p.y < HULL.dorsalY(p.x, p.z) + 24 && p.y > HULL.ventralY(p.x, p.z) - 24) return true;
    }
    for (const [hx, z0, z1, yTop] of SUPERSTRUCTURE.terraces) if (Math.abs(p.x) < hx + 10 && p.z > z0 - 10 && p.z < z1 + 10 && p.y < yTop + 10 && p.y > -10) return true;
    const { neck, slab } = TOWER;
    if (Math.abs(p.x) < neck.halfX + 10 && p.z > neck.z0 - 10 && p.z < neck.z1 + 10 && p.y > neck.y0 - 10 && p.y < neck.y1 + 10) return true;
    if (Math.abs(p.x) < slab.halfX + 10 && p.z > slab.z0 - 10 && p.z < slab.z1 + 10 && p.y > slab.y0 - 10 && p.y < slab.y1 + 40) return true;
    return false;
  }

  apply() {
    const pos = this.positionFor(this.target, this.distance, this.yaw, this.pitch);
    // push out along the view ray until clear of the hull
    let guard = 0;
    while (OrbitCamera.insideHull(pos) && guard++ < 60) {
      this.distance = Math.min(MAX_DIST, this.distance * 1.06 + 5);
      this.goal.distance = Math.max(this.goal.distance, this.distance);
      this.positionFor(this.target, this.distance, this.yaw, this.pitch, pos);
    }
    this.camera.position.copy(pos);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.target);
  }

  update(dt) {
    if (!this.enabled) return;
    // fly the focus point with WASD / QE, relative to the camera heading
    const k = this.keys;
    const f = (k.has("KeyW") ? 1 : 0) - (k.has("KeyS") ? 1 : 0);
    const r = (k.has("KeyD") ? 1 : 0) - (k.has("KeyA") ? 1 : 0);
    const u = (k.has("KeyE") || k.has("Space") ? 1 : 0) - (k.has("KeyQ") || k.has("KeyC") ? 1 : 0);
    if (f || r || u) {
      const speed = this.goal.distance * (k.has("ShiftLeft") || k.has("ShiftRight") ? 1.6 : 0.5) * dt;
      const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      this.goal.target.addScaledVector(fwd, f * speed).addScaledVector(right, r * speed);
      this.goal.target.y += u * speed;
    }
    const t = 1 - Math.exp(-DAMP * dt);
    this.target.lerp(this.goal.target, t);
    this.distance += (this.goal.distance - this.distance) * t;
    this.yaw += (this.goal.yaw - this.yaw) * t;
    this.pitch += (this.goal.pitch - this.pitch) * t;
    this.apply();
  }
}
