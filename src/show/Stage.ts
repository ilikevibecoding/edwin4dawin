import * as THREE from 'three';
import type { RenderSystem } from '../core/RenderSystem';
import type { QualitySettings } from '../core/Quality';
import { buildMaterials } from '../assets/Materials';
import { Starfield } from '../assets/Starfield';
import { Tatooine } from '../assets/Tatooine';
import { BlockadeRunner } from '../assets/BlockadeRunner';
import { StarDestroyer } from '../assets/StarDestroyer';
import { EscapePod } from '../assets/EscapePod';
import { CorridorSet } from '../assets/Corridor';
import { DataProjection } from '../assets/DataProjection';
import { C3PO, Leia, R2D2, RebelSoldier, Stormtrooper, Vader } from '../characters/Cast';
import type { Character } from '../characters/Character';
import { FXManager } from '../effects/FX';
import { PrologueText } from './PrologueText';
import { radialTexture } from '../assets/Textures';
import { buildEnvironments, type Environments } from '../assets/Environment';

/**
 * Everything that exists in the world.
 *
 * The stage owns two roots that never overlap in space: `space` sits at the
 * origin and holds the planet, the ships and the starfield; `interior` sits
 * four kilometres below it and holds the corridor set and the cast. Only one
 * is visible at a time, which also means the lights parented to the hidden
 * root cost nothing.
 */

export const INTERIOR_ORIGIN = new THREE.Vector3(0, -4000, 0);

/** Both ships fly toward the planet, so it sits ahead of them and below. */
export const PLANET_POSITION = new THREE.Vector3(2600, -10400, -15200);
/** Key light comes over the viewer's right shoulder, high and warm. */
export const SUN_DIRECTION = new THREE.Vector3(0.62, 0.34, 0.71).normalize();

export interface PickableInfo {
  object: THREE.Object3D;
  name: string;
  kicker: string;
  description: string;
  /** Radius used when framing the object in inspect mode. */
  radius: number;
}

export class Stage {
  readonly space = new THREE.Group();
  readonly interior = new THREE.Group();
  readonly background = new THREE.Group();

  readonly starfield: Starfield;
  readonly planet: Tatooine;
  readonly runner: BlockadeRunner;
  readonly destroyer: StarDestroyer;
  readonly exteriorPod: EscapePod;
  readonly corridor: CorridorSet;
  readonly interiorPod: EscapePod;
  readonly plans: DataProjection;
  readonly fx: FXManager;
  readonly prologue: PrologueText;

  readonly leia: Leia;
  readonly vader: Vader;
  readonly r2: R2D2;
  readonly threepio: C3PO;
  readonly rebels: RebelSoldier[] = [];
  readonly troopers: Stormtrooper[] = [];
  readonly characters: Character[] = [];

  readonly sun: THREE.DirectionalLight;
  readonly planetBounce: THREE.HemisphereLight;
  readonly planetFill: THREE.DirectionalLight;
  readonly coolFill: THREE.DirectionalLight;
  readonly spaceAmbient: THREE.AmbientLight;
  readonly interiorAmbient: THREE.AmbientLight;
  readonly vaderKey: THREE.PointLight;
  readonly vaderFill: THREE.PointLight;
  readonly boardingGlow: THREE.PointLight;

  readonly pickables: PickableInfo[] = [];
  readonly environments: Environments;

  private quality: QualitySettings;
  private scene!: THREE.Scene;
  private environmentMode: 'space' | 'interior' = 'space';

  constructor(render: RenderSystem, quality: QualitySettings, onProgress: (v: number, label: string) => void) {
    this.quality = quality;
    buildMaterials(render.maxAnisotropy);

    onProgress(0.06, 'Charting the star field');
    this.starfield = new Starfield(quality);
    this.background.add(this.starfield.root);

    onProgress(0.18, 'Terraforming a desert world');
    this.planet = new Tatooine(quality, 9000);
    // Ahead of the ships and below them: the corvette is running toward it.
    this.planet.root.position.copy(PLANET_POSITION);
    this.planet.setSunDirection(SUN_DIRECTION);
    this.background.add(this.planet.root);

    // A visible source for the key light, well beyond the planet.
    const sunSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        color: 0xfff4dc,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        transparent: true,
        toneMapped: false,
        map: radialTexture('sun-disc', 'rgba(255,255,255,1)', 'rgba(255,214,150,0)', 2.6),
      }),
    );
    sunSprite.position.copy(SUN_DIRECTION).multiplyScalar(300000);
    sunSprite.scale.setScalar(46000);
    sunSprite.renderOrder = -5;
    this.background.add(sunSprite);

    onProgress(0.3, 'Riveting a diplomatic corvette');
    this.runner = new BlockadeRunner(quality);
    this.space.add(this.runner.root);

    onProgress(0.46, 'Assembling sixteen hundred metres of grey iron');
    this.destroyer = new StarDestroyer(quality);
    this.space.add(this.destroyer.root);

    onProgress(0.58, 'Fitting escape pods');
    this.exteriorPod = new EscapePod();
    this.space.add(this.exteriorPod.root);

    onProgress(0.64, 'Welding the forward passage');
    this.corridor = new CorridorSet(quality);
    this.interior.add(this.corridor.root);

    // In its cradle against the outboard wall of bay six, nose pointing out
    // through the hull so the launch reads as a straight ejection sideways.
    this.interiorPod = new EscapePod();
    this.interiorPod.root.scale.setScalar(0.8);
    this.interiorPod.root.position.set(8.0, 1.42, 17);
    this.interiorPod.root.rotation.y = -Math.PI / 2;
    this.interior.add(this.interiorPod.root);

    this.plans = new DataProjection(0.55);
    this.plans.root.position.set(-3.05, 1.85, 18.4);
    this.interior.add(this.plans.root);

    onProgress(0.76, 'Casting the crew');
    this.leia = new Leia('leia');
    this.vader = new Vader('vader');
    this.r2 = new R2D2('r2');
    this.threepio = new C3PO('threepio');
    for (let i = 0; i < 5; i++) this.rebels.push(new RebelSoldier(`rebel${i}`));
    for (let i = 0; i < 7; i++) this.troopers.push(new Stormtrooper(`trooper${i}`));
    this.characters.push(this.leia, this.vader, this.r2, this.threepio, ...this.rebels, ...this.troopers);
    this.characters.forEach((c, i) => {
      c.phaseOffset = i * 0.73;
      this.interior.add(c.root);
    });

    onProgress(0.86, 'Priming effects');
    this.fx = new FXManager(quality);
    this.space.add(this.fx.spaceGroup);
    // Effects are fed world-space positions (muzzle transforms, `ip()` points),
    // but this group hangs off the interior root four kilometres down, so it
    // carries the inverse of that offset. Without it every interior spark,
    // bolt, smoke puff and fragment was drawn 4 km below the corridor.
    this.fx.interiorGroup.position.copy(INTERIOR_ORIGIN).negate();
    this.interior.add(this.fx.interiorGroup);

    this.prologue = new PrologueText();
    this.space.add(this.prologue.root);

    // ------------------------------------------------------------ lights
    this.sun = new THREE.DirectionalLight(0xfff4e4, 3.2);
    this.sun.position.copy(SUN_DIRECTION).multiplyScalar(3000);
    this.sun.castShadow = false;
    this.space.add(this.sun);
    this.space.add(this.sun.target);

    // Warm bounce off the desert below — this is what reads on the undersides
    // during the destroyer reveal. Enough to shape them and no more: a
    // saturated ground colour here turns the whole imperial hull to rust.
    this.planetBounce = new THREE.HemisphereLight(0x3a465c, 0x7c6a58, 0.62);
    this.space.add(this.planetBounce);
    this.planetFill = new THREE.DirectionalLight(0xf0cdb0, 0.42);
    this.planetFill.position.copy(PLANET_POSITION).normalize().multiplyScalar(3000);
    this.space.add(this.planetFill, this.planetFill.target);
    // Cool counter-fill from deep space keeps the palette from going
    // monochrome. Kept low: with the hemisphere and the probe already lifting
    // the shadow side, any more and the shadowed flank stops being a shadow.
    this.coolFill = new THREE.DirectionalLight(0x86aade, 0.34);
    this.coolFill.position.set(-2600, 900, 1700);
    this.space.add(this.coolFill, this.coolFill.target);
    this.spaceAmbient = new THREE.AmbientLight(0x9db0cc, 0.2);
    this.space.add(this.spaceAmbient);

    this.interiorAmbient = new THREE.AmbientLight(0xb9c6d8, 0.55);
    this.interior.add(this.interiorAmbient);

    // Cold rim from behind him. A red key on his front made the blackest
    // costume in the film read as maroon plastic; backlight separates the
    // silhouette from the dark of the breached doorway instead.
    this.vaderKey = new THREE.PointLight(0xa8c8ff, 0, 14, 2);
    this.vaderKey.position.set(0, 2.3, -18);
    this.interior.add(this.vaderKey);

    // Just enough frontal fill to find the brow, the lenses and the mantle.
    this.vaderFill = new THREE.PointLight(0xc4d6f0, 0, 7, 2);
    this.vaderFill.position.set(0, 1.9, -13);
    this.interior.add(this.vaderFill);

    this.boardingGlow = new THREE.PointLight(0xffd0a0, 0, 14, 2);
    this.boardingGlow.position.set(0, 1.6, -17.4);
    this.interior.add(this.boardingGlow);

    this.interior.position.copy(INTERIOR_ORIGIN);

    render.scene.add(this.space, this.interior);
    render.bgScene.add(this.background);

    onProgress(0.9, 'Baking reflections');
    this.environments = buildEnvironments(
      render.renderer,
      SUN_DIRECTION,
      PLANET_POSITION.clone().normalize(),
    );
    this.scene = render.scene;
    this.scene.environment = this.environments.space;
    this.scene.environmentIntensity = 0.5;

    this.registerPickables();
    onProgress(0.94, 'Lighting the set');
  }

  private registerPickables(): void {
    const add = (
      object: THREE.Object3D,
      name: string,
      kicker: string,
      description: string,
      radius: number,
    ): void => {
      object.userData.pickable = true;
      object.userData.label = name;
      this.pickables.push({ object, name, kicker, description, radius });
    };

    add(
      this.runner.root,
      'Diplomatic Corvette',
      'Rebel vessel · registry CE-7',
      'A one-hundred-and-fifty metre courier with a hammerhead bow, eleven overdriven engines, and a diplomatic transponder that stopped being believed about an hour ago. White hull plate, patched and re-patched.',
      90,
    );
    add(
      this.destroyer.root,
      'Imperial Destroyer',
      'Capital ship · 1,600 m',
      'A wedge of grey armour built to be seen coming. Command tower and paired deflector domes aft, ventral hangar amidships, and enough ventral batteries to disable a courier without scratching the cargo.',
      900,
    );
    add(
      this.exteriorPod.root,
      'Escape Pod Six',
      'Lifeboat · unarmed',
      'Cold-gas ejection, one burn of manoeuvring fuel, no transponder. Standard practice is to ignore a pod with no life signs aboard, which turns out to be a mistake.',
      4,
    );
    add(
      this.planet.root,
      'Tatooine',
      'Desert world · outer rim',
      'Twin suns, no free water, and a population that survives by not asking questions. Its most valuable export today will be a droid nobody notices.',
      9000,
    );
    add(
      this.corridor.root,
      'Forward Passage',
      'Corvette interior · deck two',
      'Curved white wall panels over a structural rib cage, ceiling light strips, and a pressure door that is about to stop being a door.',
      12,
    );
    add(
      this.plans.root,
      'The Stolen Plans',
      'Data projection · restricted',
      'A complete structural schematic of the Imperial battle station, rendered as a rotating geometric projection: shell, service trench, and focusing array.',
      1.2,
    );
    add(
      this.interiorPod.root,
      'Pod Bay Six',
      'Launch cradle',
      'Four release clamps, one hatch, and roughly nine seconds of usable warning if the boarders find it first.',
      3,
    );

    for (const c of this.characters) {
      this.pickables.push({
        object: c.root,
        name: c.displayName,
        kicker: 'Character',
        description: c.description,
        radius: c.height * 0.9,
      });
    }
  }

  setSpaceVisible(v: boolean): void {
    this.space.visible = v;
  }

  setInteriorVisible(v: boolean): void {
    this.interior.visible = v;
  }

  /** Swap the reflection probe when the action moves inside or outside. */
  setEnvironment(mode: 'space' | 'interior'): void {
    if (mode === this.environmentMode) return;
    this.environmentMode = mode;
    this.scene.environment = mode === 'space' ? this.environments.space : this.environments.interior;
    this.scene.environmentIntensity = mode === 'space' ? 0.5 : 0.55;
  }

  get qualitySettings(): QualitySettings {
    return this.quality;
  }

  update(time: number, dt: number): void {
    this.planet.update(time);
    this.runner.update(time, dt);
    this.destroyer.update(time, dt);
    this.exteriorPod.update(time, dt);
    this.interiorPod.update(time, dt);
    this.corridor.update(time, dt);
    this.plans.update(time, dt);
    this.fx.update(dt);
  }

  dispose(): void {
    this.space.removeFromParent();
    this.interior.removeFromParent();
    this.background.removeFromParent();
    this.scene.environment = null;
    this.environments.dispose();
  }
}
