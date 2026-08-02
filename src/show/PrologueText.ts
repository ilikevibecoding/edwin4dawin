import * as THREE from 'three';
import { textTexture } from '../assets/Textures';
import { EPILOGUE_LINES, PROLOGUE_STANZAS, SUBTITLE, TITLE } from '../timeline/Script';
import { clamp, smoothstep } from '../core/MathX';

/**
 * The opening titles.
 *
 * Restrained gold typography on tilted planes that recede toward a vanishing
 * point. The wording is original and the layout deliberately avoids the
 * familiar logo-and-crawl arrangement.
 */

interface Stanza {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  start: number;
  duration: number;
}

export class PrologueText {
  readonly root = new THREE.Group();
  private stanzas: Stanza[] = [];
  private title: THREE.Mesh;
  private titleMat: THREE.MeshBasicMaterial;
  private subtitle: THREE.Mesh;
  private subtitleMat: THREE.MeshBasicMaterial;
  private epilogue: THREE.Mesh;
  private epilogueMat: THREE.MeshBasicMaterial;

  constructor() {
    this.root.name = 'PrologueText';
    this.root.visible = false;

    for (const stanza of PROLOGUE_STANZAS) {
      const tex = textTexture(stanza.lines, {
        width: 1400,
        height: 480,
        font: '600 72px "Trebuchet MS", "Gill Sans", "Segoe UI", sans-serif',
        lineHeight: 108,
        letterSpacing: '7px',
        color: '#f2d492',
        glow: 22,
      });
      const material = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(28, 9.6), material);
      mesh.rotation.x = -Math.PI * 0.14;
      mesh.renderOrder = 30;
      mesh.frustumCulled = false;
      this.root.add(mesh);
      this.stanzas.push({ mesh, material, start: stanza.start, duration: 8.2 });
    }

    const titleTex = textTexture([TITLE], {
      width: 1600,
      height: 400,
      font: '700 150px "Trebuchet MS", "Gill Sans", "Segoe UI", sans-serif',
      lineHeight: 170,
      letterSpacing: '26px',
      color: '#f4d79a',
      glow: 40,
    });
    this.titleMat = new THREE.MeshBasicMaterial({
      map: titleTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
    });
    this.title = new THREE.Mesh(new THREE.PlaneGeometry(24, 6), this.titleMat);
    this.title.renderOrder = 31;
    this.title.frustumCulled = false;
    this.root.add(this.title);

    const subTex = textTexture([SUBTITLE.toUpperCase()], {
      width: 1400,
      height: 200,
      font: '400 54px "Trebuchet MS", "Gill Sans", "Segoe UI", sans-serif',
      lineHeight: 70,
      letterSpacing: '16px',
      color: '#c9b184',
      glow: 12,
    });
    this.subtitleMat = new THREE.MeshBasicMaterial({
      map: subTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
    });
    this.subtitle = new THREE.Mesh(new THREE.PlaneGeometry(20, 2.85), this.subtitleMat);
    this.subtitle.renderOrder = 31;
    this.subtitle.frustumCulled = false;
    this.root.add(this.subtitle);

    const epilogueTex = textTexture(EPILOGUE_LINES, {
      width: 1500,
      height: 420,
      font: '500 62px "Trebuchet MS", "Gill Sans", "Segoe UI", sans-serif',
      lineHeight: 96,
      letterSpacing: '8px',
      color: '#f0cf8c',
      glow: 20,
    });
    this.epilogueMat = new THREE.MeshBasicMaterial({
      map: epilogueTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
    });
    this.epilogue = new THREE.Mesh(new THREE.PlaneGeometry(26, 7.3), this.epilogueMat);
    this.epilogue.renderOrder = 32;
    this.epilogue.frustumCulled = false;
    this.epilogue.position.set(0, 0, -30);
    this.root.add(this.epilogue);
  }

  /**
   * `time` is absolute timeline seconds. The whole group is parked in front of
   * the prologue camera, which sits at the origin looking down -Z.
   */
  update(time: number): void {
    const inPrologue = time < 42;
    const inEpilogue = time > 394.5;
    this.root.visible = inPrologue || inEpilogue;
    if (!this.root.visible) return;

    // Closing card.
    const ek = smoothstep(395.5, 397.5, time) * (1 - smoothstep(402.5, 404, time));
    this.epilogueMat.opacity = ek * 0.96;
    this.epilogue.visible = ek > 0.002;
    this.epilogue.position.set(0, 0.4, -30 - smoothstep(395.5, 404, time) * 3);
    if (!inPrologue) {
      this.stanzas.forEach((s) => (s.mesh.visible = false));
      this.title.visible = false;
      this.subtitle.visible = false;
      return;
    }
    this.epilogue.visible = false;

    for (const s of this.stanzas) {
      const local = time - s.start;
      if (local < -0.5 || local > s.duration + 1.5) {
        s.mesh.visible = false;
        continue;
      }
      s.mesh.visible = true;
      const k = clamp(local / s.duration, -0.2, 1.4);
      // Travel from just below the camera out toward the vanishing point.
      const z = -8 - k * 74;
      s.mesh.position.set(0, -3.4 - k * 8.6, z);
      s.mesh.scale.setScalar(1);
      const fadeIn = smoothstep(-0.15, 0.12, k);
      const fadeOut = 1 - smoothstep(0.68, 1.05, k);
      s.material.opacity = fadeIn * fadeOut * 0.95;
    }

    // Title card lands after the last stanza has receded.
    const tk = smoothstep(35.5, 37.5, time) * (1 - smoothstep(40.4, 41.9, time));
    this.titleMat.opacity = tk;
    this.subtitleMat.opacity = tk * (0.55 + 0.45 * smoothstep(36.6, 38.2, time));
    const drift = smoothstep(35.5, 42, time);
    this.title.position.set(0, 1.4, -30 - drift * 6);
    this.subtitle.position.set(0, -1.9, -30 - drift * 6);
    this.title.visible = tk > 0.002;
    this.subtitle.visible = tk > 0.002;
  }
}
