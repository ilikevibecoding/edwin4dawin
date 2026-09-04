// Fixed pool of real lights that is re-targeted to whichever room the player is in. Three.js compiles
// the light count into every shader, so adding/removing lights per room would recompile everything;
// re-positioning a constant set costs nothing. Rooms describe their lights (see impKit.pointLightDesc),
// the pool picks the most relevant ones each frame and fades them in/out to avoid pops.
import * as THREE from "three";

const FADE = 5.0; // intensity units per second (fraction of target)

export class LightPool {
  constructor(scene, { points = 12, spots = 2 } = {}) {
    this.scene = scene;
    this.points = [];
    this.spots = [];
    for (let i = 0; i < points; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 1, 2);
      l.name = "pool_point_" + i;
      l.userData.slot = { desc: null, target: 0 };
      scene.add(l);
      this.points.push(l);
    }
    for (let i = 0; i < spots; i++) {
      const s = new THREE.SpotLight(0xffffff, 0, 1, 0.7, 0.6, 1.6);
      s.name = "pool_spot_" + i;
      s.castShadow = true;
      s.shadow.mapSize.set(1024, 1024);
      s.shadow.bias = -0.0003;
      s.shadow.normalBias = 0.03;
      s.shadow.camera.near = 0.3;
      s.shadow.camera.far = 30;
      s.userData.slot = { desc: null, target: 0 };
      scene.add(s);
      scene.add(s.target);
      this.spots.push(s);
    }
    this.scale = 0.8; // global practical-light scale (tuned against the tone mapper)
    this.dim = 1.0; // controller-driven multiplier (rest cycle, alerts)
    this._tmp = new THREE.Vector3();
  }

  // descs: light descriptors (world positions). focus: THREE.Vector3 the player / camera position.
  assign(descs, focus) {
    const score = (d) => {
      const dx = d.pos[0] - focus.x;
      const dy = d.pos[1] - focus.y;
      const dz = d.pos[2] - focus.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      // priority dominates; within a priority, nearer and stronger wins
      return -(d.priority || 0) * 1000 + dist - Math.min(30, d.distance * 0.5);
    };
    const pts = descs.filter((d) => d.type === "point").sort((a, b) => score(a) - score(b)).slice(0, this.points.length);
    const sps = descs.filter((d) => d.type === "spot").sort((a, b) => score(a) - score(b)).slice(0, this.spots.length);
    this._bind(this.points, pts);
    this._bind(this.spots, sps);
  }

  _bind(lights, descs) {
    // keep lights already bound to a chosen desc; give the rest to unbound descs
    const wanted = new Set(descs);
    const free = [];
    for (const l of lights) {
      const slot = l.userData.slot;
      if (slot.desc && wanted.has(slot.desc)) wanted.delete(slot.desc);
      else free.push(l);
    }
    const remaining = [...wanted];
    for (const l of free) {
      const slot = l.userData.slot;
      const d = remaining.shift() || null;
      if (slot.desc !== d) {
        slot.desc = d;
        slot.fresh = true; // new binding: start from zero intensity at the new position
      }
    }
  }

  update(dt) {
    for (const l of [...this.points, ...this.spots]) {
      const slot = l.userData.slot;
      const d = slot.desc;
      if (slot.fresh) {
        slot.fresh = false;
        l.intensity = 0;
        if (d) {
          l.position.set(d.pos[0], d.pos[1], d.pos[2]);
          l.color.copy(d.color);
          l.distance = d.distance;
          if (l.isSpotLight) {
            l.target.position.set(d.target[0], d.target[1], d.target[2]);
            l.angle = d.angle;
            l.penumbra = d.penumbra;
            // castShadow is part of every program's cache key: pool spots always cast, never toggle
            l.shadow.camera.far = Math.max(5, d.distance);
          }
        }
      }
      const target = d ? d.intensity * this.scale * this.dim * (d.dim === undefined ? 1 : d.dim) : 0;
      const k = Math.min(1, dt * FADE);
      l.intensity += (target - l.intensity) * k;
      if (!d && l.intensity < 0.01) l.intensity = 0;
      if (d && d.color && !l.color.equals(d.color)) l.color.lerp(d.color, k);
      // an unbound spot still renders a 1024² depth pass unless its shadow map is frozen
      if (l.isSpotLight) {
        const on = !!d && l.intensity > 0.001;
        if (on && !l.shadow.autoUpdate) l.shadow.needsUpdate = true;
        l.shadow.autoUpdate = on;
      }
    }
  }

  // Jump straight to the target intensities (turbolift arrivals, boarding): no fade-in from black
  snap() {
    for (const l of [...this.points, ...this.spots]) {
      const slot = l.userData.slot;
      const d = slot.desc;
      if (slot.fresh && d) {
        slot.fresh = false;
        l.position.set(d.pos[0], d.pos[1], d.pos[2]);
        l.color.copy(d.color);
        l.distance = d.distance;
        if (l.isSpotLight) {
          l.target.position.set(d.target[0], d.target[1], d.target[2]);
          l.angle = d.angle;
          l.penumbra = d.penumbra;
          l.shadow.camera.far = Math.max(5, d.distance);
        }
      }
      l.intensity = d ? d.intensity * this.scale * this.dim * (d.dim === undefined ? 1 : d.dim) : 0;
    }
  }

  get count() {
    return this.points.length + this.spots.length;
  }
}
