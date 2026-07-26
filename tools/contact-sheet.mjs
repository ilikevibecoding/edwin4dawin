#!/usr/bin/env node
/** Compose gallery screenshots into contact sheets for visual review (Opus 4). */
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] ?? 'artifacts/shots/gallery';
const out = process.argv[3] ?? 'artifacts/shots/sheets';
const perSheet = 12;
fs.mkdirSync(out, { recursive: true });
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1440 } });

for (let s = 0; s * perSheet < files.length; s++) {
  const batch = files.slice(s * perSheet, (s + 1) * perSheet);
  const cells = batch.map((f) => {
    const b64 = fs.readFileSync(path.join(dir, f)).toString('base64');
    return `<div style="border:1px solid #333"><img src="data:image/png;base64,${b64}" style="width:100%;display:block"/><div style="color:#9fe;font:12px monospace;padding:2px 6px;background:#111">${f}</div></div>`;
  }).join('');
  await page.setContent(`<body style="margin:0;background:#000"><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:4px">${cells}</div></body>`);
  await page.waitForTimeout(300);
  const file = `${out}/sheet-${s}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log('sheet:', file);
}
await browser.close();
