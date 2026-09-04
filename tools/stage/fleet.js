import * as THREE from 'three';
import { configureRenderer, createPost } from '../../src/post.js';
import { createSky } from '../../src/sky.js';
import { createFleet } from '../../src/vehicles/index.js';

// ---------------------------------------------------------------------------
// A stage for the fleet alone: the real sky, grade and tone pipeline over a
// gently rolling dirt pad, with the same debugAPI surface tools/fleetshots.mjs
// drives — so the vehicles can be judged while other modules are mid-edit.
//   /tools/stage/fleet.html?quality=high&time=day
// ---------------------------------------------------------------------------

const params = new URLSearchParams(location.search);
const quality = params.get('quality') || 'high';
const startTime = params.get('time') || 'day';

async function boot() {
  const renderer = new THREE.WebGLRenderer({ antialias: false, stencil: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  configureRenderer(renderer);
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 600);
  camera.position.set(12, 4, 18);

  const skyRig = createSky(scene, renderer, { shadowMapSize: 2048, envSamples: 256, timeOfDay: startTime, quality: 'fast' });

  // the pad: rolls by a few tens of centimetres so the ground fit has work to do
  const heightAt = (x, z) => 0.22 * Math.sin(x * 0.19 + 0.4) * Math.cos(z * 0.16) + 0.08 * Math.sin(x * 0.7) * Math.sin(z * 0.53);
  const ground = new THREE.PlaneGeometry(160, 120, 160, 120);
  ground.rotateX(-Math.PI / 2);
  const gp = ground.attributes.position;
  for (let i = 0; i < gp.count; i++) gp.setY(i, heightAt(gp.getX(i), gp.getZ(i)));
  ground.computeVertexNormals();
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x8a7756, roughness: 1, metalness: 0 });
  const groundMesh = new THREE.Mesh(ground, groundMat);
  groundMesh.receiveShadow = true;
  groundMesh.name = 'stage_ground';
  scene.add(groundMesh);
  const terrain = {
    heightAt,
    mainPoint: () => new THREE.Vector3(0, 0, 0),
    mainTangent: () => new THREE.Vector3(1, 0, 0),
    roadPoint: () => new THREE.Vector3(0, 0, 0),
    roadTangent: () => new THREE.Vector3(1, 0, 0),
  };

  // one of each kind in a line, far enough apart that the framings never
  // overlap; `?row=camp` uses the fleet's own fallback (the campground plan)
  const KINDS = ['expedition-truck', 'safari-jeep', 'suv', 'pickup', 'ranger', 'utility', 'supply-truck', 'camper', 'trailer', 'motorcycle', 'safari-jeep', 'pickup'];
  const placements =
    params.get('row') === 'camp'
      ? []
      : KINDS.map((kind, i) => ({ x: -44 + i * 8, z: 10 + (i % 2) * 0.6, heading: 0.05 * ((i % 3) - 1), kind }));
  const fleet = createFleet({ env: skyRig.env, quality, placements, terrain });
  scene.add(fleet.group);
  const post = createPost(renderer, scene, camera, { quality: 'fast', timeOfDay: startTime });
  skyRig.follow(new THREE.Vector3(0, 0, 10));
  renderer.compile(scene, camera);

  let timeOfDay = startTime;
  let frozen = false;
  let simTime = 0;
  let last = performance.now();
  const frame = () => {
    requestAnimationFrame(frame);
    if (frozen) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    simTime += dt;
    fleet.update(dt, simTime);
    skyRig.updateSky(camera);
    post.render(dt);
  };
  frame();

  window.THREE = THREE;
  window.debugAPI = {
    objects: { scene, camera, renderer, skyRig, fleet, post, terrain },
    pause() {
      frozen = true;
    },
    resume() {
      frozen = false;
      last = performance.now();
    },
    setTimeOfDay(name) {
      timeOfDay = name;
      skyRig.setTimeOfDay?.(name, { scene });
      post.setTimeOfDay?.(name);
      fleet.setTimeOfDay(name);
      return timeOfDay;
    },
    get timeOfDay() {
      return timeOfDay;
    },
    renderFrames(n = 1) {
      const gl = renderer.getContext();
      for (let i = 0; i < n; i++) {
        simTime += 1 / 60;
        fleet.update(1 / 60, simTime);
        skyRig.updateSky(camera);
        post.render(1 / 60);
        gl.finish();
      }
      return n;
    },
    captureFrame(frames = 2) {
      this.renderFrames(frames);
      return renderer.domElement.toDataURL('image/png');
    },
    stats() {
      return { fleet: fleet.stats, render: { calls: renderer.info.render.calls, tris: renderer.info.render.triangles } };
    },
  };
  window.__READY__ = true;
}

boot().catch((e) => {
  console.error(e);
  window.__ERROR__ = { message: e.message, stack: e.stack };
});
