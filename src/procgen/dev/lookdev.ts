/**
 * Material lookdev sheet.
 *
 * Bakes the whole library outside the game and lays every material out on a
 * sphere plus a tiled panel, so relief, roughness response and tile seams can be
 * judged against real IBL. Served by the dev server only:
 *
 *   npx vite
 *   http://localhost:5173/src/procgen/dev/lookdev.html
 *     ?tier=ultra|high|medium|low   quality preset (default high)
 *     &only=concrete_wall,brick_red  subset, comma separated
 *     &repeat=4                     tile repeats on the panel
 *     &mode=tile                    flat panels only, for hunting tile seams
 *     &mode=sky                     look at the sun, for checking the IBL range
 *     &geom=bevel                   bevelBox instead of roundedBoxGeometry
 */
import * as THREE from 'three';
import { makeConfig, type QualityTier } from '../../core/Config';
import type { EngineContext } from '../../core/System';
import type { MaterialId } from '../../core/Contracts';
import { MATERIAL_ORDER, ProcgenSystemImpl } from '../index';
import { addUV2, bevelBox, computeTangents, roundedBoxGeometry } from '../GeometryUtils';

const params = new URLSearchParams(location.search);
const tier = (params.get('tier') ?? 'high') as QualityTier;
const only = params.get('only');
const repeat = Number(params.get('repeat') ?? 3);
const mode = params.get('mode') ?? '';
const tileMode = mode === 'tile';
const skyMode = mode === 'sky';

const reportEl = document.getElementById('report') as HTMLDivElement;
const errorsEl = document.getElementById('errors') as HTMLPreElement;
const canvas = document.getElementById('view') as HTMLCanvasElement;

const shaderErrors: string[] = [];
const failedSources: Array<{ name: string; vertex: string; fragment: string }> = [];

function showErrors(): void {
  if (shaderErrors.length === 0) return;
  errorsEl.hidden = false;
  errorsEl.textContent = shaderErrors.join('\n\n');
}

/** Name plate for a cell, drawn on a 2D canvas so no font asset is needed. */
function labelTexture(text: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 64;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.fillStyle = '#0d0f11';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#e6edf2';
  g.font = '600 34px ui-monospace, monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2 + 2);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

async function main(): Promise<void> {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.debug.onShaderError = (gl, program, vs, fs) => {
    const parts: string[] = [];
    for (const [label, shader] of [
      ['vertex', vs],
      ['fragment', fs],
    ] as const) {
      const log = gl.getShaderInfoLog(shader)?.trim();
      if (!log) continue;
      const source = gl.getShaderSource(shader) ?? '';
      const lines = source.split('\n');
      const cited = new Set<number>();
      for (const match of log.matchAll(/:(\d+):/g)) cited.add(Number(match[1]));
      const context = [...cited]
        .sort((a, b) => a - b)
        .map((n) => `  ${n}: ${lines[n - 1] ?? ''}`)
        .join('\n');
      parts.push(`--- ${label} ---\n${log}\n${context}`);
    }
    const link = gl.getProgramInfoLog(program)?.trim();
    if (link) parts.push(`--- link ---\n${link}`);
    const name = /#define SHADER_NAME (.*)/.exec(gl.getShaderSource(fs) ?? '')?.[1] ?? 'unknown';
    shaderErrors.push(`[${name}] ${parts.join('\n') || 'compile failed with no log'}`);
    failedSources.push({
      name,
      vertex: gl.getShaderSource(vs) ?? '',
      fragment: gl.getShaderSource(fs) ?? '',
    });
    showErrors();
  };

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.05, 200);
  const config = makeConfig(tier);

  // The system only reads renderer and config from the context.
  const ctx = { renderer, config, scene, camera } as unknown as EngineContext;

  const procgen = new ProcgenSystemImpl();
  const started = performance.now();
  await procgen.init(ctx);
  const initMs = performance.now() - started;

  const ids: MaterialId[] = only
    ? (only.split(',').filter(Boolean) as MaterialId[])
    : [...MATERIAL_ORDER];
  const warmStarted = performance.now();
  procgen.warm(ids);
  const warmMs = performance.now() - warmStarted;

  scene.environment = procgen.environmentMap;
  scene.background = procgen.skyTexture;

  const sun = new THREE.DirectionalLight(0xfff2e0, 2.6);
  sun.position.copy(procgen.sunDirection).multiplyScalar(40);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.02));

  const sphere = computeTangents(addUV2(new THREE.SphereGeometry(0.42, 96, 64)));
  const panel = computeTangents(addUV2(new THREE.PlaneGeometry(1.0, 1.0, 32, 32)));
  const block = computeTangents(
    addUV2(
      params.get('geom') === 'bevel'
        ? bevelBox(0.62, 0.62, 0.62, 0.09, 1.6)
        : roundedBoxGeometry(0.62, 0.62, 0.62, 0.07, 3),
    ),
  );

  const cell = 1.5;
  const group = new THREE.Group();

  if (skyMode) {
    const up = new THREE.Vector3(0, 1, 0);
    // Yaw off the sun's bearing far enough for three-quarter lighting, but not so
    // far that the disc leaves a wide frame: both must be visible at once.
    const forward = new THREE.Vector3(procgen.sunDirection.x, 0, procgen.sunDirection.z)
      .normalize()
      .applyAxisAngle(up, THREE.MathUtils.degToRad(52));
    forward.y = 0.2;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();
    const eye = group.position.clone().addScaledVector(forward, -3.6);

    // Classic IBL reference row: chrome, a roughness ramp and 18% grey. Anything
    // wrong with the environment's luminance range shows up here first.
    const probes: Array<[string, number, number, number]> = [
      ['chrome', 0.03, 1.0, 0xf2f2f2],
      ['steel r0.2', 0.2, 1.0, 0xbcbcbc],
      ['steel r0.45', 0.45, 1.0, 0xbcbcbc],
      ['grey 18% r0.6', 0.6, 0.0, 0x767676],
      ['white r0.12', 0.12, 0.0, 0xdddddd],
    ];
    probes.forEach(([label, roughness, metalness, color], index) => {
      const offset = (index - (probes.length - 1) / 2) * 1.12;
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        envMapIntensity: 1.0,
      });
      const ball = new THREE.Mesh(sphere, material);
      ball.position.copy(right).multiplyScalar(offset);
      group.add(ball);

      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(1.02, 0.13),
        new THREE.MeshBasicMaterial({ map: labelTexture(label), toneMapped: false }),
      );
      plate.position.copy(ball.position).addScaledVector(up, -0.62);
      plate.lookAt(eye);
      group.add(plate);
    });
    scene.add(group);

    camera.fov = 78;
    camera.position.copy(eye);
    camera.lookAt(group.position.clone().addScaledVector(up, 0.85));
    camera.updateProjectionMatrix();
  } else {
    const columns = Math.max(1, Math.min(ids.length, Math.ceil(Math.sqrt(ids.length * 1.55))));

    ids.forEach((id, index) => {
      const cx = (index % columns) * cell;
      const cy = -Math.floor(index / columns) * cell;

      const back = new THREE.Mesh(panel, procgen.materials.tiled(id, repeat, repeat));
      back.scale.setScalar(cell * (tileMode ? 0.99 : 0.94));
      back.position.set(cx, cy, -0.55);
      group.add(back);

      if (!tileMode) {
        const ball = new THREE.Mesh(sphere, procgen.materials.get(id));
        ball.position.set(cx - 0.3, cy + 0.08, 0.1);
        group.add(ball);

        const cube = new THREE.Mesh(block, procgen.materials.get(id));
        cube.position.set(cx + 0.36, cy - 0.06, 0.05);
        cube.rotation.set(0.35, 0.7, 0.1);
        group.add(cube);
      }

      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(cell * 0.9, cell * 0.11),
        new THREE.MeshBasicMaterial({ map: labelTexture(id), toneMapped: false }),
      );
      plate.position.set(cx, cy - cell * 0.42, 0.12);
      group.add(plate);
    });

    const rows = Math.ceil(ids.length / columns);
    const width = columns * cell;
    const height = rows * cell;
    group.position.set(-width / 2 + cell / 2, height / 2 - cell / 2, 0);
    scene.add(group);

    const halfV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
    const halfH = halfV * camera.aspect;
    const dist = Math.max(height / 2 / halfV, width / 2 / halfH);
    camera.position.set(0, 0, dist * 1.06 + 0.8);
    camera.lookAt(0, 0, 0);
  }

  const stats = procgen.materials.stats;
  const summary = {
    tier,
    materials: stats.baked,
    textures: stats.textures,
    megabytes: Number((stats.bytes / 1048576).toFixed(1)),
    bakePrograms: stats.programs,
    bakePasses: stats.passes,
    initMs: Math.round(initMs),
    fullSetMs: Math.round(initMs + warmMs),
    shaderErrors,
  };
  reportEl.textContent = [
    `tier            ${tier} (base ${config.textureResolution}px, aniso ${config.anisotropy})`,
    `materials       ${stats.baked}/${stats.total}`,
    `textures        ${stats.textures}  (${summary.megabytes} MB)`,
    `bake programs   ${stats.programs} in ${stats.passes} passes`,
    `init()          ${summary.initMs} ms   full set ${summary.fullSetMs} ms`,
    `shader errors   ${shaderErrors.length}`,
  ].join('\n');
  console.info('[lookdev]', summary);

  renderer.compile(scene, camera);
  showErrors();

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  let spin = 0;
  let last = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    procgen.update(dt);
    spin += dt * 0.35;
    group.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.geometry === block) {
        child.rotation.y = 0.7 + spin;
      }
    });
    renderer.render(scene, camera);
  });

  Object.assign(window as unknown as Record<string, unknown>, {
    PROCGEN: procgen,
    PROCGEN_SUMMARY: summary,
    PROCGEN_FAILED: failedSources,
    PROCGEN_SCENE: scene,
    MAKE_CONFIG: makeConfig,
    PROCGEN_READY: true,
  });
}

main().catch((err) => {
  reportEl.textContent = `failed: ${err instanceof Error ? err.message : String(err)}`;
  shaderErrors.push(String(err instanceof Error ? (err.stack ?? err.message) : err));
  showErrors();
  console.error(err);
});
