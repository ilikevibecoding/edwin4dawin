// In-game HUD: crosshair, vitals, ammo, mission status, minimap, prompts,
// subtitles, damage feedback. DOM-based (crisp at any resolution).

import { on } from '../core/events.js';
import { getSetting } from '../core/settings.js';
import { WEAPONS } from '../game/constants.js';

let root, crosshair, hitmarker, hpFill, hpBar, arFill, ammoCount, weaponName, fireMode,
  gadgetRow, missionTimer, objectiveLine, hostageStatus, interactPrompt, interactText,
  subtitles, announceBox, announceMain, announceSub, damageVignette, flashOverlay, dmgDir,
  minimapCanvas, qaOverlay;

const subtitleQueue = [];
let announceTimer = 0;
const dmgArcs = [];

export function buildHud() {
  root = document.getElementById('hud-root');
  root.innerHTML = `
    <div id="play-vignette"></div>
    <div id="damage-vignette"></div>
    <div id="flash-overlay"></div>
    <div id="crosshair"><div class="line l-t"></div><div class="line l-b"></div><div class="line l-l"></div><div class="line l-r"></div><div class="dot"></div></div>
    <div id="hitmarker"><div class="hm hm1"></div><div class="hm hm2"></div><div class="hm hm3"></div><div class="hm hm4"></div></div>
    <div id="dmg-dir"></div>
    <div class="hud-corner" id="vitals">
      <div class="bar-label"><span>INTEGRITY</span><span id="hp-num">100</span></div>
      <div class="bar" id="hp-bar"><div class="fill"></div></div>
      <div class="bar-label"><span>PLATES</span><span id="ar-num">100</span></div>
      <div class="bar" id="ar-bar"><div class="fill"></div></div>
    </div>
    <div class="hud-corner" id="ammo-block">
      <div id="weapon-name">—</div>
      <div id="ammo-count"><span class="mag">—</span><span class="res"> / —</span></div>
      <div id="fire-mode">—</div>
      <div id="gadget-row"></div>
    </div>
    <div class="hud-corner" id="mission-block">
      <div id="mission-timer">--:--</div>
      <div id="objective-line">—</div>
      <div id="hostage-status"></div>
    </div>
    <div class="hud-corner" id="minimap-wrap"><canvas width="208" height="208"></canvas><div id="minimap-label">NORTHSTAR ADMIN CTR</div></div>
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
  arFill = root.querySelector('#ar-bar .fill');
  ammoCount = root.querySelector('#ammo-count');
  weaponName = root.querySelector('#weapon-name');
  fireMode = root.querySelector('#fire-mode');
  gadgetRow = root.querySelector('#gadget-row');
  missionTimer = root.querySelector('#mission-timer');
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

export function renderHud(game) {
  if (!game || !root) return;
  const p = game.player;

  // vitals
  const hp = Math.max(0, Math.ceil(p.health));
  hpFill.style.setProperty('--v', hp / 100);
  hpFill.parentElement.previousElementSibling.querySelector('#hp-num').textContent = hp;
  hpBar.classList.toggle('low', hp <= 30);
  const ar = Math.max(0, Math.ceil(p.armor));
  arFill.style.setProperty('--v', ar / 100);
  root.querySelector('#ar-num').textContent = ar;

  // ammo
  const ws = game.weapons.getHudState();
  weaponName.textContent = ws.name;
  const mag = ammoCount.querySelector('.mag'), res = ammoCount.querySelector('.res');
  if (ws.cls === 'melee') { mag.textContent = '—'; res.textContent = ''; }
  else if (ws.cls === 'gadget') { mag.textContent = `×${ws.mag}`; res.textContent = ''; }
  else { mag.textContent = ws.mag; res.textContent = ` / ${ws.reserve}`; }
  ammoCount.classList.toggle('reloading', ws.state === 'reload');
  ammoCount.classList.toggle('empty', ws.cls !== 'melee' && ws.cls !== 'gadget' && ws.mag === 0);
  fireMode.textContent = ws.state === 'reload' ? 'RELOADING' : ws.mode;
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
  objectiveLine.textContent = game.currentObjectiveText();
  hostageStatus.innerHTML = '';
  for (const h of game.hostages) {
    const pip = document.createElement('div');
    pip.className = `hostage-pip ${h.state === 'following' ? 'following' : h.state === 'extracted' ? 'secured' : h.found ? 'found' : ''}`;
    pip.textContent = `${h.name.split(' ').pop().toUpperCase()} — ${h.stateLabel()}`;
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
let mmFrame = 0;
function renderMinimap(game) {
  mmFrame++;
  if (mmFrame % 2 !== 0) return; // 30 fps is plenty
  const ctx = minimapCanvas.getContext('2d');
  const W = minimapCanvas.width, H = minimapCanvas.height;
  ctx.clearRect(0, 0, W, H);
  const p = game.player;
  const scale = 4.6; // px per meter
  const cx = W / 2, cz = H / 2;
  const level = p.pos.y < -1.6 ? 'b' : 'g';

  ctx.save();
  ctx.translate(cx, cz);
  // rotate map so player-forward is up
  ctx.rotate(p.yaw + Math.PI);
  ctx.translate(-p.pos.x * scale, -p.pos.z * scale);

  ctx.strokeStyle = 'rgba(127,210,255,0.5)';
  ctx.lineWidth = 1.6;
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
    dot(ctx, h.pos.x * scale, h.pos.z * scale, h.state === 'following' ? '#7fd2ff' : '#ffb454');
  }
  if (game.extractionVisible()) dot(ctx, game.extraction.x * scale, game.extraction.z * scale, '#7dd87d');
  ctx.restore();

  // player arrow (fixed center, pointing up)
  ctx.fillStyle = '#e8f1f8';
  ctx.save();
  ctx.translate(cx, cz);
  ctx.beginPath();
  ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // level tag
  ctx.fillStyle = 'rgba(157,180,198,0.8)';
  ctx.font = '600 9px monospace';
  ctx.fillText(level === 'b' ? 'B1 SERVICE' : 'L1 GROUND', 7, 12);
}

function dot(ctx, x, z, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, z, 4, 0, Math.PI * 2);
  ctx.fill();
}
