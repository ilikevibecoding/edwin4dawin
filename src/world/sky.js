import * as THREE from 'three';
import { makeRNG } from '../core/utils.js';

// ===========================================================================
// Sky: late-afternoon war-zone atmosphere. Shader dome with physicalish
// gradient + sun + horizon dust haze, cloud billboards, distant smoke columns.
// Also produces the PMREM environment map used by every PBR material.
// ===========================================================================

// ~42 deg elevation: high enough to throw sunlight down into the street
// canyons (hard light/shadow shapes on the road), low enough to stay warm.
export const SUN_DIR = new THREE.Vector3(-0.42, 0.58, 0.50).normalize();

const skyVert = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_Position.z = gl_Position.w; // depth = far
  }
`;

const skyFrag = /* glsl */`
  varying vec3 vDir;
  uniform vec3 sunDir;
  uniform vec3 zenithColor;
  uniform vec3 horizonColor;
  uniform vec3 dustColor;
  uniform vec3 sunColor;

  void main() {
    vec3 dir = normalize(vDir);
    float h = clamp(dir.y, -0.08, 1.0);

    // Vertical gradient with dust band near horizon
    float t = pow(1.0 - max(h, 0.0), 2.4);
    vec3 col = mix(zenithColor, horizonColor, t);
    float dust = pow(1.0 - clamp(abs(dir.y + 0.015) * 5.5, 0.0, 1.0), 2.0);
    col = mix(col, dustColor, dust * 0.85);

    // Sun disc + warm glow lobes
    float cosA = dot(dir, sunDir);
    float glow = pow(max(cosA, 0.0), 5.0);
    col += sunColor * glow * 0.30;
    float glow2 = pow(max(cosA, 0.0), 60.0);
    col += sunColor * glow2 * 0.9;
    float disc = smoothstep(0.9994, 0.99975, cosA);
    col += sunColor * disc * 22.0;

    // Sky-wide subtle warmth toward sun azimuth near horizon
    float az = max(dot(normalize(vec3(dir.x, 0.0, dir.z)), normalize(vec3(sunDir.x, 0.0, sunDir.z))), 0.0);
    col += sunColor * 0.09 * az * pow(1.0 - max(h, 0.0), 3.0);

    // Micro-dither kills gradient banding in the smooth dusk sky
    float dith = fract(sin(dot(dir.xy + dir.z, vec2(12.9898, 78.233))) * 43758.5453);
    col += (dith - 0.5) * 0.012;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createSkyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      sunDir: { value: SUN_DIR.clone() },
      // Dusty desaturated dusk blue: keeps the sky in the same warm-grey
      // family as the street so fore/background read as one graded frame.
      zenithColor: { value: new THREE.Color(0x435c7c).multiplyScalar(1.0) },
      horizonColor: { value: new THREE.Color(0xd9ab70).multiplyScalar(1.05) },
      dustColor: { value: new THREE.Color(0xc2a67e).multiplyScalar(1.0) },
      sunColor: { value: new THREE.Color(0xffdba8) },
    },
    vertexShader: skyVert,
    fragmentShader: skyFrag,
    side: THREE.BackSide,
    depthWrite: false,
  });
}

function cloudTexture(seed, size = 256) {
  const rng = makeRNG(seed);
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  // Cumulus: flat-ish shaded base, bright puffy top. Built from two blob
  // passes so the sprite reads as a lit form instead of uniform fuzz.
  const cx = size * 0.5, cy = size * 0.55;
  const blobs = 20;
  for (let i = 0; i < blobs; i++) {
    const t = i / blobs;
    const x = cx + (rng() - 0.5) * size * 0.62;
    const y = cy + (rng() - 0.5) * size * 0.2 - t * size * 0.08;
    const r = size * (0.10 + rng() * 0.14);
    // Shadowed underside pass
    const gs = ctx.createRadialGradient(x, y + r * 0.35, 0, x, y + r * 0.35, r);
    gs.addColorStop(0, `rgba(196,186,182,${0.16 + rng() * 0.10})`);
    gs.addColorStop(1, 'rgba(196,186,182,0)');
    ctx.fillStyle = gs;
    ctx.fillRect(0, 0, size, size);
    // Sunlit top pass, offset up
    const gl = ctx.createRadialGradient(x, y - r * 0.3, 0, x, y - r * 0.3, r * 0.85);
    gl.addColorStop(0, `rgba(255,248,238,${0.30 + rng() * 0.16})`);
    gl.addColorStop(1, 'rgba(255,248,238,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(0, 0, size, size);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function smokeColumnTexture(seed, size = 256) {
  const rng = makeRNG(seed);
  const c = document.createElement('canvas');
  c.width = size; c.height = size * 2;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size * 2);
  let x = size * 0.5, w = size * 0.10;
  for (let y = size * 2; y > size * 0.15; y -= 6) {
    x += (rng() - 0.5) * 7;
    w *= 1.012;
    const a = 0.028 * (y / (size * 2)) + 0.012;
    const g = ctx.createRadialGradient(x, y, 0, x, y, w);
    g.addColorStop(0, `rgba(40,36,32,${a * 3.2})`);
    g.addColorStop(1, 'rgba(40,36,32,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Sky {
  constructor(scene, renderer) {
    this.group = new THREE.Group();

    const dome = new THREE.Mesh(new THREE.SphereGeometry(820, 48, 24), createSkyMaterial());
    dome.frustumCulled = false;
    this.group.add(dome);

    // --- Clouds: big soft billboards high up ---
    const rng = makeRNG(9911);
    for (let i = 0; i < 12; i++) {
      const tex = cloudTexture(500 + i * 17);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false });
      const s = new THREE.Sprite(mat);
      const ang = rng() * Math.PI * 2;
      // Half the deck rides low near the horizon so level gameplay cameras
      // always catch a few forms in the sky band.
      const low = i % 2 === 0;
      const dist = low ? 600 + rng() * 150 : 480 + rng() * 240;
      const h = low ? 80 + rng() * 55 : 150 + rng() * 120;
      s.position.set(Math.cos(ang) * dist, h, Math.sin(ang) * dist);
      s.scale.set(300 + rng() * 280, 100 + rng() * 80, 1);
      this.group.add(s);
    }

    // --- Distant war smoke columns on the horizon ---
    for (let i = 0; i < 5; i++) {
      const tex = smokeColumnTexture(900 + i * 31);
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0.85 });
      const s = new THREE.Sprite(mat);
      const ang = rng() * Math.PI * 2;
      const dist = 620 + rng() * 120;
      s.position.set(Math.cos(ang) * dist, 105, Math.sin(ang) * dist);
      s.scale.set(70 + rng() * 60, 240 + rng() * 100, 1);
      this.group.add(s);
    }

    scene.add(this.group);

    // --- Lights ---
    this.sun = new THREE.DirectionalLight(0xffe3b8, 3.5);
    this.sun.position.copy(SUN_DIR).multiplyScalar(180);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.camera.near = 20;
    this.sun.shadow.camera.far = 420;
    const ext = 95;
    this.sun.shadow.camera.left = -ext;
    this.sun.shadow.camera.right = ext;
    this.sun.shadow.camera.top = ext;
    this.sun.shadow.camera.bottom = -ext;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.06;
    this.sun.shadow.radius = 0.8; // tight penumbra: alley light shafts stay crisp
    scene.add(this.sun);
    scene.add(this.sun.target);

    // Ambient held well below the sun so shadow shapes carve the scene.
    // Direct:ambient ~3:1 is what gives the sunny-desert COD read.
    this.hemi = new THREE.HemisphereLight(0x8fa8cc, 0x8a7156, 0.72);
    scene.add(this.hemi);

    // Faked GI: sunlit facades bounce warm light back into the shadowed side
    // of the street. Shadowless counter-directional at ~1/9 sun strength adds
    // a left-to-right gradient inside cast shadows instead of one flat tone.
    this.bounce = new THREE.DirectionalLight(0xd99e66, 0.38);
    this.bounce.position.set(-SUN_DIR.x * 140, 40, -SUN_DIR.z * 140);
    this.bounce.castShadow = false;
    scene.add(this.bounce);
    scene.add(this.bounce.target);

    // Fog: warm dusty haze — density tuned so each block back drops a visible
    // step in contrast (aerial perspective) without milking out the mid-ground.
    scene.fog = new THREE.FogExp2(0xc3a67e, 0.0031);

    // --- Environment map from a mini sky scene (PMREM) ---
    const envScene = new THREE.Scene();
    const envDome = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), createSkyMaterial());
    envScene.add(envDome);
    // Fake ground bounce in reflections
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(100, 32),
      new THREE.MeshBasicMaterial({ color: 0x7a6448 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    envScene.add(ground);
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.envMap = pmrem.fromScene(envScene, 0.02).texture;
    scene.environment = this.envMap;
    scene.environmentIntensity = 0.55; // subtle spec/bounce; sun does the work
    pmrem.dispose();
  }

  // Keep sun shadow camera centered on the player for max resolution
  update(playerPos) {
    this.sun.position.copy(SUN_DIR).multiplyScalar(180).add(playerPos);
    this.sun.target.position.copy(playerPos);
    this.bounce.position.set(playerPos.x - SUN_DIR.x * 140, 40, playerPos.z - SUN_DIR.z * 140);
    this.bounce.target.position.copy(playerPos);
    this.group.position.set(playerPos.x, 0, playerPos.z);
  }
}
