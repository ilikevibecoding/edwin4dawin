import * as THREE from 'three';
import { createCameraRig, VIEWS, VIEW_NAMES } from './camera.js';
import { createDriver } from './drive.js';
import { createWheelDust } from './dust.js';
import { createForest } from './forest.js';
import { PALETTE, SUN } from './palette.js';
import { configureRenderer, createPost } from './post.js';
import { createDustMotes, createLightShafts, createSky } from './sky.js';
import { createTerrain } from './terrain.js';
import { initNoise, noiseBackend } from './textures/core.js';
import { createVehicle } from './vehicle/index.js';
import { setVehicleEnv } from './vehicle/materials.js';
import { createHud } from './hud.js';

// ---------------------------------------------------------------------------
// Boot, main loop, and the debug API the screenshot tool drives.
// ---------------------------------------------------------------------------

const params = new URLSearchParams(location.search);

// Three tiers rather than two. `fast` exists for the software-rendered capture
// harness and is not worth using on a GPU; `ultra` is there to actually load one
// — a discrete card finishes a `high` frame with most of its budget unspent.
const QUALITY_ALIAS = { low: 'fast', fast: 'fast', high: 'high', ultra: 'ultra' };
const quality = QUALITY_ALIAS[params.get('quality')] ?? 'high';
const TIER = {
  fast: { shadowMap: 1024, envSamples: 256, trees: 150, motes: 400, shafts: 8, pixelRatio: 1, corridor: 1 },
  high: { shadowMap: 2048, envSamples: 512, trees: 210, motes: 900, shafts: 14, pixelRatio: 1.5, corridor: 1 },
  ultra: { shadowMap: 4096, envSamples: 1024, trees: 380, motes: 1800, shafts: 22, pixelRatio: 2, corridor: 1.6 },
}[quality];
const TIMES = ['day', 'dusk', 'night'];
const startTime = TIMES.includes(params.get('time')) ? params.get('time') : 'day';

const bootLabel = document.getElementById('boot-label');
const bootBar = document.getElementById('boot-bar');
const step = async (label, pct, fn) => {
  if (bootLabel) bootLabel.textContent = label;
  if (bootBar) bootBar.style.width = `${pct}%`;
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  return fn();
};

async function boot() {
  // Compile the Rust noise kernel before anything asks for a texture. It checks
  // itself against the JS and silently stands down if it disagrees, so this is
  // never load-bearing for correctness — only for boot time.
  await step('Compiling noise kernel', 3, () => initNoise({ enabled: !params.has('nowasm') }));

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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, TIER.pixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);
  configureRenderer(renderer);
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.12, 900);
  camera.position.set(8, 3, 10);

  // --- world ---------------------------------------------------------------
  const skyRig = await step('Building sky', 8, () =>
    createSky(scene, renderer, {
      shadowMapSize: TIER.shadowMap,
      envSamples: TIER.envSamples,
      timeOfDay: startTime,
      quality,
    }),
  );
  const terrain = await step('Grading the road', 24, () => createTerrain({ env: skyRig.env, quality, tier: TIER }));
  scene.add(terrain.mesh);

  // A logging landing where the trail opens out, and the only place direct sun
  // reaches the road. Two overlapping circles rather than one, making a glade
  // stretched along the trail: the beauty views pre-roll a few seconds down the
  // road before they shoot, so the hole in the canopy has to cover where they
  // end up as well as where the drive starts.
  //
  // Both are pushed several metres up-sun of the centreline. A gap centred on
  // the road is only half a gap — at 47 degrees a 24 m tree needs 22 m of
  // clearance, so with the truck anywhere off centre the trees on the sun side
  // are still standing in the light and the clearing lights the verge opposite
  // instead of the trail.
  const sunAz = THREE.MathUtils.degToRad(SUN.azimuth);
  const upSun = { x: Math.sin(sunAz) * 7, z: Math.cos(sunAz) * 7 };
  const landings = [0.42, 0.465].map((t) => {
    const p = terrain.roadPoint(t);
    return { x: p.x + upSun.x, z: p.z + upSun.z, r: 26 };
  });
  const forest = await step('Planting the forest', 52, () =>
    createForest({
      terrain,
      env: skyRig.env,
      treeCount: TIER.trees,
      clearings: landings,
      quality,
    }),
  );
  scene.add(forest.group);

  const vehicle = await step('Assembling the truck', 78, () => createVehicle({ env: skyRig.env }));
  setVehicleEnv(skyRig.env);
  scene.add(vehicle.root);

  const shafts = createLightShafts(skyRig.sunDir, { count: TIER.shafts });
  scene.add(shafts.group);
  const motes = createDustMotes({ count: TIER.motes });
  scene.add(motes.points);
  const wheelDust = createWheelDust();
  scene.add(wheelDust.points);

  const driver = createDriver({ terrain, vehicle });
  const rig = createCameraRig(camera, { vehicle, terrain });
  const hud = createHud();

  const post = await step('Compiling shaders', 92, () => createPost(renderer, scene, camera, { quality }));

  // --- time of day ----------------------------------------------------------
  // The sky owns the look; this only routes the change and keeps the lamps
  // honest, since a scene that boots into night with the headlamps off reads as
  // broken rather than as night.
  let timeOfDay = startTime;
  function setTimeOfDay(name) {
    if (!TIMES.includes(name)) return timeOfDay;
    timeOfDay = name;
    skyRig.setTimeOfDay?.(name, { scene });
    post.setTimeOfDay?.(name);
    vehicle.setLights(name !== 'day');
    hud.setStatus(`${name.charAt(0).toUpperCase()}${name.slice(1)}`);
    return timeOfDay;
  }
  vehicle.setLights(startTime !== 'day');

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
    } else if (e.code === 'KeyN') {
      setTimeOfDay(TIMES[(TIMES.indexOf(timeOfDay) + 1) % TIMES.length]);
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
    // From the cab a drag turns the driver's head; from outside it swings the
    // camera round the truck. Same gesture, and in both cases you are taking
    // hold of the world rather than of the camera.
    if (rig.firstPerson) rig.lookBy(dx, dy);
    else rig.orbitBy(dx, dy);
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
        // Zooming out of the cab would put the camera in the back seat, so from
        // there the wheel steps out to the orbit instead.
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
      rig.update(dt, driver.state);
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
     * Position, heading and speed are reset here but the ride is not, so the
     * pre-roll has to be long enough for the body to forget whatever the
     * previous view left it doing — otherwise the cabin slides through the
     * bottom third of the interior frame between captures and two runs of the
     * same view cannot be compared.
     *
     * It used to be 320 steps, which was five seconds and put the truck out the
     * far side of the clearing. The ride is critically damped now, so 170 steps
     * leaves a transient of about 1e-9 of the initial error — settled by any
     * measure, and still inside the glade.
     */
    setView(name, { preroll = 170, dtStep = 1 / 60, startT = 0.42 } = {}) {
      frozen = true;
      // reset to a known state
      simTime = 0;
      wheelDust.clear();
      driver.state.auto = true;
      driver.resetAuto(startT);
      // A view can ask to be shot from the other road. Every framing in VIEWS is
      // relative to the truck, so the only way to see the mainline is to put the
      // truck on it first.
      const view = VIEWS[name];
      let p;
      let t;
      if (view?.place === 'main' && terrain.mainPoint) {
        const mt = THREE.MathUtils.clamp(terrain.junction.mainT + (view.t ?? 0.06), 0.02, 0.98);
        driver.state.route = 'main';
        driver.state.turned = true;
        driver.state.autoT = mt;
        p = terrain.mainPoint(mt);
        t = terrain.mainTangent(mt);
      } else {
        p = terrain.roadPoint(startT);
        t = terrain.roadTangent(startT);
      }
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
    setTimeOfDay: (name) => setTimeOfDay(name),
    get timeOfDay() {
      return timeOfDay;
    },
    times: TIMES,
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
      quality,
      noise: noiseBackend(),
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
