/**
 * Numeric self-test for the combat module.
 *
 * Enabled with `?combattest=1`, which also exposes `window.__COMBAT_TEST__()` so a
 * run can be repeated from the console. It builds its own slabs of known surface
 * and known thickness four hundred metres below the map, fires known rounds
 * through them at scoring dummies, and prints what actually happened: measured
 * thickness, energy spent, damage delivered on the far side.
 *
 * This exists because penetration and blast occlusion are numbers, and a
 * screenshot cannot tell you whether a wall is 20 cm or 60 cm of concrete or
 * whether the grenade around the corner did 8 damage or 80. The suite runs in a
 * few milliseconds and doubles as the microbenchmark for `fireBullet`.
 */
import * as THREE from 'three';
import { GAMEPLAY } from '../core/Config';
import type { PhysicsUserData } from '../core/Contracts';
import {
  allocEntityId,
  type Damageable,
  type DamageInfo,
  type SurfaceType,
  type Team,
} from '../core/GameTypes';
import { PROBE_CEILING, PROBE_SKIN, TraceLog, type FireBulletOptions } from './Ballistics';
import type { CombatDeps } from './Deps';
import type { DamageRegistry } from './DamageSystem';
import { maxCrossableThickness, penetrationCost, SURFACE_BALLISTICS } from './Surfaces';

/** Well clear of the map, which reaches from y = -4 to y = 30. */
const TEST_Y = -400;
const SLAB_SPACING = 12;
const SLAB_HALF_WIDTH = 2.5;
/** Distance in front of a slab the shot starts from. */
const MUZZLE_STANDOFF = 2.5;
/** Distance behind a slab the scoring dummy stands. */
const DUMMY_STANDOFF = 1.6;
/** Cover for the occlusion case: 40 cm of concrete between charge and target. */
const COVER_X = -30;
const COVER_Z = 1.8;
const COVER_HALF_Z = 0.2;

interface Slab {
  label: string;
  surface: SurfaceType;
  thickness: number;
  /** What a designer should expect: does a 5.56 round get through? */
  expectPass: boolean;
}

interface PenetrationRow {
  label: string;
  surface: SurfaceType;
  thickness: number;
  /** Thickness the back-face probe actually reported. */
  measured: number;
  cost: number;
  energy: number;
  passed: boolean;
  expected: boolean;
  /** Damage delivered to the dummy on the far side, 0 if the round stopped. */
  exitDamage: number;
  predictedCost: number;
  /** Deepest the probe was allowed to look, given the round's energy. */
  probeCap: number;
}

/**
 * Thicknesses chosen to match what the world actually builds: 25 cm building
 * walls, 64 cm jersey barriers, 12 cm stud partitions, 14 cm fence panels, 70 cm
 * crates, and a car door panel.
 */
const SLABS: Slab[] = [
  { label: 'plaster partition 12cm', surface: 'plaster', thickness: 0.12, expectPass: true },
  { label: 'window glass 6cm', surface: 'glass', thickness: 0.06, expectPass: true },
  { label: 'wooden crate 70cm', surface: 'wood', thickness: 0.7, expectPass: true },
  { label: 'plank door 8cm', surface: 'wood', thickness: 0.08, expectPass: true },
  { label: 'car door panel 10cm', surface: 'metal', thickness: 0.1, expectPass: true },
  { label: 'fence panel 14cm', surface: 'metal', thickness: 0.14, expectPass: true },
  { label: 'lamp post 28cm', surface: 'metal', thickness: 0.28, expectPass: false },
  { label: 'vehicle chassis 180cm', surface: 'metal', thickness: 1.8, expectPass: false },
  { label: 'concrete kerb 12cm', surface: 'concrete', thickness: 0.12, expectPass: false },
  { label: 'concrete wall 25cm', surface: 'concrete', thickness: 0.25, expectPass: false },
  { label: 'jersey barrier 64cm', surface: 'concrete', thickness: 0.64, expectPass: false },
  { label: 'brick wall 22cm', surface: 'brick', thickness: 0.22, expectPass: false },
  { label: 'sandbag wall 50cm', surface: 'sand', thickness: 0.5, expectPass: false },
  { label: 'canvas awning 20cm', surface: 'fabric', thickness: 0.2, expectPass: true },
  { label: 'hedge 60cm', surface: 'foliage', thickness: 0.6, expectPass: true },
];

/** A 5.56 assault rifle, matching the values in the weapon table. */
const RIFLE = {
  damage: 32,
  falloffStart: 34,
  falloffEnd: 78,
  minDamageScale: 0.5,
  penetrationPower: 1.0,
} as const;

/** The .338 bolt gun: the top of the small-arms penetration range. */
const HEAVY_POWER = 2.4;
/** A machine pistol: the bottom of it. */
const PISTOL_POWER = 0.6;

class TestDummy implements Damageable {
  readonly id = allocEntityId();
  readonly team: Team;
  health = 100000;
  readonly maxHealth = 100000;
  readonly position = new THREE.Vector3();
  readonly displayName: string;

  totalDamage = 0;
  hits = 0;
  lastPart = '';
  lastHeadshot = false;

  constructor(name: string, team: Team = 'enemy') {
    this.displayName = name;
    this.team = team;
  }

  get isAlive(): boolean {
    return this.health > 0;
  }

  getPosition(out: THREE.Vector3): THREE.Vector3 {
    return out.copy(this.position);
  }

  applyDamage(info: DamageInfo): void {
    this.health -= info.amount;
    this.totalDamage += info.amount;
    this.hits++;
    this.lastPart = info.bodyPart;
    this.lastHeadshot = info.isHeadshot === true;
  }

  reset(): void {
    this.health = this.maxHealth;
    this.totalDamage = 0;
    this.hits = 0;
    this.lastPart = '';
    this.lastHeadshot = false;
  }
}

interface CombatTestHost {
  fireBullet(options: FireBulletOptions): unknown;
  explode(options: {
    position: THREE.Vector3;
    radius: number;
    damage: number;
    falloff: 'linear' | 'quadratic';
    source: Damageable | null;
    kind: 'grenade' | 'rocket' | 'airstrike' | 'vehicle' | 'barrel';
    impulse: number;
    screenShake?: number;
  }): void;
  raycastEntities(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    ignore?: Damageable | null,
  ): unknown;
  getStats(): { ballistics: { avgShotUs: number; lastShotRays: number; rays: number } };
}

export interface CombatSelfTest {
  run(): unknown;
  dispose(): void;
}

export function installCombatSelfTest(
  host: CombatTestHost,
  deps: CombatDeps,
  registry: DamageRegistry,
): CombatSelfTest | null {
  if (typeof window === 'undefined' || typeof location === 'undefined') return null;
  let enabled = false;
  try {
    enabled = new URLSearchParams(location.search).get('combattest') === '1';
  } catch {
    return null;
  }
  if (!enabled) return null;

  const suite = new CombatSuite(host, deps, registry);
  const api = window as unknown as { __COMBAT_TEST__?: () => unknown };
  api.__COMBAT_TEST__ = () => suite.run();
  return suite;
}

class CombatSuite implements CombatSelfTest {
  private built = false;
  private readonly log = new TraceLog(32);
  private readonly shooter = new TestDummy('TEST SHOOTER', 'player');
  private readonly dummy = new TestDummy('TEST DUMMY');
  private readonly exposed = new TestDummy('BLAST EXPOSED');
  private readonly covered = new TestDummy('BLAST COVERED');
  private readonly grazed = new TestDummy('GRAZE TARGET');
  private readonly friendly = new TestDummy('TEST TEAMMATE', 'player');
  private readonly dummies = [
    this.shooter,
    this.dummy,
    this.exposed,
    this.covered,
    this.grazed,
    this.friendly,
  ];

  private readonly origin = new THREE.Vector3();
  private readonly direction = new THREE.Vector3();
  private readonly centre = new THREE.Vector3();
  private readonly half = new THREE.Vector3();
  private readonly blast = new THREE.Vector3();

  constructor(
    private readonly host: CombatTestHost,
    private readonly deps: CombatDeps,
    private readonly registry: DamageRegistry,
  ) {}

  // -------------------------------------------------------------------------

  run(): unknown {
    const physics = this.deps.physics;
    if (!physics || !physics.ready) {
      console.warn('[combat-test] physics is not ready');
      return null;
    }
    this.build();

    const started = performance.now();
    const penetration = this.testPenetration();
    const power = this.testPenetrationPower();
    const bodyParts = this.testBodyParts();
    const falloff = this.testFalloff();
    const overPenetration = this.testOverPenetration();
    const ricochet = this.testRicochet();
    const kills = this.testKillAndFriendlyFire();
    const occlusion = this.testOcclusion();
    const nearMiss = this.testNearMiss();
    const queries = this.testRaycastEntities();
    const perf = this.benchmark();
    const elapsed = performance.now() - started;

    const failures: string[] = [];
    for (const row of penetration) {
      if (row.passed !== row.expected) {
        failures.push(
          `${row.label}: expected ${row.expected ? 'pass' : 'stop'}, got ${row.passed ? 'pass' : 'stop'}`,
        );
      }
      // The probe is capped at the thickest slab the round could possibly cross,
      // so anything beyond that is only ever measured as "at least this deep".
      const expectMeasured = Math.min(row.thickness, row.probeCap);
      if (row.measured > 0 && Math.abs(row.measured - expectMeasured) > Math.max(0.02, expectMeasured * 0.1)) {
        failures.push(
          `${row.label}: measured ${row.measured.toFixed(3)}m vs expected ${expectMeasured.toFixed(3)}m`,
        );
      }
    }
    if (occlusion.coveredDamage > occlusion.exposedDamage * 0.15) {
      failures.push(
        `cover leaked: covered ${occlusion.coveredDamage.toFixed(1)} vs exposed ${occlusion.exposedDamage.toFixed(1)}`,
      );
    }
    if (bodyParts.headMultiplier < 2.0) failures.push('headshot multiplier not applied');
    if (nearMiss.cracks === 0) failures.push('near miss never registered');
    if (overPenetration.second <= 0) failures.push('round did not over-penetrate the first body');
    if (overPenetration.second >= overPenetration.first) {
      failures.push('second body took no attenuation');
    }
    if (ricochet.metalSquare !== 0) failures.push('square-on shots ricocheted');
    if (ricochet.metalGrazing === 0) failures.push('grazing shots never ricocheted off metal');
    if (ricochet.metalGrazing > ricochet.shots * 0.5) failures.push('ricochet is not rare');
    if (!kills.victimDied || kills.killEvents === 0) failures.push('kill was not registered');
    if (!kills.friendlyFireEnabled && kills.friendlyDamage > 0) {
      failures.push(`friendly fire leaked ${kills.friendlyDamage.toFixed(1)} damage`);
    }
    if (perf.combatBytesPerShot > 64) {
      failures.push(`fireBullet allocates ${perf.combatBytesPerShot.toFixed(0)} B/shot`);
    }

    const result = {
      penetration,
      power,
      bodyParts,
      falloff,
      overPenetration,
      ricochet,
      kills,
      occlusion,
      nearMiss,
      queries,
      perf,
      failures,
      suiteMs: Number(elapsed.toFixed(2)),
    };

    console.info('[combat-test] ===== material tuning (metres of material at power 1.0) =====');
    for (const row of surfaceTable()) {
      console.info(
        `[combat-test] ${row.surface.padEnd(9)} depth=${row.depth.toFixed(3)}m ` +
          `solidity=${row.solidity.toFixed(2)} entry=${row.entryCost.toFixed(3)} ` +
          `cost@10cm=${row.cost10cm.toFixed(3)}`,
      );
    }
    console.info('[combat-test] ===== penetration (5.56, power 1.0) =====');
    for (const row of penetration) {
      console.info(
        `[combat-test] ${row.label.padEnd(24)} measured=${row.measured.toFixed(3)}m ` +
          `(probeCap=${row.probeCap.toFixed(3)}m) cost=${row.cost.toFixed(3)} ` +
          `energyAfter=${row.energy.toFixed(3)} ` +
          `through=${row.passed ? 'YES' : 'no '} exitDamage=${row.exitDamage.toFixed(1)}`,
      );
    }
    console.info('[combat-test] ===== penetration vs weapon power =====');
    for (const row of power) {
      console.info(
        `[combat-test] ${row.label.padEnd(24)} power=${row.power.toFixed(2)} ` +
          `through=${row.passed ? 'YES' : 'no '} exitDamage=${row.exitDamage.toFixed(1)}`,
      );
    }
    console.info(
      `[combat-test] body parts: head=${bodyParts.head.toFixed(1)} chest=${bodyParts.chest.toFixed(1)} ` +
        `leg=${bodyParts.leg.toFixed(1)} headMultiplier=${bodyParts.headMultiplier.toFixed(2)} ` +
        `parts=${bodyParts.resolved.join('/')}`,
    );
    console.info(
      `[combat-test] falloff: ${falloff.map((f) => `${f.distance}m=${f.damage.toFixed(1)}`).join(' ')}`,
    );
    console.info(
      `[combat-test] over-penetration: first=${overPenetration.first.toFixed(1)} ` +
        `second=${overPenetration.second.toFixed(1)} parts=${overPenetration.parts.join('/')}`,
    );
    console.info(
      `[combat-test] ricochet per ${ricochet.shots} shots: metal grazing=${ricochet.metalGrazing} ` +
        `concrete grazing=${ricochet.concreteGrazing} metal square-on=${ricochet.metalSquare}`,
    );
    console.info(
      `[combat-test] kill: died=${kills.victimDied} events=${kills.killEvents} ` +
        `headshot=${kills.killWasHeadshot}; friendly fire ` +
        `${kills.friendlyFireEnabled ? 'on' : 'off'} -> teammate took ${kills.friendlyDamage.toFixed(1)}`,
    );
    console.info(
      `[combat-test] blast occlusion: exposed=${occlusion.exposedDamage.toFixed(1)} ` +
        `covered=${occlusion.coveredDamage.toFixed(1)} ` +
        `visibleExposed=${occlusion.exposedVisible.toFixed(2)} visibleCovered=${occlusion.coveredVisible.toFixed(2)} ` +
        `sightTests=${occlusion.sightTests}`,
    );
    console.info(
      `[combat-test] near miss: cracks=${nearMiss.cracks} approach=${nearMiss.approach.toFixed(2)}m ` +
        `hitsOnGrazeTarget=${nearMiss.hits}`,
    );
    console.info(
      `[combat-test] raycastEntities: hit=${queries.hit} part=${queries.part} ` +
        `distance=${queries.distance.toFixed(2)}m blocked=${queries.blockedByWall}`,
    );
    console.info(
      `[combat-test] perf: fireBullet ${perf.usPerShot.toFixed(2)}us/shot over ${perf.shots * 2} shots ` +
        `(${perf.raysPerShot.toFixed(2)} rays/shot, penetrating wall + body ${perf.usPerPenetratingShot.toFixed(2)}us, ` +
        `open air ${perf.usPerOpenShot.toFixed(2)}us); explode ${perf.usPerExplosion.toFixed(1)}us ` +
        `over ${perf.explosions}`,
    );
    console.info(
      `[combat-test] alloc: combat-only ${perf.combatBytesPerShot.toFixed(1)} B/shot, ` +
        `with fx+audio+world ${perf.fullBytesPerShot.toFixed(1)} B/shot`,
    );
    console.info(
      failures.length === 0
        ? `[combat-test] PASS — all checks green in ${elapsed.toFixed(1)}ms`
        : `[combat-test] FAIL — ${failures.length} issue(s): ${failures.join(' | ')}`,
    );

    (window as unknown as { __COMBAT_TEST_RESULT__?: unknown }).__COMBAT_TEST_RESULT__ = result;
    return result;
  }

  // -------------------------------------------------------------------------
  // Fixture
  // -------------------------------------------------------------------------

  private build(): void {
    if (this.built) return;
    const physics = this.deps.physics;
    if (!physics) return;
    this.built = true;

    // Floor, so hitbox calibration has something to stand on. Wide enough to
    // cover every site the cases below use, including the 200 m falloff lane.
    physics.addStaticBox(
      this.centre.set(0, TEST_Y - 0.5, 60),
      this.half.set(320, 0.5, 220),
      undefined,
      { kind: 'static', surface: 'concrete' } satisfies PhysicsUserData,
    );

    for (let i = 0; i < SLABS.length; i++) {
      const slab = SLABS[i];
      physics.addStaticBox(
        this.centre.set(i * SLAB_SPACING, TEST_Y + 1, 0),
        this.half.set(SLAB_HALF_WIDTH, 1, slab.thickness / 2),
        undefined,
        { kind: 'static', surface: slab.surface } satisfies PhysicsUserData,
      );
    }

    // Cover for the blast occlusion test: concrete taller than a standing man,
    // sitting between the charge and one of the two dummies.
    physics.addStaticBox(
      this.centre.set(COVER_X, TEST_Y + 1.5, COVER_Z),
      this.half.set(6, 1.5, COVER_HALF_Z),
      undefined,
      { kind: 'static', surface: 'concrete' } satisfies PhysicsUserData,
    );

    for (const dummy of this.dummies) {
      this.registry.register(dummy);
      // Parked out of the way until a case needs it.
      this.park(dummy, 0, -1000);
    }
    this.registry.refresh(this.deps.now());
  }

  private park(dummy: TestDummy, x: number, z: number): void {
    dummy.position.set(x, TEST_Y, z);
    dummy.reset();
  }

  private shoot(power: number, tracer = false): FireBulletOptions {
    return {
      origin: this.origin,
      direction: this.direction,
      damage: RIFLE.damage,
      falloffStart: RIFLE.falloffStart,
      falloffEnd: RIFLE.falloffEnd,
      minDamageScale: RIFLE.minDamageScale,
      penetrationPower: power,
      attacker: this.shooter,
      weaponId: 'test_rifle',
      tracer,
      tracerColor: 0xffcc88,
      impulse: 6,
    };
  }

  // -------------------------------------------------------------------------
  // Cases
  // -------------------------------------------------------------------------

  private testPenetration(): PenetrationRow[] {
    const rows: PenetrationRow[] = [];

    for (let i = 0; i < SLABS.length; i++) {
      const slab = SLABS[i];
      const x = i * SLAB_SPACING;
      this.park(this.dummy, x, DUMMY_STANDOFF);
      this.park(this.shooter, x, -MUZZLE_STANDOFF - 2);
      this.registry.refresh(this.deps.now());

      this.attachLog();
      this.origin.set(x, TEST_Y + 1, -MUZZLE_STANDOFF);
      this.direction.set(0, 0, 1);
      this.host.fireBullet(this.shoot(RIFLE.penetrationPower));
      this.detachLog();

      const event = this.log.find('penetrate');
      const entity = this.log.find('entity');
      rows.push({
        label: slab.label,
        surface: slab.surface,
        thickness: slab.thickness,
        measured: event?.thickness ?? 0,
        cost: event?.cost ?? 0,
        energy: event?.energy ?? 0,
        passed: this.dummy.hits > 0,
        expected: slab.expectPass,
        exitDamage: entity?.damage ?? 0,
        predictedCost: penetrationCost(slab.surface, slab.thickness, RIFLE.penetrationPower),
        probeCap: probeCapFor(slab.surface, RIFLE.penetrationPower),
      });
    }
    this.park(this.dummy, 0, -1000);
    return rows;
  }

  /** The same slabs against a sidearm and an anti-materiel rifle. */
  private testPenetrationPower(): Array<{
    label: string;
    power: number;
    passed: boolean;
    exitDamage: number;
  }> {
    const cases: Array<{ index: number; power: number }> = [
      { index: indexOf('concrete wall 25cm'), power: HEAVY_POWER },
      { index: indexOf('concrete wall 25cm'), power: PISTOL_POWER },
      { index: indexOf('concrete kerb 12cm'), power: HEAVY_POWER },
      { index: indexOf('concrete kerb 12cm'), power: RIFLE.penetrationPower },
      { index: indexOf('plaster partition 12cm'), power: PISTOL_POWER },
      { index: indexOf('wooden crate 70cm'), power: PISTOL_POWER },
      { index: indexOf('brick wall 22cm'), power: HEAVY_POWER },
      { index: indexOf('lamp post 28cm'), power: HEAVY_POWER },
    ];
    const rows: Array<{ label: string; power: number; passed: boolean; exitDamage: number }> = [];

    for (const testCase of cases) {
      if (testCase.index < 0) continue;
      const slab = SLABS[testCase.index];
      const x = testCase.index * SLAB_SPACING;
      this.park(this.dummy, x, DUMMY_STANDOFF);
      this.park(this.shooter, x, -MUZZLE_STANDOFF - 2);
      this.registry.refresh(this.deps.now());

      this.attachLog();
      this.origin.set(x, TEST_Y + 1, -MUZZLE_STANDOFF);
      this.direction.set(0, 0, 1);
      this.host.fireBullet(this.shoot(testCase.power));
      this.detachLog();

      const entity = this.log.find('entity');
      rows.push({
        label: slab.label,
        power: testCase.power,
        passed: this.dummy.hits > 0,
        exitDamage: entity?.damage ?? 0,
      });
    }
    this.park(this.dummy, 0, -1000);
    return rows;
  }

  /**
   * Head, chest and leg at point blank with nothing in the way, which is how the
   * body-part multipliers and the height fallback get checked at once.
   */
  private testBodyParts(): {
    head: number;
    chest: number;
    leg: number;
    headMultiplier: number;
    resolved: string[];
  } {
    const x = -60;
    this.park(this.dummy, x, 6);
    this.park(this.shooter, x, 0);
    this.registry.refresh(this.deps.now());
    const resolved: string[] = [];

    const sample = (height: number): number => {
      this.dummy.reset();
      this.origin.set(x, TEST_Y + height, 1);
      this.direction.set(0, 0, 1);
      this.host.fireBullet(this.shoot(RIFLE.penetrationPower));
      resolved.push(this.dummy.lastPart || 'miss');
      return this.dummy.totalDamage;
    };

    const head = sample(1.7);
    const chest = sample(1.3);
    const leg = sample(0.5);
    this.park(this.dummy, 0, -1000);
    return {
      head,
      chest,
      leg,
      headMultiplier: chest > 0 ? head / chest : 0,
      resolved,
    };
  }

  private testFalloff(): Array<{ distance: number; damage: number }> {
    const x = -80;
    const rows: Array<{ distance: number; damage: number }> = [];
    for (const distance of [2, 20, 40, 60, 100, 200]) {
      this.park(this.dummy, x, distance);
      this.park(this.shooter, x, -2);
      this.registry.refresh(this.deps.now());
      this.dummy.reset();
      this.origin.set(x, TEST_Y + 1.3, 0);
      this.direction.set(0, 0, 1);
      this.host.fireBullet(this.shoot(RIFLE.penetrationPower));
      rows.push({ distance, damage: this.dummy.totalDamage });
    }
    this.park(this.dummy, 0, -1000);
    return rows;
  }

  /**
   * The property that matters most: two identical targets the same distance from
   * one grenade, one in the open and one behind a wall.
   */
  private testOcclusion(): {
    exposedDamage: number;
    coveredDamage: number;
    exposedVisible: number;
    coveredVisible: number;
    sightTests: number;
    distance: number;
  } {
    const physics = this.deps.physics;
    this.blast.set(COVER_X, TEST_Y + 0.3, 0);
    // Both dummies the same 3.2 m from the charge. The only difference between
    // them is the concrete at z = 1.8, which stands in front of one of them.
    this.park(this.exposed, COVER_X + 3.2, 0);
    this.park(this.covered, COVER_X, 3.2);
    this.park(this.shooter, COVER_X, -8);
    this.park(this.dummy, 0, -1000);
    this.registry.refresh(this.deps.now());

    const sightBefore = this.sightTests();
    this.host.explode({
      position: this.blast,
      radius: 6,
      damage: 120,
      falloff: 'quadratic',
      source: this.shooter,
      kind: 'grenade',
      impulse: 22,
      screenShake: 0.8,
    });
    const sightTests = this.sightTests() - sightBefore;

    const exposedVisible = this.visibleFraction(this.exposed, physics !== null);
    const coveredVisible = this.visibleFraction(this.covered, physics !== null);
    const result = {
      exposedDamage: this.exposed.totalDamage,
      coveredDamage: this.covered.totalDamage,
      exposedVisible,
      coveredVisible,
      sightTests,
      distance: 3.2,
    };
    this.park(this.exposed, 0, -1000);
    this.park(this.covered, 0, -1000);
    return result;
  }

  /** Independent line-of-sight reading, for the log rather than for the maths. */
  private visibleFraction(dummy: TestDummy, ready: boolean): number {
    const physics = this.deps.physics;
    if (!physics || !ready) return 1;
    let visible = 0;
    const heights = [0.1, 0.55, 0.95, 1.3, 1.6, 1.75];
    for (const height of heights) {
      this.centre.set(dummy.position.x, dummy.position.y + height, dummy.position.z);
      if (physics.lineOfSight(this.blast, this.centre)) visible++;
    }
    return visible / heights.length;
  }

  private sightTests(): number {
    const stats = this.host.getStats() as unknown as {
      explosions?: { sightTests?: number };
    };
    return stats.explosions?.sightTests ?? 0;
  }

  /**
   * One round lined up on two bodies. Soft tissue is cheap to cross, so the round
   * should hurt both, and the second one less than the first.
   */
  private testOverPenetration(): { first: number; second: number; parts: string[] } {
    const x = -220;
    this.park(this.dummy, x, 6);
    this.park(this.grazed, x, 7.2);
    this.park(this.shooter, x, 0);
    this.registry.refresh(this.deps.now());

    this.origin.set(x, TEST_Y + 1.25, 1);
    this.direction.set(0, 0, 1);
    this.host.fireBullet(this.shoot(RIFLE.penetrationPower));

    const result = {
      first: this.dummy.totalDamage,
      second: this.grazed.totalDamage,
      parts: [this.dummy.lastPart || 'miss', this.grazed.lastPart || 'miss'],
    };
    this.park(this.dummy, 0, -1000);
    this.park(this.grazed, 0, -1000);
    return result;
  }

  /**
   * Ricochet has to exist and stay rare. Square-on shots must never deflect;
   * grazing shots on metal should occasionally, and on concrete less often.
   */
  private testRicochet(): {
    metalGrazing: number;
    concreteGrazing: number;
    metalSquare: number;
    shots: number;
  } {
    const shots = 400;
    const count = (index: number, grazing: boolean): number => {
      const before = this.ricochets();
      const x = index * SLAB_SPACING;
      const face = -SLABS[index].thickness / 2;
      for (let i = 0; i < shots; i++) {
        if (grazing) {
          // Along the face rather than into it. One part forward to five parts
          // sideways is 79 degrees off the normal, and the standoff is chosen so
          // the round arrives near the middle of the slab rather than past its edge.
          this.direction.set(1, 0, 0.2).normalize();
          this.origin.set(x - 2, TEST_Y + 1, face - 0.4);
        } else {
          this.direction.set(0, 0, 1);
          this.origin.set(x, TEST_Y + 1, face - MUZZLE_STANDOFF);
        }
        this.host.fireBullet(this.shoot(RIFLE.penetrationPower));
      }
      return this.ricochets() - before;
    };

    const fence = indexOf('fence panel 14cm');
    const wall = indexOf('concrete wall 25cm');
    return {
      metalGrazing: count(fence, true),
      concreteGrazing: count(wall, true),
      metalSquare: count(fence, false),
      shots,
    };
  }

  private ricochets(): number {
    const stats = this.host.getStats() as unknown as {
      ballistics?: { ricochets?: number };
    };
    return stats.ballistics?.ricochets ?? 0;
  }

  /**
   * Death, attribution and the friendly-fire gate. A teammate must be untouchable
   * with `GAMEPLAY.combat.friendlyFire` off, and a kill must announce itself.
   */
  private testKillAndFriendlyFire(): {
    killEvents: number;
    killWasHeadshot: boolean;
    victimDied: boolean;
    friendlyDamage: number;
    friendlyFireEnabled: boolean;
  } {
    const events = this.deps.context?.events;
    let killEvents = 0;
    let killWasHeadshot = false;
    const off = events?.on<{ isHeadshot: boolean }>('combat:kill', (payload) => {
      killEvents++;
      killWasHeadshot = payload.isHeadshot;
    });

    const x = -260;
    this.park(this.dummy, x, 6);
    this.park(this.shooter, x, 0);
    this.dummy.health = 40;
    this.registry.refresh(this.deps.now());
    this.origin.set(x, TEST_Y + 1.68, 1);
    this.direction.set(0, 0, 1);
    this.host.fireBullet(this.shoot(RIFLE.penetrationPower));
    const victimDied = !this.dummy.isAlive;

    // Same shot at a teammate of the shooter.
    this.park(this.friendly, x, 6);
    this.park(this.dummy, 0, -1000);
    this.registry.refresh(this.deps.now());
    this.origin.set(x, TEST_Y + 1.68, 1);
    this.direction.set(0, 0, 1);
    this.host.fireBullet(this.shoot(RIFLE.penetrationPower));
    const friendlyDamage = this.friendly.totalDamage;

    off?.();
    this.park(this.friendly, 0, -1000);
    this.dummy.reset();
    return {
      killEvents,
      killWasHeadshot,
      victimDied,
      friendlyDamage,
      friendlyFireEnabled: GAMEPLAY.combat.friendlyFire,
    };
  }

  /** A round passing 1.1 m to the side must crack past without hitting. */
  private testNearMiss(): { cracks: number; approach: number; hits: number } {
    const x = -140;
    this.park(this.grazed, x + 1.1, 20);
    this.park(this.shooter, x, -2);
    this.registry.refresh(this.deps.now());
    const before = this.whizzBys();
    this.origin.set(x, TEST_Y + 1.3, 0);
    this.direction.set(0, 0, 1);
    this.host.fireBullet(this.shoot(RIFLE.penetrationPower));
    const cracks = this.whizzBys() - before;
    const result = { cracks, approach: 1.1, hits: this.grazed.hits };
    this.park(this.grazed, 0, -1000);
    return result;
  }

  private whizzBys(): number {
    const stats = this.host.getStats() as unknown as {
      ballistics?: { whizzBys?: number };
    };
    return stats.ballistics?.whizzBys ?? 0;
  }

  private testRaycastEntities(): {
    hit: boolean;
    part: string;
    distance: number;
    blockedByWall: boolean;
  } {
    const x = -170;
    this.park(this.dummy, x, 10);
    this.registry.refresh(this.deps.now());
    this.origin.set(x, TEST_Y + 1.65, 0);
    this.direction.set(0, 0, 1);
    const hit = this.host.raycastEntities(this.origin, this.direction, 40, this.shooter) as {
      hit: boolean;
      target: Damageable | null;
      bodyPart: string | null;
      distance: number;
    } | null;

    // Same query with the concrete slab in the way must not reach the dummy.
    const wallIndex = indexOf('concrete wall 25cm');
    this.park(this.dummy, wallIndex * SLAB_SPACING, 10);
    this.registry.refresh(this.deps.now());
    this.origin.set(wallIndex * SLAB_SPACING, TEST_Y + 1, -3);
    const blocked = this.host.raycastEntities(this.origin, this.direction, 40, this.shooter) as {
      target: Damageable | null;
    } | null;
    this.park(this.dummy, 0, -1000);

    return {
      hit: hit?.target !== null && hit?.target !== undefined,
      part: hit?.bodyPart ?? 'none',
      distance: hit?.distance ?? 0,
      blockedByWall: blocked?.target === null || blocked === null,
    };
  }

  // -------------------------------------------------------------------------
  // Benchmark
  // -------------------------------------------------------------------------

  private benchmark(): {
    shots: number;
    usPerShot: number;
    usPerPenetratingShot: number;
    usPerOpenShot: number;
    raysPerShot: number;
    explosions: number;
    usPerExplosion: number;
    /** Heap growth across shots that only touch combat and physics. */
    combatBytesPerShot: number;
    /** Heap growth across shots that also drive fx, audio and world destruction. */
    fullBytesPerShot: number;
  } {
    const crate = indexOf('wooden crate 70cm') * SLAB_SPACING;
    const open = -200;
    this.park(this.dummy, crate, DUMMY_STANDOFF);
    this.park(this.shooter, crate, -MUZZLE_STANDOFF - 2);
    this.registry.refresh(this.deps.now());

    const warmup = 200;
    const shots = 3000;

    // Warm the JIT before either measurement.
    for (let i = 0; i < warmup; i++) {
      this.origin.set(crate, TEST_Y + 1, -MUZZLE_STANDOFF);
      this.direction.set(0, 0, 1);
      this.host.fireBullet(this.shoot(RIFLE.penetrationPower));
    }

    const heap = () => {
      const perf = performance as unknown as { memory?: { usedJSHeapSize?: number } };
      const gc = (window as unknown as { gc?: () => void }).gc;
      if (gc) gc();
      return perf.memory?.usedJSHeapSize ?? 0;
    };

    const fullHeapBefore = heap();
    const raysBefore = this.rayCount();
    const penStart = performance.now();
    for (let i = 0; i < shots; i++) {
      this.origin.set(crate, TEST_Y + 1, -MUZZLE_STANDOFF);
      this.direction.set(0, 0, 1 + (i % 7) * 1e-4);
      this.host.fireBullet(this.shoot(RIFLE.penetrationPower));
    }
    const penElapsed = performance.now() - penStart;
    const rays = this.rayCount() - raysBefore;
    const fullHeapDelta = heap() - fullHeapBefore;

    // Open air touches nothing but combat and one physics raycast, which isolates
    // this module's own allocation behaviour from fx, audio and world destruction.
    this.park(this.dummy, 0, -1000);
    this.registry.refresh(this.deps.now());
    const combatHeapBefore = heap();
    const openStart = performance.now();
    for (let i = 0; i < shots; i++) {
      this.origin.set(open, TEST_Y + 30, 0);
      this.direction.set(0, 0.4, 1).normalize();
      this.host.fireBullet(this.shoot(RIFLE.penetrationPower));
    }
    const openElapsed = performance.now() - openStart;
    const combatHeapDelta = heap() - combatHeapBefore;

    const explosions = 200;
    this.park(this.exposed, -30 + 3.2, 0);
    this.park(this.covered, -30, 3.2);
    this.registry.refresh(this.deps.now());
    this.blast.set(-30, TEST_Y + 0.3, 0);
    const blastStart = performance.now();
    for (let i = 0; i < explosions; i++) {
      this.exposed.reset();
      this.covered.reset();
      this.host.explode({
        position: this.blast,
        radius: 6,
        damage: 120,
        falloff: 'quadratic',
        source: this.shooter,
        kind: 'grenade',
        impulse: 22,
      });
    }
    const blastElapsed = performance.now() - blastStart;
    this.park(this.exposed, 0, -1000);
    this.park(this.covered, 0, -1000);

    return {
      shots,
      usPerShot: ((penElapsed + openElapsed) * 1000) / (shots * 2),
      usPerPenetratingShot: (penElapsed * 1000) / shots,
      usPerOpenShot: (openElapsed * 1000) / shots,
      raysPerShot: rays / shots,
      explosions,
      usPerExplosion: (blastElapsed * 1000) / explosions,
      combatBytesPerShot: combatHeapDelta / shots,
      fullBytesPerShot: fullHeapDelta / shots,
    };
  }

  private rayCount(): number {
    return this.host.getStats().ballistics.rays;
  }

  // -------------------------------------------------------------------------

  private attachLog(): void {
    const internal = this.host as unknown as { bullets?: { log: TraceLog | null } };
    if (internal.bullets) internal.bullets.log = this.log;
  }

  private detachLog(): void {
    const internal = this.host as unknown as { bullets?: { log: TraceLog | null } };
    if (internal.bullets) internal.bullets.log = null;
  }

  dispose(): void {
    for (const dummy of this.dummies) this.registry.unregister(dummy);
    const api = window as unknown as { __COMBAT_TEST__?: unknown };
    delete api.__COMBAT_TEST__;
  }
}

/** Deepest the back-face probe looks for a full-energy round of this power. */
function probeCapFor(surface: SurfaceType, power: number): number {
  return Math.min(maxCrossableThickness(surface, power, 1) + PROBE_SKIN, PROBE_CEILING);
}

function indexOf(label: string): number {
  for (let i = 0; i < SLABS.length; i++) {
    if (SLABS[i].label === label) return i;
  }
  return -1;
}

/** Reference numbers for the log, so the tuning table is visible in the output. */
export function surfaceTable(): Array<{
  surface: string;
  depth: number;
  solidity: number;
  entryCost: number;
  cost10cm: number;
}> {
  const rows: Array<{
    surface: string;
    depth: number;
    solidity: number;
    entryCost: number;
    cost10cm: number;
  }> = [];
  for (const key of Object.keys(SURFACE_BALLISTICS) as SurfaceType[]) {
    const mat = SURFACE_BALLISTICS[key];
    rows.push({
      surface: key,
      depth: Number(mat.depth.toFixed(4)),
      solidity: mat.solidity,
      entryCost: Number(mat.entryCost.toFixed(4)),
      cost10cm: Number(penetrationCost(key, 0.1, 1).toFixed(4)),
    });
  }
  return rows;
}
