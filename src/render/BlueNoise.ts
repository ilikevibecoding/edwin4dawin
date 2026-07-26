import * as THREE from 'three';

/**
 * Generates a tileable 64x64 blue-noise mask via simulated annealing on a
 * void-and-cluster energy function.
 *
 * Blue noise matters here because every stochastic pass in the pipeline
 * (volumetric ray offsets, GTAO slice rotation, DOF aperture jitter, shadow
 * PCF taps) dithers with it. White noise at the same sample count looks
 * visibly grainy and resolves slowly under TAA; blue noise spreads error into
 * high frequencies that both the eye and the temporal filter reject.
 */
export function generateBlueNoise(size = 64, iterations = 24): THREE.DataTexture {
  const n = size * size;
  const values = new Float32Array(n);

  // Deterministic PRNG so captures are reproducible across runs.
  let seed = 0x2f6e2b1;
  const rand = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) % 16777216) / 16777216;
  };

  for (let i = 0; i < n; i++) values[i] = rand();

  const sigma = 1.9;
  const radius = 4;
  const kernel: number[] = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      kernel.push(Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma)));
    }
  }

  const energyAt = (idx: number, buf: Float32Array): number => {
    const x = idx % size;
    const y = (idx / size) | 0;
    let e = 0;
    let k = 0;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const sx = (x + dx + size) % size;
        const sy = (y + dy + size) % size;
        e += buf[sy * size + sx] * kernel[k++];
      }
    }
    return e;
  };

  // Swap pairs when doing so lowers total local correlation.
  for (let it = 0; it < iterations; it++) {
    for (let s = 0; s < n; s++) {
      const a = (rand() * n) | 0;
      const b = (rand() * n) | 0;
      if (a === b) continue;
      const va = values[a];
      const vb = values[b];
      const before = Math.abs(energyAt(a, values) - va) + Math.abs(energyAt(b, values) - vb);
      values[a] = vb;
      values[b] = va;
      const after = Math.abs(energyAt(a, values) - vb) + Math.abs(energyAt(b, values) - va);
      if (after > before) {
        values[a] = va;
        values[b] = vb;
      }
    }
  }

  const data = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    const v = Math.max(0, Math.min(255, Math.floor(values[i] * 255)));
    data[i * 4 + 0] = v;
    // Offset channels give four decorrelated masks from one texture.
    data[i * 4 + 1] = (v * 137 + 41) & 255;
    data[i * 4 + 2] = (v * 211 + 97) & 255;
    data[i * 4 + 3] = 255;
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  tex.name = 'blueNoise';
  return tex;
}

/**
 * Procedural lens-dirt / imperfection map used to modulate bloom.
 *
 * Real optics are never clean. Scattering bright light through a smeared
 * front element is what separates a photographed frame from a rendered one,
 * and it is almost free — it only multiplies the already-computed bloom.
 */
export function generateLensDirt(size = 512): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  let seed = 0x51a7f3;
  const rand = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) % 16777216) / 16777216;
  };

  const field = new Float32Array(size * size);

  // Base: broad, very low-frequency grime concentrated toward the edges.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size - 0.5;
      const v = y / size - 0.5;
      const r = Math.sqrt(u * u + v * v);
      field[y * size + x] = Math.pow(Math.min(r * 1.7, 1), 2) * 0.35;
    }
  }

  // Dust specks: small bright points with soft halos.
  const specks = 900;
  for (let i = 0; i < specks; i++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const rad = 1 + rand() * rand() * 9;
    const amp = 0.25 + rand() * 0.85;
    const r2 = Math.ceil(rad * 2.5);
    for (let dy = -r2; dy <= r2; dy++) {
      for (let dx = -r2; dx <= r2; dx++) {
        const x = (Math.floor(cx) + dx + size) % size;
        const y = (Math.floor(cy) + dy + size) % size;
        const d = Math.sqrt(dx * dx + dy * dy);
        const f = Math.exp(-(d * d) / (2 * rad * rad));
        field[y * size + x] += f * amp;
      }
    }
  }

  // Smears: elongated wipe streaks, the signature of a cleaned-but-not-clean lens.
  const smears = 26;
  for (let i = 0; i < smears; i++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const ang = rand() * Math.PI;
    const len = 20 + rand() * 150;
    const wid = 2 + rand() * 10;
    const amp = 0.12 + rand() * 0.3;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    for (let t = -len; t <= len; t += 0.5) {
      for (let w = -wid * 2; w <= wid * 2; w += 0.5) {
        const x = (Math.floor(cx + ca * t - sa * w) + size) % size;
        const y = (Math.floor(cy + sa * t + ca * w) + size) % size;
        const fall = Math.exp(-(w * w) / (2 * wid * wid)) * (1 - Math.abs(t) / len);
        field[y * size + x] += fall * amp * 0.25;
      }
    }
  }

  for (let i = 0; i < size * size; i++) {
    const v = Math.max(0, Math.min(1, field[i]));
    // Slight chromatic variation: dirt scatters short wavelengths more.
    data[i * 4 + 0] = Math.floor(v * 245);
    data[i * 4 + 1] = Math.floor(v * 252);
    data[i * 4 + 2] = Math.floor(Math.min(1, v * 1.08) * 255);
    data[i * 4 + 3] = 255;
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  tex.name = 'lensDirt';
  return tex;
}
