// Sky for the battle scene, four draw calls: one Points cloud of ~12k stars (crisp integer-pixel
// points, many faint / few bright, slight colour-temperature variety), one galactic band on an
// inverted sphere (smooth milky glow with dust lanes, baked once to an equirect map and sampled with
// one tap; see envBand.js), two moons merged into one mesh (mostly unlit discs, lit by the battle
// sun), and a Points layer of distant traffic near the limb. Stars, band and moons ignore the camera's
// translation (rotation-only view transform), so they sit at infinity and never parallax or jitter as
// the camera flies.
import * as THREE from "three";
import { mulberry32 } from "../textures.js";
import { getBattleSun } from "./battleShader.js";
import { buildMoons } from "./envMoons.js";
import { buildTraffic } from "./envTraffic.js";
import { buildBand, BAND_NORMAL, BAND_CORE } from "./envBand.js";

export { BAND_NORMAL, BAND_CORE };

const starVert = /* glsl */ `
attribute float aSize;
uniform float uPixelRatio;
varying vec3 vColor;
varying float vSize;
void main() {
  vColor = color;
  // rotation-only view: the star sphere is centred on the camera wherever it goes
  gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
  float s = max(1.0, floor(aSize * uPixelRatio + 0.5));
  gl_PointSize = s;
  vSize = s;
}`;

const starFrag = /* glsl */ `
varying vec3 vColor;
varying float vSize;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d) * 2.0;
  // one- and two-pixel stars are solid (constant as they cross pixel boundaries); bigger ones are
  // soft discs
  float a = vSize <= 2.0 ? 1.0 : smoothstep(1.0, 0.25, r);
  gl_FragColor = vec4(vColor * a, 1.0);
}`;

function buildStars(group, radius) {
  const rand = mulberry32(77);
  // (count, intensity range, size px)
  const classes = [
    { n: 8500, i0: 0.05, i1: 0.2, s0: 1, s1: 1 },
    { n: 2600, i0: 0.2, i1: 0.5, s0: 1, s1: 2 },
    { n: 480, i0: 0.5, i1: 1.1, s0: 2, s1: 3 },
    { n: 45, i0: 1.1, i1: 2.4, s0: 3, s1: 4 },
  ];
  // colour temperature palette (linear), weighted toward white
  const palette = [
    [0.72, 0.82, 1.0],
    [0.86, 0.9, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 1.0, 1.0],
    [1.0, 0.94, 0.84],
    [1.0, 0.85, 0.66],
    [1.0, 0.72, 0.5],
  ];
  const total = classes.reduce((a, c) => a + c.n, 0);
  const pos = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  const size = new Float32Array(total);
  const p = new THREE.Vector3();
  let k = 0;
  for (const c of classes) {
    for (let i = 0; i < c.n; i++, k++) {
      const u = rand() * 2 - 1;
      const th = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      p.set(s * Math.cos(th), u, s * Math.sin(th));
      // a share of the faint stars crowd toward the galactic band
      if (rand() < 0.55) {
        const along = p.dot(BAND_NORMAL);
        p.addScaledVector(
          BAND_NORMAL,
          -along * (0.6 + rand() * 0.38),
        ).normalize();
      }
      pos[k * 3] = p.x * radius;
      pos[k * 3 + 1] = p.y * radius;
      pos[k * 3 + 2] = p.z * radius;
      const pal = palette[Math.floor(rand() * palette.length)];
      const I = c.i0 + (c.i1 - c.i0) * rand() * rand();
      col[k * 3] = pal[0] * I;
      col[k * 3 + 1] = pal[1] * I;
      col[k * 3 + 2] = pal[2] * I;
      size[k] = c.s0 + (c.s1 - c.s0) * rand();
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { uPixelRatio: { value: 1 } },
    vertexShader: starVert,
    fragmentShader: starFrag,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const pts = new THREE.Points(g, m);
  pts.name = "stars";
  pts.frustumCulled = false;
  pts.renderOrder = -10;
  pts.onBeforeRender = (renderer) => {
    m.uniforms.uPixelRatio.value = renderer.getPixelRatio();
  };
  group.add(pts);
  return pts;
}

export function buildBattleSky(scene, radius = 3.2e6) {
  const group = new THREE.Group();
  group.name = "battleSky";
  const sun = getBattleSun();
  buildStars(group, radius);
  buildBand(group, radius);
  buildMoons(group, sun, radius * 0.9);
  buildTraffic(group);
  scene.add(group);
  return group;
}
