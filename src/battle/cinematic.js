// Cinematic autopilot: a cycle of eleven shots built from the live fleet with eased camera moves and hard
// cuts between them: a push-in past a Venator's bridge towers, a dolly between the lines, an arc around
// the towers, an over-the-shoulder fighter chase, a Separatist ship silhouetted low over the city, a wide
// orbit, a track along a Venator's flank at 200 m, the melee from below with Coruscant filling the bottom
// of the frame, a dramatic angle on the ship dying right now, a pass under a Providence's fin and a slow
// wide from high above the Republic line. The camera never enters a hull (pushed outside 0.7 x the
// bounding radius of every ship). C toggles it, any drag hands control back to the orbit camera.
import * as THREE from "three";
import { easeInOut, smoothstep } from "./choreoRng.js";

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _look = new THREE.Vector3();
const _d = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
// key light direction (see makeBattleSun in battleShader.js): shots pick the sunlit side of a hull
const SUN = new THREE.Vector3(-0.35, 0.55, 0.76).normalize();

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
    this.smoothK = 6;
    this.roll = 0;
    this.pushes = 0; // times the clearance check moved the camera (for diagnostics)
  }

  // ---- helpers
  _ships(side, cls) {
    return this.battle.fleet.ships.filter(
      (s) =>
        (!side || s.side === side) &&
        (!cls ||
          s.model.id === cls ||
          (cls === "venator" && s.model.id === "venatorOpen")) &&
        s.health > 0,
    );
  }
  _pick(list, i) {
    return list.length ? list[i % list.length] : null;
  }
  _state(s) {
    return this.battle.stateOf ? this.battle.stateOf(s) : null;
  }
  // a live Venator that has a target (its guns will be busy) roughly ahead of it (so the battle lies
  // beyond the bow), settled in the battle (not a reinforcement still diving in), preferring undamaged
  // ones for hero work
  _heroVenator(i, wantHealthy = true) {
    const list = this._ships("republic", "venator");
    if (!list.length) return this.battle.fleet.ships[0];
    const scored = list
      .map((s) => {
        const st = this._state(s);
        let sc = 0;
        if (st && st.target) {
          sc += 2;
          _d.subVectors(st.target.ship.position, s.position).normalize();
          _a.set(0, 0, -1).applyQuaternion(s.quaternion);
          sc += 2 * _d.dot(_a);
        }
        if (st && st.role === "melee") sc += 1;
        if (st && st.role === "reinforcement") sc -= 10;
        if (wantHealthy && st) sc += st.hpFrac();
        return { s, sc };
      })
      .sort((p, q) => q.sc - p.sc);
    return scored[i % Math.min(4, scored.length)].s;
  }
  // world centre of the melee: the mean of the live melee-role ships, or the layout centre
  _meleeCentre(out) {
    const states = this.battle.states || [];
    let n = 0;
    out.set(0, 0, 0);
    for (const st of states) {
      if (st.role !== "melee" || st.dead) continue;
      out.add(st.ship.position);
      n++;
    }
    if (n) return out.divideScalar(n);
    return out.copy(this.battle.melee || _c.set(0, 0, 200));
  }
  // camera side of a ship facing its current target (so the guns fire toward the camera side)
  _targetSide(s) {
    const st = this._state(s);
    if (!st || !st.target) return this._sunSide(s);
    _d.subVectors(st.target.ship.position, s.position);
    _a.set(1, 0, 0).applyQuaternion(s.quaternion);
    return _d.dot(_a) >= 0 ? 1 : -1;
  }
  // the side of the hull (local +x or -x) that faces the sun
  _sunSide(s) {
    _a.set(1, 0, 0).applyQuaternion(s.quaternion);
    return _a.dot(SUN) >= 0 ? 1 : -1;
  }
  // the live ship of a class nearest the melee centre (the busiest background)
  _nearMelee(list) {
    if (!list.length) return null;
    this._meleeCentre(_c);
    let best = list[0];
    let bestD = Infinity;
    for (const s of list) {
      const d = s.position.distanceToSquared(_c);
      if (d < bestD) {
        bestD = d;
        best = s;
      }
    }
    return best;
  }

  // ---- shots: each returns { name, duration, smoothK?, roll?, at(t, outPos, outLook) }
  // 0: slow push-in past a Venator's bridge towers, the battle beyond the bow
  _heroPass(i) {
    const s = this._heroVenator(i);
    const L = s.model.length;
    const side = this._targetSide(s);
    return {
      name: "hero pass " + s.id,
      duration: 13,
      roll: -0.03 * side,
      at: (t, p, l) => {
        // from wide off the stern quarter (the whole ship in frame) down and in to bridge-head height
        // just outboard of the near tower, the deck and the battle beyond the bow filling the frame
        const e = easeInOut(t);
        _a.set(side * 620, 380, L * 1.05).applyMatrix4(s.matrix);
        _b.set(side * 175, 270, L * 0.3).applyMatrix4(s.matrix);
        p.lerpVectors(_a, _b, e);
        l.set(-side * 40, 120 - 30 * e, -L * (0.25 + 0.85 * e)).applyMatrix4(
          s.matrix,
        );
      },
    };
  }
  // 1: dolly between the lines through the melee
  _broadside() {
    const c = this._meleeCentre(new THREE.Vector3());
    return {
      name: "between the lines",
      duration: 14,
      roll: 0.02,
      at: (t, p, l) => {
        // dolly in from the west along the Republic side of the melee, looking north-east through the
        // tangle of hulls at the Separatist screen beyond; Republic fire crosses over the camera
        const e = smoothstep(t);
        p.set(c.x - 4200 + e * 4400, c.y + 500 - e * 300, c.z - 1700 + e * 600);
        l.set(c.x + 1500 - e * 700, c.y - 100, c.z + 1800 + e * 700);
      },
    };
  }
  // 2: slow arc around the twin bridge towers
  _towers(i) {
    const s = this._heroVenator(i + 1, false);
    const L = s.model.length;
    const side = this._sunSide(s);
    return {
      name: "bridge towers " + s.id,
      duration: 9,
      roll: -0.02 * side,
      at: (t, p, l) => {
        // arc from the sunlit stern quarter to behind the towers, rising a little
        const e = smoothstep(t);
        const ang = -0.75 + e * 1.15;
        const r = 360;
        p.set(
          side * Math.sin(ang) * r,
          240 + 90 * e,
          L * 0.28 + Math.cos(ang) * r,
        ).applyMatrix4(s.matrix);
        l.set(0, 190, L * 0.28).applyMatrix4(s.matrix);
      },
    };
  }
  // 3: over the shoulder of a Republic fighter diving at a Separatist frigate
  _chase(i) {
    // a Republic fighter currently running in at a Separatist frigate (heading toward its anchor, still
    // a little way out), so the frigate grows in the frame during the shot
    const ok = (f) =>
      f.side === "republic" && f.alive !== false && f.anchor && f.anchor.alive;
    const runningIn = (f) => {
      _d.subVectors(f.anchor.position, f.pos);
      const dist = _d.length();
      return (
        dist > 900 && dist < 2600 && _d.divideScalar(dist).dot(f.vel) > 0.6
      );
    };
    let list = this.fighters.all.filter(
      (f) =>
        ok(f) &&
        f.anchor.model &&
        f.anchor.model.id === "munificent" &&
        runningIn(f),
    );
    if (!list.length)
      list = this.fighters.all.filter((f) => ok(f) && runningIn(f));
    if (!list.length) list = this.fighters.all.filter(ok);
    const f = list.length ? list[(i * 7) % list.length] : null;
    return {
      name: "fighter chase",
      duration: 8,
      smoothK: 3.5,
      roll: 0.04,
      at: (t, p, l) => {
        if (!f) return;
        _a.copy(f.vel).normalize();
        p.copy(f.pos)
          .addScaledVector(_a, -(36 + t * 10))
          .add(_b.set(0, 9 + t * 4, 0));
        _c.copy(f.pos).addScaledVector(_a, 160);
        if (f.anchor) l.lerpVectors(_c, f.anchor.position, 0.5);
        else l.copy(_c);
      },
    };
  }
  // 4: a Separatist ship over the city, silhouetted against the lights (camera above, looking down),
  // its neighbours in the line hanging against the city grid beyond it
  _lowPlanet(i) {
    const seps = this._ships("separatist");
    let s = this.battle.fleet.ships[0];
    if (seps.length) {
      // the lowest few ships that are part of the lines or the melee (the stragglers far below near
      // the planet make a lonely frame), cycled
      let list = seps.filter((x) => {
        const st = this._state(x);
        return !st || st.role === "line" || st.role === "melee";
      });
      if (!list.length) list = seps;
      const sorted = list.slice().sort((p, q) => p.position.y - q.position.y);
      s = sorted[i % Math.min(3, sorted.length)];
    }
    const L = s.model.length;
    // camera on the side away from the melee, so the rest of the battle lies beyond the hull
    this._meleeCentre(_c);
    _d.subVectors(_c, s.position);
    _a.set(1, 0, 0).applyQuaternion(s.quaternion);
    const side = _d.dot(_a) >= 0 ? -1 : 1;
    return {
      name: "over the city " + s.id,
      duration: 12,
      roll: -0.05 * side,
      at: (t, p, l) => {
        // offsets follow the ship's heading only (not its roll), so the horizon stays where planned;
        // the camera rides the sunlit side, well above the hull, looking down at it against the city
        const e = easeInOut(t);
        this._yawFrame(s, side * 1250, 760, L * 0.75, _a);
        this._yawFrame(s, side * 820, 820, -L * 0.5, _b);
        p.lerpVectors(_a, _b, e);
        this._yawFrame(s, -side * 120, -60, -L * 0.1 + 60 * e, l);
      },
    };
  }
  // world point from an offset in the ship's heading frame (yaw only)
  _yawFrame(s, x, y, z, out) {
    const e = s.matrix.elements;
    const yaw = Math.atan2(e[8], e[10]); // nose is -Z: forward = (-e8, -e9, -e10)
    const c = Math.cos(yaw);
    const sn = Math.sin(yaw);
    return out.set(
      s.position.x + x * c + z * sn,
      s.position.y + y,
      s.position.z - x * sn + z * c,
    );
  }
  // 5: wide orbit of the whole battle
  _wideFleet() {
    const c = this._meleeCentre(new THREE.Vector3());
    return {
      name: "wide fleet",
      duration: 13,
      at: (t, p, l) => {
        const ang = 0.55 + t * 0.32;
        p.set(
          c.x + Math.sin(ang) * 8000,
          c.y + 1900 - t * 600,
          c.z + Math.cos(ang) * 8000,
        );
        l.set(c.x, c.y - 250, c.z + 600);
      },
    };
  }
  // 6: track along a Venator's flank at 200 m while its turrets fire
  _flankTrack(i) {
    const s = this._heroVenator(i + 2);
    const L = s.model.length;
    const side = this._targetSide(s);
    const st = this._state(s);
    return {
      name: "flank track " + s.id,
      duration: 12,
      roll: 0.03 * side,
      at: (t, p, l) => {
        const e = smoothstep(t);
        p.set(side * 490, 150, L * 0.45 - e * L * 0.95).applyMatrix4(s.matrix);
        l.set(-side * 60, 55, L * 0.45 - e * L * 0.95 - 420).applyMatrix4(
          s.matrix,
        );
        // bias the look a little toward the ship this one is shooting at, so the exchange is in frame
        if (st && st.target) l.lerp(st.target.ship.position, 0.12);
      },
    };
  }
  // 7: the melee from below, Coruscant filling the bottom of the frame
  _meleeBelow() {
    const c = this._meleeCentre(new THREE.Vector3());
    return {
      name: "melee from below",
      duration: 13,
      roll: -0.04,
      at: (t, p, l) => {
        // south-east of the melee and a little under it, dollying in and looking north-west, pitched
        // ~13 degrees down so the horizon (22 degrees below level at this altitude) sits a third of the
        // way up the frame: the hulls hang against the city grid, the higher ones against the stars
        const e = smoothstep(t);
        const ang = 2.6 + e * 0.45;
        const R = 3900 - e * 800;
        const y = c.y - 300;
        p.set(c.x + Math.sin(ang) * R, y, c.z + Math.cos(ang) * R);
        l.set(c.x, y - R * 0.235, c.z);
      },
    };
  }
  // 8: the ship that is dying right now (else the freshest wreck, else the most damaged), low orbit
  _dying(i) {
    const st = this.battle.mostDramatic ? this.battle.mostDramatic() : null;
    const s = st
      ? st.ship
      : this.battle.fleet.ships[i % this.battle.fleet.ships.length];
    const r = s.model.bounds.radius;
    const label =
      st && st.dying ? "dying" : st && st.dead ? "wreck" : "burning";
    return {
      name: `${label} ${s.model.id} ${s.id}`,
      duration: 11,
      roll: 0.06,
      at: (t, p, l) => {
        const e = smoothstep(t);
        const ang = 0.9 + e * 0.6;
        const R = r * 2.15;
        const el = -0.2 + e * 0.32;
        p.set(
          s.position.x + Math.sin(ang) * Math.cos(el) * R,
          s.position.y + Math.sin(el) * R,
          s.position.z + Math.cos(ang) * Math.cos(el) * R,
        );
        l.set(0, 30, 0).applyMatrix4(s.matrix);
      },
    };
  }
  // 9: low pass under a Providence's ventral fin
  _finPass(i) {
    // the Providence nearest the melee (so the pass has tracers and hulls beyond the fin)
    const s =
      this._nearMelee(this._ships("separatist", "providence")) ||
      this._pick(this._ships("separatist"), i) ||
      this.battle.fleet.ships[0];
    const L = s.model.length;
    const side = this._sunSide(s);
    return {
      name: "under the fin " + s.id,
      duration: 10,
      roll: 0.05 * side,
      at: (t, p, l) => {
        // close under the stern, a little off the sunlit side, sliding forward beneath the ventral fin
        // and looking up along the keel so the fin's blade crosses the top of the frame and the battle
        // beyond the bow fills the lower half
        // (stays 0.7 x the bounding radius from the centre, so the clearance pass never has to shove it)
        const e = easeInOut(t);
        _a.set(side * 330, -330, L * 0.7).applyMatrix4(s.matrix);
        _b.set(side * 290, -300, -L * 0.15).applyMatrix4(s.matrix);
        p.lerpVectors(_a, _b, e);
        l.set(-side * 60, 0, L * 0.1 - e * L * 1.1).applyMatrix4(s.matrix);
      },
    };
  }
  // 10: slow wide from high above the Republic line, looking across it at the enemy
  _highWide() {
    const g = this.battle.groups ? this.battle.groups.repLine : null;
    const c = this._meleeCentre(new THREE.Vector3());
    const base = g ? g.pos.clone() : new THREE.Vector3(0, 0, -3700);
    return {
      name: "high over the Republic line",
      duration: 14,
      roll: -0.02,
      at: (t, p, l) => {
        const e = smoothstep(t);
        p.set(
          base.x - 3200 + e * 3600,
          base.y + 4600 - e * 700,
          base.z - 2900 + e * 400,
        );
        l.set(c.x - 400 + e * 300, c.y - 500, c.z + 1200);
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
      () => this._flankTrack(this.index),
      () => this._meleeBelow(),
      () => this._dying(this.index),
      () => this._finPass(this.index),
      () => this._highWide(),
    ];
    this.shot = seq[this.index % seq.length]();
    this.index++;
    this.time = 0;
    this.smooth = 0; // fresh shot: cut, no smoothing
    this.smoothK = this.shot.smoothK || 6;
    this.roll = this.shot.roll || 0;
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
  get shotCount() {
    return 11;
  }

  // keep the camera outside every hull: at least 0.7 x the bounding radius from each ship centre
  _clear(p) {
    for (const s of this.battle.fleet.ships) {
      if (!s.alive) continue;
      const r = s.model.bounds.radius * 0.7;
      _d.subVectors(p, s.position);
      const d2 = _d.lengthSq();
      if (d2 >= r * r) continue;
      const d = Math.sqrt(d2);
      if (d < 1e-3) _d.set(0, 1, 0);
      else _d.divideScalar(d);
      p.addScaledVector(_d, r - d);
      this.pushes++;
    }
  }

  update(dt) {
    if (!this.enabled) return;
    if (!this.shot) this._next();
    this.time += dt;
    const t = Math.min(1, this.time / this.shot.duration);
    this.shot.at(t, this.pos, this.look);
    this._clear(this.pos);
    if (this.smooth === 0) {
      this.camera.position.copy(this.pos);
      _look.copy(this.look);
    } else {
      const k = 1 - Math.exp(-this.smoothK * dt);
      this.camera.position.lerp(this.pos, k);
      _look.lerp(this.look, k);
    }
    this.smooth = 1;
    this.camera.up.copy(UP);
    this.camera.lookAt(_look);
    if (this.roll) this.camera.rotateZ(this.roll);
    if (t >= 1) this._next();
  }
}
