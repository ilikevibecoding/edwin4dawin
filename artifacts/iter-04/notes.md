# Iteration 04 — scores & top problems

## Rubric scores (1–10)

| Category | Score | Notes |
|---|---|---|
| (a) Layout fidelity | 8 | Stable across screens. |
| (b) Sprite quality / consistency | 7.5 | Larger units read much better. |
| (c) Palette cohesion | 8 | Depth gradient helps ground the arena. |
| (d) Text/UI readability | 6.5 | Bridge scrums still stack 4+ overhead bars; full-HP units don't need bars at all. |
| (e) Animation / game-feel in stills | 7 | Hits show floaters but no impact flash at the strike point. |
| (f) "Real mobile game" impression | 7 | Close; combat clutter and flat bridges hold it back. |

## 5 most damaging visual problems

1. **Every unit always shows an HP bar** — real mobile battlers only show unit bars after first damage. Show badge+bar only when `hp < maxHp`; instantly halves the clutter in clumps.
2. **No impact feedback at the strike point** — melee hits read only via numbers. Add a small white impact-star particle burst at the contact point on every melee hit.
3. **Bridges sit flat on the water** — no shadow under the spans. Draw soft dark bands on the water under each bridge edge in the background pass.
4. **Elixir bar segment dividers vanish** under the magenta fill — strengthen divider contrast and add a subtle inner border so the 10 segments stay countable.
5. **Capture staging kills the player knight too early** (harness) — fast-forward 5 s instead of 6.5 s and spread deploys so shot 3 shows both pushes alive.

## Verification

`after-*.png`: bars only on damaged units, impact stars visible in the melee, bridge shadows present, segmented elixir readable, livelier mid-battle staging.
