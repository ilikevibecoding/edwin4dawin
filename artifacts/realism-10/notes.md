# Realism pass 10 — projectiles

- Fireball: additive (`lighter`) heat bloom around the ball plus three ember
  ghosts trailing along the flight vector.
- Arrow: fading white motion streak behind the shaft, steel glint on the head.
- Magic bolt: additive core, velocity-based ghost trail (three fading orbs),
  white sparkle cross on the hot center.
- Muzzle flashes and impact flashes now composite additively, so they bloom
  against the field instead of sitting on it as painted discs.

Verified in `3-battle-mid.png`: tower bolts leave readable light trails and
flashes glow. (Fireball verified in motion during capture staging; the
towerdown still is post-impact.)
