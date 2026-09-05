import * as THREE from 'three';
import { CSM } from 'three/examples/jsm/csm/CSM.js';
import { REFLECTION_RANGE, REFLECTION_SCALE, type Params, type Quality } from './core/params';
import { smoothstep } from './core/noise';
import { Atmosphere } from './world/atmosphere';
import { WorldMap } from './world/map';
import { Sky } from './world/sky';
import { MapTextures, Terrain } from './world/terrain';
import { Water } from './world/water';
import { WakeMap } from './render/wakes';
import { PostPipeline } from './render/post';
import { PlanarReflection, boundsRadius, distanceToBounds, trianglesOf } from './render/reflection';
import { CascadeFitter, installCascadeDebug } from './render/shadows';
import { buildRoadMeshes, buildRoadNetwork, createRoadMaterial, type RoadSegment } from './world/roads';
import { buildBridges, type BridgeBuild } from './world/bridges';
import { buildCity, type CityBuild } from './world/city';
import { MIRROR_DISTANCE, Vegetation } from './world/vegetation';
import { Props } from './world/props';
import { Traffic } from './world/traffic';
import { Aircraft } from './plane/aircraft';
import { FlightCamera } from './plane/camera';
import { Metrics } from './core/metrics';
import { LAYER_MAIN, ViewCull, configureMainCamera, installCascadeRouting, layerMask, shadowPassStats } from './world/culling';

const _size = new THREE.Vector2();
/** the water does not mirror car cells whose nearest car is beyond this (m): a car is under a mirror texel there */
const MIRROR_TRAFFIC_FAR = 3500;

export interface QualitySettings {
  samples: number;
  shadowMapSize: number;
  cascades: number;
  cloudSteps: number;
  skyScale: number;
  shadowFar: number;
  anisotropy: number;
  bloom: boolean;
}

export const QUALITY: Record<Quality, QualitySettings> = {
  low: { samples: 0, shadowMapSize: 1024, cascades: 2, cloudSteps: 10, skyScale: 0.35, shadowFar: 1500, anisotropy: 2, bloom: true },
  medium: { samples: 2, shadowMapSize: 2048, cascades: 3, cloudSteps: 16, skyScale: 0.5, shadowFar: 2500, anisotropy: 4, bloom: true },
  high: { samples: 4, shadowMapSize: 2048, cascades: 3, cloudSteps: 24, skyScale: 0.6, shadowFar: 3500, anisotropy: 8, bloom: true },
  ultra: { samples: 4, shadowMapSize: 4096, cascades: 4, cloudSteps: 32, skyScale: 1.0, shadowFar: 5000, anisotropy: 16, bloom: true },
};

export type PassName = 'wake' | 'sky' | 'shadow' | 'reflection' | 'main' | 'post';

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly atmos: Atmosphere;
  readonly quality: QualitySettings;
  readonly metrics: Metrics;
  map!: WorldMap;
  textures!: MapTextures;
  terrain!: Terrain;
  water!: Water;
  sky!: Sky;
  wakes!: WakeMap;
  csm!: CSM;
  cascades!: CascadeFitter;
  post!: PostPipeline;
  reflection!: PlanarReflection;
  roads!: RoadSegment[];
  bridges!: BridgeBuild;
  city!: CityBuild;
  vegetation!: Vegetation;
  props!: Props;
  traffic!: Traffic;
  aircraft!: Aircraft;
  /** airframe meshes that cast shadows, routed to the cascades their shadow can reach each frame */
  private readonly airframeCasters: THREE.Object3D[] = [];
  /** cabin furniture that casts: its shadows fall inside the cabin, which only the nearest cascade (the one
   *  fit around the aircraft) resolves; the ground cascades see the closed skin */
  private readonly cabinCasters: THREE.Object3D[] = [];
  flightCamera!: FlightCamera;
  readonly cull = new ViewCull();
  /** draw calls / triangles of the last shadow pass per cascade (diagnostics) */
  readonly shadowPassStats = shadowPassStats;
  /** draw calls / triangles of the last frame per pass (diagnostics; renderer.info deltas, so free) */
  readonly passStats: Record<PassName, { calls: number; triangles: number }> = {
    wake: { calls: 0, triangles: 0 }, sky: { calls: 0, triangles: 0 }, shadow: { calls: 0, triangles: 0 },
    reflection: { calls: 0, triangles: 0 }, main: { calls: 0, triangles: 0 }, post: { calls: 0, triangles: 0 },
  };
  width = 1;
  height = 1;
  time = 0;
  private envTimer = 0;
  private lastEnvHour = -1;
  private lastEnvWeather = '';
  private readonly litMaterials = new Set<THREE.Material>();
  readonly windVec = new THREE.Vector3();

  constructor(readonly canvas: HTMLCanvasElement, readonly params: Params) {
    this.quality = QUALITY[params.quality];
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', logarithmicDepthBuffer: true, alpha: false, stencil: false, preserveDrawingBuffer: true });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // shadow maps are rendered once per frame, by the first scene render of render() (see PlanarReflection)
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.autoClear = true;
    this.renderer.info.autoReset = false;
    this.camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.4, 60000);
    configureMainCamera(this.camera);
    this.camera.layers.enable(LAYER_MAIN);
    this.atmos = new Atmosphere(params.seed);
    if (params.time !== null) this.atmos.hour = params.time;
    if (params.weather) this.atmos.setWeather(params.weather);
    this.metrics = new Metrics(this.renderer);
  }

  registerLit(mat: THREE.Material): void {
    if (this.litMaterials.has(mat)) return;
    this.litMaterials.add(mat);
    const own = mat.onBeforeCompile;
    this.csm.setupMaterial(mat);
    const csmHook = mat.onBeforeCompile;
    mat.onBeforeCompile = (shader, renderer) => {
      csmHook.call(mat, shader, renderer);
      own?.call(mat, shader, renderer);
    };
    mat.needsUpdate = true;
  }

  private registerTree(obj: THREE.Object3D): void {
    obj.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (!m) return;
      for (const mat of Array.isArray(m) ? m : [m]) {
        if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) this.registerLit(mat);
      }
    });
  }

  private async tick(progress: (label: string, p: number) => void, label: string, p: number): Promise<void> {
    progress(label, p);
    await new Promise((r) => setTimeout(r, 0));
  }

  async init(progress: (label: string, p: number) => void): Promise<void> {
    await this.tick(progress, 'Surveying the coastline', 0.02);
    this.map = new WorldMap();
    this.map.generate((p) => progress('Shaping islands and bays', 0.02 + p * 0.3));
    await this.tick(progress, 'Uploading terrain', 0.33);
    this.textures = new MapTextures(this.map, this.renderer);

    const q = this.quality;
    this.cascades = new CascadeFitter(this.camera);
    this.csm = new CSM({
      camera: this.camera, parent: this.scene, cascades: q.cascades, maxFar: q.shadowFar, mode: 'custom', customSplitsCallback: this.cascades.splitsCallback, shadowMapSize: q.shadowMapSize,
      lightDirection: new THREE.Vector3(0.3, -1, 0.2).normalize(), lightIntensity: 1, shadowBias: -0.0002, lightMargin: 300,
    });
    this.cascades.attach(this.csm);
    this.csm.fade = true;
    if (this.params.dbg.has('cascades')) installCascadeDebug();
    // route casters per cascade: thin / small objects only reach the near cascades (see culling.ts)
    installCascadeRouting(this.renderer, (l) => this.csm.lights.indexOf(l as THREE.DirectionalLight));

    this.sky = new Sky(this.atmos, this.renderer, { cloudSteps: q.cloudSteps, scale: q.skyScale });
    this.sky.dome.name = 'sky';
    this.scene.add(this.sky.dome);
    this.wakes = new WakeMap(2048, 3200); // 1.56 m/px: boat wakes are 3-10 m wide
    this.terrain = new Terrain(this.textures);
    this.registerLit(this.terrain.material);
    this.terrain.group.name = 'terrain';
    this.scene.add(this.terrain.group);
    this.water = new Water(this.textures, this.wakes.texture);
    this.registerLit(this.water.material);
    this.water.mesh.name = 'water';
    this.scene.add(this.water.mesh);
    // planar reflection pass (after installCascadeRouting: it wraps the routed shadow render). The mirror image
    // only needs what is close enough to survive the roughness streaking: beyond the reflection range the
    // terrain clipmap rings, building tiles and prop chunks are left out (the water there mirrors the
    // environment sky, which is what a streak that long carries anyway).
    const reflRange = REFLECTION_RANGE[this.params.quality];
    this.reflection = new PlanarReflection(this.renderer, this.atmos, REFLECTION_SCALE[this.params.quality], reflRange);
    this.reflection.exclude(this.water.mesh, this.sky.dome);
    this.reflection.excludeChildrenWhen(this.terrain.group, (ring) => boundsRadius(ring) > reflRange * 1.2);
    this.water.attachReflection(this.reflection.uniforms);

    await this.tick(progress, 'Laying out streets', 0.4);
    const network = buildRoadNetwork(this.map);
    this.roads = network.segments;
    const roadMat = createRoadMaterial();
    this.registerLit(roadMat);
    const roadRender: THREE.Material = this.params.debugRoads ? new THREE.MeshBasicMaterial({ color: 0xff2020 }) : roadMat;
    // roads lie flat on the terrain: not worth mirroring (one 250 k-triangle mesh)
    for (const m of buildRoadMeshes(this.map, this.roads, roadRender)) { m.name = 'roads'; this.scene.add(m); this.reflection.exclude(m); }

    await this.tick(progress, 'Raising bridges', 0.46);
    const concrete = new THREE.MeshStandardMaterial({ color: 0xb8b4aa, roughness: 0.9 });
    const steel = new THREE.MeshStandardMaterial({ color: 0xd9dde2, roughness: 0.4, metalness: 0.6 });
    this.registerLit(concrete); this.registerLit(steel);
    this.bridges = buildBridges(this.map, roadRender, concrete, steel);
    this.bridges.group.name = 'bridges';
    this.scene.add(this.bridges.group);
    // the instanced steelwork that is too fine to cast a shadow (railings, hangers, cable stays: ~130 k
    // triangles) is far below a texel of the mirror image as well
    this.reflection.excludeChildrenWhen(this.bridges.group, (m) => (m as THREE.InstancedMesh).isInstancedMesh === true && !m.castShadow);

    await this.tick(progress, 'Building the city', 0.52);
    this.city = buildCity(this.map, network.blocksByDistrict, this.atmos.uniforms.uNight);
    this.registerLit(this.city.batches.material);
    this.city.batches.group.name = 'city';
    this.scene.add(this.city.batches.group);
    // building tiles and prop chunks carry world-space bounds: mirror those within the reflection range
    const beyondRange = (o: THREE.Object3D, cam: THREE.PerspectiveCamera) => distanceToBounds(o, cam) > reflRange;
    // (the buildings in view are drawn from per-kind batches: the camera ones stay out of the mirror, the
    // mirror ones hold exactly the tiles within range)
    const cityB = this.city.batches;
    this.reflection.excludeChildrenWhen(cityB.group, (o, cam) => cityB.cameraMeshes.has(o) || (!cityB.mirrorMeshes.has(o) && beyondRange(o, cam)));
    // roads occupy ground so trees keep off them
    for (const s of this.roads) {
      const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
      const n = Math.max(1, Math.ceil(len / 10));
      for (let i = 0; i <= n; i++) this.city.markOccupied(s.a[0] + (s.b[0] - s.a[0]) * (i / n), s.a[1] + (s.b[1] - s.a[1]) * (i / n), s.width * 0.5 + 3);
    }

    await this.tick(progress, 'Dressing harbours and airports', 0.66);
    this.props = new Props(this.map, this.roads, this.bridges.lampPositions, this.city.markOccupied);
    for (const m of this.props.materials) this.registerLit(m);
    this.props.group.name = 'props';
    this.scene.add(this.props.group);
    const props = this.props;
    this.reflection.excludeChildrenWhen(props.group, (o, cam) => props.cameraMeshes.has(o) || (!props.mirrorMeshes.has(o) && beyondRange(o, cam)));

    await this.tick(progress, 'Planting palms and mangroves', 0.74);
    this.vegetation = new Vegetation(this.map, this.city.occupied);
    for (const m of this.vegetation.materials) this.registerLit(m);
    this.vegetation.group.name = 'vegetation';
    this.scene.add(this.vegetation.group);
    // mirror only the card impostors, and only within 1.5 km: the 3D near-tile meshes are far too heavy for
    // a blurred mirror image and farther tiles blur into the environment sky anyway. The cards come from the
    // vegetation's mirror batch (its camera batch holds every card tile in view, so it stays out); likewise the
    // near palms come from the vegetation's mirror palm batch (the cells in the mirror frustum of the tiles within range)
    const veg = this.vegetation;
    this.reflection.excludeChildrenWhen(veg.group, (tile, cam) => tile === veg.cameraCards || tile === veg.cameraPalms || (tile !== veg.mirrorCards && tile !== veg.mirrorPalms && (trianglesOf(tile) > 64 || distanceToBounds(tile, cam) > MIRROR_DISTANCE)));

    await this.tick(progress, 'Launching boats and traffic', 0.86);
    this.traffic = new Traffic(this.map, this.roads, this.bridges.routes, this.wakes.batch, this.params.seed, this.props.mooredBoatPositions);
    for (const m of this.traffic.materials) this.registerLit(m);
    this.traffic.group.name = 'traffic';
    this.scene.add(this.traffic.group);
    // a car is under a texel of the mirror image beyond MIRROR_TRAFFIC_FAR: cells with no car nearer stay out
    const traffic = this.traffic;
    this.reflection.excludeChildrenWhen(traffic.group, (o, cam) => traffic.carCellMeshes.has(o) && distanceToBounds(o, cam) > MIRROR_TRAFFIC_FAR);
    for (const c of this.traffic.contrailMeshes) { c.name = 'contrail'; this.scene.add(c); }

    await this.tick(progress, 'Pre-flighting the aircraft', 0.92);
    this.aircraft = new Aircraft((x, z) => this.map.heightAt(x, z), this.scene, this.wakes.batch);
    this.registerTree(this.aircraft.model.root);
    const interior = new Set<THREE.Object3D>(this.aircraft.model.interiorMeshes);
    this.aircraft.model.root.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.castShadow) (interior.has(o) ? this.cabinCasters : this.airframeCasters).push(o); });
    // surface decals, point sprites and trails are not mirrored (the sprites are sized for the main frame),
    // nor is the cabin interior (only visible through the glass)
    const fx = this.aircraft.effects;
    this.reflection.exclude(fx.stampL.mesh, fx.stampR.mesh, fx.spray.points, fx.exhaust.points, fx.vortexL.mesh!, fx.vortexR.mesh!, ...this.traffic.contrailMeshes, ...this.aircraft.model.interiorMeshes);
    this.flightCamera = new FlightCamera(this.camera);
    this.flightCamera.groundHeight = (x, z) => Math.max(0, this.map.heightAt(x, z));
    // default spawn: on the water at the downtown seaplane base facing east
    const base = this.map.pois.find((p) => p.kind === 'seaplane')!;
    this.aircraft.place(base.x + 120, 1.6, base.z + 60, 0, 0, 0, 0, 0); // facing north: 3 km of open water ahead

    this.post = new PostPipeline(this.renderer, this.atmos, { samples: q.samples, bloom: q.bloom });
    const dbg = this.params.dbg;
    if (dbg.has('noterrain')) this.terrain.group.visible = false;
    if (dbg.has('noshadow')) this.renderer.shadowMap.enabled = false;
    if (dbg.has('noveg')) this.vegetation.group.visible = false;
    if (dbg.has('nocity')) this.city.batches.group.visible = false;
    if (dbg.has('nobridges')) this.bridges.group.visible = false;
    if (dbg.has('notraffic')) this.traffic.group.visible = false;
    if (dbg.has('nocloudshadow')) { this.post.cloudShadowStrength = 0; this.reflection.cloudShadowStrength = 0; }
    if (dbg.has('norefl')) this.reflection.enabled = false;
    this.atmos.update(0);
    this.refreshEnvironment();
    await this.tick(progress, 'Compiling shaders', 0.97);
    this.warmShaders();
    progress('Ready', 1);
  }

  /**
   * Compile every material up front. Effects that only appear later (spray, exhaust, contrails, hull foam,
   * propeller blur disc, night lights) otherwise compile their programs on first use, which showed up as a
   * multi-second stall on the first frame of flight in the benchmark clips.
   */
  private warmShaders(): void {
    // 1. a real flying frame: spray, exhaust, float wakes, hull foam, propeller disc and their shadow-pass
    //    depth variants only get programs when they are actually drawn
    const f = this.aircraft.flight;
    const saved = { p: f.position.clone(), q: f.quaternion.clone(), v: f.velocity.clone(), w: f.omega.clone(), rpm: f.rpm, thr: this.aircraft.inputs.throttle };
    const spawnY = f.position.y;
    // on the water at planing speed (spray + wakes), then airborne (prop disc, contrails), both rendered
    this.aircraft.place(f.position.x, spawnY, f.position.z, Math.PI * 0.5, 0, 0, 14, 1.0);
    this.aircraft.inputs.throttle = 1.0;
    const camPos = this.camera.position.clone(), camQ = this.camera.quaternion.clone();
    this.flightCamera.snap();
    for (let i = 0; i < 3; i++) { this.update(1 / 30, true); this.flightCamera.update(f, this.aircraft.model, 1 / 30); }
    this.render();
    this.aircraft.place(f.position.x, 60, f.position.z, Math.PI * 0.5, 0.05, 0.1, 50, 1.0);
    this.aircraft.inputs.throttle = 1.0;
    for (let i = 0; i < 3; i++) { this.update(1 / 30, true); this.flightCamera.update(f, this.aircraft.model, 1 / 30); }
    this.render();
    // 2. whatever is still hidden (night lights, lamps) compiles through the renderer
    const hidden: THREE.Object3D[] = [];
    this.scene.traverse((o) => { if (!o.visible) { o.visible = true; hidden.push(o); } });
    try { this.renderer.compile(this.scene, this.camera); } finally { for (const o of hidden) o.visible = false; }
    // restore the spawn state exactly (place() also resets the effects)
    this.aircraft.place(saved.p.x, saved.p.y, saved.p.z, Math.PI * 0.5, 0, 0, 0, saved.thr);
    f.quaternion.copy(saved.q); f.velocity.copy(saved.v); f.omega.copy(saved.w); f.rpm = saved.rpm;
    this.aircraft.syncModel();
    this.camera.position.copy(camPos); this.camera.quaternion.copy(camQ);
    this.flightCamera.snap();
    this.time = 0;
  }

  refreshEnvironment(): void {
    const env = this.sky.updateEnvironment();
    this.scene.environment = env;
    this.scene.environmentIntensity = this.atmos.state.ambientIntensity;
    this.lastEnvHour = this.atmos.hour;
    this.lastEnvWeather = this.atmos.weather;
  }

  setSize(w: number, h: number, pixelRatio = 1): void {
    this.width = w; this.height = h;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.post.setSize(Math.round(w * pixelRatio), Math.round(h * pixelRatio));
    this.reflection.setSize(Math.round(w * pixelRatio), Math.round(h * pixelRatio));
    this.csm.updateFrustums();
  }

  /** Advance the environment + aircraft simulation by dt seconds. */
  update(dt: number, simulatePlane = true): void {
    this.time += dt;
    this.atmos.update(dt);
    const s = this.atmos.state;
    this.csm.lightDirection.copy(s.sunDir).negate();
    // under a broken / overcast deck the direct beam is partly scattered by the clouds: cast shadows lighten
    // with the coverage (the key light itself is already dimmed by the weather preset)
    const shadowStrength = 1 - 0.45 * smoothstep(0.45, 0.95, this.atmos.preset.coverage);
    for (const l of this.csm.lights) { l.intensity = s.sunIntensity; l.color.copy(s.sunColor); l.shadow.intensity = shadowStrength; }
    this.envTimer += dt;
    // the IBL probe only depends on the sun position and weather (no clouds in the probe), so refresh it on
    // a time-of-day change; the old 5 s timer re-ran the PMREM (a multi-pass cubemap convolution) as a
    // periodic hitch even when nothing had changed
    if (Math.abs(this.atmos.hour - this.lastEnvHour) > 0.02 || this.atmos.weather !== this.lastEnvWeather || this.envTimer > 120) { this.envTimer = 0; this.refreshEnvironment(); }
    this.scene.environmentIntensity = s.ambientIntensity;
    const p = this.atmos.preset;
    this.windVec.set(this.atmos.windDir.x, 0, this.atmos.windDir.y).multiplyScalar(p.windSpeed);
    this.vegetation.update(this.time, p.windSpeed);
    this.traffic.update(dt, this.time, s.night);
    this.props.setNight(s.night);
    this.aircraft.update(dt, this.time, s.night, this.windVec, p.turbulence, this.height, simulatePlane);
  }

  render(): void {
    this.metrics.beginFrame();
    this.renderer.info.reset();
    const cam = this.camera;
    cam.updateMatrixWorld();
    const cx = cam.position.x, cz = cam.position.z;
    // shadow range grows with altitude so a high aerial still shows building shadows
    const wantFar = Math.min(12000, Math.max(this.quality.shadowFar, Math.round(cam.position.y * 9 / 250) * 250));
    const planePos = this.aircraft.flight.position;
    const groundY = Math.max(0, this.map.heightAt(cx, cz));
    this.cascades.updateSplits(wantFar, planePos, 9, groundY);
    // fit the cascades (replaces CSM.update: slab-clipped extents, depth range following the slice, biases per
    // texel); the culling below routes casters by the cascade slices and texels this produces
    this.cascades.fit(planePos.y + 5);
    // view / shadow-caster culling shared by the chunked world systems
    this.cull.update(cam, this.csm.maxFar, this.atmos.state.sunDir);
    // the fitted shadow cameras: casters outside one are culled by the shadow pass, so cells / tiles outside it
    // need not be submitted to that cascade's batches
    this.cull.setCascadeLights(this.csm.lights);
    this.terrain.update(cx, cz, this.cull);
    // casters reach as far as the cascades do; the canopy stops at half the range (a crown's shadow is a
    // couple of texels there and every tile is a draw call per cascade)
    this.city.batches.shadowDistance = this.csm.maxFar;
    this.vegetation.shadowDistance = Math.max(1800, Math.min(3000, this.csm.maxFar * 0.4));
    this.vegetation.updateLod(cx, cz, this.cull, cam.position);
    // focal length in pixels of the main frame: the sub-pixel cut-offs of houses and props scale with it
    const pxPerMetre = 0.5 * this.renderer.getDrawingBufferSize(_size).y * cam.projectionMatrix.elements[5];
    this.city.batches.updateLod(cx, cz, this.cull, cam.position, this.reflection.range, pxPerMetre);
    this.props.updateLod(cx, cz, this.cull, cam.position, this.reflection.range, pxPerMetre);
    this.traffic.updateCulling(this.cull);
    // the airframe casts only into the cascades its shadow can reach: swept down to the ground under it, so
    // from altitude that is the cascade holding its ground shadow, not all three
    const airHeight = planePos.y - Math.max(0, this.map.heightAt(planePos.x, planePos.z)) + 5;
    const airBits = this.cull.casterCascades(planePos, 9, airHeight);
    const airMask = layerMask('all', true, airBits);
    for (const o of this.airframeCasters) o.layers.mask = airMask;
    const cabinMask = layerMask('all', true, airBits & 1);
    for (const o of this.cabinCasters) o.layers.mask = cabinMask;
    this.water.update(cx, cz, this.time, this.atmos.preset.windSpeed, this.atmos.windDir, this.atmos.state.sunDir, this.wakes.center, this.wakes.size);
    const info = this.renderer.info.render;
    const ps = this.passStats;
    const mark = this.markPass;
    this.passCalls0 = info.calls; this.passTriangles0 = info.triangles;
    this.wakes.render(this.renderer, cx, cz);
    mark('wake');
    this.sky.render(this.renderer, cam, this.post.width, this.post.height);
    mark('sky');
    // the shadow cascades are rendered by the first of the two scene renders below (the mirror pass when it
    // runs, else the main pass) and reused by the second
    this.renderer.shadowMap.needsUpdate = true;
    this.reflection.render(this.scene, cam);
    mark('reflection');
    this.renderer.setRenderTarget(this.post.target);
    this.renderer.render(this.scene, cam);
    mark('main');
    // the shadow pass ran inside whichever scene render came first: split it out of that pass
    let sc = 0, st = 0;
    for (let i = 0; i < shadowPassStats.calls.length; i++) { sc += shadowPassStats.calls[i]; st += shadowPassStats.triangles[i]; }
    ps.shadow.calls = sc; ps.shadow.triangles = st;
    const host = this.reflection.uniforms.uReflParams.value.x > 0 ? ps.reflection : ps.main;
    host.calls -= sc; host.triangles -= st;
    this.post.finish(cam, this.time);
    mark('post');
    if (this.params.dbg.has('reflview')) this.reflection.debugBlit();
    this.metrics.endFrame();
  }

  private passCalls0 = 0;
  private passTriangles0 = 0;
  /** Close the pass `name` on the renderer.info counters (deltas since the previous mark; a few integer ops). */
  private readonly markPass = (name: PassName): void => {
    const info = this.renderer.info.render, p = this.passStats[name];
    p.calls = info.calls - this.passCalls0; p.triangles = info.triangles - this.passTriangles0;
    this.passCalls0 = info.calls; this.passTriangles0 = info.triangles;
  };
}
