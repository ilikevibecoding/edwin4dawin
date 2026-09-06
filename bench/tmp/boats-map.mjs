// Dump a coarse water map, the moored boat list and the cruise berth: node bench/tmp/boats-map.mjs <url> <out.json>
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const [url, out] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || '/usr/local/bin/google-chrome', headless: true,
  args: ['--no-sandbox', '--disable-gpu-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=640,360', '--hide-scrollbars'],
  defaultViewport: { width: 640, height: 360, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction('window.__ready === true', { timeout: 300000, polling: 200 });
const info = await page.evaluate(() => {
  const g = window.__game;
  const step = 100;
  const rows = [];
  for (let z = -10000; z <= 10000; z += step) {
    let row = '';
    for (let x = -10000; x <= 10000; x += step) {
      const h = g.map.heightAt(x, z);
      row += h > 0 ? '#' : h > -2 ? '.' : h > -6 ? '-' : ' ';
    }
    rows.push(row);
  }
  const moored = g.props.mooredBoatPositions.map((m) => ({ x: +m.x.toFixed(1), z: +m.z.toFixed(1), rot: +m.rot.toFixed(3), len: +m.len.toFixed(1), kind: m.kind ?? null, depth: +(-g.map.heightAt(m.x, m.z)).toFixed(2) }));
  const marinas = g.map.marinas;
  const pois = g.map.pois;
  return { rows, moored, marinas, pois };
});
fs.writeFileSync(out, JSON.stringify(info));
console.log('moored', info.moored.length, 'pois', info.pois.length);
await browser.close();
