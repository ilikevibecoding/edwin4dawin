import * as THREE from 'three';
import type { MaterialLibrary } from '../assets/materials';
import { saturate, smoothstep } from '../core/mathx';

/**
 * Prologue typography.
 *
 * Restrained golden lettering that drifts away from camera and dissolves into
 * the starfield. This is original text written for this project - it is not the
 * film's opening crawl, and no logo or title card is reproduced.
 */

export const PROLOGUE_ORIGIN = new THREE.Vector3(0, 0, -1_500_000);

interface Card {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  start: number;
  end: number;
}

const CARDS: Array<{ lines: string[]; start: number; end: number; scale?: number }> = [
  { lines: ['A galactic civil war', 'burns across ten thousand worlds.'], start: 4.2, end: 12.0 },
  { lines: ['In the shadow of a broken peace,', 'the Empire has finished a station', 'large enough to break a planet apart.'], start: 10.8, end: 21.5 },
  { lines: ['Rebel agents stole its design,', 'and ran.'], start: 21.3, end: 28.2 },
  { lines: ['Above the desert world of Tatooine,', 'a stolen secret races through the dark.'], start: 27.9, end: 35.6 },
  { lines: ['This is the hour the war turns —', 'and almost no one alive', 'will know it happened.'], start: 35.3, end: 45.0 },
];

export class PrologueText {
  readonly group = new THREE.Group();
  private cards: Card[] = [];

  constructor(lib: MaterialLibrary) {
    this.group.name = 'prologue';
    this.group.position.copy(PROLOGUE_ORIGIN);

    for (const def of CARDS) {
      const { texture, aspect } = makeTextTexture(def.lines);
      lib.registry.track(texture);
      const width = 42;
      const geo = new THREE.PlaneGeometry(width, width / aspect);
      lib.registry.track(geo);
      const material = new THREE.MeshBasicMaterial({
        map: texture, transparent: true, opacity: 0, depthWrite: false,
        depthTest: false, toneMapped: false, blending: THREE.AdditiveBlending,
      });
      lib.registry.track(material);
      const mesh = new THREE.Mesh(geo, material);
      mesh.renderOrder = 20;
      mesh.visible = false;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      this.cards.push({ mesh, material, start: def.start, end: def.end });
    }
  }

  update(t: number): void {
    for (const card of this.cards) {
      const inRange = t >= card.start - 0.5 && t <= card.end + 0.5;
      card.mesh.visible = inRange;
      if (!inRange) continue;
      const f = saturate((t - card.start) / (card.end - card.start));
      // Recede: start close and slightly below the eye line, drift back and up.
      const z = -26 - f * 74;
      const y = -1.5 + f * 7.5;
      card.mesh.position.set(0, y, z);
      card.mesh.rotation.set(-0.16 - f * 0.14, 0, 0);
      const scale = 1 - f * 0.12;
      card.mesh.scale.setScalar(scale);
      const fadeIn = smoothstep(0, 0.14, f);
      const fadeOut = 1 - smoothstep(0.72, 1, f);
      card.material.opacity = fadeIn * fadeOut * 0.98;
    }
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }
}

function makeTextTexture(lines: string[]): { texture: THREE.CanvasTexture; aspect: number } {
  const width = 1600;
  const lineHeight = 108;
  const padding = 40;
  const height = Math.max(256, lines.length * lineHeight + padding * 2);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable for prologue typography');

  ctx.clearRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${Math.round(lineHeight * 0.62)}px "Trebuchet MS", "Segoe UI", "DejaVu Sans", system-ui, sans-serif`;

  lines.forEach((line, i) => {
    const y = padding + lineHeight * (i + 0.5);
    // Soft outer glow, then the crisp gold face.
    ctx.shadowColor = 'rgba(232, 178, 78, 0.55)';
    ctx.shadowBlur = 26;
    ctx.fillStyle = 'rgba(214, 164, 74, 0.85)';
    ctx.fillText(line, width / 2, y);
    ctx.shadowBlur = 0;
    const grad = ctx.createLinearGradient(0, y - lineHeight * 0.35, 0, y + lineHeight * 0.35);
    grad.addColorStop(0, '#f6dda2');
    grad.addColorStop(0.55, '#e8c268');
    grad.addColorStop(1, '#c99a3e');
    ctx.fillStyle = grad;
    ctx.fillText(line, width / 2, y);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { texture, aspect: width / height };
}
