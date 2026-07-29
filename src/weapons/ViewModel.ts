import * as THREE from 'three';
import type { EngineContext, System } from '../core/System';
import { Signals } from '../core/Signals';
import type { WeaponSystem } from './WeaponSystem';
import type { PlayerSystem } from '../player/Player';
import type { LevelSystem } from '../world/Level';
import type { PhysicsSystem } from '../physics/Physics';
import { SHOT_MODE } from '../core/Config';
import type { WeaponDef } from './WeaponDefs';
import {
  buildWeaponModel,
  VIEW_MODEL_LAYER,
  type WeaponFrame,
  type WeaponModel,
} from './WeaponMesh';
import type { LightingSystem } from '../render/Lighting';

/**
 * Sky-visibility sample directions: the zenith plus a ring at fifty degrees.
 *
 * Six around and one up is the coarsest sweep that can still tell an awning from
 * a roof, which is the distinction the whole thing exists to make. The zenith
 * carries a third of the weight on its own — it is the sample with the clearest
 * view of the dome and the one a ceiling always takes.
 */
const SKY_RAYS: THREE.Vector3[] = (() => {
  const dirs = [new THREE.Vector3(0, 1, 0)];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const el = THREE.MathUtils.degToRad(50);
    dirs.push(
      new THREE.Vector3(Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)),
    );
  }
  return dirs;
})();
const WHITE = new THREE.Color(1, 1, 1);
/** Warm sand, for the bounce that fills the weapon's underside. */
const SAND = new THREE.Color(1.0, 0.84, 0.66);
/** Open skylight, for the ambient that fills its shadow side. */
const SKY = new THREE.Color(0.72, 0.82, 1.0);
/**
 * Overall gain on the view-model rig, in units of trim per unit of sky openness.
 *
 * Solved rather than dialled: the target is the weapon's own silhouette averaging
 * a little under half the frame's mean luminance, which is where a 5%-albedo
 * object with a specular sheen sits against a world of stucco and sand at 25 to
 * 30%. See `readTrim` and `probeLight` for the two terms it multiplies.
 */
const LEVEL_GAIN = 4.0;
/**
 * Calibration override: a non-zero value forces a constant rig level across
 * every scene, which is how the four intensities below were split. Zero is off.
 */
const LEVEL_PROBE = 0;
const SKY_WEIGHTS: number[] = (() => {
  // Cosine-weighted, as irradiance on an upward-facing surface is: the zenith
  // sample stands for the brightest part of the dome and the ring for the rest.
  const raw = SKY_RAYS.map((d, i) => (i === 0 ? 1.2 : 1) * d.y);
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => v / total);
})();

/**
 * The first-person view model.
 *
 * Nearly all of the "feel" of a shooter lives here. The weapon is driven by a
 * stack of independent additive layers rather than by baked animation:
 *
 *   rest pose → ADS blend → sway (spring) → bob (gait) → breathing → idle
 *   drift → recoil (6-DOF spring) → reload procedural → sprint pose → lower
 *
 * Each layer is an under-damped spring, so the weapon carries consistent mass
 * across every action instead of snapping between authored keyframes. The
 * result reads as a heavy object held by a person, which is what separates a
 * convincing FPS from one where the gun is welded to the camera.
 */
export class ViewModelSystem implements System {
  readonly name = 'viewmodel';
  readonly order = 60;

  private ctx!: EngineContext;
  private weapons!: WeaponSystem;
  private player!: PlayerSystem;
  private physics: PhysicsSystem | null = null;
  private lighting: LightingSystem | null = null;

  // ---- light probe ----
  /** Smoothed share of the sun and of the sky reaching the player's position. */
  private sunLit = 1;
  private skyOpen = 1;
  private sunTarget = 1;
  private skyTarget = 1;
  private probeSlot = 0;
  private probed = false;
  /** Smoothed frame-measured exposure trim; see `readTrim`. */
  private trim = 1;
  private trimTarget = 1;
  private trimRead = false;
  /** Gameplay exposure offset — pitch bias, flashbangs — at the last reading. */
  private gameplayExposure = 1;
  private lastTone = -1;
  private readonly skyHits = new Float32Array(SKY_RAYS.length).fill(1);
  private readonly probeDir = new THREE.Vector3();
  private readonly probeEye = new THREE.Vector3(1e6, 1e6, 1e6);

  private readonly root = new THREE.Group();
  /**
   * Camera-relative lighting rig; see `init` for the directions and why it
   * exists at all. The intensities here are only starting values — `probeLight`
   * owns them from the first frame.
   *
   * The colours are near-neutral by design, and that is a correction. The fill
   * was 0xa8c2e8, a sky blue, on the argument that a fill outdoors is skylight.
   * It sits at (0.75, 0.25, -0.9) in camera space, which is not the sky, it is
   * roughly level with the weapon and behind it — a bounce off whatever the
   * player is standing next to, and that is warm, not blue. The direction and
   * the colour disagreed, and the direction was the one doing the work: the
   * receiver's near flank faces the camera, so almost all the light it gets is
   * this fill and the rim, and the weapon measured 17% blue-dominant saturation
   * in the street and 19% inside a warm stone hall, where it read as composited
   * in from another scene.
   */
  // The split is weighted toward the two shadow-side terms. A weapon's lit faces
  // were never the problem — its unlit ones measured 2 to 5% luminance against a
  // 38 to 47% frame, which is a hole in the image rather than a dark object. The
  // key gives up a fifth and the rim a seventh to pay for a warm bounce half again
  // as strong and a skylight ambient up by three fifths.
  private readonly key = new THREE.DirectionalLight(0xfff2e2, 3.1);
  private readonly keyTarget = new THREE.Object3D();
  private readonly fill = new THREE.DirectionalLight(0xffd3a2, 1.9);
  private readonly fillTarget = new THREE.Object3D();
  private readonly rim = new THREE.DirectionalLight(0xf2f0ec, 1.5);
  private readonly rimTarget = new THREE.Object3D();
  private readonly ambient = new THREE.AmbientLight(0xbcd0f2, 1.05);
  private readonly models = new Map<string, WeaponModel>();
  /**
   * ADS pose solved from each model's own optic rather than authored by hand:
   * the pose that puts the optical axis exactly on the camera axis at the
   * optic's eye relief. Hand-tuned numbers drift out of alignment the moment
   * anything about the optic geometry moves, and a sight picture that is two
   * millimetres off is both immediately visible and maddening to aim with.
   */
  private readonly adsPose = new Map<string, { pos: THREE.Vector3; rot: THREE.Euler }>();
  private current: WeaponModel | null = null;

  // ---- animation state ----
  private readonly swayPos = new THREE.Vector3();
  private readonly swayVel = new THREE.Vector3();
  private readonly swayRot = new THREE.Vector3();
  private readonly swayRotVel = new THREE.Vector3();

  private readonly recoilPos = new THREE.Vector3();
  private readonly recoilPosVel = new THREE.Vector3();
  private readonly recoilRot = new THREE.Vector3();
  private readonly recoilRotVel = new THREE.Vector3();
  /** Pitch impulse still waiting to be delivered; see `update`. */
  private pitchPending = 0;
  private climb = 0;

  private bobPhase = 0;
  private breathPhase = 0;
  private idlePhase = 0;
  private reloadClock = -1;
  private reloadDuration = 1;
  private reloadEmpty = false;
  private inspectClock = -1;
  private landDip = 0;
  private landDipVel = 0;
  private wasGrounded = true;

  private readonly lookQuat = new THREE.Quaternion();
  private lookInit = false;

  private readonly _tmpV = new THREE.Vector3();
  private readonly _tmpV2 = new THREE.Vector3();
  private readonly _tmpE = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly _tmpQ = new THREE.Quaternion();
  private readonly _frame: WeaponFrame = {
    dt: 0,
    ads: 0,
    elapsed: 0,
    eye: new THREE.Vector3(),
  };
  private readonly _reloadPos = new THREE.Vector3();
  private readonly _reloadRot = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly _extraPos = new THREE.Vector3();
  private readonly _extraRot = new THREE.Euler(0, 0, 0, 'YXZ');

  init(ctx: EngineContext): void {
    this.ctx = ctx;
    this.weapons = ctx.get<WeaponSystem>('weapons')!;
    this.player = ctx.get<PlayerSystem>('player')!;
    this.physics = ctx.get<PhysicsSystem>('physics') ?? null;
    // Read-only: the rig below borrows these lights' colours so the level's
    // preset still tints the weapon. Their intensities and directions are
    // deliberately ignored — see `init` for why.
    this.lighting = ctx.get<LightingSystem>('lighting') ?? null;
    const level = ctx.get<LevelSystem>('level')!;

    // The view camera is moved to the player's world position every frame, so
    // a view model parented to the scene root sits tens of metres behind it
    // and falls outside the 12 m far plane — which is exactly why the weapon
    // was not being drawn at all. Hanging the model off the camera makes the
    // pose camera-relative by construction, and picks up the shake applied
    // after this system runs for free.
    this.root.name = 'viewmodel';
    ctx.viewScene.add(ctx.viewCamera);
    ctx.viewCamera.add(this.root);

    // ---- the view model's own lighting rig ---------------------------------
    //
    // The weapon renders on VIEW_MODEL_LAYER and nothing else does, which takes
    // it out of `Lighting`'s viewKey, viewFill and viewAmbient completely. That
    // is not a tidiness exercise; those three were the largest single defect in
    // the whole view model. viewKey runs at 0.62 of the world sun — intensity 9
    // under the desert preset — and it is aimed in *world* space at a weapon
    // parented to a camera that turns with the player. The weapon's brightness
    // therefore swung with the player's compass heading: the same receiver, same
    // preset, same materials, measured luma 77 in a street capture facing one way
    // and 128 in an interior facing another, against walls of 86 and 71. Nothing
    // downstream of that is worth calibrating.
    //
    // What replaces them is four camera-relative lights on the weapon's own
    // layer, scaled every frame by a probe of the player's actual surroundings.
    // Directions are fixed relative to the eye so the modelling never changes;
    // only the level does. Colours are taken from the scene's own view lights
    // each frame, so the preset still decides whether the weapon is lit warm at
    // sunrise or flat at noon.
    //
    // Intensities are the *reference* values, at open sun; `probeLight` scales
    // them. They are much lower than the lights they replace because they now
    // point at the weapon instead of past it.
    this.key.position.set(-0.55, 0.85, 0.35);
    this.keyTarget.position.set(0.05, -0.10, -0.40);
    this.key.target = this.keyTarget;
    // Off the lower right and behind, standing in for ground bounce and for the
    // half of the sky the receiver's near flank can see. Without it the flank
    // under the ejection port goes to black and the weapon reads as a cutout.
    this.fill.position.set(0.8, -0.45, 0.5);
    this.fillTarget.position.set(0.0, 0.0, -0.35);
    this.fill.target = this.fillTarget;
    // Edge definition along the near-top of the receiver and the optic. This is
    // the one light that is a deliberate cheat: nothing in the world is behind
    // the weapon at that angle, and without it the top rail and the optic housing
    // merge into one silhouette against a bright sky.
    this.rim.position.set(0.75, 0.35, -0.9);
    this.rimTarget.position.set(0.05, -0.10, -0.30);
    this.rim.target = this.rimTarget;
    for (const o of [
      this.key,
      this.keyTarget,
      this.fill,
      this.fillTarget,
      this.rim,
      this.rimTarget,
      this.ambient,
    ]) {
      o.layers.set(VIEW_MODEL_LAYER);
      ctx.viewCamera.add(o);
    }
    // `set`, not `enable`: the view camera now renders *only* the view model's
    // layer.
    //
    // three.js has no per-object light masking — `object.layers` is tested
    // against the *camera's* mask in `projectObject`, and every light that
    // survives that test lights everything in the pass. So comparing layer masks
    // between a light and a mesh does nothing, which cost a capture round to
    // establish: with this rig forced to zero intensity the weapon still measured
    // luma 138 indoors, lit entirely by the viewKey it was supposed to have been
    // excluded from.
    //
    // Taking the camera off layer 0 does work, because it drops those lights
    // before they are collected. It is safe here because the view scene contains
    // exactly four things: this camera, the view model, and `Lighting`'s three
    // view lights. Nothing else is ever added to it, and the three being dropped
    // are the ones being replaced.
    ctx.viewCamera.layers.set(VIEW_MODEL_LAYER);

    for (const slot of this.weapons.slots) {
      const model = buildWeaponModel(slot.def, level.materials);
      model.group.visible = false;
      this.root.add(model.group);
      this.models.set(slot.def.id, model);
      this.adsPose.set(slot.def.id, solveAdsPose(slot.def, model));
      model.sprintPose.position.set(
        slot.def.hipPosition.x + 0.052,
        slot.def.hipPosition.y - 0.055,
        slot.def.hipPosition.z + 0.045,
      );
    }
    this.setActive(this.weapons.def.id);

    Signals.on('weapon:fire', ({ weaponId }) => {
      if (this.weapons.def.id !== weaponId) return;
      this.kick(this.weapons.def, this.weapons.adsProgress);
    });

    Signals.on('weapon:reloadStart', ({ duration, tactical }) => {
      this.reloadClock = 0;
      this.reloadDuration = duration;
      this.reloadEmpty = !tactical;
    });
    Signals.on('weapon:reloadEnd', () => {
      this.reloadClock = -1;
    });
    Signals.on('weapon:switch', ({ toId }) => this.setActive(toId));
  }

  private setActive(id: string): void {
    for (const [key, m] of this.models) m.group.visible = key === id;
    this.current = this.models.get(id) ?? null;
  }

  /**
   * Recoil impulse.
   *
   * A shot is a sequence, not an offset. The rearward travel is instant
   * because that is what the shoulder actually feels; the muzzle rise is
   * delivered over the next thirty milliseconds through `pitchPending`,
   * because the barrel climbs *after* the bolt has started moving and a
   * simultaneous kick reads as a single flat jolt. Aiming cuts the
   * translation hard but only trims the rotation, which is why an aimed
   * burst looks controlled without looking inert.
   */
  private kick(def: WeaponDef, ads: number): void {
    const r = def.recoil;
    const trans = 1 - ads * 0.62;
    const rot = 1 - ads * 0.26;
    const sign = Math.random() < 0.5 ? -1 : 1;

    this.recoilPosVel.z += r.kickback * 62 * trans;
    this.recoilPosVel.y += r.kickback * 11 * trans;
    this.recoilPosVel.x += sign * r.kickback * 14 * trans;

    this.pitchPending += r.visualPitch * 52 * rot;
    this.recoilRotVel.y += sign * r.visualPitch * 12 * rot;
    this.recoilRotVel.z += -sign * r.visualPitch * 26 * rot;

    // Sustained fire walks the muzzle up and it does not come all the way
    // back between shots, which is what makes a long burst feel like work.
    this.climb = Math.min(this.climb + r.visualPitch * 0.34, r.visualPitch * 3.4);
    this.current?.onFire();
  }

  /**
   * How much of the level's light actually reaches the player, and therefore
   * the weapon.
   *
   * The view scene's key, fill and ambient are set from the level preset and
   * never move; the environment is one sky probe. So the weapon is lit by open
   * desert sun in a cellar, auto-exposure opens up for the dark room, and the
   * weapon comes out two stops brighter than the wall behind it — which is the
   * whole of the "gunmetal reads as chrome indoors" report. Nothing about the
   * material was wrong; it was being handed light that was not there.
   *
   * Two questions, and they have to be asked separately, because a shaded street
   * and a lit room give the same answer to the first one and want opposite
   * corrections. Is the sun on the player — one ray. How much of the sky can they
   * see — and that one is not a single ray upward, which was the first attempt
   * and failed flat: a street full of scaffolding and awnings blocked the
   * vertical ray just as reliably as a ceiling did, and the probe returned the
   * same 0.35 for an open street and for a stone hall.
   *
   * So the sky term is a seven-ray hemisphere sweep — straight up plus a ring at
   * fifty degrees — weighted by elevation, which is a coarse form of the same
   * integral the occlusion pass does against the sky mask. An awning takes one or
   * two of the seven; a roof takes all of them.
   *
   * One ray per frame, cycling. That is a BVH descent per collider per frame,
   * which is what a single bullet costs, and it refreshes the whole estimate
   * every eight frames. The result is damped over about a third of a second so
   * the weapon does not flicker as the player walks under a balcony — except for
   * the first full sweep, which snaps, because a player who spawns indoors should
   * not watch their rifle fade down from open-sun brightness.
   */
  /**
   * The render pipeline's frame-measured exposure trim, reconstructed on the CPU.
   *
   * This is the one piece of information the ray probe above cannot supply and
   * cannot be substituted for, and it is worth a GPU sync to get.
   *
   * The trim multiplies the whole composite, the view scene included. It is
   * bounded to about a stop and a quarter down and up to two and a half stops up
   * on an enclosed frame, and it exists because the analytic meter cannot solve a
   * room: it knows the sun's irradiance and the sky's radiance but not what the
   * camera is pointing at. So when the trim opens up, what it is *saying* is that
   * this frame is receiving materially less light than the analytic solve assumed
   * — and the weapon is in that frame. A rig in absolute units does not hear it,
   * and instead rides the correction upward without having earned it.
   *
   * Measured across the reference set, all four outdoor captures render at the
   * same analytic exposure and the same sun, and the trim still moves by a factor
   * of two between them: a market street roofed with awnings meters dark and takes
   * the whole of its allowance, an open rooftop takes none. That factor of two was
   * the entire spread between a weapon that read correctly and a black cut-out,
   * and no function of the player's surroundings predicts it, because it is a
   * property of where they are *looking*.
   *
   * The two signals are complementary rather than redundant. The trim knows how
   * bright the frame is; the ray probe knows whether the player is standing in
   * shade, which the frame mean cannot see — indoors the walls are lit through
   * windows while the weapon in the player's hands is not. Dividing by the trim
   * and scaling by the probe uses each for the thing it can answer.
   *
   * `probe` is public and the adaptation target is 1x1, so this is a single-pixel
   * readback. It is still a pipeline sync, so it runs on one frame in eight,
   * sharing the ray probe's round-robin, and the result is damped. `exposureBase`
   * is private, but every term of it is public: it is the gameplay exposure offset
   * — pitch bias, flashbangs — times the preset's analytic exposure, and the
   * offset is only away from its target during a transient, which is not a moment
   * anyone is judging the finish on a receiver.
   */
  private readTrim(): void {
    const pipeline = this.ctx.engine.pipeline;
    const m = pipeline.probe('adapt');
    // Zero on the first frame, before anything has been metered.
    if (!m || m.r <= 1e-6) return;
    const gameplay = THREE.MathUtils.clamp(
      pipeline.exposureTarget,
      pipeline.exposureMin,
      pipeline.exposureMax,
    );
    // Mirrors `resolveExposure` in the composite. The sky's share of the frame
    // decides how much authority the trim is given, which is why it rides along in
    // the adaptation target's second channel.
    const open = THREE.MathUtils.smoothstep(m.g, 0.01, 0.1);
    const hi = THREE.MathUtils.lerp(pipeline.autoTrimMax, pipeline.autoTrimMaxOpen, open);
    this.trimTarget = THREE.MathUtils.clamp(
      pipeline.autoKey / Math.max(m.r * gameplay * pipeline.grade.exposure, 1e-5),
      pipeline.autoTrimMin,
      Math.max(hi, pipeline.autoTrimMin),
    );
    this.gameplayExposure = gameplay;
    // Snap on the first reading after a reset rather than damping up from 1. The
    // capture harness gives each scenario fourteen frames, which is not enough to
    // damp anywhere, so without this every reference shot but the last is graded
    // against the trim of the scene before it.
    if (!this.trimRead) {
      this.trimRead = true;
      this.trim = this.trimTarget;
    }
  }

  private probeLight(step: number): void {
    const physics = this.physics;
    if (!physics) return;
    const eye = this.ctx.viewCamera.position;
    // A teleport invalidates every sample at once, and damping toward the new
    // answer from the old one means carrying a cellar's tone out into the street
    // for half a second. Respawns do this, and so does the capture harness
    // between scenarios — which is how it was found.
    if (this.probed && eye.distanceToSquared(this.probeEye) > 9) {
      this.probed = false;
      this.trimRead = false;
      // Restart the sweep rather than waiting for the one in flight to come
      // round: half its samples were taken at the old position, and snapping to a
      // mixture of two places is worse than not snapping at all.
      this.probeSlot = 0;
    }
    this.probeEye.copy(eye);
    const slot = this.probeSlot;
    this.probeSlot = (slot + 1) % (SKY_RAYS.length + 1);
    if (slot === 0) this.readTrim();
    if (slot === SKY_RAYS.length) {
      // 40 m, not infinity: past that a ray is only finding the far side of the
      // level, and the sun is already effectively unoccluded.
      this.probeDir.copy(this.ctx.engine.pipeline.sunDirection).normalize();
      this.sunTarget = physics.trace(eye, this.probeDir, 40).hit ? 0 : 1;
    } else {
      // 14 m. Partial credit by distance, so a high hall reads as most of the way
      // open and a two-metre ceiling reads as closed: what is being estimated is
      // how much light gets in, and a courtyard four storeys up is not a cellar.
      const hit = physics.trace(eye, SKY_RAYS[slot], 14);
      this.skyHits[slot] = hit.hit ? THREE.MathUtils.clamp((hit.distance - 2) / 14, 0, 1) : 1;
      if (slot === SKY_RAYS.length - 1) {
        let sum = 0;
        for (let i = 0; i < SKY_RAYS.length; i++) sum += this.skyHits[i] * SKY_WEIGHTS[i];
        this.skyTarget = sum;
        if (!this.probed) {
          this.probed = true;
          this.skyOpen = this.skyTarget;
          this.sunLit = this.sunTarget;
        }
      }
    }
    this.sunLit = THREE.MathUtils.damp(this.sunLit, this.sunTarget, 5.5, step);
    this.skyOpen = THREE.MathUtils.damp(this.skyOpen, this.skyTarget, 5.5, step);
    this.trim = THREE.MathUtils.damp(this.trim, this.trimTarget, 5.5, step);

    // Modelled the way the light actually arrives: the sun is a hard source that
    // is either there or not, the sky is a dome that a roof takes away most of,
    // and there is a floor of bounce off whatever the player is standing next to
    // that never goes away.
    //
    // The sky carries more than four times the sun's weight here, which is not
    // how an outdoor scene is lit and is deliberate.
    //
    // Losing the sun happens constantly outdoors — every shadow the player
    // crosses — and it barely moves the exposure, because the sky is still
    // filling. It is also nearly meaningless at either end of the day: at golden
    // hour the sun sits ten degrees up, so a ray toward it travels almost
    // horizontally and is stopped by the first building within forty metres. The
    // probe reports zero sun in the middle of a sunlit yard, and it is not wrong
    // — the player is in a building's shadow — but the answer carries none of the
    // weight it does at noon.
    //
    // Losing the sky is the thing that only happens under a roof, and it is the
    // case that was out by two stops. Weighting them by which question the
    // correction exists to answer is what keeps the weapon steady outdoors while
    // still fixing the room.
    // The sun term is gated on the sky term. A player who cannot see any part of
    // the sky is not in direct sun whatever the sunward ray says, and that ray
    // does escape indoors — through an arch or a window, which is how the
    // interior probe came back reporting full sun in a stone hall.
    // The 0.22 floor was set so the weapon would not go black in a stone hall,
    // and it overshot: the receiver came back at 32% luminance against a 23%
    // wall and a 30% floor, which is a parkerised aluminium part reflecting more
    // than the lime plaster behind it. A dark anodised object cannot do that, and
    // being the brightest thing in a dark room is precisely the artefact that got
    // the weapon called aluminium foil.
    //
    const probe = 0.16 + 0.14 * this.sunLit * this.skyOpen + 0.64 * this.skyOpen;

    // Bounce lift for a shaded exterior, which is the case the ray probe is worst
    // at and the one that produced the black cut-out.
    //
    // The probe asks how much sky and sun this spot can see. Indoors that is the
    // right question. In a sunlit alley it is the wrong one: the walls are in full
    // sun and throw a great deal of light back, but only half the sky is visible
    // from the muzzle, so the probe returned 0.55 against open sun's 0.94 and the
    // weapon was lit at 58% of the street's.
    //
    // That 58% is not an estimate. Measured on the weapon's own silhouette, the
    // alley came out at 0.26x the frame mean against the street's 0.45x — a ratio
    // of 0.58, matching the two probe values to two figures. The whole outdoor
    // spread was this term and nothing else, which is what makes it safe to
    // correct here rather than in the four intensities.
    //
    // Sky openness is what separates a shaded exterior from an interior: an alley
    // has most of a hemisphere of bright wall over it, a cellar has none. So the
    // lift is gated on it, and at skyOpen = 0 this is exactly the old expression.
    const outdoors = THREE.MathUtils.smoothstep(this.skyOpen, 0.12, 0.75);
    const local = THREE.MathUtils.lerp(probe, Math.max(probe, 0.9), outdoors * 0.72);

    // Very nearly linear, because a reflectance scale *is* the physically right
    // response to less light arriving: the room and the weapon then dim
    // together, and the auto-exposure that follows lifts both, preserving the
    // ratio between them. The slight power under 1 is a hedge against the probe
    // reading a deeper shade than the room really is.
    // Colours from the scene's own view lights, so a preset change still reaches
    // the weapon: the key carries the sun's tint and the fill the sky's. Only
    // the directions and the levels are ours.
    // Both are pulled well back toward white. The preset's sun colour at golden
    // hour is a deep orange, and applied undiluted to the one light that carries
    // most of the weapon it made the whole rifle read as bronze — measured 38%
    // saturation on the receiver against a sunlit wall's 29%. A weapon is a
    // near-neutral object and has to stay one; 45% of the sun's tint is enough to
    // say what time of day it is.
    const scene = this.lighting;
    if (scene?.viewKey) {
      this.key.color.copy(scene.viewKey.color).lerp(WHITE, 0.55);
      // The fill takes the *sun's* hue, not the sky's, and keeps a good deal of
      // it. It sits below and behind the weapon, which is not where the sky is —
      // it is the ground, and the ground here is sand. Sand under any sun throws
      // warm light up into the underside of everything above it, and that bounce
      // is most of what fills the shadow side of a rifle carried over it.
      //
      // It used to be pulled 82% to white off the sky colour, which made it a
      // neutral grey light arriving from below: correct in direction, wrong in
      // every other respect, and it left the shadow side reading as a flat
      // near-black cutout with no warmth under it at all.
      this.fill.color.copy(scene.viewKey.color).lerp(SAND, 0.45);
      // The ambient is the sky, so it is cool and it is the term that lifts the
      // shadow side. Leaning it on the preset's own sky colour keeps golden hour
      // from being filled with noon blue.
      this.ambient.color.copy(scene.viewFill.color).lerp(SKY, 0.55);
    }
    // Linear in the probe, inverse in the exposure the frame will actually be
    // shown at. See `readTrim` for why the two terms together are the answer and
    // why neither alone is.
    //
    // Linear in the probe is the physically right response to less light arriving:
    // the room and the weapon dim together and the exposure that follows lifts
    // both, preserving the ratio between them. Every attempt to bend it — an
    // exponent of 1.28, then 1.9, with the gain moved each time to compensate — was
    // standing in for the exposure term, and each one traded one capture for
    // another, because the probe and the meter do not agree about which frames are
    // dark. With the exposure measured rather than guessed at, the exponent has
    // nothing left to do.
    //
    // The trim is clamped to its open-frame bound before being cancelled, and that
    // is the one deliberate asymmetry here. Indoors the trim runs to its 6.5
    // ceiling, and cancelling all of it says "the room is six and a half times
    // darker than the analytic solve thought, so hand the weapon six and a half
    // times less light" — but the trim is pinned at a *bound*, not reporting a
    // measurement, and the ray probe is already answering the enclosed case from
    // the other side. Doing both put the receiver a stop over the walls. Past the
    // bound the probe has it.
    // The bound above turned out to be most of what was left of the indoor
    // problem. Cutting the probe floor from 0.22 to 0.16 and then to 0.12 moved
    // the receiver from 1.40x the wall to 1.29x and then to 1.27x — almost
    // nothing, which is the signature of a term that is not being scaled by the
    // probe at all. It is this one: indoors the meter's trim runs to its 6.5
    // ceiling and the frame really is shown that much brighter, while the weapon
    // is only allowed to cancel `autoTrimMaxOpen` of it, so roughly four stops of
    // the room's lift never reach the weapon and it floats above the walls no
    // matter what the probe says.
    //
    // The bound is gone entirely, and the reasoning above for keeping one was
    // wrong.
    //
    // Every frame is graded to the meter's target, so the *displayed* mean of the
    // frame is the same number in a cellar as in open sun and carries no
    // information at all. What decides where the weapon lands against it is only
    // the rig level times the exposure the frame is actually shown at, which is
    // expo x trim with no clamp in it. Cancelling anything less than the whole
    // trim is the definition of letting the weapon float: indoors the frame was
    // shown 7.65x up and the weapon compensated for 3.2 of it, which is the entire
    // reason the interior measured 0.78x the frame mean while the sunlit scenes
    // measured 0.23x. Uncancelled exposure was the spread.
    const expo = this.ctx.engine.pipeline.grade.exposure;
    const shown = expo * this.trim;
    const level = Number(LEVEL_PROBE) || (LEVEL_GAIN * local) / Math.max(shown, 0.02);
    // The split between the four is as much of the calibration as the total is.
    //
    // Everything here was once tuned to put the receiver at the same luma as the
    // wall behind it, and matching a wall is the wrong target: the receiver's
    // albedo is about 5% and sunlit stucco is 25%, so equal luma meant the weapon
    // was being handed five times the light of the world it stood in, and a black
    // rifle read as bare aluminium.
    //
    // Now that the finishes have a specular lobe again the rim is worth three
    // times what it was, and the key gives up a little to pay for it. A dark
    // object is distinguished from a hole in the image by the highlight along its
    // edges and by nothing else, so on the two brightest captures in the set —
    // where the weapon is correctly a couple of stops under the frame — that
    // streak along the top of the receiver and the optic is the entire difference
    // between a rifle and a cut-out.
    this.key.intensity = 3.1 * level;
    this.fill.intensity = 1.9 * level;
    this.rim.intensity = 1.5 * level;
    // Skylight, and so gated on how much sky there is to see rather than riding
    // the overall level like the other three.
    //
    // This is the one term that has to move in opposite directions for the two
    // complaints against it: outdoors the weapon's shadow side measured 5-10%
    // against a 37-53% background and read as a black cutout, which wants far
    // more fill; indoors the receiver measured 32% against a 23% wall, which
    // wants less of everything. A flat share of `level` cannot do both, because
    // `level` is already near its floor indoors.
    //
    // Sky visibility is what actually distinguishes the two cases, and it is
    // already being probed. A rifle in open sun has a whole hemisphere of blue
    // over it; the same rifle two floors inside a stone hall has none, and the
    // only fill it gets is bounce off the room, which is what the 0.24 floor is.
    // An ambient with no occlusion lifts every surface equally, so it does most
    // for the views where most of what is on screen is unlit — which is the aiming
    // pose, where the frame is mostly shaded receiver under the optic. Measured,
    // that pose's receiver sits at 0.93x the frame mean against 0.4 to 0.55x for
    // the hip views, so this term is carrying the outdoor fix and an aiming-pose
    // overshoot at the same time.
    //
    // Cutting it to 0.78 was tried and measured: it bought 0.08 on the aiming pose
    // and gave back the entire outdoor gain, taking the rooftop from 0.41x back to
    // 0.23x. The two cannot be separated by a scalar, because the difference
    // between them is *orientation* — outdoor shadow sides face down and sideways,
    // the aiming pose's receiver faces the camera. A hemisphere light is the term
    // that distinguishes those and an ambient is not; that is the next change here,
    // and it wants a capture pass to land.
    this.ambient.intensity = 1.05 * level * (0.34 + 0.66 * this.skyOpen);

    // The environment gets the same treatment but shallower, because a sky probe
    // is at least the right *kind* of light for an outdoor scene at any exposure,
    // and it is only a few per cent of the total once the rig is up.
    const tone = Math.pow(local, 0.9);
    // The capture harness is the only place the probe can be checked against a
    // frame, and a tone that is silently wrong there looks exactly like a
    // material that is wrong.
    if (SHOT_MODE && Math.abs(tone - this.lastTone) > 0.02) {
      this.lastTone = tone;
      console.info(
        `[viewmodel] sun=${this.sunLit.toFixed(2)} sky=${this.skyOpen.toFixed(2)} ` +
          `local=${local.toFixed(3)} trim=${this.trim.toFixed(3)} ` +
          `gExp=${this.gameplayExposure.toFixed(3)} aExp=${expo.toFixed(3)} ` +
          `level=${level.toFixed(3)} key=${this.key.intensity.toFixed(2)} tone=${tone.toFixed(3)}`,
      );
    }
    this.current?.setTone(tone);
  }

  update(dt: number, ctx: EngineContext): void {
    if (!this.current) return;
    const def = this.weapons.def;
    const input = ctx.input;
    const ads = this.weapons.adsProgress;
    // Clamped at both ends. The lower clamp is not paranoia: the capture harness
    // restarts its clock at zero for each scenario, so the first tick of every
    // scenario after the first arrives with a large negative dt, and a negative
    // dt turns every spring-damper here into an extrapolator running backwards.
    // It showed up as the light probe reading a sky visibility of -0.31.
    const step = THREE.MathUtils.clamp(dt, 0, 1 / 30);
    this.probeLight(step);

    // ---- sway from the camera's own rotation ----------------------------
    // Taken from the camera quaternion delta rather than from a private field
    // on the player: this picks up mouse look, controller look, recoil kick
    // and camera shake in one measurement, and cannot silently read undefined
    // when the player's internals are refactored.
    let yawRate = 0;
    let pitchRate = 0;
    const camQ = ctx.viewCamera.quaternion;
    if (this.lookInit && step > 1e-5) {
      this._tmpQ.copy(this.lookQuat).invert().premultiply(camQ);
      this._tmpE.setFromQuaternion(this._tmpQ, 'YXZ');
      yawRate = THREE.MathUtils.clamp(this._tmpE.y / step, -14, 14);
      pitchRate = THREE.MathUtils.clamp(this._tmpE.x / step, -14, 14);
    }
    this.lookQuat.copy(camQ);
    this.lookInit = true;

    // Look rate drives an *acceleration*, so the impulse has to be scaled by
    // the timestep. Adding a fixed nudge per frame instead — which is what
    // this did — makes the weapon trail two and a half times as far on a
    // 144 Hz display as on a 60 Hz one, and tuning it on either leaves it
    // wrong on the other.
    const swayScale = THREE.MathUtils.lerp(1, 0.24, ads) * step * 60;
    this.swayVel.x += yawRate * 0.020 * swayScale;
    this.swayVel.y += pitchRate * 0.016 * swayScale;
    this.swayRotVel.y += -yawRate * 0.30 * swayScale;
    this.swayRotVel.x += -pitchRate * 0.26 * swayScale;
    this.swayRotVel.z += yawRate * 0.34 * swayScale;

    springDamp3(this.swayPos, this.swayVel, 128, 17, step);
    springDamp3(this.swayRot, this.swayRotVel, 108, 15, step);
    this.swayPos.clampScalar(-0.055, 0.055);
    this.swayRot.clampScalar(-0.20, 0.20);

    // ---- recoil ----------------------------------------------------------
    const deliver = Math.min(1, step * 42);
    this.recoilRotVel.x += this.pitchPending * deliver;
    this.pitchPending *= 1 - deliver;

    // Translation is stiff and quick; rotation is looser and overshoots, so
    // the weapon is already coming back when the muzzle is still climbing.
    springDamp3(this.recoilPos, this.recoilPosVel, THREE.MathUtils.lerp(300, 430, ads), THREE.MathUtils.lerp(23, 29, ads), step);
    springDamp3(this.recoilRot, this.recoilRotVel, THREE.MathUtils.lerp(178, 240, ads), THREE.MathUtils.lerp(15.5, 19, ads), step);
    this.climb = THREE.MathUtils.damp(this.climb, 0, 4.2, step);

    // ---- gait ------------------------------------------------------------
    const speed = Math.hypot(this.player.velocity.x, this.player.velocity.z);
    const moving = this.player.grounded && speed > 0.4;
    const bobFreq = this.player.sprinting ? 9.1 : 7.0;
    if (moving) this.bobPhase += step * bobFreq * THREE.MathUtils.clamp(speed / 4.1, 0.5, 1.7);
    const bobStrength = THREE.MathUtils.lerp(
      moving ? THREE.MathUtils.clamp(speed / 6.6, 0, 1) : 0,
      0,
      ads * 0.85,
    );

    if (!this.player.grounded) this.wasGrounded = false;
    else if (!this.wasGrounded) {
      this.wasGrounded = true;
      this.landDipVel -= 1.9;
    }
    const [ld, ldv] = spring1(this.landDip, this.landDipVel, 210, 19, step);
    this.landDip = ld;
    this.landDipVel = ldv;

    this.breathPhase += step * (ads > 0.5 ? 1.05 : 1.5);
    this.idlePhase += step;

    // ---- pose blend ------------------------------------------------------
    const solved = this.adsPose.get(def.id);
    const adsPos = solved ? solved.pos : def.adsPosition;
    const adsRot = solved ? solved.rot : def.adsRotation;
    // Ease the ADS blend: linear reads as mechanical. Fast out of the hip,
    // settling gently onto the sight picture.
    const adsEase = ads * ads * (3 - 2 * ads);

    this._tmpV.lerpVectors(def.hipPosition, adsPos, adsEase);
    this._tmpE.set(
      THREE.MathUtils.lerp(def.hipRotation.x, adsRot.x, adsEase),
      THREE.MathUtils.lerp(def.hipRotation.y, adsRot.y, adsEase),
      THREE.MathUtils.lerp(def.hipRotation.z, adsRot.z, adsEase),
      'YXZ',
    );

    // ---- sprint ----------------------------------------------------------
    const sprintBlend = (this.player.sprinting && moving ? 1 : 0) * (1 - ads);
    this.current.sprintBlend = THREE.MathUtils.damp(this.current.sprintBlend, sprintBlend, 8.5, step);
    const sb = this.current.sprintBlend;
    const sprint = this.current.sprintPose;
    this._tmpV.lerp(sprint.position, sb);
    this._tmpE.x = THREE.MathUtils.lerp(this._tmpE.x, sprint.rotation.x, sb);
    this._tmpE.y = THREE.MathUtils.lerp(this._tmpE.y, sprint.rotation.y, sb);
    this._tmpE.z = THREE.MathUtils.lerp(this._tmpE.z, sprint.rotation.z, sb);

    // ---- reload ----------------------------------------------------------
    this._reloadPos.set(0, 0, 0);
    this._reloadRot.set(0, 0, 0, 'YXZ');
    if (this.reloadClock >= 0) {
      this.reloadClock += step;
      const t = THREE.MathUtils.clamp(this.reloadClock / this.reloadDuration, 0, 1);
      reloadCurve(t, this.reloadEmpty, this._reloadPos, this._reloadRot, this.current);
      if (this.reloadClock >= this.reloadDuration) {
        this.reloadClock = -1;
        this.current.setMagazineVisible(true);
        this.current.setBoltBack(0);
      }
    } else {
      // Last round out and the bolt stays back. It is a tiny thing that no
      // player would ever ask for and every player reads instantly: the gun
      // tells you it is empty before the ammo counter does, and the ejection
      // port standing open is the only reason a dry click needs no explaining.
      this.current.setBoltBack(this.weapons.active.mag === 0 ? 1 : 0);
    }

    // ---- inspect ---------------------------------------------------------
    this._extraPos.set(0, 0, 0);
    this._extraRot.set(0, 0, 0, 'YXZ');
    if (input.pressed('inspect') && this.inspectClock < 0 && this.reloadClock < 0) {
      this.inspectClock = 0;
    }
    if (this.inspectClock >= 0) {
      this.inspectClock += step;
      const t = this.inspectClock / 2.1;
      if (t >= 1) {
        this.inspectClock = -1;
      } else {
        // Roll the weapon over to look down the left side, hold, and return.
        const e = Math.sin(Math.min(t * 1.35, 1) * Math.PI) ** 0.7;
        this._extraRot.set(-0.30 * e, 0.66 * e, 0.52 * e, 'YXZ');
        this._extraPos.set(-0.055 * e, 0.012 * e, 0.075 * e);
      }
    }

    // ---- assemble --------------------------------------------------------
    const bobX = Math.sin(this.bobPhase) * 0.020 * bobStrength;
    const bobY = -Math.abs(Math.cos(this.bobPhase)) * 0.016 * bobStrength;
    const bobRoll = Math.sin(this.bobPhase) * 0.030 * bobStrength;
    const bobPitch = Math.cos(this.bobPhase * 2) * 0.013 * bobStrength;

    const breathAmp = ads > 0.5 ? 0.0013 : 0.0038;
    const breathY = Math.sin(this.breathPhase) * breathAmp;
    const breathX = Math.sin(this.breathPhase * 0.63) * breathAmp * 0.75;

    // Idle drift. Three decorrelated periods so the weapon never repeats and
    // never sits perfectly still — a motionless view model is the single
    // clearest tell that a gun is a prop parented to the camera.
    const idleScale = (1 - ads * 0.72) * (1 - bobStrength * 0.6);
    const idleYaw = (Math.sin(this.idlePhase * 0.47) + Math.sin(this.idlePhase * 0.83) * 0.6) * 0.0075 * idleScale;
    const idlePitch = (Math.sin(this.idlePhase * 0.61 + 1.3) + Math.sin(this.idlePhase * 1.07) * 0.5) * 0.0062 * idleScale;
    const idleRoll = Math.sin(this.idlePhase * 0.39 + 2.1) * 0.0090 * idleScale;

    const raise = this.weapons.raise;
    const lowered = (1 - raise) * (1 - raise) * 0.34;

    this.root.position.set(
      this._tmpV.x + this.swayPos.x + this.recoilPos.x + bobX + breathX + this._reloadPos.x + this._extraPos.x,
      this._tmpV.y + this.swayPos.y + this.recoilPos.y + bobY + breathY + this._reloadPos.y + this._extraPos.y - lowered + this.landDip * 0.055,
      this._tmpV.z + this.swayPos.z + this.recoilPos.z + this._reloadPos.z + this._extraPos.z,
    );

    this.root.rotation.set(
      this._tmpE.x + this.swayRot.x + this.recoilRot.x + this.climb + bobPitch + idlePitch + this._reloadRot.x + this._extraRot.x + lowered * 2.3,
      this._tmpE.y + this.swayRot.y + this.recoilRot.y + idleYaw + this._reloadRot.y + this._extraRot.y,
      this._tmpE.z + this.swayRot.z + this.recoilRot.z + bobRoll + idleRoll + this._reloadRot.z + this._extraRot.z,
      'YXZ',
    );

    this._frame.dt = step;
    this._frame.ads = ads;
    this._frame.elapsed = ctx.time.elapsed;
    this._frame.eye.copy(ctx.viewCamera.position);
    this.current.update(this._frame);

    // A fixed view FOV so the weapon does not distort when the world FOV
    // changes for sprint; only aiming narrows it, and only a little, so the
    // optic grows without the arms ballooning.
    const targetFov = THREE.MathUtils.lerp(60, 47, adsEase);
    if (Math.abs(ctx.viewCamera.fov - targetFov) > 0.02) {
      ctx.viewCamera.fov = targetFov;
      ctx.viewCamera.updateProjectionMatrix();
    }
  }

  /**
   * World-space position of a view-model point, corrected for the FOV split.
   *
   * The view model is drawn with a narrower camera than the world, so a world
   * effect placed at the view model's literal 3D position lands somewhere else
   * on screen — a muzzle flash floating off the barrel by half its own width.
   * Scaling the lateral offset by the ratio of the two half-angle tangents
   * puts the effect where the muzzle *appears*, which is the only place it can
   * be right.
   */
  private projectToWorld(node: THREE.Object3D, out: THREE.Vector3): THREE.Vector3 {
    const vc = this.ctx.viewCamera;
    const cam = this.ctx.camera;
    node.getWorldPosition(out);
    vc.worldToLocal(out);
    const k =
      Math.tan(THREE.MathUtils.degToRad(cam.fov * 0.5)) /
      Math.tan(THREE.MathUtils.degToRad(vc.fov * 0.5));
    out.x *= k;
    out.y *= k;
    return cam.localToWorld(out);
  }

  /** World-space muzzle position, for VFX that must line up exactly. */
  getMuzzleWorld(out: THREE.Vector3): THREE.Vector3 {
    if (!this.current) return out.set(0, 0, 0);
    return this.projectToWorld(this.current.muzzle, out);
  }

  /** World-space ejection port, so brass leaves the weapon and not the camera. */
  getEjectionWorld(out: THREE.Vector3): THREE.Vector3 {
    if (!this.current) return out.set(0, 0, 0);
    return this.projectToWorld(this.current.ejectionPort, out);
  }

  dispose(): void {
    for (const m of this.models.values()) m.dispose();
    this.models.clear();
    void this._tmpV2;
  }
}

// ------------------------------------------------------------- helpers -----

/**
 * Solves the aim pose: the transform that lands the optic's optical axis on
 * the camera axis, at the optic's own eye relief.
 *
 * `adsPosition` in the weapon data is kept as documentation of the intent,
 * but the number that ships is this one, because it is derived from the same
 * geometry the player is looking through.
 */
function solveAdsPose(
  def: WeaponDef,
  model: WeaponModel,
): { pos: THREE.Vector3; rot: THREE.Euler } {
  const rot = def.adsRotation.clone();
  const q = new THREE.Quaternion().setFromEuler(rot);
  const centre = model.opticCentre.position.clone().applyQuaternion(q);
  const pos = new THREE.Vector3(0, 0, -model.eyeRelief).sub(centre);
  return { pos, rot };
}

function spring1(x: number, v: number, k: number, d: number, dt: number): [number, number] {
  const nv = v + (-k * x - d * v) * dt;
  return [x + nv * dt, nv];
}

function springDamp3(pos: THREE.Vector3, vel: THREE.Vector3, k: number, d: number, dt: number): void {
  vel.x += (-k * pos.x - d * vel.x) * dt;
  vel.y += (-k * pos.y - d * vel.y) * dt;
  vel.z += (-k * pos.z - d * vel.z) * dt;
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;
  pos.z += vel.z * dt;
}

/**
 * Procedural reload.
 *
 * Four phases: tilt the weapon in and drop the magazine, reach off-screen,
 * seat the new one, then run the bolt on an empty reload. Timings are
 * normalised so the same curve works for a 1.4 s pistol reload and a 2.9 s
 * rifle reload.
 */
function reloadCurve(
  t: number,
  empty: boolean,
  pos: THREE.Vector3,
  rot: THREE.Euler,
  model: WeaponModel,
): void {
  const ease = (a: number, b: number, x: number): number => {
    const u = THREE.MathUtils.clamp((x - a) / Math.max(b - a, 1e-4), 0, 1);
    return u * u * (3 - 2 * u);
  };

  // Phase 1: tilt in and down as the support hand comes off the handguard.
  const tilt = ease(0, 0.17, t) * (1 - ease(0.66, 0.92, t));
  rot.z += tilt * 0.52;
  rot.y += tilt * 0.30;
  rot.x += tilt * 0.14;
  pos.y -= tilt * 0.052;
  pos.x -= tilt * 0.028;

  // Phase 2: the magazine drops free.
  model.setMagazineVisible(!(t > 0.20 && t < (empty ? 0.60 : 0.56)));

  // Phase 3: the new magazine seats with a short upward shove.
  const seat = ease(0.42, 0.56, t) * (1 - ease(0.56, 0.68, t));
  pos.y += seat * 0.021;
  rot.x -= seat * 0.085;

  // Phase 4: bolt release on an empty reload.
  //
  // An empty reload starts with the bolt already locked back — that is what
  // makes it empty — so the bolt is held at 1 from the first frame and *drops*
  // when the hand hits the release. The first version eased it back at t=0.7
  // and forward again at t=0.9, which had the weapon cycling itself halfway
  // through a reload, backwards.
  let bolt = 0;
  if (empty) {
    bolt = 1 - ease(0.74, 0.82, t);
    // The shove is the release, not the whole travel: a short knock forward as
    // the carrier slams home, gone within a tenth of a second.
    const slam = ease(0.74, 0.80, t) * (1 - ease(0.80, 0.88, t));
    pos.z += slam * 0.011;
    rot.z += slam * 0.09;
  }
  model.setBoltBack(bolt);

  const settle = 1 - ease(0.80, 1.0, t);
  pos.multiplyScalar(settle);
  rot.x *= settle;
  rot.y *= settle;
  rot.z *= settle;
}

export type { WeaponDef };
