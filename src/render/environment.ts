import * as THREE from 'three';

/**
 * Procedural image-based lighting.
 *
 * Physically based materials need something to reflect. Without an environment
 * every metallic surface loses its specular term and collapses towards black,
 * which is why interior trim and hull plating read as flat grey slabs when the
 * scene has only analytic lights. Two tiny equirectangular gradients — one for
 * the lit interior, one for near-empty space — are enough to restore it, and
 * both are drawn in code so the project still ships no image files.
 */

function equirect(draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): THREE.Texture {
  const w = 256;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext('2d')!;
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Bright ceiling, mid walls, dark deck: the inside of a lit white corridor.
 * Kept deliberately dim — this is a specular source, not a second key light.
 */
function drawInterior(g: CanvasRenderingContext2D, w: number, h: number): void {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#aab4c4');
  grad.addColorStop(0.32, '#8b93a0');
  grad.addColorStop(0.55, '#5e646d');
  grad.addColorStop(0.78, '#2f343a');
  grad.addColorStop(1, '#15181c');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  // Luminaire strip running along the crown.
  g.fillStyle = 'rgba(240,246,255,0.7)';
  g.fillRect(0, 0, w, Math.round(h * 0.1));
}

/** Almost black, with a warm sun and a faint planet bounce from below. */
function drawSpace(g: CanvasRenderingContext2D, w: number, h: number): void {
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#05070d');
  grad.addColorStop(0.5, '#080a11');
  grad.addColorStop(0.78, '#241d16');
  grad.addColorStop(1, '#4a3a29');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  const sun = g.createRadialGradient(w * 0.7, h * 0.36, 0, w * 0.7, h * 0.36, w * 0.16);
  sun.addColorStop(0, 'rgba(255,246,228,1)');
  sun.addColorStop(0.25, 'rgba(255,238,205,0.35)');
  sun.addColorStop(1, 'rgba(255,238,205,0)');
  g.fillStyle = sun;
  g.fillRect(0, 0, w, h);
}

export interface Environments {
  interior: THREE.Texture;
  space: THREE.Texture;
  dispose(): void;
}

export function buildEnvironments(renderer: THREE.WebGLRenderer): Environments {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const sources = [equirect(drawInterior), equirect(drawSpace)];
  const [interior, space] = sources.map((src) => pmrem.fromEquirectangular(src).texture);
  for (const src of sources) src.dispose();
  pmrem.dispose();
  return {
    interior,
    space,
    dispose(): void {
      interior.dispose();
      space.dispose();
    },
  };
}
