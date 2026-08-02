import * as THREE from 'three';
import { BrickBuilder, PLATE, P, B } from '../lego/brick.js';
import { C, FINISH } from '../lego/palette.js';
import { RNG } from '../engine/rng.js';
import { num, bool, hash2i, GREY_PANEL, pickFrom, greebleRect, practical } from './common.js';

/*
 * Rebel base hangar.
 *
 * Grey rock-and-plate walls down both sides, a deck of dark plating, overhead
 * light rigs on gantries, and at the far (-Z) end an open blast-door mouth
 * showing daylight -- that bright rectangle is the whole point of the set,
 * because X-wings launch straight out of it toward the camera.
 */

/** Stacked crate, the universal hangar dressing. */
function crate(bb, x, y, z, w, d, h, color, rot = 0) {
  bb.brick(x, y, z, w, d, { h, color, rot, free: true, studs: false });
  bb.brick(x, y + h, z, w - 0.5, d - 0.5, { h: P(1), color: C.darkBluishGray, rot, free: true, studs: false });
  // Corner ribs so it reads as a container, not a block.
  for (const sx of [-1, 1]) {
    const lx = sx * (w / 2 - 0.4);
    bb.brick(x + lx * Math.cos(rot), y, z - lx * Math.sin(rot), 0.8, d, {
      h, color: C.darkBluishGray, rot, free: true, studs: false,
    });
  }
  bb.brick(x, y + h * 0.5, z, w + 0.12, d + 0.12, {
    h: P(1), color: C.darkGray, rot, free: true, studs: false,
  });
}

/** Overhead lighting gantry spanning the bay. */
function lightRig(bb, z, w, y) {
  bb.brick(0, y, z, w, 1.6, { h: B(1), color: C.darkBluishGray, free: true, studs: false });
  bb.brick(0, y + B(1), z, w, 0.8, { h: P(2), color: C.lightBluishGray, free: true, studs: false });
  for (let k = -2; k <= 2; k++) {
    const x = k * (w / 5.4);
    bb.brick(x, y - P(2), z, 7, 2.6, { h: P(2), color: C.lightBluishGray, free: true, studs: false });
    bb.brick(x, y - P(3), z, 6.2, 1.8, {
      h: P(1), color: C.transClear, finish: FINISH.GLOW, free: true, studs: false,
    });
  }
  // Hanger struts up to the ceiling.
  for (const s of [-1, 1]) {
    bb.brick(s * w * 0.36, y + B(1), z, 0.7, 0.7, { h: B(3), color: C.darkGray, free: true, studs: false });
  }
}

export function buildHangarBay(opts = {}) {
  const w = num(opts, 'width', 120);       // clear deck width
  const len = num(opts, 'length', 130);    // mouth (-Z) to back wall (+Z)
  const h = num(opts, 'height', 44);
  const mouthW = num(opts, 'mouth', 74);
  const mouthH = num(opts, 'mouthHeight', 30);
  const seed = Math.round(num(opts, 'seed', 8080));
  const rng = new RNG(seed);
  const hw = w / 2;
  const zMouth = -len / 2, zBack = len / 2;

  const bb = new BrickBuilder({ studs: false, bevel: false, cullStuds: false });

  // -------------------------------------------------------------- deck
  const cell = 10;
  const nx = Math.round(w / cell), nz = Math.round(len / cell);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x = -hw + (i + 0.5) * cell;
      const z = zMouth + (j + 0.5) * cell;
      const t = hash2i(i, j, seed + 2);
      bb.brick(x, -PLATE, z, cell - 0.2, cell - 0.2, {
        h: PLATE, color: t < 0.24 ? C.darkGray : (t < 0.9 ? C.darkBluishGray : C.black),
        free: true, studs: false,
      });
    }
  }
  // Landing circles: two painted rings the fighters sit in.
  for (const cx of [-hw * 0.45, hw * 0.45]) {
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      if (k % 7 === 6) continue;
      bb.brick(cx + Math.cos(a) * 17, 0, Math.sin(a) * 17, 3.6, 1.1, {
        h: P(0.4), color: C.yellow, rot: -a, free: true, studs: false,
      });
    }
  }
  // Guide stripes running out of the mouth.
  for (const s of [-1, 1]) {
    for (let k = 0; k < 8; k++) {
      bb.brick(s * 9, 0, zMouth + 3 + k * 8, 1.2, 4.4, {
        h: P(0.4), color: C.yellow, free: true, studs: false,
      });
    }
  }

  // -------------------------------------------------------- side walls
  for (const side of [-1, 1]) {
    const x = side * hw;
    bb.brick(x + side * 2, 0, 0, 4, len, { h, color: C.lightBluishGray, free: true, studs: false });
    bb.brick(x - side * 1, 0, 0, 2, len, { h: B(3), color: C.darkBluishGray, free: true, studs: false });
    greebleRect(bb, {
      axis: 'x', at: x, dir: -side,
      u0: zMouth + 1, u1: zBack - 1, v0: B(3), v1: h - B(2),
      cell: 11, seed: seed + (side > 0 ? 31 : 97),
      colors: GREY_PANEL, dMin: 0.3, dMax: 2.0, fill: 0.86, sub: 0.5, pipes: 0.22,
      lights: 0.07, lightColor: C.transNeonOrange, lightSize: 0.8,
    });
    // A raised catwalk with railings along each wall.
    const cy = B(9);
    bb.brick(x - side * 4, cy, 0, 8, len, { h: P(2), color: C.darkBluishGray, free: true, studs: false });
    for (let k = 0; k < Math.round(len / 6); k++) {
      const z = zMouth + (k + 0.5) * 6;
      bb.bar(x - side * 7.6, cy + 2.2, z, 0.12, 4.4, { color: C.flatSilver });
    }
    bb.bar(x - side * 7.6, cy + 4.2, 0, 0.14, len - 1, { color: C.flatSilver, rx: Math.PI / 2 });
    // Support legs under the catwalk.
    for (let k = 0; k < Math.round(len / 18); k++) {
      bb.brick(x - side * 7.2, 0, zMouth + 8 + k * 18, 1.2, 1.2, {
        h: cy, color: C.darkGray, free: true, studs: false,
      });
    }
  }

  // ---------------------------------------------------------- back wall
  bb.brick(0, 0, zBack + 2, w + 8, 4, { h, color: C.lightBluishGray, free: true, studs: false });
  greebleRect(bb, {
    axis: 'z', at: zBack, dir: -1,
    u0: -hw + 2, u1: hw - 2, v0: B(2), v1: h - B(3),
    cell: 12, seed: seed + 401, colors: GREY_PANEL,
    dMin: 0.35, dMax: 2.2, fill: 0.8, sub: 0.45, pipes: 0.2, lights: 0.06,
  });
  // A blast door and a lit control window at the back, for scale.
  bb.brick(0, 0, zBack - 0.8, 16, 1.6, { h: B(6), color: C.darkBluishGray, free: true, studs: false });
  bb.brick(0, 0, zBack - 1.6, 14, 0.8, { h: B(5.6), color: C.darkGray, free: true, studs: false });
  bb.brick(-hw * 0.55, B(10), zBack - 1.2, 22, 1.2, { h: B(3), color: C.black, free: true, studs: false });
  bb.brick(-hw * 0.55, B(10) + P(1), zBack - 1.9, 20.5, 0.5, {
    h: B(3) - P(2), color: C.transLightBlue, finish: FINISH.GLOW, free: true, studs: false,
  });

  // -------------------------------------------------------- ceiling
  bb.brick(0, h, 0, w + 8, len + 4, { h: B(2), color: C.darkBluishGray, free: true, studs: false });
  for (let k = 0; k < Math.round(len / 16); k++) {
    const z = zMouth + 8 + k * 16;
    bb.brick(0, h - P(2), z, w, 2.6, { h: P(2), color: C.lightBluishGray, free: true, studs: false });
  }
  for (let k = 0; k < 4; k++) lightRig(bb, zMouth + 22 + k * 28, w - 10, h - B(4));

  // -------------------------------------------------- blast-door mouth
  // The doorway is a thick frame; the sky itself is a plane hung in the gap.
  const mw = mouthW / 2;
  bb.brick(0, mouthH, zMouth - 1.5, w + 8, 3, { h: h - mouthH, color: C.lightBluishGray, free: true, studs: false });
  for (const side of [-1, 1]) {
    bb.brick(side * (mw + (hw - mw) / 2), 0, zMouth - 1.5, hw - mw, 3, {
      h: mouthH, color: C.lightBluishGray, free: true, studs: false,
    });
    // Retracted door leaf, folded into the jamb.
    for (let k = 0; k < 4; k++) {
      bb.brick(side * (mw + 1.4 + k * 1.6), 0, zMouth - 3.2, 1.3, 2.4, {
        h: mouthH - B(1), color: k % 2 ? C.darkBluishGray : C.darkGray, free: true, studs: false,
      });
    }
    // Ram that drives the leaf across the mouth.
    bb.cyl(side * (mw + (hw - mw) / 2), mouthH - B(2), zMouth - 3.6, 0.5, hw - mw - 2, {
      color: C.flatSilver, finish: FINISH.METAL, axis: 'x', seg: 8, stud: false,
    });
  }
  // Lip and warning chevrons on the deck at the threshold.
  bb.brick(0, -PLATE, zMouth - 1.5, mouthW, 3, { h: PLATE + P(1), color: C.darkGray, free: true, studs: false });
  for (let k = -6; k <= 6; k++) {
    bb.brick(k * 5.2, P(1), zMouth + 1.5, 2.6, 2.2, {
      h: P(0.4), color: k % 2 ? C.yellow : C.black, rot: 0.6, free: true, studs: false,
    });
  }

  // ------------------------------------------------------------- crates
  const crateRng = rng;
  for (let i = 0; i < 22; i++) {
    const side = crateRng.next() < 0.5 ? -1 : 1;
    const x = side * crateRng.range(hw * 0.55, hw * 0.9);
    const z = crateRng.range(zMouth + 12, zBack - 12);
    const cw = crateRng.range(4, 8), cd = crateRng.range(4, 7);
    const ch = B(crateRng.range(1.6, 3.4));
    const col = pickFrom([C.darkTan, C.oliveGreen, C.darkBluishGray, C.reddishBrown, C.darkGray], crateRng.next());
    crate(bb, x, 0, z, cw, cd, ch, col, crateRng.range(-0.4, 0.4));
    if (crateRng.next() < 0.4) {
      crate(bb, x + crateRng.range(-1, 1), ch + P(1), z + crateRng.range(-1, 1),
        cw * 0.75, cd * 0.75, ch * 0.7, col, crateRng.range(-0.5, 0.5));
    }
  }
  // Fuel drums.
  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? -1 : 1;
    const x = side * crateRng.range(hw * 0.6, hw * 0.88);
    const z = crateRng.range(zMouth + 16, zBack - 16);
    bb.cyl(x, 0, z, 1.5, B(2.6), { color: C.oliveGreen, seg: 12, stud: false });
    bb.cyl(x, B(2.6), z, 1.6, P(1), { color: C.darkBluishGray, seg: 12, stud: false });
  }

  // -------------------------------------------------------------- cables
  // Loose power runs draped from the catwalk down to the deck.
  for (let i = 0; i < 10; i++) {
    const side = i % 2 ? -1 : 1;
    const z = crateRng.range(zMouth + 14, zBack - 14);
    const x = side * (hw - 8);
    const segs = 5;
    for (let k = 0; k < segs; k++) {
      const t0 = k / segs, t1 = (k + 1) / segs;
      const y0 = B(9) * (1 - t0 * t0), y1 = B(9) * (1 - t1 * t1);
      const x0 = x - side * t0 * 6, x1 = x - side * t1 * 6;
      const dx = x1 - x0, dy = y1 - y0;
      bb.bar((x0 + x1) / 2, (y0 + y1) / 2, z, 0.16, Math.hypot(dx, dy) * 1.05, {
        color: i % 3 ? C.black : C.darkBluishGray, rz: -Math.atan2(dx, dy),
      });
    }
  }

  const g = bb.build();
  g.name = 'hangarbay';
  g.userData.nodes = bb.nodes;

  // ----------------------------------------------------- sky in the mouth
  // A plain gradient card, not the lighting rig's dome: the mouth has to read
  // as blown-out daylight against the grey even under the `hangar` env.
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(mouthW - 1, mouthH - 0.6),
    new THREE.ShaderMaterial({
      uniforms: {
        top: { value: new THREE.Color(0x9fc8ee).convertSRGBToLinear() },
        bot: { value: new THREE.Color(0xf2e3c4).convertSRGBToLinear() },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `varying vec2 vUv; uniform vec3 top, bot;
        void main(){
          vec3 c = mix(bot, top, pow(clamp(vUv.y, 0.0, 1.0), 0.75));
          // A pale sun haze low and left, where the key light comes from.
          c += vec3(1.0, 0.92, 0.78) * 0.55 * pow(max(0.0, 1.0 - length((vUv - vec2(0.34, 0.22)) * vec2(1.8, 2.6))), 2.5);
          gl_FragColor = vec4(c, 1.0);
        }`,
      toneMapped: false,
      depthWrite: false,
    }),
  );
  sky.position.set(0, (mouthH - 0.6) / 2, zMouth - 2.9);
  sky.renderOrder = -1;
  g.add(sky);

  const mouth = new THREE.Object3D();
  mouth.position.set(0, 0, zMouth);
  g.add(mouth);
  g.userData.nodes.mouth = mouth;
  g.userData.nodes.sky = sky;

  if (bool(opts, 'lights', true)) {
    // Daylight spilling in through the mouth, plus two overhead practicals.
    const spill = new THREE.DirectionalLight(new THREE.Color(0xfff0d8).convertSRGBToLinear(), 1.5);
    spill.position.set(-20, 26, zMouth - 60);
    spill.target.position.set(0, 6, zBack);
    g.add(spill, spill.target);
    practical(g, 0, h - 10, zMouth + 30, 0xdfeaff, 900, 130);
    practical(g, 0, h - 10, zBack - 26, 0xdfeaff, 800, 130);
    practical(g, 0, 8, zMouth + 6, 0xffe9c6, 420, 90);
  }
  return g;
}
