import * as THREE from 'three';
import { ShotList } from '../engine/camera.js';
import { starfield } from '../engine/stars.js';
import { ramp, ease, clamp } from '../engine/util.js';
import { CRAWL } from '../story/script.js';

/*
 * Chapter 1: the blue card, the logo receding into the void, and the crawl.
 * All three are canvas-drawn text on planes -- the crawl in particular is just
 * a very tall texture on a plane laid flat and slid away from the camera,
 * which is exactly how the real thing is done.
 */

const YELLOW = '#ffd24a';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function texFromCanvas(c, { transparent = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.premultiplyAlpha = false;
  t.needsUpdate = true;
  return t;
}

function drawTracked(ctx, text, x, y, tracking) {
  if (!tracking) { ctx.fillText(text, x, y); return; }
  const chars = [...text];
  let total = 0;
  for (const ch of chars) total += ctx.measureText(ch).width + tracking;
  total -= tracking;
  let cx = ctx.textAlign === 'center' ? x - total / 2 : x;
  const align = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const ch of chars) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + tracking;
  }
  ctx.textAlign = align;
}

/** "A long time ago in a galaxy far, far away...." */
function buildCard() {
  const W = 2048, H = 512;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#4488dd';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '400 76px CrawlSans, sans-serif';
  drawTracked(g, 'A long time ago in a galaxy', W / 2, H / 2 - 52, 3);
  drawTracked(g, 'far, far away....', W / 2, H / 2 + 58, 3);
  const tex = texFromCanvas(c);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 10),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0 }),
  );
  return mesh;
}

/** The logo: heavy outlined letterforms, drawn once and flown away from camera. */
function buildLogo() {
  const W = 2048, H = 1024;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  const line = (text, y, size, tracking) => {
    g.font = `400 ${size}px TitleGothic, CrawlSans, sans-serif`;
    g.lineJoin = 'round';
    g.lineWidth = size * 0.10;
    g.strokeStyle = '#1a1500';
    const chars = [...text];
    let total = 0;
    for (const ch of chars) total += g.measureText(ch).width + tracking;
    total -= tracking;
    let cx = W / 2 - total / 2;
    for (const ch of chars) {
      g.strokeText(ch, cx + g.measureText(ch).width / 2, y);
      cx += g.measureText(ch).width + tracking;
    }
    const grad = g.createLinearGradient(0, y - size * 0.55, 0, y + size * 0.55);
    grad.addColorStop(0, '#fff0a8');
    grad.addColorStop(0.42, YELLOW);
    grad.addColorStop(1, '#c98f0d');
    g.fillStyle = grad;
    cx = W / 2 - total / 2;
    for (const ch of chars) {
      g.fillText(ch, cx + g.measureText(ch).width / 2, y);
      cx += g.measureText(ch).width + tracking;
    }
  };

  line('STAR', 300, 330, 26);
  line('WARS', 640, 330, 26);
  g.font = '400 84px TitleGothic, CrawlSans, sans-serif';
  g.fillStyle = YELLOW;
  drawTracked(g, 'BRICK-BUILT', W / 2, 872, 26);

  const tex = texFromCanvas(c);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(64, 32),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }),
  );
  return mesh;
}

/** The crawl itself: one very tall canvas, laid flat, sliding toward -Z. */
function buildCrawl() {
  const W = 1300;
  const pad = 70;
  const usable = W - pad * 2;

  // Auto-fit the body type to the longest line so the copy always fills the
  // plate edge to edge without ever being clipped by the frame.
  const probe = makeCanvas(8, 8).getContext('2d');
  let bodySize = 96;
  probe.font = `400 ${bodySize}px CrawlSans, sans-serif`;
  let widest = 0;
  for (const l of CRAWL.body) widest = Math.max(widest, probe.measureText(l).width + l.length * 2);
  if (widest > 0) bodySize = Math.min(96, Math.floor(bodySize * usable / widest));
  const lineH = Math.round(bodySize * 1.5);
  const titleSize = Math.round(bodySize * 3.1);
  const epSize = Math.round(bodySize * 1.3);

  const blocks = [];
  blocks.push({ text: CRAWL.episode.toUpperCase(), size: epSize, gap: 46, tracking: 12 });
  blocks.push({ text: CRAWL.title, size: titleSize, gap: 120, tracking: 14 });
  for (const l of CRAWL.body) blocks.push({ text: l, size: bodySize, gap: 0, tracking: 2, body: true });

  let H = pad * 2;
  for (const b of blocks) H += (b.body ? lineH : b.size * 1.15) + b.gap;
  H = Math.ceil(H / 64) * 64;

  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = YELLOW;

  // Normal top-down order: the plane lies flat with the canvas top pointing
  // away from camera, so the first line read is the one furthest up-screen.
  let y = pad;
  for (const b of blocks) {
    const h = (b.body ? lineH : b.size * 1.15) + b.gap;
    g.font = `${b.body ? 400 : 700} ${b.size}px CrawlSans, sans-serif`;
    if (b.text) drawTracked(g, b.text, W / 2, y + h / 2 - b.gap / 2, b.tracking);
    y += h;
  }

  const planeW = 32;   // widest the plate can be and still fit the frame at
  const planeH = planeW * (H / W);   // the bottom edge of the shot below
  const geo = new THREE.PlaneGeometry(planeW, planeH, 1, 1);
  geo.rotateX(-Math.PI / 2);   // lie flat; texture +V now points to -Z
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    map: texFromCanvas(c), transparent: true, depthWrite: false, toneMapped: false,
    side: THREE.DoubleSide, fog: true,
  }));
  mesh.userData.planeH = planeH;
  mesh.userData.lineWorld = (lineH / W) * planeW;
  return mesh;
}

export default {
  id: 'title',
  dur: 51,
  build(ctx) {
    const root = new THREE.Group();
    const scene = ctx.scene;
    scene.background = new THREE.Color(0x000000);

    const stars = starfield({ count: 2400, radius: 2600, seed: 7, size: 3.0 });
    stars.visible = false;
    root.add(stars);

    const card = buildCard();
    card.position.set(0, 0, -40);
    root.add(card);

    const logo = buildLogo();
    logo.position.set(0, 0, -34);
    logo.visible = false;
    root.add(logo);

    const crawl = buildCrawl();
    crawl.visible = false;
    root.add(crawl);

    // ---- beats, keyed off the narration -------------------------------
    const cardIn = Math.max(0.4, ctx.cue('t1', 1.2) - 0.6);
    const cardOut = ctx.cueEnd('t1', 5) + 1.0;
    const logoIn = cardOut + 0.5;
    const logoOut = logoIn + 7.5;
    const crawlIn = logoIn + 2.2;
    const crawlEnd = ctx.dur - 1.0;

    const shots = new ShotList();
    shots.add({ t: 0, dur: cardOut + 0.5, pos: [0, 0, 0], look: [0, 0, -40], fov: 40 });
    shots.add({
      t: cardOut + 0.5, dur: ctx.dur - cardOut - 0.5, fov: 40,
      pos: [0, 10, 50], look: [0, -1.1, -300],
    });

    // Distance fog is what dissolves the text at the vanishing point, exactly
    // the way the real crawl does it -- baking the fade into the texture would
    // move the fade along with the plate.
    ctx.scene.fog = new THREE.Fog(0x000000, 36, 96);

    // The plate starts with its far edge (the first line) at the bottom of
    // frame and slides away by a bit over its own length.
    const half = crawl.userData.planeH / 2;
    const CRAWL_START_Z = 22 + half;
    const CRAWL_END_Z = CRAWL_START_Z - (crawl.userData.planeH + 30);
    const LOGO_NEAR = 26, LOGO_FAR = 1500;

    return {
      root,
      shots,
      // the crawl is its own subtitle
      subtitlesAt: (t) => t < crawlIn - 0.5,
      grade: { uVignette: 0.34, uGrain: 0.03, uAberration: 0.0008 },
      update(t) {
        // blue card
        const cardA = Math.min(ramp(t, cardIn, cardIn + 1.2), 1 - ramp(t, cardOut - 1.0, cardOut));
        card.material.opacity = cardA;
        card.visible = cardA > 0.002;

        // stars come up as the card leaves
        stars.visible = t > cardOut - 0.6;
        if (stars.visible) {
          stars.userData.material.uniforms.uScale.value = 0.5 + 0.5 * ramp(t, cardOut - 0.6, cardOut + 1.4);
          stars.rotation.y = t * 0.002;
        }

        // logo: punches in huge, then recedes
        const lu = ramp(t, logoIn, logoOut);
        logo.visible = lu > 0 && lu < 1;
        if (logo.visible) {
          // Exponential recession: constant apparent shrink rate, like the real one.
          const z = -LOGO_NEAR * Math.pow(LOGO_FAR / LOGO_NEAR, lu);
          logo.position.set(0, 0.5, z);
          logo.material.opacity = Math.min(1, ramp(t, logoIn, logoIn + 0.3))
            * (1 - ease.inQuad(clamp((lu - 0.75) / 0.25, 0, 1)));
        }

        // crawl
        const cu = ramp(t, crawlIn, crawlEnd);
        crawl.visible = cu > 0;
        if (crawl.visible) {
          crawl.position.z = CRAWL_START_Z + (CRAWL_END_Z - CRAWL_START_Z) * cu;
          crawl.material.opacity = Math.min(1, ramp(t, crawlIn, crawlIn + 1.0));
        }
      },
    };
  },
};
