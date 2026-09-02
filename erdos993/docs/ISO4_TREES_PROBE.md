# `ISO_4` on trees — numeric feasibility probe for an `ISO_3`-style bound chain

Replay: `python3 scripts/probe_iso4_trees.py` (exact arithmetic throughout,
runs in ~25 s; prints `PROBE_ISO4_DONE`; report `reports/iso4_trees_probe.json`).
Status: **complete probe — no certificate attempted.** Bottom line: the `p_5`
formula is verified exactly; a universally *valid* degree-only bound chain
exists and is exact on stars, but its lower bound `G4` is **negative for
`n <= 40`** (scan) and on double brooms up to `n = 41`; it becomes positive
for all scanned `n >= 45` (`+0.66` normalised at `n = 200`). The blockers are
three `O(1/n)` leaks (`M2`, `N_chair`, `T3`) that are individually harmless for
large `n` but together exceed the true margin (`~1.0`) below `n ~ 45`.

Target: `Q_4 = 4 p_4^2 + p_3^2 - 5 p_3 p_5 >= 0` for every tree. Exhaustively
`Q_4/(p_3 p_4) >= 1.2229` for `n <= 16` (minimiser at `n = 16`: hubs of degree
8 and 7 joined through one middle vertex, i.e. the `k = 1` double broom).

## Notation

`e = n-1`, degrees `d_v`, `l` leaves, `Delta` max degree,
`S = sum C(d_v,2)`, `T3 = sum C(d_v,3)`, `T4 = sum C(d_v,4)`,
`P = sum_{uv in E}(d_u-1)(d_v-1)` (3-edge paths),
`M_c = sum_{b~c}(d_b-1)` (= number of vertices at distance exactly 2 from `c`),
`M2 = sum_c M_c^2`, `D2 = sum_{d_v>=2} d_v = 2n-2-l`.
Five-vertex sub-forests with 3 or 4 edges: `X` (2-edge path + disjoint edge),
`N_P5` (4-edge paths), `N_chair` (spider 2,1,1), `N_K14 = T4`.
"Double broom `DB(m,k)`": two hubs of degree `m` (`m-1` leaves each) joined by
a path with `k` internal vertices, `n = 2m+k`; the extremal family is `k = 1`
(hubs joined by a 3-vertex path `h1-x-h2`).

## Step 1 — exact formula for `p_5` (inclusion–exclusion) — VERIFIED

Summing `(-1)^{|F|} C(n-|V(F)|, 5-|V(F)|)` over edge subsets `F` (sub-forests
on at most 5 vertices):

```text
p_5 = C(n,5) - e C(n-2,3) + S C(n-3,2) + (C(e,2)-S)(n-4) - (P+T3)(n-4) - X
      + N_P5 + N_chair + T4
X       = S(n-3) - 3 T3 - 2 P
N_P5    = (1/2) sum_c [ M_c^2 - sum_{b~c}(d_b-1)^2 ] = M2/2 - 3 T3 - S
N_chair = sum_{uv in E} [ C(d_v-1,2)(d_u-1) + C(d_u-1,2)(d_v-1) ] = sum_v C(d_v-1,2) M_v
```

Derivation of `X`: `S(e-2)` (path, non-path edge) pairs minus those sharing a
vertex; for the path `u-v-w` these number `(d_v-2) + (d_u-1) + (d_w-1)` (no
edge meets two of `u,v,w`: no triangles). Summing over paths,
`sum (d_v-2) = sum_v C(d_v,2)(d_v-2) = 3 T3` and
`sum [(d_u-1)+(d_w-1)] = sum_{(u,v) ordered adjacent} (d_u-1)(d_v-1) = 2P`.
For `N_P5` use `sum_b d_b (d_b-1)^2 = 6 T3 + 2 S`. Compact form:

```text
p_5 = C(n,5) - e C(n-2,3) + C(e,2)(n-4) + S [C(n-3,2) - 2n + 6]
      - P (n-6) - T3 (n-4) + M2/2 + N_chair + T4
```

Verification: on all 987 trees with `n <= 12`, every count (`P`, `T3`, `X`,
`N_P5`, `N_chair`, `T4`) was enumerated directly from the edge list
(3- and 4-edge subsets classified by vertex count and degree pattern), the
closed forms for `X`, `N_P5`, `N_chair` (both the edge-sum and the identity
`sum_v C(d_v-1,2) M_v`) agree with the enumeration, and both displayed `p_5`
formulas equal the coefficient from `indpoly_parent_array`. The compact
formula is additionally asserted on all 32,494 trees with `7 <= n <= 16` and on
every family member used below (up to `n = 203`). **PASS.**

## Step 2 — candidate bound chain (degree-only relaxation)

Write `A = C(n,4) - e C(n-2,2) + S(n-4) + C(e,2)` (so `p_4 = A - P - T3`),
`B = C(n,5) - e C(n-2,3) + C(e,2)(n-4) + S[C(n-3,2)-2n+6]`, `p_3 = C(n,3) - e(n-2) + S`.
`Q_4 = 4(A-P-T3)^2 + p_3^2 - 5 p_3 p_5` needs an **upper** bound on `p_5`.

The single structural fact `M_v <= n-1-d_v` (all vertices at distance 2 lie
outside `N[v]`) gives, with `sum_v M_v = 2S` and `sum_v (d_v-1) M_v = 2P`:

```text
(i)   M2 = sum_v M_v^2 <= sum_v M_v (n-1-d_v) = 2S(n-2) - 2P
(ii)  N_chair = sum_v C(d_v-1,2) M_v <= sum_v C(d_v-1,2)(n-1-d_v) = (n-1)(S-n+2) - 3 T3
      [because d C(d-1,2) = 3 C(d,3) and sum_v C(d_v-1,2) = S-(n-2)]
(iii) 2P = sum_v (d_v-1) M_v <= sum_v (d_v-1)(n-1-d_v)  =>  P <= C(n-1,2) - S
(iv)  T4 = sum C(d_v,3)(d_v-3)/4 <= T3 (Delta-3)/4
(v)   T3 >= C(Delta,3) + max(0, (2S'^2/D2' - S')/3),  S' = S - C(Delta,2), D2' = D2 - Delta
      (Cauchy–Schwarz as in ISO_3 Step 3, applied after removing the max-degree vertex)
(vi)  T3 <= S (Delta-2)/3,   0 <= P <= min(C(n-1,2)-S, (n-2)^2/4, (Delta-1)r + r^3), r = n-1-Delta
```

(i)–(iii) are exact for trees of diameter `<= 3` (stars, double stars);
(iv) is exact whenever all vertices of degree `>= 4` have degree `Delta`
(stars and balanced double brooms); (v) is exact on stars and spiders with legs of length ≤ 2.
Hence

```text
p_5 <= B + S(n-2) + (n-1)(S-n+2) - P(n-5) - T3 (n-1) + T3 (Delta-3)/4
Q_4 >= f(P,T3) := 4(A-P-T3)^2 + 5 p_3 (n-5) P + 5 p_3 [(n-1) - (Delta-3)/4] T3
                  + p_3^2 - 5 p_3 [B + S(n-2) + (n-1)(S-n+2)]
```

and `G4(n,l,Delta,S) := min f(P,T3)` over the box `0 <= P <= Pmax`,
`T3lo <= T3 <= T3hi` (a convex quadratic; the minimum is computed exactly from
the clamped one-dimensional minimisers on the four box edges). The
feasible `(l, Delta, S)` region: `2 <= Delta <= l <= n-1`,
`Smin(l,Delta) <= S <= Smax(l,Delta)` (one vertex of degree `Delta`, the other
internal degrees balanced resp. greedily majorised with cap `Delta-1`).

Note that, unlike `ISO_3`, `Q_4` is *not* monotone in `P` or `T3` a priori
(`p_4` enters squared); the box minimisation handles this. In every scanned
row the minimiser sat at `P = 0`, `T3 = T3lo`.

## Step 3 — validity and tightness on all trees `n <= 16`

All 32,494 trees `7 <= n <= 16`: every inequality (i)–(vi), the `Smin/Smax`
constraints and `G4 <= Q_4` hold with **zero violations**
(`bound_violations_by_name = {}`); `(a)` the `N_chair` identity holds exactly.
But `G4 < 0` on almost every tree:

| n | trees | min `Q_4/(p_3 p_4)` | min `G4/(p_3 p_4)` | trees with `G4 < 0` |
|---|---|---|---|---|
| 7 | 11 | 2.3333 | -91.18 | 10 |
| 10 | 106 | 1.6667 | -8.48 | 105 |
| 12 | 551 | 1.4364 | -4.82 | 549 |
| 14 | 3159 | 1.3048 | -3.26 | 3156 |
| 16 | 19320 | 1.2229 (`8071/6600`) | -2.39 | 17226 |

The only trees with `G4 >= 0` are stars (exact) and a few near-stars.

## Step 4 — parameter scan up to `n = 200`

Grid: `l`, `Delta`, `S` on at most 40/40/48 points each (all integers for
`n <= 30`), exact `(P,T3)` box minimisation, normalised by `p_3 (A - T3lo)`.

| n | min `G4/(p_3 p_4)` | at (`l`, `Delta`, `S`) |
|---|---|---|
| 7 | -17.00 | path (2, 2, 5) |
| 16 | -2.25 | (12, 7, 44) |
| 24 | -0.896 | (20, 11, 112) |
| 30 | -0.464 | (26, 14, 184) |
| 35 | -0.242 | (30, 16, 243) |
| 40 | -0.078 | (36, 19, 344) |
| 45 | **+0.030** | (40, 21, 423) |
| 50 | +0.124 | (45, 24, 532) |
| 60 | +0.254 | (55, 29, 787) |
| 80 | +0.407 | (73, 38, 1374) |
| 100 | +0.497 | (92, 48, 2169) |
| 150 | +0.609 | (141, 73, 5050) |
| 200 | +0.664 | (189, 98, 9040) |

The minimiser is always a "two-hub-like" point: `Delta ~ n/2`, `l ~ 0.9 n`,
`S ~ 2 C(Delta,2)` — the double-broom region — with `P = 0`, `T3 = T3lo`.
Negative exactly for the scanned `n <= 40`, positive for every scanned
`n >= 45`; the normalised minimum grows like `~0.9 - c/n`.

(A first version of the chain with `N_chair <= (Delta-2) P` instead of (ii) and
`M2 <= 2S(n-2)` instead of (i) was negative for *all* scanned `n` up to 200:
coupling `N_chair` to `P` makes the bound decrease in `P` and lets the
minimiser push `P` to its cap. Bounding via `M_v <= n-1-d_v` fixed this.)

## Step 5 — stars and balanced double brooms (exact)

Stars `K_{1,m}`: every inequality (i)–(vi) is an equality, so
`G4 = Q_4 = C(m,3)^2 (m+1)/4` and `Q_4/(p_3 p_4) = (m+1)/(m-3)` exactly
(`m=5: 3`, `m=10: 11/7`, `m=20: 21/17`, `m=40: 41/37`, `m=100: 101/97`). All gaps are `0`.

`k = 1` double brooms `DB(m,1)` (`n = 2m+1`), exact values; "cost" = loss of
`Q_4/(p_3 p_4)` caused by each relaxation (`5·gap/p_4` for the `p_5`-side terms;
the residual is the `T3 -> T3lo`, `P -> 0` relaxation):

| m | n | `Q_4/(p_3 p_4)` | `G4/(p_3 p_4)` | cost M2 (gap) | cost N_chair (gap) | cost T4 | residual (T3 gap) |
|---|---|---|---|---|---|---|---|
| 5 | 11 | `1225/804` = 1.5236 | -5.075 | 3.134 (168) | 1.791 (48) | 0 | 1.673 (`15/7`) |
| 8 | 17 | `17296/14555` = 1.1883 | -1.922 | 1.390 (798) | 1.024 (294) | 0 | 0.696 (`48/5`) |
| 10 | 21 | `518225/467756` = 1.1079 | -1.187 | 1.013 (1638) | 0.801 (648) | 0 | 0.481 (`160/9`) |
| 12 | 25 | `151396/142785` = 1.0603 | -0.757 | 0.796 (2926) | 0.659 (1210) | 0 | 0.362 (`200/7`) |
| 15 | 31 | `487150/479089` = 1.0168 | -0.368 | 0.603 | 0.520 | 0 | 0.261 |
| 20 | 41 | `2160100/2211069` = 0.9769 | -0.014 | 0.430 | 0.386 | 0 | 0.175 |
| 23 | 47 | `56074/58275` = 0.9622 | **+0.116** | 0.367 | 0.334 | 0 | 0.145 |
| 30 | 61 | `17227225/18321954` = 0.9403 | +0.309 | 0.273 | 0.255 | 0 | 0.103 |
| 40 | 81 | 0.9230 | +0.460 | 0.200 | 0.190 | 0 | 0.073 |
| 60 | 121 | 0.9064 | +0.604 | 0.131 | 0.126 | 0 | 0.046 |
| 100 | 201 | `68129622500/76247102141` = 0.8935 | +0.715 | 0.077 | 0.075 | 0 | 0.026 |

Minimum true margin over the families: `0.8935` (`DB(100,1)`; tends to `7/8`);
minimum of the best bound: `-5.08` (`DB(5,1)`); `G4 < 0` exactly for
`m <= 20` (`n <= 41`). Path-length comparison (`m = 20`): `k = 1,2,3,4,5` give
true margins `0.977, 1.032, 1.070, 1.109, 1.149` — `k = 1` is the extremal
double broom (consistent with the exhaustive minimisers).

Tightness of the individual bounds on `DB(m,1)`: `T4` bound (iv) exact;
`P <= C(n-1,2)-S` loose (`P = 2(m-1)` vs cap `~m^2`, irrelevant since `P`
is dropped); `M2` gap `2S(n-2) - 2P - M2 ~ 2m^3` (true `M2 ~ 2m^3`, i.e. a
factor 2); `N_chair` gap `~m^3` (true `N_chair = 2C(m-1,2) ~ m^2`); `T3` gap
`~m^2/2` (from the `k` path vertices in the Cauchy–Schwarz denominator). Each
of the three costs is `~ 5·gap/p_4 = Theta(1/m)` with constants `7.5`, `7.5`,
`~2.5` (in units of `1/m`), total `~17/m`, against a margin `~0.9 + 2/m`:
break-even near `m ~ 21`, exactly as observed.

## Verdict

- `p_5` formula: **verified exactly** (brute-force sub-forest counts, `n <= 12`;
  compact form on all trees `n <= 16` and all family members).
- A universally valid bound chain with all relaxations degree-only
  (parameters `n, l, Delta, S`; `P`, `T3` eliminated by exact box minimisation)
  **exists and is exact on stars**, but its minimum normalised value is
  **negative for `n <= 40`** (`-17` at `n = 7`, `-0.90` at `n = 24`, `-0.08` at
  `n = 40`) and positive for all scanned `n >= 45` (`+0.03` at `45`,
  `+0.66` at `200`). So an `ISO_3`-style proof for `n >= 45` looks attainable
  in principle (the region is 3-parametric rather than 1-parametric, so the
  certificate would be harder than `ISO_3`'s Step 6), while `n <= 44` cannot be
  covered by this chain and is out of reach of exhaustive enumeration
  (trees on 44 vertices: ~10^16). **Not attainable as is.**
- What blocks it: on the extremal double brooms the chain leaks `~7.5/m` from
  `M2 <= 2S(n-2) - 2P` (needs `M_c <= n-1-d_c` replaced by the true distance-2
  counts: for `DB` the leaves of one hub have `M = m-1 ~ n/2`, not `n-2`),
  `~7.5/m` from `N_chair <= (n-1)(S-n+2) - 3T3` (same cause, at the hubs), and
  `~2.5/m` from Cauchy–Schwarz on `T3`. The quantity that must be kept exactly
  (or bounded with the *right* constant) is the degree–distance correlation
  `sum_v M_v^2` together with `sum_v C(d_v-1,2) M_v`, i.e. the second moment of
  the distance-2 counts — equivalently `N_P5 + N_chair` (the number of 4-edge
  sub-trees that are not `K_{1,4}`). A bound of the form
  `M2 <= 2S·(Delta-1) + (lower order)` (which is what actually holds on
  double brooms, where `M_leaf = d_hub - 1`) would remove the factor-2 leak,
  but it is false for spiders (`M_leaf` of a long leg is small while the
  degree-2 vertices have `M ~ Delta`); a valid version needs the number of
  vertices adjacent to a `Delta`-vertex as an extra parameter. Without such a
  refinement the `n <= 44` gap remains.
