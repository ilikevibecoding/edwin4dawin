# Realism pass 12 — card frames

- Frame band beveled: lit top edge sinking to a dark bottom edge per rarity
  color.
- Radial stage light behind every portrait so troops pop off the window.
- Inner ambient-occlusion ring inside the window edge.
- Name banner is now a beveled plate (gradient + top highlight strip).
- Same treatment flows to chest-reward cards since they share `cardCanvas`.

Verified in the hand crop of `3-battle-mid.png`: cards read as stacked
physical plates with lit portraits rather than flat stickers.
