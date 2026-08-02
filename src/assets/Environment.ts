import * as THREE from 'three';

/**
 * Procedural image-based lighting.
 *
 * Physically based materials look dead without something to reflect. These
 * equirectangular canvases are drawn in code and pre-filtered into cube maps:
 * a warm planet glow from below and a hard sun for space, and a soft white
 * bounce for the corridor.
 */

function equirect(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void): THREE.Texture {
  const w = 512;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable for environment map');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Azimuth/elevation to equirect pixel coordinates. */
function place(w: number, h: number, azimuth: number, elevation: number): [number, number] {
  const u = ((azimuth / (Math.PI * 2)) % 1 + 1) % 1;
  const v = 0.5 - elevation / Math.PI;
  return [u * w, v * h];
}

export interface Environments {
  space: THREE.Texture;
  interior: THREE.Texture;
  dispose(): void;
}

export function buildEnvironments(
  renderer: THREE.WebGLRenderer,
  sunDirection: THREE.Vector3,
  planetDirection: THREE.Vector3,
): Environments {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const sunAz = Math.atan2(sunDirection.x, sunDirection.z);
  const sunEl = Math.asin(THREE.MathUtils.clamp(sunDirection.y, -1, 1));
  const planetAz = Math.atan2(planetDirection.x, planetDirection.z);
  const planetEl = Math.asin(THREE.MathUtils.clamp(planetDirection.y, -1, 1));

  const spaceSource = equirect((ctx, w, h) => {
    // Deep space base.
    const base = ctx.createLinearGradient(0, 0, 0, h);
    base.addColorStop(0, '#05060c');
    base.addColorStop(0.45, '#080a12');
    base.addColorStop(1, '#0c0d14');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);

    // The desert world occupies a defined patch of sky. A radial gradient in
    // equirect space grows fast with radius, so this stays deliberately small:
    // an oversized blob tints every metal surface in the scene orange.
    const [px, py] = place(w, h, planetAz, planetEl);
    for (const dx of [-w, 0, w]) {
      const glow = ctx.createRadialGradient(px + dx, py, 0, px + dx, py, w * 0.16);
      glow.addColorStop(0, 'rgba(226, 156, 92, 0.85)');
      glow.addColorStop(0.4, 'rgba(150, 100, 60, 0.4)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    }

    // Key light source.
    const [sx, sy] = place(w, h, sunAz, sunEl);
    for (const dx of [-w, 0, w]) {
      const sun = ctx.createRadialGradient(sx + dx, sy, 0, sx + dx, sy, w * 0.07);
      sun.addColorStop(0, 'rgba(255, 250, 236, 1)');
      sun.addColorStop(0.2, 'rgba(255, 236, 200, 0.6)');
      sun.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, w, h);
    }

    // A faint cool wash from the opposite side so reflections are not
    // one-note; this stands in for the rest of the sky.
    for (const dx of [-w, 0, w]) {
      const cool = ctx.createRadialGradient(px + dx + w / 2, h * 0.3, 0, px + dx + w / 2, h * 0.3, w * 0.22);
      cool.addColorStop(0, 'rgba(70, 96, 140, 0.3)');
      cool.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cool;
      ctx.fillRect(0, 0, w, h);
    }
  });

  const interiorSource = equirect((ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#cdd6e2');
    g.addColorStop(0.42, '#9fa8b6');
    g.addColorStop(0.72, '#5d6470');
    g.addColorStop(1, '#31353d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // Ceiling light strip running fore and aft.
    ctx.fillStyle = 'rgba(255, 246, 226, 0.9)';
    ctx.fillRect(0, h * 0.03, w, h * 0.09);
    // A cool wash from the consoles on one side.
    const side = ctx.createRadialGradient(w * 0.25, h * 0.6, 0, w * 0.25, h * 0.6, w * 0.28);
    side.addColorStop(0, 'rgba(140, 190, 240, 0.35)');
    side.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, w, h);
  });

  const space = pmrem.fromEquirectangular(spaceSource).texture;
  const interior = pmrem.fromEquirectangular(interiorSource).texture;
  spaceSource.dispose();
  interiorSource.dispose();
  pmrem.dispose();

  return {
    space,
    interior,
    dispose(): void {
      space.dispose();
      interior.dispose();
    },
  };
}
