/**
 * The live, continuously-driven sounds: rounds going past, aircraft with a real
 * doppler shift, the ambient bed, the tension music, and the player's own body.
 *
 * Everything here is stateful across frames and therefore has to be
 * allocation-free in `update`. Held loops keep a voice reserved so the culler
 * cannot take the wind out from under the level, and one-shot schedulers work
 * from randomised countdowns rather than fixed periods so the bed never
 * develops a period the ear can find.
 */

import type { AudioCore } from '../Core';
import { DISTANCE } from '../graph/Voices';
import type { Voice } from '../graph/Voices';

const SPEED_OF_SOUND = 343;

/* ============================== bullet snap ============================== */

/**
 * A round going past.
 *
 * Extremely effective and almost free: the miss distance chooses one of three
 * baked bands, the round's velocity sets the playback rate — a faster round
 * sweeps through its doppler shift more quickly — and the side comes from the
 * geometry of the shot that produced it, so incoming fire has a direction.
 */
export class WhizbyPlayer {
  /** Side the last tracer passed on, -1 left to 1 right. */
  side = 0;

  constructor(private core: AudioCore) {}

  play(distance: number, speed: number): boolean {
    const core = this.core;
    const rng = core.rng;
    const d = Math.max(0.15, distance);
    const band = d < 1.6 ? 0 : d < 4 ? 1 : 2;
    // Falls off fast: at eight metres a round is a distant zip, not a threat.
    const volume = Math.min(1.1, 1.15 / (1 + d * 0.55));
    if (volume < 0.02) return false;
    const rate = Math.max(0.7, Math.min(1.6, speed / 830));
    const pan = Math.max(-0.95, Math.min(0.95, this.side * rng.range(0.55, 1) + rng.bi() * 0.2));
    return (
      core.emit(`whizby:${band}`, {
        bus: 'world',
        volume,
        rate,
        priority: 0.72,
        positional: false,
        pan,
        wet: 0.35,
        lowpass: 20000 - band * 3000,
      }) !== null
    );
  }
}

/* ============================== aircraft =============================== */

/**
 * A looping source that tracks a moving object and pitches itself by the real
 * doppler relation. The jet pass that sells an airstrike is not a designed
 * flyby clip — it is one continuous engine loop whose pitch falls through the
 * moment it goes overhead, exactly as the physics says it must.
 */
export class DopplerSource {
  private voice: Voice | null = null;
  private x = 0;
  private y = 0;
  private z = 0;
  private vx = 0;
  private vy = 0;
  private vz = 0;
  private level = 0;
  private target = 0;
  private clipName: string;
  private baseRate: number;
  private idleFor = 0;

  constructor(
    private core: AudioCore,
    clipName: string,
    readonly owner: string,
    baseRate = 1,
  ) {
    this.clipName = clipName;
    this.baseRate = baseRate;
  }

  get playing(): boolean {
    return this.voice !== null && this.voice.active;
  }

  /** Positions and velocities in world units; velocity drives the doppler. */
  set(x: number, y: number, z: number, vx: number, vy: number, vz: number, level = 1): void {
    this.x = x;
    this.y = y;
    this.z = z;
    this.vx = vx;
    this.vy = vy;
    this.vz = vz;
    this.target = level;
    this.idleFor = 0;
    if (!this.voice || !this.voice.active) this.start();
  }

  private start(): void {
    const core = this.core;
    const v = core.emit(this.clipName, {
      bus: 'world',
      volume: 0.0005,
      rate: this.baseRate,
      priority: 0.7,
      loop: true,
      x: this.x,
      y: this.y,
      z: this.z,
      model: DISTANCE.aircraft,
      wet: 0.8,
      attack: 0.4,
      owner: this.owner,
      noOcclusion: true,
    });
    this.voice = v;
    this.level = 0;
  }

  /** Fades out and gives the voice back. */
  stop(): void {
    if (this.voice) {
      this.voice.fadeOut(this.core.now, 0.8);
      this.voice = null;
    }
    this.level = 0;
    this.target = 0;
  }

  update(dt: number): void {
    const v = this.voice;
    if (!v || !v.active) {
      this.voice = null;
      return;
    }
    const core = this.core;
    const now = core.now;

    this.idleFor += dt;
    if (this.idleFor > 2.5) {
      // Nobody has told us where it is for a while; assume it has gone.
      this.stop();
      return;
    }

    v.setPosition(this.x, this.y, this.z, now);

    const dx = this.x - core.listenerX;
    const dy = this.y - core.listenerY;
    const dz = this.z - core.listenerZ;
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy + dz * dz));
    // Radial velocity: positive means it is getting further away, which lowers
    // the pitch. This is the whole of the doppler effect.
    const radial = (this.vx * dx + this.vy * dy + this.vz * dz) / dist;
    const rate =
      this.baseRate * Math.max(0.5, Math.min(1.85, SPEED_OF_SOUND / (SPEED_OF_SOUND + radial)));
    v.setRate(rate, now, 0.05);

    // A jet three hundred metres up is mostly low frequency by the time it
    // arrives, and the propagation delay is long enough to matter.
    v.baseLowpass = core.airCorner(dist * 0.75);
    v.baseTilt = core.airTilt(dist);
    v.setOcclusion(0, now);

    this.level += (this.target - this.level) * Math.min(1, dt * 3.5);
    v.setLevel(this.level, now, 0.12);
    v.audibility = this.level / (1 + dist / DISTANCE.aircraft.refDistance);
  }
}

/* ============================== ambience =============================== */

interface OneShot {
  clip: string;
  /** Seconds until the next one; randomised each time. */
  timer: number;
  minGap: number;
  maxGap: number;
  volume: number;
  /** How far from the listener it is placed. */
  radius: number;
  /** 0 = indoors only, 1 = outdoors only, 0.5 = anywhere. */
  outdoorBias: number;
  /** Scaled by wind. */
  windScale: number;
  bus: 'ambience';
}

/**
 * The ambient bed.
 *
 * Two wind layers, distant town, distant surf and an interior tone, each a held
 * loop whose level is driven from the weather and from how much sky the listener
 * can see. The loops are different lengths and their gains are modulated by
 * independent slow random walks, so their sum has no period; the one-shots on
 * top are what actually defeat the ear's pattern matching.
 */
export class AmbienceBed {
  private beds = new Map<string, Voice | null>();
  private walk = new Float32Array(6);
  private walkVel = new Float32Array(6);
  private oneShots: OneShot[] = [];
  private retry = 0;

  /** 0..1 how much sky the listener can see; drives outdoor levels. */
  outdoor = 1;
  /** Metres per second from the sky system. */
  windSpeed = 3;
  /** 0..1 airborne dust; a sandstorm is loud. */
  dust = 0;
  /** 0..1 how much of the interior tone to use. */
  interior = 0;
  /** Master ambience trim, dropped during a killstreak cinematic. */
  trim = 1;

  private static readonly BEDS: ReadonlyArray<{ name: string; clip: string; walk: number }> = [
    { name: 'wind_low', clip: 'amb_wind_low', walk: 0 },
    { name: 'wind_high', clip: 'amb_wind_high', walk: 1 },
    { name: 'city', clip: 'amb_city', walk: 2 },
    { name: 'surf', clip: 'amb_surf', walk: 3 },
    { name: 'room', clip: 'amb_room', walk: 4 },
  ];

  constructor(private core: AudioCore) {
    const rng = core.rng;
    this.oneShots.push(
      {
        clip: 'amb_gull',
        timer: rng.range(4, 14),
        minGap: 9,
        maxGap: 34,
        volume: 0.5,
        radius: 34,
        outdoorBias: 1,
        windScale: 0.2,
        bus: 'ambience',
      },
      {
        clip: 'amb_cloth',
        timer: rng.range(2, 8),
        minGap: 3.5,
        maxGap: 15,
        volume: 0.55,
        radius: 9,
        outdoorBias: 0.7,
        windScale: 1,
        bus: 'ambience',
      },
      {
        clip: 'amb_grit',
        timer: rng.range(3, 10),
        minGap: 5,
        maxGap: 18,
        volume: 0.5,
        radius: 6,
        outdoorBias: 0.8,
        windScale: 1.4,
        bus: 'ambience',
      },
      {
        clip: 'amb_dog',
        timer: rng.range(12, 40),
        minGap: 25,
        maxGap: 90,
        volume: 0.4,
        radius: 55,
        outdoorBias: 0.9,
        windScale: 0,
        bus: 'ambience',
      },
    );
    for (let i = 0; i < this.walk.length; i++) this.walk[i] = rng.range(0.7, 1);
  }

  /** Attempts to bring up any bed that is not running. Safe to call repeatedly. */
  private ensure(): void {
    const core = this.core;
    for (const bed of AmbienceBed.BEDS) {
      const existing = this.beds.get(bed.name);
      if (existing && existing.active) continue;
      const v = core.emit(bed.clip, {
        bus: 'ambience',
        volume: 0.0005,
        priority: 0.35,
        loop: true,
        positional: false,
        // A bed is everywhere, so it takes no reverb and no occlusion.
        wet: 0,
        attack: 1.2,
        offset: core.rng.range(0, 3),
        owner: `amb:${bed.name}`,
        noOcclusion: true,
      });
      this.beds.set(bed.name, v);
    }
  }

  update(dt: number): void {
    const core = this.core;
    const now = core.now;

    this.retry -= dt;
    if (this.retry <= 0) {
      this.ensure();
      this.retry = 1.5;
    }

    // Slow random walk per bed, so no two gains move together.
    for (let i = 0; i < this.walk.length; i++) {
      this.walkVel[i] += (core.rng.bi() * 0.6 - this.walkVel[i] * 0.9) * dt;
      this.walk[i] += this.walkVel[i] * dt;
      if (this.walk[i] < 0.55) {
        this.walk[i] = 0.55;
        this.walkVel[i] = Math.abs(this.walkVel[i]);
      }
      if (this.walk[i] > 1.15) {
        this.walk[i] = 1.15;
        this.walkVel[i] = -Math.abs(this.walkVel[i]);
      }
    }

    const wind = Math.max(0, Math.min(1, this.windSpeed / 14));
    const out = Math.max(0, Math.min(1, this.outdoor));
    const levels: Record<string, number> = {
      // The low bed is the pressure of moving air; it is there even in shelter.
      wind_low: (0.2 + 0.55 * wind) * (0.35 + 0.65 * out) * (1 + this.dust * 0.4),
      // The high bed is air tearing over edges, which needs exposure.
      wind_high: (0.05 + 0.62 * wind * wind) * (0.12 + 0.88 * out) * (1 + this.dust * 0.7),
      city: 0.42 * (0.25 + 0.75 * out),
      surf: 0.34 * (0.15 + 0.85 * out),
      room: 0.5 * this.interior,
    };

    for (const bed of AmbienceBed.BEDS) {
      const v = this.beds.get(bed.name);
      if (!v || !v.active) continue;
      const level = (levels[bed.name] ?? 0) * this.walk[bed.walk] * this.trim;
      v.setLevel(level, now, 0.9);
      v.audibility = 0.3;
    }

    for (const s of this.oneShots) {
      s.timer -= dt;
      if (s.timer > 0) continue;
      const bias = s.outdoorBias >= 0.5 ? out : 1 - out;
      const gate = 0.15 + 0.85 * bias;
      const windMul = 1 + s.windScale * wind;
      s.timer = core.rng.range(s.minGap, s.maxGap) / Math.max(0.25, gate * windMul);
      if (core.rng.next() > gate * Math.min(1.4, windMul) * 0.85) continue;
      // Placed on a circle around the listener, at a random bearing, so it
      // always comes from somewhere rather than from everywhere.
      const a = core.rng.range(0, Math.PI * 2);
      const r = s.radius * core.rng.range(0.5, 1.2);
      core.emit(s.clip, {
        bus: 'ambience',
        volume: s.volume * windMul * this.trim * core.rng.range(0.7, 1.1),
        rate: core.rng.range(0.9, 1.12),
        priority: 0.22,
        x: core.listenerX + Math.cos(a) * r,
        y: core.listenerY + core.rng.range(-1, 6),
        z: core.listenerZ + Math.sin(a) * r,
        model: DISTANCE.world,
        wet: 0.8,
      });
    }
  }

  stop(): void {
    const now = this.core.now;
    for (const v of this.beds.values()) v?.fadeOut(now, 0.6);
    this.beds.clear();
  }
}

/* =============================== music ================================= */

/**
 * A tension bed. One drone, one quickening pulse, one sting.
 *
 * Intensity is driven by the game rather than by a timeline: enemies who can
 * see you, damage taken, and how recently something died. It rises fast and
 * falls slowly, which is the shape of adrenaline and also the shape that avoids
 * the music switching on and off in a running fight.
 */
export class MusicBed {
  private drone: Voice | null = null;
  private retry = 0;
  private pulseTimer = 0;
  /** 0..1, smoothed. */
  intensity = 0;
  private target = 0;
  enabled = true;

  constructor(private core: AudioCore) {}

  /** Raises the target intensity; decays on its own. */
  push(amount: number): void {
    this.target = Math.max(this.target, Math.min(1, amount));
  }

  sting(volume = 0.8): void {
    this.core.emit('music_sting', {
      bus: 'music',
      volume,
      priority: 0.6,
      positional: false,
      wet: 0.2,
    });
  }

  update(dt: number): void {
    const core = this.core;
    const now = core.now;
    this.target = Math.max(0, this.target - dt * 0.11);
    const rate = this.target > this.intensity ? 1.6 : 0.28;
    this.intensity += (this.target - this.intensity) * Math.min(1, dt * rate);

    if (!this.enabled) {
      if (this.drone) {
        this.drone.fadeOut(now, 1.2);
        this.drone = null;
      }
      return;
    }

    this.retry -= dt;
    if ((!this.drone || !this.drone.active) && this.retry <= 0) {
      this.retry = 2;
      this.drone = core.emit('music_drone', {
        bus: 'music',
        volume: 0.0005,
        priority: 0.3,
        loop: true,
        positional: false,
        wet: 0,
        attack: 3,
        offset: core.rng.range(0, 4),
        owner: 'music:drone',
        noOcclusion: true,
      });
    }
    if (this.drone && this.drone.active) {
      this.drone.setLevel(0.12 + 0.72 * this.intensity, now, 1.4);
      // The drone opens up as the fight does.
      this.drone.baseLowpass = 320 + 3200 * this.intensity;
      this.drone.setOcclusion(0, now);
      this.drone.audibility = 0.25;
    }

    if (this.intensity > 0.3) {
      this.pulseTimer -= dt;
      if (this.pulseTimer <= 0) {
        // From one every second and a half down to one every third of a second.
        this.pulseTimer = 1.55 - 1.2 * this.intensity;
        core.emit('music_pulse', {
          bus: 'music',
          volume: 0.2 + 0.55 * this.intensity,
          rate: 0.9 + 0.25 * this.intensity,
          priority: 0.3,
          positional: false,
          wet: 0.1,
        });
      }
    } else {
      this.pulseTimer = 0.4;
    }
  }

  stop(): void {
    if (this.drone) {
      this.drone.fadeOut(this.core.now, 0.8);
      this.drone = null;
    }
  }
}

/* ================================ body ================================= */

/**
 * Heartbeat and breathing.
 *
 * Both are head-relative and unspatialised, which is what makes them read as
 * the player's own body. The heart appears below forty percent health and
 * accelerates as it drops; the breath tracks exertion, and becomes the loudest
 * thing in the mix when a man who has just sprinted a hundred metres is trying
 * to hold a sight picture.
 */
export class BodyState {
  private beatTimer = 0;
  private breathTimer = 0;
  private breathIn = true;

  /** 0..1 */
  health = 1;
  winded = 0;
  alive = true;
  holdingBreath = false;

  constructor(private core: AudioCore) {}

  update(dt: number): void {
    if (!this.alive) {
      this.beatTimer = 0;
      this.breathTimer = 0;
      return;
    }
    const core = this.core;
    const hurt = Math.max(0, 1 - this.health / 0.42);

    if (hurt > 0.02) {
      this.beatTimer -= dt;
      if (this.beatTimer <= 0) {
        // 72 bpm at the threshold up to about 150 at the edge of death.
        const bpm = 72 + 78 * hurt;
        this.beatTimer = 60 / bpm;
        core.emit('heartbeat', {
          bus: 'world',
          volume: 0.16 + 0.62 * hurt,
          rate: 0.94 + 0.16 * hurt,
          priority: 0.55,
          positional: false,
          wet: 0,
          noOcclusion: true,
        });
      }
    } else {
      this.beatTimer = 0;
    }

    const exertion = Math.max(this.winded, hurt * 0.7);
    if (exertion > 0.12 && !this.holdingBreath) {
      this.breathTimer -= dt;
      if (this.breathTimer <= 0) {
        const period = 1.5 - 0.85 * exertion;
        this.breathTimer = this.breathIn ? period * 0.42 : period * 0.58;
        core.emit(this.breathIn ? 'breath_in' : 'breath_out', {
          bus: 'world',
          volume: (0.12 + 0.5 * exertion) * (this.breathIn ? 1 : 0.85),
          rate: 0.9 + 0.35 * exertion,
          priority: 0.4,
          positional: false,
          pan: core.rng.range(-0.12, 0.12),
          wet: 0.05,
          noOcclusion: true,
        });
        this.breathIn = !this.breathIn;
      }
    } else if (this.holdingBreath) {
      this.breathTimer = 0.2;
    }
  }
}
