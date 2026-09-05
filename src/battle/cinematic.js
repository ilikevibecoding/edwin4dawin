// Cinematic autopilot: a cycle of hero shots (5-8 s) with 2-3 s inserts between them, built from the live
// fleet, hard cuts between shots and camera moves that are already travelling on the cut: a push-in past a
// Venator's bridge towers, a dolly between the lines, an arc around the towers, an over-the-shoulder
// fighter chase (the fighter held in the lower third; the shot cuts if it leaves the frame), a Separatist
// ship silhouetted over the city, a wide across the battle over a foreground hull, a track along a
// Venator's flank, the melee from below with Coruscant filling the bottom of the frame, the ship dying
// right now, a pass under a Providence's ventral fin and a wide from over the Republic line; the inserts
// are an impact close-up on the most-targeted hull, a fighter crossing the frame and flak bursting around
// a hull under fire. The camera never enters a hull: a small sphere test plus the ships' oriented boxes
// (inflated 12 %). C toggles it, any drag hands control back to the orbit camera.
import * as THREE from "three";
import { BATTLE_SUN_DIR } from "./battleShader.js";

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _look = new THREE.Vector3();
const _d = new THREE.Vector3();
const _s = new THREE.Vector3();
const _l = new THREE.Vector3();
const _m = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);
const OBB_MARGIN = 1.2; // hull boxes inflated by this for the camera clearance

// eased moves that are already travelling on the cut (slope 1.35 at the start, 0.65 at the end)
const glide = (t) => t * (1.35 - 0.35 * t);
const clamp01 = (t) => Math.min(1, Math.max(0, t));

// shot indices 0-10 are the hero shots (main.js views address them by index), 11-13 the inserts; the
// cycle plays them in this order
const SHOTS = 14;
const ORDER = [0, 11, 1, 2, 12, 3, 4, 13, 5, 6, 11, 7, 8, 12, 9, 10, 13];

export class Cinematic {
  constructor(camera, battle, fighters) {
    this.camera = camera;
    this.battle = battle;
    this.fighters = fighters;
    this.enabled = false;
    this.shot = null;
    this.index = 0; // index of the current shot
    this.cursor = -1; // position in ORDER
    this.take = 0; // shots played so far (cycles the subjects)
    this.time = 0;
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.smooth = 0;
    this.smoothK = 6;
    this.roll = 0;
    this.pushes = 0; // times the clearance check moved the camera (for diagnostics)
    this.cuts = 0; // shots ended early because their subject left the frame or died
  }

  // ---- helpers
  _ships(side, cls) {
    return this.battle.fleet.ships.filter(
      (s) =>
        s.alive &&
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
  _any() {
    return this._ships()[0] || this.battle.fleet.ships[0];
  }
  // a live Venator that has a target (its guns will be busy) roughly ahead of it (so the battle lies
  // beyond the bow), settled in the battle (not a reinforcement still diving in), preferring undamaged
  // ones for hero work
  _heroVenator(i, wantHealthy = true) {
    const list = this._ships("republic", "venator");
    if (!list.length) return this._any();
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
        if (st && st.dying) sc -= 20;
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
    return _a.dot(BATTLE_SUN_DIR) >= 0 ? 1 : -1;
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
  // the living ship most enemies are shooting at right now (hits and flak land there)
  _mostTargeted() {
    const states = this.battle.states || [];
    let best = null;
    let bestN = -1;
    for (const st of states) {
      if (st.dead || st.dying || !st.ship.alive) continue;
      if (st.targetedBy > bestN) {
        bestN = st.targetedBy;
        best = st;
      }
    }
    return best;
  }
  // mean direction (from a ship) toward the enemies that are targeting it
  _attackDir(st, out) {
    out.set(0, 0, 0);
    for (const o of this.battle.states || []) {
      if (o.target !== st || o.dead) continue;
      _d.subVectors(o.ship.position, st.ship.position).normalize();
      out.add(_d);
    }
    if (out.lengthSq() < 1e-6) {
      if (st.target) out.subVectors(st.target.ship.position, st.ship.position);
      else out.set(0, 0, -1).applyQuaternion(st.ship.quaternion);
    }
    return out.normalize();
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
  // world point from an offset in a frame looking from `from` toward `to` (fwd, right, up)
  _lookFrame(from, to, fwd, right, up, out) {
    _d.subVectors(to, from);
    _d.y = 0;
    if (_d.lengthSq() < 1) _d.set(0, 0, 1);
    _d.normalize();
    _s.crossVectors(_d, UP).normalize();
    return out
      .copy(from)
      .addScaledVector(_d, fwd)
      .addScaledVector(_s, right)
      .addScaledVector(UP, up);
  }

  // ---- shots: each returns { name, duration, smoothK?, roll?, at(t, outPos, outLook), subject? }
  // 0: push-in past a Venator's bridge towers, the battle beyond the bow
  _heroPass(i) {
    const s = this._heroVenator(i);
    const L = s.model.length;
    const side = this._targetSide(s);
    return {
      name: "hero pass " + s.id,
      duration: 8,
      roll: -0.03 * side,
      at: (t, p, l) => {
        // from wide off the stern quarter (the whole ship in frame) down and in to bridge-head height
        // just outboard of the near tower, the deck and the battle beyond the bow filling the frame
        const e = glide(t);
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
      duration: 8,
      roll: 0.02,
      at: (t, p, l) => {
        // dolly in from the west along the Republic side of the melee, looking north-east through the
        // tangle of hulls at the Separatist screen beyond; Republic fire crosses over the camera
        const e = glide(t);
        p.set(c.x - 4200 + e * 4400, c.y + 500 - e * 300, c.z - 1700 + e * 600);
        l.set(c.x + 1500 - e * 700, c.y - 100, c.z + 1800 + e * 700);
      },
    };
  }
  // 2: arc around the twin bridge towers
  _towers(i) {
    const s = this._heroVenator(i + 1, false);
    const L = s.model.length;
    const side = this._sunSide(s);
    return {
      name: "bridge towers " + s.id,
      duration: 6,
      roll: -0.02 * side,
      at: (t, p, l) => {
        // arc from the sunlit stern quarter to behind the towers, rising a little
        const e = glide(t);
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
        dist > 1100 && dist < 2800 && _d.divideScalar(dist).dot(f.vel) > 0.75
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
      duration: 7,
      // a smoothed camera trails a 300 m/s fighter by speed / rate: track tightly and let the
      // fighter's own turn-limited motion keep the path smooth
      smoothK: 40,
      roll: 0.04,
      subject: (out) => (f && f.alive !== false ? out.copy(f.pos) : null),
      at: (t, p, l) => {
        if (!f || f.alive === false) return false; // the fighter is gone: cut
        _a.copy(f.vel).normalize();
        // 80 m behind and 36 m above the fighter, the look point 300 m ahead along its heading and
        // 32 m below it: the camera pitches ~10 degrees down, the fighter (24 degrees below the
        // camera) sits in the lower third at a sixth of the frame width, the run-in target beyond it
        p.copy(f.pos)
          .addScaledVector(_a, -(80 + t * 10))
          .addScaledVector(UP, 36 + t * 4);
        // a wingman (or anything else) about to fly through the lens: cut rather than clip
        for (const o of this.fighters.all) {
          if (
            o !== f &&
            o.alive !== false &&
            o.pos.distanceToSquared(p) < 30 * 30
          )
            return false;
        }
        _c.copy(f.pos).addScaledVector(_a, 300).addScaledVector(UP, -32);
        // bias the look a fifth of the way toward the frigate the fighter is running at, but never
        // more than 60 m (~9 degrees), so the fighter stays in its third of the frame
        if (f.anchor) {
          _d.subVectors(f.anchor.position, _c).multiplyScalar(0.2);
          const m = _d.length();
          if (m > 60) _d.multiplyScalar(60 / m);
          l.copy(_c).add(_d);
        } else l.copy(_c);
        return true;
      },
    };
  }
  // 4: a Separatist ship over the city, silhouetted against the lights (camera above, looking down),
  // its neighbours in the line hanging against the city grid beyond it
  _lowPlanet(i) {
    const seps = this._ships("separatist");
    let s = this._any();
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
      duration: 7,
      roll: -0.05 * side,
      at: (t, p, l) => {
        // offsets follow the ship's heading only (not its roll), so the horizon stays where planned:
        // the camera slides stern to bow on the side away from the battle, 30 degrees above the hull,
        // pitched 11.8 degrees down from wherever it is, so the horizon (22 degrees below level at
        // this altitude) sits a third of the way up the frame, the hull hangs silhouetted against the
        // city grid in that bottom third and the rest of the battle stands above it against the stars
        const e = glide(t);
        this._yawFrame(s, side * 900, 520, L * 0.55, _a);
        this._yawFrame(s, side * 700, 540, -L * 0.35, _b);
        p.lerpVectors(_a, _b, e);
        const dist = Math.hypot(s.position.x - p.x, s.position.z - p.z);
        l.set(s.position.x, p.y - dist * 0.209, s.position.z); // tan(11.8 deg)
      },
    };
  }
  // 5: wide across the battle from behind a Republic line ship, its hull in the foreground
  _wideFleet(i) {
    const c = this._meleeCentre(new THREE.Vector3());
    const list = this._ships("republic", "venator").filter((s) => {
      const st = this._state(s);
      return !st || st.role === "line";
    });
    // the line ships farthest from the melee: the whole battle lies beyond them
    const sorted = list
      .slice()
      .sort(
        (p, q) =>
          q.position.distanceToSquared(c) - p.position.distanceToSquared(c),
      );
    const s = sorted.length ? sorted[i % Math.min(3, sorted.length)] : null;
    if (!s) return this._highWide(i);
    const L = s.model.length;
    const side = i % 2 ? 1 : -1;
    return {
      name: "wide fleet over " + s.id,
      duration: 8,
      roll: -0.02 * side,
      at: (t, p, l) => {
        // behind and above the ship's quarter, swinging slowly across its stern; the hull fills the
        // lower corner and the battle spreads beyond it
        const e = glide(t);
        this._lookFrame(
          s.position,
          c,
          -L * 0.95,
          side * L * (0.55 - 0.3 * e),
          L * 0.34,
          p,
        );
        l.lerpVectors(s.position, c, 0.6);
        l.y -= 150;
      },
    };
  }
  // 6: track along a Venator's flank at 200 m while its turrets fire
  _flankTrack(i) {
    const s = this._heroVenator(i + 2);
    const L = s.model.length;
    const half = s.model.bounds.half || [L * 0.24, L * 0.1, L * 0.5];
    const side = this._targetSide(s);
    const st = this._state(s);
    const x = side * (half[0] + 210); // ~200 m outboard of the hull's widest point
    return {
      name: "flank track " + s.id,
      duration: 7,
      roll: 0.03 * side,
      at: (t, p, l) => {
        // from abeam the stern quarter to abeam the forward hull, just above deck level, looking in
        // and forward so the flank slides past with its turrets in the near half of the frame and the
        // bow, then the enemy it is firing at, in the far half
        const e = glide(t);
        const z = L * 0.42 - e * L * 0.72;
        p.set(x, 110, z).applyMatrix4(s.matrix);
        l.set(side * half[0] * 0.25, 30, z - 320).applyMatrix4(s.matrix);
        if (st && st.target) l.lerp(st.target.ship.position, 0.1);
      },
    };
  }
  // 7: the melee from below, Coruscant filling the bottom of the frame, the keel of the lowest melee
  // ship crossing the top corner as foreground
  _meleeBelow() {
    const c = this._meleeCentre(new THREE.Vector3());
    const states = (this.battle.states || []).filter(
      (st) => st.role === "melee" && !st.dead && !st.dying,
    );
    let fg = null;
    for (const st of states)
      if (!fg || st.ship.position.y < fg.position.y) fg = st.ship;
    return {
      name: "melee from below",
      duration: 8,
      roll: -0.04,
      at: (t, p, l) => {
        // south-east of the melee and a little under it, dollying in and looking north-west at the
        // melee centre, pitched 10.5 degrees down: the horizon (22 degrees below level at this
        // altitude) sits a third of the way up the frame with the city grid below it, the hulls hang
        // in the upper two thirds against the stars
        const e = glide(t);
        const ang = 2.6 + e * 0.45;
        const R = 3900 - e * 800;
        p.set(c.x + Math.sin(ang) * R, c.y - 250, c.z + Math.cos(ang) * R);
        if (fg) {
          // slide toward a spot just under the foreground hull so its keel enters the top of the frame
          this._lookFrame(
            fg.position,
            c,
            -fg.model.bounds.radius * 0.9,
            fg.model.bounds.radius * 0.8,
            -fg.model.bounds.radius * 0.75,
            _a,
          );
          p.lerp(_a, 0.35 + 0.45 * e);
        }
        // the pitch is set from where the camera actually is, whatever the slide did to its distance
        const dist = Math.hypot(c.x - p.x, c.z - p.z);
        l.set(c.x, p.y - dist * 0.185, c.z); // tan(10.5 deg)
      },
    };
  }
  // 8: the ship that is dying right now (else the freshest wreck, else the most damaged), low orbit
  _dying(i) {
    const st = this.battle.mostDramatic ? this.battle.mostDramatic() : null;
    const s = st ? st.ship : this._pick(this._ships(), i) || this._any();
    const r = s.model.bounds.radius;
    const label =
      st && st.dying ? "dying" : st && st.dead ? "wreck" : "burning";
    return {
      name: `${label} ${s.model.id} ${s.id}`,
      duration: 8,
      roll: 0.06,
      at: (t, p, l) => {
        const e = glide(t);
        const ang = 0.9 + e * 0.7;
        const R = r * (1.9 - 0.25 * e);
        const el = -0.12 + e * 0.3;
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
      this._any();
    const L = s.model.length;
    const half = s.model.bounds.half || [L * 0.11, L * 0.22, L * 0.5];
    const side = this._sunSide(s);
    // the ventral fin hangs from the belly of the stern half (y -66..-184, z 258..518 on the
    // 1088 m model): the camera slides forward just outboard of its blade and below its tip
    const x = side * Math.max(half[0] * 0.8, 95);
    const y = -half[1] * 1.1 - 20;
    return {
      name: "under the fin " + s.id,
      duration: 6,
      roll: 0.05 * side,
      at: (t, p, l) => {
        // from behind the stern, below the fin tip, sliding forward beneath the blade and looking up
        // along the keel so the fin crosses the top of the frame and the battle beyond the bow fills
        // the lower half
        const e = glide(t);
        _a.set(x, y, L * 0.62).applyMatrix4(s.matrix);
        _b.set(x * 0.9, y + 20, L * 0.05).applyMatrix4(s.matrix);
        p.lerpVectors(_a, _b, e);
        l.set(
          -side * 40,
          -half[1] * 0.25,
          L * 0.62 - e * L * 0.57 - 700,
        ).applyMatrix4(s.matrix);
      },
    };
  }
  // 10: wide from over the Republic line, a line ship's towers in the foreground, looking across it
  // at the enemy
  _highWide(i) {
    const g = this.battle.groups ? this.battle.groups.repLine : null;
    const c = this._meleeCentre(new THREE.Vector3());
    const list = this._ships("republic", "venator").filter((s) => {
      const st = this._state(s);
      return !st || st.role === "line";
    });
    const s = list.length ? list[(i + 1) % list.length] : null;
    const base = s
      ? s.position.clone()
      : g
        ? g.pos.clone()
        : new THREE.Vector3(0, 0, -3700);
    const L = s ? s.model.length : 1137;
    const side = i % 2 ? -1 : 1;
    return {
      name: "high over the Republic line",
      duration: 8,
      roll: -0.02 * side,
      at: (t, p, l) => {
        // above and behind the ship's stern, drifting across it: its towers and deck sit in the
        // bottom of the frame, the lines and the melee beyond
        const e = glide(t);
        this._lookFrame(
          base,
          c,
          -L * 0.75,
          side * L * (0.35 - 0.5 * e),
          L * 0.62,
          p,
        );
        l.set(c.x - 400 + e * 300, c.y - 500, c.z + 1200);
        l.lerp(base, 0.25);
      },
    };
  }
  // 11 (insert): impact close-up on the hull most enemies are shooting at
  _impactInsert(i) {
    const st = this._mostTargeted();
    const s = st ? st.ship : this._any();
    const L = s.model.length;
    const half = s.model.bounds.half || [L * 0.11, L * 0.05, L * 0.5];
    // camera on the side the fire comes from: hits flash on this face, misses burst beyond it
    _a.set(1, 0, 0).applyQuaternion(s.quaternion);
    const side = st ? Math.sign(this._attackDir(st, _b).dot(_a)) || 1 : 1;
    const z = L * (((i * 37) % 60) / 100 - 0.3);
    const x = side * Math.max(half[0] * 2.4, L * 0.32);
    return {
      name: "impacts on " + s.model.id + " " + s.id,
      duration: 2.5,
      roll: 0.05 * side,
      at: (t, p, l) => {
        p.set(x, half[1] * 1.6 + 40, z + 80 - t * 110).applyMatrix4(s.matrix);
        l.set(0, 0, z - 40 - t * 60).applyMatrix4(s.matrix);
      },
    };
  }
  // 12 (insert): a fighter crossing the frame, the battle beyond it
  _fighterCross(i) {
    const c = this._meleeCentre(new THREE.Vector3());
    const list = this.fighters.all.filter(
      (f) => f.alive !== false && f.speed > 180 && f.pos.distanceTo(c) < 7000,
    );
    const f = list.length ? list[(i * 13) % list.length] : null;
    if (!f) return this._flakInsert(i);
    // the point the fighter reaches in ~1.2 s; the camera sits beside its path on the side away from
    // the melee, so it crosses the frame with the battle behind it
    const P = new THREE.Vector3()
      .copy(f.pos)
      .addScaledVector(f.vel, f.speed * 1.2);
    const across = new THREE.Vector3().crossVectors(f.vel, UP).normalize();
    if (across.lengthSq() < 0.5) across.set(1, 0, 0);
    const toMelee = new THREE.Vector3().subVectors(c, P);
    const side = across.dot(toMelee) > 0 ? -1 : 1;
    const cam = P.clone()
      .addScaledVector(across, side * 150)
      .addScaledVector(UP, 28);
    return {
      name: "fighter crossing",
      duration: 2.5,
      roll: -0.03 * side,
      at: (t, p, l) => {
        if (f.alive === false) return false;
        p.copy(cam);
        l.copy(P).addScaledVector(toMelee, 0.05);
        return true;
      },
    };
  }
  // 13 (insert): flak bursting around a hull under fire, seen from beyond it (the misses fly past the
  // hull and burst around the camera)
  _flakInsert(i) {
    const st = this._mostTargeted();
    const s = st ? st.ship : this._any();
    const r = s.model.bounds.radius;
    const from = st
      ? this._attackDir(st, new THREE.Vector3())
      : new THREE.Vector3(0, 0, -1);
    const across = new THREE.Vector3().crossVectors(from, UP).normalize();
    if (across.lengthSq() < 0.5) across.set(1, 0, 0);
    const side = i % 2 ? 1 : -1;
    const cam = s.position
      .clone()
      .addScaledVector(from, -r * 1.35)
      .addScaledVector(across, side * r * 0.7)
      .addScaledVector(UP, r * 0.3);
    return {
      name: "flak around " + s.model.id + " " + s.id,
      duration: 2.5,
      roll: 0.04 * side,
      at: (t, p, l) => {
        p.copy(cam).addScaledVector(across, side * t * 90);
        l.copy(s.position).addScaledVector(from, r * 0.4);
      },
    };
  }

  _build(index) {
    const seq = [
      () => this._heroPass(this.take),
      () => this._broadside(),
      () => this._towers(this.take),
      () => this._chase(this.take),
      () => this._lowPlanet(this.take),
      () => this._wideFleet(this.take),
      () => this._flankTrack(this.take),
      () => this._meleeBelow(),
      () => this._dying(this.take),
      () => this._finPass(this.take),
      () => this._highWide(this.take),
      () => this._impactInsert(this.take),
      () => this._fighterCross(this.take),
      () => this._flakInsert(this.take),
    ];
    return seq[index % seq.length]();
  }
  _play(index) {
    this.index = index;
    this.shot = this._build(index);
    this.take++;
    this.time = 0;
    this.smooth = 0; // fresh shot: cut, no smoothing
    this.smoothK = this.shot.smoothK || 6;
    this.roll = this.shot.roll || 0;
  }
  _next() {
    this.cursor = (this.cursor + 1) % ORDER.length;
    this._play(ORDER[this.cursor]);
  }

  // start the cycle (continuing from the last shot), or a given shot by index
  start(index = null) {
    this.enabled = true;
    if (index !== null) {
      const k = ORDER.indexOf(index % SHOTS);
      if (k >= 0) this.cursor = k;
      this._play(index % SHOTS);
    } else this._next();
  }
  stop() {
    this.enabled = false;
  }
  get shotName() {
    return this.shot ? this.shot.name : "";
  }
  get shotCount() {
    return SHOTS;
  }

  // keep the camera outside every hull: a small sphere around each ship centre, then the ship's
  // oriented bounding box inflated 12 % (pushed out through the nearest face)
  _clear(p) {
    for (const s of this.battle.fleet.ships) {
      if (!s.alive) continue;
      const b = s.model.bounds;
      _d.subVectors(p, s.position);
      const d2 = _d.lengthSq();
      if (d2 > b.radius * b.radius * 2) continue; // well clear of this hull (box corners included)
      const rMin = b.radius * 0.42;
      if (d2 < rMin * rMin) {
        const d = Math.sqrt(d2);
        if (d < 1e-3) _d.set(0, 1, 0);
        else _d.divideScalar(d);
        p.addScaledVector(_d, rMin - d);
        this.pushes++;
      }
      if (!b.half || !s.containsPoint(p, OBB_MARGIN)) continue;
      _m.copy(s.matrix).invert();
      _l.copy(p).applyMatrix4(_m);
      let axis = 0;
      let pen = Infinity;
      for (let k = 0; k < 3; k++) {
        const q =
          b.half[k] * OBB_MARGIN - Math.abs(_l.getComponent(k) - b.centre[k]);
        if (q < pen) {
          pen = q;
          axis = k;
        }
      }
      const c = b.centre[axis];
      const sign = _l.getComponent(axis) >= c ? 1 : -1;
      _l.setComponent(axis, c + sign * (b.half[axis] * OBB_MARGIN + 2));
      p.copy(_l).applyMatrix4(s.matrix);
      this.pushes++;
    }
  }

  update(dt) {
    if (!this.enabled) return;
    if (!this.shot) this._next();
    this.time += dt;
    const t = Math.min(1, this.time / this.shot.duration);
    // a shot may end itself early (its subject is gone) by returning false: cut to the next one
    if (this.shot.at(t, this.pos, this.look) === false) {
      this.cuts++;
      this._next();
      return;
    }
    this._clear(this.pos);
    if (this.smooth === 0) {
      this.camera.position.copy(this.pos);
      _look.copy(this.look);
    } else {
      const k = 1 - Math.exp(-this.smoothK * dt);
      this.camera.position.lerp(this.pos, k);
      _look.lerp(this.look, k);
      this._clear(this.camera.position);
    }
    this.smooth = 1;
    this.camera.up.copy(UP);
    this.camera.lookAt(_look);
    if (this.roll) this.camera.rotateZ(this.roll);
    // a shot that follows a subject cuts as soon as the subject leaves the frame
    if (dt > 0 && this.shot.subject && this.time > 0.25) {
      this.camera.updateMatrixWorld(true);
      const sp = this.shot.subject(_s);
      if (sp) {
        sp.project(this.camera);
        if (sp.z > 1 || Math.abs(sp.x) > 0.96 || Math.abs(sp.y) > 0.96) {
          this.cuts++;
          this._next();
          return;
        }
      }
    }
    if (t >= 1) this._next();
  }
}
