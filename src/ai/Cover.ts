import * as THREE from 'three';
import type { CoverPoint, IPhysics, IWorld } from '../core/Interfaces';
import { saturate } from '../core/MathUtils';
import type { NavGrid } from './NavGrid';
import { AI } from './Tuning';

/**
 * Cover selection.
 *
 * The world hands over three hundred cover points, each with the direction it
 * protects from and whether it is waist high. Two things have to be added to
 * make them usable: an index, so an agent can ask "what is near me" without
 * touching all three hundred, and exclusivity, so two men do not walk to the
 * same doorway. Claims are written into `CoverPoint.occupiedBy`, which is the
 * field the world interface put there for exactly this, and they lapse on a
 * timer so a claim held by an agent who was shot on the way does not sterilise
 * the position for the rest of the match.
 *
 * Scoring is where the behaviour actually comes from. A point is worth having
 * if it faces the threat, if it is close enough to get to before the fight
 * moves, if it is in the band where the agent's weapon works, and — the
 * expensive test, and the one that matters most — if there is a line from the
 * shoulder the agent would lean out of to the target. Cover you cannot shoot
 * from is a hiding place, and an enemy who hides is an enemy who is boring.
 */

const CELL = 6;
/**
 * Candidates carried from the cheap geometric pass into the sight test.
 *
 * Sight tests are the only expensive part of scoring, so they are spent on a
 * shortlist rather than on the first ten points the grid happens to yield.
 * Testing in grid order means the point that wins is usually one that was never
 * tested, which is the same as not testing at all.
 */
const SHORTLIST = 5;
/** Worth of a firing line from the cover, and the cost of not having one. */
const SIGHT_BONUS = 20;
const BLIND_PENALTY = 55;

export interface CoverChoice {
  index: number;
  score: number;
}

const _peek = new THREE.Vector3();
const _v = new THREE.Vector3();
const _eye = new THREE.Vector3();

export class CoverField {
  private points: CoverPoint[] = [];
  private cells = new Map<number, number[]>();
  private claimTime: Float32Array = new Float32Array(0);
  private claimant: Int32Array = new Int32Array(0);
  /** Navigation island each point sits on, so unwalkable cover is never offered. */
  private island: Int32Array = new Int32Array(0);
  private minX = 0;
  private minZ = 0;
  /** Rolling clock so claims can expire without a per-point timer. */
  private now = 0;

  /** Line-of-sight probes spent on the last scoring pass. */
  losProbes = 0;

  /** Shortlist carried between the two scoring passes; never reallocated. */
  private readonly shortIndex = new Int32Array(SHORTLIST);
  private readonly shortScore = new Float32Array(SHORTLIST);
  private shortCount = 0;

  build(world: IWorld, nav: NavGrid): void {
    this.points = world.coverPoints;
    this.claimTime = new Float32Array(this.points.length);
    this.claimant = new Int32Array(this.points.length).fill(-1);
    this.island = new Int32Array(this.points.length).fill(-1);
    this.cells.clear();
    this.minX = world.bounds.min.x;
    this.minZ = world.bounds.min.z;
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i].position;
      const key = this.key(p.x, p.z);
      let list = this.cells.get(key);
      if (!list) {
        list = [];
        this.cells.set(key, list);
      }
      list.push(i);
      this.island[i] = nav.regionAt(p.x, p.y, p.z);
    }
  }

  /** Navigation island a point sits on. */
  islandOf(index: number): number {
    return index >= 0 && index < this.island.length ? this.island[index] : -1;
  }

  get count(): number {
    return this.points.length;
  }

  at(index: number): CoverPoint | null {
    return index >= 0 && index < this.points.length ? this.points[index] : null;
  }

  private key(x: number, z: number): number {
    const cx = Math.floor((x - this.minX) / CELL);
    const cz = Math.floor((z - this.minZ) / CELL);
    return (cx & 0xffff) * 65536 + (cz & 0xffff);
  }

  tick(dt: number): void {
    this.now += dt;
    // Expire stale claims. Cheap enough to sweep: three hundred numbers.
    for (let i = 0; i < this.claimant.length; i++) {
      if (this.claimant[i] < 0) continue;
      if (this.now - this.claimTime[i] > AI.coverClaimTimeout) this.release(i, this.claimant[i]);
    }
  }

  /** Takes a point for an agent. Fails when somebody else already holds it. */
  claim(index: number, agentId: number): boolean {
    if (index < 0 || index >= this.points.length) return false;
    const owner = this.claimant[index];
    if (owner >= 0 && owner !== agentId) return false;
    this.claimant[index] = agentId;
    this.claimTime[index] = this.now;
    this.points[index].occupiedBy = agentId;
    return true;
  }

  /** Keeps an existing claim alive; agents call this while they are using it. */
  refresh(index: number, agentId: number): void {
    if (index >= 0 && index < this.points.length && this.claimant[index] === agentId) {
      this.claimTime[index] = this.now;
    }
  }

  release(index: number, agentId: number): void {
    if (index < 0 || index >= this.points.length) return;
    if (this.claimant[index] !== agentId) return;
    this.claimant[index] = -1;
    this.points[index].occupiedBy = undefined;
  }

  releaseAll(agentId: number): void {
    for (let i = 0; i < this.claimant.length; i++) {
      if (this.claimant[i] === agentId) this.release(i, agentId);
    }
  }

  claimedBy(index: number): number {
    return index >= 0 && index < this.claimant.length ? this.claimant[index] : -1;
  }

  reset(): void {
    this.claimant.fill(-1);
    this.claimTime.fill(0);
    for (const p of this.points) p.occupiedBy = undefined;
  }

  /**
   * Best cover for an agent standing at `from` facing a threat at `threat`.
   *
   * `flank` biases the search sideways, which is the whole of the flanking
   * behaviour: the same scoring function asked for a point off the threat's
   * shoulder rather than in front of him.
   */
  best(
    physics: IPhysics | null,
    agentId: number,
    from: THREE.Vector3,
    threat: THREE.Vector3,
    searchRadius: number,
    flank: number,
    ignore: THREE.Object3D[],
    island: number,
    out: CoverChoice,
  ): boolean {
    out.index = -1;
    out.score = -Infinity;
    this.losProbes = 0;
    this.shortCount = 0;

    const cx0 = Math.floor((from.x - searchRadius - this.minX) / CELL);
    const cx1 = Math.floor((from.x + searchRadius - this.minX) / CELL);
    const cz0 = Math.floor((from.z - searchRadius - this.minZ) / CELL);
    const cz1 = Math.floor((from.z + searchRadius - this.minZ) / CELL);
    const r2 = searchRadius * searchRadius;

    // Threat-relative axes: `tx,tz` points from the threat to the agent, and
    // its perpendicular is the direction a flanker wants to travel along.
    let tx = from.x - threat.x;
    let tz = from.z - threat.z;
    const tlen = Math.hypot(tx, tz) || 1;
    tx /= tlen;
    tz /= tlen;
    const flankSign = flank >= 0 ? 1 : -1;

    let probes = 0;
    for (let cz = cz0; cz <= cz1; cz++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const list = this.cells.get((cx & 0xffff) * 65536 + (cz & 0xffff));
        if (!list) continue;
        for (let k = 0; k < list.length; k++) {
          const index = list[k];
          const owner = this.claimant[index];
          if (owner >= 0 && owner !== agentId) continue;
          // Wall on the far side of a fence the agent cannot get through: the
          // straight line says eight metres, the walk says never.
          if (island >= 0 && this.island[index] !== island) continue;
          const point = this.points[index];
          const dx = point.position.x - from.x;
          const dz = point.position.z - from.z;
          const dist2 = dx * dx + dz * dz;
          if (dist2 > r2) continue;
          // Rooftop cover is useless to a man on the street and vice versa.
          if (Math.abs(point.position.y - from.y) > 2.6) continue;

          const ex = point.position.x - threat.x;
          const ez = point.position.z - threat.z;
          const exposure = Math.hypot(ex, ez) || 1;

          // The normal is the direction the cover protects against — it points
          // at the wall — so the threat has to be on that side of the point for
          // the wall to be between the two of them. Get the sign wrong here and
          // every soldier in the level walks to the exposed face of his wall.
          const facing = -(point.normal.x * ex + point.normal.z * ez) / exposure;
          if (facing < 0.15) continue;

          let score = 0;
          // Range band. Too close and the agent is in grenade range of a man
          // he cannot see; too far and he is shooting at a dot.
          const band =
            exposure < AI.preferredRangeMin
              ? exposure / AI.preferredRangeMin
              : exposure > AI.preferredRangeMax
                ? saturate(1 - (exposure - AI.preferredRangeMax) / 26)
                : 1;
          score += band * 42;
          score += facing * 26;

          // Distance, superlinear. Two walls four and six metres away are much
          // the same choice; one twenty metres away is a different decision
          // entirely, and a linear penalty never says so loudly enough. A
          // soldier under fire takes the wall in front of him.
          const reach = Math.sqrt(dist2);
          score -= reach * 2.2 + (reach * reach) / 9;

          // Ground given up. Cover further from the threat than the agent is
          // already standing means walking out of his own firefight, which is
          // how an enemy ends up losing the contact and wandering off to
          // investigate the place he was just shooting at.
          if (exposure > tlen) score -= (exposure - tlen) * 3.5;

          if (point.low) score += 6;

          if (flank !== 0) {
            // Reward lateral displacement from the agent's current bearing.
            const px = -tz * flankSign;
            const pz = tx * flankSign;
            const lateral = (ex * px + ez * pz) / exposure;
            score += lateral * 34 * Math.abs(flank);
          } else {
            // Otherwise prefer staying on the side the agent is already on.
            score += ((ex * tx + ez * tz) / exposure) * 8;
          }

          this.shortlist(index, score);
        }
      }
    }

    // Second pass: buy a firing line for the handful of points still in it.
    for (let i = 0; i < this.shortCount; i++) {
      let score = this.shortScore[i];
      if (physics) {
        probes++;
        if (this.canShootFrom(physics, this.shortIndex[i], threat, ignore)) score += SIGHT_BONUS;
        else {
          probes++;
          score -= BLIND_PENALTY;
        }
      }
      if (score > out.score) {
        out.score = score;
        out.index = this.shortIndex[i];
      }
    }
    this.losProbes = probes;
    return out.index >= 0;
  }

  /** Keeps the running best `SHORTLIST` scores, highest first. */
  private shortlist(index: number, score: number): void {
    if (this.shortCount === SHORTLIST && score <= this.shortScore[SHORTLIST - 1]) return;
    let at = this.shortCount < SHORTLIST ? this.shortCount++ : SHORTLIST - 1;
    while (at > 0 && this.shortScore[at - 1] < score) {
      this.shortScore[at] = this.shortScore[at - 1];
      this.shortIndex[at] = this.shortIndex[at - 1];
      at--;
    }
    this.shortScore[at] = score;
    this.shortIndex[at] = index;
  }

  /** True when either shoulder of a cover point has a line to the threat. */
  private canShootFrom(
    physics: IPhysics,
    index: number,
    threat: THREE.Vector3,
    ignore: THREE.Object3D[],
  ): boolean {
    const point = this.points[index];
    const nx = point.normal.x;
    const nz = point.normal.z;
    const eyeY = point.low ? AI.eyeHeightCrouch : AI.eyeHeightStand;
    _eye.copy(threat);
    _eye.y += 0.2;
    for (let side = 1; side >= -1; side -= 2) {
      // Lean out around the edge, not through the wall.
      _peek.copy(point.position);
      _peek.x += -nz * AI.peekOffset * side;
      _peek.z += nx * AI.peekOffset * side;
      _peek.y += eyeY;
      if (physics.lineOfSight(_peek, _eye, ignore)) return true;
    }
    return false;
  }

  /**
   * Where an agent stands to shoot from a cover point. Leaning out of the side
   * the target is not behind, so the body stays behind the wall.
   */
  peekPosition(index: number, side: number, out: THREE.Vector3): THREE.Vector3 {
    const point = this.points[index];
    out.copy(point.position);
    const nx = point.normal.x;
    const nz = point.normal.z;
    out.x += -nz * AI.peekOffset * side;
    out.z += nx * AI.peekOffset * side;
    return out;
  }

  /** True when a point still protects against a threat that has moved. */
  stillValid(index: number, threat: THREE.Vector3): boolean {
    const point = this.at(index);
    if (!point) return false;
    _v.copy(threat).sub(point.position);
    _v.y = 0;
    const len = _v.length();
    if (len < 1e-3) return false;
    return (point.normal.x * _v.x + point.normal.z * _v.z) / len > 0.05;
  }
}
