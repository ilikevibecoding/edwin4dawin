import * as THREE from 'three';
import { clamp01 } from '../core/math';

/**
 * Receding golden prologue typography.
 *
 * The text is drawn into a tall transparent canvas and mapped onto a single
 * plane raked away from the camera; scrolling the texture window makes the
 * lines recede toward a vanishing point. A shader fade keeps the far end from
 * ever showing a hard edge. Text is original — no logo and no film crawl.
 */

export const PROLOGUE_PARAGRAPHS: string[] = [
  'A civil war burns between the stars.',
  'For a generation the Empire has ruled by arithmetic: how many fleets, how many worlds, how much fear. Now it has finished something new — a station large enough to end a planet, and quiet enough that almost nobody believes it exists.',
  'A handful of Rebel agents stole its design and died getting it off the construction yard. What survived them is a single set of technical readouts, aboard a single small ship, on a course for a desert world at the edge of everything.',
  'The Empire is one jump behind.',
];

const CANVAS_W = 1024;
const CANVAS_H = 4096;

export class TitleCrawl {
  readonly root = new THREE.Group();
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private texture: THREE.CanvasTexture;
  private disposed = false;

  constructor() {
    this.root.name = 'TitleCrawl';
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const g = canvas.getContext('2d')!;
    g.clearRect(0, 0, CANVAS_W, CANVAS_H);
    g.textAlign = 'center';
    g.fillStyle = '#ffffff';

    // Text occupies the middle band; the transparent margins let the texture
    // window scroll in and out without a visible seam.
    let y = CANVAS_H * 0.3;
    const wrapWidth = CANVAS_W * 0.86;
    const font = (size: number, weight = 700): string =>
      `${weight} ${size}px "Trebuchet MS", "Gill Sans", "Optima", Georgia, serif`;

    for (let i = 0; i < PROLOGUE_PARAGRAPHS.length; i++) {
      const isHeadline = i === 0 || i === PROLOGUE_PARAGRAPHS.length - 1;
      const size = isHeadline ? 92 : 76;
      g.font = font(size, isHeadline ? 700 : 500);
      const lines = wrapText(g, PROLOGUE_PARAGRAPHS[i], wrapWidth);
      for (const line of lines) {
        g.fillText(line, CANVAS_W / 2, y);
        y += size * 1.42;
      }
      y += size * 1.1;
    }

    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = 8;
    this.texture.needsUpdate = true;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: this.texture },
        uOffset: { value: 0 },
        uWindow: { value: 0.34 },
        uOpacity: { value: 0 },
        uColor: { value: new THREE.Color(0xf3c46a) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform float uOffset;
        uniform float uWindow;
        uniform float uOpacity;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          vec2 uv = vec2(vUv.x, 1.0 - (vUv.y * uWindow + uOffset));
          if (uv.y < 0.0 || uv.y > 1.0) discard;
          vec4 tex = texture2D(uMap, uv);
          // Fade toward the vanishing point and just above the bottom edge.
          float fade = smoothstep(1.0, 0.62, vUv.y) * smoothstep(0.0, 0.05, vUv.y);
          float a = tex.a * fade * uOpacity;
          if (a < 0.004) discard;
          gl_FragColor = vec4(uColor * (0.55 + 0.45 * tex.r), a);
        }
      `,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });

    const geo = new THREE.PlaneGeometry(62, 150, 1, 24);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.rotation.x = -Math.PI / 2 + 0.42;
    this.mesh.position.set(0, -4, -18);
    this.mesh.renderOrder = 20;
    this.mesh.frustumCulled = false;
    this.root.add(this.mesh);
    this.root.visible = false;
  }

  /** `progress` 0..1 scrolls the whole prologue past the vanishing point. */
  setProgress(progress: number): void {
    if (this.disposed) return;
    const w = this.material.uniforms.uWindow.value as number;
    this.material.uniforms.uOffset.value = -w + progress * (1 + w);
  }

  setOpacity(v: number): void {
    if (this.disposed) return;
    this.material.uniforms.uOpacity.value = clamp01(v);
    this.root.visible = v > 0.002;
  }

  /** Free the canvas texture once the prologue is behind us. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.root.visible = false;
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
    this.root.remove(this.mesh);
  }

  get isDisposed(): boolean {
    return this.disposed;
  }
}

function wrapText(g: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (g.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}
