// Cinematic autopilot: a cycle of shots built from the live fleet (hero passes along a Venator, a
// broadside between the lines, a low pass with Coruscant filling the frame, a bridge-tower close-up, a
// fighter chase). Each shot interpolates a camera path and look target over its duration with eased
// motion; C toggles it, any drag hands control back to the orbit camera.
import * as THREE from "three";

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _look = new THREE.Vector3();
const ease = (t) => t * t * (3 - 2 * t);

export class Cinematic {
  constructor(camera, battle, fighters) {
    this.camera = camera;
    this.battle = battle;
    this.fighters = fighters;
    this.enabled = false;
    this.shot = null;
    this.index = 0;
    this.time = 0;
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.smooth = 0;
  }

  _ships(side, cls) {
    return this.battle.fleet.ships.filter(
      (s) =>
        (!side || s.side === side) &&
        (!cls || s.model.id === cls) &&
        s.health > 0,
    );
  }
  _pick(list, i) {
    return list.length ? list[i % list.length] : null;
  }

  // shot factories: each returns { duration, at(t, outPos, outLook) }
  _heroPass(i) {
    const s =
      this._pick(this._ships("republic", "venator"), i) ||
      this.battle.fleet.ships[0];
    const L = s.model.length;
    return {
      name: "hero pass " + s.id,
      duration: 12,
      at: (t, p, l) => {
        // start high off the stern quarter, sweep forward and down past the towers to the bow
        const a = _a.set(420, 260, L * 0.7).applyMatrix4(s.matrix);
        const b = _b.set(-300, 90, -L * 0.75).applyMatrix4(s.matrix);
        p.lerpVectors(a, b, ease(t));
        l.set(0, 60, THREE.MathUtils.lerp(L * 0.2, -L * 0.5, t)).applyMatrix4(
          s.matrix,
        );
      },
    };
  }
  _towers(i) {
    const s =
      this._pick(this._ships("republic", "venator"), i + 3) ||
      this.battle.fleet.ships[0];
    const L = s.model.length;
    return {
      name: "bridge towers " + s.id,
      duration: 9,
      at: (t, p, l) => {
        const a = _a.set(-260, 300, L * 0.05).applyMatrix4(s.matrix);
        const b = _b.set(240, 280, L * 0.32).applyMatrix4(s.matrix);
        p.lerpVectors(a, b, ease(t));
        l.set(0, 210, L * 0.28).applyMatrix4(s.matrix);
      },
    };
  }
  _broadside() {
    const rep = this._ships("republic");
    const sep = this._ships("separatist");
    const c1 = new THREE.Vector3();
    const c2 = new THREE.Vector3();
    for (const s of rep) c1.add(s.position);
    for (const s of sep) c2.add(s.position);
    if (rep.length) c1.divideScalar(rep.length);
    if (sep.length) c2.divideScalar(sep.length);
    return {
      name: "between the lines",
      duration: 14,
      at: (t, p, l) => {
        const mid = _a.lerpVectors(c1, c2, 0.5);
        const ang = -0.9 + t * 1.0;
        p.set(
          mid.x + Math.sin(ang) * 6500,
          mid.y + 900 - t * 600,
          mid.z + Math.cos(ang) * 6500,
        );
        l.copy(mid).lerp(c2, 0.35 * t);
      },
    };
  }
  _lowPlanet(i) {
    const s =
      this._pick(this._ships("separatist", "providence"), i) ||
      this.battle.fleet.ships[0];
    const L = s.model.length;
    return {
      name: "low over the city " + s.id,
      duration: 11,
      at: (t, p, l) => {
        const a = _a.set(-900, -700, L * 0.3).applyMatrix4(s.matrix);
        const b = _b.set(700, -500, -L * 0.5).applyMatrix4(s.matrix);
        p.lerpVectors(a, b, ease(t));
        l.set(0, 40, -L * 0.1).applyMatrix4(s.matrix);
      },
    };
  }
  _chase(i) {
    const list = this.fighters.all.filter((f) => f.side === "republic");
    const f = list[(i * 7) % Math.max(1, list.length)];
    return {
      name: "fighter chase",
      duration: 7,
      at: (t, p, l) => {
        if (!f) return;
        p.copy(f.pos)
          .addScaledVector(f.vel, -34 - t * 6)
          .add(_a.set(0, 8, 0));
        l.copy(f.pos).addScaledVector(f.vel, 120);
      },
    };
  }
  _wideFleet() {
    return {
      name: "wide fleet",
      duration: 12,
      at: (t, p, l) => {
        const ang = 0.6 + t * 0.35;
        p.set(
          Math.sin(ang) * 15000,
          2600 - t * 400,
          -2000 + Math.cos(ang) * 15000,
        );
        l.set(0, -300, 2500);
      },
    };
  }

  _next() {
    const seq = [
      () => this._heroPass(this.index),
      () => this._broadside(),
      () => this._towers(this.index),
      () => this._chase(this.index),
      () => this._lowPlanet(this.index),
      () => this._wideFleet(),
    ];
    this.shot = seq[this.index % seq.length]();
    this.index++;
    this.time = 0;
    this.smooth = 0; // fresh shot: cut, no smoothing
  }

  start(index = null) {
    this.enabled = true;
    if (index !== null) this.index = index;
    this._next();
  }
  stop() {
    this.enabled = false;
  }
  get shotName() {
    return this.shot ? this.shot.name : "";
  }

  update(dt) {
    if (!this.enabled) return;
    if (!this.shot) this._next();
    this.time += dt;
    const t = Math.min(1, this.time / this.shot.duration);
    this.shot.at(t, this.pos, this.look);
    if (this.smooth === 0) {
      this.camera.position.copy(this.pos);
      _look.copy(this.look);
    } else {
      this.camera.position.lerp(this.pos, 1 - Math.exp(-6 * dt));
      _look.lerp(this.look, 1 - Math.exp(-6 * dt));
    }
    this.smooth = 1;
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(_look);
    if (t >= 1) this._next();
  }
}
