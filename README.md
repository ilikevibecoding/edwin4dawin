# NORTHSTAR RESCUE

An original single-player tactical first-person shooter for the browser. You are a tactical
response operator entering the snowbound **Northstar Administrative Center** — a corporate
headquarters seized by the Kestrel Syndicate. Locate two hostages, secure them, escort them to
the extraction garage, and survive.

Built from scratch with Three.js (WebGL2) + Vite + WebAudio. Every asset — geometry, textures,
audio, UI — is generated procedurally in code. No third-party or copyrighted game assets are used.

## Start (one command)

```bash
npm install   # first time only
npm start     # serves http://127.0.0.1:5173
```

Open http://127.0.0.1:5173 in a Chromium-based browser.

## Controls

| Action | Input |
|---|---|
| Move | W A S D |
| Look / aim | Mouse |
| Fire | Left mouse |
| Aim down sights | Right mouse (hold) |
| Walk quietly | Shift (hold) |
| Crouch | C (toggle) |
| Jump | Space |
| Interact (doors, hostages) | E |
| Reload | R |
| Weapon slots | 1–5 (or mouse wheel) |
| Last weapon | Q |
| Pause | P or Esc |
| Fullscreen | F (Esc exits) |

## Testing

```bash
npm test              # Playwright suite (starts its own server)
npm run shots         # capture the screenshot/state evidence matrix into artifacts/
```

Deterministic hooks (always available):

- `window.render_game_to_text()` — JSON snapshot of player-relevant state
- `window.advanceTime(ms)` — fixed-step deterministic simulation advance

QA mode (`http://127.0.0.1:5173/?qa=1`) exposes `window.__qa` with teleports, weapon select,
enemy spawning, AI freeze, lighting scenarios, collision/nav visualization, an asset gallery,
and objective-state jumps. See `docs/architecture.md`.

## Documentation

- `docs/architecture.md` — locked technical stack + module map
- `docs/ownership-ledger.md` — team ownership and work packages
- `docs/asset-manifest.md` + `docs/manifest/*.json` — full asset registry
- `docs/visual-bible.md` — art direction
- `docs/checklists.md` — visual-quality + Playwright scenario checklists
- `progress.md` — original project prompt (verbatim) + status log

## Originality statement

This game is an original work. It contains no Counter-Strike or Valve assets, code, names,
sounds, textures, or map layouts. All branding (Northstar Dynamics, Kestrel Syndicate, Karst
Arms, Boreal Defense, Halcyon Ordnance, Vanta Systems, Meridian Precision) is fictional.
