import * as THREE from 'three';
import { ShotList } from '../engine/camera.js';
import { starfield } from '../engine/stars.js';
import { RNG } from '../engine/rng.js';
import { ramp, ease, lerp, DEG } from '../engine/util.js';
import { CRAWL } from '../story/script.js';

/*
 * Chapter 1: the blue card, the logo receding into the void, the crawl, and a
 * tilt down onto the world the next chapter opens above.
 *
 * All the type is canvas-drawn on planes -- the crawl in particular is two very
 * tall textures laid flat and slid away from the camera, which is exactly how
 * the real thing is done. One camera holds the whole chapter so the card, the
 * logo and the crawl all share a vanishing point.
 */

const YELLOW = '#ffd24a';

// The crawl framing. Plate width, type size on screen and the fog distances all
// fall out of these: the plate is built exactly as wide as the frame is at its
// bottom edge, so the copy enters at full width and full size.
const FOV = 46;
const PITCH = 12 * DEG;      // camera tilt; puts the vanishing point ~3/4 up frame
const CAM_Y = 10;            // camera height above the plate
const CAM_Z = 34;
const PLANET_PITCH = 58 * DEG;
const PLATE_PX = 1300;       // canvas width of a crawl plate
const PLATE_PAD = 40;
const SUN = new THREE.Vector3(0.86, 0.26, 0.44).normalize();   // grazing, for a terminator

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function texFromCanvas(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 16;   // the crawl is seen at a very shallow angle
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

/** A point `d` units down the camera axis, where cards sit square to lens. */
const onAxis = (d) => [0, CAM_Y - Math.sin(PITCH) * d, CAM_Z - Math.cos(PITCH) * d];

/**
 * `width`: the world width that exactly spans the frame where the plate meets
 * the bottom edge. `enterZ`: where that edge crosses the plate plane -- the
 * line every crawl cue is timed against.
 */
function framing(aspect) {
  const halfV = (FOV * DEG) / 2;
  const phi = PITCH + halfV;   // depression angle at the bottom of frame
  return {
    width: (2 * CAM_Y * Math.cos(halfV) * Math.tan(halfV) * aspect) / Math.sin(phi),
    enterZ: CAM_Z - CAM_Y / Math.tan(phi),
  };
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
  g.font = '400 92px CrawlSans, sans-serif';
  drawTracked(g, 'A long time ago in a galaxy', W / 2, H / 2 - 62, 4);
  drawTracked(g, 'far, far away....', W / 2, H / 2 + 70, 4);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 15),
    new THREE.MeshBasicMaterial({
      map: texFromCanvas(c), transparent: true, depthWrite: false,
      toneMapped: false, fog: false, opacity: 0,
    }),
  );
  mesh.position.set(...onAxis(45));
  mesh.rotation.x = -PITCH;
  return mesh;
}

/** The logo: heavy outlined letterforms, drawn once and flown away from camera. */
function buildLogo() {
  const W = 2048, H = 1152;
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

  line('STAR', 330, 450, 34);
  line('WARS', 790, 450, 34);
  g.font = '400 96px TitleGothic, CrawlSans, sans-serif';
  g.fillStyle = YELLOW;
  drawTracked(g, 'BRICK-BUILT', W / 2, 1046, 30);

  return new THREE.Mesh(
    new THREE.PlaneGeometry(64, 36),
    new THREE.MeshBasicMaterial({
      map: texFromCanvas(c), transparent: true, depthWrite: false,
      toneMapped: false, fog: false,
    }),
  );
}

/**
 * A crawl plate: rows of type down a tall canvas, laid flat in the XZ plane
 * with the first row furthest from camera. Rows keep their canvas offset so the
 * schedule can drop any line exactly onto the bottom edge of frame.
 */
function buildPlate(rows, worldW) {
  let y = PLATE_PAD;
  for (const r of rows) { r.y = y; y += r.lead; }
  const H = Math.ceil((y + PLATE_PAD) / 64) * 64;

  const c = makeCanvas(PLATE_PX, H);
  const g = c.getContext('2d');
  g.clearRect(0, 0, PLATE_PX, H);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = YELLOW;
  for (const r of rows) {
    if (!r.text) continue;
    g.font = `${r.weight || 400} ${r.size}px CrawlSans, sans-serif`;
    drawTracked(g, r.text, PLATE_PX / 2, r.y + r.size * 0.5, r.tracking);
  }

  const planeH = (worldW * H) / PLATE_PX;
  const geo = new THREE.PlaneGeometry(worldW, planeH, 1, 1);
  geo.rotateX(-Math.PI / 2);   // lie flat; texture +V now points to -Z
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    map: texFromCanvas(c), transparent: true, depthWrite: false, toneMapped: false,
    side: THREE.DoubleSide, fog: true,
  }));
  mesh.userData.height = H;
  /** Slide the plate so canvas row `y` sits on world Z `z`. */
  mesh.userData.place = (yPx, z) => { mesh.position.z = z + planeH * (0.5 - yPx / H); };
  return mesh;
}

/** Dry, banded desert world -- the one chapter 2 opens above. */
function planetTexture(seed) {
  const W = 1024, H = 512;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const rng = new RNG(seed);
  const bands = g.createLinearGradient(0, 0, 0, H);
  bands.addColorStop(0.00, '#e2d3b0');
  bands.addColorStop(0.13, '#c39c60');
  bands.addColorStop(0.40, '#a97539');
  bands.addColorStop(0.56, '#94642d');
  bands.addColorStop(0.82, '#b8854a');
  bands.addColorStop(1.00, '#e2d3b0');
  g.fillStyle = bands;
  g.fillRect(0, 0, W, H);

  // Dry seas first, then dunes and craters over them. Every blot is drawn three
  // times so nothing breaks at the seam where the map wraps.
  const blots = (n, rMin, rMax, aMax, squash, colors) => {
    for (let i = 0; i < n; i++) {
      const x = rng.range(0, W), y = rng.range(0, H);
      const rx = rng.range(rMin, rMax);
      const ry = rx * rng.range(squash * 0.5, squash);
      g.globalAlpha = rng.range(0.03, aMax);
      g.fillStyle = rng.pick(colors);
      for (const dx of [-W, 0, W]) {
        g.beginPath();
        g.ellipse(x + dx, y, rx, ry, rng.range(-0.25, 0.25), 0, Math.PI * 2);
        g.fill();
      }
    }
  };
  blots(70, 55, 165, 0.10, 0.30, ['#6b4520', '#7d5228']);
  blots(520, 10, 70, 0.07, 0.28, ['#6b4520', '#e4cb9c', '#a06d33', '#d8b070']);
  blots(420, 2, 9, 0.13, 0.9, ['#5c3a1b', '#f0dcb4']);
  g.globalAlpha = 1;
  return texFromCanvas(c);
}

function buildPlanet(radius, seed, { air = true, tint = 0xffffff } = {}) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(radius, 64, 44),
    new THREE.MeshStandardMaterial({
      map: planetTexture(seed), color: tint, roughness: 1, metalness: 0, fog: false,
    }),
  ));
  // Back-facing shell: only its limb survives the depth test, which is exactly
  // the sliver of atmosphere we want.
  if (air) group.add(new THREE.Mesh(
    new THREE.SphereGeometry(radius * 1.03, 48, 32),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uSun: { value: SUN.clone() }, uColor: { value: new THREE.Color(0x8fb6f2) } },
      vertexShader: /* glsl */`
        varying vec3 vN; varying vec3 vV;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vN = normalize(mat3(modelMatrix) * normal);
          vV = normalize(cameraPosition - world.xyz);
          gl_Position = projectionMatrix * viewMatrix * world;
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uSun; uniform vec3 uColor;
        varying vec3 vN; varying vec3 vV;
        void main() {
          // Haze is densest where the shell grazes the planet's edge and thins
          // to nothing at its own silhouette, so the ring has no hard rim.
          float d = abs(dot(normalize(vN), normalize(vV)));
          float haze = pow(smoothstep(0.0, 0.235, d), 1.5);
          float lit = max(0.0, dot(normalize(vN), uSun));
          gl_FragColor = vec4(uColor * haze * pow(lit, 0.8) * 0.85, 1.0);
        }`,
    }),
  ));
  return group;
}

/** Piecewise-linear schedule through [time, value] keys; extrapolates past both ends. */
function track(keys, t) {
  let i = 0;
  while (i < keys.length - 2 && t >= keys[i + 1][0]) i++;
  const [t0, v0] = keys[i];
  const [t1, v1] = keys[i + 1];
  return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
}

export default {
  id: 'title',
  dur: 51,
  build(ctx) {
    const root = new THREE.Group();
    ctx.scene.background = new THREE.Color(0x000000);

    const { width: plateW, enterZ } = framing(ctx.width / ctx.height);

    const stars = starfield({ count: 2400, radius: 2600, seed: 7, size: 3.0 });
    stars.visible = false;
    root.add(stars);

    const card = buildCard();
    root.add(card);

    const logo = buildLogo();
    logo.rotation.x = -PITCH;
    logo.visible = false;
    root.add(logo);

    // ---- crawl type ----------------------------------------------------
    // The body is set to whichever line is widest, so the copy always runs the
    // full width of the plate -- and the plate is the width of the frame.
    const usable = PLATE_PX - PLATE_PAD * 2;
    const probe = makeCanvas(8, 8).getContext('2d');
    const fitTo = (text, weight, tracking) => {
      probe.font = `${weight} 100px CrawlSans, sans-serif`;
      const w = probe.measureText(text).width;
      return Math.floor((100 * (usable - text.length * tracking)) / Math.max(1, w));
    };

    probe.font = '400 100px CrawlSans, sans-serif';
    let widest = CRAWL.body[0];
    for (const l of CRAWL.body) {
      if (probe.measureText(l).width > probe.measureText(widest).width) widest = l;
    }
    const bodySize = fitTo(widest, 400, 2);
    const lead = Math.round(bodySize * 1.38);

    const bodyRows = CRAWL.body.map((text) => ({ text, size: bodySize, lead, tracking: 2 }));
    const body = buildPlate(bodyRows, plateW);
    body.visible = false;
    root.add(body);

    const titleSize = fitTo(CRAWL.title, 700, 16);
    const title = buildPlate([
      { text: CRAWL.episode.toUpperCase(), size: Math.round(bodySize * 1.15), lead: Math.round(bodySize * 1.9), tracking: 16 },
      { text: CRAWL.title, size: titleSize, lead: Math.round(titleSize * 1.25), tracking: 16, weight: 700 },
    ], plateW);
    title.visible = false;
    root.add(title);

    // ---- the world the crawl tilts onto --------------------------------
    const planet = buildPlanet(120, 4711);
    planet.position.set(-16, CAM_Y - 430 * Math.sin(68 * DEG), CAM_Z - 430 * Math.cos(68 * DEG));
    // Lay the poles over: the camera looks down on this from almost straight
    // above, and a map's poles are where all its distortion collects.
    planet.rotation.x = -PLANET_PITCH;
    root.add(planet);

    const moon = buildPlanet(17, 91, { air: false, tint: 0xd6cdbb });
    moon.position.set(-150, CAM_Y - 620 * Math.sin(47 * DEG), CAM_Z - 620 * Math.cos(47 * DEG));
    moon.rotation.x = -PLANET_PITCH;
    root.add(moon);

    const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
    sun.position.copy(SUN).multiplyScalar(1200);
    root.add(sun);
    root.add(new THREE.AmbientLight(0x16233f, 0.6));

    // ---- beats, keyed off the narration --------------------------------
    const cardIn = Math.max(0.3, ctx.cue('t1', 1.2) - 0.9);
    const cardOut = ctx.cueEnd('t1', 5) + 1.5;
    const logoIn = cardOut;
    const logoOut = logoIn + 4.9;

    // The title rides in on the crawl plane, then flies off ahead of the body:
    // one steady plate cannot both hold "A NEW HOPE" long enough to read and be
    // clear of frame before the first paragraph is narrated.
    const titleIn = cardOut + 0.4;
    const titlePass = ctx.cue('t3', 11.8) - 1.6;
    const titleGone = titlePass + 5.2;

    // Each paragraph reaches the bottom edge just before its line is spoken.
    const starts = [];
    CRAWL.body.forEach((l, i) => { if (l && (i === 0 || !CRAWL.body[i - 1])) starts.push(i); });
    const keys = [
      [ctx.cue('t3', 11.8) - 0.5, bodyRows[starts[0]].y],
      [ctx.cue('t4', 22.7) - 0.9, bodyRows[starts[1]].y],
      [ctx.cue('t5', 33.0) - 0.9, bodyRows[starts[2]].y],
      [ctx.cueEnd('t5', 40.7) - 1.1, bodyRows[bodyRows.length - 1].y],
    ];

    const outro = ctx.cueEnd('t5', 40.7) + 2.2;

    const shots = new ShotList();
    shots.add({ t: 0, dur: outro, fov: FOV, pos: [0, CAM_Y, CAM_Z], look: onAxis(400) });
    shots.add({
      t: outro, dur: ctx.dur - outro, fov: FOV,
      // The look target stays put while the eye drifts, which keeps the tilt
      // exact and still gives the held frame a little parallax.
      pos: [0, CAM_Y, CAM_Z], to: [7, CAM_Y + 2, CAM_Z - 3],
      look: (u) => {
        const p = lerp(PITCH, PLANET_PITCH, ease.inOutCubic(Math.min(1, u / 0.46)));
        return [0, CAM_Y - Math.sin(p) * 400, CAM_Z - Math.cos(p) * 400];
      },
    });

    // Distance fog is what dissolves the text at the vanishing point, exactly
    // the way the real crawl does it -- baking the fade into the texture would
    // move the fade along with the plate.
    ctx.scene.fog = new THREE.Fog(0x000000, 32, 74);

    const LOGO_NEAR = 54, LOGO_FAR = 1600;

    return {
      root,
      shots,
      exposure: 1.6,
      // The card and the crawl are their own subtitles; the HUD would only
      // repeat them.
      subtitlesAt: () => false,
      grade: { uVignette: 0.34, uGrain: 0.03, uAberration: 0.0008 },
      update(t) {
        // blue card
        const cardA = Math.min(ramp(t, cardIn, cardIn + 1.2), 1 - ramp(t, cardOut - 1.0, cardOut));
        card.material.opacity = cardA;
        card.visible = cardA > 0.002;

        // stars come up as the card leaves
        stars.visible = t > cardOut - 1.6;
        if (stars.visible) {
          stars.userData.material.uniforms.uScale.value = 0.5 + 0.5 * ramp(t, cardOut - 1.6, cardOut + 1.0);
          stars.rotation.y = t * 0.002;
        }

        // logo: punches in huge, then recedes down the camera axis
        const lu = ramp(t, logoIn, logoOut);
        logo.visible = lu > 0 && lu < 1;
        if (logo.visible) {
          // Exponential recession: constant apparent shrink rate, like the real one.
          logo.position.set(...onAxis(LOGO_NEAR * Math.pow(LOGO_FAR / LOGO_NEAR, lu)));
          logo.material.opacity = Math.min(1, ramp(t, logoIn, logoIn + 0.35))
            * (1 - ease.inQuad(ramp(t, logoOut - 1.5, logoOut)));
        }

        // title plate: crawls in, then accelerates past the vanishing point
        title.material.opacity = 1 - ramp(t, titleGone - 1.8, titleGone);
        title.visible = t > titleIn - 0.1 && title.material.opacity > 0.002;
        if (title.visible) {
          const fly = ease.inQuad(ramp(t, titlePass, titleGone));
          title.userData.place(ramp(t, titleIn, titlePass) * title.userData.height, enterZ - fly * 110);
        }

        // body: steady, and always a beat ahead of the voice
        body.visible = t > titleIn;
        if (body.visible) body.userData.place(track(keys, t), enterZ);

        planet.rotation.y = 0.7 + t * 0.005;
        moon.rotation.y = t * 0.01;
      },
    };
  },
};
