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
    this.current = null; // space id the viewer is in
    this.visible = null; // Set of space ids that are rendered (portal culling)
    this._tmp = new THREE.Vector3();
    this._gen = 0;
  }

  // Where the viewer is: fixtures in culled spaces are behind walls and never take a slot; the current
  // space's fixtures win ties against neighbours seen through doorways.
  setContext(spaceId, visibleSet) {
    this.current = spaceId;
    this.visible = visibleSet && visibleSet.size ? visibleSet : null;
  }

  setFixtures(pointFixtures, spotFixtures = []) {
    this.pointFixtures = pointFixtures;
    this.spotFixtures = spotFixtures;
    // static fixtures keep a cached world position; fixtures that move (lift cars) opt out via userData.moving
    for (const f of [...pointFixtures, ...spotFixtures]) {
      if (!f.userData) f.userData = {};
      if (!f.userData.moving) {
        f.updateWorldMatrix(true, false);
        f.userData.worldPos = (f.userData.worldPos || new THREE.Vector3()).setFromMatrixPosition(f.matrixWorld);
      }
    }
    const n = Math.max(pointFixtures.length, spotFixtures.length);
    if (!this._scores || this._scores.length < n) this._scores = new Float32Array(n);
    this._stamp = (this._stamp || 0) + 1;
  }

  _worldPos(f) {
    if (f.userData && f.userData.worldPos && !f.userData.moving) return f.userData.worldPos;
    return f.getWorldPosition(this._tmp);
  }

  // Relevance of a fixture for the viewer: its (inverse-square) contribution at the camera, zero when
  // the camera is beyond the light's range plus a margin (so lights behind the next wall still count a
  // little and don't flicker on the threshold).
  _score(f, camPos) {
    if ((f.userData && f.userData.off) || f.intensity <= 0) return 0;
    const sp = f.userData ? f.userData.space : null;
    if (sp && this.visible && !this.visible.has(sp)) return 0;
    const wp = this._worldPos(f);
    const d2 = wp.distanceToSquared(camPos);
    const range = (f.distance || 10) * 1.6;
    if (d2 > range * range) return 0;
    const s = f.intensity / (1 + d2 * 0.25);
    return sp && sp === this.current ? s * 1.8 : s;
  }

  // Top-k selection without per-frame allocation: scores go into a preallocated array, the k best
  // fixtures are marked with a generation stamp, slots keep fixtures that stayed chosen.
  _assign(slots, fixtures, camPos, dt) {
    const scores = this._scores || (this._scores = new Float32Array(Math.max(1, fixtures.length)));
    const n = fixtures.length;
    let any = 0;
    for (let i = 0; i < n; i++) {
      const s = this._score(fixtures[i], camPos);
      scores[i] = s;
      if (s > 0) any++;
    }
    const stamp = ++this._gen;
    const want = Math.min(slots.length, any);
    for (let c = 0; c < want; c++) {
      let bi = -1;
      let bs = 0;
      for (let i = 0; i < n; i++) if (scores[i] > bs) {
        bs = scores[i];
        bi = i;
      }
      if (bi < 0) break;
      scores[bi] = 0;
      fixtures[bi].userData.chosen = stamp;
    }
    // free slots whose fixture fell out of the top-k
    for (const slot of slots) if (slot.fixture && slot.fixture.userData.chosen !== stamp) slot.fixture = null;
    // give newly chosen fixtures the free slots
    for (let i = 0; i < n; i++) {
      const f = fixtures[i];
      if (f.userData.chosen !== stamp || f.userData.slotted === stamp) continue;
      let held = false;
      for (const slot of slots) if (slot.fixture === f) {
        held = true;
        break;
      }
      if (held) continue;
      const free = slots.find((s) => !s.fixture);
      if (!free) break;
      free.fixture = f;
      free.current = 0; // fade in from dark
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
      l.position.copy(this._worldPos(f));
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
