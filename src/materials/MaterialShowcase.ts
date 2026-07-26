import * as THREE from 'three';
import type { GameContext } from '../core/GameContext';
import { Layers } from '../core/GameContext';
import type { MaterialName } from '../core/Interfaces';
import { registerVantages } from '../core/Vantage';
import type MaterialLibrary from './MaterialLibrary';

/**
 * Debug scene for judging the material library, enabled with
 * `?showcase=materials`.
 *
 * Every material gets a sphere (to read the specular response and normal map
 * curvature) and a flat plate showing 2x2 tiles (to catch seams and judge the
 * pattern), lit by a three-point rig. Vantage points are registered per
 * material and per row so the critique loop can frame tight shots.
 */

const COLS = 6;
const SPACING = 2.5;
const ROW_SPACING = 2.25;

export function installMaterialShowcase(ctx: GameContext, lib: MaterialLibrary): void {
  const names = [...lib.names];
  const rows = Math.ceil(names.length / COLS);
  const root = new THREE.Group();
  root.name = 'MaterialShowcase';

  // The grid is placed well above the level so nothing else intrudes.
  const origin = new THREE.Vector3(0, 120, 0);
  root.position.copy(origin);

  const build = () => {
    const sphereGeo = new THREE.SphereGeometry(0.55, 96, 64);
    const plateGeo = new THREE.PlaneGeometry(1.4, 1.4, 1, 1);

    names.forEach((name, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = (col - (COLS - 1) / 2) * SPACING;
      const y = -row * ROW_SPACING;

      const mat = lib.get(name) as THREE.Material;
      // Two tiles across the plate so any seam shows up as a hard line.
      const plateMat = lib.tiled(name, 2, 2);

      const sphere = new THREE.Mesh(sphereGeo, mat);
      sphere.position.set(x - 0.58, y, 0.15);
      sphere.castShadow = true;
      sphere.receiveShadow = true;
      root.add(sphere);

      const plate = new THREE.Mesh(plateGeo, plateMat);
      plate.position.set(x + 0.78, y, 0);
      plate.castShadow = true;
      plate.receiveShadow = true;
      root.add(plate);

      root.add(makeLabel(name, x, y - 0.9));
    });

    // Neutral mid-grey cyclorama so judgements are not tinted by the level.
    const backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(COLS * SPACING + 8, rows * ROW_SPACING + 10),
      new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.95, metalness: 0 }),
    );
    backdrop.position.set(0, -((rows - 1) * ROW_SPACING) / 2, -2.2);
    backdrop.receiveShadow = true;
    root.add(backdrop);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(COLS * SPACING + 8, 10),
      new THREE.MeshStandardMaterial({ color: 0x232326, roughness: 0.9 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -(rows - 0.4) * ROW_SPACING, 1.5);
    floor.receiveShadow = true;
    root.add(floor);

    // Three-point rig. Directional lights keep the exposure identical on every
    // row; point lights fall off across a 14 m grid and make the bottom rows
    // unreadable. Intensities target ~2.5 total irradiance so a mid-grey
    // dielectric lands near 0.5 without tone mapping.
    const centre = -((rows - 1) * ROW_SPACING) / 2;
    const key = new THREE.DirectionalLight(0xfff3e2, 2.1);
    key.position.set(-7, 9, 11);
    key.target.position.set(0, centre, 0);
    key.castShadow = ctx.quality.shadows;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 40;
    const ext = Math.max(COLS * SPACING, rows * ROW_SPACING) * 0.6 + 2;
    key.shadow.camera.left = -ext;
    key.shadow.camera.right = ext;
    key.shadow.camera.top = ext;
    key.shadow.camera.bottom = -ext;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    root.add(key, key.target);

    // Fill and ambient are kept close to neutral on purpose. A saturated sky-blue
    // bounce is prettier but it tints every albedo in the grid, and the whole
    // point of this scene is to judge the albedos.
    const fill = new THREE.DirectionalLight(0xd3dbe6, 0.5);
    fill.position.set(9, 1, 8);
    fill.target.position.set(0, centre, 0);
    root.add(fill, fill.target);

    const rim = new THREE.DirectionalLight(0xffd2a2, 0.75);
    rim.position.set(3, -6, -9);
    rim.target.position.set(0, centre, 0);
    root.add(rim, rim.target);

    root.add(new THREE.HemisphereLight(0x9ba1a8, 0x2e2b28, 0.3));

    // A cheap gradient environment so metals and glossy surfaces have something
    // to reflect; without IBL a smooth metal reads as flat black.
    ctx.scene.environment = makeStudioEnvironment(ctx.renderer);
    ctx.scene.environmentIntensity = 0.55;

    root.traverse((o) => o.layers.set(Layers.DEFAULT));
    ctx.scene.add(root);
  };

  // Built once every other system has populated the scene, so the level can be
  // hidden and the environment replaced without fighting anyone.
  ctx.events.once('game:ready', () => {
    for (const child of [...ctx.scene.children]) {
      if (child !== root) child.visible = false;
    }
    ctx.scene.fog = null;
    ctx.scene.background = new THREE.Color(0x0b0c0f);
    build();
    const player = ctx.tryGet<{ enabled: boolean }>('player');
    if (player) player.enabled = false;
    const weapons = ctx.tryGet<{ setVisible(v: boolean): void }>('weapons');
    weapons?.setVisible?.(false);
  });

  /* ------------------------------ vantages ---------------------------- */

  const worldOf = (col: number, row: number, dz: number, dy = 0) =>
    new THREE.Vector3(
      origin.x + (col - (COLS - 1) / 2) * SPACING + 0.1,
      origin.y - row * ROW_SPACING + dy,
      origin.z + dz,
    );

  const midY = origin.y - ((rows - 1) * ROW_SPACING) / 2;
  const vantages = [
    {
      name: 'matgrid',
      position: new THREE.Vector3(origin.x, midY, origin.z + 13.6),
      lookAt: new THREE.Vector3(origin.x, midY, origin.z),
      fov: 60,
      hideViewmodel: true,
      note: 'All materials: sphere + 2x2 tiled plate per entry',
    },
  ];

  for (let r = 0; r < rows; r++) {
    vantages.push({
      name: `matrow${r}`,
      position: worldOf((COLS - 1) / 2, r, 5.4, 0.1),
      lookAt: worldOf((COLS - 1) / 2, r, 0),
      fov: 52,
      hideViewmodel: true,
      note: `Materials ${r * COLS}-${Math.min(names.length, r * COLS + COLS) - 1}`,
    });
  }

  names.forEach((name, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    vantages.push({
      name: `mat_${name}`,
      position: worldOf(col, row, 1.55, 0.1),
      lookAt: worldOf(col, row, 0),
      fov: 46,
      hideViewmodel: true,
      note: `Close inspection: ${name}`,
    });
  });

  // Plates raked from above at roughly 25 degrees off the surface. Head-on a
  // painted-on normal map and a real height field look the same; at a grazing
  // angle they do not, and this is also the only view where the parallax march
  // does enough work to be judged. Raked from above rather than from the side
  // because the spheres sit level with the plates, so a camera near the plate
  // plane horizontally ends up inside one of them.
  for (let r = 0; r < rows; r++) {
    const y = origin.y - r * ROW_SPACING;
    const x = origin.x + (2 - (COLS - 1) / 2) * SPACING + 0.78;
    vantages.push({
      name: `matgraze${r}`,
      position: new THREE.Vector3(x, y + 1.05, origin.z + 0.62),
      lookAt: new THREE.Vector3(x, y - 0.35, origin.z),
      fov: 44,
      hideViewmodel: true,
      note: `Row ${r} plates at 24 degrees: normal and parallax check`,
    });
  }

  registerVantages(vantages);
  void names;
}

/* ----------------------------- environment ---------------------------- */

/** Prefiltered gradient environment: warm above, cool bounce below. */
function makeStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  const geo = new THREE.SphereGeometry(50, 32, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: `varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `varying vec3 vDir;
void main() {
  float t = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 sky = mix(vec3(0.10, 0.12, 0.16), vec3(0.55, 0.68, 0.95), pow(t, 0.8));
  vec3 ground = vec3(0.18, 0.16, 0.14);
  vec3 c = mix(ground, sky, smoothstep(0.42, 0.58, t));
  // A soft key highlight so glossy surfaces get a readable specular shape.
  float key = pow(max(0.0, dot(normalize(vDir), normalize(vec3(-0.5, 0.65, 0.6)))), 24.0);
  c += vec3(2.6, 2.4, 2.1) * key;
  gl_FragColor = vec4(c, 1.0);
}`,
  });
  scene.add(new THREE.Mesh(geo, mat));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0, 0.1, 100);
  pmrem.dispose();
  geo.dispose();
  mat.dispose();
  return rt.texture;
}

/* -------------------------------- labels ------------------------------ */

const labelCache = new Map<string, THREE.Texture>();

function makeLabel(text: string, x: number, y: number): THREE.Mesh {
  let tex = labelCache.get(text);
  if (!tex) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const g = canvas.getContext('2d')!;
    g.fillStyle = '#000000';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = '#e8e8e8';
    g.font = 'bold 58px monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, canvas.width / 2, canvas.height / 2 + 4);
    tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    labelCache.set(text, tex);
  }
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 0.39),
    new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
  );
  mesh.position.set(x, y, 0.02);
  return mesh;
}
