import * as THREE from 'three';
import { CSM } from 'three/examples/jsm/csm/CSM.js';
import type { Params, Quality } from './core/params';
import { Atmosphere } from './world/atmosphere';
import { WorldMap } from './world/map';
import { Sky } from './world/sky';
import { MapTextures, Terrain } from './world/terrain';
import { Water } from './world/water';
import { WakeMap } from './render/wakes';
import { PostPipeline } from './render/post';
import { buildRoadMeshes, buildRoadNetwork, createRoadMaterial, type RoadSegment } from './world/roads';
import { buildBridges, type BridgeBuild } from './world/bridges';
import { buildCity, type CityBuild } from './world/city';
import { Vegetation } from './world/vegetation';
import { Props } from './world/props';
import { Traffic } from './world/traffic';
import { Aircraft } from './plane/aircraft';
import { FlightCamera } from './plane/camera';
import { Metrics } from './core/metrics';
import { ViewCull, configureMainCamera, installCascadeRouting } from './world/culling';

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
  post!: PostPipeline;
  roads!: RoadSegment[];
  bridges!: BridgeBuild;
  city!: CityBuild;
  vegetation!: Vegetation;
  props!: Props;
  traffic!: Traffic;
  aircraft!: Aircraft;
  flightCamera!: FlightCamera;
  readonly cull = new ViewCull();
  width = 1;
  height = 1;
  time = 0;
  private envTimer = 0;
  private lastEnvHour = -1;
  private readonly litMaterials = new Set<THREE.Material>();
  readonly windVec = new THREE.Vector3();

  constructor(readonly canvas: HTMLCanvasElement, readonly params: Params) {
    this.quality = QUALITY[params.quality];
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', logarithmicDepthBuffer: true, alpha: false, stencil: false, preserveDrawingBuffer: true });
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.autoClear = true;
    this.renderer.info.autoReset = false;
    this.camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.4, 60000);
    configureMainCamera(this.camera);
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
    this.csm = new CSM({
      camera: this.camera, parent: this.scene, cascades: q.cascades, maxFar: q.shadowFar, mode: 'practical', shadowMapSize: q.shadowMapSize,
      lightDirection: new THREE.Vector3(0.3, -1, 0.2).normalize(), lightIntensity: 1, shadowBias: -0.0002, lightMargin: 300,
    });
    this.csm.fade = true;
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

    await this.tick(progress, 'Laying out streets', 0.4);
    const network = buildRoadNetwork(this.map);
    this.roads = network.segments;
    const roadMat = createRoadMaterial();
    this.registerLit(roadMat);
    const roadRender: THREE.Material = this.params.debugRoads ? new THREE.MeshBasicMaterial({ color: 0xff2020 }) : roadMat;
    for (const m of buildRoadMeshes(this.map, this.roads, roadRender)) { m.name = 'roads'; this.scene.add(m); }

    await this.tick(progress, 'Raising bridges', 0.46);
    const concrete = new THREE.MeshStandardMaterial({ color: 0xb8b4aa, roughness: 0.9 });
    const steel = new THREE.MeshStandardMaterial({ color: 0xd9dde2, roughness: 0.4, metalness: 0.6 });
    this.registerLit(concrete); this.registerLit(steel);
    this.bridges = buildBridges(this.map, roadRender, concrete, steel);
    this.bridges.group.name = 'bridges';
    this.scene.add(this.bridges.group);

    await this.tick(progress, 'Building the city', 0.52);
    this.city = buildCity(this.map, network.blocksByDistrict, this.atmos.uniforms.uNight);
    this.registerLit(this.city.batches.material);
    this.city.batches.group.name = 'city';
    this.scene.add(this.city.batches.group);
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

    await this.tick(progress, 'Planting palms and mangroves', 0.74);
    this.vegetation = new Vegetation(this.map, this.city.occupied);
    for (const m of this.vegetation.materials) this.registerLit(m);
    this.vegetation.group.name = 'vegetation';
    this.scene.add(this.vegetation.group);

    await this.tick(progress, 'Launching boats and traffic', 0.86);
    this.traffic = new Traffic(this.map, this.roads, this.bridges.routes, this.wakes.scene, this.params.seed, this.props.mooredBoatPositions);
    for (const m of this.traffic.materials) this.registerLit(m);
    this.traffic.group.name = 'traffic';
    this.scene.add(this.traffic.group);
    for (const c of this.traffic.contrailMeshes) { c.name = 'contrail'; this.scene.add(c); }

    await this.tick(progress, 'Pre-flighting the aircraft', 0.92);
    this.aircraft = new Aircraft((x, z) => this.map.heightAt(x, z), this.scene, this.wakes.scene);
    this.registerTree(this.aircraft.model.root);
    this.flightCamera = new FlightCamera(this.camera);
    this.flightCamera.groundHeight = (x, z) => Math.max(0, this.map.heightAt(x, z));
    // default spawn: on the water at the downtown seaplane base facing east
    const base = this.map.pois.find((p) => p.kind === 'seaplane')!;
    this.aircraft.place(base.x + 120, 1.6, base.z + 60, Math.PI * 0.5, 0, 0, 0, 0);

    this.post = new PostPipeline(this.renderer, this.atmos, { samples: q.samples, bloom: q.bloom });
    const dbg = this.params.dbg;
    if (dbg.has('noterrain')) this.terrain.group.visible = false;
    if (dbg.has('noshadow')) this.renderer.shadowMap.enabled = false;
    if (dbg.has('noveg')) this.vegetation.group.visible = false;
    if (dbg.has('nocity')) this.city.batches.group.visible = false;
    if (dbg.has('nocloudshadow')) this.post.cloudShadowStrength = 0;
    this.atmos.update(0);
    this.refreshEnvironment();
    progress('Ready', 1);
  }

  refreshEnvironment(): void {
    const env = this.sky.updateEnvironment();
    this.scene.environment = env;
    this.scene.environmentIntensity = this.atmos.state.ambientIntensity;
    this.lastEnvHour = this.atmos.hour;
  }

  setSize(w: number, h: number, pixelRatio = 1): void {
    this.width = w; this.height = h;
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.post.setSize(Math.round(w * pixelRatio), Math.round(h * pixelRatio));
    this.csm.updateFrustums();
  }

  /** Advance the environment + aircraft simulation by dt seconds. */
  update(dt: number, simulatePlane = true): void {
    this.time += dt;
    this.atmos.update(dt);
    const s = this.atmos.state;
    this.csm.lightDirection.copy(s.sunDir).negate();
    for (const l of this.csm.lights) { l.intensity = s.sunIntensity; l.color.copy(s.sunColor); }
    this.envTimer += dt;
    if (Math.abs(this.atmos.hour - this.lastEnvHour) > 0.02 || this.envTimer > 5) { this.envTimer = 0; this.refreshEnvironment(); }
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
    const wantFar = Math.min(12000, Math.max(this.quality.shadowFar, cam.position.y * 9));
    if (Math.abs(wantFar - this.csm.maxFar) > 200) { this.csm.maxFar = wantFar; this.csm.updateFrustums(); }
    // view / shadow-caster culling shared by the chunked world systems
    this.cull.update(cam, this.csm.maxFar, this.atmos.state.sunDir);
    this.terrain.update(cx, cz);
    this.vegetation.updateLod(cx, cz, this.cull);
    this.city.batches.updateLod(cx, cz, this.cull);
    this.props.updateLod(cx, cz, this.cull);
    this.traffic.updateCulling(this.cull);
    this.water.update(cx, cz, this.time, this.atmos.preset.windSpeed, this.atmos.windDir, this.atmos.state.sunDir, this.wakes.center, this.wakes.size);
    this.wakes.render(this.renderer, cx, cz);
    this.csm.update();
    for (const l of this.csm.lights) {
      const sc = l.shadow.camera;
      const texel = (sc.right - sc.left) / l.shadow.mapSize.width;
      // normal bias proportional to the texel keeps flat terrain free of acne; 1.5 texels (0.8-4.9 m) was
      // detaching every contact shadow, 0.6 keeps the aircraft/pier/tree shadows attached
      l.shadow.normalBias = texel * 0.6;
      l.shadow.bias = -0.0003;
    }
    this.sky.render(this.renderer, cam, this.post.width, this.post.height);
    this.renderer.setRenderTarget(this.post.target);
    this.renderer.render(this.scene, cam);
    this.post.finish(cam, this.time);
    this.metrics.endFrame();
  }
}
