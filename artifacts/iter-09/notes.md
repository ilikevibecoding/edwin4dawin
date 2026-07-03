# Iteration 09 — scores & top problems

## Rubric scores (1–10)

| Category | Score | Notes |
|---|---|---|
| (a) Layout fidelity | 8.5 | Battle screen essentially matches the spec sheet now. |
| (b) Sprite quality / consistency | 8 | Consistent. |
| (c) Palette cohesion | 8 | Good. |
| (d) Text/UI readability | 8 | Good. |
| (e) Animation / game-feel in stills | 7.5 | Result screen is static outside the banner; chest burst has a dead gap between lid and body. |
| (f) "Real mobile game" impression | 8 | Home/battle pass; result and chest ceremony still feel low-budget. |

## 5 most damaging visual problems

1. **Victory screen has no celebration** — add falling confetti (canvas layer) behind the banner on wins; single biggest "real game" tell on the result screen.
2. **Chest burst: dead space between lid and body** — fill with a rising sparkle/mote column so the burst reads as continuous energy.
3. **Result chest is flat** — add a pulsing gold glow behind the earned chest (CSS animation).
4. **Reward card stacks appear without flourish** — add sparkle twinkles on the revealed card stacks matching the chest-slot sparkle language.
5. **Crown counters float over the grass** — pin them flush against the right stone frame with a stronger drop shadow so they read as attached HUD.

## Verification

`after-*.png`: confetti visible on result, sparkle column in burst, glowing result chest, twinkles on reward cards, crown counters seated.
