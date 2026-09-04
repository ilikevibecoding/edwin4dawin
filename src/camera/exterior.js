// Exterior camera: damped orbit around a target with zoom, pan and free-fly keys, plus named presets
// that frame the ship at cinematic distances. Works without pointer lock (drag on the canvas).
import * as THREE from "three";
import { HULL, TOWER, HANGAR_WELL, ENGINES } from "../config/layout.js";

const MIN_R = 25;
const MAX_R = 14000;

export const EXTERIOR_PRESETS = {
  // key -> { target, theta (rad, around Y from +Z), phi (rad from +Y), radius }
  reveal: { target: [0, 60, 80], theta: -2.35, phi: 1.2, radius: 1750, label: "Bow quarter" },
  bow: { target: [0, 30, -250], theta: -2.75, phi: 1.3, radius: 1150, label: "Bow" },
  dorsal: { target: [0, 60, 150], theta: -2.5, phi: 0.7, radius: 1700, label: "Dorsal overview" },
  bridge: { target: [0, 196, 560], theta: 2.95, phi: 1.42, radius: 340, label: "Command tower" },
  hangar: { target: [0, -30, (HANGAR_WELL.z0 + HANGAR_WELL.z1) / 2], theta: 0.6, phi: 2.55, radius: 420, label: "Ventral hangar" },
  stern: { target: [0, 0, HULL.sternZ - 100], theta: 0.35, phi: 1.35, radius: 1500, label: "Engines" },
  trench: { target: [-380, 0, 500], theta: -1.9, phi: 1.52, radius: 260, label: "Port trench" },
  turbolaser: { target: [-140, 84, 450], theta: -2.4, phi: 1.25, radius: 120, label: "Turbolaser battery" },
};
export const PRESET_KEYS = ["reveal", "bow", "dorsal", "bridge", "hangar", "stern", "trench", "turbolaser"];

export class ExteriorCamera {
  constructor(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.enabled = false;
    this.target = new THREE.Vector3(0, 40, 0);
    this.theta = -2.35;
    this.phi = 1.25;
    this.radius = 3600;
    // smoothed state
    this.sTarget = this.target.clone();
    this.sTheta = this.theta;
    this.sPhi = this.phi;
    this.sRadius = this.radius;
    this.drag = null;
    this.keys = new Set();
    this.autoOrbit = 0; // rad/s slow drift when idle
    this.idle = 0;
    this._pos = new THREE.Vector3();
    this.flight = null;
    this.bind();
  }

  bind() {
    const dom = this.dom;
    dom.addEventListener("pointerdown", (e) => {
      if (!this.enabled) return;
      this.drag = { x: e.clientX, y: e.clientY, button: e.button };
      this.idle = 0;
      dom.setPointerCapture(e.pointerId);
    });
    dom.addEventListener("pointermove", (e) => {
      if (!this.enabled || !this.drag) return;
      const dx = e.clientX - this.drag.x;
      const dy = e.clientY - this.drag.y;
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
      this.idle = 0;
      if (this.drag.button === 0) {
        this.theta -= dx * 0.005;
        this.phi = THREE.MathUtils.clamp(this.phi - dy * 0.005, 0.05, Math.PI - 0.05);
      } else {
        // pan in the camera plane, scaled by distance
        const s = this.sRadius * 0.0012;
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
        this.target.addScaledVector(right, -dx * s).addScaledVector(up, dy * s);
      }
    });
    const end = () => (this.drag = null);
    dom.addEventListener("pointerup", end);
    dom.addEventListener("pointercancel", end);
    dom.addEventListener(
      "wheel",
      (e) => {
        if (!this.enabled) return;
        e.preventDefault();
        this.idle = 0;
        this.radius = THREE.MathUtils.clamp(this.radius * Math.exp(e.deltaY * 0.0012), MIN_R, MAX_R);
      },
      { passive: false },
    );
    dom.addEventListener("contextmenu", (e) => this.enabled && e.preventDefault());
    document.addEventListener("keydown", (e) => {
      if (!this.enabled) return;
      this.keys.add(e.code);
      const idx = PRESET_KEYS.indexOf(PRESET_KEYS[parseInt(e.key, 10) - 1]);
      if (idx >= 0 && !e.repeat && !this.flight && !this.locked) this.setPreset(PRESET_KEYS[idx]);
    });
    document.addEventListener("keyup", (e) => this.keys.delete(e.code));
    window.addEventListener("blur", () => this.keys.clear());
  }

  // a superseded flight must still settle its promise or the mode manager waits forever
  _endFlight(ok) {
    const f = this.flight;
    this.flight = null;
    if (f && f.resolve) f.resolve(ok);
  }

  setPreset(name, instant = false) {
    const p = EXTERIOR_PRESETS[name];
    if (!p) return false;
    this.target.set(...p.target);
    this.theta = p.theta;
    this.phi = p.phi;
    this.radius = p.radius;
    this._endFlight(false);
    if (instant) this.snap();
    this.idle = 0;
    this.preset = name;
    return true;
  }

  snap() {
    this.sTarget.copy(this.target);
    this.sTheta = this.theta;
    this.sPhi = this.phi;
    this.sRadius = this.radius;
    this.apply();
  }

  // Look from `pos` at `look` (world), instantly
  setPose(pos, look) {
    const p = new THREE.Vector3(...pos);
    const l = new THREE.Vector3(...look);
    const d = p.clone().sub(l);
    this.target.copy(l);
    this.radius = Math.max(MIN_R, d.length());
    this.theta = Math.atan2(d.x, d.z);
    this.phi = Math.acos(THREE.MathUtils.clamp(d.y / d.length(), -1, 1));
    this._endFlight(false);
    this.snap();
  }

  // Cinematic flight: interpolate the orbit parameters toward a pose over `duration` seconds
  flyTo(pos, look, duration = 2.5) {
    this._endFlight(false);
    const p = new THREE.Vector3(...pos);
    const l = new THREE.Vector3(...look);
    const d = p.clone().sub(l);
    this.flight = {
      t: 0,
      duration,
      from: { target: this.sTarget.clone(), theta: this.sTheta, phi: this.sPhi, radius: this.sRadius },
      to: { target: l, theta: Math.atan2(d.x, d.z), phi: Math.acos(THREE.MathUtils.clamp(d.y / d.length(), -1, 1)), radius: Math.max(MIN_R, d.length()) },
    };
    // unwrap theta so we take the short way round
    while (this.flight.to.theta - this.flight.from.theta > Math.PI) this.flight.to.theta -= Math.PI * 2;
    while (this.flight.to.theta - this.flight.from.theta < -Math.PI) this.flight.to.theta += Math.PI * 2;
    return new Promise((resolve) => (this.flight.resolve = resolve));
  }

  update(dt) {
    if (!this.enabled) return;
    if (this.flight) {
      const f = this.flight;
      f.t = Math.min(f.duration, f.t + dt);
      const k = f.t / f.duration;
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      this.sTarget.lerpVectors(f.from.target, f.to.target, e);
      this.sTheta = f.from.theta + (f.to.theta - f.from.theta) * e;
      this.sPhi = f.from.phi + (f.to.phi - f.from.phi) * e;
      this.sRadius = Math.exp(Math.log(f.from.radius) + (Math.log(f.to.radius) - Math.log(f.from.radius)) * e);
      this.target.copy(this.sTarget);
      this.theta = this.sTheta;
      this.phi = this.sPhi;
      this.radius = this.sRadius;
      this.apply();
      if (f.t >= f.duration) {
        this.flight = null;
        if (f.resolve) f.resolve(true);
      }
      return;
    }
    // fly keys move the target along the camera axes
    const k = this.keys;
    const fwd = (k.has("KeyW") ? 1 : 0) - (k.has("KeyS") ? 1 : 0);
    const strafe = (k.has("KeyD") ? 1 : 0) - (k.has("KeyA") ? 1 : 0);
    const lift = (k.has("KeyE") || k.has("Space") ? 1 : 0) - (k.has("KeyQ") || k.has("KeyC") ? 1 : 0);
    if (fwd || strafe || lift) {
      this.idle = 0;
      const speed = this.sRadius * (k.has("ShiftLeft") ? 1.6 : 0.6) * dt;
      const q = this.camera.quaternion;
      const f = new THREE.Vector3(0, 0, -1).applyQuaternion(q);
      f.y = 0;
      f.normalize();
      const r = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
      r.y = 0;
      r.normalize();
      this.target.addScaledVector(f, fwd * speed).addScaledVector(r, strafe * speed);
      this.target.y += lift * speed;
    }
    this.idle += dt;
    if (this.idle > 6 && !this.drag) this.theta += this.autoOrbit * dt;
    const s = 1 - Math.exp(-dt * 6);
    this.sTarget.lerp(this.target, s);
    this.sTheta += (this.theta - this.sTheta) * s;
    this.sPhi += (this.phi - this.sPhi) * s;
    this.sRadius = Math.exp(Math.log(this.sRadius) + (Math.log(this.radius) - Math.log(this.sRadius)) * s);
    this.apply();
  }

  apply() {
    const sp = Math.sin(this.sPhi);
    this._pos.set(this.sTarget.x + this.sRadius * sp * Math.sin(this.sTheta), this.sTarget.y + this.sRadius * Math.cos(this.sPhi), this.sTarget.z + this.sRadius * sp * Math.cos(this.sTheta));
    this.camera.position.copy(this._pos);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.sTarget);
  }

  get distance() {
    return this.sRadius;
  }
}

export { TOWER, ENGINES };
