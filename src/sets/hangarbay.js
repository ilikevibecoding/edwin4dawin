import * as THREE from 'three';
import { BrickBuilder, PLATE, P, B } from '../lego/brick.js';
import { C, FINISH } from '../lego/palette.js';
import { RNG } from '../engine/rng.js';
import { num, bool, hash2i, GREY_PANEL, pickFrom, greebleRect, setGloss } from './common.js';

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
      matOpts: { intensity: 1.1 },
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
      // RUBBER, not SOLID: the standard ABS finish carries a clearcoat, and a
      // clearcoat lobe on 130 studs of flat deck turns the daylight coming
      // through the mouth into a blown white pool right in the middle of the
      // shot. This finish is the only one in the kit without one.
      bb.brick(x, -PLATE, z, cell - 0.2, cell - 0.2, {
        h: PLATE,
        // Two darks and a rare light. No black -- the bay is lit by a
        // hemisphere and one weak spill, so a black plate has nothing to return
        // and the near deck, which is half the frame in the launch shot, goes
        // to a crushed nothing. The light plate has to stay rare: it picks up
        // the blue of the hemisphere, and at any density it reads as puddles.
        color: t < 0.30 ? C.darkGray : (t < 0.94 ? C.darkBluishGray : C.lightBluishGray),
        free: true, studs: false, finish: FINISH.RUBBER,
      });
    }
  }
  // Landing circles: two painted rings the fighters sit in. Matte like the
  // deck -- deck paint seen at this grazing an angle is exactly where a
  // clearcoat lobe turns into a blown white streak.
  for (const cx of [-hw * 0.45, hw * 0.45]) {
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      if (k % 7 === 6) continue;
      bb.brick(cx + Math.cos(a) * 17, 0, Math.sin(a) * 17, 3.6, 1.1, {
        h: P(0.4), color: C.yellow, rot: -a, free: true, studs: false, finish: FINISH.RUBBER,
      });
    }
  }
  // Guide stripes running out of the mouth.
  for (const s of [-1, 1]) {
    for (let k = 0; k < 8; k++) {
      bb.brick(s * 9, 0, zMouth + 3 + k * 8, 1.2, 4.4, {
        h: P(0.4), color: C.yellow, free: true, studs: false, finish: FINISH.RUBBER,
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
  // Matte again: 130 x 128 studs of glossy roof catches the key light in one
  // enormous clearcoat highlight, which blooms into the frame on any shot that
  // sees the hangar from outside.
  bb.brick(0, h, 0, w + 8, len + 4, {
    h: B(2), color: C.darkBluishGray, free: true, studs: false, finish: FINISH.RUBBER,
  });
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
  // Lip and warning chevrons on the deck at the threshold. The lip runs right
  // across the bright mouth and the camera sees its top face almost edge-on,
  // so a clearcoat here reads as a blown white bar under the sky.
  bb.brick(0, -PLATE, zMouth - 1.5, mouthW, 3, {
    h: PLATE + P(1), color: C.darkGray, free: true, studs: false, finish: FINISH.RUBBER,
  });
  for (let k = -6; k <= 6; k++) {
    bb.brick(k * 5.2, P(1), zMouth + 1.5, 2.6, 2.2, {
      h: P(0.4), color: k % 2 ? C.yellow : C.black, rot: 0.6, free: true, studs: false,
      finish: FINISH.RUBBER,
    });
  }

  // ------------------------------------------------------------- crates
  const crateRng = rng;
  for (let i = 0; i < 30; i++) {
    const side = crateRng.next() < 0.5 ? -1 : 1;
    // Two bands. Everything against the walls leaves the middle of the bay
    // empty in exactly the shot this set exists for -- looking down the deck
    // and out of the mouth -- so a third of the dressing sits inboard, clear
    // of the landing circles.
    const x = side * (i % 3 === 0
      ? crateRng.range(hw * 0.2, hw * 0.42)
      : crateRng.range(hw * 0.52, hw * 0.86));
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
  for (let i = 0; i < 10; i++) {
    const side = i % 2 ? -1 : 1;
    const x = side * crateRng.range(hw * 0.24, hw * 0.84);
    const z = crateRng.range(zMouth + 16, zBack - 16);
    bb.cyl(x, 0, z, 1.5, B(2.6), { color: C.oliveGreen, seg: 12, stud: false });
    bb.cyl(x, B(2.6), z, 1.6, P(1), { color: C.darkBluishGray, seg: 12, stud: false });
  }

  // Fuel bowser: a wheeled tank with a boom, parked between the landing
  // circles. Something with height in the middle of the deck is what gives the
  // bay its sense of scale when a fighter is not sitting in it.
  {
    const bx = -hw * 0.1, bz = -14;
    bb.brick(bx, P(2), bz, 9, 5, { h: B(1.4), color: C.darkBluishGray, free: true, studs: false });
    bb.cyl(bx, P(2) + B(1.4), bz, 2.2, 7.5, {
      color: C.oliveGreen, axis: 'z', seg: 14, stud: false,
    });
    bb.cyl(bx, P(2) + B(1.4), bz - 3.9, 2.35, 0.5, {
      color: C.darkBluishGray, axis: 'z', seg: 14, stud: false,
    });
    bb.brick(bx, P(2) + B(1.4) + 2.2, bz + 1.4, 2.6, 2.6, {
      h: B(1.6), color: C.flatSilver, finish: FINISH.METAL, free: true, studs: false,
    });
    bb.bar(bx + 1.1, P(2) + B(1.4) + 4.6, bz + 1.4, 0.22, 7, { color: C.darkGray, rz: 0.5 });
    for (const s of [-1, 1]) {
      for (const zz of [-2.6, 2.6]) {
        bb.cyl(bx + s * 4.2, P(2), bz + zz, 1.1, 0.9, {
          color: C.black, axis: 'x', seg: 10, stud: false,
        });
      }
    }
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

  const g = setGloss(bb.build());
  g.name = 'hangarbay';
  g.userData.nodes = bb.nodes;

  // ----------------------------------------------------- sky in the mouth
  // A plain gradient card, not the lighting rig's dome: the mouth has to read
  // as blown-out daylight against the grey even under the `hangar` env.
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(mouthW - 1, mouthH - 0.6),
    new THREE.ShaderMaterial({
      uniforms: {
        top: { value: new THREE.Color(0x8ebde8).convertSRGBToLinear() },
        bot: { value: new THREE.Color(0xdcc9a4).convertSRGBToLinear() },
              ground: { value: new THREE.Color(0xa1998c).convertSRGBToLinear() },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `varying vec2 vUv; uniform vec3 top, bot, ground;
        void main(){
          vec3 c = mix(bot, top, pow(clamp(vUv.y, 0.0, 1.0), 0.8));
          // Sun haze up and to the left, where the key light comes from. Kept
          // well off the deck line so it does not wash out the threshold.
          c += vec3(1.0, 0.94, 0.82) * 0.26 * pow(max(0.0, 1.0 - length((vUv - vec2(0.3, 0.66)) * vec2(1.7, 2.2))), 2.2);
          // A sunlit plain along the bottom, with a ridge line broken up by a
          // couple of low hills. Without any of this the mouth is a hole full
          // of light and the deck appears to run off the edge of the world;
          // without the hills it is a flat bar and the card reads as a card.
          float ridge = 0.098
            + 0.030 * exp(-pow((vUv.x - 0.22) * 5.0, 2.0))
            + 0.046 * exp(-pow((vUv.x - 0.63) * 3.4, 2.0))
            + 0.018 * exp(-pow((vUv.x - 0.88) * 7.0, 2.0));
          // Haze bank just above the ridge, so the far plain sits behind air.
          c = mix(c, vec3(0.88, 0.85, 0.78), 0.30 * smoothstep(ridge + 0.16, ridge, vUv.y));
          float hz = smoothstep(ridge + 0.020, ridge - 0.016, vUv.y);
          c = mix(c, ground * (0.80 + 1.9 * vUv.y), hz);
          gl_FragColor = vec4(c, 1.0);
        }`,
      toneMapped: true,
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
    // Daylight spilling in through the mouth. Angled steeply down rather than
    // level with the deck: a low sun coming straight in through the mouth
    // mirrors off every horizontal face into a camera standing on the deck,
    // which is the one shot this set exists for.
    const spill = new THREE.DirectionalLight(new THREE.Color(0xfff0d8).convertSRGBToLinear(), 0.9);
    spill.position.set(-34, 76, zMouth - 60);
    spill.target.position.set(0, 0, zBack);
    spill.castShadow = false;
    g.add(spill, spill.target);
    // The overhead rigs are the bay's own lighting, and they have to come down
    // as one broad soft source. Point lights big enough to reach 130 studs of
    // deck burn a clearcoat hotspot into whatever crate sits under them, so
    // the work is done by a directional plus a hemisphere instead.
    // Most of the level is carried by the hemisphere rather than the
    // directional: a directional strong enough to light the deck on its own
    // puts a clearcoat lobe on every crate lid, and at this camera height the
    // lids face the reflection direction, so they blow to white. A hemisphere
    // has no such lobe.
    const strip = new THREE.DirectionalLight(new THREE.Color(0xe6efff).convertSRGBToLinear(), 0.55);
    strip.position.set(14, 60, 24);
    strip.target.position.set(0, 0, zMouth * 0.4);
    strip.castShadow = false;
    g.add(strip, strip.target);
    g.add(new THREE.HemisphereLight(
      new THREE.Color(0xb6c8e0).convertSRGBToLinear(),
      new THREE.Color(0x424a58).convertSRGBToLinear(), 3.1,
    ));
  }
  return g;
}
