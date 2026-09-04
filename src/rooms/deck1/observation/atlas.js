// Module-local 1024² display atlas for the observation gallery: star charts (three sectors), the viewing schedule,
// a hull-camera feed, sill heading readouts, dispenser menus, the viewer eyepiece screen and the display case's
// light recognition placard. Dark backgrounds, blue / amber / red Imperial UI in a monospace face. One canvas → one
// emissive material ("obsScreen"), replacing the two bridge stand-in screen textures the critic recognised as the
// bridge template.
import * as THREE from "three";
import { makeCanvas, toTexture, mulberry32 } from "../../../textures.js";

const S = 1024;
const RED = "#ff2a1a";
const AMBER = "#ffa028";
const BLUE = "#3a7bff";
const PALE = "#8fb4ff";
const DIM = "#4a5060";
const GREY = "#9a9ea6";
const BG = "#04060a";

// name → [x, y, w, h] in canvas pixels (y down)
export const CELLS = {
  chartA: [0, 0, 384, 256],
  chartB: [384, 0, 384, 256],
  chartC: [0, 256, 384, 256],
  hullcam: [384, 256, 384, 256],
  dispenser0: [768, 0, 256, 128],
  dispenser1: [768, 128, 256, 128],
  sill0: [768, 256, 256, 48],
  sill1: [768, 304, 256, 48],
  viewer: [768, 352, 128, 64],
  schedule: [0, 512, 512, 256],
  fleet: [512, 512, 512, 256],
};

export function cellRect(name) {
  const [x, y, w, h] = CELLS[name];
  return [x / S, 1 - (y + h) / S, (x + w) / S, 1 - y / S];
}
// width w → matching height for the cell aspect
export function cellSize(name, w) {
  const c = CELLS[name];
  return [w, (w * c[3]) / c[2]];
}

export function makeObservationAtlas() {
  const c = makeCanvas(S, S);
  const ctx = c.getContext("2d");
  const rand = mulberry32(9137);
  const font = (px, bold = true) => `${bold ? "bold " : ""}${px}px "DejaVu Sans Mono", "Liberation Mono", Menlo, Consolas, monospace`;
  const text = (s, x, y, px, color, align = "left", bold = true) => {
    ctx.fillStyle = color;
    ctx.font = font(px, bold);
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(s, x, y);
  };
  const cell = (name, fn) => {
    const [x, y, w, h] = CELLS[name];
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, w, h);
    fn(w, h);
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    for (let yy = 0; yy < h; yy += 3) ctx.fillRect(0, yy, w, 1);
    ctx.strokeStyle = "rgba(143,180,255,0.12)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.restore();
  };
  const grid = (w, h, step, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (let x = step; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = step; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  };
  const stars = (w, h, n, bright = 0.9) => {
    for (let k = 0; k < n; k++) {
      const r = rand();
      const a = r < 0.85 ? 0.25 + rand() * 0.35 : bright;
      ctx.fillStyle = `rgba(${r < 0.92 ? "200,215,255" : r < 0.97 ? "255,190,120" : "255,120,100"},${a})`;
      const sz = r < 0.9 ? 1 : 2;
      ctx.fillRect(rand() * w, rand() * h, sz, sz);
    }
  };
  const ring = (x, y, r, color, width = 1) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  };
  const dot = (x, y, r, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };
  const header = (w, title, right, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, 3);
    text(title, 12, 17, 13, color);
    if (right) text(right, w - 12, 17, 10, GREY, "right", false);
  };

  // --- star charts: a sector map with named systems, a plotted course and a scale bar; three sectors
  const chart = (name, sector, course, accent) =>
    cell(name, (w, h) => {
      grid(w, h, 32, "rgba(58,123,255,0.10)");
      stars(w, h, 260);
      header(w, `SECTOR ${sector} · NAV CHART`, "SCALE 1 : 2.4 PC", BLUE);
      // systems: ring + label
      const systems = [];
      for (let k = 0; k < 7; k++) {
        const x = 40 + rand() * (w - 80);
        const y = 44 + rand() * (h - 84);
        systems.push([x, y]);
        ring(x, y, 5 + rand() * 4, "rgba(143,180,255,0.8)");
        dot(x, y, 1.5, PALE);
        text(`${["KESSEL", "ORD", "TARN", "VELIS", "ANOAT", "RHEN", "SULLUST", "DOR", "BESTINE", "ISON"][Math.floor(rand() * 10)]}-${Math.floor(rand() * 90 + 10)}`, x + 9, y - 7, 8, GREY, "left", false);
      }
      // course: polyline through three systems, amber, with an arrowhead and waypoint ticks
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      course.forEach((i, k) => (k ? ctx.lineTo(systems[i][0], systems[i][1]) : ctx.moveTo(systems[i][0], systems[i][1])));
      ctx.stroke();
      ctx.setLineDash([]);
      for (const i of course) ring(systems[i][0], systems[i][1], 11, accent, 1);
      // ship marker on the first waypoint
      const [sx, sy] = systems[course[0]];
      ctx.fillStyle = RED;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 9);
      ctx.lineTo(sx + 5, sy + 6);
      ctx.lineTo(sx - 5, sy + 6);
      ctx.closePath();
      ctx.fill();
      // footer: scale bar + coordinates
      ctx.fillStyle = GREY;
      ctx.fillRect(12, h - 14, 60, 1);
      ctx.fillRect(12, h - 17, 1, 6);
      ctx.fillRect(72, h - 17, 1, 6);
      text("2.4 PC", 78, h - 13, 8, GREY, "left", false);
      text(`GRID ${sector}-${Math.floor(rand() * 900 + 100)} · HYPERLANE ${["CORELLIAN", "HYDIAN", "RIMMA", "PERLEMIAN"][Math.floor(rand() * 4)]}`, w - 12, h - 13, 8, DIM, "right", false);
    });
  chart("chartA", "R-7", [1, 3, 5, 2], AMBER);
  chart("chartB", "M-22", [0, 4, 6], AMBER);
  chart("chartC", "K-04", [2, 5, 1, 6], RED);

  // --- hull camera feed: starfield beyond the hull edge, camera frame corners, telemetry
  cell("hullcam", (w, h) => {
    stars(w, h, 320, 1.0);
    // hull edge: dark wedge along the lower-left with a lit rim line
    ctx.fillStyle = "#0d1015";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    ctx.lineTo(w * 0.62, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(180,190,210,0.55)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.55);
    ctx.lineTo(w * 0.62, h);
    ctx.stroke();
    // greebles on the hull
    ctx.fillStyle = "rgba(120,130,150,0.35)";
    for (let k = 0; k < 14; k++) {
      const t = rand();
      const x = t * w * 0.6;
      const y = h * 0.55 + t * h * 0.45 + 6 + rand() * 30;
      if (y < h - 4) ctx.fillRect(x, y, 4 + rand() * 14, 2 + rand() * 3);
    }
    // frame corners + reticle
    ctx.strokeStyle = "rgba(143,180,255,0.7)";
    ctx.lineWidth = 2;
    for (const [cx, cy, dx, dy] of [[14, 30, 1, 1], [w - 14, 30, -1, 1], [14, h - 14, 1, -1], [w - 14, h - 14, -1, -1]]) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + dy * 18);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + dx * 18, cy);
      ctx.stroke();
    }
    ring(w * 0.5, h * 0.48, 22, "rgba(143,180,255,0.5)");
    ctx.beginPath();
    ctx.moveTo(w * 0.5 - 32, h * 0.48);
    ctx.lineTo(w * 0.5 - 26, h * 0.48);
    ctx.moveTo(w * 0.5 + 26, h * 0.48);
    ctx.lineTo(w * 0.5 + 32, h * 0.48);
    ctx.moveTo(w * 0.5, h * 0.48 - 32);
    ctx.lineTo(w * 0.5, h * 0.48 - 26);
    ctx.stroke();
    header(w, "HULL CAM 14 · PORT DORSAL", "LIVE", BLUE);
    dot(w - 40, 17, 3, RED);
    text("BRG 227.4  PITCH -02.1  ROLL +00.0", 12, h - 26, 9, PALE, "left", false);
    text("V 0.31c   RANGE ∞   FILTER: NONE", 12, h - 12, 9, GREY, "left", false);
    text("T+ 0771.3 · 14:02:51", w - 12, h - 12, 9, AMBER, "right", false);
  });

  // --- dispenser menus (two variants)
  for (let i = 0; i < 2; i++) {
    cell("dispenser" + i, (w, h) => {
      header(w, i ? "GALLEY UNIT 2 · RATIONS" : "GALLEY UNIT 1 · BEVERAGE", "READY", AMBER);
      const items = i ? [["FIELD RATION A", "12"], ["FIELD RATION C", "04"], ["PROTEIN BAR", "31"], ["FRUIT PASTE", "--"]] : [["CAF · HOT", "OK"], ["CAF · COLD", "OK"], ["WATER", "OK"], ["STIM · BLUE", "LOW"]];
      items.forEach((it, k) => {
        const yy = 40 + k * 18;
        text(it[0], 14, yy, 10, GREY, "left", false);
        text(it[1], w - 14, yy, 10, it[1] === "LOW" || it[1] === "--" ? RED : AMBER, "right");
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fillRect(14, yy + 8, w - 28, 1);
      });
      ctx.fillStyle = AMBER;
      ctx.fillRect(14, h - 14, (w - 28) * (i ? 0.4 : 0.75), 4);
      text(i ? "STOCK 40%" : "TEMP 82°", w - 14, h - 12, 8, DIM, "right", false);
    });
  }

  // --- sill heading readouts (per bay, two variants): bearing tape + range and the object in view
  for (let i = 0; i < 2; i++) {
    cell("sill" + i, (w, h) => {
      ctx.fillStyle = "rgba(143,180,255,0.35)";
      for (let x = 8; x < w * 0.55; x += 8) ctx.fillRect(x, 6, 1, x % 40 === 8 ? 10 : 5);
      ctx.fillStyle = RED;
      ctx.fillRect(w * 0.28 - 1, 4, 2, 14);
      text(i ? "BRG 231.0" : "BRG 227.4", 8, h - 12, 10, PALE);
      text(i ? "RANGE 4.2 AU" : "RANGE 0.9 AU", w * 0.56, 12, 9, GREY, "left", false);
      text(i ? "GAS GIANT · VELIS IV" : "DEBRIS FIELD · CLEAR", w * 0.56, h - 12, 9, i ? AMBER : GREY, "left", false);
      ctx.fillStyle = i ? AMBER : BLUE;
      ctx.fillRect(w - 10, 6, 4, h - 12);
    });
  }

  // --- viewer eyepiece screen: reticle + magnification
  cell("viewer", (w, h) => {
    ring(w * 0.3, h * 0.5, 16, "rgba(143,180,255,0.8)");
    ring(w * 0.3, h * 0.5, 6, "rgba(143,180,255,0.6)");
    ctx.strokeStyle = "rgba(143,180,255,0.6)";
    ctx.beginPath();
    ctx.moveTo(w * 0.3 - 22, h * 0.5);
    ctx.lineTo(w * 0.3 + 22, h * 0.5);
    ctx.moveTo(w * 0.3, h * 0.5 - 22);
    ctx.lineTo(w * 0.3, h * 0.5 + 22);
    ctx.stroke();
    text("MAG 40x", w * 0.55, 18, 10, AMBER);
    text("TRK OFF", w * 0.55, 34, 9, GREY, "left", false);
    text("227.4", w * 0.55, 50, 9, PALE, "left", false);
  });

  // --- viewing schedule: what passes the port windows this watch
  cell("schedule", (w, h) => {
    header(w, "OBSERVATION GALLERY · VIEWING SCHEDULE", "WATCH BETA · 0771.3", BLUE);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(12, 32, w - 24, 20);
    text("TIME", 20, 42, 10, GREY);
    text("OBJECT", 100, 42, 10, GREY);
    text("BEARING", 300, 42, 10, GREY);
    text("MAG", 390, 42, 10, GREY);
    text("STATUS", w - 20, 42, 10, GREY, "right");
    const rows = [
      ["14:10", "VELIS IV · GAS GIANT", "231.0", "-3.1", "IN VIEW", AMBER],
      ["14:35", "RING SYSTEM · VELIS IV", "233.4", "-1.4", "IN VIEW", AMBER],
      ["15:20", "ESCORT GROUP · FRIGATE ×3", "225.8", "+2.0", "SCHEDULED", GREY],
      ["16:05", "DEBRIS FIELD · CLEARED LANE", "227.4", "+4.4", "SCHEDULED", GREY],
      ["17:40", "NEBULA EDGE · ANOAT", "240.2", "-0.6", "SCHEDULED", GREY],
      ["18:30", "HYPERSPACE JUMP", "---", "---", "HOLD", RED],
      ["19:15", "ISON STAR · TRANSIT", "218.9", "-4.8", "AFTER JUMP", DIM],
    ];
    rows.forEach((r, k) => {
      const yy = 66 + k * 22;
      if (k % 2) {
        ctx.fillStyle = "rgba(255,255,255,0.025)";
        ctx.fillRect(12, yy - 10, w - 24, 20);
      }
      text(r[0], 20, yy, 10, PALE, "left", false);
      text(r[1], 100, yy, 10, GREY, "left", false);
      text(r[2], 300, yy, 10, GREY, "left", false);
      text(r[3], 390, yy, 10, GREY, "left", false);
      text(r[4], w - 20, yy, 10, r[5], "right");
    });
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(12, h - 26, w - 24, 1);
    text("GALLERY OPEN TO ALL RANKS · SILENCE DURING BRIEFINGS · NO RECORDING DEVICES", 12, h - 13, 9, DIM, "left", false);
  });

  // --- recognition placard behind the ship model in the display case (dressing.js): the one light plate in the
  // atlas — a backlit museum card in ink line-work, not a dark UI screen — side elevation and plan of the wedge hull
  // with dimension bars. Emissive 1.0 × #a6aab2 ≈ 0.39 radiance: a lit light-grey plate, well under the strips.
  cell("fleet", (w, h) => {
    const INK = "#1c2230";
    ctx.fillStyle = "#a6aab2";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    text("RECOGNITION PROFILE · WEDGE-HULL CAPITAL", 22, 30, 14, INK);
    text("SCALE 1 : 1600", w - 22, 30, 10, INK, "right", false);
    ctx.fillStyle = INK;
    ctx.fillRect(22, 44, w - 44, 2);
    ctx.lineWidth = 2.5;
    const poly = (pts, close = false) => {
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      if (close) ctx.closePath();
      ctx.stroke();
    };
    // side elevation, nose left: hull, terrace, tower, bridge, belly
    const ex = 30;
    const ey = 132;
    const L = 240;
    poly([[ex, ey], [ex + L, ey - 22], [ex + L, ey + 14]], true);
    poly([[ex + 110, ey - 10], [ex + 110, ey - 30], [ex + 222, ey - 30], [ex + 222, ey - 20]]);
    poly([[ex + 160, ey - 30], [ex + 160, ey - 46], [ex + 190, ey - 46], [ex + 190, ey - 30]]);
    poly([[ex + 150, ey - 46], [ex + 200, ey - 46], [ex + 200, ey - 54], [ex + 150, ey - 54]], true);
    poly([[ex + 60, ey + 5], [ex + 180, ey + 5], [ex + 180, ey + 26], [ex + 100, ey + 26]], true);
    // plan view, nose left: hull triangle, terrace outline, centreline
    const px = 300;
    const py = 130;
    poly([[px, py], [px + 180, py - 58], [px + 180, py + 58]], true);
    poly([[px + 95, py - 11], [px + 176, py - 11], [px + 176, py + 11], [px + 95, py + 11]], true);
    ctx.setLineDash([4, 4]);
    poly([[px + 6, py], [px + 178, py]]);
    ctx.setLineDash([]);
    // dimension bars
    const dim = (x0, x1, yy, label) => {
      ctx.fillStyle = INK;
      ctx.fillRect(x0, yy, x1 - x0, 1);
      ctx.fillRect(x0, yy - 5, 1, 10);
      ctx.fillRect(x1 - 1, yy - 5, 1, 10);
      text(label, (x0 + x1) / 2, yy + 11, 9, INK, "center", false);
    };
    dim(ex, ex + L, ey + 44, "LOA 1 600 M");
    dim(px, px + 180, py + 78, "BEAM 900 M · DRAUGHT 440 M");
    text("FLEET ARCHIVE · DECK 1 OBSERVATION GALLERY", 22, h - 22, 9, INK, "left", false);
    text("CLASS: LINE DESTROYER · HULL 3", w - 22, h - 22, 9, INK, "right", false);
  });

  return toTexture(c, { srgb: true, wrap: false, anisotropy: 4 });
}

// manifest.materials(shared) hook: one emissive material for every display in the module
export function observationMaterials() {
  const tex = makeObservationAtlas();
  return {
    obsScreen: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.0, roughness: 0.42, metalness: 0, envMapIntensity: 0.4 }),
  };
}
