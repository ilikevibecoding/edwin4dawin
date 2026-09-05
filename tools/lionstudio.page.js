// ---------------------------------------------------------------------------
// Studio page for the lions, loaded by tools/lionstudio.mjs through the Vite
// dev server so it shares the game's `three` and the wildlife modules as they
// are. One lion on a flat (or tilted) plane, the game's day rig approximated:
// sun from az 35 / el 58 at 9.4, hemisphere 0.5, blue rim, a gradient PMREM.
//
// Nothing here is part of the game; it exists so the face, the paws and the
// gait can be looked at in seconds instead of minutes.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { Lion, lionMaterials } from '../src/wildlife/lion/index.js';

export async function studio({ kind = 'lioness', quality = 'high', width = 640, height = 360, slope = 0, seed = 7 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  document.body.style.margin = '0';
  document.body.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(width, height, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.34;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa9c3dc);

  // environment: a sky gradient over a straw plain
  const envScene = new THREE.Scene();
  const skyGeo = new THREE.SphereGeometry(50, 24, 12);
  const cols = [];
  const pos = skyGeo.attributes.position;
  const top = new THREE.Color(0x5d86b8);
  const hor = new THREE.Color(0xd9dfe4);
  const gnd = new THREE.Color(0xa8874e);
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 50;
    const c = y >= 0 ? hor.clone().lerp(top, Math.pow(y, 0.6)) : gnd;
    cols.push(c.r, c.g, c.b);
  }
  skyGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  envScene.add(new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(envScene, 0, 0.1, 200).texture;
  scene.environment = env;

  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 58), THREE.MathUtils.degToRad(35));
  const sun = new THREE.DirectionalLight(0xfff1de, 9.4);
  sun.position.copy(sunDir).multiplyScalar(30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -4;
  sun.shadow.camera.right = sun.shadow.camera.top = 4;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 60;
  sun.shadow.bias = -0.00012;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x93a9c2, 0x9a6a44, 0.5));
  const rim = new THREE.DirectionalLight(0x5a6d8c, 0.38);
  rim.position.copy(sunDir).multiplyScalar(-30).setY(12);
  scene.add(rim);

  // ground: a laterite plane with a soft grid so slide is visible against it
  const gTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#9d6e4c';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 6000; i++) {
      const v = 120 + Math.random() * 90;
      ctx.fillStyle = `rgba(${v},${v * 0.75},${v * 0.55},0.35)`;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 4, 2 + Math.random() * 4);
    }
    ctx.strokeStyle = 'rgba(60,40,30,0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 64, 0);
      ctx.lineTo(i * 64, 512);
      ctx.moveTo(0, i * 64);
      ctx.lineTo(512, i * 64);
      ctx.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(20, 20);
    return t;
  })();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80, 80, 80), new THREE.MeshStandardMaterial({ map: gTex, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  // tilt the plane along x so foot placement on a slope can be judged
  const heightAt = (x, z) => x * slope;
  if (slope) {
    const gp = ground.geometry.attributes.position;
    for (let i = 0; i < gp.count; i++) gp.setZ(i, heightAt(gp.getX(i), -gp.getY(i)));
    gp.needsUpdate = true;
    ground.geometry.computeVertexNormals();
  }

  const terrain = { heightAt, roadDistance: () => 100 };
  const materials = lionMaterials({ env, quality });
  const pride = [];
  const lion = new Lion({ kind, terrain, materials, quality, seed, home: { x: 0, z: 0, yaw: 0 }, spread: 6, pride, variation: {} });
  pride.push(lion.brain);
  scene.add(lion.root);

  const camera = new THREE.PerspectiveCamera(35, width / height, 0.05, 200);
  let t = 0;
  const truck = { x: 1e4, y: 0, z: 1e4, speed: 0, throttle: 0 };
  const api = {
    THREE,
    scene,
    camera,
    renderer,
    lion,
    materials,
    terrain,
    truck,
    force(state) {
      lion.brain.enter(state);
      lion.brain.dwell = 1e9;
      lion.brain.alarm = 0;
    },
    sim(seconds, dt = 1 / 30) {
      const n = Math.round(seconds / dt);
      for (let i = 0; i < n; i++) {
        t += dt;
        lion.step(dt, truck);
        for (const u of lion.shellUniforms) u.uTime.value = t;
      }
    },
    render() {
      lion.root.updateMatrixWorld(true);
      renderer.render(scene, camera);
      return canvas.toDataURL('image/png');
    },
    stats() {
      return { tiers: lion.stats.tiers, calls: lion.stats.calls, render: { ...renderer.info.render } };
    },
    /** World position of a bone. */
    bone(name) {
      lion.root.updateMatrixWorld(true);
      return lion.skel.boneByName.get(name).getWorldPosition(new THREE.Vector3());
    },
  };
  window.__studio = api;
  return api;
}
