/**
 * Sum-of-Gerstner-waves ocean surface.
 *
 * The same wave set drives the water vertex shader (GPU) and the ship's
 * buoyancy (CPU), so the hull always sits exactly on the surface it is
 * floating over. The GLSL below is generated from WAVES so the two can never
 * drift out of sync.
 */

const GRAVITY = 9.81;

/** direction is normalized on load; amplitude/wavelength are in metres. */
export const WAVES = [
  { dir: [1.0, 0.3], amplitude: 0.72, wavelength: 47, steepness: 1.0 },
  { dir: [0.75, -0.66], amplitude: 0.42, wavelength: 26, steepness: 1.0 },
  { dir: [-0.4, 0.92], amplitude: 0.2, wavelength: 13.5, steepness: 0.9 },
  { dir: [0.95, 0.31], amplitude: 0.1, wavelength: 7.2, steepness: 0.8 },
  { dir: [-0.6, -0.8], amplitude: 0.05, wavelength: 3.6, steepness: 0.7 },
].map((w) => {
  const len = Math.hypot(w.dir[0], w.dir[1]);
  const k = (2 * Math.PI) / w.wavelength;
  return {
    dx: w.dir[0] / len,
    dz: w.dir[1] / len,
    a: w.amplitude,
    k,
    speed: Math.sqrt(GRAVITY / k) * k, // angular frequency of a deep-water wave
    q: w.steepness,
  };
});

/** Peak wave height, used to size the ocean's bounding box and the camera. */
export const WAVE_HEIGHT = WAVES.reduce((sum, w) => sum + w.a, 0);

const f = (n) => (Number.isInteger(n) ? n.toFixed(1) : String(Number(n.toFixed(5))));

/**
 * GLSL: `vec3 waveDisplace(vec2 p, float t, out vec3 normal)` returning the
 * offset to add to a flat surface point, plus the analytic surface normal.
 */
export function waveGLSL() {
  const body = WAVES.map(
    (w) => `
  {
    float w = ${f(w.k)} * (${f(w.dx)} * p.x + ${f(w.dz)} * p.y) - ${f(w.speed)} * t;
    float s = sin(w), c = cos(w);
    d.x += ${f(w.q)} * ${f(w.a)} * ${f(w.dx)} * c;
    d.z += ${f(w.q)} * ${f(w.a)} * ${f(w.dz)} * c;
    d.y += ${f(w.a)} * s;
    n.x -= ${f(w.dx)} * ${f(w.k)} * ${f(w.a)} * c;
    n.z -= ${f(w.dz)} * ${f(w.k)} * ${f(w.a)} * c;
    n.y -= ${f(w.q)} * ${f(w.k)} * ${f(w.a)} * s;
  }`,
  ).join('');

  return `
vec3 waveDisplace(vec2 p, float t, out vec3 normal) {
  vec3 d = vec3(0.0);
  vec3 n = vec3(0.0, 1.0, 0.0);
  ${body}
  normal = normalize(n);
  return d;
}`;
}

const _disp = { x: 0, y: 0, z: 0 };

function displace(x, z, t, out) {
  out.x = 0;
  out.y = 0;
  out.z = 0;
  for (const w of WAVES) {
    const phase = w.k * (w.dx * x + w.dz * z) - w.speed * t;
    out.x += w.q * w.a * w.dx * Math.cos(phase);
    out.z += w.q * w.a * w.dz * Math.cos(phase);
    out.y += w.a * Math.sin(phase);
  }
  return out;
}

/**
 * Water surface height at world (x, z). Gerstner waves also move points
 * horizontally, so the flat-plane source point is recovered with a couple of
 * fixed-point iterations before its height is read.
 */
export function waveHeight(x, z, t) {
  let px = x;
  let pz = z;
  for (let i = 0; i < 3; i++) {
    displace(px, pz, t, _disp);
    px = x - _disp.x;
    pz = z - _disp.z;
  }
  return displace(px, pz, t, _disp).y;
}
