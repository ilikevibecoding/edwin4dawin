/**
 * World assembly.
 *
 * Owns every object in the piece and exposes a small, explicit state surface
 * for the timeline to drive. Two regions exist:
 *
 *   EXTERIOR  space, planet, both ships, the pod in flight — at the origin;
 *   INTERIOR  the corridor, pod bay, cast and effects — parked far below at
 *             y = −6000 so the two can never light or shadow each other.
 *
 * Only one region is visible at a time. Because the regions do not overlap,
 * switching is a visibility flag rather than a scene rebuild, which keeps
 * timeline scrubbing instant.
 */

import * as THREE from 'three';
import type { QualitySettings } from '../core/quality';
import { stream } from '../core/rng';
import { Starfield } from '../scene/starfield';
import { Tatooine, makeSunDisc, PLANET_RADIUS } from '../scene/tatooine';
import { EnvironmentSet } from '../scene/environment';
import { BlockadeRunner } from '../ships/blockade-runner';
import { ImperialDestroyer } from '../ships/imperial-destroyer';
import { EscapePod } from '../ships/escape-pod';
import { Corridor, SECTION_LENGTH, CORRIDOR_WIDTH, CORRIDOR_HEIGHT } from '../interior/corridor';
import { BlastDoor } from '../interior/door';
import { PodBay, BAY_DEPTH } from '../interior/pod-bay';
import { BoltSystem } from '../fx/bolts';
import { SparkSystem, SmokeSystem, DebrisSystem } from '../fx/particles';
import { ShieldFlashSystem } from '../fx/shield';
import { DataProjection } from '../fx/data-projection';
import { RebelTrooper, Stormtrooper, DarkLord, Princess, ImperialOfficer } from '../characters/humans';
import { AstroDroid, ProtocolDroid } from '../characters/droids';
import { metalMaterial } from '../assets/materials';

export const INTERIOR_ORIGIN = new THREE.Vector3(0, -6000, 0);
/** Distance along the corridor of each staging mark, in metres. */
export const CORRIDOR_MARKS = {
  breachDoor: 3.0,
  troopEntry: 4.5,
  troopAdvance: 12.5,
  rebelLine: 17.5,
  rebelFallback: 21.5,
  midCorridor: 28.0,
  leiaStart: 46.0,
  transfer: 49.5,
  bayDoor: 55.0,
} as const;

export const CORRIDOR_SECTIONS = 15;

/**
 * Corridor station of the pod bay's centre. The bay's forward wall is flush
 * with the aft end of the corridor, so the two sets never overlap.
 */
export const BAY_STATION = CORRIDOR_SECTIONS * SECTION_LENGTH + BAY_DEPTH / 2;

/**
 * Exterior key rig, in one place so the constructor and `setExteriorMood`
 * cannot drift apart. The fill is deliberately strong: the destroyer's belly
 * is the subject of the piece's biggest shot and it faces away from the star.
 */
const KEY_BASE = 4.6;
const FILL_BASE = 2.4;
const RIM_BASE = 1.5;
const AMBIENT_BASE = 1.2;

export type Region = 'exterior' | 'interior';

export interface Selectable {
  id: string;
  title: string;
  kind: string;
  blurb: string;
  facts: Array<[string, string]>;
  /** Root object used for picking, focusing and highlighting. */
  object: THREE.Object3D;
  /** Approximate radius for framing an inspect shot. */
  radius: number;
  region: Region;
}

export class World {
  readonly quality: QualitySettings;

  /* --- sky --- */
  readonly starfield: Starfield;
  readonly planet: Tatooine;
  readonly sunPrimary: THREE.Mesh;
  readonly sunSecondary: THREE.Mesh;
  readonly sunDirection = new THREE.Vector3(0.52, 0.34, 0.78).normalize();

  /* --- exterior --- */
  readonly exterior = new THREE.Group();
  readonly runner: BlockadeRunner;
  readonly destroyer: ImperialDestroyer;
  readonly pod: EscapePod;
  readonly exteriorBolts: BoltSystem;
  readonly exteriorSparks: SparkSystem;
  readonly exteriorDebris: DebrisSystem;
  readonly shields: ShieldFlashSystem;
  private keyLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private spaceAmbient: THREE.HemisphereLight;

  /* --- interior --- */
  readonly interior = new THREE.Group();
  readonly corridor: Corridor;
  readonly blastDoor: BlastDoor;
  readonly podBay: PodBay;
  readonly interiorBolts: BoltSystem;
  readonly interiorSparks: SparkSystem;
  readonly smoke: SmokeSystem;
  readonly interiorDebris: DebrisSystem;
  readonly plans: DataProjection;
  /**
   * Interior effects live at the scene root rather than inside the offset
   * interior group, because every effect is emitted at a world-space position.
   */
  private interiorFx = new THREE.Group();
  private interiorAmbient: THREE.HemisphereLight;
  private vaderKey: THREE.SpotLight;
  private vaderKeyTarget = new THREE.Object3D();

  /* --- cast --- */
  readonly rebels: RebelTrooper[] = [];
  readonly troopers: Stormtrooper[] = [];
  readonly officer: ImperialOfficer;
  readonly vader: DarkLord;
  readonly leia: Princess;
  readonly r2: AstroDroid;
  readonly c3po: ProtocolDroid;

  readonly selectables: Selectable[] = [];
  private environment: EnvironmentSet | null = null;
  private region: Region = 'exterior';
  private scene: THREE.Scene;
  private viewportHeight = 900;

  constructor(scene: THREE.Scene, sky: THREE.Scene, quality: QualitySettings) {
    this.quality = quality;
    this.scene = scene;
    const rng = stream('world');

    /* ------------------------------------------------------------- sky */
    this.starfield = new Starfield(quality.starCount, 1);
    sky.add(this.starfield.group);

    const sunB = new THREE.Vector3(0.3, 0.16, 0.94).normalize();
    this.planet = new Tatooine({
      segments: quality.sphereSegments,
      sunA: this.sunDirection,
      sunB,
    });
    this.planet.setDetail(1);
    // Below and ahead: the ships fly above the day/night terminator.
    // Below and a little ahead: the ships run above the terminator. Far enough
    // that the sphere reads as a sphere (it subtends roughly 59°).
    this.planet.group.position.set(-2200, -5400, -1800);
    sky.add(this.planet.group);

    this.sunPrimary = makeSunDisc('#fff4e0', 1400, 'SunPrimary');
    this.sunPrimary.position.copy(this.sunDirection).multiplyScalar(19000);
    sky.add(this.sunPrimary);
    this.sunSecondary = makeSunDisc('#ffb173', 780, 'SunSecondary');
    this.sunSecondary.position.copy(sunB).multiplyScalar(19000).add(new THREE.Vector3(1900, -700, 0));
    sky.add(this.sunSecondary);

    /* -------------------------------------------------------- exterior */
    this.exterior.name = 'Exterior';
    scene.add(this.exterior);

    this.keyLight = new THREE.DirectionalLight(0xfff6ec, KEY_BASE);
    this.keyLight.position.copy(this.sunDirection).multiplyScalar(4000);
    this.keyLight.castShadow = false;
    this.exterior.add(this.keyLight);
    // Planetshine from below. Without a strong bounce the destroyer's
    // underside — the shot the whole reveal depends on — is a black wedge.
    // Held close to neutral: this is the *dominant* light on every belly in
    // the piece, so any real saturation here turns grey armour into leather.
    this.fillLight = new THREE.DirectionalLight(0xeceff2, FILL_BASE);
    this.fillLight.position.set(-700, -3000, -1400);
    this.exterior.add(this.fillLight);
    // Cold rim from the opposite side of the sky.
    this.rimLight = new THREE.DirectionalLight(0xa8c6ff, RIM_BASE);
    this.rimLight.position.set(-1800, 900, 2400);
    this.exterior.add(this.rimLight);
    // Sky half cool, ground half a hair warm — the whole desert cue, and no
    // more than that.
    this.spaceAmbient = new THREE.HemisphereLight(0x6b7488, 0x7a7770, AMBIENT_BASE);
    this.exterior.add(this.spaceAmbient);

    this.runner = new BlockadeRunner(quality, 'runner');
    this.exterior.add(this.runner.group);

    this.destroyer = new ImperialDestroyer(quality, 'destroyer');
    this.exterior.add(this.destroyer.group);

    this.pod = new EscapePod('pod');
    this.pod.group.visible = false;
    this.exterior.add(this.pod.group);

    this.exteriorBolts = new BoltSystem(Math.round(48 * Math.max(0.5, quality.particleScale)));
    this.exterior.add(this.exteriorBolts.group);
    this.exteriorSparks = new SparkSystem(Math.round(900 * quality.particleScale), 1);
    this.exterior.add(this.exteriorSparks.points);
    this.exteriorDebris = new DebrisSystem(
      Math.round(60 * quality.particleScale),
      metalMaterial('hullDebris', '#8d8f8c', 0.7, 0.5),
    );
    this.exterior.add(this.exteriorDebris.mesh);
    this.shields = new ShieldFlashSystem(5, '#79c8ff');
    this.exterior.add(this.shields.group);

    /* -------------------------------------------------------- interior */
    this.interior.name = 'Interior';
    this.interior.position.copy(INTERIOR_ORIGIN);
    this.interior.visible = false;
    scene.add(this.interior);

    this.corridor = new Corridor(quality, {
      sections: CORRIDOR_SECTIONS,
      seed: 'runner-corridor',
      battleDamage: 0.9,
    });
    this.interior.add(this.corridor.group);

    this.blastDoor = new BlastDoor(quality, 'breach-door');
    this.blastDoor.group.position.set(0, 0, CORRIDOR_MARKS.breachDoor);
    this.interior.add(this.blastDoor.group);

    this.podBay = new PodBay();
    this.podBay.group.position.set(0, 0, BAY_STATION);
    this.interior.add(this.podBay.group);

    this.interiorAmbient = new THREE.HemisphereLight(0xbfcadd, 0x2a2d33, 0.42);
    this.interior.add(this.interiorAmbient);
    // Vader's light is a *back* light, not a fill. A red lamp in the middle of
    // the corridor turns every white panel pink; one behind him rims the
    // silhouette and leaves the rest of the set cold, which is the point.
    this.vaderKey = new THREE.SpotLight(0xff3a28, 0, 6.5, 0.42, 0.8, 1.7);
    this.vaderKey.position.set(0, 2.35, CORRIDOR_MARKS.troopEntry);
    this.vaderKeyTarget.position.set(0, 0.9, CORRIDOR_MARKS.troopEntry + 6);
    this.interior.add(this.vaderKey);
    this.interior.add(this.vaderKeyTarget);
    this.vaderKey.target = this.vaderKeyTarget;

    this.interiorFx.name = 'InteriorEffects';
    this.interiorFx.visible = false;
    scene.add(this.interiorFx);

    this.interiorBolts = new BoltSystem(Math.round(64 * Math.max(0.5, quality.particleScale)));
    this.interiorFx.add(this.interiorBolts.group);
    this.interiorSparks = new SparkSystem(Math.round(1100 * quality.particleScale), 1);
    this.interiorSparks.gravity = 5.5;
    this.interiorFx.add(this.interiorSparks.points);
    this.smoke = new SmokeSystem(Math.round(150 * quality.particleScale));
    this.smoke.setTint('#9aa0a6');
    this.smoke.wind.set(0, 0.22, 0.16);
    this.interiorFx.add(this.smoke.mesh);
    this.interiorDebris = new DebrisSystem(
      Math.round(56 * quality.particleScale),
      metalMaterial('doorDebris', '#6f7378', 0.75, 0.5),
    );
    this.interiorDebris.gravity = 7;
    this.interiorFx.add(this.interiorDebris.mesh);

    this.plans = new DataProjection(quality, 'plans');
    this.plans.setScale(0.56);
    // Off Leia's shoulder rather than in front of her face: the shot has to
    // read as a person *and* the thing she is carrying, not as a wire sphere
    // with a white dress behind it.
    this.plans.group.position.set(0.78, 1.34, CORRIDOR_MARKS.transfer - 0.9);
    this.plans.setReveal(0);
    this.interior.add(this.plans.group);

    /* ------------------------------------------------------------ cast */
    const rebelCount = Math.max(4, Math.round(6 * quality.crowdScale));
    for (let i = 0; i < rebelCount; i++) {
      const r = new RebelTrooper({ seed: `rebel-${i}` });
      r.placeAt(0, CORRIDOR_MARKS.rebelLine + i * 1.4, Math.PI);
      this.interior.add(r.group);
      this.rebels.push(r);
    }
    const trooperCount = Math.max(4, Math.round(7 * quality.crowdScale));
    for (let i = 0; i < trooperCount; i++) {
      const t = new Stormtrooper({ seed: `trooper-${i}` });
      t.placeAt(0, CORRIDOR_MARKS.breachDoor - 3 - i * 1.2, 0);
      t.group.visible = false;
      this.interior.add(t.group);
      this.troopers.push(t);
    }

    this.officer = new ImperialOfficer({ seed: 'officer' });
    this.officer.placeAt(0.9, CORRIDOR_MARKS.breachDoor - 4, 0);
    this.officer.group.visible = false;
    this.interior.add(this.officer.group);

    this.vader = new DarkLord({ seed: 'vader' });
    this.vader.placeAt(0, CORRIDOR_MARKS.breachDoor - 3.5, 0);
    this.vader.group.visible = false;
    this.interior.add(this.vader.group);

    this.leia = new Princess({ seed: 'leia' });
    this.leia.placeAt(-0.62, CORRIDOR_MARKS.leiaStart, 0);
    this.interior.add(this.leia.group);

    this.r2 = new AstroDroid({ seed: 'r2' });
    this.r2.placeAt(0.6, CORRIDOR_MARKS.transfer, Math.PI);
    this.interior.add(this.r2.group);

    this.c3po = new ProtocolDroid({ seed: 'c3po' });
    this.c3po.placeAt(-0.85, CORRIDOR_MARKS.transfer - 1.6, 0.4);
    this.interior.add(this.c3po.group);

    void rng;
    this.buildSelectables();
  }

  /** Build the pre-filtered environments once the renderer exists. */
  attachEnvironment(renderer: THREE.WebGLRenderer): void {
    this.environment = new EnvironmentSet(
      renderer,
      this.sunDirection,
      new THREE.Vector3(-0.2, -1, -0.35).normalize(),
    );
    this.environment.apply(this.scene, 'space', 0.9);
  }

  /* ------------------------------------------------------------- region */

  setRegion(r: Region): void {
    if (this.region === r) return;
    this.region = r;
    this.exterior.visible = r === 'exterior';
    this.interior.visible = r === 'interior';
    this.interiorFx.visible = r === 'interior';
    this.environment?.apply(this.scene, r === 'exterior' ? 'space' : 'interior', r === 'exterior' ? 0.9 : 0.5);
  }

  get currentRegion(): Region {
    return this.region;
  }

  /* ------------------------------------------------------------ helpers */

  /** Convert a corridor station into a world position. */
  corridorPoint(distance: number, lateral = 0, height = 0): THREE.Vector3 {
    return new THREE.Vector3(lateral, height, distance).add(INTERIOR_ORIGIN);
  }

  /* ------------------------------------------------------- selectables */

  private buildSelectables(): void {
    const add = (s: Selectable) => this.selectables.push(s);

    add({
      id: 'runner',
      title: 'Sunspire — corvette',
      kind: 'Rebel Alliance · consular ship',
      blurb:
        'A hundred and fifty metres of civilian hull with a diplomatic transponder and eleven engines it should not need. The hammerhead forward section carries the bridge; everything aft of the neck is drive.',
      facts: [
        ['Length', '146 m'],
        ['Drives', '11 ion engines'],
        ['Armament', '2 light turrets'],
        ['Complement', '~30'],
      ],
      object: this.runner.group,
      radius: 90,
      region: 'exterior',
    });

    add({
      id: 'destroyer',
      title: 'Iron Sabre — destroyer',
      kind: 'Imperial Navy · line capital ship',
      blurb:
        'A kilometre and a half of grey wedge. The dorsal plate is scored with service trenches; the command tower sits far aft between two sensor globes; the belly opens into a hangar throat large enough to swallow the corvette entire.',
      facts: [
        ['Length', '1 600 m'],
        ['Beam', '890 m'],
        ['Batteries', '7 tracked turrets'],
        ['Crew', 'tens of thousands'],
      ],
      object: this.destroyer.group,
      radius: 900,
      region: 'exterior',
    });

    add({
      id: 'planet',
      title: 'Tatooine',
      kind: 'Outer system · desert world',
      blurb:
        'Two suns, one ocean of sand, and almost nothing worth taking. Its entire strategic value is that nobody is looking at it.',
      facts: [
        ['Class', 'Arid terrestrial'],
        ['Stars', 'Binary'],
        ['Traffic', 'Negligible'],
      ],
      object: this.planet.group,
      radius: PLANET_RADIUS,
      region: 'exterior',
    });

    add({
      id: 'pod',
      title: 'Class-C escape pod',
      kind: 'Lifeboat',
      blurb:
        'Five metres of hull, four retro thrusters and a beacon nobody is obliged to answer. Rated for two crew, no armament, and precisely one journey.',
      facts: [
        ['Length', '5.0 m'],
        ['Thrusters', '4 retro'],
        ['Occupants', '2 droids'],
      ],
      object: this.pod.group,
      radius: 4,
      region: 'exterior',
    });

    add({
      id: 'leia',
      title: 'The Princess',
      kind: 'Envoy of the Rebel Alliance',
      blurb:
        'She is carrying the technical readout of a weapon that can end a world, and she is entirely aware of what it is worth. She will not be caught holding it.',
      facts: [['Rank', 'Senator'], ['Carrying', 'Station schematics']],
      object: this.leia.group,
      radius: 1.1,
      region: 'interior',
    });

    add({
      id: 'vader',
      title: 'The Dark Lord',
      kind: 'Imperial enforcer',
      blurb:
        'Two metres of black armour over a life-support system you can hear from the far end of a corridor. He arrives only after the shooting stops, which is itself a kind of statement.',
      facts: [['Height', '2.03 m'], ['Arrives', 'Last'], ['Sidearm', 'None visible']],
      object: this.vader.group,
      radius: 1.4,
      region: 'interior',
    });

    add({
      id: 'r2',
      title: 'Astromech unit',
      kind: 'Courier',
      blurb:
        'A barrel of tools, sensors and stubbornness. Given the plans and a heading, it simply goes: no argument, no hesitation, no contingency required.',
      facts: [['Height', '1.06 m'], ['Legs', '3 (one retractable)'], ['Payload', 'The plans']],
      object: this.r2.group,
      radius: 0.8,
      region: 'interior',
    });

    add({
      id: 'c3po',
      title: 'Protocol droid',
      kind: 'Reluctant companion',
      blurb:
        'Fluent in a great many forms of communication, none of them useful during a boarding action. It follows the astromech because standing still is worse.',
      facts: [['Height', '1.71 m'], ['Plating', 'Gold alloy'], ['Confidence', 'Low']],
      object: this.c3po.group,
      radius: 1,
      region: 'interior',
    });

    add({
      id: 'corridor',
      title: 'Main passage, deck two',
      kind: 'Corvette interior',
      blurb:
        'Sixty metres of moulded white panelling, a grated deck and an amber guide strip. Built for envoys walking to a reception, not for a firefight.',
      facts: [['Length', `${CORRIDOR_SECTIONS * SECTION_LENGTH} m`], ['Width', `${CORRIDOR_WIDTH} m`], ['Height', `${CORRIDOR_HEIGHT} m`]],
      object: this.corridor.group,
      radius: 12,
      region: 'interior',
    });

    add({
      id: 'plans',
      title: 'The stolen readout',
      kind: 'Holographic data projection',
      blurb:
        'A complete engineering schematic: hull sections, reactor feeds, the equatorial construction trench, and a thermal exhaust path its designers considered too small to matter.',
      facts: [['Format', 'Volumetric'], ['Size', 'One droid'], ['Copies', 'One']],
      object: this.plans.group,
      radius: 1.2,
      region: 'interior',
    });

    add({
      id: 'podbay',
      title: 'Escape-pod bay',
      kind: 'Corvette interior · aft',
      blurb:
        'A launch tube, a control plinth and a hazard-striped deck. The bay is designed to be used exactly once, by people who are already having a bad day.',
      facts: [['Tubes', '1 shown'], ['Cycle', '11 s']],
      object: this.podBay.group,
      radius: 5,
      region: 'interior',
    });

    for (let i = 0; i < this.troopers.length; i++) {
      add({
        id: `trooper-${i}`,
        title: 'Imperial stormtrooper',
        kind: 'Boarding party',
        blurb:
          'Sealed white armour over a black bodyglove. Advances in pairs behind suppressing fire and does not break formation without an order.',
        facts: [['Armour', 'Sealed plate'], ['Weapon', 'Blaster carbine']],
        object: this.troopers[i].group,
        radius: 1.1,
        region: 'interior',
      });
    }
    for (let i = 0; i < this.rebels.length; i++) {
      add({
        id: `rebel-${i}`,
        title: 'Rebel fleet trooper',
        kind: 'Consular ship security',
        blurb:
          'Ship security, not infantry: a padded flak vest, an open helmet and a carbine meant for pirates. They hold the corridor anyway.',
        facts: [['Role', 'Ship security'], ['Weapon', 'Blaster carbine']],
        object: this.rebels[i].group,
        radius: 1.1,
        region: 'interior',
      });
    }
  }

  /** Everything currently eligible for hover/click in Explore mode. */
  activeSelectables(): Selectable[] {
    return this.selectables.filter((s) => s.region === this.region && s.object.visible);
  }

  /* --------------------------------------------------------- lighting */

  /**
   * Cross-fades the exterior key rig toward a "captured, in shadow" look.
   * `sunlit` scales the star; `shadowFill` keeps the shadow side legible, so
   * even in full eclipse nothing important drops below a readable value.
   */
  setExteriorMood(sunlit: number, shadowFill: number): void {
    this.keyLight.intensity = KEY_BASE * (0.34 + 0.66 * sunlit);
    this.fillLight.intensity = FILL_BASE * (0.72 + 0.28 * shadowFill);
    this.rimLight.intensity = RIM_BASE * (0.6 + 0.4 * shadowFill);
    this.spaceAmbient.intensity = AMBIENT_BASE * (0.78 + 0.22 * shadowFill);
  }

  setInteriorMood(level: number, vaderPresence: number): void {
    this.corridor.setLightLevel(level);
    this.podBay.setLightLevel(level);
    this.interiorAmbient.intensity = 0.42 * level * (1 - vaderPresence * 0.45);
    this.vaderKey.intensity = vaderPresence * 26;
    // The barest shift. His weight comes from the corridor dimming and the
    // rim behind him, not from repainting the walls.
    this.corridor.setTint('#ff9b7a', vaderPresence * 0.07);
  }

  /** Keeps the back light 2.2 m behind Vader as he walks up the corridor. */
  setVaderKeyPosition(worldZ: number): void {
    const z = worldZ - INTERIOR_ORIGIN.z;
    this.vaderKey.position.z = z - 1.7;
    this.vaderKeyTarget.position.z = z + 1.2;
  }

  /* ----------------------------------------------------------- update */

  update(dt: number, elapsed: number, camera: THREE.Camera): void {
    this.starfield.update(elapsed);
    this.planet.update(elapsed);

    // Point sprites are sized in metres, so they need the current projection.
    const cam = camera as THREE.PerspectiveCamera;
    if (cam.isPerspectiveCamera) {
      this.exteriorSparks.setProjection(this.viewportHeight, cam.fov);
      this.interiorSparks.setProjection(this.viewportHeight, cam.fov);
    }

    if (this.region === 'exterior') {
      this.runner.update(dt, elapsed);
      this.destroyer.update(dt, elapsed);
      if (this.pod.group.visible) this.pod.update(dt, elapsed);
      this.exteriorBolts.update(dt, camera);
      this.exteriorSparks.update(dt);
      this.exteriorDebris.update(dt);
      this.shields.update(dt);
    } else {
      this.corridor.update(dt, elapsed);
      this.blastDoor.update(dt, elapsed);
      this.podBay.update(dt, elapsed);
      this.interiorBolts.update(dt, camera);
      this.interiorSparks.update(dt);
      this.interiorDebris.update(dt);
      this.smoke.update(dt, camera);
      this.plans.update(dt, elapsed);
      if (this.pod.group.visible && this.pod.group.parent === this.podBay.podSeat) {
        this.pod.update(dt, elapsed);
      }
      for (const r of this.rebels) if (r.group.visible) r.update(dt, elapsed);
      for (const t of this.troopers) if (t.group.visible) t.update(dt, elapsed);
      if (this.officer.group.visible) this.officer.update(dt, elapsed);
      if (this.vader.group.visible) this.vader.update(dt, elapsed);
      if (this.leia.group.visible) this.leia.update(dt, elapsed);
      if (this.r2.group.visible) this.r2.update(dt, elapsed);
      if (this.c3po.group.visible) this.c3po.update(dt, elapsed);
    }
  }

  /** Clears every transient effect. Called whenever the timeline is seeked. */
  clearTransients(): void {
    this.exteriorBolts.clear();
    this.interiorBolts.clear();
    this.exteriorSparks.clear();
    this.interiorSparks.clear();
    this.exteriorDebris.clear();
    this.interiorDebris.clear();
    this.smoke.clear();
    this.shields.clear();
  }

  setPixelRatio(r: number): void {
    this.starfield.setPixelRatio(r);
    this.exteriorSparks.setPixelRatio(r);
    this.interiorSparks.setPixelRatio(r);
  }

  setViewportHeight(h: number): void {
    this.viewportHeight = Math.max(1, h);
  }

  dispose(): void {
    this.environment?.dispose();
  }
}
