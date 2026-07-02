import { clamp, lerp, fmtTime, fmtClock, el, easeOutCubic } from './util.js';
import {
  coinCanvas, gemCanvas, crownCanvas, elixirDropCanvas, swordsCanvas,
  chestCanvas, drawChest, cardCanvas, cloudCanvas, treeCanvas, bushCanvas,
  PAL, outlineText,
} from './art.js';
import { CARDS, CARD_BY_ID, RULES, PLAYER_NAME, OPPONENT_NAME } from './data.js';
import { Battle, ArenaRenderer, AW, AH } from './battle.js';
import { sfx, unlockAudio } from './audio.js';

/* =====================================================================
   Stage scaling (360×640 letterboxed)
   ===================================================================== */
const stage = document.getElementById('stage');
function fitStage() {
  const k = Math.min(window.innerWidth / 360, window.innerHeight / 640);
  stage.style.transform = `scale(${k})`;
}
window.addEventListener('resize', fitStage);
fitStage();

/* =====================================================================
   Persistent-ish meta state (session only)
   ===================================================================== */
const meta = {
  gold: 1250,
  gems: 45,
  level: 7,
  // chest slots: {state:'ready'|'timer'|'empty', kind, secondsLeft}
  slots: [
    { state: 'ready', kind: 'gold' },
    { state: 'timer', kind: 'wood', secondsLeft: 2 * 3600 + 47 * 60 },
    { state: 'empty' },
    { state: 'empty' },
  ],
};

/* =====================================================================
   Screen manager
   ===================================================================== */
const screens = {
  home: document.getElementById('screen-home'),
  battle: document.getElementById('screen-battle'),
  result: document.getElementById('screen-result'),
};
const fader = document.getElementById('fader');
let state = 'HOME';

function show(name) {
  for (const k of Object.keys(screens)) screens[k].classList.toggle('active', k === name);
}

function transition(to, buildFn) {
  fader.classList.add('on');
  setTimeout(() => {
    buildFn?.();
    show(to);
    requestAnimationFrame(() => fader.classList.remove('on'));
  }, 230);
}

// expose hooks for the screenshot harness
window.__game = {
  get state() { return state; },
  goto(s, opts) {
    if (s === 'HOME') { state = 'HOME'; buildHome(); show('home'); }
    else if (s === 'BATTLE') startBattle(opts);
    else if (s === 'RESULT') showResult(opts?.result || 'win', opts?.crowns ?? [2, 1]);
    else if (s === 'CHEST') openChest(0, true);
  },
  battle: null,
  fastForward(sec) { if (battle) { for (let i = 0; i < sec * 60; i++) battle.update(1 / 60); } },
  tapChest() { chestOv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); },
};

/* =====================================================================
   HOME
   ===================================================================== */
const homeEl = screens.home;

function buildHome() {
  homeEl.innerHTML = '';
  // drifting clouds (canvas sprites)
  for (const [top, dur, delay, scale, alpha] of [[48, 36, -9, 1, 0.95], [128, 50, -28, 0.66, 0.8], [236, 42, -3, 0.82, 0.88]]) {
    const c = el('div', 'cloud');
    const cc = cloudCanvas(130);
    cc.style.width = '100%';
    c.appendChild(cc);
    c.style.top = `${top}px`;
    c.style.opacity = String(alpha);
    c.style.setProperty('--cs', String(scale));
    c.style.animationDuration = `${dur}s`;
    c.style.animationDelay = `${delay}s`;
    homeEl.appendChild(c);
  }
  homeEl.appendChild(el('div', 'home-hills'));

  // trees + bushes on the hills
  for (const [kind, left, bottom, w, flip] of [
    ['tree', 12, 210, 62, 1], ['tree', 292, 224, 56, -1], ['bush', 74, 200, 44, 1],
    ['bush', 250, 208, 40, -1], ['tree', 322, 174, 44, 1], ['bush', 6, 168, 38, -1],
  ]) {
    const d = el('div', 'home-prop');
    const cv = kind === 'tree' ? treeCanvas(64) : bushCanvas(46);
    cv.style.width = '100%';
    d.appendChild(cv);
    d.style.left = `${left}px`;
    d.style.bottom = `${bottom}px`;
    d.style.width = `${w}px`;
    if (flip < 0) d.style.transform = 'scaleX(-1)';
    homeEl.appendChild(d);
  }

  // top bar
  const top = el('div', 'home-top');
  const plate = el('div', 'name-plate');
  const lvl = el('div', 'level-badge ot ot-sm', String(meta.level));
  plate.appendChild(lvl);
  plate.appendChild(el('span', 'pname ot ot-sm', PLAYER_NAME));
  top.appendChild(plate);
  const counters = el('div', 'counters');
  counters.appendChild(pill(coinCanvas(22), meta.gold.toLocaleString(), 'gold-pill'));
  counters.appendChild(pill(gemCanvas(22), String(meta.gems), 'gem-pill'));
  top.appendChild(counters);
  homeEl.appendChild(top);

  // title
  const title = el('div', 'home-title');
  title.appendChild(el('span', 't1 ot', 'ARENA'));
  title.appendChild(el('span', 't2 ot', 'RUMBLE'));
  homeEl.appendChild(title);

  // emblem: crossed swords + crown drawn on canvas
  const emb = el('div', 'home-emblem');
  const embC = emblemCanvas();
  embC.style.width = '100%';
  emb.appendChild(embC);
  emb.style.top = '178px';
  emb.style.width = '132px';
  homeEl.appendChild(emb);

  // battle button
  const bw = el('div', 'battle-wrap');
  const btn = el('button', 'btn btn-yellow');
  btn.id = 'btn-battle';
  const sw = swordsCanvas(34);
  sw.style.width = '32px'; sw.style.height = '32px';
  btn.appendChild(sw);
  btn.appendChild(el('span', 'ot', 'Battle!'));
  btn.addEventListener('click', () => { unlockAudio(); sfx.tap(); startBattle(); });
  bw.appendChild(btn);
  bw.appendChild(el('div', 'arena-tag ot ot-sm', 'Arena 3 · Rumble Ridge'));
  homeEl.appendChild(bw);

  // chest shelf
  const shelf = el('div', 'chest-shelf');
  shelf.appendChild(el('div', 'shelf-title ot ot-sm', 'Chests'));
  const row = el('div', 'chest-row');
  meta.slots.forEach((slot, i) => {
    const s = el('div', `chest-slot ${slot.state}`);
    s.dataset.slot = String(i);
    if (slot.state === 'empty') {
      s.appendChild(el('div', 'slot-hole'));
      s.appendChild(el('div', 'slot-label', 'Empty'));
    } else {
      const cc = chestCanvas(70, 62, { kind: slot.kind, glow: slot.state === 'ready' ? 0.7 : 0 });
      s.appendChild(cc);
      if (slot.state === 'ready') {
        s.appendChild(el('div', 'slot-label', 'Open now!'));
        s.addEventListener('click', () => { unlockAudio(); sfx.tap(); openChest(i); });
      } else {
        const lab = el('div', 'slot-label', fmtClock(slot.secondsLeft));
        lab.dataset.timerSlot = String(i);
        s.appendChild(lab);
      }
    }
    row.appendChild(s);
  });
  shelf.appendChild(row);
  homeEl.appendChild(shelf);
}

function pill(iconCanvas, val, id) {
  const p = el('div', 'pill');
  iconCanvas.style.width = '20px'; iconCanvas.style.height = '20px';
  p.appendChild(iconCanvas);
  const v = el('span', 'val ot ot-sm', val);
  if (id) v.id = id;
  p.appendChild(v);
  return p;
}

function emblemCanvas() {
  const c = document.createElement('canvas');
  const s = 3, W = 130, H = 120;
  c.width = W * s; c.height = H * s;
  const x = c.getContext('2d');
  x.scale(s, s);
  x.lineJoin = 'round'; x.lineCap = 'round';
  // shield
  x.beginPath();
  x.moveTo(65, 112);
  x.bezierCurveTo(22, 92, 14, 58, 16, 26);
  x.bezierCurveTo(38, 28, 52, 22, 65, 12);
  x.bezierCurveTo(78, 22, 92, 28, 114, 26);
  x.bezierCurveTo(116, 58, 108, 92, 65, 112);
  x.closePath();
  x.strokeStyle = PAL.out; x.lineWidth = 7; x.stroke();
  const g = x.createLinearGradient(0, 12, 0, 112);
  g.addColorStop(0, '#4f8bf7'); g.addColorStop(1, '#2b58c8');
  x.fillStyle = g; x.fill();
  x.fillStyle = '#7db0ff66';
  x.beginPath();
  x.moveTo(65, 16); x.bezierCurveTo(54, 24, 40, 30, 24, 30);
  x.bezierCurveTo(23, 48, 26, 66, 38, 84);
  x.lineTo(65, 16);
  x.closePath(); x.fill();
  // crown in middle
  const cr = crownCanvas(56);
  x.drawImage(cr, 65 - 28, 40, 56, 48);
  return c;
}

// countdown ticker for timer chests
setInterval(() => {
  for (const slot of meta.slots) {
    if (slot.state === 'timer' && slot.secondsLeft > 0) slot.secondsLeft--;
  }
  if (state === 'HOME') {
    document.querySelectorAll('[data-timer-slot]').forEach((lab) => {
      const slot = meta.slots[Number(lab.dataset.timerSlot)];
      if (slot?.state === 'timer') lab.textContent = fmtClock(slot.secondsLeft);
    });
  }
}, 1000);

/* =====================================================================
   CHEST OPENING
   ===================================================================== */
const chestOv = document.getElementById('chest-overlay');
let chest = null; // {taps, open01, wobbleT, raysA, phase, canvas, ctx, slotIdx, particles}

function openChest(slotIdx, instant = false) {
  state = 'CHEST_OPENING';
  const slot = meta.slots[slotIdx];
  chestOv.classList.remove('hidden');
  chestOv.innerHTML = '';
  const cv = document.createElement('canvas');
  cv.id = 'chest-canvas';
  const s = 2;
  cv.width = 360 * s; cv.height = 640 * s;
  chestOv.appendChild(cv);
  const hint = el('div', 'chest-hint ot', 'Tap to open!');
  hint.id = 'chest-hint';
  chestOv.appendChild(hint);

  const rewards = el('div', 'rewards');
  rewards.id = 'chest-rewards';
  chestOv.appendChild(rewards);

  const ok = el('button', 'btn btn-blue');
  ok.id = 'btn-chest-ok';
  ok.appendChild(el('span', 'ot', 'Okay'));
  chestOv.appendChild(ok);

  chest = {
    taps: 0, open01: 0, wobble: 0, wobbleV: 0, scaleIn: 0, rise: 0,
    phase: 'in', raysA: 0, slotIdx, kind: slot?.kind || 'gold',
    canvas: cv, ctx: cv.getContext('2d'), particles: [], sparkT: 0,
    rewardsShown: false,
  };

  const onTap = () => {
    if (!chest) return;
    if (chest.phase === 'idle' || chest.phase === 'in') {
      chest.taps++;
      chest.wobbleV = 3.2 * (chest.taps % 2 ? 1 : -1);
      sfx.chestTap();
      burstAt(chest, 180, 330, '#ffd84e', 6, 90);
      if (chest.taps >= 3) {
        chest.phase = 'burst';
        chest.burstT = 0;
        sfx.chestOpen();
        document.getElementById('chest-hint').style.display = 'none';
      }
    }
  };
  chestOv.addEventListener('pointerdown', onTap);
  ok.addEventListener('click', (e) => {
    e.stopPropagation();
    sfx.tap();
    finishChest();
  });

  if (instant) { chest.taps = 3; chest.phase = 'burst'; chest.burstT = 0; hint.style.display = 'none'; }
}

function finishChest() {
  const slot = meta.slots[chest.slotIdx];
  if (slot) { slot.state = 'empty'; delete slot.kind; }
  meta.gold += chest.goldGain || 0;
  chest = null;
  chestOv.classList.add('hidden');
  state = 'HOME';
  buildHome();
  show('home');
}

function burstAt(ch, x, y, col, n, spd) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = spd * (0.5 + Math.random());
    ch.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, t: 0, life: 0.5 + Math.random() * 0.4, col, r: 2.4 + Math.random() * 3 });
  }
}

function updateChest(dt, t) {
  const ch = chest;
  if (!ch) return;
  const x = ch.ctx;
  x.setTransform(2, 0, 0, 2, 0, 0);
  x.clearRect(0, 0, 360, 640);
  x.lineJoin = 'round'; x.lineCap = 'round';

  ch.scaleIn = Math.min(1, ch.scaleIn + dt * 2.6);
  if (ch.phase === 'in' && ch.scaleIn >= 1) ch.phase = 'idle';

  // wobble physics
  ch.wobbleV += -ch.wobble * 34 * dt;
  ch.wobbleV *= 1 - 6 * dt;
  ch.wobble += ch.wobbleV * dt;

  const cx = 180;

  if (ch.phase === 'burst') {
    ch.burstT += dt;
    ch.open01 = Math.min(1, ch.burstT * 2.6);
    ch.raysA = Math.min(1, ch.burstT * 2);
    ch.rise = Math.min(1, ch.burstT * 1.8); // chest floats up to clear the rewards
    if (ch.burstT > 0.28 && !ch.raysBurstDone) {
      ch.raysBurstDone = true;
      burstAt(ch, cx, 250, '#ffe89c', 26, 240);
      burstAt(ch, cx, 250, '#fff', 12, 160);
    }
    if (ch.burstT > 0.75 && !ch.rewardsShown) {
      ch.rewardsShown = true;
      revealRewards(ch);
    }
  }

  const cy = 330 - easeOutCubic(ch.rise) * 100;

  // light rays behind chest
  if (ch.raysA > 0) {
    x.save();
    x.translate(cx, cy - 24);
    x.rotate(t * 0.35);
    x.globalAlpha = 0.5 * ch.raysA;
    for (let i = 0; i < 10; i++) {
      x.rotate(Math.PI / 5);
      const grd = x.createLinearGradient(0, 0, 250, 0);
      grd.addColorStop(0, '#ffe89cdd');
      grd.addColorStop(1, '#ffe89c00');
      x.fillStyle = grd;
      x.beginPath();
      x.moveTo(0, 0);
      x.lineTo(250, -26);
      x.lineTo(250, 26);
      x.closePath();
      x.fill();
    }
    x.restore();
    x.globalAlpha = 1;
  }

  // idle sparkles / burst mote column between body and lid
  ch.sparkT -= dt;
  if (ch.sparkT <= 0) {
    if (ch.phase === 'burst') {
      ch.sparkT = 0.045;
      // rising golden motes filling the gap up to the floating lid
      ch.particles.push({
        x: cx + (Math.random() * 76 - 38), y: cy - 20 - Math.random() * 14,
        t: 0, life: 0.75 + Math.random() * 0.3,
        col: Math.random() < 0.4 ? '#fff' : '#ffe89c',
        r: 1.6 + Math.random() * 2.6, spark: Math.random() < 0.35,
        vx: (Math.random() - 0.5) * 16, vy: -95 - Math.random() * 70,
      });
    } else {
      ch.sparkT = 0.5 + Math.random() * 0.5;
      ch.particles.push({
        x: cx + (Math.random() * 120 - 60), y: cy - 20 + (Math.random() * 70 - 35),
        t: 0, life: 0.7, col: '#fff', r: 2, spark: true, vx: 0, vy: -14,
      });
    }
  }

  // ground shadow (stays put, shrinks as the chest rises)
  const shk = 1 - ch.rise * 0.45;
  x.fillStyle = '#00000042';
  x.beginPath();
  x.ellipse(cx, 366, 58 * ch.scaleIn * shk, 12 * ch.scaleIn * shk, 0, 0, Math.PI * 2);
  x.fill();

  const sc = easeOutCubic(ch.scaleIn);
  x.save();
  x.translate(cx, cy);
  x.scale(sc, sc);
  x.translate(-cx, -cy);
  const bounce = ch.phase === 'burst' ? Math.sin(t * 3.2) * 4 : 0;
  drawChest(x, cx, cy + bounce, 116, { open01: ch.open01, wobble: ch.wobble, glow: ch.phase === 'burst' ? 1 : 0.45 + 0.2 * Math.sin(t * 3), kind: ch.kind });
  x.restore();

  // tap counter pips
  if (ch.phase === 'idle' || ch.phase === 'in') {
    for (let i = 0; i < 3; i++) {
      x.beginPath();
      x.arc(cx - 22 + i * 22, 396, 6, 0, Math.PI * 2);
      x.strokeStyle = PAL.out; x.lineWidth = 3; x.stroke();
      x.fillStyle = i < ch.taps ? '#ffd84e' : '#3a3354';
      x.fill();
    }
  }

  // particles
  for (const p of ch.particles) {
    p.t += dt;
    p.x += (p.vx || 0) * dt;
    p.y += (p.vy || 0) * dt;
    if (!p.spark) p.vy += 190 * dt;
  }
  ch.particles = ch.particles.filter((p) => p.t < p.life);
  for (const p of ch.particles) {
    const k = p.t / p.life;
    x.globalAlpha = 1 - k;
    if (p.spark) {
      x.strokeStyle = p.col; x.lineWidth = 1.6;
      const r = p.r * (1 + k * 1.4);
      x.beginPath();
      x.moveTo(p.x - r, p.y); x.lineTo(p.x + r, p.y);
      x.moveTo(p.x, p.y - r); x.lineTo(p.x, p.y + r);
      x.stroke();
    } else {
      x.fillStyle = p.col;
      x.beginPath(); x.arc(p.x, p.y, p.r * (1 - k * 0.4), 0, Math.PI * 2); x.fill();
    }
  }
  x.globalAlpha = 1;
}

function revealRewards(ch) {
  const rewards = document.getElementById('chest-rewards');
  const goldGain = 120 + Math.floor(Math.random() * 140);
  ch.goldGain = goldGain;

  // gold row
  const gr = el('div', 'reward-gold');
  const gc = coinCanvas(30);
  gr.appendChild(gc);
  const amt = el('span', 'amt ot', '0');
  gr.appendChild(amt);
  rewards.appendChild(gr);
  setTimeout(() => {
    gr.classList.add('reward-in');
    let shown = 0;
    const iv = setInterval(() => {
      shown = Math.min(goldGain, shown + Math.ceil(goldGain / 22));
      amt.textContent = `+${shown}`;
      sfx.coin(shown % 5);
      if (shown >= goldGain) clearInterval(iv);
    }, 40);
  }, 120);

  // card stacks
  const picks = pickN(CARDS, 3);
  const cardsRow = el('div', 'reward-cards');
  rewards.appendChild(cardsRow);
  picks.forEach((def, i) => {
    const st = el('div', 'card-stack');
    const img = document.createElement('img');
    img.src = cardCanvas(def, 74, 92).toDataURL();
    st.appendChild(img);
    const n = def.rarity === 'epic' ? 1 : def.rarity === 'rare' ? 3 : 8;
    st.appendChild(el('div', 'cnt ot ot-sm', `x${n}`));
    cardsRow.appendChild(st);
    setTimeout(() => { st.classList.add('reward-in'); sfx.cardReveal(); }, 620 + i * 300);
  });

  setTimeout(() => document.getElementById('btn-chest-ok')?.classList.add('show'), 1500);
}

function pickN(arr, n) {
  const pool = arr.slice();
  const out = [];
  while (out.length < n && pool.length) {
    out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return out;
}

/* ---------- confetti (result screen) ---------- */
let confettiRAF = 0;
function startConfetti(cv) {
  cancelAnimationFrame(confettiRAF);
  const x = cv.getContext('2d');
  const cols = ['#ffc93c', '#e453e0', '#3f7cf6', '#3ddc84', '#ff6b5e', '#ffffff'];
  const flakes = [];
  for (let i = 0; i < 90; i++) {
    flakes.push({
      x: Math.random() * 720,
      y: -40 - Math.random() * 1280,
      w: 10 + Math.random() * 8,
      h: 7 + Math.random() * 5,
      col: cols[i % cols.length],
      vy: 110 + Math.random() * 130,
      vx: (Math.random() - 0.5) * 50,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 7,
      sway: Math.random() * Math.PI * 2,
    });
  }
  let last = performance.now();
  const step = (now) => {
    if (!cv.isConnected) return; // screen rebuilt
    const dt = Math.min(0.06, (now - last) / 1000);
    last = now;
    x.clearRect(0, 0, 720, 1280);
    for (const f of flakes) {
      f.sway += dt * 3;
      f.x += (f.vx + Math.sin(f.sway) * 40) * dt;
      f.y += f.vy * dt;
      f.rot += f.vr * dt;
      if (f.y > 1320) { f.y = -30; f.x = Math.random() * 720; }
      x.save();
      x.translate(f.x, f.y);
      x.rotate(f.rot);
      x.scale(1, 0.6 + 0.4 * Math.sin(f.sway * 1.7)); // flutter
      x.fillStyle = f.col;
      x.fillRect(-f.w / 2, -f.h / 2, f.w, f.h);
      x.restore();
    }
    confettiRAF = requestAnimationFrame(step);
  };
  confettiRAF = requestAnimationFrame(step);
}

/* =====================================================================
   BATTLE
   ===================================================================== */
const battleEl = screens.battle;
const arenaCanvas = document.getElementById('arena');
const hudEl = document.getElementById('battle-hud');
let battle = null;
let renderer = null;
let selectedCard = null;
let hudRefs = {};

function startBattle(opts = {}) {
  state = 'BATTLE';
  selectedCard = null;
  battle = new Battle({
    tick: () => sfx.countdown(),
    cardPlayed: (side, card) => { if (side === 'player') { sfx.deploy(); sfx.elixirSpend(); } else sfx.deploy(); },
    spellLaunched: () => sfx.spellLaunch(),
    spellHit: () => sfx.explosion(),
    melee: () => sfx.hit(),
    ranged: () => sfx.arrow(),
    unitDied: () => sfx.poof(),
    towerDown: () => { sfx.towerDown(); },
    crowns: (side) => { sfx.crown(); bumpCrown(side); },
    handChanged: (idx) => refillHand(idx),
    finished: (result) => {
      setTimeout(() => showResult(result, [battle.sides.player.crowns, battle.sides.enemy.crowns]), 1400);
    },
  });
  window.__game.battle = battle;
  renderer = new ArenaRenderer(arenaCanvas);
  renderer.resize(360, AH);
  arenaCanvas.style.height = `${AH}px`;
  buildBattleHud();
  transition('battle', () => {});
  show('battle');
}

function buildBattleHud() {
  hudEl.innerHTML = '';
  hudRefs = {};

  // opponent banner
  const opp = el('div', 'hud-opponent');
  opp.appendChild(el('div', 'lvl ot ot-sm', '8'));
  opp.appendChild(el('span', 'oname ot ot-sm', OPPONENT_NAME));
  hudEl.appendChild(opp);

  // timer
  const tm = el('div', 'hud-timer');
  tm.appendChild(el('span', 'lab', 'Time left:'));
  const tv = el('span', 'tval ot ot-sm', '3:00');
  tm.appendChild(tv);
  hudEl.appendChild(tm);
  hudRefs.timer = tv;
  hudRefs.timerBox = tm;

  // crown counters (right edge midfield)
  const cm = el('div', 'crowns-mid');
  for (const side of ['enemy', 'player']) {
    const cc = el('div', `crown-counter ${side}`);
    const img = document.createElement('img');
    img.src = crownCanvas(24, side === 'enemy' ? '#ff8a70' : '#ffd84e').toDataURL();
    cc.appendChild(img);
    const v = el('span', 'cv ot ot-sm', '0');
    cc.appendChild(v);
    cm.appendChild(cc);
    hudRefs[`crown_${side}`] = { box: cc, val: v };
  }
  hudEl.appendChild(cm);

  // bottom panel
  const bottom = el('div', 'hud-bottom');
  const handRow = el('div', 'hand-row');

  const nextWrap = el('div', 'next-wrap');
  nextWrap.appendChild(el('div', 'next-label', 'Next:'));
  const nc = el('div', 'next-card');
  const nimg = document.createElement('img');
  nc.appendChild(nimg);
  nextWrap.appendChild(nc);
  handRow.appendChild(nextWrap);
  hudRefs.nextImg = nimg;

  const cardsBox = el('div', 'cards');
  hudRefs.cardEls = [];
  for (let i = 0; i < 4; i++) {
    const cd = el('div', 'card');
    cd.dataset.idx = String(i);
    const img = document.createElement('img');
    cd.appendChild(img);
    const cost = el('div', 'cost ot ot-sm', '');
    const drop = elixirDropCanvas(26, 30);
    cost.style.background = `url(${drop.toDataURL()}) no-repeat center / contain`;
    cd.appendChild(cost);
    cardsBox.appendChild(cd);
    hudRefs.cardEls.push({ box: cd, img, cost });
    cd.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      selectCard(i);
    });
  }
  handRow.appendChild(cardsBox);
  bottom.appendChild(handRow);

  // elixir row
  const er = el('div', 'elixir-row');
  const dw = el('div', 'elixir-drop-wrap');
  const dimg = document.createElement('img');
  dimg.src = elixirDropCanvas(27, 30).toDataURL();
  dw.appendChild(dimg);
  const ev = el('div', 'ev ot ot-sm', '5');
  dw.appendChild(ev);
  er.appendChild(dw);
  hudRefs.elixirNum = ev;
  const bar = el('div', 'elixir-bar');
  const fill = el('div', 'elixir-fill');
  bar.appendChild(fill);
  const segs = el('div', 'elixir-segs');
  for (let i = 0; i < RULES.elixirMax; i++) segs.appendChild(el('i'));
  bar.appendChild(segs);
  const flash = el('div', 'spend-flash');
  bar.appendChild(flash);
  er.appendChild(bar);
  bottom.appendChild(er);
  hudRefs.elixirFill = fill;
  hudRefs.spendFlash = flash;

  hudEl.appendChild(bottom);

  // deploy ghost
  const ghost = el('div', '');
  ghost.id = 'deploy-ghost';
  const gimg = document.createElement('img');
  ghost.appendChild(gimg);
  hudEl.appendChild(ghost);
  hudRefs.ghost = ghost;
  hudRefs.ghostImg = gimg;

  refreshHandArt();

  // arena tap-to-deploy
  arenaCanvas.addEventListener('pointerdown', onArenaTap);
  arenaCanvas.addEventListener('pointermove', onArenaMove);
}

function refreshHandArt() {
  battle.hand.forEach((id, i) => {
    const def = CARD_BY_ID[id];
    const ref = hudRefs.cardEls[i];
    ref.img.src = cardCanvas(def, 71, 86).toDataURL();
    ref.cost.textContent = String(def.cost);
    ref.box.dataset.card = id;
  });
  hudRefs.nextImg.src = cardCanvas(CARD_BY_ID[battle.nextCard], 46, 57).toDataURL();
}

function refillHand(idx) {
  const ref = hudRefs.cardEls[idx];
  refreshHandArt();
  ref.box.classList.remove('dealt');
  void ref.box.offsetWidth;
  ref.box.classList.add('dealt');
  hudRefs.elixirFill.classList.add('drain');
  setTimeout(() => hudRefs.elixirFill.classList.remove('drain'), 320);
  const fl = hudRefs.spendFlash;
  fl.classList.remove('go');
  void fl.offsetWidth;
  fl.classList.add('go');
}

function selectCard(i) {
  const id = battle.hand[i];
  if (!battle.canPlay('player', id)) { sfx.tap(); return; }
  sfx.select();
  if (selectedCard === i) { selectedCard = null; }
  else selectedCard = i;
  hudRefs.cardEls.forEach((r, j) => r.box.classList.toggle('selected', j === selectedCard));
  const g = hudRefs.ghost;
  if (selectedCard != null) {
    hudRefs.ghostImg.src = hudRefs.cardEls[i].img.src;
  } else {
    g.style.display = 'none';
  }
}

function arenaPoint(e) {
  const r = arenaCanvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * AW;
  const y = ((e.clientY - r.top) / r.height) * AH;
  return [x, y];
}

function onArenaMove(e) {
  if (selectedCard == null) return;
  const g = hudRefs.ghost;
  const r = arenaCanvas.getBoundingClientRect();
  const sr = stage.getBoundingClientRect();
  const k = sr.width / 360;
  g.style.display = 'block';
  g.style.left = `${(e.clientX - sr.left) / k}px`;
  g.style.top = `${(e.clientY - sr.top) / k}px`;
}

function onArenaTap(e) {
  if (selectedCard == null || !battle || battle.over) return;
  const [x, y] = arenaPoint(e);
  const id = battle.hand[selectedCard];
  const ok = battle.playCard('player', id, x, y);
  if (ok) {
    selectedCard = null;
    hudRefs.cardEls.forEach((r) => r.box.classList.remove('selected'));
    hudRefs.ghost.style.display = 'none';
  }
}

function bumpCrown(side) {
  const ref = hudRefs[`crown_${side}`];
  if (!ref) return;
  ref.box.classList.remove('bump');
  void ref.box.offsetWidth;
  ref.box.classList.add('bump');
}

function updateBattleHud() {
  if (!battle) return;
  hudRefs.timer.textContent = fmtTime(battle.timeLeft);
  hudRefs.timerBox.classList.toggle('hurry', battle.timeLeft <= 30);
  const e = battle.sides.player.elixir;
  hudRefs.elixirNum.textContent = String(Math.floor(e));
  hudRefs.elixirFill.style.width = `${(e / RULES.elixirMax) * 100}%`;
  hudRefs.crown_player.val.textContent = String(battle.sides.player.crowns);
  hudRefs.crown_enemy.val.textContent = String(battle.sides.enemy.crowns);
  battle.hand.forEach((id, i) => {
    const def = CARD_BY_ID[id];
    hudRefs.cardEls[i].box.classList.toggle('unaffordable', e < def.cost);
  });
}

/* =====================================================================
   RESULT
   ===================================================================== */
function showResult(result, crowns = [0, 0]) {
  state = 'RESULT';
  const [pc, ec] = crowns;
  const rEl = screens.result;
  rEl.innerHTML = '';
  rEl.appendChild(el('div', 'result-rays'));

  // confetti celebration on wins
  if (result === 'win') {
    const cv = document.createElement('canvas');
    cv.className = 'confetti';
    cv.width = 720; cv.height = 1280;
    rEl.appendChild(cv);
    startConfetti(cv);
  }

  const banner = el('div', `result-banner ${result === 'win' ? 'win' : result === 'lose' ? 'lose' : 'draw'}`);
  banner.appendChild(el('div', 'rt ot', result === 'win' ? 'Victory!' : result === 'lose' ? 'Defeat' : 'Draw'));
  rEl.appendChild(banner);

  const cr = el('div', 'crown-row');
  for (let i = 0; i < 3; i++) {
    const cslot = el('div', 'crown-slot');
    const img = document.createElement('img');
    img.src = crownCanvas(46).toDataURL();
    cslot.appendChild(img);
    cr.appendChild(cslot);
    if (i < pc) {
      setTimeout(() => { cslot.classList.add('earned'); sfx.crown(); }, 500 + i * 320);
    }
  }
  rEl.appendChild(cr);

  const sub = el('div', 'result-sub ot ot-sm',
    result === 'win' ? `You ${pc} — ${ec} ${OPPONENT_NAME}` :
    result === 'lose' ? `You ${pc} — ${ec} ${OPPONENT_NAME}` : `Tied ${pc} — ${ec}`);
  rEl.appendChild(sub);

  // reward chest on win (if empty slot)
  let gained = false;
  if (result === 'win') {
    const emptyIdx = meta.slots.findIndex((s) => s.state === 'empty');
    if (emptyIdx >= 0) {
      meta.slots[emptyIdx] = { state: 'ready', kind: Math.random() < 0.5 ? 'wood' : 'gold' };
      gained = true;
      const cw = el('div', 'result-chest-wrap show');
      const img = document.createElement('img');
      img.src = chestCanvas(108, 96, { kind: meta.slots[emptyIdx].kind, glow: 0.65 }).toDataURL();
      cw.appendChild(img);
      cw.appendChild(el('div', 'rc-label ot ot-sm', 'Chest earned!'));
      rEl.appendChild(cw);
    }
    meta.gold += 32;
    sfx.victory();
  } else if (result === 'lose') {
    sfx.defeat();
  }

  const btn = el('button', 'btn btn-yellow');
  btn.id = 'btn-continue';
  btn.appendChild(el('span', 'ot', 'Continue'));
  btn.addEventListener('click', () => {
    sfx.tap();
    battle = null;
    window.__game.battle = null;
    transition('home', () => { state = 'HOME'; buildHome(); });
  });
  rEl.appendChild(btn);

  transition('result', () => {});
  show('result');
}

/* =====================================================================
   MAIN LOOP
   ===================================================================== */
let last = performance.now();
let acc = 0;
const STEP = 1 / 60;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const t = now / 1000;

  if (state === 'BATTLE' && battle) {
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 5) { battle.update(STEP); acc -= STEP; n++; }
    renderer.render(battle, t, selectedCard != null);
    updateBattleHud();
  } else if (state === 'CHEST_OPENING') {
    updateChest(dt, t);
  } else if (state === 'RESULT' && battle && renderer) {
    battle.update(dt); // keep particles settling behind the overlay
  }

  requestAnimationFrame(frame);
}

buildHome();
show('home');
document.addEventListener('pointerdown', unlockAudio, { once: true });
requestAnimationFrame(frame);
