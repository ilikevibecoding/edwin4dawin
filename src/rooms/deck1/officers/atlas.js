// Module-local 1024² display atlas for the officers' quarters: nameplates, duty roster, ship status,
// personal log, deck plan, desk terminal, ship schematic, section notices and small labels. Dark
// backgrounds, small dense red/amber Imperial UI. One canvas → one emissive material ("offScreen").
import * as THREE from "three";
import { makeCanvas, toTexture, mulberry32 } from "../../../textures.js";

const S = 1024;
const RED = "#ff2a1a";
const AMBER = "#ffa028";
const DIM = "#5c6068";
const GREY = "#9a9ea6";
const BLUE = "#3a7bff";
const BG = "#050608";

// name → [x, y, w, h] in canvas pixels (y down)
export const CELLS = {};
const NAMES = [
  ["CAPT", "R. VASK", "CABIN 01", "ON DUTY", RED],
  ["CDR", "T. ORRIN", "CABIN 02", "OFF WATCH", DIM],
  ["CDR", "L. DELMAR", "CABIN 03", "OCCUPIED", AMBER],
  ["LT CDR", "A. KETH", "CABIN 04", "ON DUTY", RED],
  ["LT CDR", "M. SAULE", "CABIN 05", "OFF WATCH", DIM],
  ["LT", "E. TARN", "CABIN 06", "OCCUPIED", AMBER],
  ["LT", "J. IMRE", "CABIN 07", "ON DUTY", RED],
  ["LT", "S. HOLT", "CABIN 08", "OCCUPIED", AMBER],
  ["LT", "N. FERRIS", "CABIN 09", "OFF WATCH", DIM],
  ["ENS", "D. QUILL", "CABIN 10", "OCCUPIED", AMBER],
  ["", "WARDROOM", "SECTION 4", "OPEN", AMBER],
  ["", "DUTY OFFICE", "SECTION 4", "MANNED", RED],
];
for (let i = 0; i < 12; i++) CELLS["plate" + i] = [(i % 4) * 256, Math.floor(i / 4) * 80, 256, 80];
CELLS.roster = [0, 240, 512, 320];
CELLS.status = [512, 240, 512, 320];
CELLS.log = [0, 560, 384, 256];
CELLS.deckplan = [384, 560, 384, 256];
CELLS.terminal = [768, 560, 256, 192];
CELLS.utility = [768, 752, 256, 64];
CELLS.schematic = [0, 816, 384, 208];
CELLS.notice = [384, 816, 384, 208];
CELLS.lblService = [768, 816, 192, 52];
CELLS.lblFire = [768, 868, 192, 52];
CELLS.lblServing = [768, 920, 192, 52];
CELLS.lblWeapons = [768, 972, 192, 52];

export function cellRect(name) {
  const [x, y, w, h] = CELLS[name];
  return [x / S, 1 - (y + h) / S, (x + w) / S, 1 - y / S];
}
// metres-per-pixel-consistent size: width w → matching height for the cell aspect
export function cellSize(name, w) {
  const c = CELLS[name];
  return [w, (w * c[3]) / c[2]];
}

export function makeOfficersAtlas() {
  const c = makeCanvas(S, S);
  const ctx = c.getContext("2d");
  const rand = mulberry32(4471);
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
    // faint scanlines
    ctx.fillStyle = "rgba(255,255,255,0.025)";
    for (let yy = 0; yy < h; yy += 4) ctx.fillRect(0, yy, w, 1);
    fn(w, h);
    // bezel line
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);
    ctx.restore();
  };
  const bars = (x, y, w, h, n, color, gap = 3) => {
    ctx.fillStyle = color;
    const bw = (w - gap * (n - 1)) / n;
    for (let k = 0; k < n; k++) ctx.fillRect(x + k * (bw + gap), y + h * (1 - (0.35 + rand() * 0.65)), bw, h);
  };
  const lines = (x, y, w, n, px, color, lh) => {
    for (let k = 0; k < n; k++) {
      const len = 0.35 + rand() * 0.65;
      ctx.fillStyle = color;
      ctx.fillRect(x, y + k * lh, w * len, Math.max(2, px * 0.45));
    }
  };
  const wedge = (x, y, w, h, color) => {
    // top view of a dagger hull + a side view below it (original wedge silhouette)
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.3);
    ctx.lineTo(x + w * 0.92, y);
    ctx.lineTo(x + w, y + h * 0.3);
    ctx.lineTo(x + w * 0.92, y + h * 0.6);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y + h * 0.3);
    ctx.lineTo(x + w * 0.85, y + h * 0.12);
    ctx.moveTo(x + w * 0.3, y + h * 0.3);
    ctx.lineTo(x + w * 0.85, y + h * 0.48);
    ctx.moveTo(x + w * 0.62, y + h * 0.2);
    ctx.lineTo(x + w * 0.62, y + h * 0.4);
    ctx.stroke();
    ctx.strokeRect(x + w * 0.66, y + h * 0.24, w * 0.12, h * 0.12);
    // side view
    const sy = y + h * 0.72;
    ctx.beginPath();
    ctx.moveTo(x, sy + h * 0.2);
    ctx.lineTo(x + w, sy + h * 0.1);
    ctx.lineTo(x + w, sy + h * 0.28);
    ctx.lineTo(x, sy + h * 0.28);
    ctx.closePath();
    ctx.stroke();
    ctx.strokeRect(x + w * 0.6, sy + 0, w * 0.16, h * 0.2);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.68, sy);
    ctx.lineTo(x + w * 0.68, sy - h * 0.12);
    ctx.stroke();
  };

  // --- nameplates
  NAMES.forEach((n, i) => {
    cell("plate" + i, (w, h) => {
      ctx.fillStyle = n[4];
      ctx.fillRect(0, 0, 8, h);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(8, 0, w - 8, 26);
      text(n[0] ? `${n[0]}  ${n[1]}` : n[1], 22, 14, 18, GREY);
      text(n[2], 22, 44, 15, DIM);
      text(n[3], w - 12, 44, 15, n[4] === DIM ? GREY : n[4], "right");
      // small id barcode
      ctx.fillStyle = DIM;
      for (let k = 0; k < 18; k++) if (rand() < 0.6) ctx.fillRect(22 + k * 6, 62, 3, 12);
      text(String(1040 + i * 7), w - 12, 68, 11, DIM, "right", false);
    });
  });

  // --- duty roster
  cell("roster", (w, h) => {
    ctx.fillStyle = RED;
    ctx.fillRect(0, 0, w, 4);
    text("DUTY ROSTER", 16, 24, 22, RED);
    text("DECK 1 · SECTION 4 · CYCLE 0771", w - 16, 24, 13, GREY, "right");
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(16, 42, w - 32, 22);
    text("WATCH", 24, 53, 12, GREY);
    text("STATION", 120, 53, 12, GREY);
    text("OFFICER", 270, 53, 12, GREY);
    text("STATUS", w - 24, 53, 12, GREY, "right");
    const rows = [
      ["ALPHA", "BRIDGE / CON", "CAPT VASK", "ON DUTY", RED],
      ["ALPHA", "TACTICAL", "LT CDR KETH", "ON DUTY", RED],
      ["ALPHA", "NAVIGATION", "LT IMRE", "ON DUTY", RED],
      ["BETA", "COMMS", "CDR DELMAR", "STANDBY", AMBER],
      ["BETA", "ENGINEERING", "LT TARN", "STANDBY", AMBER],
      ["BETA", "HANGAR CTRL", "LT HOLT", "STANDBY", AMBER],
      ["GAMMA", "BRIDGE / CON", "CDR ORRIN", "OFF WATCH", DIM],
      ["GAMMA", "SECURITY", "LT CDR SAULE", "OFF WATCH", DIM],
      ["GAMMA", "SUPPLY", "ENS QUILL", "OFF WATCH", DIM],
    ];
    rows.forEach((r, k) => {
      const yy = 82 + k * 24;
      if (k % 2) {
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.fillRect(16, yy - 11, w - 32, 22);
      }
      text(r[0], 24, yy, 12, GREY, "left", false);
      text(r[1], 120, yy, 12, GREY, "left", false);
      text(r[2], 270, yy, 12, AMBER, "left", false);
      text(r[3], w - 24, yy, 12, r[4] === DIM ? GREY : r[4], "right");
    });
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(16, h - 18, w - 32, 1);
    text("NEXT ROTATION 03:40 · WARDROOM MESS 06:00 / 18:00", 16, h - 9, 10, DIM, "left", false);
  });

  // --- ship status readout
  cell("status", (w, h) => {
    ctx.fillStyle = AMBER;
    ctx.fillRect(0, 0, w, 4);
    text("SHIP STATUS", 16, 24, 22, AMBER);
    text("CONDITION TWO", w - 16, 24, 14, RED, "right");
    wedge(24, 56, 210, 150, "rgba(255,160,40,0.75)");
    const sys = [
      ["REACTOR", 0.86, AMBER],
      ["SHIELDS", 0.72, AMBER],
      ["HYPERDRIVE", 0.4, RED],
      ["SUBLIGHT", 0.9, AMBER],
      ["LIFE SUPPORT", 0.97, AMBER],
      ["TURBOLASERS", 0.8, RED],
      ["TRACTOR", 0.55, AMBER],
      ["HANGAR", 0.68, AMBER],
    ];
    sys.forEach((s, k) => {
      const yy = 60 + k * 30;
      text(s[0], 260, yy, 11, GREY, "left", false);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(360, yy - 5, 130, 10);
      ctx.fillStyle = s[2];
      ctx.fillRect(360, yy - 5, 130 * s[1], 10);
      text(Math.round(s[1] * 100) + "%", w - 16, yy, 11, s[2], "right", false);
    });
    lines(24, 220, 200, 6, 9, "rgba(154,158,166,0.5)", 12);
    text("HULL INTEGRITY 99.2   CREW 9,235   BEARING 227.4", 16, h - 10, 10, DIM, "left", false);
  });

  // --- personal log: red text on black
  cell("log", (w, h) => {
    text("PERSONAL LOG · ENTRY 4471", 14, 18, 14, RED);
    ctx.fillStyle = RED;
    ctx.fillRect(14, 30, w - 28, 1);
    const words = ["SECTOR", "TRANSIT", "COMPLETE", "CREW", "MORALE", "NOMINAL", "REQUEST", "RESUPPLY", "AT", "NEXT", "DEPOT", "WATCH", "ROTATION", "ADJUSTED", "PER", "ORDERS", "GUNNERY", "DRILL", "RESULTS", "ACCEPTABLE", "ENSIGN", "QUILL", "COMMENDED", "FLAG", "SIGNAL", "RECEIVED", "AWAIT", "RENDEZVOUS"];
    let yy = 48;
    for (let k = 0; k < 13; k++) {
      let s = "";
      while (s.length < 30 + rand() * 12) s += words[Math.floor(rand() * words.length)] + " ";
      text(s.slice(0, 44), 14, yy, 11, k < 11 ? "rgba(255,42,26,0.85)" : DIM, "left", false);
      yy += 15;
    }
    ctx.fillStyle = RED;
    ctx.fillRect(14, yy + 2, 8, 12);
  });

  // --- deck plan of this section
  cell("deckplan", (w, h) => {
    text("DECK 1 · SECTION 4 · OFFICERS' COUNTRY", 12, 14, 12, AMBER);
    ctx.strokeStyle = "rgba(154,158,166,0.6)";
    ctx.lineWidth = 1;
    const px = 30;
    const py = 34;
    const pw = w - 60;
    const ph = h - 60;
    ctx.strokeRect(px, py, pw, ph);
    // corridor along x, cabins above/below
    const corY = py + ph * 0.5;
    ctx.fillStyle = "rgba(58,123,255,0.25)";
    ctx.fillRect(px, corY - 10, pw, 20);
    for (let k = 0; k < 6; k++) ctx.strokeRect(px + k * (pw / 6), py, pw / 6, ph * 0.5 - 10);
    ctx.strokeRect(px, corY + 10, pw * 0.25, ph * 0.5 - 10);
    for (let k = 0; k < 4; k++) ctx.strokeRect(px + pw * 0.25 + k * (pw * 0.15), corY + 10, pw * 0.15, ph * 0.5 - 10);
    ctx.strokeRect(px + pw * 0.85, corY + 10, pw * 0.15, ph * 0.5 - 10);
    text("WARDROOM", px + pw * 0.12, corY + ph * 0.28, 9, GREY, "center", false);
    text("DUTY", px + pw * 0.93, py + ph * 0.22, 9, GREY, "center", false);
    for (let k = 0; k < 6; k++) text("0" + (k + 5), px + (k + 0.5) * (pw / 6), py + ph * 0.22, 9, DIM, "center", false);
    for (let k = 0; k < 4; k++) text("0" + (k + 1), px + pw * 0.25 + (k + 0.5) * (pw * 0.15), corY + ph * 0.28, 9, DIM, "center", false);
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(px + pw - 6, corY, 4, 0, Math.PI * 2);
    ctx.fill();
    text("YOU ARE HERE", px + pw - 12, corY + 22, 9, RED, "right");
    text("SPINE →", px + pw + 4, corY, 9, GREY, "left", false);
  });

  // --- desk terminal (dense two-column)
  cell("terminal", (w, h) => {
    ctx.fillStyle = BLUE;
    ctx.fillRect(0, 0, w, 3);
    text("TERMINAL 4-", 10, 16, 11, BLUE);
    text("AUTH REQUIRED", w - 10, 16, 10, RED, "right");
    lines(10, 32, w * 0.45, 9, 8, "rgba(154,158,166,0.55)", 11);
    lines(w * 0.55, 32, w * 0.4, 5, 8, "rgba(255,160,40,0.7)", 11);
    bars(w * 0.55, 96, w * 0.4, 40, 8, "rgba(58,123,255,0.8)");
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.strokeRect(w * 0.55, 92, w * 0.4, 48);
    text("STANDBY", 10, h - 12, 10, AMBER);
    ctx.fillStyle = AMBER;
    ctx.fillRect(80, h - 17, 7, 10);
  });

  // --- utility readout strip
  cell("utility", (w, h) => {
    text("ENV CTRL", 10, 14, 11, AMBER);
    for (let k = 0; k < 6; k++) {
      text(["PWR", "AIR", "H2O", "TMP", "PRS", "FLT"][k], 10 + k * 40, 36, 9, DIM, "left", false);
      ctx.fillStyle = k === 4 ? RED : AMBER;
      ctx.fillRect(10 + k * 40, 44, 26, 6);
    }
  });

  // --- framed ship schematic
  cell("schematic", (w, h) => {
    ctx.fillStyle = "#07090c";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(154,158,166,0.12)";
    for (let x = 0; x < w; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    wedge(30, 30, w - 60, h - 70, "rgba(154,158,166,0.9)");
    text("CAPITAL HULL · CLASS II · GENERAL ARRANGEMENT", 14, h - 14, 9, GREY, "left", false);
    text("1 : 4000", w - 14, h - 14, 9, AMBER, "right", false);
  });

  // --- section notices
  cell("notice", (w, h) => {
    ctx.fillStyle = AMBER;
    ctx.fillRect(0, 0, w, 3);
    text("SECTION NOTICES", 12, 18, 14, AMBER);
    text("0771.3", w - 12, 18, 11, GREY, "right", false);
    const heads = ["WATCH ROTATION", "MESS HOURS", "INSPECTION", "MAINTENANCE"];
    let yy = 40;
    heads.forEach((hd) => {
      text(hd, 12, yy, 10, RED);
      lines(12, yy + 10, w * 0.8, 2, 8, "rgba(154,158,166,0.5)", 10);
      yy += 38;
    });
    ctx.strokeStyle = RED;
    ctx.lineWidth = 2;
    ctx.strokeRect(w - 118, h - 40, 106, 26);
    text("RESTRICTED", w - 65, h - 27, 11, RED, "center");
  });

  // --- small labels
  const label = (name, s, color) =>
    cell(name, (w, h) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 6, h);
      text(s, 14, h / 2, 14, color);
    });
  label("lblService", "SERVICE HATCH", AMBER);
  label("lblFire", "FIRE SUPPRESSION", RED);
  label("lblServing", "GALLEY SERVING", AMBER);
  label("lblWeapons", "ARMS LOCKER", RED);

  return toTexture(c, { srgb: true, wrap: false, anisotropy: 4 });
}

// manifest.materials(shared) hook: one emissive material for every display in the module, plus the warm lens/cove
// emitter. offLamp replaces the shared emitWarmSoft (emissive 1.9) everywhere in the module: its red channel sat
// 65 % over the bloom threshold, so any lens seen square-on — the cabin luminaire's two panes from the door camera,
// 250 px — clipped to white with a halo. At 1.15 the peak channel is at the threshold: the lenses read as bright
// warm glass (sRGB ≈ 236/208/152) with no bloom, and the cove lines lose only their halos. Same material count (16).
export function officersMaterials() {
  const tex = makeOfficersAtlas();
  return {
    offLamp: new THREE.MeshStandardMaterial({ color: 0x1a1410, emissive: 0xffc78a, emissiveIntensity: 1.15, roughness: 0.5, metalness: 0 }),
    offScreen: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.9, roughness: 0.2, metalness: 0, envMapIntensity: 0.6 }),
  };
}
