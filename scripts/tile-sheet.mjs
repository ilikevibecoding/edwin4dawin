// Visual check tooling for the HD tile atlas (Rubric 5). Runs the game headless through scripts/cdp.mjs.
//
//   node scripts/tile-sheet.mjs sheets [--url http://localhost:5208] [--out /opt/cursor/artifacts] [--prefix r2_tiles_sheet]
//       Contact sheets: every tile as [16px base x8] [64px HD x2] [normal map] [material map] with its name and
//       material class, plus the raw colour / normal / material atlases (<prefix>_atlas_*.png).
//   node scripts/tile-sheet.mjs zoom --tiles oak_planks,stone,... [--zoom 4] [--cols 2] [--per 12] [--prefix r2_tiles_zoom]
//       Same panels for a few tiles at a larger zoom (HD texel = --zoom screen pixels) for close inspection.
//   node scripts/tile-sheet.mjs shots  [--url ...] [--out ...] [--prefix r2_hd_after] [--hd 0|1] [--settle 6000]
//                                      [--views '{"name":"?x=..&z=..",...}']
//       In-game screenshots of the standard views (western town at noon, plank wall, street, Coruscant tower).
//       --hd 0 loads the game with ?hd=0 (plain 16px atlas) for "before" pictures.
import { mkdirSync, writeFileSync } from 'node:fs';
import { launchPage } from './cdp.mjs';

const args = process.argv.slice(2);
const mode = args.find((a) => !a.startsWith('--')) || 'sheets';
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
const url = opt('url', 'http://localhost:5208').replace(/\/$/, '');
const out = opt('out', '/opt/cursor/artifacts');
mkdirSync(out, { recursive: true });

const writePng = (path, dataUrl) => { writeFileSync(path, Buffer.from(dataUrl.split(',')[1], 'base64')); console.log('wrote', path); };

// Camera views: yaw 0 looks -z, -90 looks +x; pitch in degrees (negative = down).
export const VIEWS = {
  town_noon: '?x=-8&z=2&time=0.5&yaw=-90&pitch=-5',
  plank_wall: '?x=25&z=1.5&time=0.5&yaw=180&pitch=6',       // Boarding House (oak planks, stripped oak trim, glass)
  street: '?x=-20&z=0&time=0.5&yaw=-90&pitch=-28',           // mud / dirt path street, spruce boardwalk, cobble curb
  tower: '?x=2980&z=-70&y=100&fly=1&time=0.5&yaw=0&pitch=12', // Coruscant tower 221: durasteel walls, chrome piers
};

// Runs in the page: draws contact sheets with the 2D canvas API and returns PNG data URLs.
// cfg: { zoom: screen px per HD texel, cols, perSheet, names: [tile names] | null (all), atlas: bool }
const sheetJs = (cfg) => `(async () => {
  const cfg = ${JSON.stringify(cfg)};
  const T = await import('/src/textures.js');
  const Mt = await import('/src/render/materials.js');
  const { BASE_PX: B, TILE_PX: S } = await import('/src/constants.js');
  if (T.tileCount() === 0) T.buildAtlas();
  const n = T.tileCount();
  let idx = [];
  for (let i = 0; i < n; i++) idx.push(i);
  if (cfg.names) idx = cfg.names.map((nm) => idx.find((i) => T.tileName(i) === nm)).filter((i) => i !== undefined);
  const Z = S * cfg.zoom, gap = 6, colGap = 24, margin = 12, header = 30, cols = cfg.cols, perSheet = cfg.perSheet;
  const cellW = 4 * Z + 3 * gap, cellH = Z + 28;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const tmpB = mk(B, B), tmpC = mk(S, S), tmpN = mk(S, S), tmpM = mk(S, S);
  const put = (c, data, size) => { const ctx = c.getContext('2d'); const img = ctx.createImageData(size, size); img.data.set(data); ctx.putImageData(img, 0, 0); return c; };
  const cs = Z / 8;
  const checker = (ctx, x, y) => { for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) { ctx.fillStyle = (i + j) & 1 ? '#3a3a40' : '#2c2c31'; ctx.fillRect(x + i * cs, y + j * cs, cs, cs); } };
  const sheets = [];
  for (let s0 = 0; s0 < idx.length; s0 += perSheet) {
    const count = Math.min(perSheet, idx.length - s0), rows = Math.ceil(count / cols);
    const c = mk(margin * 2 + cols * cellW + (cols - 1) * colGap, header + rows * cellH + margin);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1b1b1f'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = false;
    ctx.font = '13px "DejaVu Sans Mono", "Cascadia Mono", monospace';
    ctx.fillStyle = '#e8e8e8';
    ctx.fillText('per tile: [16px base x' + (Z / B) + ']  [64px HD x' + cfg.zoom + ']  [normal]  [material: R roughness, G metalness, B emissive]', margin, 20);
    for (let k = 0; k < count; k++) {
      const i = idx[s0 + k], name = T.tileName(i), m = Mt.classify(name), maps = T.tileMaps(i);
      const cx = margin + (k % cols) * (cellW + colGap), cy = header + Math.floor(k / cols) * cellH;
      const panels = [put(tmpB, T.tileBasePixels(i), B), put(tmpC, maps.color, S), put(tmpN, maps.normal, S), put(tmpM, maps.material, S)];
      for (let p = 0; p < 4; p++) { const px = cx + p * (Z + gap); checker(ctx, px, cy); ctx.drawImage(panels[p], px, cy, Z, Z); }
      const flag = m.explicit ? '' : (m.fallback ? '  FALLBACK' : '  (keyword)');
      ctx.fillStyle = '#e8e8e8';
      ctx.fillText(i + ' ' + name + '  [' + m.cls + (m.detail !== m.cls ? '/' + m.detail : '') + ']  rough ' + m.roughness.toFixed(2) + '  metal ' + m.metalness.toFixed(2) + '  emis ' + m.emissive.toFixed(2) + '  relief ' + m.relief.toFixed(2) + flag, cx, cy + Z + 18);
    }
    sheets.push(c.toDataURL('image/png'));
  }
  const atlas = cfg.atlas ? { color: T.atlasCanvas.toDataURL(), normal: T.atlasNormalCanvas.toDataURL(), material: T.atlasMaterialCanvas.toDataURL() } : null;
  return JSON.stringify({ tiles: idx.length, sheets, atlas });
})()`;

async function sheets(cfg, prefix) {
  const page = await launchPage(`${url}/?x=-8&z=2&time=0.5`, { width: 1280, height: 800 });
  try {
    await page.waitForGame();
    const res = JSON.parse(await page.evaluate(sheetJs(cfg)));
    console.log(`${res.tiles} tiles, ${res.sheets.length} sheet(s)`);
    res.sheets.forEach((d, i) => writePng(`${out}/${prefix}${res.sheets.length > 1 ? '_' + (i + 1) : ''}.png`, d));
    if (res.atlas) for (const k of Object.keys(res.atlas)) writePng(`${out}/${prefix}_atlas_${k}.png`, res.atlas[k]);
    const log = page.consoleLines.filter((l) => l.includes('[textures]'));
    if (log.length) console.log(log.join('\n'));
    if (page.exceptions.length) console.log('page exceptions:', page.exceptions.slice(0, 3).join('\n'));
  } finally { page.close(); }
}

async function shots() {
  const hd = opt('hd', '1');
  const prefix = opt('prefix', hd === '0' ? 'r2_hd_before' : 'r2_hd_after');
  const settle = parseInt(opt('settle', '6000'), 10);
  const views = JSON.parse(opt('views', 'null')) || VIEWS;
  for (const [name, q] of Object.entries(views)) {
    const page = await launchPage(`${url}/${q}${hd === '0' ? '&hd=0' : ''}`, { width: 1280, height: 800 });
    try {
      await page.waitForGame();
      await page.evaluate('game.input.locked = true; game.input.onLockChange = null; "ok"').catch(() => {});
      await page.sleep(settle);
      await page.screenshot(`${out}/${prefix}_${name}.png`);
      const log = page.consoleLines.filter((l) => l.includes('[textures]'));
      console.log('wrote', `${out}/${prefix}_${name}.png`, log.length ? '| ' + log[0] : '', page.exceptions.length ? `| ${page.exceptions.length} exceptions: ${page.exceptions[0]}` : '');
    } finally { page.close(); }
  }
}

if (mode === 'shots') await shots();
else if (mode === 'zoom') {
  const names = (opt('tiles', 'oak_planks,stone,cobblestone,bricks,durasteel,chrome') || '').split(',').filter(Boolean);
  await sheets({ zoom: parseInt(opt('zoom', '4'), 10), cols: parseInt(opt('cols', '2'), 10), perSheet: parseInt(opt('per', '12'), 10), names, atlas: false }, opt('prefix', 'r2_tiles_zoom'));
} else await sheets({ zoom: 2, cols: 3, perSheet: 36, names: null, atlas: true }, opt('prefix', 'r2_tiles_sheet'));
