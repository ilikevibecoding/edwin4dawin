import * as THREE from 'three';
import { bus, EVT } from '../core/events.js';
import { roomAt, floorForY } from '../map/layout.js';

// ---------------------------------------------------------------------------
// Shared senses for every hostile.  (owner: opus3)
//
// VISION
//   A horizontal view cone (110 deg relaxed, narrowed to 92 deg once alert,
//   because an alert guard is looking hard at one place rather than scanning),
//   a range that moves with the light level of the room and with what the
//   player is doing, and a strict line-of-sight test. The LOS test delegates to
//   `CollisionWorld.lineOfSight`, so:
//     * walls, closed doors and floor slabs block  (blocksSight === true)
//     * glass does not                             (panes are blocksSight:false,
//       and breaking one changes nothing, which is the intended behaviour)
//     * deployed smoke blocks via EffectsSystem.blocksLineOfSight
//   There is no path through this file that reports a visible player without a
//   clear ray, so AI can never see through walls.
//
// GRADUAL DETECTION
//   Every hostile carries an awareness meter in 0..1.25. It fills from
//   distance, angle off the view centre, the player's movement and stance, and
//   the local light level; it drains when the player is out of sight. Three
//   thresholds matter: SUSPICIOUS (0.35) stops a patrol, ALERTED (0.7) sends
//   the guard to look, CONFIRMED (1.0) is a positive identification. Nothing
//   snaps straight to combat.
//
// HEARING
//   Subscribes once to the noise contract Opus 2 broadcasts ('world:noise'
//   with { position, loudness, radius, kind }) plus EVT.PLAYER_FOOTSTEP,
//   EVT.DOOR_STATE and EVT.GLASS_BREAK. Loudness attenuates with distance and
//   is muffled when a wall sits between source and listener; the investigation
//   point it produces carries positional uncertainty that grows with distance
//   and with how muffled the sound was, so guards converge on the area rather
//   than teleporting their attention onto the player.
//
// DETERMINISM: no wall-clock time and no Math.random. Positional uncertainty
// is drawn from the *listener's* seeded stream, passed in by the caller.
// ---------------------------------------------------------------------------

export const AWARENESS = {
  SUSPICIOUS: 0.35,
  ALERTED: 0.7,
  CONFIRMED: 1.0,
  MAX: 1.25,
};

export const FOV_RELAXED = 110 * Math.PI / 180;
export const FOV_ALERT = 92 * Math.PI / 180;

/** Awareness gained per second at point-blank, centre of view, good light. */
const FILL_BASE = 2.35;
const DECAY_CALM = 0.30;
const DECAY_ALERT = 0.16;
/** Anything closer than this is noticed regardless of the cone. */
const PERIPHERAL_RANGE = 2.4;
const HEAR_FLOOR = 0.055;
const NOISE_TTL = 0.75;
const NOISE_CAP = 64;

/** Rough light level per lighting zone; refined by fixture density below. */
const ZONE_LIGHT = {
  exterior: 0.86,
  office: 1.0,
  executive: 0.94,
  service: 0.74,
  server: 0.56,
};

export class Perception {
  constructor(game) {
    this.game = game;
    this.time = 0;
    /** @type {Array<{seq:number, position:THREE.Vector3, loudness:number, radius:number, kind:string, source:string, time:number}>} */
    this.noises = [];
    this._seq = 0;
    this._roomLight = null;
    this._player = {
      alive: false, crouched: false, speed: 0, light: 1,
      pos: new THREE.Vector3(), eye: new THREE.Vector3(),
      chest: new THREE.Vector3(), knee: new THREE.Vector3(),
      room: null, floor: 'ground', stamp: -1,
    };
    this._offs = [];
    this.attach();
  }

  // ------------------------------------------------------------ event wiring

  attach() {
    if (this._offs.length) return this;
    const push = (payload, kind, loudness, radius) => {
      const pos = toVec3(payload?.position);
      if (!pos) return;
      this._push(pos, loudness, radius, kind, payload?.source || 'world');
    };
    this._offs = [
      // Opus 2's contract: every gunshot, detonation and melee hit.
      bus.on('world:noise', (p) => {
        const pos = toVec3(p?.position);
        if (!pos) return;
        this._push(pos, num(p?.loudness, 1), num(p?.radius, 26), p?.kind || 'noise',
          p?.source || 'world', p?.sourceId ?? null);
      }),
      bus.on(EVT.PLAYER_FOOTSTEP, (p) => {
        const pos = toVec3(p?.position);
        if (!pos) return;
        // Footfalls are quiet and short-ranged; crouch-walking is near silent.
        const loud = num(p?.loudness, 0.5);
        this._push(pos, loud * 0.55, 3.2 + loud * 7.5, 'footstep', 'player');
      }),
      bus.on(EVT.DOOR_STATE, (p) => {
        const st = String(p?.state || '');
        if (st !== 'opening' && st !== 'closing' && st !== 'damaged') return;
        const spec = p?.door?.spec;
        if (!spec) return;
        this._push(
          new THREE.Vector3(spec.x, spec.y + 1, spec.z),
          st === 'damaged' ? 1.1 : 0.34, st === 'damaged' ? 30 : 9,
          'door', p?.byPlayer ? 'player' : 'world'
        );
      }),
      bus.on(EVT.GLASS_BREAK, (p) => push(p, 'glass', 0.95, 28)),
    ];
    return this;
  }

  detach() {
    for (const off of this._offs) off?.();
    this._offs.length = 0;
    return this;
  }

  reset() {
    this.time = 0;
    this.noises.length = 0;
    this._seq = 0;
    this._player.stamp = -1;
    return this;
  }

  _push(position, loudness, radius, kind, source, sourceId = null) {
    this.noises.push({
      seq: ++this._seq,
      position: position.clone(),
      loudness: Math.max(0, loudness),
      radius: Math.max(0.5, radius),
      kind, source, sourceId, time: this.time,
    });
    if (this.noises.length > NOISE_CAP) this.noises.splice(0, this.noises.length - NOISE_CAP);
  }

  /** Called once per fixed step, before any agent senses. */
  update(dt) {
    this.time += dt;
    const cutoff = this.time - NOISE_TTL;
    while (this.noises.length && this.noises[0].time < cutoff) this.noises.shift();
    this._player.stamp = -1; // force one refresh per step
    return this;
  }

  // ------------------------------------------------------------------ player

  /** Cached player facts, recomputed at most once per fixed step. */
  playerState() {
    const p = this._player;
    if (p.stamp === this.time) return p;
    p.stamp = this.time;
    const player = this.game.player;
    if (!player) {
      p.alive = false;
      return p;
    }
    p.alive = player.alive !== false;
    p.crouched = (player.crouchBlend ?? 0) > 0.5;
    p.speed = player.speed || 0;
    p.pos.copy(player.position);
    const eyeH = player.currentEye ?? (p.crouched ? 1.02 : 1.62);
    p.eye.set(p.pos.x, p.pos.y + eyeH, p.pos.z);
    p.chest.set(p.pos.x, p.pos.y + eyeH * 0.72, p.pos.z);
    p.knee.set(p.pos.x, p.pos.y + 0.42, p.pos.z);
    p.floor = floorForY(p.pos.y);
    p.room = roomAt(p.pos.x, p.pos.z, p.floor) || null;
    p.light = this.lightFactorAt(p.pos, p.room);
    return p;
  }

  // ---------------------------------------------------------------- lighting

  /**
   * 0.4 (pitch dark) .. 1.2 (brightly lit) for a world point. Derived from the
   * room's lighting zone and refined by the fixture density LightingRig
   * actually placed in that room, so the server room really is the hardest
   * place to be spotted.
   */
  lightFactorAt(pos, roomHint = undefined) {
    const room = roomHint !== undefined
      ? roomHint
      : roomAt(pos.x, pos.z, floorForY(pos.y));
    if (!room) return 0.8;
    if (!this._roomLight) this._buildRoomLight();
    const cached = this._roomLight.get(room.id);
    if (cached !== undefined) return cached;
    return ZONE_LIGHT[room.zone] ?? 0.9;
  }

  /**
   * One pass over LightingRig's fixture list, aggregated per room. Rooms with
   * no fixture are simply absent from the map and fall back to their zone.
   */
  _buildRoomLight() {
    this._roomLight = new Map();
    const specs = this.game.lighting?.specs;
    if (!Array.isArray(specs)) return this._roomLight;
    const perRoom = new Map();
    for (const s of specs) {
      if (!s?.room) continue;
      const lit = num(s.intensity, 0) * Math.max(0.5, num(s.distance, 6)) * 0.06;
      perRoom.set(s.room, (perRoom.get(s.room) || 0) + lit);
    }
    for (const [id, sum] of perRoom) {
      // Normalised against a typical fully-lit office bay.
      this._roomLight.set(id, +(0.52 + Math.min(0.68, sum / 5.5)).toFixed(3));
    }
    return this._roomLight;
  }

  // ------------------------------------------------------------------ vision

  /** Effective sight range for an agent against the player right now. */
  visionRange(agent, ps = this.playerState()) {
    let range = agent.viewRange ?? 24;
    range *= 0.55 + 0.55 * ps.light;
    if (ps.crouched) range *= 0.84;
    if (ps.speed > 3.2) range *= 1.12;
    else if (ps.speed < 0.3) range *= 0.92;
    if ((agent.alert ?? 0) > 0.5) range *= 1.14;
    return Math.max(4, Math.min(range, 70));
  }

  halfFov(agent) {
    return ((agent.alert ?? 0) > 0.5 ? FOV_ALERT : FOV_RELAXED) * 0.5;
  }

  /**
   * True when `to` is visible from `from`: a clear collision ray AND not
   * occluded by deployed smoke. Glass is transparent to this test because the
   * panes are authored with blocksSight:false.
   */
  hasLineOfSight(from, to) {
    const collision = this.game.collision;
    if (!collision?.lineOfSight) return false;
    if (!collision.lineOfSight(from, to)) return false;
    if (this.game.effects?.blocksLineOfSight?.(from, to)) return false;
    return true;
  }

  /**
   * Run vision for one agent and integrate its awareness meter.
   * Mutates `agent.awareness`, and returns a report the state machine reads.
   * @param {object} agent needs { eye:Vector3, yaw, alert, awareness, detection, viewRange }
   */
  sense(agent, dt) {
    const out = agent._senseOut || (agent._senseOut = {
      visible: false, distance: Infinity, angle: Math.PI, awareness: 0,
      point: new THREE.Vector3(), light: 1, blockedBySmoke: false,
    });
    out.visible = false;
    out.blockedBySmoke = false;

    // A guard that just heard something stands and listens: the meter holds
    // instead of draining. Footfalls arrive every ~0.4 s and each one is worth
    // less than 0.4 s of decay, so without this a walking player is inaudible
    // however long they spend in the room.
    agent._listening = (agent.hearHold ?? 0) > 0;
    if (agent._listening) agent.hearHold = Math.max(0, agent.hearHold - dt);

    const ps = this.playerState();
    if (!ps.alive) {
      agent.awareness = Math.max(0, agent.awareness - DECAY_CALM * dt);
      out.awareness = agent.awareness;
      return out;
    }

    const eye = agent.eye;
    const dx = ps.pos.x - eye.x;
    const dz = ps.pos.z - eye.z;
    const flat = Math.hypot(dx, dz);
    const dist = Math.hypot(flat, ps.chest.y - eye.y);
    out.distance = dist;
    out.light = ps.light;

    const range = this.visionRange(agent, ps);
    if (dist > range) return this._decay(agent, out, dt);

    // Angle from the centre of view. Yaw 0 looks down -Z, matching the player.
    const fx = -Math.sin(agent.yaw);
    const fz = -Math.cos(agent.yaw);
    const inv = flat > 1e-5 ? 1 / flat : 0;
    const cos = (dx * inv) * fx + (dz * inv) * fz;
    const angle = Math.acos(Math.max(-1, Math.min(1, cos)));
    out.angle = angle;
    const half = this.halfFov(agent);
    if (angle > half && dist > PERIPHERAL_RANGE) return this._decay(agent, out, dt);

    // Three samples so partial cover reads as partial visibility.
    let seen = null;
    for (const target of [ps.chest, ps.eye, ps.knee]) {
      if (this.hasLineOfSight(eye, target)) { seen = target; break; }
    }
    if (!seen) {
      // Distinguish smoke from geometry so combat can keep suppressing.
      out.blockedBySmoke = !!this.game.effects?.blocksLineOfSight?.(eye, ps.chest);
      return this._decay(agent, out, dt);
    }

    const distFactor = 1 - Math.pow(Math.min(1, dist / range), 0.85);
    const angleFactor = angle <= half ? 1 - (angle / half) * 0.7 : 0.45;
    const moveFactor = ps.crouched
      ? (ps.speed > 0.4 ? 0.72 : 0.52)
      : (ps.speed > 3.2 ? 1.4 : ps.speed > 0.4 ? 1.05 : 0.78);
    const rate = FILL_BASE * (agent.detection ?? 1)
      * Math.max(0.08, distFactor) * angleFactor * moveFactor
      * (0.55 + 0.5 * ps.light);

    agent.awareness = Math.min(AWARENESS.MAX, agent.awareness + rate * dt);
    out.visible = true;
    out.awareness = agent.awareness;
    out.point.copy(ps.pos);
    return out;
  }

  _decay(agent, out, dt) {
    if (agent._listening) {
      out.awareness = agent.awareness;
      return out;
    }
    const rate = (agent.alert ?? 0) > 0.5 ? DECAY_ALERT : DECAY_CALM;
    agent.awareness = Math.max(0, agent.awareness - rate * dt);
    out.awareness = agent.awareness;
    return out;
  }

  // ----------------------------------------------------------------- hearing

  /**
   * Everything an agent can hear since it last asked, minus anything the agent
   * made itself.
   * @param {object} agent needs { id, ear:Vector3, lastNoiseSeq, hearing, rng }
   * @returns {Array<{seq:number, position:THREE.Vector3, level:number, uncertainty:number, kind:string, source:string, sourceId:?string, distance:number, muffled:boolean}>}
   */
  pollNoises(agent) {
    const out = [];
    const since = agent.lastNoiseSeq || 0;
    if (this._seq === since) return out;
    const ear = agent.ear;
    const gain = agent.hearing ?? 1;
    for (const n of this.noises) {
      if (n.seq <= since) continue;
      // Nobody is startled by their own weapon. Dropping self-made noise here
      // rather than in each behaviour means every listener gets it right,
      // including ones added later.
      if (n.sourceId && n.sourceId === agent.id) continue;
      const dist = ear.distanceTo(n.position);
      if (dist > n.radius) continue;
      let level = n.loudness * (1 - dist / n.radius) * gain;
      const clear = this.game.collision?.lineOfSight?.(n.position, ear) ?? true;
      // A wall does not stop sound, it muffles it and smears its direction.
      if (!clear) level *= 0.42;
      if (level < HEAR_FLOOR) continue;
      const spread = Math.min(5.0, Math.max(0.25, dist * (clear ? 0.07 : 0.19)));
      const point = n.position.clone();
      if (agent.rng) {
        const a = agent.rng.float() * Math.PI * 2;
        const r = spread * Math.sqrt(agent.rng.float());
        point.x += Math.cos(a) * r;
        point.z += Math.sin(a) * r;
      }
      out.push({
        seq: n.seq,
        position: point, level, uncertainty: spread, kind: n.kind,
        source: n.source, sourceId: n.sourceId, distance: dist, muffled: !clear,
        origin: n.position,
      });
    }
    agent.lastNoiseSeq = this._seq;
    // Loudest first: a gunshot always outranks a footstep.
    out.sort((a, b) => b.level - a.level);
    return out;
  }

  toJSON() {
    return {
      noises: this.noises.length,
      seq: this._seq,
      fovRelaxedDegrees: 110,
      fovAlertDegrees: 92,
      thresholds: { ...AWARENESS },
    };
  }
}

// ------------------------------------------------------------------ helpers --

function toVec3(v) {
  if (!v) return null;
  if (v.isVector3) return v.clone();
  if (Array.isArray(v)) return new THREE.Vector3(v[0] || 0, v[1] || 0, v[2] || 0);
  if (typeof v === 'object' && typeof v.x === 'number') return new THREE.Vector3(v.x, v.y || 0, v.z || 0);
  return null;
}

function num(v, fallback) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export default Perception;
