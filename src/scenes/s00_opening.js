// Sequence 0 -- the opening: blue card, logo, crawl, and the tilt down to the
// planet where the story starts.

import * as THREE from 'three';
import { makeStage } from '../core/film.js';
import { starfield, nebulaSky } from '../worlds/space.js';
import { planet } from '../worlds/planet.js';
import { textCard, logoTexture, crawlTexture } from '../gfx/textures.js';
import { OPENING_CARD, TITLE, CRAWL } from '../data/script.js';
import { cameraQuad, music, sfx } from './kit.js';
import { clamp, smoothstep, lerp, Ease } from '../util/math.js';

const DURATION = 51;
const CARD_IN = 1.2;
const CARD_OUT = 5.6;
const LOGO_IN = 6.4;
const CRAWL_START = 10.4;
const CRAWL_TRAVEL = 36.5;

export default {
  id: 'opening',
  duration: DURATION,
  fadeIn: 1.0,
  fadeOut: 1.0,
  cues: [
    music('mainTitle', LOGO_IN - 0.15, { gain: 1.0 }),
  ],

  build() {
    const { scene, camera } = makeStage({ background: 0x000000, fov: 42, near: 1, far: 40000 });
    scene.add(camera);
    camera.position.set(0, 0, 0);
    camera.lookAt(0, 0, -100);

    scene.add(nebulaSky({ radius: 30000, seed: 91, density: 0.55, hueA: [40, 30, 120], hueB: [110, 40, 90] }));
    const stars = starfield({ count: 3200, radius: 22000, size: 2.4 });
    scene.add(stars);

    // "A long time ago in a galaxy far, far away...."
    const cardTex = textCard({
      w: 2048, h: 256, text: OPENING_CARD,
      font: '400 76px "News Cycle", Arial, sans-serif', color: '#4bd5ff',
    });
    const card = cameraQuad(camera, cardTex, { distance: 10, widthFrac: 0.78, opacity: 0 });

    // The logo, which starts filling the frame and recedes to a point.
    const logoTex = logoTexture({ w: 2048, h: 1024, top: TITLE.main[0], bottom: TITLE.main[1], sub: TITLE.sub });
    const logo = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 0.5),
      new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }),
    );
    logo.renderOrder = 90;
    logo.frustumCulled = false;
    logo.visible = false;
    scene.add(logo);

    // The crawl: a tall plate raked away from the camera. The plate slides
    // along its own up-vector, which is simultaneously "up screen" and "into
    // the distance" -- that is the whole trick.
    const crawlTex = crawlTexture({
      w: 1024, title: CRAWL.title, paragraphs: CRAWL.paragraphs, fontSize: 68, lineGap: 1.4,
    });
    const contentH = crawlTex.userData.contentHeight;

    // Geometry of the crawl, derived rather than eyeballed.
    //   rake    how far the plate is laid back from vertical
    //   height  how far the camera floats above the plate
    // Because the plate recedes almost along the view axis, its vertical extent
    // is foreshortened by roughly h/D -- which is why the text plate has to be
    // several times taller than it is wide for the lines to arrive one at a
    // time instead of all at once.
    const rake = -1.28;
    const height = 200;
    const up = new THREE.Vector3(0, Math.cos(rake), Math.sin(rake));
    const normal = new THREE.Vector3(0, -Math.sin(rake), Math.cos(rake));
    const planeW = height * 2.05;
    const planeH = planeW * (crawlTex.userData.pixelHeight / 1024);
    const crawl = new THREE.Mesh(
      new THREE.PlaneGeometry(planeW, planeH),
      new THREE.MeshBasicMaterial({ map: crawlTex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }),
    );
    crawl.renderOrder = 80;
    crawl.frustumCulled = false;
    crawl.rotation.x = rake;
    crawl.visible = false;
    scene.add(crawl);
    const yTop = planeH * 0.5;
    const yBottom = yTop - contentH * planeH;
    // A plate point is on the bottom edge of frame at k = 1.295h and has shrunk
    // to ~40% of entry size by k = 3.6h, which is where the text fades out.
    const K_ENTER = 1.295 * height;
    const K_EXIT = 3.7 * height;
    const slideStart = K_ENTER - yTop;      // first line just entering
    const slideEnd = K_EXIT - yBottom;      // last line on its way out
    const crawlBase = normal.clone().multiplyScalar(-height);

    // The planet we tilt down to at the end of the crawl: Tessaru, seen from
    // high orbit with its terminator running across the frame.
    const tessaru = planet({ radius: 9000, seed: 21, sunDir: [0.7, 0.25, 0.7], atmosphere: 0x8ec4ff, segments: 48 });
    tessaru.position.set(1200, -10400, -9000);
    scene.add(tessaru);
    const sun = new THREE.DirectionalLight(0xfff2dc, 3.0);
    sun.position.set(9000, 3000, 6000);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0x1b2432, 1.0));

    let subtitle = '';

    return {
      scene,
      camera,
      bloom: 0.5,
      get subtitle() { return subtitle; },

      update(t) {
        // --- opening card ---
        const cardA = smoothstep(CARD_IN, CARD_IN + 1.4, t) * (1 - smoothstep(CARD_OUT - 0.1, CARD_OUT + 1.1, t));
        card.material.opacity = cardA;
        card.visible = cardA > 0.003;

        // --- logo: enormous, then away to nothing ---
        const lt = (t - LOGO_IN) / 5.6;
        if (lt >= -0.02 && lt <= 1.25) {
          logo.visible = true;
          // Recede along -Z with a slow-out so it hangs for a beat first.
          const e = Ease.inQuad(clamp(lt));
          const z = lerp(-12, -1500, e);
          logo.position.set(0, 0, z);
          const scale = -z * 1.42;   // hold the same screen size ratio at z=-12
          logo.scale.set(scale, scale, 1);
          logo.material.opacity = clamp(smoothstep(0, 0.12, lt)) * (1 - smoothstep(0.86, 1.16, lt));
        } else {
          logo.visible = false;
        }

        // --- crawl ---
        const ct = t - CRAWL_START;
        if (ct >= -0.2 && ct < CRAWL_TRAVEL + 4) {
          crawl.visible = true;
          const u = clamp(ct / CRAWL_TRAVEL);
          const slide = lerp(slideStart, slideEnd, u);
          crawl.position.copy(up).multiplyScalar(slide).add(crawlBase);
          crawl.material.opacity = smoothstep(-0.2, 0.5, ct) * (1 - smoothstep(CRAWL_TRAVEL - 3, CRAWL_TRAVEL + 1.5, ct));
        } else {
          crawl.visible = false;
        }

        // --- slow drift, then tilt down toward the planet ---
        const tilt = smoothstep(DURATION - 6.5, DURATION - 0.6, t);
        camera.rotation.set(-tilt * 0.42, 0, 0);
        stars.rotation.z = t * 0.0012;
      },

      dispose() {
        camera.remove(card);
      },
    };
  },
};
