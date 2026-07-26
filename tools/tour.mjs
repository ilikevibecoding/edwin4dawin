#!/usr/bin/env node
// Batch screenshot tour — one browser session, many vantage points.
// Usage: node tools/tour.mjs <outdir> <spec.json|inline-json>
// Spec: [{ name, cp?|pos:[x,y,z], yaw?, pitch?, js? }, ...]
//   cp    — checkpoint name from map.js CHECKPOINTS (teleports there)
//   pos   — explicit [x,y,z] teleport
//   yaw   — look yaw in degrees (0=north), pitch in degrees (up positive)
//   js    — extra async body evaluated before the shot (qa/adv in scope)
// Mission starts once (operator, AI frozen, god) and shots run in sequence.

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const [, , outDir = 'artifacts/tour', specArg = '[]'] = process.argv;
const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173';
const spec = specArg.trim().startsWith('[')
  ? JSON.parse(specArg)
  : JSON.parse(fs.readFileSync(specArg, 'utf8'));

const errors = [];
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.setDefaultTimeout(90000);
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
await page.route('**/@vite/client', (route) => route.fulfill({
  status: 200,
  contentType: 'application/javascript',
  body: `const sheets=new Map();
export function updateStyle(id,c){let s=sheets.get(id);if(!s){s=document.createElement('style');s.type='text/css';document.head.appendChild(s);sheets.set(id,s);}s.textContent=c;}
export function removeStyle(id){const s=sheets.get(id);if(s){s.remove();sheets.delete(id);}}
const n=()=>{};export function createHotContext(){return{data:{},accept:n,acceptExports:n,decline:n,dispose:n,prune:n,invalidate:n,on:n,off:n,send:n};}
export function injectQuery(u){return u;}export class ErrorOverlay{}`,
}));

await page.goto(BASE + '/?test=1&qa=1', { waitUntil: 'load' });
await page.waitForTimeout(900);
await page.evaluate(`(async () => {
  const qa = window.__qa;
  qa.startMission({ difficulty: 'operator' });
  for (let i = 0; i < 120; i++) { await new Promise(r => setTimeout(r, 100)); if (qa.state().mode === 'playing') break; }
  qa.freezeAI(true); qa.god(true);
  window.advanceTime(300);
})()`);

fs.mkdirSync(outDir, { recursive: true });
for (const s of spec) {
  const before = errors.length;
  try {
    await page.evaluate(`(async () => {
      const qa = window.__qa;
      const adv = (ms) => window.advanceTime(ms);
      ${s.cp ? `qa.teleport('${s.cp}');` : ''}
      ${s.pos ? `qa.teleportTo(${s.pos[0]}, ${s.pos[1]}, ${s.pos[2]}, ${s.yaw ?? 0});` : ''}
      ${(s.yaw !== undefined || s.pitch !== undefined) ? `qa.lookYawPitch(${s.yaw ?? 0}, ${s.pitch ?? 0});` : ''}
      ${s.js ?? ''}
      adv(350);
    })()`);
  } catch (e) { errors.push(`EVAL(${s.name}): ${e.message}`); }
  const out = path.join(outDir, `${s.name}.png`);
  await page.screenshot({ path: out, timeout: 60000 });
  console.log(`shot ${s.name}${errors.length > before ? '  [NEW ERRORS]' : ''}`);
}

console.log('--- errors:', errors.length, '---');
for (const e of errors.slice(0, 12)) console.log('E:', e.slice(0, 400));
await browser.close();
process.exit(errors.length ? 1 : 0);
