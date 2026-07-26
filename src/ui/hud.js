// In-game HUD: crosshair, vitals, ammo, mission status, minimap, prompts,
// subtitles, damage feedback. DOM-based (crisp at any resolution).
// Visual language: docs/visual-bible.md — quiet corners, mono data, scrims.

import { on } from '../core/events.js';
import { getSetting } from '../core/settings.js';
import { WEAPONS } from '../game/constants.js';
import { weaponSvg } from './weaponIcons.js';

let root, crosshair, hitmarker, hpFill, hpBar, hpNum, arFill, arNum, ammoCount, ammoWpn,
  weaponName, fireMode, gadgetRow, reloadBar, reloadFill, missionTimer, phaseTrack,
  objectiveLine, hostageStatus, interactPrompt, interactText,
  subtitles, announceBox, announceMain, announceSub, damageVignette, flashOverlay, dmgDir,
  minimapCanvas, minimapLevel, qaOverlay;

const subtitleQueue = [];
let announceTimer = 0;
const dmgArcs = [];

// mission phase ladder shown as progression ticks (top-right)
const PHASES = [
  ['infiltrate', 'INFIL'],
  ['locate', 'LOCATE'],
  ['rescue', 'RESCUE'],
  ['extract', 'EXFIL'],
];

export function buildHud() {
  root = document.getElementById('hud-root');
  root.innerHTML = `
    <div id="play-vignette"></div>
    <div id="damage-vignette"></div>
    <div id="flash-overlay"></div>
    <div id="crosshair"><div class="line l-t"></div><div class="line l-b"></div><div class="line l-l"></div><div class="line l-r"></div><div class="dot"></div></div>
    <div id="hitmarker"><div class="hm hm1"></div><div class="hm hm2"></div><div class="hm hm3"></div><div class="hm hm4"></div></div>
    <div id="dmg-dir"></div>
    <div class="hud-corner hud-chip" id="vitals">
      <div class="bar-label"><span>INTEGRITY</span><span class="num" id="hp-num">100</span></div>
      <div class="bar" id="hp-bar"><div class="fill"></div></div>
      <div class="bar-label"><span>PLATES</span><span class="num" id="ar-num">100</span></div>
      <div class="bar" id="ar-bar"><div class="fill"></div></div>
    </div>
    <div class="hud-corner hud-chip" id="ammo-block">
      <div id="ammo-wpn"></div>
      <div id="weapon-name">—</div>
      <div id="ammo-count"><span class="mag">—</span><span class="res"> / —</span></div>
      <div id="reload-bar"><span class="fill"></span></div>
      <div id="fire-mode">—</div>
      <div id="gadget-row"></div>
    </div>
    <div class="hud-corner hud-chip" id="mission-block">
      <div id="mission-timer">--:--</div>
      <div id="phase-track"></div>
      <div id="objective-line">—</div>
      <div id="hostage-status"></div>
    </div>
    <div class="hud-corner" id="minimap-wrap"><canvas width="416" height="416"></canvas><div id="minimap-label"><b id="mm-level">L1</b><span>NORTHSTAR ADMIN</span></div></div>
    <div id="interact-prompt"><kbd>E</kbd><span id="interact-text"></span></div>
    <div id="subtitles"></div>
    <div id="announce"><div class="a-main"></div><div class="a-sub"></div></div>
  `;
  qaOverlay = document.createElement('div');
  qaOverlay.id = 'qa-overlay';
  document.body.appendChild(qaOverlay);

  crosshair = root.querySelector('#crosshair');
  hitmarker = root.querySelector('#hitmarker');
  hpBar = root.querySelector('#hp-bar');
  hpFill = root.querySelector('#hp-bar .fill');
  hpNum = root.querySelector('#hp-num');
  arFill = root.querySelector('#ar-bar .fill');
  arNum = root.querySelector('#ar-num');
  ammoCount = root.querySelector('#ammo-count');
  ammoWpn = root.querySelector('#ammo-wpn');
  weaponName = root.querySelector('#weapon-name');
  fireMode = root.querySelector('#fire-mode');
  gadgetRow = root.querySelector('#gadget-row');
  reloadBar = root.querySelector('#reload-bar');
  reloadFill = root.querySelector('#reload-bar .fill');
  missionTimer = root.querySelector('#mission-timer');
  phaseTrack = root.querySelector('#phase-track');
  objectiveLine = root.querySelector('#objective-line');
  hostageStatus = root.querySelector('#hostage-status');
  interactPrompt = root.querySelector('#interact-prompt');
  interactText = root.querySelector('#interact-text');
  subtitles = root.querySelector('#subtitles');
  announceBox = root.querySelector('#announce');
  announceMain = root.querySelector('#announce .a-main');
  announceSub = root.querySelector('#announce .a-sub');
  damageVignette = root.querySelector('#damage-vignette');
  flashOverlay = root.querySelector('#flash-overlay');
  dmgDir = root.querySelector('#dmg-dir');
  minimapCanvas = root.querySelector('#minimap-wrap canvas');
  minimapLevel = root.querySelector('#mm-level');

  // phase progression ticks
  for (const [, label] of PHASES) {
    const pip = document.createElement('span');
    pip.className = 'phase-pip';
    pip.textContent = label;
    phaseTrack.appendChild(pip);
  }

  on('hit-marker', ({ kind }) => {
    hitmarker.classList.remove('show', 'kill');
    void hitmarker.offsetWidth; // restart animation
    hitmarker.classList.add('show');
    if (kind === 'kill' || kind === 'headshot') hitmarker.classList.add('kill');
  });
  on('subtitle', ({ speaker, text, ttl = 3.4 }) => {
    if (!getSetting('subtitles')) return;
    subtitleQueue.push({ speaker, text, ttl });
    if (subtitleQueue.length > 3) subtitleQueue.shift();
    renderSubtitles();
  });
  on('announce', ({ main, sub, ttl = 3 }) => {
    announceMain.textContent = main || '';
    announceSub.textContent = sub || '';
    announceBox.classList.add('show');
    announceTimer = ttl;
  });
  on('damage', ({ target, dir }) => {
    if (target !== 'player' || !dir) return;
    addDamageArc(dir);
  });
}

function renderSubtitles() {
  subtitles.innerHTML = '';
  for (const s of subtitleQueue) {
    const div = document.createElement('div');
    div.className = 'subtitle-line';
    div.innerHTML = s.speaker ? `<span class="spk">${s.speaker}</span>${s.text}` : s.text;
    subtitles.appendChild(div);
  }
}

function addDamageArc(angleRad) {
  const arc = document.createElement('div');
  arc.className = 'dmg-arc';
  arc.style.transform = `rotate(${angleRad}rad)`;
  dmgDir.appendChild(arc);
  requestAnimationFrame(() => { arc.style.opacity = '1'; });
  dmgArcs.push({ el: arc, ttl: 1.1 });
}

export function updateHudTick(dt) {
  // subtitle + announce timers (called from sim step so tests advance them)
  for (let i = subtitleQueue.length - 1; i >= 0; i--) {
    subtitleQueue[i].ttl -= dt;
    if (subtitleQueue[i].ttl <= 0) { subtitleQueue.splice(i, 1); renderSubtitles(); }
  }
  if (announceTimer > 0) {
    announceTimer -= dt;
    if (announceTimer <= 0) announceBox.classList.remove('show');
  }
  for (let i = dmgArcs.length - 1; i >= 0; i--) {
    dmgArcs[i].ttl -= dt;
    if (dmgArcs[i].ttl < 0.35) dmgArcs[i].el.style.opacity = '0';
    if (dmgArcs[i].ttl <= 0) { dmgArcs[i].el.remove(); dmgArcs.splice(i, 1); }
  }
}

// reload micro-bar bookkeeping (total inferred from the weapon state timer)
let lastAmmoSvgId = null;
let reloadTotal = 0;
let reloadPrevTimer = 0;

const initialsOf = (name) =>
  name.replace(/^(Dr|Mr|Ms|Mrs)\.\s*/i, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export function renderHud(game) {
  if (!game || !root) return;
  const p = game.player;

  // vitals
  const hp = Math.max(0, Math.ceil(p.health));
  hpFill.style.setProperty('--v', hp / 100);
  hpNum.textContent = hp;
  hpBar.classList.toggle('low', hp <= 30);
  const ar = Math.max(0, Math.ceil(p.armor));
  arFill.style.setProperty('--v', ar / 100);
  arNum.textContent = ar;

  // ammo
  const ws = game.weapons.getHudState();
  weaponName.textContent = ws.name;
  if (ws.id !== lastAmmoSvgId) { ammoWpn.innerHTML = weaponSvg(ws.id); lastAmmoSvgId = ws.id; }
  const mag = ammoCount.querySelector('.mag'), res = ammoCount.querySelector('.res');
  if (ws.cls === 'melee') { mag.textContent = '—'; res.textContent = ''; }
  else if (ws.cls === 'gadget') { mag.textContent = `×${ws.mag}`; res.textContent = ''; }
  else { mag.textContent = ws.mag; res.textContent = ` / ${ws.reserve}`; }
  const isGun = ws.cls !== 'melee' && ws.cls !== 'gadget';
  const magCap = WEAPONS[ws.id]?.mag || 0;
  ammoCount.classList.toggle('reloading', ws.state === 'reload');
  ammoCount.classList.toggle('empty', isGun && ws.mag === 0);
  ammoCount.classList.toggle('low', isGun && ws.mag > 0 && ws.mag <= Math.max(1, Math.ceil(magCap * 0.25)));
  fireMode.textContent = ws.state === 'reload' ? 'RELOADING' : ws.mode;

  // reload progress micro-bar
  if (ws.state === 'reload') {
    const t = Math.max(0, game.weapons.timer || 0);
    if (reloadTotal <= 0 || t > reloadPrevTimer) reloadTotal = t; // new reload (or next shell)
    reloadPrevTimer = t;
    reloadBar.classList.add('show');
    reloadFill.style.width = `${Math.round((1 - t / Math.max(0.001, reloadTotal)) * 100)}%`;
  } else {
    reloadTotal = 0; reloadPrevTimer = 0;
    reloadBar.classList.remove('show');
    reloadFill.style.width = '0%';
  }

  // gadget pips
  gadgetRow.innerHTML = '';
  if (ws.gadget.id) {
    const pip = document.createElement('div');
    pip.className = 'gadget-pip' + (game.weapons.slot === 'gadget' ? ' active' : '');
    pip.textContent = `${WEAPONS[ws.gadget.id].name.split(' ')[0]} ×${ws.gadget.count}`;
    gadgetRow.appendChild(pip);
  }

  // crosshair spread + visibility
  const showCh = getSetting('crosshair') && !ws.ads && ws.cls !== 'gadget';
  crosshair.classList.toggle('hidden', !showCh);
  if (showCh) {
    const bloomPx = 5 + game.weapons.bloom * 9 + (p.moveState === 'run' ? 6 : p.moveState === 'walk' ? 3 : 0) + (p.grounded ? 0 : 9);
    crosshair.style.setProperty('--gap', `${bloomPx.toFixed(1)}px`);
  }

  // mission
  const t = Math.max(0, game.missionTimeLeft);
  const mm = Math.floor(t / 60), ss = Math.floor(t % 60);
  missionTimer.textContent = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  missionTimer.classList.toggle('urgent', t < 90);
  // phase progression ticks
  const phaseIdx = game.phase === 'done' ? PHASES.length : PHASES.findIndex(([id]) => id === game.phase);
  [...phaseTrack.children].forEach((pip, i) => {
    pip.classList.toggle('done', phaseIdx > i);
    pip.classList.toggle('now', phaseIdx === i);
  });
  objectiveLine.textContent = game.currentObjectiveText();
  hostageStatus.innerHTML = '';
  for (const h of game.hostages) {
    const pip = document.createElement('div');
    pip.className = `hostage-pip ${h.state === 'following' ? 'following' : h.state === 'extracted' ? 'secured' : h.found ? 'found' : ''}`;
    const chip = document.createElement('span');
    chip.className = 'hp-init';
    chip.textContent = initialsOf(h.name);
    pip.appendChild(chip);
    pip.appendChild(document.createTextNode(h.stateLabel().toUpperCase()));
    hostageStatus.appendChild(pip);
  }

  // interact prompt
  const it = game.currentInteractable;
  interactPrompt.classList.toggle('show', !!it);
  if (it) interactText.textContent = it.prompt;

  // damage vignette
  damageVignette.style.opacity = Math.min(0.95, p.damageTint + (p.health < 30 ? 0.35 : 0));
  flashOverlay.style.opacity = game.playerFlash || 0;

  renderMinimap(game);
}

export function setQaOverlay(text) {
  if (!qaOverlay) return;
  qaOverlay.classList.toggle('show', !!text);
  qaOverlay.textContent = text || '';
}

// ---------------- minimap ----------------
// Canvas is authored at 2× (416px backing, 208px CSS) so lines stay crisp on
// high-DPI displays. Glyph grammar per visual bible §6: player = wedge with
// FOV cone, hostage = 4-point star, extraction = diamond, doors = amber ticks.
const MM_DPR = 2;
function renderMinimap(game) {
  const ctx = minimapCanvas.getContext('2d');
  const W = minimapCanvas.width, H = minimapCanvas.height;
  ctx.clearRect(0, 0, W, H);
  const p = game.player;
  const scale = 4.6 * MM_DPR; // px per meter
  const cx = W / 2, cz = H / 2;
  const level = p.pos.y < -1.6 ? 'b' : 'g';
  // rotation that maps player-forward to screen-up (yaw 0 = north = −Z)
  const theta = p.yaw;

  ctx.save();
  ctx.translate(cx, cz);
  // rotate map so player-forward is up
  ctx.rotate(theta);
  ctx.translate(-p.pos.x * scale, -p.pos.z * scale);

  ctx.strokeStyle = 'rgba(127,210,255,0.5)';
  ctx.lineWidth = 1.6 * MM_DPR;
  for (const run of game.world._wallRuns || []) {
    if (run.level !== level) continue;
    ctx.beginPath();
    if (run.dir === 'x') { ctx.moveTo(run.a * scale, run.line * scale); ctx.lineTo(run.b * scale, run.line * scale); }
    else { ctx.moveTo(run.line * scale, run.a * scale); ctx.lineTo(run.line * scale, run.b * scale); }
    ctx.stroke();
  }
  // doors as gaps -> draw open doors lighter
  ctx.strokeStyle = 'rgba(255,180,84,0.85)';
  for (const d of game.world.doors) {
    if (d.level !== level) continue;
    ctx.globalAlpha = d.state === 'open' ? 0.25 : 0.9;
    ctx.beginPath();
    if (d.def.dir === 'x') { ctx.moveTo(d.def.span[0] * scale, d.def.line * scale); ctx.lineTo(d.def.span[1] * scale, d.def.line * scale); }
    else { ctx.moveTo(d.def.line * scale, d.def.span[0] * scale); ctx.lineTo(d.def.line * scale, d.def.span[1] * scale); }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // objectives
  for (const h of game.hostages) {
    if (h.state === 'extracted' || h.state === 'dead') continue;
    if (!h.found && !game.qaRevealAll) continue;
    starGlyph(ctx, h.pos.x * scale, h.pos.z * scale, 5.5 * MM_DPR, h.state === 'following' ? '#7fd2ff' : '#ffb454', -theta);
  }
  if (game.extractionVisible()) {
    diamondGlyph(ctx, game.extraction.x * scale, game.extraction.z * scale, 5 * MM_DPR, '#7dd87d', -theta);
  }
  ctx.restore();

  // player FOV wedge (fixed center, forward = up)
  const fovHalf = Math.PI / 4.4;
  const fovR = 46 * MM_DPR;
  const cone = ctx.createRadialGradient(cx, cz, 2 * MM_DPR, cx, cz, fovR);
  cone.addColorStop(0, 'rgba(232,241,248,0.22)');
  cone.addColorStop(1, 'rgba(232,241,248,0)');
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.moveTo(cx, cz);
  ctx.arc(cx, cz, fovR, -Math.PI / 2 - fovHalf, -Math.PI / 2 + fovHalf);
  ctx.closePath();
  ctx.fill();

  // player wedge
  ctx.fillStyle = '#e8f1f8';
  ctx.strokeStyle = 'rgba(6,10,16,0.85)';
  ctx.lineWidth = 1.2 * MM_DPR;
  ctx.save();
  ctx.translate(cx, cz);
  ctx.beginPath();
  ctx.moveTo(0, -7 * MM_DPR); ctx.lineTo(5 * MM_DPR, 6 * MM_DPR); ctx.lineTo(0, 3 * MM_DPR); ctx.lineTo(-5 * MM_DPR, 6 * MM_DPR);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // north indicator riding the map edge (world north = −Z, rotated with map)
  const nR = W / 2 - 13 * MM_DPR;
  const nx = cx + nR * Math.sin(theta);
  const ny = cz - nR * Math.cos(theta);
  ctx.fillStyle = 'rgba(127,210,255,0.9)';
  ctx.save();
  ctx.translate(nx, ny);
  ctx.rotate(theta);
  ctx.beginPath();
  ctx.moveTo(0, -5 * MM_DPR); ctx.lineTo(3.2 * MM_DPR, 3 * MM_DPR); ctx.lineTo(-3.2 * MM_DPR, 3 * MM_DPR);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.font = `700 ${8 * MM_DPR}px monospace`;
  ctx.textAlign = 'center';
  ctx.fillText('N', nx, ny + 12 * MM_DPR);
  ctx.textAlign = 'start';

  // level chip in the frame label
  if (minimapLevel) minimapLevel.textContent = level === 'b' ? 'B1 SERVICE' : 'L1 GROUND';
}

// 4-point star (hostage), counter-rotated so it stays upright on screen
function starGlyph(ctx, x, z, r, color, upright = 0) {
  ctx.save();
  ctx.translate(x, z);
  ctx.rotate(upright);
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(6,10,16,0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.32, -r * 0.32); ctx.lineTo(r, 0); ctx.lineTo(r * 0.32, r * 0.32);
  ctx.lineTo(0, r); ctx.lineTo(-r * 0.32, r * 0.32); ctx.lineTo(-r, 0); ctx.lineTo(-r * 0.32, -r * 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// diamond (extraction)
function diamondGlyph(ctx, x, z, r, color, upright = 0) {
  ctx.save();
  ctx.translate(x, z);
  ctx.rotate(upright);
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(6,10,16,0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -r); ctx.lineTo(r * 0.72, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.72, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
