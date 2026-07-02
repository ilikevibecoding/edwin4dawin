# Realism pass 21 — soft per-material edges

The single biggest style lever so far. `of()` (and battle's `of2`) no longer
stroke a universal near-black ink line around every shape; the edge is now a
deep shade of each shape's own fill (`edgeFor`, cached), 15% thinner.

- Stone towers edge in dark stone, red cloth in deep crimson, skin in warm
  umber — shapes separate the way lit geometry does, not like stickers.
- Text, eyes, and deliberate ink details still use `PAL.out`.
- `hex2rgb` now accepts 3-digit hex so short colors shade correctly.

Verified in `3-battle-mid.png` crop: the arena instantly reads closer to a
rendered scene; silhouettes stay readable against the turf.
