import * as THREE from 'three';
import { Groups } from '../core/GameContext';
import type { IPhysics, RaycastHit } from '../core/Interfaces';
import { easeInOutCubic, easeOutCubic, saturate, smoothstep } from '../core/MathUtils';
import { T } from './Tuning';

/**
 * Mantling and vaulting.
 *
 * Detection is five probes, cheapest first, and every one of them can reject:
 *
 *   1. Two forward rays — shin height and chest height — find the near face of
 *      whatever is in the way and its normal. Two heights rather than one so a
 *      railing with open air beneath it is still found, and the nearer hit wins
 *      so a low ledge in front of a tall wall reads as the low ledge.
 *   2. A downward ray just past that face, started from exactly the highest
 *      point a mantle may reach, gives the height of the surface on top. Any
 *      obstacle taller than the reach has no surface below that start point, so
 *      the same probe that measures a climbable ledge also rejects a wall.
 *   3. The rise must land inside the window: below it the physics step-up
 *      already handles it, above it the player is not getting up there.
 *   4. A capsule cast straight up from the feet proves there is room to lift
 *      into. Tucked height, not standing height, because a mantle is a tuck.
 *   5. A capsule cast down onto the landing spot proves the destination both
 *      supports the player and has headroom — if the sweep can fall the whole
 *      clearance and come to rest on the ledge, nothing is in the way.
 *
 * Anything waist high with a drop on the far side is a vault instead: same
 * probes, a target on the other side, a faster arc and momentum kept.
 */

const PROBE_MASK = Groups.WORLD | Groups.PROP | Groups.GLASS;
/** Forward probe heights above the feet: over the step limit, and chest high. */
const PROBE_LOW = 0.45;
const PROBE_HIGH = 0.95;
/** Tolerance between where the landing capsule settles and the measured ledge. */
const LANDING_TOLERANCE = 0.16;

const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _dummy = new THREE.Object3D();

function makeHit(): RaycastHit {
  return {
    point: new THREE.Vector3(),
    normal: new THREE.Vector3(0, 1, 0),
    distance: 0,
    object: _dummy,
    surface: 'concrete',
    damageScale: 1,
    penetration: 0.25,
  };
}

/** A validated climb, in world space. */
export interface MantleTarget {
  vault: boolean;
  startX: number;
  startY: number;
  startZ: number;
  endX: number;
  endY: number;
  endZ: number;
  /** Height the body clears on the way over; only a vault goes above `endY`. */
  peakY: number;
  rise: number;
  duration: number;
  exitSpeed: number;
  dirX: number;
  dirZ: number;
}

export class Mantle {
  readonly target: MantleTarget = {
    vault: false,
    startX: 0,
    startY: 0,
    startZ: 0,
    endX: 0,
    endY: 0,
    endZ: 0,
    peakY: 0,
    rise: 0,
    duration: 0,
    exitSpeed: 0,
    dirX: 0,
    dirZ: -1,
  };

  /** Why the last attempt failed, for the showcase readout. */
  reason = 'none';

  private hitLow = makeHit();
  private hitHigh = makeHit();

  /**
   * Looks for a climb from `pos` (feet) along the horizontal unit direction
   * `dirX/dirZ`. Fills `target` and returns true when one was found.
   */
  detect(
    physics: IPhysics,
    pos: THREE.Vector3,
    dirX: number,
    dirZ: number,
    capsuleHeight: number,
    allowVault: boolean,
  ): boolean {
    const r = T.capsuleRadius;
    const reach = r + T.mantleReach;
    _dir.set(dirX, 0, dirZ);
    if (_dir.lengthSq() < 1e-6) {
      this.reason = 'no direction';
      return false;
    }
    _dir.normalize();

    // 1. Near face of the obstacle, from two heights.
    let wallDist = Infinity;
    for (let i = 0; i < 2; i++) {
      const hit = i === 0 ? this.hitLow : this.hitHigh;
      const probeY = i === 0 ? PROBE_LOW : PROBE_HIGH;
      if (probeY > capsuleHeight - 0.1) continue;
      _origin.set(pos.x, pos.y + probeY, pos.z);
      if (!physics.raycastInto(_origin, _dir, reach, hit, PROBE_MASK)) continue;
      const facing = -(hit.normal.x * _dir.x + hit.normal.z * _dir.z);
      if (facing < T.mantleWallDot) continue;
      // A shallow face is a ramp you walk up, not a ledge you climb.
      if (Math.abs(hit.normal.y) > 0.5) continue;
      if (hit.distance < wallDist) wallDist = hit.distance;
    }
    if (!Number.isFinite(wallDist)) {
      this.reason = 'no wall ahead';
      return false;
    }

    // 2. Surface on top, measured from the top of the reach window so anything
    //    taller than the window simply has nothing beneath the probe.
    const landDist = wallDist + r + T.mantleLandingInset;
    const landX = pos.x + _dir.x * landDist;
    const landZ = pos.z + _dir.z * landDist;
    const probeTop = pos.y + T.mantleMaxHeight + 0.3;
    const ledgeY = physics.groundHeight(landX, landZ, probeTop);
    if (ledgeY === null) {
      this.reason = 'no ledge surface';
      return false;
    }

    // 3. Height window.
    const rise = ledgeY - pos.y;
    if (rise < T.mantleMinHeight) {
      this.reason = `ledge too low (${rise.toFixed(2)} m)`;
      return false;
    }
    if (rise > T.mantleMaxHeight) {
      this.reason = `ledge too high (${rise.toFixed(2)} m)`;
      return false;
    }

    // 4. Room to lift into, at tucked height.
    _dir.set(0, 1, 0);
    const lift = physics.capsuleCast(pos, _dir, r, T.crouchHeight, rise + 0.3, PROBE_MASK);
    if (lift && lift.distance < rise + 0.1) {
      this.reason = 'no headroom to rise';
      return false;
    }
    _dir.set(dirX, 0, dirZ).normalize();

    // 5. The landing spot supports a tucked capsule with clearance above it.
    if (!this.landingClear(physics, landX, ledgeY, landZ)) {
      this.reason = 'landing blocked';
      return false;
    }

    const t = this.target;
    t.startX = pos.x;
    t.startY = pos.y;
    t.startZ = pos.z;
    t.dirX = _dir.x;
    t.dirZ = _dir.z;
    t.rise = rise;
    t.vault = false;
    t.endX = landX;
    t.endY = ledgeY;
    t.endZ = landZ;
    t.peakY = ledgeY;
    t.duration = T.mantleTimeBase + rise * T.mantleTimePerMeter;
    t.exitSpeed = T.mantleExitSpeed;

    // A waist-high obstacle with a drop behind it is something to swing over
    // rather than climb onto, and it should cost far less speed.
    if (allowVault && rise <= T.vaultMaxHeight) {
      const farX = landX + _dir.x * T.vaultProbeDistance;
      const farZ = landZ + _dir.z * T.vaultProbeDistance;
      const farY = physics.groundHeight(farX, farZ, ledgeY + 0.35);
      if (
        farY !== null &&
        farY < ledgeY - T.vaultFarDrop &&
        farY > pos.y - 2.5 &&
        this.landingClear(physics, farX, farY, farZ)
      ) {
        t.vault = true;
        t.endX = farX;
        t.endY = farY;
        t.endZ = farZ;
        t.peakY = ledgeY + 0.12;
        t.duration = (T.mantleTimeBase + rise * T.mantleTimePerMeter) * T.vaultTimeScale;
        t.exitSpeed = T.vaultExitSpeed;
      }
    }

    this.reason = t.vault ? 'vault' : 'mantle';
    return true;
  }

  /**
   * A tucked capsule dropped from `clearance` above the surface must fall the
   * whole way and settle on it. Starting the sweep above the target tests the
   * support and the headroom in a single cast: anything overhead stops the
   * sweep early, and anything missing lets it fall straight past.
   */
  private landingClear(physics: IPhysics, x: number, y: number, z: number): boolean {
    _origin.set(x, y + T.mantleClearance, z);
    _dir.set(0, -1, 0);
    const hit = physics.capsuleCast(
      _origin,
      _dir,
      T.capsuleRadius,
      T.crouchHeight,
      T.mantleClearance + 0.3,
      PROBE_MASK,
    );
    if (!hit) return false;
    const restY = _origin.y - hit.distance;
    return Math.abs(restY - y) <= LANDING_TOLERANCE;
  }

  /**
   * Position along the climb at normalised time `t`, written into `out`.
   *
   * The vertical and horizontal channels are deliberately out of phase: the
   * body is most of the way up before it is much of the way forward, which is
   * what makes the camera arc over the lip instead of clipping through it.
   */
  sample(t: number, out: THREE.Vector3): THREE.Vector3 {
    const m = this.target;
    const k = saturate(t);
    let y: number;
    if (m.vault) {
      // Up over the obstacle, then down onto the far side.
      const up = 0.45;
      y =
        k < up
          ? m.startY + (m.peakY - m.startY) * easeOutCubic(k / up)
          : m.peakY + (m.endY - m.peakY) * easeInOutCubic((k - up) / (1 - up));
    } else {
      y = m.startY + (m.endY - m.startY) * easeOutCubic(saturate(k / 0.62));
    }
    const h = m.vault ? smoothstep(0.05, 0.95, k) : smoothstep(0.18, 1, k);
    out.set(
      m.startX + (m.endX - m.startX) * h,
      y,
      m.startZ + (m.endZ - m.startZ) * h,
    );
    return out;
  }
}
