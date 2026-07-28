import * as THREE from 'three';
import { createCameraRig, VIEW_NAMES } from './camera.js';
import { createDriver } from './drive.js';
import { createWheelDust } from './dust.js';
import { createForest } from './forest.js';
import { PALETTE } from './palette.js';
import { configureRenderer, createPost } from './post.js';
import { createDustMotes, createLightShafts, createSky } from './sky.js';
import { createTerrain } from './terrain.js';
import { createVehicle } from './vehicle/index.js';
import { setVehicleEnv } from './vehicle/materials.js';
import { createHud } from './hud.js';

// ---------------------------------------------------------------------------
// Boot, main loop, and the debug API the screenshot tool drives.
// ---------------------------------------------------------------------------

const params = new URLSearchParams(location.search);
const quality = params.get('quality') || 'high';
const FAST = quality !== 'high';

const bootLabel = document.getElementById('boot-label');
const bootBar = document.getElementById('boot-bar');
const step = async (label, pct, fn) => {
  if (bootLabel) bootLabel.textContent = label;
  if (bootBar) bootBar.style.width = `${pct}%`;
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  return fn();
};

async function boot() {
  // --- renderer ------------------------------------------------------------
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    powerPreference: 'high-performance',
    stencil: false,
    // Software rasterisation takes tens of seconds a frame, which means a
    // page-level screenshot can easily race the compositor and grab an empty
    // buffer. Keeping the drawing buffer lets the tool read the canvas back
    // directly once a frame is genuinely finished.
    preserveDrawingBuffer: params.has('capture'),
  });
  renderer.setPixelRatio(FAST ? 1 : Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  configureRenderer(renderer);
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.12, 900);
  camera.position.set(8, 3, 10);

  // --- world ---------------------------------------------------------------
  const skyRig = await step('Building sky', 8, () => createSky(scene, renderer, { shadowMapSize: FAST ? 1024 : 2048 }));
  const terrain = await step('Grading the road', 24, () => createTerrain({ env: skyRig.env }));
  scene.add(terrain.mesh);

  const landing = terrain.roadPoint(0.42);
  const forest = await step('Planting the forest', 52, () =>
    createForest({
      terrain,
      env: skyRig.env,
      treeCount: FAST ? 150 : 210,
      clearings: [{ x: landing.x, z: landing.z, r: 25 }],
    }),
  );
  scene.add(forest.group);

  const vehicle = await step('Assembling the truck', 78, () => createVehicle({ env: skyRig.env }));
  setVehicleEnv(skyRig.env);
  scene.add(vehicle.root);

  const shafts = createLightShafts(skyRig.sunDir, { count: FAST ? 8 : 14 });
  scene.add(shafts.group);
  const motes = createDustMotes({ count: FAST ? 400 : 900 });
  scene.add(motes.points);
  const wheelDust = createWheelDust();
  scene.add(wheelDust.points);

  const driver = createDriver({ terrain, vehicle });
  const rig = createCameraRig(camera, { vehicle, terrain });
  const hud = createHud();

  const post = await step('Compiling shaders', 92, () => createPost(renderer, scene, camera, { quality }));

  // --- input ---------------------------------------------------------------
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyC') {
      rig.cycle();
      hud.setCamera(rig.label);
    } else if (e.code === 'KeyL') {
      vehicle.setLights(!vehicle.state.lightsOn);
      hud.setStatus(vehicle.state.lightsOn ? 'Lights on' : 'Lights off');
    } else if (e.code === 'KeyR') {
      driver.state.auto = !driver.state.auto;
      hud.setStatus(driver.state.auto ? 'Auto-drive engaged' : 'Manual control');
    } else if (e.code.startsWith('Digit')) {
      const n = Number(e.code.slice(5));
      if (n >= 1 && n <= VIEW_NAMES.length && rig.showView(VIEW_NAMES[n - 1])) {
        hud.setCamera(rig.label);
      }
    }
  });

  // Click walks the views round the truck, drag takes hold of it, wheel pulls
  // in. A click and a drag both start with a pointerdown, so the two are told
  // apart on release by how far the pointer travelled.
  const canvas = renderer.domElement;
  const DRAG_SLOP = 5;
  let pointerDown = false;
  let travelled = 0;
  let lastX = 0;
  let lastY = 0;
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'none';

  canvas.addEventListener('pointerdown', (e) => {
    pointerDown = true;
    travelled = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture?.(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointerDown) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    travelled += Math.abs(dx) + Math.abs(dy);
    if (travelled <= DRAG_SLOP) return;
    canvas.style.cursor = 'grabbing';
    rig.orbitBy(dx, dy);
    hud.setCamera(rig.label);
  });

  const endPointer = (e) => {
    if (!pointerDown) return;
    pointerDown = false;
    canvas.releasePointerCapture?.(e.pointerId);
    canvas.style.cursor = 'grab';
    if (travelled > DRAG_SLOP) return;
    rig.nextView();
    hud.setCamera(rig.label);
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      rig.zoomBy(e.deltaY);
      hud.setCamera(rig.label);
    },
    { passive: false },
  );

  window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    post.setSize(w, h);
  });

  // --- loop ----------------------------------------------------------------
  let last = performance.now();
  const tick = () => {
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;
    return THREE.MathUtils.clamp(dt, 1e-4, 0.1);
  };
  let simTime = 0;
  let frozen = false;
  let frames = 0;
  let fpsAccum = 0;
  let fps = 0;

  const contacts = [];
  const _v = new THREE.Vector3();

  function simulate(dt) {
    simTime += dt;
    driver.update(dt);
    forest.update(simTime);
    motes.update(simTime, vehicle.root.position);
    shafts.update(simTime, camera, vehicle.root.position);
    post.update(simTime);

    contacts.length = 0;
    for (const w of vehicle.wheels) {
      if (w.z > 0) continue;
      _v.set(w.x, 0.06, w.z).applyMatrix4(vehicle.root.matrixWorld);
      contacts.push({ x: _v.x, y: _v.y, z: _v.z });
    }
    wheelDust.update(dt, {
      contacts,
      speed: driver.state.speed,
      heading: driver.state.heading,
    });

    skyRig.follow(vehicle.root.position);
    hud.update(dt, driver.state.auto ? 'Auto-drive engaged' : 'Manual control');
    hud.setSpeed(driver.state.speed * 3.6);
  }

  function frame() {
    requestAnimationFrame(frame);
    const dt = tick();
    if (!frozen) {
      simulate(dt);
      rig.update(dt, driver.state.speed);
    }
    skyRig.updateSky(camera);
    post.render(dt);

    frames++;
    fpsAccum += dt;
    if (fpsAccum > 0.5) {
      fps = frames / fpsAccum;
      frames = 0;
      fpsAccum = 0;
    }
  }

  hud.setCamera(rig.label);
  hud.setStatus('Click to look around', 5);
  document.getElementById('boot')?.classList.add('done');
  frame();

  // --- debug API for tools/shots.mjs --------------------------------------
  window.debugAPI = {
    views: VIEW_NAMES,
    listViews: () => VIEW_NAMES,
    /**
     * Deterministically place the world and snap to a named beauty view.
     * Runs a fixed pre-roll so dust, wind and suspension have settled into a
     * moving state before the shot is taken.
     *
     * The pre-roll is long on purpose. Position, heading and speed are reset
     * here but the suspension is not, so a short pre-roll leaves the sprung mass
     * carrying state from whatever the previous view did — which slides the
     * cabin through the bottom third of the interior frame between captures and
     * makes two runs of the same view impossible to compare.
     */
    setView(name, { preroll = 320, dtStep = 1 / 60, startT = 0.42 } = {}) {
      frozen = true;
      // reset to a known state
      simTime = 0;
      wheelDust.clear();
      driver.state.auto = true;
      driver.state.autoT = startT;
      const p = terrain.roadPoint(startT);
      const t = terrain.roadTangent(startT);
      driver.state.pos.copy(p);
      driver.state.heading = Math.atan2(t.x, t.z);
      driver.state.speed = 8.6;
      for (let i = 0; i < preroll; i++) simulate(dtStep);
      vehicle.root.updateMatrixWorld(true);
      const ok = rig.setView(name);
      skyRig.follow(vehicle.root.position);
      return ok;
    },
    /**
     * Render n frames back to back and block on the GPU each time. Software
     * rasterisation can take tens of seconds a frame, so the screenshot tool
     * needs a hard guarantee that a complete frame has been presented rather
     * than a wall-clock guess.
     */
    renderFrames(n = 1) {
      const gl = renderer.getContext();
      for (let i = 0; i < n; i++) {
        skyRig.updateSky(camera);
        post.render(1 / 60);
        gl.finish();
      }
      return n;
    },
    /**
     * Render, then read the canvas back as a PNG data URL. Deterministic and
     * immune to compositor timing, and it captures the raw render without the
     * DOM HUD painted over it.
     */
    captureFrame(frames = 2) {
      this.renderFrames(frames);
      return renderer.domElement.toDataURL('image/png');
    },
    /** Mean / peak luminance of the last render, for black-frame detection. */
    sampleLuma() {
      const size = renderer.getSize(new THREE.Vector2());
      const c = document.createElement('canvas');
      c.width = 96;
      c.height = Math.max(1, Math.round((96 * size.y) / size.x));
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(renderer.domElement, 0, 0, c.width, c.height);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let sum = 0;
      let max = 0;
      for (let i = 0; i < d.length; i += 4) {
        const l = (d[i] * 0.2126 + d[i + 1] * 0.7152 + d[i + 2] * 0.0722) / 255;
        sum += l;
        if (l > max) max = l;
      }
      const n = d.length / 4;
      return { mean: sum / n, max };
    },
    setLights(on) {
      vehicle.setLights(!!on);
    },
    pause() {
      frozen = true;
    },
    resume() {
      frozen = false;
      last = performance.now();
    },
    setQuality(q) {
      post.toggle('ao', q !== 'low');
      post.toggle('smaa', q !== 'low');
    },
    toggle: (n, on) => post.toggle(n, on),
    stats: () => ({
      fps: Math.round(fps),
      calls: post.sceneStats.calls,
      triangles: post.sceneStats.triangles,
      programs: renderer.info.programs?.length ?? 0,
      textures: renderer.info.memory.textures,
      geometries: renderer.info.memory.geometries,
    }),
    exposure: (v) => {
      if (v !== undefined) renderer.toneMappingExposure = v;
      return renderer.toneMappingExposure;
    },
    objects: { scene, camera, renderer, terrain, forest, vehicle, skyRig, post, driver, rig },
  };
  window.__READY__ = true;
}

boot().catch((err) => {
  console.error(err);
  const el = document.getElementById('boot-label');
  if (el) el.textContent = `Failed: ${err.message}`;
  window.__ERROR__ = String(err && err.stack ? err.stack : err);
});
