import * as THREE from 'three';
import { MaterialLibrary, PALETTE } from '../assets/materials';
import { BlockadeRunner } from '../assets/ships/BlockadeRunner';
import { StarDestroyer } from '../assets/ships/StarDestroyer';
import { EscapePod } from '../assets/ships/EscapePod';
import { Tatooine } from '../assets/world/Tatooine';
import { Starfield } from '../assets/world/Starfield';
import { BoltField } from '../effects/BoltField';
import { DebrisField } from '../effects/DebrisField';
import { FlashField } from '../effects/FlashField';
import { ParticleField } from '../effects/ParticleField';
import { buildBattleScript, type BattleScript } from '../timeline/battle';
import {
  CHAPTER_TIMES, PLANET_CENTER, SUN_DIRECTION, chaseFrame, destroyerTransform, dockingArmExtension,
  podEngineLevel, podReentry, podTransform, podVisible, runnerEngineLevel, runnerTransform,
  tractorBeam,
} from '../timeline/stage';
import { saturate, smoothstep } from '../core/mathx';
import { PrologueText } from './PrologueText';

const _aft = new THREE.Vector3();

/**
 * The exterior act: Tatooine, the pursuit, the capture and the pod's descent.
 *
 * Everything that participates in the chase is parented to a single moving
 * `chase` frame (see stage.ts), which keeps authored coordinates small and
 * makes ejected sparks and debris inherit the ships' velocity for free.
 */
export class SpaceScene {
  readonly scene = new THREE.Scene();
  readonly chase = new THREE.Group();
  readonly runner: BlockadeRunner;
  readonly destroyer: StarDestroyer;
  readonly pod: EscapePod;
  readonly planet: Tatooine;
  readonly stars: Starfield;
  readonly prologue: PrologueText;
  readonly script: BattleScript;

  readonly runnerPivot = new THREE.Group();
  readonly destroyerPivot = new THREE.Group();
  readonly podPivot = new THREE.Group();

  private imperialBolts: BoltField;
  private rebelBolts: BoltField;
  private sparks: ParticleField;
  private smoke: ParticleField;
  private debris: DebrisField;
  private flashes: FlashField;

  private sun: THREE.DirectionalLight;
  private planetBounce: THREE.DirectionalLight;
  private ambient: THREE.AmbientLight;

  private dockingArm: THREE.Group;
  private dockingArmTube: THREE.Mesh;
  private tractorMesh: THREE.Mesh;
  private tractorMat: THREE.MeshBasicMaterial;
  private podTrail: ParticleField;
  private podBurn: ParticleField;
  private podGlow: THREE.PointLight;

  /** Objects the viewer can click in Explore mode. */
  readonly selectable: Array<{ object: THREE.Object3D; id: string }> = [];

  constructor(lib: MaterialLibrary) {
    this.scene.name = 'SpaceScene';
    this.scene.background = new THREE.Color(0x000000);

    // ---- Lighting ---------------------------------------------------------
    this.sun = new THREE.DirectionalLight(0xfff4e6, 3.6);
    this.sun.position.copy(SUN_DIRECTION).multiplyScalar(600_000);
    this.sun.castShadow = false;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    // Warm bounce off the desert below keeps hull undersides readable. Kept
    // pale rather than sand-coloured: pushed any further it stops reading as
    // Imperial grey lit warm and starts reading as a brown ship.
    this.planetBounce = new THREE.DirectionalLight(0xffdec2, 1.3);
    this.planetBounce.position.set(0, -1, 0.2);
    this.scene.add(this.planetBounce);

    this.ambient = new THREE.AmbientLight(0x39445c, 0.75);
    this.scene.add(this.ambient);

    // ---- World ------------------------------------------------------------
    this.planet = new Tatooine(lib);
    this.planet.setSunDirection(SUN_DIRECTION);
    // The planet's centre sits one orbital radius below the chase frame's
    // origin, so the action rides at a constant altitude above the desert.
    // Rolling it a quarter turn puts its spin axis on world X, which places the
    // ships' orbital track over the equator and keeps them away from the pole
    // pinch in the equirectangular surface map.
    this.planet.group.position.copy(PLANET_CENTER);
    this.planet.group.rotation.z = Math.PI / 2;
    this.scene.add(this.planet.group);

    this.stars = new Starfield(lib, lib.qualitySettings.starCount);
    this.scene.add(this.stars.points);
    this.scene.add(this.stars.band);

    this.prologue = new PrologueText(lib);
    this.scene.add(this.prologue.group);

    // ---- Chase frame ------------------------------------------------------
    this.chase.name = 'chaseFrame';
    this.scene.add(this.chase);

    this.runner = new BlockadeRunner(lib);
    this.runnerPivot.name = 'runnerPivot';
    this.runnerPivot.add(this.runner.group);
    this.chase.add(this.runnerPivot);

    this.destroyer = new StarDestroyer(lib);
    this.destroyerPivot.name = 'destroyerPivot';
    this.destroyerPivot.add(this.destroyer.group);
    this.chase.add(this.destroyerPivot);

    this.pod = new EscapePod(lib);
    this.podPivot.name = 'podPivot';
    this.podPivot.add(this.pod.group);
    this.chase.add(this.podPivot);

    // ---- Battle -----------------------------------------------------------
    const turretLocals = this.destroyer.turrets.map((t) => t.group.position.clone().add(new THREE.Vector3(0, 20, 30)));
    this.script = buildBattleScript(turretLocals, this.runner.hitPoints);
    this.runner.setDamageEvents(this.script.damage);

    const q = lib.qualitySettings;
    this.imperialBolts = new BoltField(lib, 64, 'turbolaser');
    this.rebelBolts = new BoltField(lib, 28, 'rebel-fire');
    this.imperialBolts.addAll(this.script.imperialBolts);
    this.rebelBolts.addAll(this.script.rebelBolts);
    this.chase.add(this.imperialBolts.mesh, this.imperialBolts.glow);
    this.chase.add(this.rebelBolts.mesh, this.rebelBolts.glow);

    this.sparks = new ParticleField(lib, {
      name: 'space-sparks',
      capacity: Math.round(4200 * q.particleScale),
      texture: lib.sparkSprite,
      drag: 0.55, growth: 0.25, fade: 1.9, attack: 0.02,
    });
    this.smoke = new ParticleField(lib, {
      name: 'space-smoke',
      capacity: Math.round(1400 * q.particleScale),
      texture: lib.smokeSprite,
      drag: 0.35, growth: 3.4, fade: 1.35, attack: 0.16, additive: false, softness: 0.9,
    });
    this.smoke.material.blending = THREE.NormalBlending;
    for (const e of this.script.sparks) this.sparks.emit(e);
    for (const e of this.script.smoke) this.smoke.emit(e);
    this.sparks.commit();
    this.smoke.commit();
    this.chase.add(this.smoke.points);
    this.chase.add(this.sparks.points);

    this.debris = new DebrisField(lib, Math.round(260 * Math.min(1.4, q.particleScale)));
    for (const e of this.script.debris) this.debris.emit(e);
    this.chase.add(this.debris.mesh);

    this.flashes = new FlashField(lib, 16, 3, 'space-flashes');
    for (const e of this.script.flashes) this.flashes.add(e);
    this.chase.add(this.flashes.group);

    // ---- Boarding umbilical ----------------------------------------------
    this.dockingArm = new THREE.Group();
    this.dockingArm.name = 'dockingArm';
    const tubeGeo = new THREE.CylinderGeometry(9, 11, 1, 14, 1, true);
    lib.registry.track(tubeGeo);
    this.dockingArmTube = new THREE.Mesh(tubeGeo, lib.imperial.hullDark);
    (this.dockingArmTube.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    this.dockingArm.add(this.dockingArmTube);
    const collarGeo = new THREE.TorusGeometry(11.5, 2.2, 8, 18);
    collarGeo.rotateX(Math.PI / 2);
    lib.registry.track(collarGeo);
    const collar = new THREE.Mesh(collarGeo, lib.imperial.trim);
    this.dockingArm.add(collar);
    const ringGeo = new THREE.TorusGeometry(9.6, 0.8, 6, 20);
    ringGeo.rotateX(Math.PI / 2);
    lib.registry.track(ringGeo);
    const ringMat = lib.energy(0xff8a3c, 0.9);
    this.dockingArm.add(new THREE.Mesh(ringGeo, ringMat));
    this.chase.add(this.dockingArm);

    // ---- Tractor beam ------------------------------------------------------
    const beamGeo = new THREE.CylinderGeometry(11, 20, 1, 18, 1, true);
    lib.registry.track(beamGeo);
    this.tractorMat = new THREE.MeshBasicMaterial({
      color: 0x7fc4ff, transparent: true, opacity: 0, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    lib.registry.track(this.tractorMat);
    this.tractorMesh = new THREE.Mesh(beamGeo, this.tractorMat);
    this.tractorMesh.name = 'tractorBeam';
    this.chase.add(this.tractorMesh);

    // ---- Pod re-entry trail ------------------------------------------------
    this.podTrail = new ParticleField(lib, {
      name: 'pod-trail',
      capacity: Math.max(320, Math.round(1600 * q.particleScale)),
      texture: lib.glowSprite,
      drag: 0.9, growth: 5.5, fade: 1.5, attack: 0.05,
    });
    this.chase.add(this.podTrail.points);

    // The separation burn is a separate field from the re-entry plasma: one is
    // read from twenty metres and the other from several kilometres, and a
    // single growth and size curve cannot serve both.
    this.podBurn = new ParticleField(lib, {
      name: 'pod-burn',
      capacity: Math.max(260, Math.round(700 * q.particleScale)),
      texture: lib.glowSprite,
      drag: 1.5, growth: 2.4, fade: 1.5, attack: 0.06,
    });
    this.chase.add(this.podBurn.points);
    this.buildPodTrail(q.particleScale);

    // The pod separates on the shadowed side of both hulls, where the only light
    // reaching it is its own exhaust. Without this it is a black disc against a
    // lit underside and reads as a hole rather than a machine.
    this.podGlow = new THREE.PointLight(0xffbe72, 0, 26, 2);
    this.chase.add(this.podGlow);

    // ---- Selectable registry ----------------------------------------------
    this.selectable.push(
      { object: this.runner.group, id: 'blockade-runner' },
      { object: this.destroyer.group, id: 'star-destroyer' },
      { object: this.pod.group, id: 'escape-pod' },
      { object: this.planet.surface, id: 'tatooine' },
    );
  }

  private buildPodTrail(scale: number): void {
    // Two deterministic ribbons laid along the pod's path and emitted at load
    // time like every other effect: the separation burn, and the plasma of
    // atmospheric entry much later.
    const obj = new THREE.Object3D();
    const aft = new THREE.Vector3();

    // Separation burn. Six metres of dark pod crossing a kilometre and a half
    // of lit Imperial hull is invisible without one; the plume is what the eye
    // actually finds in that frame.
    const burnSamples = Math.max(70, Math.round(300 * scale));
    for (let i = 0; i < burnSamples; i++) {
      const t = 320.2 + (i / burnSamples) * 11;
      const level = podEngineLevel.at(t);
      if (level < 0.06) continue;
      podTransform(t, obj);
      aft.set(0, 0, -1).applyQuaternion(obj.quaternion);
      this.podBurn.emit({
        t0: t,
        position: obj.position.clone().addScaledVector(aft, 4.8),
        count: 2,
        speed: 7 + 16 * level,
        spread: 0.26,
        direction: aft.clone(),
        color: 0xffe3b4,
        colorB: 0xff8f36,
        // Metres, not the tens of metres the re-entry plume uses: that one is
        // read from kilometres away, this one from twenty.
        size: 0.4 + level * 0.62,
        sizeJitter: 0.35,
        life: 0.62,
        radius: 0.32,
      });
    }
    this.podBurn.commit();

    const entrySamples = Math.max(60, Math.round(200 * scale));
    for (let i = 0; i < entrySamples; i++) {
      const t = 344 + (i / entrySamples) * 36;
      podTransform(t, obj);
      const heat = podReentry.at(t);
      if (heat < 0.05) continue;
      this.podTrail.emit({
        t0: t,
        position: obj.position.clone(),
        count: 4,
        speed: 30 * heat,
        spread: Math.PI * 0.4,
        direction: new THREE.Vector3(0, 1, 0),
        color: 0xffd9a0,
        colorB: 0xff5a1e,
        size: 26 + heat * 70,
        life: 2.6,
        radius: 3,
      });
    }
    this.podTrail.commit();
  }

  setViewportScale(heightPx: number, fovDeg: number): void {
    this.sparks.setViewportScale(heightPx, fovDeg);
    this.smoke.setViewportScale(heightPx, fovDeg);
    this.podTrail.setViewportScale(heightPx, fovDeg);
    this.podBurn.setViewportScale(heightPx, fovDeg);
    this.stars.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  }

  /**
   * Pose the whole stage at time `t`.
   *
   * This must run *before* the camera director, because exterior shots are
   * authored in the chase frame and read its world matrix.
   */
  pose(t: number): void {
    chaseFrame(t, this.chase);
    runnerTransform(t, this.runnerPivot);
    destroyerTransform(t, this.destroyerPivot);
    podTransform(t, this.podPivot);

    this.runner.setEngineLevel(runnerEngineLevel.at(t));
    this.runner.update(t);
    this.destroyer.setEngineLevel(1);
    this.destroyer.update(t);

    this.pod.setEngineLevel(podEngineLevel.at(t));
    this.pod.setReentry(podReentry.at(t));
    this.pod.update(t);
    this.podPivot.visible = podVisible(t);
    this.podTrail.points.visible = podReentry.at(t) > 0.02;
    const burn = podEngineLevel.at(t);
    this.podBurn.points.visible = burn > 0.04;
    // Sat at the nozzles rather than inside the hull: a light at the centre of a
    // closed shape illuminates none of it, since every face points away.
    this.podGlow.intensity = 34 * burn;
    this.podGlow.position.copy(this.podPivot.position)
      .add(_aft.set(0, 0, -4.5).applyQuaternion(this.podPivot.quaternion));

    // Turrets track the corvette from first contact until the guns fall silent.
    const trackTarget = this.runnerPivot.getWorldPosition(new THREE.Vector3());
    this.destroyer.aimTurrets(trackTarget, t);

    this.imperialBolts.update(t);
    this.rebelBolts.update(t);
    this.sparks.update(t);
    this.smoke.update(t);
    this.podTrail.update(t);
    this.podBurn.update(t);
    this.debris.update(t);
    this.flashes.update(t);

    this.planet.update(t);
    this.prologue.update(t);

    this.updateDockingArm(t);
    this.updateTractorBeam(t);
  }

  /**
   * Everything that depends on where the camera ended up: the infinitely
   * distant starfield, and the two lights that follow the viewer so the
   * exterior key angle stays consistent across a 60-degree orbital arc.
   */
  finalize(t: number, cameraWorldPos: THREE.Vector3): void {
    this.stars.update(t, cameraWorldPos);

    this.sun.position.copy(cameraWorldPos).addScaledVector(SUN_DIRECTION, 900_000);
    this.sun.target.position.copy(cameraWorldPos);
    this.sun.updateMatrixWorld();
    this.sun.target.updateMatrixWorld();

    // Warm bounce from the desert: comes from the planet, not from below world Y.
    const up = cameraWorldPos.clone().sub(PLANET_CENTER).normalize();
    this.planetBounce.position.copy(cameraWorldPos).addScaledVector(up, -300_000);
    this.planetBounce.target.position.copy(cameraWorldPos);
    this.planetBounce.updateMatrixWorld();
    this.planetBounce.target.updateMatrixWorld();

    // Stars dim while the planet dominates the frame so the limb stays clean.
    this.stars.setBrightness(t < CHAPTER_TIMES.tatooine[0] ? 1 : 0.82);
  }

  private updateDockingArm(t: number): void {
    const ext = dockingArmExtension.at(t);
    this.dockingArm.visible = ext > 0.01;
    if (!this.dockingArm.visible) return;

    // Attach the umbilical to the destroyer station directly above the
    // corvette's dorsal port so the tube is near-vertical and short.
    const top = this.destroyerPivot.localToWorld(new THREE.Vector3(0, -72, -366));
    const bottom = this.runnerPivot.localToWorld(new THREE.Vector3(0, 10, -6));
    this.chase.worldToLocal(top);
    this.chase.worldToLocal(bottom);
    const reach = new THREE.Vector3().lerpVectors(top, bottom, ext);
    const mid = new THREE.Vector3().addVectors(top, reach).multiplyScalar(0.5);
    const len = top.distanceTo(reach);

    this.dockingArm.position.copy(mid);
    this.dockingArm.lookAt(this.chase.localToWorld(reach.clone()));
    this.dockingArm.rotateX(Math.PI / 2);
    this.dockingArmTube.scale.set(1, Math.max(0.001, len), 1);
    // Keep the collar at the corvette end of the tube.
    this.dockingArm.children[1].position.set(0, -len / 2, 0);
    this.dockingArm.children[2].position.set(0, -len / 2 - 1, 0);
  }

  private updateTractorBeam(t: number): void {
    const v = tractorBeam.at(t);
    this.tractorMat.opacity = v * 0.1 * (0.85 + Math.sin(t * 3.1) * 0.15);
    this.tractorMesh.visible = v > 0.02;
    if (!this.tractorMesh.visible) return;
    const top = this.destroyerPivot.localToWorld(new THREE.Vector3(0, -84, -260));
    const bottom = this.runnerPivot.getWorldPosition(new THREE.Vector3());
    this.chase.worldToLocal(top);
    this.chase.worldToLocal(bottom);
    const mid = new THREE.Vector3().addVectors(top, bottom).multiplyScalar(0.5);
    const len = top.distanceTo(bottom);
    this.tractorMesh.position.copy(mid);
    this.tractorMesh.lookAt(this.chase.localToWorld(bottom.clone()));
    this.tractorMesh.rotateX(Math.PI / 2);
    this.tractorMesh.scale.set(1, Math.max(0.001, len), 1);
  }

  /** Cheap visibility gate so interior chapters do not pay for the exterior. */
  setActive(active: boolean): void {
    this.scene.visible = active;
  }

  /** Approximate world-space brightness of the scene, used by QA checks. */
  get lightRig(): { sun: THREE.DirectionalLight; bounce: THREE.DirectionalLight; ambient: THREE.AmbientLight } {
    return { sun: this.sun, bounce: this.planetBounce, ambient: this.ambient };
  }

  get particleStats(): { sparks: number; smoke: number; overflow: boolean } {
    return {
      sparks: this.sparks.used,
      smoke: this.smoke.used,
      overflow: this.sparks.overflowed || this.smoke.overflowed
        || this.podTrail.overflowed || this.podBurn.overflowed,
    };
  }

  /** Bolts genuinely in flight at `t`, used by QA assertions. */
  boltsActiveAt(t: number): number {
    return this.imperialBolts.activeAt(t) + this.rebelBolts.activeAt(t);
  }

  /** Exposed for the audio system: how hot the battle is right now. */
  intensityAt(t: number): number {
    const active = this.imperialBolts.activeAt(t) + this.rebelBolts.activeAt(t);
    return saturate(active / 8) * smoothstep(108, 118, t) * (1 - smoothstep(156, 166, t));
  }

  get palette(): typeof PALETTE {
    return PALETTE;
  }
}
