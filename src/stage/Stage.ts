import * as THREE from 'three';
import type { QualityTier } from '../core/Settings';
import { Starfield } from '../assets/world/Starfield';
import { Tatooine } from '../assets/world/Tatooine';
import { StarDestroyer } from '../assets/ships/StarDestroyer';
import { BlockadeRunner } from '../assets/ships/BlockadeRunner';
import { EscapePod } from '../assets/ships/EscapePod';
import { Corridor, CORRIDOR } from '../assets/interior/Corridor';
import { Effects } from '../fx/Effects';
import { ShieldBubble } from '../fx/ShieldBubble';
import { DataProjection } from '../fx/DataProjection';
import {
  Astromech,
  DarkLord,
  Princess,
  ProtocolDroid,
  RebelTrooper,
  ShipOfficer,
  Stormtrooper,
} from '../assets/characters';
import type { CharacterRig } from '../assets/characters/CharacterRig';
import { disposeObject } from '../core/dispose';
import { setTextureAnisotropy } from '../assets/textures';

export type StageLocation = 'space' | 'interior';

export interface SelectableInfo {
  id: string;
  label: string;
  description: string;
  /** Object used for picking and for the focus target. */
  object: THREE.Object3D;
  /** Radius used to frame the object in Inspect mode. */
  radius: number;
  location: StageLocation;
}

/**
 * Owns every object in the world and the two locations the story moves between.
 *
 * Locations are separate roots under one scene: switching hides one subtree and
 * shows the other, and swaps the camera clip planes (space needs a 300 km far
 * plane, the corridor needs a 5 cm near plane). Assets are built once at load
 * and reused, apart from the prologue titles which are genuinely disposed.
 */
export class Stage {
  readonly scene = new THREE.Scene();
  readonly spaceRoot = new THREE.Group();
  readonly interiorRoot = new THREE.Group();

  readonly starfield: Starfield;
  readonly planet: Tatooine;
  readonly planetPivot = new THREE.Group();
  readonly destroyer: StarDestroyer;
  readonly runner: BlockadeRunner;
  readonly pod: EscapePod;
  readonly runnerShield: ShieldBubble;
  readonly corridor: Corridor;
  readonly fx: Effects;
  readonly dataProjection: DataProjection;

  readonly characters: {
    leia: Princess;
    vader: DarkLord;
    r2: Astromech;
    threepio: ProtocolDroid;
    rebels: RebelTrooper[];
    officer: ShipOfficer;
    troopers: Stormtrooper[];
  };
  readonly allCharacters: CharacterRig[] = [];

  readonly selectables: SelectableInfo[] = [];

  location: StageLocation = 'space';

  // Lighting
  readonly sunLight: THREE.DirectionalLight;
  readonly fillLight: THREE.DirectionalLight;
  readonly rimLight: THREE.DirectionalLight;
  readonly spaceAmbient: THREE.AmbientLight;
  readonly interiorAmbient: THREE.HemisphereLight;
  readonly interiorFill: THREE.AmbientLight;
  readonly sunDirection = new THREE.Vector3(0.62, 0.26, -0.74).normalize();

  private tier: QualityTier;

  constructor(tier: QualityTier, onProgress?: (label: string, t: number) => void) {
    this.tier = tier;
    this.scene.name = 'Stage';
    this.scene.background = new THREE.Color(0x02030a);
    this.scene.add(this.spaceRoot, this.interiorRoot);
    this.spaceRoot.name = 'SpaceRoot';
    this.interiorRoot.name = 'InteriorRoot';

    const step = (label: string, t: number): void => onProgress?.(label, t);

    // ---- Space ------------------------------------------------------------
    step('Seeding the star field', 0.05);
    this.starfield = new Starfield(tier.starCount, 120000);
    this.spaceRoot.add(this.starfield.root);

    step('Baking a desert world', 0.15);
    this.planet = new Tatooine({ radius: 12000, segments: tier.planetSegments });
    this.planetPivot.name = 'PlanetPivot';
    this.planetPivot.add(this.planet.root);
    this.planetPivot.position.set(0, -14200, 0);
    this.spaceRoot.add(this.planetPivot);
    this.planet.setSunDirection(this.sunDirection);

    step('Riveting an Imperial destroyer', 0.35);
    this.destroyer = new StarDestroyer({ length: 1600, detail: tier.detailScale });
    this.spaceRoot.add(this.destroyer.root);

    step('Weathering a blockade runner', 0.5);
    this.runner = new BlockadeRunner({ length: 150, detail: tier.detailScale });
    this.spaceRoot.add(this.runner.root);
    this.runnerShield = new ShieldBubble(78, [1.35, 0.72, 0.72], 0x8fd0ff);
    this.runner.root.add(this.runnerShield.mesh);

    step('Fitting an escape pod', 0.56);
    this.pod = new EscapePod(7);
    this.spaceRoot.add(this.pod.root);

    // ---- Lighting ---------------------------------------------------------
    this.sunLight = new THREE.DirectionalLight(0xfff2df, 2.15);
    this.sunLight.position.copy(this.sunDirection).multiplyScalar(4000);
    this.sunLight.castShadow = false;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Bounce from the planet: warm but desaturated, from below. A saturated
    // bounce turns the destroyer's belly copper, which reads as rust.
    this.fillLight = new THREE.DirectionalLight(0xe4cbb0, 0.5);
    this.fillLight.position.set(-0.2, -1, 0.2);
    this.scene.add(this.fillLight);

    this.rimLight = new THREE.DirectionalLight(0x9fc0ff, 1.5);
    this.rimLight.position.set(-0.7, 0.35, 0.62);
    this.scene.add(this.rimLight);

    this.spaceAmbient = new THREE.AmbientLight(0x2e3a52, 0.6);
    this.scene.add(this.spaceAmbient);

    // Interiors are lit far more generously than space: the brief is a bright
    // white Rebel corridor, and nothing important may hide in shadow.
    this.interiorAmbient = new THREE.HemisphereLight(0xe6ecf6, 0x5a616a, 1.9);
    this.interiorAmbient.visible = false;
    this.scene.add(this.interiorAmbient);
    this.interiorFill = new THREE.AmbientLight(0xbcc9dc, 0.7);
    this.interiorFill.visible = false;
    this.scene.add(this.interiorFill);

    // ---- Interior ---------------------------------------------------------
    step('Building a corridor', 0.68);
    this.corridor = new Corridor({ detail: tier.detailScale });
    this.interiorRoot.add(this.corridor.root);

    step('Casting the crew', 0.82);
    const leia = new Princess(1);
    const vader = new DarkLord(2);
    const r2 = new Astromech(3);
    const threepio = new ProtocolDroid(4);
    const officer = new ShipOfficer(5);
    const rebels = [0, 1, 2, 3].map((i) => new RebelTrooper(10 + i));
    const troopers = [0, 1, 2, 3, 4, 5].map((i) => new Stormtrooper(20 + i));
    this.characters = { leia, vader, r2, threepio, rebels, officer, troopers };
    this.allCharacters.push(leia, vader, r2, threepio, officer, ...rebels, ...troopers);
    for (const c of this.allCharacters) this.interiorRoot.add(c.root);

    this.dataProjection = new DataProjection(0.42, 0x76d9ff);
    this.interiorRoot.add(this.dataProjection.root);

    // ---- Effects ----------------------------------------------------------
    step('Charging the effects pools', 0.92);
    this.fx = new Effects({ particleScale: tier.particleScale });
    this.scene.add(this.fx.root);

    setTextureAnisotropy(tier.anisotropy);
    this.buildSelectables();
    this.setLocation('space');
    step('Ready', 1);
  }

  private buildSelectables(): void {
    const add = (
      id: string,
      label: string,
      description: string,
      object: THREE.Object3D,
      radius: number,
      location: StageLocation,
    ): void => {
      this.selectables.push({ id, label, description, object, radius, location });
      object.userData.selectableId = id;
    };

    add(
      'destroyer',
      'Imperial Star Destroyer',
      'Sixteen hundred metres of grey armour built to be seen from the ground. Its job is not to win a battle; its job is to make one unnecessary.',
      this.destroyer.root,
      900,
      'space',
    );
    add(
      'runner',
      'Rebel Blockade Runner',
      'A corvette registered as a diplomatic transport. Fast, lightly shielded, and carrying the only complete copy of the station plans.',
      this.runner.root,
      95,
      'space',
    );
    add(
      'pod',
      'Escape Pod',
      'An unarmed lifeboat with a heat shield, a beacon and enough thrust to reach an atmosphere. Nothing about it is worth shooting at.',
      this.pod.root,
      6,
      'space',
    );
    add(
      'tatooine',
      'Tatooine',
      'A desert world on nobody\'s trade route, orbited by twin suns and almost no attention. The safest place in the galaxy to lose something important.',
      this.planet.surface,
      12000,
      'space',
    );
    add(
      'leia',
      this.characters.leia.displayName,
      this.characters.leia.description,
      this.characters.leia.root,
      1.2,
      'interior',
    );
    add(
      'vader',
      this.characters.vader.displayName,
      this.characters.vader.description,
      this.characters.vader.root,
      1.6,
      'interior',
    );
    add('r2', this.characters.r2.displayName, this.characters.r2.description, this.characters.r2.root, 0.9, 'interior');
    add(
      'threepio',
      this.characters.threepio.displayName,
      this.characters.threepio.description,
      this.characters.threepio.root,
      1.3,
      'interior',
    );
    add(
      'rebel',
      this.characters.rebels[0].displayName,
      this.characters.rebels[0].description,
      this.characters.rebels[0].root,
      1.3,
      'interior',
    );
    add(
      'trooper',
      this.characters.troopers[0].displayName,
      this.characters.troopers[0].description,
      this.characters.troopers[0].root,
      1.3,
      'interior',
    );
    add(
      'corridor',
      'Blockade Runner Corridor',
      'Modular white plating, recessed panels and a ceiling of soft luminaires. Built for senators, not for a boarding action.',
      this.corridor.root,
      12,
      'interior',
    );
  }

  setLocation(location: StageLocation): void {
    this.location = location;
    const space = location === 'space';
    this.spaceRoot.visible = space;
    this.interiorRoot.visible = !space;
    this.sunLight.visible = space;
    this.fillLight.visible = space;
    this.rimLight.visible = space;
    this.spaceAmbient.visible = space;
    this.interiorAmbient.visible = !space;
    this.interiorFill.visible = !space;
    this.scene.background = space ? new THREE.Color(0x02030a) : new THREE.Color(0x05070a);
  }

  /** Camera clip planes appropriate to the active location. */
  applyCameraRange(camera: THREE.PerspectiveCamera): void {
    if (this.location === 'space') {
      camera.near = 2;
      camera.far = 260000;
    } else {
      camera.near = 0.05;
      camera.far = 400;
    }
    camera.updateProjectionMatrix();
  }

  applyQuality(tier: QualityTier): void {
    this.tier = tier;
    setTextureAnisotropy(tier.anisotropy);
    this.starfield.setPixelRatio(Math.min(window.devicePixelRatio || 1, tier.maxPixelRatio));
  }

  get qualityTier(): QualityTier {
    return this.tier;
  }

  /** Per-frame updates that are independent of the timeline. */
  update(dt: number, elapsed: number): void {
    if (this.location === 'space') {
      this.starfield.update(dt, elapsed);
      this.planet.update(dt, elapsed);
      this.destroyer.update(dt, elapsed);
      this.runner.update(dt, elapsed);
      this.pod.update(dt, elapsed);
      this.runnerShield.update(dt, elapsed);
    } else {
      this.corridor.update(dt, elapsed);
      this.dataProjection.update(dt, elapsed);
      for (const c of this.allCharacters) {
        if (c.root.visible) c.update(dt, elapsed);
      }
    }
    this.fx.update(dt);
  }

  /** Reset everything the timeline mutates back to a known state. */
  resetWorld(): void {
    this.fx.reset();
    this.runnerShield.setStrength(0);
    this.runner.setDamage(0);
    this.runner.setCockpitLights(1);
    this.runner.engines.throttle = 1;
    this.destroyer.engines.throttle = 1;
    this.destroyer.standDown();
    this.destroyer.setTractorGlow(0);
    this.destroyer.setHangarGlow(1);
    this.pod.engines.throttle = 0;
    this.pod.setReentry(0);
    this.pod.attachClamps();
    this.pod.root.visible = false;
    this.corridor.setAlarm(0);
    this.corridor.setPowerLevel(1);
    this.corridor.setVaderPresence(0, 0);
    this.corridor.blastDoor.setBreach(0);
    this.corridor.blastDoor.setOpen(0);
    this.corridor.aftDoor.setOpen(0);
    this.corridor.openPodHatch(false);
    this.dataProjection.setVisible(0);
    for (const c of this.allCharacters) {
      c.clearPath();
      c.setState('idle');
      c.lookTarget = null;
      c.aimTarget = null;
      c.root.visible = false;
    }
    this.characters.leia.setHoldingData(false);
    this.characters.vader.setSaber(0);
    this.characters.threepio.setAnxiety(0.4);
  }

  /** Named world anchor helpers used by the chapters and the camera. */
  worldPos(object: THREE.Object3D, out = new THREE.Vector3()): THREE.Vector3 {
    object.updateWorldMatrix(true, false);
    return out.setFromMatrixPosition(object.matrixWorld);
  }

  get corridorSpec(): typeof CORRIDOR {
    return CORRIDOR;
  }

  dispose(): void {
    disposeObject(this.spaceRoot);
    disposeObject(this.interiorRoot);
    this.fx.dispose();
    this.dataProjection.dispose();
    this.runnerShield.dispose();
    this.starfield.dispose();
    this.planet.dispose();
  }
}
