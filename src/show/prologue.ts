/**
 * Prologue typography.
 *
 * Original text, set in restrained gold and receding into space. Each card is
 * a canvas texture on a plane, tilted back and drifting away from the viewer,
 * so the type genuinely lives in 3D rather than being an HTML overlay.
 *
 * This is deliberately *not* a reproduction of any film's opening crawl: the
 * cards appear and recede one at a time, the wording is newly written, and no
 * logo or title treatment from any other work is used.
 */

import * as THREE from 'three';
import { clamp, smootherstep } from '../core/math';

const CARD_WIDTH = 1024;
const CARD_HEIGHT = 320;

function renderCard(text: string, dpi = 1): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = CARD_WIDTH * dpi;
  c.height = CARD_HEIGHT * dpi;
  const g = c.getContext('2d')!;
  g.scale(dpi, dpi);
  g.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const fontSize = 46;
  g.font = `500 ${fontSize}px "Inter", "Helvetica Neue", Helvetica, Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  // Word-wrap to a comfortable measure.
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > CARD_WIDTH - 120 && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const lineHeight = fontSize * 1.42;
  const startY = CARD_HEIGHT / 2 - ((lines.length - 1) * lineHeight) / 2;
  for (let i = 0; i < lines.length; i++) {
    const y = startY + i * lineHeight;
    g.shadowColor = 'rgba(232, 170, 60, 0.55)';
    g.shadowBlur = 26;
    g.fillStyle = '#f0c977';
    g.fillText(lines[i], CARD_WIDTH / 2, y);
    g.shadowBlur = 0;
    g.fillStyle = '#ffe6b0';
    g.fillText(lines[i], CARD_WIDTH / 2, y);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

interface Card {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  /** Seconds, relative to the prologue's own start. */
  in: number;
  out: number;
}

/**
 * Scale a camera-locked card so it occupies `fraction` of the frame width at
 * `distance`, whatever the aspect ratio or field of view. Typography that
 * runs off the edge at 21:9 is the usual failure here.
 */
function fitScale(camera: THREE.Camera, distance: number, planeWidth: number, fraction: number): number {
  const cam = camera as THREE.PerspectiveCamera;
  if (!cam.isPerspectiveCamera) return 1;
  const halfH = Math.tan((cam.fov * Math.PI) / 360) * distance;
  const halfW = halfH * cam.aspect;
  return Math.min(1.35, (2 * halfW * fraction) / planeWidth);
}

/** Distance in front of the lens at which a prologue card first appears. */
const CARD_NEAR = 3.4;

export class Prologue {
  readonly group = new THREE.Group();
  private cards: Card[] = [];
  private textures: THREE.CanvasTexture[] = [];
  private planeWidth: number;

  /**
   * @param lines the prologue text, one card per entry
   * @param schedule [appearAt, disappearAt] per card, in seconds
   */
  constructor(lines: string[], schedule: Array<[number, number]>, dpi = 1) {
    this.group.name = 'Prologue';
    this.group.renderOrder = 10;
    this.planeWidth = 3.1 * (CARD_WIDTH / CARD_HEIGHT);

    for (let i = 0; i < lines.length; i++) {
      const tex = renderCard(lines[i], dpi);
      this.textures.push(tex);
      const material = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        blending: THREE.NormalBlending,
        toneMapped: false,
      });
      const aspect = CARD_WIDTH / CARD_HEIGHT;
      const height = 3.1;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(height * aspect, height), material);
      mesh.visible = false;
      mesh.renderOrder = 10 + i;
      this.group.add(mesh);
      const [inT, outT] = schedule[i] ?? [i * 7, i * 7 + 6.5];
      this.cards.push({ mesh, material, in: inT, out: outT });
    }
  }

  /**
   * @param t     seconds since the prologue started
   * @param camera the card rig is parented to the camera, so this only needs
   *               to place the group in front of it
   */
  update(t: number, camera: THREE.Camera): void {
    // Sit the whole rig just in front of the camera, tilted back.
    this.group.position.copy(camera.position);
    this.group.quaternion.copy(camera.quaternion);
    this.group.updateMatrixWorld();

    let anyVisible = false;
    for (const card of this.cards) {
      const local = t - card.in;
      const span = card.out - card.in;
      if (local < -0.6 || local > span + 2.2) {
        card.mesh.visible = false;
        continue;
      }
      anyVisible = true;
      card.mesh.visible = true;
      // Travel from close and low, receding upward and away.
      const travel = clamp(local / (span + 1.6));
      const z = -CARD_NEAR - travel * 12.5;
      const y = -0.62 + travel * 3.2;
      card.mesh.position.set(0, y, z);
      card.mesh.rotation.set(-0.42, 0, 0);
      card.mesh.scale.setScalar(fitScale(camera, CARD_NEAR, this.planeWidth, 0.8));
      const fadeIn = smootherstep(0, 1.1, local);
      const fadeOut = 1 - smootherstep(span * 0.72, span + 1.5, local);
      card.material.opacity = fadeIn * fadeOut * 0.96;
    }
    this.group.visible = anyVisible;
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
    if (!v) for (const c of this.cards) c.mesh.visible = false;
  }

  dispose(): void {
    for (const t of this.textures) t.dispose();
    for (const c of this.cards) {
      c.material.dispose();
      c.mesh.geometry.dispose();
    }
  }
}

const CARD_DISTANCE = 4.2;

/** A single closing card, centred and static. Used for the epilogue. */
export class EpilogueCard {
  readonly group = new THREE.Group();
  private material: THREE.MeshBasicMaterial;
  private texture: THREE.CanvasTexture;
  private mesh: THREE.Mesh;
  private planeWidth: number;

  constructor(text: string, dpi = 1) {
    this.group.name = 'EpilogueCard';
    this.texture = renderCard(text, dpi);
    this.material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    });
    const aspect = CARD_WIDTH / CARD_HEIGHT;
    const height = 2.1;
    this.planeWidth = height * aspect;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(this.planeWidth, height), this.material);
    this.mesh.renderOrder = 20;
    this.mesh.position.z = -CARD_DISTANCE;
    this.group.add(this.mesh);
    this.group.visible = false;
  }

  setOpacity(v: number, camera: THREE.Camera): void {
    this.material.opacity = clamp(v);
    this.group.visible = v > 0.002;
    if (!this.group.visible) return;
    this.group.position.copy(camera.position);
    this.group.quaternion.copy(camera.quaternion);
    this.mesh.scale.setScalar(fitScale(camera, CARD_DISTANCE, this.planeWidth, 0.72));
  }

  dispose(): void {
    this.texture.dispose();
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}
