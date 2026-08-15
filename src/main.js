import * as THREE from 'three';
import { applyView, VIEW_NAMES } from './camera.js';
import { createForest } from './forest.js';
import { createHud } from './hud.js';
import { createInteract } from './interact.js';
import { SUN } from './palette.js';
import { createPlayer } from './player.js';
import { configureRenderer, createPost } from './post.js';
import { createRoad } from './road.js';
import { createSky } from './sky.js';
import { createAtmosphere } from './atmosphere.js';
import { createVehicle } from './vehicle/index.js';

const params = new URLSearchParams(location.search);
const capture = params.has('capture');
const quality = params.get('quality') === 'fast' || capture ? 'fast' : 'high';
const TIER = {
  fast: { shadowMap: 1024, trees: 55, pixelRatio: 1 },
  high: { shadowMap: 2048, trees: 110, pixelRatio: 1.5 },
}[quality];

const bootFill = document.getElementById('boot-fill');
const boot = document.getElementById('boot');

function setBoot(pct) {
  if (bootFill) bootFill.style.width = `${pct}%`;
}

async function yieldFrame() {
  await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
}

async function bootApp() {
  try {
    setBoot(6);
    await yieldFrame();

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      preserveDrawingBuffer: capture,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, TIER.pixelRatio));
    renderer.setSize(window.innerWidth, window.innerHeight);
    configureRenderer(renderer);
    renderer.info.autoReset = false;
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.12, 500);
    camera.position.set(4, 1.7, 7);

    setBoot(18);
    await yieldFrame();
    const sky = createSky(scene, renderer, { shadowMapSize: TIER.shadowMap });

    setBoot(36);
    await yieldFrame();
    const road = createRoad(sky.env);
    scene.add(road.mesh);

    setBoot(52);
    await yieldFrame();
    const forest = createForest(sky.env, { treeCount: TIER.trees });
    scene.add(forest.mesh);

    setBoot(70);
    await yieldFrame();
    const vehicle = createVehicle(sky.env);
    vehicle.root.position.set(0, 0, 0);
    scene.add(vehicle.root);

    const colliders = [...vehicle.colliders, ...forest.colliders];
    const player = createPlayer(camera, colliders, road.heightAt);
    player.attach(renderer.domElement);

    const hud = createHud();
    const interact = createInteract({ player, vehicle, hud });
    const atmosphere = createAtmosphere();
    scene.add(atmosphere.mesh);

    const highlight = new THREE.Mesh(
      new THREE.RingGeometry(0.16, 0.2, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffc070,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    highlight.rotation.x = -Math.PI / 2;
    highlight.visible = false;
    scene.add(highlight);

    const post = createPost(renderer, scene, camera, { fast: quality === 'fast' });

    const clock = new THREE.Clock();
    let paused = capture;
    let frames = 0;
    let fpsAccum = 0;
    let fps = 60;
    const gl = renderer.getContext();

    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      post.setSize(w, h);
    }
    window.addEventListener('resize', resize);

    function tick() {
      renderer.info.reset();
      const raw = clock.getDelta();
      const dt = THREE.MathUtils.clamp(Number.isFinite(raw) && raw > 0 ? raw : 1 / 60, 1e-4, 0.05);
      if (!paused) {
        player.update(dt);
        const hover = interact.update();
        vehicle.update(dt, { speed: 0, steer: 0 });
        atmosphere.update(dt, vehicle.root.position);
        if (hover && hover.point && !player.seated) {
          highlight.visible = true;
          highlight.position.set(hover.point.x, hover.point.y + 0.05, hover.point.z);
          highlight.rotation.z += dt * 1.4;
        } else {
          highlight.visible = false;
        }
      }
      post.render(dt);
      frames++;
      fpsAccum += dt;
      if (fpsAccum > 0.5) {
        fps = frames / fpsAccum;
        frames = 0;
        fpsAccum = 0;
      }
    }

    function loop() {
      requestAnimationFrame(loop);
      tick();
    }

    function renderFrames(n = 1) {
      for (let i = 0; i < n; i++) {
        tick();
        if (gl && gl.finish) gl.finish();
      }
    }

    function captureFrame(n = 2) {
      renderFrames(n);
      return renderer.domElement.toDataURL('image/png');
    }

    function sampleLuma() {
      const canvas = renderer.domElement;
      const w = Math.min(canvas.width, 160);
      const h = Math.min(canvas.height, 90);
      const tmp = document.createElement('canvas');
      tmp.width = w;
      tmp.height = h;
      const ctx = tmp.getContext('2d');
      ctx.drawImage(canvas, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      let sum = 0;
      let max = 0;
      for (let i = 0; i < data.length; i += 4) {
        const y = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
        sum += y;
        if (y > max) max = y;
      }
      return { mean: sum / (data.length / 4), max };
    }

    function stats() {
      const info = renderer.info;
      return {
        fps: Number(fps.toFixed(1)),
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        exposure: SUN.exposure,
      };
    }

    window.debugAPI = {
      setView(name) {
        paused = true;
        return applyView(camera, name);
      },
      listViews: () => VIEW_NAMES.slice(),
      renderFrames,
      captureFrame,
      sampleLuma,
      stats,
      pause() {
        paused = true;
      },
      resume() {
        paused = false;
      },
      fire(id) {
        return interact.fire(id);
      },
      hover() {
        return interact.hover;
      },
      setLights(on) {
        vehicle.setLights(on);
      },
    };

    setBoot(100);
    await yieldFrame();
    if (boot) boot.style.display = 'none';

    if (capture) {
      applyView(camera, 'hero');
      renderFrames(1);
    } else {
      loop();
    }

    window.__READY__ = true;
  } catch (err) {
    console.error(err);
    window.__ERROR__ = String(err && err.stack ? err.stack : err);
  }
}

bootApp();
