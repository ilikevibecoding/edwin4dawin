/**
 * Development-only asset viewer.
 *
 *   /preview.html?asset=runner&view=three-quarter&dist=1.6
 *
 * Not part of the production bundle; Vite only builds index.html.
 */

import * as THREE from 'three';
import { Stage } from '../core/renderer';
import { qualityFor, type QualityLevel } from '../core/quality';
import { BlockadeRunner } from '../ships/blockade-runner';
import { ImperialDestroyer } from '../ships/imperial-destroyer';
import { EscapePod } from '../ships/escape-pod';
import { EnvironmentSet } from '../scene/environment';

const params = new URLSearchParams(location.search);
const assetName = params.get('asset') ?? 'runner';
const view = params.get('view') ?? 'three-quarter';
const distMul = Number(params.get('dist') ?? 1);
const level = (params.get('q') ?? 'medium') as QualityLevel;
const spin = params.get('spin') === '1';

const canvas = document.getElementById('stage') as HTMLCanvasElement;
const quality = qualityFor(level);
const stage = new Stage({ canvas, quality });
stage.skyVisible = false;
stage.resize(window.innerWidth, window.innerHeight);
stage.setGrain(false);

const env = new EnvironmentSet(
  stage.renderer,
  new THREE.Vector3(0.6, 0.5, -0.6),
  new THREE.Vector3(0, -1, 0),
);
env.apply(stage.scene, (params.get('env') as 'space' | 'interior') ?? 'interior', 0.85);

// Neutral three-point studio rig so silhouettes are judged on form, not lighting.
const key = new THREE.DirectionalLight(0xfff2e0, 2.1);
key.position.set(0.6, 0.75, 0.5).normalize().multiplyScalar(100);
stage.scene.add(key);
const fill = new THREE.DirectionalLight(0x8fb4ff, 1.0);
fill.position.set(-0.7, 0.15, 0.4).normalize().multiplyScalar(100);
stage.scene.add(fill);
const rim = new THREE.DirectionalLight(0xffffff, 1.5);
rim.position.set(-0.2, 0.3, -1).normalize().multiplyScalar(100);
stage.scene.add(rim);
stage.scene.add(new THREE.AmbientLight(0x415066, 0.45));

const root = new THREE.Group();
stage.scene.add(root);

let updater: ((dt: number, t: number) => void) | null = null;

// Dev-only: resolved by the browser at runtime so the preview page keeps
// working while a module is still being written.
const dyn = (path: string) => import(/* @vite-ignore */ path);

async function build(name: string): Promise<THREE.Object3D> {
  switch (name) {
    case 'runner': {
      const s = new BlockadeRunner(quality);
      updater = (dt, t) => s.update(dt, t);
      return s.group;
    }
    case 'destroyer': {
      const s = new ImperialDestroyer(quality);
      updater = (dt, t) => s.update(dt, t);
      return s.group;
    }
    case 'pod': {
      const s = new EscapePod();
      s.setBurn(1);
      updater = (dt, t) => s.update(dt, t);
      return s.group;
    }
    case 'corridor': {
      const { CorridorSection } = (await dyn('/src/interior/corridor.ts')) as typeof import('../interior/corridor');
      const c = new CorridorSection(quality, 'preview');
      updater = (dt, t) => c.update(dt, t);
      return c.group;
    }
    case 'blast-door': {
      const { BlastDoor } = (await dyn('/src/interior/door.ts')) as typeof import('../interior/door');
      const d = new BlastDoor(quality);
      updater = (dt, t) => d.update(dt, t);
      return d.group;
    }
    case 'data': {
      const { DataProjection } = (await dyn('/src/fx/data-projection.ts')) as typeof import('../fx/data-projection');
      const d = new DataProjection(quality);
      d.setReveal(1);
      updater = (dt, t) => d.update(dt, t);
      return d.group;
    }
    case 'lineup': {
      const { makeCharacter, CHARACTER_KINDS } = (await dyn('/src/characters/factory.ts')) as typeof import('../characters/factory');
      const g = new THREE.Group();
      const chars = CHARACTER_KINDS.map((k, i) => {
        const c = makeCharacter(k, quality, `preview-${k}`);
        c.group.position.x = (i - (CHARACTER_KINDS.length - 1) / 2) * 1.5;
        c.setState('idle');
        g.add(c.group);
        return c;
      });
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 8),
        new THREE.MeshStandardMaterial({ color: '#2b2f36', roughness: 0.9 }),
      );
      floor.rotation.x = -Math.PI / 2;
      g.add(floor);
      updater = (dt, t) => chars.forEach((c) => c.update(dt, t));
      return g;
    }
    default: {
      const { makeCharacter, CHARACTER_KINDS } = (await dyn('/src/characters/factory.ts')) as typeof import('../characters/factory');
      if ((CHARACTER_KINDS as readonly string[]).includes(name)) {
        const c = makeCharacter(name as never, quality);
        c.setState((params.get('state') as never) ?? 'idle');
        updater = (dt, t) => c.update(dt, t);
        return c.group;
      }
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 'red' })));
      return g;
    }
  }
}

const asset = await build(assetName);
root.add(asset);
(window as unknown as Record<string, unknown>).__previewAsset = asset;

// Frame the subject.
const box = new THREE.Box3().setFromObject(asset);
const size = box.getSize(new THREE.Vector3());
const centre = box.getCenter(new THREE.Vector3());
// Fit the bounding sphere to the smaller of the two frustum half-angles so
// nothing is ever cropped, whatever the viewport shape.
const radius = size.length() * 0.5;
const vFov = (38 * Math.PI) / 180;
const aspect = window.innerWidth / window.innerHeight;
const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
const dist = (radius / Math.sin(Math.min(vFov, hFov) / 2)) * 0.92 * distMul;

// Subjects face −Z, so "front" means placing the camera on the −Z side.
const angles: Record<string, [number, number]> = {
  'three-quarter': [Math.PI + 0.72, 0.26],
  front: [Math.PI, 0.05],
  side: [Math.PI / 2, 0.03],
  top: [Math.PI + 0.001, 1.45],
  below: [Math.PI + 0.7, -0.4],
  hero: [Math.PI - 0.6, 0.13],
  bow: [Math.PI - 0.28, 0.1],
  rear: [0, 0.22],
};
const [az, el] = angles[view] ?? angles['three-quarter'];

function place(a: number, e: number) {
  stage.camera.position.set(
    centre.x + Math.sin(a) * Math.cos(e) * dist,
    centre.y + Math.sin(e) * dist,
    centre.z + Math.cos(a) * Math.cos(e) * dist,
  );
  stage.camera.lookAt(centre);
}
place(az, el);
stage.setClipRange(Math.max(0.05, dist * 0.002), dist * 12);

const hud = document.getElementById('hud')!;
const clock = new THREE.Clock();
let frames = 0;
let acc = 0;
let fps = 0;

function loop() {
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.getElapsedTime();
  if (spin) place(az + t * 0.3, el);
  updater?.(dt, t);
  stage.render(t);
  frames++;
  acc += dt;
  if (acc > 0.5) { fps = frames / acc; frames = 0; acc = 0; }
  hud.textContent =
    `asset  ${assetName}\nview   ${view}\nsize   ${size.x.toFixed(1)} x ${size.y.toFixed(1)} x ${size.z.toFixed(1)}\n` +
    `tris   ${stage.triangles.toLocaleString()}\ncalls  ${stage.drawCalls}\nfps    ${fps.toFixed(1)}`;
  requestAnimationFrame(loop);
}
loop();

window.addEventListener('resize', () => stage.resize(window.innerWidth, window.innerHeight));
(window as unknown as Record<string, unknown>).__ready = true;
