import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GpsScreen } from './textures';
import type { FlightTelemetry, FloatState } from './physics';
import { CANVAS_PERIOD, createBuildContext, N_CHANNELS, N_LIGHTS } from './parts/context';
import { buildMaterials } from './parts/materials';
import { buildFittings, buildFuselageFrame, buildFuselageShell } from './parts/fuselage';
import { buildPropeller } from './parts/propeller';
import { buildWing } from './parts/wing';
import { buildTail } from './parts/tail';
import { buildLights } from './parts/lights';
import { buildFloats } from './parts/floats';
import { buildCockpitPanel } from './parts/cockpitPanel';
import { buildCockpitControls } from './parts/cockpitControls';
import { buildCabinTrim, buildSeats } from './parts/cabin';
import { buildPilot } from './parts/pilot';
import * as anim from './parts/animate';

/**
 * Procedural bush floatplane "Garza 7". Local axes: +X nose, +Y up, +Z starboard. Origin at the
 * fuselage datum roughly under the wing's 30% chord; the floats' keels sit near y = -2.25.
 *
 * Static parts are merged per material (one draw call each); only the animated parts (propeller, control
 * surfaces, water rudders, wheels, yokes, pedals, levers, lights, instruments) are separate meshes.
 *
 * The constructor is a fixed sequence of part builders (`parts/*.ts`, see the README); the per-frame animation
 * lives in `parts/animate.ts`, which is why the animation state (uniforms, accumulators, hinge groups) is public.
 */
export class PlaneModel {
  readonly root = new THREE.Group();
  readonly materials: THREE.Material[] = [];
  readonly glassMaterial: THREE.MeshPhysicalMaterial;
  readonly paintMaterial: THREE.MeshPhysicalMaterial;
  // animated parts
  readonly propeller = new THREE.Group();
  readonly propDisc: THREE.Mesh;
  readonly propDiscPivot = new THREE.Group();
  /** spinner + hub (always turning) and the three blades (hidden at speed, when the blur disc takes over) */
  readonly propHub: THREE.Mesh;
  readonly propBlades: THREE.Mesh;
  readonly aileronL: THREE.Group;
  readonly aileronR: THREE.Group;
  readonly flapL: THREE.Group;
  readonly flapR: THREE.Group;
  readonly elevator: THREE.Group;
  readonly rudder: THREE.Group;
  readonly waterRudders: THREE.Group[];
  readonly wheels: THREE.Group;
  /**
   * All navigation lights in one mesh: lens caps by day, emissive points at night. Per-channel power
   * (red/green wingtips, white tail, red beacon, white strobes) is driven through `lightPower`.
   */
  readonly lights: THREE.Mesh;
  readonly lightPower = { value: new Float32Array(N_LIGHTS) };
  /** glow sprites behind the lenses (one mesh, additive), driven by the same channel powers */
  readonly lightGlow: THREE.Mesh;
  /** cabin glow seen in / through the glass after dusk (0 by day .. 1 at night) */
  readonly glassUniforms: { uCabinGlow: { value: number } };
  readonly yokeL: THREE.Group;
  readonly yokeR: THREE.Group;
  readonly throttleLever: THREE.Mesh;
  readonly flapLever: THREE.Mesh;
  /** rudder pedals: the two left pedals (pilot + copilot) swing together, likewise the two right ones */
  readonly pedalsL: THREE.Mesh;
  readonly pedalsR: THREE.Mesh;
  /** live instrument parts (needles, cards) and the moving-map screen */
  readonly instruments: THREE.Mesh;
  readonly gpsMesh: THREE.Mesh;
  readonly gps = new GpsScreen();
  readonly instAngle = { value: new Float32Array(N_CHANNELS) };
  readonly instShift = { value: new Float32Array(N_CHANNELS * 2) };
  readonly panelMat: THREE.MeshStandardMaterial;
  readonly instMat: THREE.MeshStandardMaterial;
  readonly gpsMat: THREE.MeshStandardMaterial;
  canvasAcc = CANVAS_PERIOD;
  /** current gauge readings in display units (for the bench's verification) */
  readonly gaugeState = { kt: 0, ft: 0, fpm: 0, hdg: 0, bankDeg: 0, pitchDeg: 0, rpm: 0, map: 0, turnRateDps: 0, slip: 0 };
  /** hardpoints in local space */
  readonly exhaustPos = new THREE.Vector3(2.6, -0.55, 0.66);
  readonly floatSternL = new THREE.Vector3(-2.2, -2.15, -1.25);
  readonly floatSternR = new THREE.Vector3(-2.2, -2.15, 1.25);
  readonly floatBowL = new THREE.Vector3(2.6, -2.0, -1.25);
  readonly floatBowR = new THREE.Vector3(2.6, -2.0, 1.25);
  readonly wingTipL = new THREE.Vector3(-0.04, 1.40, -7.5);
  readonly wingTipR = new THREE.Vector3(-0.04, 1.40, 7.5);
  /** hull-local y of the wet line on each float: port bow, port stern, starboard bow, starboard stern (setWaterline) */
  readonly wetLine = { value: new THREE.Vector4(-2.02, -1.94, -2.02, -1.94) };
  /** pilot's eye: left seat, 0.13 m under the headliner (inner crest 1.13), at the windshield's vertical centre (0.99) */
  readonly cockpitEye = new THREE.Vector3(1.0, 0.93, -0.30);
  readonly exteriorMeshes: THREE.Mesh[] = [];
  readonly interiorMeshes: THREE.Object3D[] = [];
  readonly spanHalf = 7.5;

  constructor() {
    // the loft comes first: the skin and cabin textures are painted in its layout, so the materials need it
    const fuselage = buildFuselageFrame();
    const mat = buildMaterials(fuselage.layout, { wetLine: this.wetLine, instAngle: this.instAngle, instShift: this.instShift, gpsTexture: this.gps.texture }, this.materials);
    this.glassMaterial = mat.glass;
    this.paintMaterial = mat.paint;
    this.glassUniforms = mat.glassUniforms;
    this.panelMat = mat.panelMat; this.instMat = mat.instMat; this.gpsMat = mat.gpsMat;

    // The part builders run in a fixed order; keep it. three.js sorts opaque objects by material id and then by
    // object id, so the creation order of materials and meshes is part of the rendered result, and the shared
    // batches (fittings, white, airframe, cabin*) are merged into their meshes by the last part that adds to them.
    const ctx = createBuildContext(this, mat, fuselage);
    buildFuselageShell(ctx);
    buildFittings(ctx);
    const prop = buildPropeller(ctx, this.propeller, this.propDiscPivot);
    this.propHub = prop.propHub; this.propBlades = prop.propBlades; this.propDisc = prop.propDisc;
    const wing = buildWing(ctx);
    this.flapL = wing.flapL; this.flapR = wing.flapR; this.aileronL = wing.aileronL; this.aileronR = wing.aileronR;
    const tail = buildTail(ctx);
    this.elevator = tail.elevator; this.rudder = tail.rudder;
    const lights = buildLights(ctx, wing.spec, this.lightPower, this.wingTipL, this.wingTipR);
    this.lights = lights.lights; this.lightGlow = lights.lightGlow;
    const floats = buildFloats(ctx, wing.spec);
    this.waterRudders = floats.waterRudders; this.wheels = floats.wheels;
    const panel = buildCockpitPanel(ctx);
    this.instruments = panel.instruments; this.gpsMesh = panel.gpsMesh;
    const controls = buildCockpitControls(ctx, panel.inPanel);
    this.throttleLever = controls.throttleLever; this.flapLever = controls.flapLever;
    this.pedalsL = controls.pedalsL; this.pedalsR = controls.pedalsR;
    this.yokeL = controls.yokeL; this.yokeR = controls.yokeR;
    buildSeats(ctx);
    buildPilot(ctx, this.cockpitEye);
    buildCabinTrim(ctx);

    // the cabin batches are complete: one mesh each, and the atlas-textured parts in one more
    const { mesh, cabinFixed, cabinShell, cabinKit, textured } = ctx;
    mesh(cabinFixed.build(), mat.parts, { exterior: false, cast: false });
    mesh(cabinShell.build(), mat.cabinMat, { exterior: false, cast: false });
    mesh(cabinKit.build(), mat.parts, { exterior: false });
    const texturedGeo = mergeGeometries(textured);
    if (!texturedGeo) throw new Error('cockpit: textured parts have incompatible attributes');
    mesh(texturedGeo, mat.panelMat, { exterior: false, cast: false });

    for (const m of this.materials) if ((m as THREE.MeshStandardMaterial).isMeshStandardMaterial) (m as THREE.MeshStandardMaterial).envMapIntensity = 1.0;
    // the lining sees little sky: less environment light than the open-air parts (the sun still comes in through the glass)
    mat.cabinMat.envMapIntensity = 0.55;
    this.setInstruments(null, 0, 0);
  }

  /**
   * Move the wet line on each float to the immersion the flight model reports (hull-local y at the bow and stern
   * keel points, see parts/animate.ts).
   */
  setWaterline(floats: readonly FloatState[], dt: number, speed: number): void { anim.setWaterline(this, floats, dt, speed); }

  /**
   * Animate control surfaces, propeller, lights, cockpit controls and instruments. Inputs in [-1,1], flaps 0..1,
   * rpm 0..1. With `telemetry` the gauges read the live flight state (`throttle` drives the throttle lever).
   */
  animate(pitch: number, roll: number, yaw: number, flaps: number, rpm: number, dt: number, time: number, night: number, gearDown: boolean, telemetry: FlightTelemetry | null = null, throttle = rpm): void {
    anim.animate(this, pitch, roll, yaw, flaps, rpm, dt, time, night, gearDown, telemetry, throttle);
  }

  /** Gauge readings from the flight state (deterministic: everything derives from the telemetry). */
  setInstruments(t: FlightTelemetry | null, rpm01: number, throttle: number): void { anim.setInstruments(this, t, rpm01, throttle); }

  /** current gauge readings (display units) for verification against the HUD */
  debugGauges(): typeof this.gaugeState { return { ...this.gaugeState }; }
}
