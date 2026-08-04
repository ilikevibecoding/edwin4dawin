import * as THREE from 'three';

/**
 * Every texture in the scene is painted at runtime on a 2D canvas, which keeps
 * the whole thing to a single file with no image downloads.
 */

/** Small deterministic PRNG so the ship looks identical on every load. */
function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function canvas(width, height) {
  const element = document.createElement('canvas');
  element.width = width;
  element.height = height;
  return { element, ctx: element.getContext('2d') };
}

function toTexture(element, { repeat = [1, 1], srgb = true, anisotropy = 8 } = {}) {
  const texture = new THREE.CanvasTexture(element);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = anisotropy;
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function grain(ctx, width, height, random, amount, alpha) {
  for (let i = 0; i < amount; i++) {
    const x = random() * width;
    const y = random() * height;
    const length = 12 + random() * 90;
    ctx.strokeStyle = `rgba(${random() < 0.5 ? '30,18,8' : '190,160,120'},${alpha * random()})`;
    ctx.lineWidth = 0.5 + random() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + length * 0.4, y + random() * 3 - 1.5, x + length * 0.7, y + random() * 3 - 1.5, x + length, y);
    ctx.stroke();
  }
}

/** Planking that runs along the U axis, used for the deck and the hull. */
function plankPanel({ size = 1024, planks = 16, shades, seed = 7, seamAlpha = 0.55, butts = true }) {
  const { element, ctx } = canvas(size, size);
  const random = rng(seed);
  const rowHeight = size / planks;

  for (let row = 0; row < planks; row++) {
    const y = row * rowHeight;
    ctx.fillStyle = shades[Math.floor(random() * shades.length)];
    ctx.fillRect(0, y, size, rowHeight + 1);

    // Subtle shading across the plank so it does not read as a flat stripe.
    const shade = ctx.createLinearGradient(0, y, 0, y + rowHeight);
    shade.addColorStop(0, 'rgba(255,240,215,0.05)');
    shade.addColorStop(0.5, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.14)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, y, size, rowHeight);

    // Butt joints break the planks into believable lengths.
    if (butts) {
      const segments = 2 + Math.floor(random() * 2);
      for (let s = 1; s <= segments; s++) {
        const x = (s / segments) * size + (random() - 0.5) * size * 0.28;
        ctx.fillStyle = `rgba(20,12,6,${seamAlpha * 0.5})`;
        ctx.fillRect(x, y + 1.5, 1.6, rowHeight - 3);
      }
    }

    ctx.fillStyle = `rgba(18,10,4,${seamAlpha})`;
    ctx.fillRect(0, y, size, 2);
    ctx.fillStyle = 'rgba(255,240,215,0.06)';
    ctx.fillRect(0, y + 2.5, size, 1.2);

    // Nail heads.
    for (let n = 0; n < 6; n++) {
      ctx.fillStyle = 'rgba(35,28,22,0.45)';
      ctx.beginPath();
      ctx.arc(random() * size, y + rowHeight * (0.25 + random() * 0.5), 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  grain(ctx, size, size, random, 900, 0.16);

  // A few knots.
  for (let k = 0; k < 14; k++) {
    const x = random() * size;
    const y = random() * size;
    const r = 3 + random() * 7;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, 'rgba(48,30,14,0.85)');
    gradient.addColorStop(1, 'rgba(48,30,14,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return { element, ctx, random };
}

export function deckTexture() {
  const { element } = plankPanel({
    size: 1024,
    planks: 22,
    seed: 21,
    shades: ['#a8804d', '#9c7444', '#b28a56', '#966e40', '#ab8350', '#8f6a3d'],
  });
  return toTexture(element, { repeat: [1, 6] });
}

/**
 * Hull side: dark below the waterline, warm planking above, ochre sheer stripe
 * and a black cap rail. V runs from the keel (0) to the rail (1).
 */
export function hullTexture() {
  const size = 1024;
  const { element, ctx } = plankPanel({
    size,
    planks: 26,
    seed: 42,
    seamAlpha: 0.42,
    butts: false, // long strakes read better than a brick pattern
    shades: ['#5b3b21', '#65431f', '#553520', '#6b4a26', '#4f3119', '#5e401f'],
  });
  const random = rng(99);

  const band = (from, to, color, alpha = 1) => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    // V=0 is the bottom of the canvas once the texture is flipped by three.js.
    ctx.fillRect(0, size * (1 - to), size, size * (to - from));
    ctx.globalAlpha = 1;
  };

  band(0.0, 0.34, '#6d2b23', 0.92); // antifouling red below the waterline
  band(0.34, 0.4, '#171310', 0.9); // boot stripe
  band(0.86, 0.93, '#c8923a', 0.94); // gilded sheer stripe
  band(0.93, 1.0, '#1b1512', 0.92); // cap rail

  // Weathering streaks and salt bloom over everything.
  for (let i = 0; i < 220; i++) {
    const x = random() * size;
    const y = random() * size;
    ctx.strokeStyle = `rgba(${random() < 0.6 ? '20,16,12' : '210,215,215'},${0.03 + random() * 0.07})`;
    ctx.lineWidth = 1 + random() * 6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (random() - 0.5) * 10, y + 20 + random() * 90);
    ctx.stroke();
  }

  return toTexture(element, { repeat: [3, 1] });
}

export function sailTexture() {
  const size = 512;
  const { element, ctx } = canvas(size, size);
  const random = rng(5);

  ctx.fillStyle = '#e7ddc6';
  ctx.fillRect(0, 0, size, size);

  // Woven panels stitched together vertically.
  for (let i = 0; i <= 8; i++) {
    const x = (i / 8) * size;
    ctx.strokeStyle = 'rgba(150,135,105,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,245,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 3, 0);
    ctx.lineTo(x + 3, size);
    ctx.stroke();
  }

  // Weave and age.
  for (let i = 0; i < 5000; i++) {
    ctx.fillStyle = `rgba(${random() < 0.5 ? '120,105,80' : '255,252,240'},${random() * 0.12})`;
    ctx.fillRect(random() * size, random() * size, 2, 1);
  }
  for (let i = 0; i < 40; i++) {
    const x = random() * size;
    const y = random() * size;
    const r = 15 + random() * 70;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, `rgba(150,130,95,${0.05 + random() * 0.09})`);
    gradient.addColorStop(1, 'rgba(150,130,95,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Reef points: little rope stubs in rows across the sail.
  for (let row = 1; row <= 2; row++) {
    const y = size * (0.32 * row);
    for (let x = 20; x < size; x += 34) {
      ctx.strokeStyle = 'rgba(120,100,70,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 2, y + 9);
      ctx.stroke();
    }
  }

  return toTexture(element);
}

/** Jolly Roger: skull over crossed bones, drawn with paths. */
export function flagTexture() {
  const width = 512;
  const height = 320;
  const { element, ctx } = canvas(width, height);
  const random = rng(3);

  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = `rgba(255,255,255,${random() * 0.035})`;
    ctx.fillRect(random() * width, random() * height, 2, 2);
  }

  const cx = width * 0.5;
  const cy = height * 0.48;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#f3f1ea';

  // Crossed bones behind the skull.
  const bone = (angle) => {
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.roundRect(-105, -9, 210, 18, 9);
    ctx.fill();
    for (const end of [-105, 105]) {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(end + (end < 0 ? -6 : 6), side * 13, 15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  };
  bone(Math.PI / 5);
  bone(-Math.PI / 5);

  // Skull: cranium, cheeks and jaw.
  ctx.beginPath();
  ctx.ellipse(0, -14, 58, 54, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(-30, 22, 60, 40, 16);
  ctx.fill();

  ctx.fillStyle = '#111111';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * 24, -18, 18, 21, side * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(-11, 22);
  ctx.lineTo(11, 22);
  ctx.closePath();
  ctx.fill();

  ctx.lineWidth = 4;
  ctx.strokeStyle = '#111111';
  ctx.beginPath();
  ctx.moveTo(-30, 40);
  ctx.lineTo(30, 40);
  ctx.stroke();
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 12, 26);
    ctx.lineTo(i * 12, 58);
    ctx.stroke();
  }
  ctx.restore();

  // Tattered, sun-bleached edges.
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 26; i++) {
    const y = random() * height;
    ctx.beginPath();
    ctx.arc(width - random() * 14, y, 4 + random() * 12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  return toTexture(element);
}

/**
 * Soft round puff for spray, wake foam and powder smoke. `erode` bites chunks
 * out of the edge: high for billowing smoke, low for foam that has to blend
 * into its neighbours without looking like cotton wool.
 */
export function puffTexture({ erode = 60, core = 0.45, seed = 11 } = {}) {
  const size = 128;
  const { element, ctx } = canvas(size, size);
  const random = rng(seed);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(core, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < erode; i++) {
    const angle = random() * Math.PI * 2;
    const radius = 18 + random() * 44;
    ctx.beginPath();
    ctx.arc(size / 2 + Math.cos(angle) * radius, size / 2 + Math.sin(angle) * radius, 3 + random() * 9, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  return toTexture(element, { anisotropy: 1 });
}

/** Gilded name board for the transom. */
export function nameBoardTexture(name = 'THE BLACK GALE') {
  const width = 1024;
  const height = 200;
  const { element, ctx } = canvas(width, height);
  const random = rng(17);

  ctx.fillStyle = '#2a1a0e';
  ctx.fillRect(0, 0, width, height);
  grain(ctx, width, height, random, 260, 0.2);

  ctx.strokeStyle = 'rgba(200,146,58,0.9)';
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, width - 28, height - 28);

  ctx.font = 'bold 104px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(name, width / 2 + 4, height / 2 + 5);
  ctx.fillStyle = '#e6bb63';
  ctx.fillText(name, width / 2, height / 2);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,240,205,0.6)';
  ctx.strokeText(name, width / 2, height / 2);

  return toTexture(element);
}

/** Grubby canvas for hammocks, tarpaulins and sail bags. */
export function ropeTexture() {
  const size = 128;
  const { element, ctx } = canvas(size, size);
  ctx.fillStyle = '#8a6f43';
  ctx.fillRect(0, 0, size, size);
  for (let i = -size; i < size; i += 7) {
    ctx.strokeStyle = 'rgba(60,44,22,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(220,196,150,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(i + 3, 0);
    ctx.lineTo(i + 3 + size, size);
    ctx.stroke();
  }
  return toTexture(element, { repeat: [2, 2] });
}
