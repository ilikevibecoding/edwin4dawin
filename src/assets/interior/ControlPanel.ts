import * as THREE from 'three';
import { box, cyl, merge } from '../geometry';
import { corridorTrim, darkMechanical, emissive } from '../materials';
import { consoleScreenMap } from '../textures';
import { freshRng } from '../../core/Random';

/**
 * Wall-mounted control station: an angled desk, a bank of readout screens and
 * rows of small indicator studs that idle-animate. Screens are procedural
 * canvases, so nothing here is a downloaded texture.
 */
export interface ControlPanelOptions {
  width?: number;
  tint?: 'amber' | 'blue' | 'red';
  screens?: number;
  seed?: string;
}

export class ControlPanel {
  readonly root = new THREE.Group();
  readonly screenAnchor = new THREE.Object3D();
  private screens: THREE.Mesh[] = [];
  private studs: THREE.Mesh;
  private studPhases: number[] = [];
  private glowLight: THREE.PointLight;
  private activity = 1;

  constructor(opts: ControlPanelOptions = {}) {
    const w = opts.width ?? 1.8;
    const tint = opts.tint ?? 'amber';
    const count = opts.screens ?? 2;
    const rng = freshRng(opts.seed ?? `panel:${w}:${tint}:${count}`);
    this.root.name = 'ControlPanel';

    const body = new THREE.Mesh(
      merge([
        box(w, 0.95, 0.42, { pos: [0, 0.48, 0.2] }),
        box(w, 0.14, 0.62, { pos: [0, 0.98, 0.28], rot: [-0.32, 0, 0] }),
        box(w + 0.12, 0.1, 0.5, { pos: [0, 1.06, 0.16] }),
        box(w, 1.35, 0.16, { pos: [0, 1.85, 0.02] }),
        box(0.1, 0.34, 0.34, { pos: [-w / 2 + 0.05, 0.2, 0.3] }),
        box(0.1, 0.34, 0.34, { pos: [w / 2 - 0.05, 0.2, 0.3] }),
      ]),
      corridorTrim(),
    );
    body.castShadow = true;
    body.receiveShadow = true;
    this.root.add(body);

    const kickplate = new THREE.Mesh(
      box(w * 0.96, 0.18, 0.36, { pos: [0, 0.09, 0.2] }),
      darkMechanical(),
    );
    this.root.add(kickplate);

    // Screen bank on the upright section.
    const sw = (w - 0.16) / count;
    for (let i = 0; i < count; i++) {
      const tex = consoleScreenMap(i + rng.int(0, 3), tint);
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 1.5,
        roughness: 0.35,
        metalness: 0.1,
      });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw * 0.86, 0.62), mat);
      screen.position.set(-w / 2 + sw * (i + 0.5) + 0.08, 1.95, 0.11);
      this.root.add(screen);
      this.screens.push(screen);
    }

    // Angled keypad screen.
    const keyTex = consoleScreenMap(7, tint);
    const keyMat = new THREE.MeshStandardMaterial({
      map: keyTex,
      emissiveMap: keyTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 1.1,
      roughness: 0.5,
    });
    const keypad = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.8, 0.44), keyMat);
    keypad.position.set(0, 1.0, 0.33);
    keypad.rotation.x = -0.32 - Math.PI / 2 + Math.PI / 2;
    keypad.rotation.x = -1.25;
    this.root.add(keypad);
    this.screens.push(keypad);

    // Indicator studs.
    const studGeos: THREE.BufferGeometry[] = [];
    const rows = 2;
    const cols = Math.max(4, Math.round(w * 5));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        studGeos.push(
          cyl(0.026, 0.026, 0.03, 6, {
            pos: [-w / 2 + 0.12 + (c * (w - 0.24)) / (cols - 1), 1.32 + r * 0.14, 0.1],
            rot: [Math.PI / 2, 0, 0],
          }),
        );
        this.studPhases.push(rng.range(0, Math.PI * 2));
      }
    }
    this.studs = new THREE.Mesh(
      merge(studGeos),
      emissive(`panelStud:${tint}`, tint === 'blue' ? 0x7fd4ff : 0xffb648, 2.4),
    );
    this.root.add(this.studs);

    this.glowLight = new THREE.PointLight(tint === 'blue' ? 0x7fd4ff : 0xffb648, 1.6, 4.5, 2);
    this.glowLight.position.set(0, 1.7, 0.5);
    this.root.add(this.glowLight);

    this.screenAnchor.position.set(0, 1.35, 0.6);
    this.root.add(this.screenAnchor);
  }

  /** 0 = dark/dead panel, 1 = fully lit. */
  setActivity(v: number): void {
    this.activity = v;
  }

  update(elapsed: number): void {
    const a = this.activity;
    for (let i = 0; i < this.screens.length; i++) {
      const mat = this.screens[i].material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = (1.0 + 0.2 * Math.sin(elapsed * 3.1 + i)) * a;
      // Slow vertical scroll makes the readouts feel live.
      mat.map!.offset.y = (elapsed * 0.05 * (i % 2 === 0 ? 1 : -1)) % 1;
      mat.emissiveMap!.offset.y = mat.map!.offset.y;
    }
    (this.studs.material as THREE.MeshStandardMaterial).emissiveIntensity =
      (1.1 + 0.4 * Math.sin(elapsed * 5.2)) * a;
    this.glowLight.intensity = 1.1 * a;
  }
}
