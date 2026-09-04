// Light pool: the ship has hundreds of practical light fixtures but the forward renderer should only
// ever see a fixed, small number of real lights (a constant count also avoids shader recompiles when
// rooms stream in and out). Builders create ordinary THREE.PointLight / SpotLight objects as *fixtures*
// (never added to the scene); each frame the pool hands the N most relevant fixtures to its real lights.
import * as THREE from "three";

const FADE = 6; // 1/s, how fast a slot eases toward its target intensity

export class LightPool {
  constructor(scene, { points = 14, spots = 4 } = {}) {
    this.scene = scene;
    this.points = [];
    this.spots = [];
    for (let i = 0; i < points; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 1, 2);
      l.name = "pool_point_" + i;
      scene.add(l);
      this.points.push({ light: l, fixture: null, current: 0 });
    }
    for (let i = 0; i < spots; i++) {
      const l = new THREE.SpotLight(0xffffff, 0, 1, 0.5, 0.7, 1.8);
      l.name = "pool_spot_" + i;
      // every pooled spot casts shadows so the shadow-caster count never changes (no recompiles);
      // window keys and ceiling spots are the lights whose shadows sell the room anyway
      l.castShadow = true;
      l.shadow.mapSize.set(1024, 1024);
      l.shadow.bias = -0.0003;
      l.shadow.normalBias = 0.03;
      l.shadow.camera.near = 0.3;
      l.shadow.camera.far = 30;
      scene.add(l);
      scene.add(l.target);
      this.spots.push({ light: l, fixture: null, current: 0 });
    }
    this.pointFixtures = [];
    this.spotFixtures = [];
    this._tmp = new THREE.Vector3();
  }

  setFixtures(pointFixtures, spotFixtures = []) {
    this.pointFixtures = pointFixtures;
    this.spotFixtures = spotFixtures;
  }

  // Relevance of a fixture for the viewer: its (inverse-square) contribution at the camera, zero when
  // the camera is beyond the light's range plus a margin (so lights behind the next wall still count a
  // little and don't flicker on the threshold).
  _score(f, camPos) {
    if ((f.userData && f.userData.off) || f.intensity <= 0) return 0;
    f.getWorldPosition ? f.getWorldPosition(this._tmp) : this._tmp.copy(f.position);
    const d2 = this._tmp.distanceToSquared(camPos);
    const range = (f.distance || 10) * 1.6;
    if (d2 > range * range) return 0;
    return f.intensity / (1 + d2 * 0.25);
  }

  _assign(slots, fixtures, camPos, dt) {
    const scored = [];
    for (const f of fixtures) {
      const s = this._score(f, camPos);
      if (s > 0) scored.push([s, f]);
    }
    scored.sort((a, b) => b[0] - a[0]);
    const chosen = scored.slice(0, slots.length).map((x) => x[1]);
    // keep fixtures that are still chosen in their slots, free the rest
    const chosenSet = new Set(chosen);
    for (const slot of slots) if (slot.fixture && !chosenSet.has(slot.fixture)) slot.fixture = null;
    const held = new Set(slots.map((s) => s.fixture).filter(Boolean));
    let next = chosen.filter((f) => !held.has(f));
    for (const slot of slots) {
      if (!slot.fixture && next.length) {
        slot.fixture = next.shift();
        slot.current = 0; // fade in from dark
      }
    }
    const k = 1 - Math.exp(-FADE * dt);
    for (const slot of slots) {
      const f = slot.fixture;
      const l = slot.light;
      if (!f) {
        slot.current += (0 - slot.current) * k;
        l.intensity = slot.current;
        if (slot.current < 1e-3) l.intensity = 0;
        continue;
      }
      f.getWorldPosition ? f.getWorldPosition(l.position) : l.position.copy(f.position);
      l.color.copy(f.color);
      l.distance = f.distance;
      l.decay = f.decay ?? 2;
      if (l.isSpotLight) {
        l.angle = f.angle;
        l.penumbra = f.penumbra;
        if (f.target) f.target.getWorldPosition ? f.target.getWorldPosition(l.target.position) : l.target.position.copy(f.target.position);
        if (f.shadow && slot.fixture !== slot.shadowFor) {
          // the fixture's own shadow camera range decides how far the shadow pass reaches (a long-range
          // key light can keep a short shadow frustum so neighbouring rooms stay out of the pass)
          l.shadow.camera.near = f.shadow.camera.near;
          l.shadow.camera.far = f.shadow.camera.far;
          l.shadow.bias = f.shadow.bias;
          l.shadow.normalBias = f.shadow.normalBias;
          l.shadow.camera.updateProjectionMatrix();
          slot.shadowFor = slot.fixture;
        }
      }
      slot.current += (f.intensity - slot.current) * k;
      l.intensity = slot.current;
    }
  }

  update(camPos, dt) {
    this._assign(this.points, this.pointFixtures, camPos, dt);
    this._assign(this.spots, this.spotFixtures, camPos, dt);
  }

  // instantly settle every slot (screenshots, teleports)
  settle(camPos) {
    for (let i = 0; i < 3; i++) this.update(camPos, 1);
  }

  get activeCount() {
    return this.points.filter((s) => s.fixture).length + this.spots.filter((s) => s.fixture).length;
  }
}
