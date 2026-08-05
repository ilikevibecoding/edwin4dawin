/**
 * Development harness for reviewing sculpts.
 *
 *   ?dev=heads&who=connor                     one character, four angles
 *   ?dev=heads&who=connor,kara,hank           cast line-up, front on
 *   ?dev=heads&mat=clay                       neutral clay, for shape review
 *   ?dev=heads&frame=full                     whole figure instead of the head
 *   ?dev=heads&hide=scalp,collar              isolate parts
 */
import * as THREE from 'three';
import { Engine, type SceneSet } from '../app/engine';
import { Character } from '../engine/character';
import { CAST } from '../game/cast';

import type { ExpressionName, PoseName } from '../engine/character';

export function runHeads(engine: Engine, params: URLSearchParams): SceneSet {
  const q = engine.quality;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x121820);
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.05, 40);

  const whoList = (params.get('who') ?? 'connor').split(',').filter(Boolean);
  const expr = (params.get('expr') ?? 'neutral') as ExpressionName;
  const pose = (params.get('pose') ?? 'idle') as PoseName;
  const multi = whoList.length > 1;
  const angleParam = params.get('angles');
  const angles = angleParam
    ? angleParam.split(',').map(Number)
    : multi
      ? whoList.map(() => 0)
      : [0, 0.5, 1.15, 2.9];
  const specs = multi ? whoList : whoList.concat(whoList, whoList, whoList).slice(0, 4);
  const frameFull = params.get('frame') === 'full';
  const spacing = Number(params.get('gap') ?? (frameFull ? 0.85 : 0.3));

  const chars: Character[] = [];
  const n = specs.length;
  for (let i = 0; i < n; i++) {
    const ch = new Character(CAST[specs[i]] ?? CAST.connor, q.characterSegments);
    ch.setPosition((i - (n - 1) / 2) * spacing, 0, 0);
    ch.setRotationY(angles[i] ?? 0);
    ch.applyPoseImmediate(pose);
    ch.setExpression(expr, Number(params.get('exprw') ?? 1));
    if (params.get('talk')) ch.say(90, 1, false);
    scene.add(ch.group);
    chars.push(ch);
  }

  /* part isolation */
  const hide = (params.get('hide') ?? '').split(',').filter(Boolean);
  const only = (params.get('only') ?? '').split(',').filter(Boolean);
  if (hide.length || only.length) {
    for (const ch of chars) {
      ch.group.traverse((o) => {
        if (!(o as THREE.Mesh).isMesh && !(o as THREE.SkinnedMesh).isSkinnedMesh) return;
        const nm = o.name || '';
        const tail = nm.includes('-') ? nm.slice(nm.indexOf('-') + 1) : nm;
        if (hide.some((h) => h && tail.includes(h))) o.visible = false;
        if (only.length && !only.some((k) => k && tail.includes(k))) o.visible = false;
      });
    }
  }

  /* material override for shape review */
  const matMode = params.get('mat');
  if (matMode === 'clay' || matMode === 'normal') {
    const clay = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0 });
    clay.color = new THREE.Color(0x8d8f94).convertSRGBToLinear();
    const nrm = new THREE.MeshNormalMaterial({ flatShading: false });
    const override: THREE.Material = matMode === 'normal' ? nrm : clay;
    for (const ch of chars) {
      ch.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh || (m as THREE.SkinnedMesh).isSkinnedMesh) m.material = override;
      });
    }
  }

  /* framing */
  const eyeY = chars[0].eyeLine(new THREE.Vector3()).y;
  const height = chars[0].dims.H;
  const fov = Number(params.get('fov') ?? 30);
  const aspect = 16 / 9;
  const halfV = Math.tan(((fov * Math.PI) / 180) * 0.5);
  const needW = (n - 1) * spacing + (frameFull ? 0.75 : 0.26);
  const needH = frameFull ? height * 1.08 : 0.34;
  const distW = needW / (2 * halfV * aspect);
  const distH = needH / (2 * halfV);
  const dist = Math.max(distW, distH) + 0.12;
  const centerY = frameFull ? height * 0.52 : eyeY;
  camera.position.set(0, centerY, dist);
  camera.lookAt(0, centerY, 0);
  camera.fov = fov;
  camera.updateProjectionMatrix();

  /* Directional beauty rig — no distance falloff, so exposure is predictable. */
  const aim = new THREE.Vector3(0, centerY, 0);
  const place = (azimuth: number, elevation: number, radius: number) => {
    const a = (azimuth * Math.PI) / 180;
    const e = (elevation * Math.PI) / 180;
    return new THREE.Vector3(
      Math.sin(a) * Math.cos(e) * radius,
      centerY + Math.sin(e) * radius,
      Math.cos(a) * Math.cos(e) * radius,
    );
  };
  // Off by default: with several copies side by side they shadow each other's
  // faces, which hides exactly what this harness exists to show.
  const shadows = params.get('shadow') === '1';
  const mkDir = (color: number, intensity: number, az: number, el: number, shadow: boolean) => {
    const l = new THREE.DirectionalLight(color, intensity);
    l.position.copy(place(az, el, 4));
    l.target.position.copy(aim);
    if (shadow && shadows) {
      l.castShadow = true;
      l.shadow.mapSize.set(2048, 2048);
      const a = 1.4;
      l.shadow.camera.left = -a;
      l.shadow.camera.right = a;
      l.shadow.camera.top = a;
      l.shadow.camera.bottom = -a;
      l.shadow.camera.near = 0.5;
      l.shadow.camera.far = 9;
      l.shadow.bias = -0.0002;
      l.shadow.normalBias = 0.004;
      l.shadow.radius = 2;
    }
    return l;
  };
  // Balanced for an ACES pipeline: the key puts the lit side near 0.2 linear
  // and the fill keeps shadow detail above the tonemap toe.
  // ACES has a long toe, so ambient has to be genuinely bright for shadow
  // detail to survive the tonemap in a review render.
  const key = mkDir(0xfff4e8, 4.2, -36, 24, true);
  const fill = mkDir(0x9dc0e0, 3.4, 48, 6, false);
  const rim = mkDir(0xcfe8ff, 2.6, 156, 26, false);
  const amb = new THREE.HemisphereLight(0x6d8ca8, 0x2a3138, 5);
  scene.add(key, key.target, fill, fill.target, rim, rim.target, amb);

  // Reference primitives: a sphere with a known albedo makes exposure and
  // shadow problems obvious without guessing.
  if (params.get('probe') === '1') {
    const probeMat = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0 });
    probeMat.color = new THREE.Color(0x8d8f94).convertSRGBToLinear();
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 24), probeMat);
    sphere.position.set(needW * 0.5 - 0.06, centerY, 0.1);
    sphere.castShadow = true;
    sphere.receiveShadow = true;
    scene.add(sphere);
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), probeMat);
    cube.position.set(-needW * 0.5 + 0.06, centerY, 0.1);
    cube.castShadow = true;
    cube.receiveShadow = true;
    scene.add(cube);
  }

  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 18),
    new THREE.MeshStandardMaterial({ color: 0x0d141b, roughness: 0.95 }),
  );
  backdrop.position.set(0, centerY, -2.6);
  scene.add(backdrop);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color: 0x11181f, roughness: 0.8 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  if (params.get('lookcam')) for (const c of chars) c.lookAt(camera.position.clone(), 1);

  return {
    name: 'heads',
    scene,
    camera,
    update(dt, time) {
      for (const c of chars) c.update(dt, time);
      engine.fx.focusTarget = dist;
      engine.fx.aperture = Number(params.get('ap') ?? 0.2);
    },
    applyLook(fx) {
      fx.setBloom(0.14, 0.7, 1.6);
      fx.setStreak(0.04);
      fx.highlightCeiling = 8;
      fx.applyLook({
        uExposure: Number(params.get('exp') ?? 1), uSplit: 0.05, uVignette: 0.2,
        uGrain: 0.01, uHalation: 0.02, uCA: 0.0003, uBarrel: 0,
      });
      fx.wetLens = 0;
    },
    dispose() {
      for (const c of chars) c.dispose();
    },
  };
}
