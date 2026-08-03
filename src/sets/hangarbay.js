import * as THREE from 'three';
import { BrickBuilder, PLATE, P, B } from '../lego/brick.js';
import { C, FINISH } from '../lego/palette.js';
import { RNG } from '../engine/rng.js';
import { num, bool, hash2i, pickFrom, greebleRect, setGloss } from './common.js';

/*
 * Rebel base hangar.
 *
 * Grey rock-and-plate walls down both sides, a deck of dark plating, overhead
 * light rigs on gantries, and at the far (-Z) end an open blast-door mouth
 * showing daylight -- that bright rectangle is the whole point of the set,
 * because X-wings launch straight out of it toward the camera.
 */

/*
 * Wall palette. Narrower than the library's GREY_PANEL, and weighted below the
 * wall colour rather than above it.
 *
 * The kit's greys are a coarse ladder -- there is nothing at all between light
 * bluish gray and very light gray, which is a factor of two in reflectance. So
 * on a light bluish gray wall every very light gray panel is twice the wall's
 * value, and a wall of them reads as pale rectangles stuck to a grey sheet:
 * posters, not plating. Half the list is therefore the wall's own colour, so
 * those panels are given away only by the shadow they throw, and the accents
 * that remain sit mostly a step down, where they read as recesses.
 */
const HANGAR_PANEL = [
  C.lightBluishGray, C.lightBluishGray, C.lightBluishGray, C.lightBluishGray,
  C.lightBluishGray, C.lightBluishGray, C.lightBluishGray, C.lightBluishGray,
  C.veryLightGray, C.veryLightGray,
  C.flatSilver, C.darkBluishGray,
];

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

  /*
   * Two builders, split by whether a part should cast a shadow.
   *
   * `sb` is the shell -- deck, the four wall slabs, the roof. It receives
   * shadows but throws none, and that is the whole reason the split exists: a
   * hangar is a closed box, so a roof that casts puts every directional light
   * in the rig outside the set looking at the top of a lid. Everything inside
   * then falls back on the ambient term, and an ambient term varies only with
   * a surface's Y -- so a panel standing two studs off a wall returns exactly
   * what the wall returns and the greebling reads as rectangles printed on a
   * flat sheet. Opening the shell to the key is the usual way a set is lit for
   * real, with the lamp on a stand above a wall that stops at head height.
   *
   * `bb` is everything the shell contains, and it casts normally, so the
   * panels, catwalks, gantries and crates all carve.
   */
  const sb = new BrickBuilder({ studs: false, bevel: false, cullStuds: false });
  const bb = new BrickBuilder({ studs: false, bevel: false, cullStuds: false });

  // -------------------------------------------------------------- deck
  const cell = 10;
  const nx = Math.round(w / cell), nz = Math.round(len / cell);
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x = -hw + (i + 0.5) * cell;
      const z = zMouth + (j + 0.5) * cell;
      const t = hash2i(i, j, seed + 2);
      // One tone for the whole deck, and light grey rather than dark. Two
      // things drove this. A dark deck does not survive the shot -- the mouth
      // is daylight, the interior is a single hemisphere, and dark grey ABS
      // returns so little of it that the near half of the deck crushes to
      // black. And mixing the kit's greys per cell does not work either: they
      // are far apart in value, so on a 10-stud cell any real mix reads as a
      // chessboard. The variation comes from the panel gaps, the hatches
      // below, and the paint, all of which are smaller than a cell.
      //
      // RUBBER, not SOLID: the standard ABS finish carries a clearcoat, and a
      // clearcoat lobe on 130 studs of flat deck turns the daylight coming
      // through the mouth into a blown white pool in the middle of the shot.
      sb.brick(x, -PLATE, z, cell - 0.2, cell - 0.2, {
        h: PLATE, color: C.lightBluishGray, free: true, studs: false, finish: FINISH.RUBBER,
      });
      // Service hatches and worn patches, deliberately smaller than the cell.
      if (t < 0.20) {
        const hw2 = 2.2 + hash2i(i, j, seed + 55) * 2.4;
        const hd2 = 2.0 + hash2i(i, j, seed + 91) * 2.6;
        sb.brick(x + (hash2i(i, j, seed + 13) - 0.5) * 3, 0, z + (hash2i(i, j, seed + 29) - 0.5) * 3,
          hw2, hd2, {
            h: P(0.4), color: t < 0.07 ? C.darkBluishGray : C.darkGray,
            free: true, studs: false, finish: FINISH.RUBBER,
          });
      }
    }
  }
  // Landing circles: two painted rings the fighters sit in. Matte like the
  // deck -- deck paint seen at this grazing an angle is exactly where a
  // clearcoat lobe turns into a blown white streak.
  for (const cx of [-hw * 0.45, hw * 0.45]) {
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      if (k % 7 === 6) continue;
      sb.brick(cx + Math.cos(a) * 17, 0, Math.sin(a) * 17, 3.6, 1.1, {
        h: P(0.4), color: C.yellow, rot: -a, free: true, studs: false, finish: FINISH.RUBBER,
      });
    }
  }
  // Guide stripes running out of the mouth.
  for (const s of [-1, 1]) {
    for (let k = 0; k < 8; k++) {
      sb.brick(s * 9, 0, zMouth + 3 + k * 8, 1.2, 4.4, {
        h: P(0.4), color: C.yellow, free: true, studs: false, finish: FINISH.RUBBER,
      });
    }
  }

  // -------------------------------------------------------- side walls
  for (const side of [-1, 1]) {
    const x = side * hw;
    sb.brick(x + side * 2, 0, 0, 4, len, { h, color: C.lightBluishGray, free: true, studs: false });
    bb.brick(x - side * 1, 0, 0, 2, len, { h: B(3), color: C.darkBluishGray, free: true, studs: false });
    greebleRect(bb, {
      axis: 'x', at: x, dir: -side,
      u0: zMouth + 1, u1: zBack - 1, v0: B(3), v1: h - B(2),
      cell: 7.5, seed: seed + (side > 0 ? 31 : 97),
      colors: HANGAR_PANEL, dMin: 0.4, dMax: 2.6, fill: 0.86, sub: 0.5, pipes: 0.22,
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
  sb.brick(0, 0, zBack + 2, w + 8, 4, { h, color: C.lightBluishGray, free: true, studs: false });
  greebleRect(bb, {
    axis: 'z', at: zBack, dir: -1,
    u0: -hw + 2, u1: hw - 2, v0: B(2), v1: h - B(3),
    cell: 8, seed: seed + 401, colors: HANGAR_PANEL,
    dMin: 0.4, dMax: 2.6, fill: 0.8, sub: 0.45, pipes: 0.2, lights: 0.06,
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
  // Light bluish gray rather than the dark grey a real roof would be. The
  // ceiling's underside faces straight down, so it takes the hemisphere's
  // ground term and nothing else -- at dark grey it came back as a black bar
  // across the top sixth of every shot taken from the deck.
  sb.brick(0, h, 0, w + 8, len + 4, {
    h: B(2), color: C.lightBluishGray, free: true, studs: false, finish: FINISH.RUBBER,
  });
  for (let k = 0; k < Math.round(len / 16); k++) {
    const z = zMouth + 8 + k * 16;
    sb.brick(0, h - P(2), z, w, 2.6, { h: P(2), color: C.veryLightGray, free: true, studs: false });
  }
  for (let k = 0; k < 4; k++) lightRig(bb, zMouth + 22 + k * 28, w - 10, h - B(4));

  // -------------------------------------------------- blast-door mouth
  // The doorway is a thick frame; the sky itself is a plane hung in the gap.
  const mw = mouthW / 2;
  sb.brick(0, mouthH, zMouth - 1.5, w + 8, 3, { h: h - mouthH, color: C.lightBluishGray, free: true, studs: false });
  for (const side of [-1, 1]) {
    sb.brick(side * (mw + (hw - mw) / 2), 0, zMouth - 1.5, hw - mw, 3, {
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
  // Greeble the inboard face of that frame. Every shot this set exists for is
  // taken from inside the bay looking out, which puts the header and the two
  // jambs across the top and sides of frame; left bare they are a plain slab
  // occupying a third of the picture.
  greebleRect(bb, {
    axis: 'z', at: zMouth, dir: 1,
    u0: -hw + 2, u1: hw - 2, v0: mouthH + 2.5, v1: h - B(2),
    cell: 6.5, seed: seed + 613, colors: HANGAR_PANEL,
    dMin: 0.4, dMax: 2.4, fill: 0.88, sub: 0.5, pipes: 0.24,
    lights: 0.08, lightColor: C.transNeonOrange, lightSize: 0.7,
  });
  for (const side of [-1, 1]) {
    greebleRect(bb, {
      axis: 'z', at: zMouth, dir: 1,
      u0: side > 0 ? mw + 1.5 : -hw + 2, u1: side > 0 ? hw - 2 : -mw - 1.5,
      v0: B(2), v1: mouthH - 1,
      cell: 6.5, seed: seed + (side > 0 ? 727 : 811), colors: HANGAR_PANEL,
      dMin: 0.4, dMax: 2.2, fill: 0.84, sub: 0.45, pipes: 0.2, lights: 0.06,
    });
  }
  // A rail of downlights under the header, aimed back into the bay. The mouth
  // is a bright hole with the header directly above it in silhouette, so
  // without emitters of its own that band goes to dead grey.
  for (let k = -4; k <= 4; k++) {
    bb.brick(k * 12, mouthH + 1.0, zMouth + 1.6, 5, 1.6, {
      h: P(2), color: C.darkBluishGray, free: true, studs: false,
    });
    bb.brick(k * 12, mouthH + 1.0, zMouth + 2.15, 4.2, 0.5, {
      h: P(1.4), color: C.transClear, finish: FINISH.GLOW, free: true, studs: false,
      matOpts: { intensity: 1.0 },
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

  const g = bb.build();
  for (const m of [...sb.build({ castShadow: false }).children]) g.add(m);
  setGloss(g);
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
    const spill = new THREE.DirectionalLight(new THREE.Color(0xfff0d8).convertSRGBToLinear(), 1.25);
    spill.position.set(-52, 66, zMouth - 80);
    spill.target.position.set(6, 4, zBack * 0.35);
    spill.castShadow = false;
    g.add(spill, spill.target);

    /*
     * The bay's own key -- and the only shadow caster in the set.
     *
     * A wall panel here stands 0.3 to 2.6 studs proud, and the shot this set
     * exists for looks at that wall head-on from a hundred studs back. At that
     * distance a panel's side face is under a pixel wide, so no amount of
     * shading on it can say the panel has depth: lit by ambient alone the whole
     * wall came back as grey rectangles printed on a flat sheet. What does
     * carry at that distance is the shadow the panel throws onto the wall
     * behind it, which is as wide as the panel is deep and lands next to the
     * panel rather than on its edge. Hence a real shadow map, sized to the
     * whole bay rather than the rig's 40-stud default.
     */
    // It comes from over the camera's right shoulder and well forward, so the
    // shadows fall across the mouth wall rather than straight down it, and so
    // the two side walls do not come back at the same value.
    // Near-neutral, not the cool white an interior rig usually wants: the ABS
    // is already a bluish grey, the env is a blue room and the fill has a sky
    // in it, and stacking a fourth blue on top turned a hall of grey plastic
    // navy.
    const key = new THREE.DirectionalLight(new THREE.Color(0xfbf7f2).convertSRGBToLinear(), 2.1);
    key.position.set(86, 100, 110);
    key.target.position.set(0, 10, -25);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 20;
    key.shadow.camera.far = 420;
    const sh = Math.max(w, len) * 0.95;
    key.shadow.camera.left = -sh; key.shadow.camera.right = sh;
    key.shadow.camera.top = sh; key.shadow.camera.bottom = -sh;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.07;
    g.add(key, key.target);

    /*
     * Bounce off the deck, and the only light in the bay that shines upward.
     *
     * 128 x 130 studs of light grey deck sits under four rows of lamps and an
     * open mouth, so in the real bay the roof is lit almost entirely from
     * below. Nothing else here can do that job: both directionals come down
     * from outside, and the hemisphere's ground term is the only other thing a
     * down-facing normal sees -- one term, divided by pi by the Lambert BRDF,
     * which put the roof at a twentieth of the wall it meets and left a black
     * bar across the top of every shot taken from the deck. Raising the
     * hemisphere instead is no good, because a hemisphere gives a vertical
     * face half its ground term too, so the walls come up with the roof and
     * the shading the key just carved goes flat again.
     */
    const bounce = new THREE.DirectionalLight(new THREE.Color(0xf4ede0).convertSRGBToLinear(), 1.15);
    bounce.position.set(0, -60, 6);
    bounce.target.position.set(0, h, 0);
    bounce.castShadow = false;
    g.add(bounce, bounce.target);

    // Fill. Broad and near-neutral, and no more than half the level: a
    // hemisphere varies only with a surface's Y, so every vertical face in the
    // bay takes the identical value from it no matter which way it points.
    // Carried at the strength this needed before the key cast shadows it
    // erased the shading as fast as the directionals put it in, and tinted a
    // hall of grey ABS the colour of its own sky term.
    //
    // The ground half is not a floor colour, it is the bounce off 128 x 130
    // studs of light grey deck. Set it as dark as a real floor and every
    // down-facing surface in the bay -- the ceiling, the undersides of the
    // catwalks and the light rigs, the tops of frame in any shot taken from
    // deck level -- goes to black.
    g.add(new THREE.HemisphereLight(
      new THREE.Color(0xe2e4e8).convertSRGBToLinear(),
      new THREE.Color(0xa39c90).convertSRGBToLinear(), 1.9,
    ));
  }
  return g;
}
