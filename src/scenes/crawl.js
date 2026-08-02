/**
 * Scene 0 — the opening.
 *
 *   0.0  a quiet blue card over starfield
 *   6.5  the logo hits with the fanfare and recedes to a point
 *  11.5  the crawl climbs away toward the vanishing point
 *  36.5  the camera tilts down off the crawl onto a planet, handing over to the chase
 */
import * as THREE from 'three';
import { rng } from '../lego/bricks.js';

export const id = 'crawl';

const CARD = 'A long time ago, in a galaxy far, far away\u2026';

const CRAWL_TEXT = [
  ['title', 'EPISODE BRICK'],
  ['title2', 'A NEW SPARK'],
  ['gap', ''],
  ['body', 'It is a time of rebellion. Imperial fleets'],
  ['body', 'patrol every hyperlane, and the last free'],
  ['body', 'worlds are running out of places to hide.'],
  ['gap', ''],
  ['body', 'Aboard a stolen corvette, a rebel princess'],
  ['body', 'carries the plans to the Empire\u2019s armoured'],
  ['body', 'moon \u2014 a fortress with power enough to'],
  ['body', 'shatter a whole planet.'],
  ['gap', ''],
  ['body', 'Pursued by the flagship of the dark lord,'],
  ['body', 'she runs for home, hunted across the'],
  ['body', 'stars\u2026.'],
];

function crawlTexture() {
  const W = 1280, H = 2400;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  // shrink the type until the longest line fits the safe width, so nothing
  // ever runs off the side of the frame
  const FIT = W * 0.86;
  let size = 76;
  for (let i = 0; i < 24; i++) {
    g.font = `700 ${size}px "Trebuchet MS", Helvetica, Arial, sans-serif`;
    const widest = Math.max(...CRAWL_TEXT.filter((l) => l[0] === 'body').map((l) => g.measureText(l[1]).width));
    if (widest <= FIT) break;
    size -= 2;
  }

  let y = 250;
  for (const [kind, text] of CRAWL_TEXT) {
    if (kind === 'gap') { y += size * 1.25; continue; }
    if (kind === 'title') {
      g.font = `700 ${Math.round(size * 1.2)}px "Trebuchet MS", Helvetica, Arial, sans-serif`;
      g.fillStyle = '#ffe81f';
      g.fillText(text, W / 2, y);
      y += size * 1.72;
    } else if (kind === 'title2') {
      g.font = `800 ${Math.round(size * 1.55)}px "Trebuchet MS", Helvetica, Arial, sans-serif`;
      g.fillStyle = '#ffe81f';
      g.fillText(text, W / 2, y);
      y += size * 2.6;
    } else {
      g.font = `700 ${size}px "Trebuchet MS", Helvetica, Arial, sans-serif`;
      g.fillStyle = '#ffe81f';
      g.fillText(text, W / 2, y);
      y += size * 1.37;
    }
  }

  // dissolve the far end so the text melts into the vanishing point
  const grad = g.createLinearGradient(0, 0, 0, H * 0.42);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.55)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H * 0.42);
  g.globalCompositeOperation = 'source-over';

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}

function logoTexture() {
  const W = 2048, H = 1024;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  g.font = '800 300px "Trebuchet MS", Helvetica, Arial, sans-serif';
  const grad = g.createLinearGradient(0, 260, 0, 700);
  grad.addColorStop(0, '#fff6a8');
  grad.addColorStop(0.45, '#ffe81f');
  grad.addColorStop(1, '#d9a800');
  g.fillStyle = grad;
  g.strokeStyle = '#8a6a00';
  g.lineWidth = 10;
  g.fillText('STAR', W / 2, 360);
  g.strokeText('STAR', W / 2, 360);
  g.fillText('WARS', W / 2, 660);
  g.strokeText('WARS', W / 2, 660);

  g.font = '700 92px "Trebuchet MS", Helvetica, Arial, sans-serif';
  g.fillStyle = '#e9eef4';
  g.fillText('L E G O', W / 2, 130);
  g.font = '600 62px "Trebuchet MS", Helvetica, Arial, sans-serif';
  g.fillStyle = '#cfd8e2';
  g.fillText('A   N E W   S P A R K', W / 2, 850);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}

function cardTexture(text) {
  const W = 2048, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '600 76px "Trebuchet MS", Helvetica, Arial, sans-serif';
  g.fillStyle = '#4bd5ff';
  g.fillText(text, W / 2, H / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 16;
  return tex;
}

export async function build(ctx) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // starfield
  const r = rng(9137);
  const N = 5200;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const c1 = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const v = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, -r() * 0.9 - 0.1).normalize().multiplyScalar(600 + r() * 900);
    pos.set([v.x, v.y, v.z], i * 3);
    const warm = r();
    c1.setHSL(warm < 0.7 ? 0.58 : 0.09, 0.25 + r() * 0.3, 0.65 + r() * 0.35);
    col.set([c1.r, c1.g, c1.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(geo, new THREE.PointsMaterial({ size: 2.6, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite: false }));
  scene.add(stars);

  // "a long time ago" card
  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 11.5),
    new THREE.MeshBasicMaterial({ map: cardTexture(CARD), transparent: true, depthWrite: false, opacity: 0 })
  );
  card.position.set(0, 0, -40);
  scene.add(card);

  // logo
  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 60),
    new THREE.MeshBasicMaterial({ map: logoTexture(), transparent: true, depthWrite: false, opacity: 0 })
  );
  logo.position.set(0, 0, -70);
  scene.add(logo);

  // crawl
  const holder = new THREE.Group();
  holder.rotation.x = -1.255;
  holder.position.set(0, -17, -54);
  scene.add(holder);
  const crawl = new THREE.Mesh(
    new THREE.PlaneGeometry(72, 135),
    new THREE.MeshBasicMaterial({ map: crawlTexture(), transparent: true, depthWrite: false, opacity: 0 })
  );
  crawl.position.y = -82;
  holder.add(crawl);

  // the planet the camera tilts down onto at the end
  const planetGeo = new THREE.SphereGeometry(150, 48, 32);
  const pc = document.createElement('canvas');
  pc.width = 512; pc.height = 256;
  const pg = pc.getContext('2d');
  const pr = rng(4242);
  pg.fillStyle = '#c9a06a';
  pg.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 900; i++) {
    const y = pr() * 256;
    pg.fillStyle = `rgba(${150 + pr() * 70 | 0},${110 + pr() * 60 | 0},${60 + pr() * 50 | 0},0.5)`;
    pg.fillRect(pr() * 512, y, 20 + pr() * 90, 1 + pr() * 4);
  }
  const ptex = new THREE.CanvasTexture(pc);
  ptex.colorSpace = THREE.SRGBColorSpace;
  const planet = new THREE.Mesh(planetGeo, new THREE.MeshStandardMaterial({ map: ptex, roughness: 1 }));
  planet.position.set(26, -300, -300);
  scene.add(planet);
  const sun = new THREE.DirectionalLight(0xfff0d0, 3.0);
  sun.position.set(200, 120, 60);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x223044, 0.6));

  const camera = { fov: 42 };

  return {
    scene,
    cues: [
      { t: 6.4, sfx: 'rumbleSub', opts: { dur: 3.2, gain: 0.5 } },
      { t: 36.8, sfx: 'engineWhoosh', opts: { gain: 0.35 } },
    ],
    update(t, c) {
      const cam = c.camera;

      // card: fade in, hold, fade out
      card.material.opacity = t < 1.0 ? t : t < 5.0 ? 1 : t < 6.4 ? Math.max(0, 1 - (t - 5.0) / 1.4) : 0;

      // logo: punch in at 6.5 then recede
      if (t >= 6.4 && t < 12.6) {
        const k = (t - 6.4) / 6.2;
        logo.material.opacity = k < 0.03 ? k / 0.03 : 1;
        const z = -38 - Math.pow(k, 0.72) * 720;
        logo.position.z = z;
        if (k > 0.86) logo.material.opacity = Math.max(0, 1 - (k - 0.86) / 0.14);
      } else {
        logo.material.opacity = 0;
      }

      // crawl: starts as the logo leaves, climbs away for the rest of the scene
      if (t >= 9.2) {
        const k = (t - 9.2) / 27.5;
        crawl.material.opacity = Math.min(1, (t - 9.2) / 1.1);
        crawl.position.y = -82 + k * 186;
      } else {
        crawl.material.opacity = 0;
      }

      // camera: locked off, then tilts down onto the planet for the handoff
      const tilt = t < 36.0 ? 0 : Math.min(1, (t - 36.0) / 4.6);
      const e = tilt * tilt * (3 - 2 * tilt);
      cam.position.set(0, 0, 0);
      cam.up.set(0, 1, 0);
      cam.lookAt(0, 4 - e * 78, -100);
      cam.fov = 42 - e * 4;
      cam.updateProjectionMatrix();

      stars.rotation.z = t * 0.0015;
      planet.rotation.y = t * 0.006;
    },
  };
}
