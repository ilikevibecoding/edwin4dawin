import * as THREE from 'three';
import { RNG } from '../engine/rng.js';
import { canvasTexture } from '../lego/svg.js';
import { num, fbm2p, ctr, clamp, lerp } from './common.js';

/*
 * The desert world the opening chase happens over.
 *
 * Not a brick build -- it is a celestial body, so it gets a real sphere with a
 * procedurally painted band texture plus a thin fresnel atmosphere shell.
 *
 * By default the north pole sits at y = 0 so the globe hangs below the set
 * origin and fills the bottom of frame; pass sink=0 to centre it instead.
 */

const BANDS = [
  [0.00, [222, 190, 146]],
  [0.14, [190, 132, 72]],
  [0.30, [216, 172, 114]],
  [0.44, [174, 110, 56]],
  [0.56, [224, 184, 128]],
  [0.70, [182, 118, 60]],
  [0.85, [210, 164, 106]],
  [1.00, [218, 182, 134]],
];

function bandColor(v) {
  let i = 0;
  while (i < BANDS.length - 2 && BANDS[i + 1][0] < v) i++;
  const [a0, ca] = BANDS[i];
  const [b0, cb] = BANDS[i + 1];
  const t = clamp((v - a0) / (b0 - a0 || 1), 0, 1);
  const s = t * t * (3 - 2 * t);
  return [
    Math.round(lerp(ca[0], cb[0], s)),
    Math.round(lerp(ca[1], cb[1], s)),
    Math.round(lerp(ca[2], cb[2], s)),
  ];
}

function surfaceTexture(seed, W, H) {
  return canvasTexture(W, H, (ctx) => {
    const img = ctx.createImageData(W, H);
    const d = img.data;
    // Hoisted so the inner loop allocates nothing: at two million pixels the
    // option objects cost more than the noise itself.
    // Periods are lattice cells per full turn of longitude, so every band
    // closes on itself at u = 1 and the map has no seam.
    const O_WARP = { seed, octaves: 3, period: 4 };
    const O_FINE = { seed: seed + 7, octaves: 3, period: 16 };
    const O_STREAK = { seed: seed + 23, octaves: 3, period: 64 };
    const O_MOTTLE = { seed: seed + 31, octaves: 3, period: 96 };
    const O_DARK = { seed: seed + 53, octaves: 4, period: 5 };
    const O_GRAIN = { seed: seed + 71, octaves: 2, period: 256 };
    for (let y = 0; y < H; y++) {
      const lat = y / (H - 1);
      for (let x = 0; x < W; x++) {
        const u = x / W;
        // Warp the band boundaries so they are not dead-straight lines.
        const warp = (fbm2p(u, lat * 2.4, O_WARP) - 0.5) * 0.20
          + (fbm2p(u, lat * 9, O_FINE) - 0.5) * 0.05;
        const lv = clamp(lat + warp, 0, 1);
        const [r, g, b] = bandColor(lv);

        // Wind-stretched streaks: high frequency in longitude, low in latitude.
        const streak = ctr(fbm2p(u, lat * 9, O_STREAK), 2.0);
        // Mottling: dust storms and cratered plains.
        const m = ctr(fbm2p(u, lat * 48, O_MOTTLE), 1.9);
        // Grain: the sand-blasted detail you only see when the camera is close.
        const gr = ctr(fbm2p(u, lat * 128, O_GRAIN), 1.8);
        const k = (0.86 + m * 0.26) * (0.92 + streak * 0.17) * (0.95 + gr * 0.11);

        // Dry sea basins and lava scars, painted straight into the albedo.
        const dark = ctr(fbm2p(u, lat * 3 + 4, O_DARK), 1.7);
        const dk = dark < 0.46 ? lerp(0.55, 1.0, dark / 0.46) : 1.0;
        const rock = dark < 0.46 ? (1 - dark / 0.46) * 0.62 : 0;

        const i = (y * W + x) * 4;
        d[i] = clamp(lerp(r * k * dk, 122 * k, rock), 0, 255);
        d[i + 1] = clamp(lerp(g * k * dk, 74 * k, rock), 0, 255);
        d[i + 2] = clamp(lerp(b * k * dk, 46 * k, rock), 0, 255);
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    // Polar frost caps and a couple of dry sea basins painted on top.
    const cap = ctx.createLinearGradient(0, 0, 0, H * 0.09);
    cap.addColorStop(0, 'rgba(246,240,226,0.85)');
    cap.addColorStop(1, 'rgba(246,240,226,0)');
    ctx.fillStyle = cap;
    ctx.fillRect(0, 0, W, H * 0.09);
    const cap2 = ctx.createLinearGradient(0, H, 0, H * 0.93);
    cap2.addColorStop(0, 'rgba(244,236,220,0.7)');
    cap2.addColorStop(1, 'rgba(244,236,220,0)');
    ctx.fillStyle = cap2;
    ctx.fillRect(0, H * 0.93, W, H * 0.07);

    const r = new RNG(seed + 900);
    ctx.globalAlpha = 0.16;
    for (let i = 0; i < 14; i++) {
      const cx = r.range(0, W), cy = r.range(H * 0.16, H * 0.84);
      const rx = r.range(30, 130) * (W / 1024), ry = rx * r.range(0.28, 0.6);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
      g.addColorStop(0, 'rgba(120,74,40,0.9)');
      g.addColorStop(1, 'rgba(120,74,40,0)');
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(r.range(-0.5, 0.5));
      ctx.scale(1, ry / rx);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }, { key: `dp_surf_${seed}_${W}` });
}

const RIM_VERT = /* glsl */`
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const RIM_FRAG = /* glsl */`
  uniform vec3 uColor;
  uniform vec3 uSun;
  uniform float uPower;
  uniform float uIntensity;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec3 n = normalize(vN);
    float f = pow(clamp(1.0 - abs(dot(n, normalize(vV))), 0.0, 1.0), uPower);
    float lit = clamp(dot(n, normalize(uSun)) * 0.72 + 0.34, 0.0, 1.0);
    float a = f * lit * uIntensity;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

export function buildDesertPlanet(opts = {}) {
  const R = num(opts, 'radius', 600);
  const seed = Math.round(num(opts, 'seed', 4471));
  const sink = num(opts, 'sink', 1);
  const group = new THREE.Group();
  group.name = 'desertplanet';

  const sun = new THREE.Vector3(
    num(opts, 'sunx', -0.62), num(opts, 'suny', 0.42), num(opts, 'sunz', 0.52),
  ).normalize();

  const texW = Math.round(num(opts, 'tex', 2048));
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(R, 72, 44),
    new THREE.MeshStandardMaterial({
      map: surfaceTexture(seed, texW, texW / 2),
      roughness: 0.96,
      metalness: 0.0,
    }),
  );
  body.castShadow = false;
  body.receiveShadow = false;
  body.rotation.y = -0.6;
  group.add(body);

  // Inner haze: warm scatter hugging the surface.
  const haze = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.012, 64, 40),
    new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xffd9a0).convertSRGBToLinear() },
        uSun: { value: sun.clone() },
        uPower: { value: 2.6 },
        uIntensity: { value: 1.35 },
      },
      vertexShader: RIM_VERT,
      fragmentShader: RIM_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    }),
  );
  group.add(haze);

  // Outer rim: the cold-blue halo that wraps the limb. Front-facing so it
  // fades into the disc instead of drawing a hard ring around it.
  const rim = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.024, 64, 40),
    new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0x9ec8ff).convertSRGBToLinear() },
        uSun: { value: sun.clone() },
        uPower: { value: 5.0 },
        uIntensity: { value: 1.9 },
      },
      vertexShader: RIM_VERT,
      fragmentShader: RIM_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    }),
  );
  group.add(rim);

  group.position.y = -R * sink;

  const spin = num(opts, 'spinrate', 0.006);
  group.userData.nodes = {};
  group.userData.radius = R;
  group.userData.setSun = (x, y, z) => {
    sun.set(x, y, z).normalize();
    haze.material.uniforms.uSun.value.copy(sun);
    rim.material.uniforms.uSun.value.copy(sun);
  };
  group.userData.update = (t) => { body.rotation.y = -0.6 + t * spin; };
  return group;
}
