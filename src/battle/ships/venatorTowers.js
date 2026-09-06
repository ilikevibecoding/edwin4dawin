// Venator rear superstructure: two stepped terraces on the deck, the sloped-front block that joins the
// towers at their base (light plated front, near-black sides that run straight up into the shafts), a
// stepped structure falling away behind it toward the stern, and the two tall, aft-leaning bridge shafts,
// each ending in a long T-shaped head (rounded nose projecting well forward, window band) with a sensor
// block and mast on top. Proportions from venatorSpec (TOWER / BLOCK).
import * as THREE from "three";
import { yLoft, prismPoly, quadFacing, cylZ, tube } from "./venatorKit.js";
import { boxMM } from "./shipKit.js";
import {
  Z,
  halfW,
  DECK_Y,
  BLOCK,
  TOWER,
  GREY_DECK,
  GREY_WING,
  GREY_TOWER,
  GREY_SIDE,
  GREY_FLANK,
  DARK,
  DARK_SEAM,
  DARK_TRENCH,
  WINDOW_WARM,
  WINDOW_COOL,
  ROW_WARM,
  ROW_COOL,
} from "./venatorSpec.js";

const rect = (hx, z0, z1) => [
  [-hx, Z(z0)],
  [hx, Z(z0)],
  [hx, Z(z1)],
  [-hx, Z(z1)],
];
// plan rectangle whose x extent follows the hull taper (inset from the deck edge)
const taperRect = (inset, z0, z1) => [
  [-(halfW(z0) - inset), Z(z0)],
  [halfW(z0) - inset, Z(z0)],
  [halfW(z1) - inset, Z(z1)],
  [-(halfW(z1) - inset), Z(z1)],
];
// side tags for a 4-point plan: front (edge 0: -x -> +x at z0), starboard, back, port
const SIDE_TAGS = ["front", "side", "back", "side"];

// box lying on a sloped face: `fr` = { p (centre on the face), n (unit normal), u (across), v (up-slope) }
function faceBox(fr, w, h, d, lift = 0) {
  const g = new THREE.BoxGeometry(w, d, h); // w along u, d along n, h along v
  const m = new THREE.Matrix4().makeBasis(fr.u, fr.n, fr.v);
  m.setPosition(fr.p.clone().addScaledVector(fr.n, d / 2 + lift));
  g.applyMatrix4(m);
  return g;
}

export function buildTowers(ctx) {
  const { fine, mid, add, hullTexel, rand } = ctx;
  const addPrism = (pl, tints) => {
    for (const [tag, geo] of Object.entries(pl)) {
      const tint = tints[tag] ?? tints.side;
      add(geo, "hull", { color: tint, texel: hullTexel });
    }
  };
  const terraceTints = {
    front: GREY_DECK,
    side: GREY_TOWER,
    back: GREY_TOWER,
    top: GREY_WING,
  };
  const towerTints = {
    front: GREY_DECK,
    side: GREY_SIDE,
    back: GREY_TOWER,
    top: GREY_WING,
  };

  // ---- terraces (front faces sloped)
  const t1 = BLOCK.t1;
  addPrism(
    yLoft(
      [
        { y: DECK_Y, pts: taperRect(t1.inset, t1.z0, t1.z1) },
        { y: t1.y1, pts: taperRect(t1.inset + 4, t1.z0 + 22, t1.z1 - 3) },
      ],
      { tags: SIDE_TAGS, capStart: false, capEnd: true, capTag: "top" },
    ),
    terraceTints,
  );
  const t2 = BLOCK.t2;
  addPrism(
    yLoft(
      [
        { y: t1.y1, pts: rect(t2.hx, t2.z0, t2.z1) },
        { y: t2.y1, pts: rect(t2.hx - 6, t2.z0 + 18, t2.z1 - 3) },
      ],
      { tags: SIDE_TAGS, capStart: false, capEnd: true, capTag: "top" },
    ),
    terraceTints,
  );

  // ---- base block joining the towers: long sloped front from the deck to the tower feet
  const b = BLOCK.base;
  addPrism(
    yLoft(
      [
        { y: DECK_Y, pts: rect(b.hx0, b.z0, b.z1) },
        { y: b.y1, pts: rect(b.hx1, b.zTop0, b.z1) },
      ],
      { tags: SIDE_TAGS, capStart: false, capEnd: true, capTag: "top" },
    ),
    { ...towerTints, top: GREY_DECK },
  );
  // frame on the sloped front at height fraction f: centre, normal, across (u) and up-slope (v)
  const frontN = new THREE.Vector3(
    0,
    b.zTop0 - b.z0,
    -(b.y1 - DECK_Y),
  ).normalize();
  const frontV = new THREE.Vector3(
    0,
    b.y1 - DECK_Y,
    b.zTop0 - b.z0,
  ).normalize();
  const frontFrame = (f, x = 0) => ({
    p: new THREE.Vector3(
      x,
      DECK_Y + (b.y1 - DECK_Y) * f,
      Z(b.z0 + (b.zTop0 - b.z0) * f),
    ),
    n: frontN,
    u: new THREE.Vector3(1, 0, 0),
    v: frontV,
  });
  const frontHx = (f) => b.hx0 + (b.hx1 - b.hx0) * f;
  const slopeLen = Math.hypot(b.y1 - DECK_Y, b.zTop0 - b.z0);
  if (mid) {
    // bold stacked plate rows (the reference block front is a ziggurat of thick light plates over dark
    // seams): a dark groove per row, then two or three raised plates of random width per row
    const n = fine ? 6 : 3;
    for (let i = 0; i < n; i++) {
      const f0 = i / n;
      const f1 = (i + 1) / n;
      const fm = (f0 + f1) / 2;
      const rowH = (f1 - f0) * slopeLen;
      if (i > 0)
        add(
          faceBox(frontFrame(f0), frontHx(f0) * 2 - 6, 1.6, 0.3, 0.05),
          "dark",
          {
            color: DARK_SEAM,
            texel: 1 / 4,
          },
        );
      const hx = frontHx(fm) - 4;
      const k = fine ? 2 + Math.floor(rand() * 2) : 1;
      let x = -hx;
      for (let j = 0; j < k; j++) {
        const w = j === k - 1 ? hx - x : ((2 * hx) / k) * (0.7 + rand() * 0.5);
        const cxp = x + w / 2;
        x += w;
        if (rand() < 0.2 && fine) continue;
        add(
          faceBox(
            frontFrame(fm, cxp),
            w - 4,
            rowH - 5,
            2.4 + rand() * 1.2,
            0.1,
          ),
          "hull",
          { color: GREY_DECK, texel: 1 / 12 },
        );
        if (fine && rand() < 0.6)
          add(
            faceBox(
              frontFrame(fm, cxp + (rand() - 0.5) * w * 0.4),
              w * 0.4,
              rowH * 0.4,
              1.6,
              3.0,
            ),
            "hull",
            { color: GREY_WING, texel: 1 / 10 },
          );
      }
      // a lit slit per row (the film block front has window strips between the plates)
      if (fine && i % 2 === 1)
        add(
          faceBox(frontFrame(f0 + 0.02, 0), hx * 0.8, 0.9, 0.15, 0.2),
          "windows",
          {
            color: i % 4 === 1 ? ROW_WARM : ROW_COOL,
            uv: "keep",
          },
        );
    }
  }
  // dark recess between the shafts above the block top, spanned by two light cross-bars
  const T = TOWER;
  const gapHalf = T.x - T.hx0;
  add(
    boxMM(
      [-gapHalf + 0.5, b.y1 - 0.2, Z(T.z0 - T.hz0 + 8)],
      [gapHalf - 0.5, b.y1 + 22, Z(b.z1 - 6)],
    ),
    "dark",
    { color: DARK_TRENCH, texel: 1 / 8 },
  );
  if (mid) {
    for (const [zr, y] of [
      [T.z0 - T.hz0 + 10, b.y1 + 16],
      [T.z0 + 6, b.y1 + 22],
    ])
      add(
        boxMM([-gapHalf - 0.6, y, Z(zr)], [gapHalf + 0.6, y + 4, Z(zr) + 10]),
        "hull",
        {
          color: GREY_DECK,
          texel: 1 / 6,
        },
      );
    add(
      quadFacing(
        [0, b.y1 + 10, Z(T.z0 - T.hz0 + 7.8)],
        [0, 0, -1],
        [0, 1, 0],
        gapHalf * 1.4,
        1.6,
      ),
      "windows",
      { color: ROW_WARM, uv: "keep" },
    );
  }

  // ---- stepped structure behind the towers, down toward the stern; each step's rear face carries a
  // dark machinery recess with a window row (the cutaway packs the hyperdrive and compressor here)
  let yBelow = b.y1;
  for (const st of BLOCK.steps) {
    const pl = prismPoly(rect(st.hx, st.z0, st.z1), t2.y1 - 0.01, st.y1, {
      inset: 2,
      tags: SIDE_TAGS,
      capTag: "top",
    });
    addPrism(pl, { ...terraceTints, front: GREY_WING });
    if (mid) {
      const yTopFace = st.y1;
      const yBot = t2.y1;
      const h = yTopFace - yBot;
      add(
        boxMM(
          [-st.hx + 6, yBot + h * 0.35, Z(st.z1) - 1.5],
          [st.hx - 6, yBot + h * 0.7, Z(st.z1) + 0.6],
        ),
        "dark",
        { color: DARK_TRENCH, texel: 1 / 8 },
      );
      add(
        quadFacing(
          [0, yBot + h * 0.52, Z(st.z1) + 0.8],
          [0, 0, 1],
          [0, 1, 0],
          st.hx * 1.5,
          1.8,
        ),
        "windows",
        { color: ROW_WARM, uv: "keep" },
      );
      // the exposed strip of the mass in front of this step, above it: dark band with vents
      add(
        boxMM(
          [-st.hx + 10, st.y1 + 3, Z(st.z0) - 1.2],
          [st.hx - 10, Math.min(yBelow - 3, st.y1 + 12), Z(st.z0) + 0.4],
        ),
        "dark",
        { color: DARK_TRENCH, texel: 1 / 8 },
      );
      if (fine)
        for (let i = 0; i < 6; i++) {
          const x = (rand() - 0.5) * (st.hx * 1.6);
          const w = 3 + rand() * 6;
          const d = 3 + rand() * 8;
          const z0 = Z(st.z0 + 8) + rand() * (st.z1 - st.z0 - 16 - d);
          add(
            boxMM(
              [x - w / 2, st.y1, z0],
              [x + w / 2, st.y1 + 1 + rand() * 3, z0 + d],
            ),
            rand() < 0.5 ? "dark" : "hull",
            { color: rand() < 0.5 ? DARK : GREY_FLANK, texel: 1 / 4 },
          );
        }
    }
    yBelow = st.y1;
  }
  if (mid) {
    // engine housings: two long cowls on the upper terrace either side of the steps, and sensor domes
    for (const s of [-1, 1]) {
      add(
        cylZ(12, 14, 150, 10).translate(s * 108, t2.y1 + 4, Z(1010)),
        "hull",
        {
          color: GREY_TOWER,
          texel: hullTexel,
        },
      );
      add(
        boxMM([s * 96 - 10, t2.y1, Z(940)], [s * 96 + 10, t2.y1 + 8, Z(1090)]),
        "hull",
        {
          color: GREY_WING,
          texel: hullTexel,
        },
      );
    }
    // dome (deflector generator) on the rear step and two dishes
    add(
      new THREE.SphereGeometry(
        16,
        10,
        6,
        0,
        Math.PI * 2,
        0,
        Math.PI / 2,
      ).translate(0, BLOCK.steps[1].y1, Z(1058)),
      "hull",
      { color: GREY_WING, texel: 1 / 10 },
    );
    for (const s of [-1, 1])
      add(
        new THREE.SphereGeometry(
          7,
          8,
          5,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2,
        ).translate(s * 40, BLOCK.steps[0].y1, Z(1000)),
        "hull",
        { color: GREY_WING, texel: 1 / 8 },
      );
  }

  // ---- the two shafts: tapering, leaning aft; light front face, near-black sides
  for (const s of [-1, 1]) {
    const cx = s * T.x;
    const shaft = yLoft(
      [
        {
          y: T.y0 - 0.5,
          pts: rect(T.hx0, T.z0 - T.hz0, T.z0 + T.hz0).map(([x, z]) => [
            x + cx,
            z,
          ]),
        },
        {
          y: T.y1,
          pts: rect(T.hx1, T.z0 + T.lean - T.hz1, T.z0 + T.lean + T.hz1).map(
            ([x, z]) => [x + cx, z],
          ),
        },
      ],
      { tags: SIDE_TAGS, capStart: false, capEnd: false },
    );
    addPrism(shaft, towerTints);
    const shaftN = new THREE.Vector3(
      0,
      T.lean - (T.hz1 - T.hz0),
      -(T.y1 - T.y0),
    ).normalize();
    const shaftV = new THREE.Vector3(
      0,
      T.y1 - T.y0,
      T.lean - (T.hz1 - T.hz0),
    ).normalize();
    const shaftFrame = (f, dx = 0) => ({
      p: new THREE.Vector3(
        cx + dx,
        T.y0 + (T.y1 - T.y0) * f,
        Z(T.z0 - T.hz0 + (T.lean - (T.hz1 - T.hz0)) * f),
      ),
      n: shaftN,
      u: new THREE.Vector3(1, 0, 0),
      v: shaftV,
    });
    if (mid) {
      // plate rows continue up the shaft front, with a lit window slit between rows
      const n = fine ? 6 : 3;
      for (let i = 0; i < n; i++) {
        const f0 = i / n;
        const f1 = (i + 1) / n;
        const fm = (f0 + f1) / 2;
        const hx = T.hx0 + (T.hx1 - T.hx0) * fm;
        const rowH = ((f1 - f0) * (T.y1 - T.y0)) / shaftV.y;
        add(faceBox(shaftFrame(fm), hx * 2 - 5, rowH - 3.5, 1.2, 0.1), "hull", {
          color: GREY_DECK,
          texel: 1 / 10,
        });
        add(
          faceBox(shaftFrame(f0 + 0.01), hx * 1.5, 1.2, 0.15, 0.2),
          "windows",
          {
            color: i % 2 ? ROW_COOL : ROW_WARM,
            uv: "keep",
          },
        );
      }
      // inner-face light strip (the reference shows the inner faces lit)
      add(
        quadFacing(
          [
            cx - (s * (T.hx0 + T.hx1)) / 2 - s * 0.15,
            (T.y0 + T.y1) / 2,
            Z(T.z0 + T.lean / 2),
          ],
          [-s, 0, 0],
          [0, 1, 0],
          1.2,
          T.y1 - T.y0 - 12,
        ),
        "windows",
        { color: ROW_COOL, uv: "keep" },
      );
      // dark side panels (window slots) on the outer face
      for (let i = 0; i < (fine ? 4 : 2); i++) {
        const f = (i + 0.5) / (fine ? 4 : 2);
        const y = T.y0 + (T.y1 - T.y0) * f;
        const hx = T.hx0 + (T.hx1 - T.hx0) * f;
        const zr = T.z0 + T.lean * f;
        add(
          quadFacing(
            [cx + s * (hx + 0.15), y, Z(zr)],
            [s, 0, 0],
            [0, 1, 0],
            T.hz0 * 1.1,
            2.2,
          ),
          "windows",
          { color: ROW_WARM, uv: "keep" },
        );
      }
    }
    // ---- T-head: long, rounded nose projecting forward, overhanging the shaft; window band; sensors
    const hz = T.headHz;
    const hx = T.headHx;
    const zc = Z(T.headZ);
    const rr = hx * 0.5; // plan radius of the two front corners (the front is otherwise flat)
    const plan = (kx, kz) => {
      const pts = [];
      // back corners square; front corners rounded with 3-segment arcs, flat between them
      pts.push([cx - hx * kx, zc + hz * kz], [cx + hx * kx, zc + hz * kz]);
      const r = rr * kx;
      const zf = zc - (hz * kz - r);
      for (let i = 0; i <= 3; i++) {
        const a = (i / 3) * (Math.PI / 2); // +x side around to the front
        pts.push([cx + (hx * kx - r) + r * Math.cos(a), zf - r * Math.sin(a)]);
      }
      for (let i = 0; i <= 3; i++) {
        const a = Math.PI / 2 + (i / 3) * (Math.PI / 2); // front around to the −x side
        pts.push([cx - (hx * kx - r) + r * Math.cos(a), zf - r * Math.sin(a)]);
      }
      return pts;
    };
    const head = yLoft(
      [
        { y: T.headY0 - 0.3, pts: plan(0.8, 0.86) },
        { y: T.headY0 + 4, pts: plan(1, 1) },
        { y: T.headY1 - 2.5, pts: plan(1, 1) },
        { y: T.headY1, pts: plan(0.94, 0.97) },
      ],
      { capStart: true, capEnd: true, capTag: "top" },
    );
    add(head.hull, "hull", { color: GREY_DECK, texel: hullTexel });
    add(head.top, "hull", { color: GREY_WING, texel: hullTexel });
    // dark bands along the head sides (the reference heads carry dark side panels), lit window arc
    const yw = T.headY0 + 10;
    for (const sx of [-1, 1])
      add(
        boxMM(
          [cx + sx * hx - 0.6, T.headY0 + 6, zc - hz * 0.25],
          [cx + sx * hx + 0.6, T.headY0 + 15, zc + hz * 0.95],
        ),
        "hull",
        { color: GREY_SIDE, texel: 1 / 8 },
      );
    if (mid) {
      // bridge windows: a band across the flat front and around both corners
      add(
        quadFacing(
          [cx, yw, zc - hz - 0.2],
          [0, 0, -1],
          [0, 1, 0],
          2 * (hx - rr) + 1,
          2.6,
        ),
        "windows",
        { color: WINDOW_WARM, uv: "keep" },
      );
      const segs = fine ? 3 : 1;
      for (const sx of [-1, 1])
        for (let i = 0; i < segs; i++) {
          const a0 = (i / segs) * (Math.PI / 2);
          const a1 = ((i + 1) / segs) * (Math.PI / 2);
          const am = (a0 + a1) / 2;
          const r = rr + 0.2;
          const c = [
            cx + sx * (hx - rr + r * Math.cos(am)),
            yw,
            zc - (hz - rr) - r * Math.sin(am),
          ];
          const w = 2 * r * Math.sin((a1 - a0) / 2) - 0.6;
          add(
            quadFacing(
              c,
              [sx * Math.cos(am), 0, -Math.sin(am)],
              [0, 1, 0],
              w,
              2.6,
            ),
            "windows",
            { color: WINDOW_WARM, uv: "keep" },
          );
        }
      for (const sx of [-1, 1])
        add(
          quadFacing(
            [cx + sx * (hx + 0.8), yw, zc + hz * 0.35],
            [sx, 0, 0],
            [0, 1, 0],
            hz * 1.1,
            2.0,
          ),
          "windows",
          { color: WINDOW_WARM, uv: "keep" },
        );
      add(
        quadFacing(
          [cx, yw, zc + hz + 0.2],
          [0, 0, 1],
          [0, 1, 0],
          hx * 1.6,
          2.0,
        ),
        "windows",
        {
          color: WINDOW_COOL,
          uv: "keep",
        },
      );
      // chin block under the nose and a lit hangar-like slot at the head's rear
      add(
        boxMM(
          [cx - hx * 0.5, T.headY0 - 5, zc - hz * 0.55],
          [cx + hx * 0.5, T.headY0, zc + hz * 0.2],
        ),
        "hull",
        {
          color: GREY_TOWER,
          texel: 1 / 8,
        },
      );
    }
    // sensor block and mast on top, over the rear half of the head
    add(
      boxMM(
        [cx - 12, T.headY1 - 0.2, zc - 2],
        [cx + 12, T.sensorY1, zc + hz - 6],
      ),
      "hull",
      {
        color: GREY_WING,
        texel: 1 / 8,
      },
    );
    add(
      boxMM(
        [cx - 12.6, T.sensorY1 - 5, zc - 2.6],
        [cx + 12.6, T.sensorY1 - 2, zc + hz - 5.4],
      ),
      "hull",
      {
        color: GREY_SIDE,
        texel: 1 / 8,
      },
    );
    if (mid) {
      add(
        boxMM(
          [cx - 7, T.sensorY1, zc + 8],
          [cx + 7, T.sensorY1 + 4, zc + hz - 12],
        ),
        "hull",
        {
          color: GREY_DECK,
          texel: 1 / 4,
        },
      );
      add(
        boxMM(
          [cx - 4, T.sensorY1 + 4, zc + 12],
          [cx + 4, T.sensorY1 + 6, zc + hz - 16],
        ),
        "dark",
        {
          color: DARK,
          texel: 1 / 4,
        },
      );
      // comm dish (rim + hub) and the mast with its cross-bar and running light
      add(
        new THREE.CylinderGeometry(6, 6, 0.8, 12, 1, true)
          .rotateX(Math.PI / 2)
          .translate(cx - 6, T.sensorY1 + 7, zc - 2),
        "dark",
        { color: DARK, texel: 1 / 3 },
      );
      add(
        tube(
          [cx - 6, T.sensorY1, zc - 2],
          [cx - 6, T.sensorY1 + 7, zc - 2],
          0.9,
          6,
        ),
        "dark",
        {
          color: DARK,
          texel: 1 / 3,
        },
      );
      add(
        tube(
          [cx + 6, T.sensorY1 + 6, zc + 16],
          [cx + 6, T.sensorY1 + 18, zc + 16],
          0.7,
          6,
        ),
        "dark",
        {
          color: DARK,
          texel: 1 / 3,
        },
      );
      add(
        boxMM(
          [cx + 1, T.sensorY1 + 15, zc + 15.4],
          [cx + 11, T.sensorY1 + 15.8, zc + 16.6],
        ),
        "dark",
        {
          color: DARK,
          texel: 1 / 3,
        },
      );
      add(
        quadFacing(
          [cx + 6, T.sensorY1 + 18.3, zc + 16],
          [0, 1, 0],
          [0, 0, -1],
          1.2,
          1.2,
        ),
        "windows",
        {
          color: 0xffffff,
          uv: "keep",
        },
      );
    }
    if (fine) {
      // greebles on the shaft flanks and the head underside
      for (let i = 0; i < 8; i++) {
        const y = T.y0 + 8 + rand() * (T.y1 - T.y0 - 16);
        const f = (y - T.y0) / (T.y1 - T.y0);
        const hxs = T.hx0 + (T.hx1 - T.hx0) * f;
        const zr = T.z0 + T.lean * f + (rand() - 0.5) * 30;
        add(
          boxMM(
            [cx + s * (hxs - 0.5), y - 1.5, Z(zr) - 3],
            [cx + s * (hxs + 1.4), y + 1.5, Z(zr) + 3],
          ),
          "dark",
          { color: DARK, texel: 1 / 3 },
        );
      }
      for (let i = 0; i < 5; i++) {
        const x = cx + (rand() - 0.5) * hx * 1.4;
        const zr = T.headZ - hz * 0.7 + rand() * hz * 1.2;
        add(
          boxMM(
            [x - 2, T.headY0 - 1.6, Z(zr) - 3],
            [x + 2, T.headY0 + 0.4, Z(zr) + 3],
          ),
          "dark",
          {
            color: DARK,
            texel: 1 / 3,
          },
        );
      }
    }
  }
  // ---- machinery bands along the terrace walls (the reference shows the shoulder plates overhanging
  // recesses packed with dark and light machinery): boxes standing against the t1 and t2 side faces
  if (mid) {
    for (const s of [-1, 1]) {
      const step = fine ? 9 : 24;
      for (let zr = t1.z0 + 30; zr < t1.z1 - 12; zr += step) {
        const xw = halfW(zr) - t1.inset - 2; // t1 side face (slightly inset over its height)
        if (rand() < 0.75) {
          const h = 2 + rand() * (t1.y1 - DECK_Y - 4);
          const d = 2.5 + rand() * (step - 3);
          const w = 1.5 + rand() * 3.5;
          const light = rand() < 0.3;
          add(
            boxMM(
              [Math.min(s * xw, s * (xw + w)), DECK_Y, Z(zr)],
              [Math.max(s * xw, s * (xw + w)), DECK_Y + h, Z(zr) + d],
            ),
            light ? "hull" : "dark",
            { color: light ? GREY_FLANK : DARK, texel: light ? 1 / 6 : 1 / 3 },
          );
        }
        if (fine && rand() < 0.5)
          add(
            quadFacing(
              [s * (xw + 0.15), DECK_Y + 3 + rand() * 8, Z(zr + step / 2)],
              [s, 0, 0],
              [0, 1, 0],
              step * 0.6,
              1.2,
            ),
            "windows",
            { color: rand() < 0.6 ? ROW_WARM : ROW_COOL, uv: "keep" },
          );
        if (zr > t2.z0 + 20 && zr < t2.z1 - 10 && rand() < 0.6) {
          const xw2 = t2.hx - 2;
          const h = 2 + rand() * (t2.y1 - t1.y1 - 6);
          const d = 2.5 + rand() * (step - 3);
          const w = 1.5 + rand() * 3;
          add(
            boxMM(
              [Math.min(s * xw2, s * (xw2 + w)), t1.y1, Z(zr)],
              [Math.max(s * xw2, s * (xw2 + w)), t1.y1 + h, Z(zr) + d],
            ),
            "dark",
            { color: DARK, texel: 1 / 3 },
          );
        }
      }
    }
  }
  // ---- greebles on the terraces: hatches, vents, small domes
  if (fine) {
    for (let i = 0; i < 40; i++) {
      const s = rand() < 0.5 ? -1 : 1;
      const zr = t1.z0 + 30 + rand() * (t1.z1 - t1.z0 - 50);
      const hx = halfW(zr) - t1.inset - 8;
      const x = s * (t2.hx + 8 + rand() * Math.max(4, hx - t2.hx - 16));
      const w = 3 + rand() * 6;
      const d = 3 + rand() * 8;
      const h = 0.6 + rand() * 2.2;
      add(
        boxMM(
          [x - w / 2, t1.y1, Z(zr) - d / 2],
          [x + w / 2, t1.y1 + h, Z(zr) + d / 2],
        ),
        rand() < 0.6 ? "hull" : "dark",
        { color: rand() < 0.6 ? GREY_FLANK : DARK, texel: 1 / 4 },
      );
    }
  }
}
