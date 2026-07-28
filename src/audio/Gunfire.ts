/**
 * Gunshot layering.
 *
 * `gunshot()` is one call from the weapon system and up to four voices out:
 *
 *   report   the near field — mechanical action, body, crack, thump. Pre-rendered
 *            per caliber, per local/remote, per suppressed, four variants each.
 *   tail     the environment's answer to the report. A separate voice so its
 *            delay, level, brightness and length can be chosen at trigger time
 *            from where the listener is standing and how far away the shooter is.
 *   sub      an extra low layer for the shooter's own heavy calibers, which is
 *            what makes a .338 feel different from a 5.56 in the hands rather
 *            than just louder.
 *   dust     debris settling, for a big caliber fired indoors.
 *
 * The interesting decisions are all in the tail. Indoors it arrives in under
 * 10 ms, dense and still fairly bright. Outdoors it is a handful of discrete
 * slaps off facades starting around 45 ms. Past about 120 m the near layers have
 * been stripped by air absorption and the tail *is* the sound — so it switches to
 * the `distant` design, gets louder relative to the report rather than quieter,
 * and the whole thing arrives late because sound takes a third of a second to
 * cross a street fight.
 */
import type * as THREE from 'three';
import { clamp, saturate } from '../core/MathUtils';
import type { AudioEngine } from './AudioEngine';
import {
  gunProfile,
  gunshotSoundId,
  profileKeyFor,
  tailSoundId,
  type TailKind,
} from './sounds';

/** Distance past which the tail carries the shot rather than the report. */
const DISTANT_THRESHOLD = 115;
/** Distance past which even the tail is not worth a voice. */
const CULL_DISTANCE = 460;

export interface ShotEnvironment {
  /** 0..1 — how enclosed the listener is, from the world module. */
  indoors: number;
  /** 0..1 reverb weight of the enclosing volume. */
  reverb: number;
}

export class Gunfire {
  private readonly environment: ShotEnvironment = { indoors: 0, reverb: 0 };
  /** Rolling count for the report, plus a cheap same-frame duplicate guard. */
  private shotsThisSecond = 0;
  private secondStartedAt = 0;
  shotsFired = 0;

  constructor(private readonly engine: AudioEngine) {}

  setEnvironment(indoors: number, reverb: number): void {
    this.environment.indoors = saturate(indoors);
    this.environment.reverb = saturate(reverb);
  }

  /**
   * `weaponId` may be a weapon id, a caliber, or `weapon_fire_<id>`; the AI and
   * the weapon system each use a different one.
   */
  fire(weaponId: string, position: THREE.Vector3, suppressed: boolean, isLocal: boolean): void {
    const engine = this.engine;
    if (!engine.ok) return;

    const distance = isLocal ? 0 : engine.listenerAt.distanceTo(position);
    if (distance > CULL_DISTANCE) return;

    const key = profileKeyFor(weaponId);
    const profile = gunProfile(key);
    this.shotsFired++;

    // Rate limiting for sustained fire. A minigun and four AI rifles can ask for
    // sixty reports a second between them; past a dozen the extra voices only
    // add mud and eat the budget the impacts need.
    const now = engine.now;
    if (now - this.secondStartedAt > 1) {
      this.secondStartedAt = now;
      this.shotsThisSecond = 0;
    }
    this.shotsThisSecond++;
    const crowded = this.shotsThisSecond > 14;

    const indoors = this.environment.indoors;
    const far = saturate((distance - 30) / (DISTANT_THRESHOLD - 30));

    // ---- Report ------------------------------------------------------------
    // Its level falls with distance through the panner; what changes here is the
    // balance against the tail.
    const reportVolume = isLocal ? 1 : 1 - 0.45 * far;
    engine.play(gunshotSoundId(key, isLocal, suppressed), isLocal ? null : position, {
      volume: reportVolume,
      // Indoors the near field is brighter because there is no distance to lose
      // it over and the room is throwing it back at you.
      toneDb: isLocal ? 0 : indoors * 1.5 - far * 3,
      send: suppressed ? 0.25 + indoors * 0.3 : 0.35 + indoors * 0.45,
      immediate: isLocal,
      priorityScale: crowded ? 0.7 : 1,
    });

    // ---- Tail --------------------------------------------------------------
    if (!crowded || distance > 40) {
      const kind = this.tailFor(distance, indoors, suppressed);
      const tailVolume = this.tailVolume(kind, distance, indoors, suppressed) * profile.tailWeight;
      if (tailVolume > 0.02) {
        engine.play(tailSoundId(kind), position, {
          volume: tailVolume,
          // The tail is a reflection, so it arrives after the direct sound. The
          // buffer already contains the reflection pattern; this is only the
          // extra time for the wavefront to reach the nearest surface and back.
          delay: kind === 'indoor' || kind === 'suppressed_indoor' ? 0 : 0.012,
          priorityScale: distance > DISTANT_THRESHOLD ? 1.1 : 0.7,
        });
      }
    }

    // ---- Extra low end for the shooter -------------------------------------
    if (isLocal && profile.thumpGain > 0.85 && !suppressed) {
      engine.play2D('concussion', {
        volume: clamp((profile.thumpGain - 0.85) * 1.6, 0, 0.34),
        pitch: 1.6,
        immediate: true,
        priorityScale: 0.5,
      });
    }

    // ---- Debris ------------------------------------------------------------
    if (indoors > 0.5 && profile.tailWeight > 1.15 && !suppressed && !crowded) {
      engine.play('gun_dust_settle', position, {
        volume: 0.35 * indoors,
        delay: 0.08,
        priorityScale: 0.2,
      });
    }
  }

  private tailFor(distance: number, indoors: number, suppressed: boolean): TailKind {
    if (distance > DISTANT_THRESHOLD) return 'distant';
    if (suppressed) return indoors > 0.5 ? 'suppressed_indoor' : 'suppressed_outdoor';
    return indoors > 0.5 ? 'indoor' : 'outdoor';
  }

  /**
   * Tail level. The shape of this function is the whole distance illusion: near
   * the muzzle the tail is a detail behind the report, at 200 m it is all there
   * is.
   */
  private tailVolume(
    kind: TailKind,
    distance: number,
    indoors: number,
    suppressed: boolean,
  ): number {
    if (kind === 'distant') return 1.15;
    // Ramp in over the first few metres: at the muzzle the report swamps it.
    const near = saturate((distance - 1.5) / 22);
    const base = 0.3 + 0.7 * near;
    const room = kind === 'indoor' || kind === 'suppressed_indoor' ? 0.75 + this.environment.reverb * 0.6 : 0.85;
    return base * room * (suppressed ? 0.45 : 1) * (0.7 + 0.3 * indoors);
  }
}
