// Minimal diegetic HUD: crosshair, prompt, status line, fade overlay.
// Owner: player agent.

export function createHUD() {
  const root = document.createElement('div');
  root.id = 'hud';
  root.style.cssText = `
    position: fixed; inset: 0; pointer-events: none; z-index: 30;
    font-family: "DejaVu Sans Mono", "Consolas", monospace; color: #cfd6cd;
  `;

  const cross = document.createElement('div');
  cross.style.cssText = `
    position: absolute; left: 50%; top: 50%; width: 4px; height: 4px;
    margin: -2px 0 0 -2px; border-radius: 50%; background: rgba(215,222,214,0.85);
    box-shadow: 0 0 3px rgba(0,0,0,0.8);
  `;
  root.appendChild(cross);

  const ring = document.createElement('div');
  ring.style.cssText = `
    position: absolute; left: 50%; top: 50%; width: 18px; height: 18px;
    margin: -9px 0 0 -9px; border-radius: 50%;
    border: 1px solid rgba(215,222,214,0.0); transition: border-color 0.15s;
  `;
  root.appendChild(ring);

  const prompt = document.createElement('div');
  prompt.style.cssText = `
    position: absolute; left: 50%; bottom: 17%; transform: translateX(-50%);
    font-size: 15px; letter-spacing: 0.06em; color: #dfe5da;
    background: rgba(10,12,11,0.55); padding: 7px 14px; border-radius: 3px;
    border: 1px solid rgba(160,170,160,0.25); display: none;
    text-shadow: 0 1px 2px rgba(0,0,0,0.9);
  `;
  root.appendChild(prompt);

  const status = document.createElement('div');
  status.style.cssText = `
    position: absolute; left: 50%; bottom: 24%; transform: translateX(-50%);
    font-size: 14px; letter-spacing: 0.05em; color: #c8d4b8;
    opacity: 0; transition: opacity 0.4s; text-shadow: 0 1px 3px rgba(0,0,0,0.9);
  `;
  root.appendChild(status);

  const info = document.createElement('div');
  info.style.cssText = `
    position: absolute; left: 18px; top: 14px; font-size: 11px; letter-spacing: 0.1em;
    color: rgba(150,175,160,0.65); line-height: 1.7; text-shadow: 0 1px 2px rgba(0,0,0,0.8);
  `;
  info.textContent = 'DSV-7 TETHYS';
  root.appendChild(info);

  const hint = document.createElement('div');
  hint.style.cssText = `
    position: absolute; left: 50%; top: 58%; transform: translateX(-50%);
    font-size: 13px; letter-spacing: 0.08em; color: rgba(205,214,205,0.8);
    text-align: center; line-height: 2;
  `;
  hint.innerHTML = 'CLICK TO TAKE THE CONN<br/>W A S D — MOVE &nbsp; MOUSE — LOOK &nbsp; E — OPERATE';
  root.appendChild(hint);

  const fade = document.createElement('div');
  fade.style.cssText = `
    position: fixed; inset: 0; background: #000; opacity: 0; pointer-events: none; z-index: 20;
  `;
  document.body.appendChild(fade);
  document.body.appendChild(root);

  let statusTimer = 0;
  let fadeAnim = null;

  return {
    root,
    setPrompt(text) {
      if (text) { prompt.textContent = text; prompt.style.display = 'block'; ring.style.borderColor = 'rgba(219,226,216,0.75)'; }
      else { prompt.style.display = 'none'; ring.style.borderColor = 'rgba(215,222,214,0)'; }
    },
    setStatus(text, holdMs = 3800) {
      status.textContent = text;
      status.style.opacity = '1';
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => { status.style.opacity = '0'; }, holdMs);
    },
    getStatusText: () => status.textContent,
    setInfo(text) { info.innerHTML = text; },
    setHint(visible) { hint.style.display = visible ? 'block' : 'none'; },
    fadeTo(opacity, durationMs) {
      return new Promise((resolve) => {
        if (fadeAnim) cancelAnimationFrame(fadeAnim);
        const from = parseFloat(fade.style.opacity) || 0;
        const t0 = performance.now();
        const step = (t) => {
          const k = Math.min(1, (t - t0) / durationMs);
          fade.style.opacity = String(from + (opacity - from) * k);
          if (k < 1) fadeAnim = requestAnimationFrame(step);
          else { fadeAnim = null; resolve(); }
        };
        fadeAnim = requestAnimationFrame(step);
      });
    },
    getFadeOpacity: () => parseFloat(fade.style.opacity) || 0,
    setVisible(v) { root.style.display = v ? 'block' : 'none'; },
    isVisible: () => root.style.display !== 'none',
  };
}
