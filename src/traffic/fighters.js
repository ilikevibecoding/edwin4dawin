// Fighter traffic: procedural TIE fighters (instanced, 4 draw calls for the whole wing), rack
// parking in the hangar, scripted launch / patrol / return flight paths through the ventral bay, a
// scheduler that keeps a patrol aloft, bay-door state for the hangar to animate, audio events, and
// the pilot / network hooks (PilotHook, snapshot / applySnapshot) for future NPC and multiplayer work.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { HANGAR } from "../exterior/dims.js";

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);
const _zero = new THREE.Vector3(0.001, 0.001, 0.001);
const _gs = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _xAxis = new THREE.Vector3(1, 0, 0);
const _look = new THREE.Matrix4();
const smoothstep = (a, b, x) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
// inside the bay the craft keeps its nose within this pitch of level (a fighter tipped 90° into the
// drop read as a flat dish from the entry; the degenerate vertical look-at also rolled it at random);
// below the throat the limit opens up to full tangent alignment by the time it clears the exit point
const BAY_PITCH = THREE.MathUtils.degToRad(30);
const LAUNCH_GAP = 3; // seconds between launches leaving the racks (two TIEs 18 m apart otherwise overlap)

/** TIE/ln geometry split by material: hull (ball, pylons, frames), panels, glass, engine glow. */
export function tieGeometries() {
  const hull = [];
  const panel = [];
  const glass = [];
  const glow = [];
  const add = (arr, g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    g.rotateX(rx);
    g.rotateY(ry);
    g.rotateZ(rz);
    g.translate(x, y, z);
    arr.push(g.index ? g.toNonIndexed() : g);
  };
  const R = 1.9;
  // cockpit ball + rear hatch bulge
  add(hull, new THREE.SphereGeometry(R, 20, 14));
  add(hull, new THREE.CylinderGeometry(R * 0.55, R * 0.7, 0.9, 16), 0, 0, R * 0.75, Math.PI / 2);
  // forward viewport: dark disc + rim + 8 spokes
  add(glass, new THREE.CircleGeometry(R * 0.62, 24), 0, 0, -R * 0.82);
  add(hull, new THREE.TorusGeometry(R * 0.62, 0.09, 8, 28), 0, 0, -R * 0.82);
  for (let k = 0; k < 8; k++) {
    add(hull, new THREE.BoxGeometry(0.07, R * 1.24, 0.08), 0, 0, -R * 0.84, 0, 0, (k / 8) * Math.PI);
  }
  // pylons to the wings
  for (const s of [-1, 1]) {
    add(hull, new THREE.CylinderGeometry(0.62, 0.72, 1.7, 12), s * (R + 0.75), 0, 0, 0, 0, Math.PI / 2);
    add(hull, new THREE.CylinderGeometry(0.9, 0.9, 0.35, 12), s * (R + 1.55), 0, 0, 0, 0, Math.PI / 2);
    // wing: hexagonal panel (tall), frame + centre spar + panel cells
    const H = 7.2;
    const W = 3.9;
    const hex = new THREE.Shape([
      new THREE.Vector2(-W / 2, -H * 0.3),
      new THREE.Vector2(0, -H / 2),
      new THREE.Vector2(W / 2, -H * 0.3),
      new THREE.Vector2(W / 2, H * 0.3),
      new THREE.Vector2(0, H / 2),
      new THREE.Vector2(-W / 2, H * 0.3),
    ]);
    const pg = new THREE.ExtrudeGeometry(hex, { depth: 0.08, bevelEnabled: false });
    add(panel, pg, s * (R + 1.75), 0, 0, 0, s * (Math.PI / 2));
    // frame: thin boxes along the hex edges
    const pts = hex.getPoints();
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const len = a.distanceTo(b);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      const g = new THREE.BoxGeometry(len, 0.22, 0.22);
      g.rotateZ(ang);
      g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, 0);
      // panel local (x = fwd/back, y = up) → world: rotate about y so x → z
      g.rotateY(s * (Math.PI / 2));
      g.translate(s * (R + 1.78), 0, 0);
      hull.push(g.index ? g.toNonIndexed() : g);
    }
    // centre spar (vertical) and horizontal spar
    add(hull, new THREE.BoxGeometry(0.2, H * 0.98, 0.3), s * (R + 1.78), 0, 0);
    add(hull, new THREE.BoxGeometry(0.2, 0.3, W * 0.98), s * (R + 1.78), 0, 0);
  }
  // twin engine glows at the rear
  for (const s of [-1, 1]) add(glow, new THREE.CircleGeometry(0.42, 14), s * 0.55, -0.2, R * 0.98 + 0.42);
  const merge = (arr) => {
    const g = mergeGeometries(arr, false);
    g.computeVertexNormals();
    return g;
  };
  return { hull: merge(hull), panel: merge(panel), glass: merge(glass), glow: merge(glow) };
}

/** Default rack positions (world): two rows along the hangar's side walls, hanging from the ceiling. */
export function defaultRacks() {
  const racks = [];
  const o = HANGAR.opening;
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const z = o.z0 + 8 + i * ((o.z1 - o.z0 - 16) / 3);
      racks.push({ pos: new THREE.Vector3(s * 30, HANGAR.interiorCeilingY - 7.5, z), yaw: 0 });
    }
  }
  return racks;
}

export class PilotHook {
  /** Override in future NPC / multiplayer work. Return "launch" | "land" | null each tick. */
  decide(fighter, dt, traffic) {
    void fighter;
    void dt;
    void traffic;
    return null;
  }
  onState(fighter, state) {
    void fighter;
    void state;
  }
  /**
   * Optional flight override while on patrol: return { position, quaternion } (world) to take control
   * of the craft for this tick, or null to keep the scripted patrol loop.
   */
  steer(fighter, dt, traffic) {
    void fighter;
    void dt;
    void traffic;
    return null;
  }
}

class Fighter {
  constructor(id, rack) {
    this.id = id;
    this.rack = rack;
    this.state = "parked"; // parked | launching | patrol | returning | landing
    this.position = rack.pos.clone();
    this.quaternion = new THREE.Quaternion();
    this.velocity = new THREE.Vector3();
    this.t = 0;
    this.path = null;
    this.pathTime = 0;
    this.phase = 0; // patrol loop parameter
    this.pilot = null;
    this.stateTime = 0;
    this.yaw = rack.yaw || 0; // heading held through the vertical parts of the bay paths
    this.glow = 0; // engine glow scale 0..1 (ramps up after unclamping, down before the rack)
  }
}

export function createTraffic({ scene, materials, audio, count = 8, racks = null }) {
  const group = new THREE.Group();
  group.name = "traffic";
  scene.add(group);
  const geos = tieGeometries();
  const meshes = {
    hull: new THREE.InstancedMesh(geos.hull, materials.tieHull, count),
    panel: new THREE.InstancedMesh(geos.panel, materials.tiePanel, count),
    glass: new THREE.InstancedMesh(geos.glass, materials.tieGlass, count),
    glow: new THREE.InstancedMesh(geos.glow, materials.emitRed, count),
  };
  for (const m of Object.values(meshes)) {
    // the sun's shadow map is cached (static ship); moving craft must not bake into it
    m.castShadow = false;
    m.receiveShadow = true;
    m.frustumCulled = false;
    group.add(m);
  }
  const rackList = racks || defaultRacks();
  const fighters = [];
  for (let i = 0; i < count; i++) fighters.push(new Fighter(i, rackList[i % rackList.length]));

  // --- patrol loop: a large closed curve around the ship
  const loopPts = [
    [-900, -180, 400],
    [-1400, -60, -300],
    [-700, 220, -1300],
    [500, 320, -1500],
    [1300, 60, -600],
    [1100, -160, 500],
    [300, -320, 900],
    [-400, -300, 900],
  ].map((p) => new THREE.Vector3(...p));
  const loop = new THREE.CatmullRomCurve3(loopPts, true, "centripetal");
  const LOOP_SPEED = 260; // m/s along the loop
  const loopLength = loop.getLength();

  // bay door: the ship is at flight ops, so the bay starts open and stays open while anything is
  // pending or recent; the leaves close only after IDLE_CLOSE s with nothing moving — longer than the
  // scheduler's 18 s cycle, so with the patrol rotation running the doors never shut (and from space
  // the lit bay is the mouth's normal state, not a closed hatch), while an NPC squadron running with
  // the scheduler off still sees them close. `clock` is the traffic system's own running time (the
  // update's `t` restarts in harness stepping); `nextLaunchAt` on that clock spaces the launches so
  // pending TIEs leave their racks one at a time, LAUNCH_GAP apart
  const IDLE_CLOSE = 30;
  const bay = { openness: 1, requested: true, idleTimer: 0, speed: 0.25, clock: 0, nextLaunchAt: 0 };
  const events = [];
  const listeners = [];
  const emit = (name, f) => {
    if (audio) audio.event(name, f.position);
    for (const fn of listeners) fn(name, f);
  };

  const below = () => new THREE.Vector3(0, HANGAR.module.bottomY - 30, (HANGAR.opening.z0 + HANGAR.opening.z1) / 2);
  const throat = (x, z) => new THREE.Vector3(THREE.MathUtils.clamp(x, -HANGAR.opening.x + 6, HANGAR.opening.x - 6), HANGAR.module.bottomY - 4, THREE.MathUtils.clamp(z, HANGAR.opening.z0 + 6, HANGAR.opening.z1 - 6));

  // Paths are two legs so the slow, visible part inside the bay (rack → lane → throat → just below
  // the hull, ~65 m) gets its own time budget instead of ~2 s of a 1.3 km arc-length curve.
  // Three legs out: a slow taxi from the rack to a hover point over the lane (10 s, all of it above the
  // deck and visible from the entry), the drop through the throat (8 s), then the run to the patrol loop.
  function launchPath(f) {
    const r = f.rack.pos;
    const t1 = throat(r.x * 0.35, r.z);
    const hover = new THREE.Vector3(t1.x, HANGAR.deckY + 9, t1.z);
    const exit = new THREE.Vector3(t1.x, HANGAR.module.bottomY - 30, t1.z + 10);
    const taxi = new THREE.CatmullRomCurve3([r.clone(), new THREE.Vector3(r.x * 0.7, HANGAR.deckY + 14, r.z + 2), new THREE.Vector3(r.x * 0.35, HANGAR.deckY + 10, r.z + 1), hover], false, "centripetal");
    const drop = new THREE.CatmullRomCurve3([hover, new THREE.Vector3(t1.x, HANGAR.deckY + 1, t1.z), t1, exit], false, "centripetal");
    const outside = new THREE.CatmullRomCurve3([exit, new THREE.Vector3(t1.x * 3, HANGAR.module.bottomY - 120, t1.z + 160), new THREE.Vector3(t1.x * 6 - 200, -220, 450), loop.getPoint(0)], false, "centripetal");
    return { legs: [{ curve: taxi, duration: 10, ease: "in" }, { curve: drop, duration: 8, ease: "in" }, { curve: outside, duration: 14, ease: "accel" }], total: 32 };
  }
  function returnPath(f) {
    const r = f.rack.pos;
    const t1 = throat(r.x * 0.35, r.z);
    const hover = new THREE.Vector3(t1.x, HANGAR.deckY + 9, t1.z);
    const entry = new THREE.Vector3(t1.x, HANGAR.module.bottomY - 30, t1.z + 10);
    const outside = new THREE.CatmullRomCurve3([f.position.clone(), new THREE.Vector3(f.position.x * 0.5, -260, 700), new THREE.Vector3(t1.x * 3, -140, 260), entry], false, "centripetal");
    const rise = new THREE.CatmullRomCurve3([entry, t1, new THREE.Vector3(t1.x, HANGAR.deckY + 1, t1.z), hover], false, "centripetal");
    const taxi = new THREE.CatmullRomCurve3([hover, new THREE.Vector3(r.x * 0.35, HANGAR.deckY + 10, r.z + 1), new THREE.Vector3(r.x * 0.7, HANGAR.deckY + 14, r.z + 2), r.clone()], false, "centripetal");
    return { legs: [{ curve: outside, duration: 16, ease: "decel" }, { curve: rise, duration: 8, ease: "out" }, { curve: taxi, duration: 10, ease: "out" }], total: 34 };
  }
  /**
   * Flight attitude from the path tangent (nose = -z). The heading comes from the tangent's horizontal
   * part and is held when that part is negligible (vertical travel), so the craft never spins; the
   * pitch is clamped to BAY_PITCH inside the bay and eases out to the full tangent below the throat.
   */
  function attitude(f, p, tan, out) {
    const hx = tan.x;
    const hz = tan.z;
    const hlen = Math.hypot(hx, hz);
    if (hlen > 0.12) f.yaw = Math.atan2(-hx, -hz);
    const throatY = HANGAR.module.bottomY - 4;
    const exitY = HANGAR.module.bottomY - 30;
    const open = smoothstep(throatY, exitY, p.y); // 0 above the throat … 1 at the exit point
    const maxPitch = BAY_PITCH + (Math.PI / 2 - BAY_PITCH) * open;
    const pitch = THREE.MathUtils.clamp(Math.atan2(tan.y, hlen), -maxPitch, maxPitch);
    out.setFromAxisAngle(_up, f.yaw);
    _q2.setFromAxisAngle(_xAxis, pitch);
    return out.multiply(_q2);
  }
  // evaluate a multi-leg path at time t → { p, tan, done }
  function evalPath(path, t) {
    let acc = 0;
    for (let i = 0; i < path.legs.length; i++) {
      const leg = path.legs[i];
      if (t <= acc + leg.duration || i === path.legs.length - 1) {
        const u = THREE.MathUtils.clamp((t - acc) / leg.duration, 0, 1);
        let e = u;
        if (leg.ease === "in") e = u * u * (3 - 2 * u); // gentle start and stop (unclamping, descent)
        else if (leg.ease === "accel") e = u * u; // throttles up once clear of the hull
        else if (leg.ease === "decel") e = 1 - (1 - u) * (1 - u); // bleeds speed on approach
        else if (leg.ease === "out") e = u * u * (3 - 2 * u);
        return { p: leg.curve.getPointAt(e), tan: leg.curve.getTangentAt(e), done: i === path.legs.length - 1 && u >= 1 };
      }
      acc += leg.duration;
    }
    const last = path.legs[path.legs.length - 1];
    return { p: last.curve.getPointAt(1), tan: last.curve.getTangentAt(1), done: true };
  }

  function setState(f, s) {
    f.state = s;
    f.stateTime = 0;
    if (f.pilot) f.pilot.onState(f, s);
  }

  const api = {
    group,
    fighters,
    bay,
    loop,
    events,
    onEvent(fn) {
      listeners.push(fn);
    },
    setPilot(id, pilot) {
      fighters[id].pilot = pilot;
    },
    setRacks(list) {
      list.forEach((r, i) => {
        if (fighters[i]) {
          fighters[i].rack = r;
          if (fighters[i].state === "parked") fighters[i].position.copy(r.pos);
        }
      });
    },
    requestLaunch(n = 1) {
      let k = 0;
      for (const f of fighters) {
        if (k >= n) break;
        if (f.state === "parked") {
          f.pendingLaunch = true;
          k++;
        }
      }
      bay.requested = k > 0 || bay.requested;
      return k;
    },
    requestRecall(n = 1) {
      let k = 0;
      for (const f of fighters) {
        if (k >= n) break;
        if (f.state === "patrol") {
          f.pendingReturn = true;
          k++;
        }
      }
      bay.requested = k > 0 || bay.requested;
      return k;
    },
    /** Network-friendly state: timestamp, bay door, per-fighter state / time-in-state / pose / velocity. */
    snapshot() {
      return {
        t: Date.now(),
        bay: +bay.openness.toFixed(3),
        bayRequested: bay.requested ? 1 : 0,
        fighters: fighters.map((f) => ({ id: f.id, s: f.state, st: +f.stateTime.toFixed(2), p: f.position.toArray().map((v) => +v.toFixed(2)), q: f.quaternion.toArray().map((v) => +v.toFixed(4)), v: f.velocity.toArray().map((v) => +v.toFixed(2)) })),
      };
    },
    /**
     * Apply a remote snapshot. Local simulation pauses while snapshots keep arriving (remoteTimeout
     * seconds since the last one) and resumes on its own if they stop. Fires pilot.onState on changes.
     */
    applySnapshot(snap) {
      bay.openness = snap.bay;
      if (snap.bayRequested !== undefined) bay.requested = !!snap.bayRequested;
      for (const s of snap.fighters) {
        const f = fighters[s.id];
        if (!f) continue;
        if (f.state !== s.s) {
          f.state = s.s;
          f.stateTime = s.st || 0;
          if (f.pilot) f.pilot.onState(f, s.s);
        } else if (s.st !== undefined) f.stateTime = s.st;
        f.position.fromArray(s.p);
        f.quaternion.fromArray(s.q).normalize(); // rounded components drift off unit length
        if (s.v) f.velocity.fromArray(s.v);
      }
      api.remote = true;
      api.remoteAge = 0;
    },
    remoteTimeout: 2,
    counts() {
      const c = {};
      for (const f of fighters) c[f.state] = (c[f.state] || 0) + 1;
      return c;
    },
    schedulerEnabled: true,
    update(dt, t) {
      // remote authority lapses when snapshots stop arriving
      if (api.remote) {
        api.remoteAge = (api.remoteAge || 0) + dt;
        if (api.remoteAge > api.remoteTimeout) api.remote = false;
      }
      // --- scheduler: keep 3 aloft, cycle one every ~18 s
      if (api.schedulerEnabled && !api.remote) {
        api.sched = (api.sched || 0) + dt;
        const c = api.counts();
        if (api.sched > 18) {
          api.sched = 0;
          if ((c.patrol || 0) + (c.launching || 0) < 3) api.requestLaunch(1);
          else if ((c.patrol || 0) > 2) api.requestRecall(1);
        }
      }
      // pilots decide independently of the scheduler (an NPC squadron can run with it disabled)
      if (!api.remote) {
        for (const f of fighters) {
          if (!f.pilot) continue;
          const cmd = f.pilot.decide(f, dt, api);
          if (cmd === "launch" && f.state === "parked") f.pendingLaunch = true;
          if (cmd === "land" && f.state === "patrol") f.pendingReturn = true;
        }
      }
      // --- bay door
      const pending = fighters.some((f) => f.pendingLaunch || f.pendingReturn || f.state === "launching" || f.state === "returning");
      if (pending) {
        bay.requested = true;
        bay.idleTimer = 0;
      } else {
        bay.idleTimer += dt;
        if (bay.idleTimer > IDLE_CLOSE) bay.requested = false;
      }
      const prevOpen = bay.openness;
      bay.openness = THREE.MathUtils.clamp(bay.openness + (bay.requested ? 1 : -1) * dt * bay.speed, 0, 1);
      if ((prevOpen < 0.02 && bay.openness >= 0.02) || (prevOpen > 0.98 && bay.openness <= 0.98)) emit("blast_door", { position: new THREE.Vector3(0, HANGAR.deckY, 0) });

      // --- fighters
      bay.clock += dt;
      if (!api.remote) {
        for (const f of fighters) {
          f.stateTime += dt;
          if (f.state === "parked") {
            // one release per LAUNCH_GAP: every pending TIE otherwise left on the frame the door
            // passed 0.9 and two racks 18 m apart overlapped in the lane
            if (f.pendingLaunch && bay.openness > 0.9 && bay.clock >= bay.nextLaunchAt) {
              f.pendingLaunch = false;
              f.path = launchPath(f);
              f.pathTime = 0;
              f.yaw = f.rack.yaw || 0;
              bay.nextLaunchAt = bay.clock + LAUNCH_GAP;
              setState(f, "launching");
              emit("tie_launch", f);
            }
            f.position.copy(f.rack.pos);
            f.quaternion.setFromAxisAngle(_up, f.rack.yaw || 0);
            f.glow = 0;
          } else if (f.state === "launching" || f.state === "returning") {
            f.pathTime += dt;
            const { p, tan, done } = evalPath(f.path, f.pathTime);
            const u = done ? 1 : 0;
            f.velocity.copy(p).sub(f.position).divideScalar(Math.max(dt, 1e-3));
            f.position.copy(p);
            // heading from the tangent (nose = -z), pitch limited while inside the bay
            attitude(f, p, tan, _q);
            f.quaternion.slerp(_q, Math.min(1, dt * 3));
            // engines: light up over the first seconds off the rack (the discs snapped on inside
            // the rack frame), fade out over the last seconds before the clamps take it back
            f.glow = f.state === "launching" ? smoothstep(2, 6, f.pathTime) : 1 - smoothstep(f.path.total - 6, f.path.total - 2, f.pathTime);
            if (u >= 1) {
              if (f.state === "launching") {
                f.phase = 0;
                setState(f, "patrol");
              } else {
                setState(f, "parked");
                emit("tie_land", f);
              }
            }
          } else if (f.state === "patrol") {
            f.glow = 1;
            const steered = f.pilot ? f.pilot.steer(f, dt, api) : null;
            if (steered) {
              f.velocity.copy(steered.position).sub(f.position).divideScalar(Math.max(dt, 1e-3));
              f.position.copy(steered.position);
              if (steered.quaternion) f.quaternion.copy(steered.quaternion);
              if (f.pendingReturn && bay.openness > 0.9) {
                f.pendingReturn = false;
                f.path = returnPath(f);
                f.pathTime = 0;
                setState(f, "returning");
                emit("tie_flyby", f);
              }
              continue;
            }
            f.phase = (f.phase + (dt * LOOP_SPEED) / loopLength) % 1;
            const p = loop.getPointAt(f.phase);
            const tan = loop.getTangentAt(f.phase);
            // wingman offset so the patrol spreads out
            const off = new THREE.Vector3().crossVectors(tan, _up).normalize().multiplyScalar((f.id % 3) * 26 - 26);
            off.y += (f.id % 2) * 14;
            p.add(off);
            f.velocity.copy(p).sub(f.position).divideScalar(Math.max(dt, 1e-3));
            f.position.copy(p);
            _look.lookAt(new THREE.Vector3(), tan.clone().negate(), _up);
            _q.setFromRotationMatrix(_look);
            f.yaw = Math.atan2(-tan.x, -tan.z); // keeps the heading continuous into the return path
            // bank into turns
            _q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.sin(t * 0.3 + f.id) * 0.2));
            f.quaternion.slerp(_q, Math.min(1, dt * 2));
            if (f.pendingReturn && bay.openness > 0.9) {
              f.pendingReturn = false;
              f.path = returnPath(f);
              f.pathTime = 0;
              setState(f, "returning");
              emit("tie_flyby", f);
            }
          }
        }
      }
      // --- instance matrices (engine glow discs scale with f.glow: nothing while parked, ramping in
      // off the rack and out before the clamps; remote snapshots carry no glow, so derive it there)
      for (const f of fighters) {
        _m.compose(f.position, f.quaternion, _s);
        meshes.hull.setMatrixAt(f.id, _m);
        meshes.panel.setMatrixAt(f.id, _m);
        meshes.glass.setMatrixAt(f.id, _m);
        let g = f.glow;
        if (api.remote) g = f.state === "parked" ? 0 : f.state === "launching" ? smoothstep(2, 6, f.stateTime) : f.state === "returning" ? 1 - smoothstep(28, 32, f.stateTime) : 1;
        _m.compose(f.position, f.quaternion, g > 0.002 ? _gs.setScalar(g) : _zero);
        meshes.glow.setMatrixAt(f.id, _m);
      }
      for (const m of Object.values(meshes)) m.instanceMatrix.needsUpdate = true;
    },
  };
  // initial pose
  api.update(0, 0);
  return api;
}
