// Cinematic capture: steps the sim 1/24 s per frame and screenshots each frame;
// frames are then assembled into a smooth 24 fps video with ffmpeg.
// Event-driven storyboard over a saturation/sunset scenario (seed 42).
import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';

const FPS = 24;

const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--mute-audio'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await page.goto('http://127.0.0.1:5173/?manual=1&mute=1&seed=42&quality=2', { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => window.__game?.ready, null, { timeout: 90000 });

mkdirSync('cine', { recursive: true });

await page.evaluate(() => {
  const g = window.__game;
  g.start('saturation', 'sunset');
  g.setView('apron'); // free-cam; storyboard drives the camera below
  window.__cine = {
    pos: [16, 1.9, 30], look: [52, 8, -34],
    tgtPos: [16, 1.9, 30], tgtLook: [52, 8, -34],
    lookRate: 0.16,
    slowFrames: 0, bannerHold: 0, bannerText: '', bannerCls: '', lastResults: 0,
    phase: 'walk', framesInPhase: 0,
    zenAuthorized: false, zenAuthFrame: 0,
    ramAuthorized: false, ramAuthFrame: 0, sawRam: false, ramHoldAt: 0,
    burstLook: null,
  };
});

// one storyboard tick = one video frame
const tick = () => page.evaluate((FPS) => {
  const g = window.__game;
  const c = window.__cine;
  const s = g.getState();
  c.framesInPhase++;

  const setTgt = (p, l) => { c.tgtPos = p; c.tgtLook = l; };
  const cut = (p, l, phase) => {
    c.pos = [...p]; c.look = [...l]; setTgt(p, l);
    c.phase = phase; c.framesInPhase = 0;
    c.lookRate = 0.16;
  };
  // teleport inside the shelter first so the console tween is a short interior
  // glide instead of a wall-clipping flight from the apron
  const enterConsole = (phase) => {
    g.walkTo(-37.9, -9.7, 2.2, 0);
    g.step(1 / 60, 2);
    g.openConsole();
    c.phase = phase; c.framesInPhase = 0;
  };
  const exitConsoleClean = () => {
    g.closeConsole();
    g.step(1 / 60, 32);   // let the 0.45 s exit tween finish off-camera
    g.walkTo(24, 14, 0, 0); // park the player outdoors (clears the E prompt)
    g.setView('apron');   // free-cam again; we own the camera below
  };

  // ------------------------------------------------ storyboard state machine
  if (c.phase === 'walk') {
    setTgt([16 - c.framesInPhase * 0.035, 1.9, 30 - c.framesInPhase * 0.06], [52, 10, -34]);
    if (s.time > 4.2) enterConsole('console');
  } else if (c.phase === 'console') {
    if (!c.zenAuthorized) {
      // fire on a validated solution (the console cue must read GOOD)
      const tr = s.tracks.find(t => t.state === 'TRACK' &&
        (g.assess('zenith', t.id) === 'GOOD' || (s.time > 34 && g.assess('zenith', t.id) === 'MARGINAL')));
      if (tr) {
        g.selectTrack(tr.id);
        g.assign('zenith');
        g.authorize();
        c.zenAuthorized = true;
        c.framesInPhase = 0;
      }
    }
    // exit before the 2.6 s prep completes so the pad view catches ignition
    if ((c.zenAuthorized && c.framesInPhase > FPS * 1.2) || c.framesInPhase > FPS * 40) {
      exitConsoleClean();
      cut([46, 2.2, 24], [60, 7, 38], 'zenith-pad');
    }
  } else if (c.phase === 'zenith-pad') {
    const m = s.interceptors.find(i => i.battery === 'zenith');
    if (m) {
      if (m.pos[1] > 120) { c.phase = 'follow-z'; c.framesInPhase = 0; }
      else setTgt([46, 2.2, 24], [m.pos[0], m.pos[1] + 6, m.pos[2]]);
    } else if (c.framesInPhase > FPS * 10) { c.phase = 'follow-z'; c.framesInPhase = 0; }
  } else if (c.phase === 'follow-z') {
    const m = s.interceptors.find(i => i.battery === 'zenith');
    if (m) setTgt([46, 2.2, 24], m.pos);
    if (s.lastBurst && s.lastBurst.type === 'air') {
      c.burstLook = s.lastBurst.pos;
      c.slowFrames = 32;             // brief 0.25x slow-mo on the kill
      c.phase = 'burst-z'; c.framesInPhase = 0;
    } else if (c.framesInPhase > FPS * 22) { c.phase = 'burst-z'; c.framesInPhase = 0; }
  } else if (c.phase === 'burst-z') {
    if (c.burstLook) setTgt([46, 2.2, 24], c.burstLook);
    if (c.framesInPhase > FPS * 4) enterConsole('console-2');
  } else if (c.phase === 'console-2') {
    if (!c.ramAuthorized) {
      const tr = s.tracks.find(t => t.state === 'TRACK' && !t.assigned &&
        g.assess('rampart', t.id) === 'GOOD');
      if (tr) {
        g.selectTrack(tr.id);
        g.assign('rampart');
        g.authorize();
        c.ramAuthorized = true;
        c.framesInPhase = 0;
      }
    }
    // rampart preps in 1.1 s — exit almost immediately to catch the launch
    if (c.ramAuthorized && c.framesInPhase > FPS * 0.7) {
      exitConsoleClean();
      cut([27, 2.6, -28], [52, 5, -34], 'rampart-pad');
    } else if (!c.ramAuthorized && c.framesInPhase > FPS * 24) {
      exitConsoleClean();
      cut([30, 2.2, 130], [0, 200, -120], 'impacts');
      c.lookRate = 0.07;
    }
  } else if (c.phase === 'rampart-pad') {
    const m = s.interceptors.find(i => i.battery === 'rampart');
    if (m) {
      if (m.pos[1] > 90) { c.phase = 'follow-r'; c.framesInPhase = 0; }
      else setTgt([27, 2.6, -28], [m.pos[0], m.pos[1] + 4, m.pos[2]]);
    } else if (c.framesInPhase > FPS * 10) { c.phase = 'follow-r'; c.framesInPhase = 0; }
  } else if (c.phase === 'follow-r') {
    const m = s.interceptors.find(i => i.battery === 'rampart');
    if (m) { c.sawRam = true; setTgt([27, 2.6, -28], m.pos); }
    const ramDone = (c.sawRam && !m) || c.framesInPhase > FPS * 16;
    if (ramDone && !c.ramHoldAt) {
      c.ramHoldAt = c.framesInPhase + 56;     // hold ~2.3 s on the result
      if (s.lastBurst) setTgt([27, 2.6, -28], s.lastBurst.pos);
    }
    if (c.ramHoldAt && c.framesInPhase > c.ramHoldAt) {
      cut([30, 2.2, 130], [0, 220, -140], 'impacts');
      c.lookRate = 0.07;   // slow, deliberate pans while threats come down
    }
  } else if (c.phase === 'impacts') {
    // Acquire the lowest inbound streak once at phase entry and track it all the
    // way down; after it lands, stay on the burst site (the next impact only
    // shifts the target between nearby ground points). The old 2600 m altitude
    // gate retargeted mid-shot, which read as a camera jolt.
    c.lookRate = 0.05;
    if (c.impactsTgtId === undefined) {
      const low = s.threats.slice().sort((a, b) => a.pos[1] - b.pos[1])[0];
      if (low) c.impactsTgtId = low.id ?? 0;
    }
    const tracked = s.threats.find(t => (t.id ?? 0) === c.impactsTgtId);
    if (tracked) setTgt([30, 2.2, 130], [tracked.pos[0], Math.max(14, tracked.pos[1] * 0.4), tracked.pos[2]]);
    else if (s.lastBurst) setTgt([30, 2.2, 130], [s.lastBurst.pos[0], 26, s.lastBurst.pos[2]]);
    if (s.phase === 'debrief') { c.phase = 'debrief'; c.framesInPhase = 0; }
  }
  // 'debrief': hold still

  // ------------------------------------------------------- camera smoothing
  const consolePhase = c.phase === 'console' || c.phase === 'console-2';
  if (!consolePhase) {
    for (let i = 0; i < 3; i++) {
      c.pos[i] += (c.tgtPos[i] - c.pos[i]) * 0.10;
      c.look[i] += (c.tgtLook[i] - c.look[i]) * c.lookRate;
    }
    g.camera.position.set(c.pos[0], c.pos[1], c.pos[2]);
    g.lookAt(c.look[0], c.look[1], c.look[2]);
  }

  // -------------------------------------------- advance sim (slow-mo option)
  const dt = c.slowFrames > 0 ? (1 / 96) : (1 / 24);
  if (c.slowFrames > 0) c.slowFrames--;
  g.step(dt);

  // Banners run on wall-clock timers, which stepped capture outpaces — drive
  // the banner element deterministically from sim results instead.
  const after = g.getState();
  if (after.results.length > c.lastResults) {
    const r = after.results[after.results.length - 1];
    c.bannerHold = 48;
    c.bannerText = r.type === 'INTERCEPTED' ? `INTERCEPT — ${r.text.split(' ')[0]} DESTROYED`
      : r.type === 'IMPACT' ? 'IMPACT — BASE AREA HIT'
      : r.text;
    c.bannerCls = r.type === 'INTERCEPTED' ? 'ok' : (r.type === 'IMPACT' ? 'bad' : 'warn');
  }
  c.lastResults = after.results.length;
  const bannerEl = document.querySelector('.banner');
  if (bannerEl) {
    if (c.bannerHold > 0) {
      c.bannerHold--;
      bannerEl.textContent = c.bannerText;
      bannerEl.className = `banner ${c.bannerCls}`;
    } else {
      bannerEl.className = 'banner hidden';
    }
  }

  return { phase: c.phase, t: +after.time.toFixed(1), done: c.phase === 'debrief' && c.framesInPhase > 60 };
}, FPS);

const TOTAL_MAX = FPS * 85;
const SAVE_FROM = parseInt(process.env.SAVE_FROM ?? '0', 10);
let n = 0;
for (; n < TOTAL_MAX; n++) {
  const st = await tick();
  if (n >= SAVE_FROM) {
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.screenshot({ path: `cine/f${String(n).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 84 });
  }
  if (n % 150 === 0) console.log(`frame ${n}  phase=${st.phase} t=${st.t}`);
  if (st.done) { n++; break; }
}
console.log('captured', n, 'frames');
await browser.close();
