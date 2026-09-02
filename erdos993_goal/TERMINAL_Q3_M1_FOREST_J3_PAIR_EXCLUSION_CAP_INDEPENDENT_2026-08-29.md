# Forest terminal `m=1`, target `j=3`: pair-exclusion cap

Date: 2026-08-29

Status: **PASS independent exact all-order auxiliary lemma.** This proves a
sharper upper bound for `y=h_3/f_3`; it does not prove the complete terminal
row, `m=0`, or Erdos Problem 993.

## Setup

Let `G` be a forest with marked vertex `w`. Put

```text
F=G-w,  H=G-N_G[w],  U=N_G(w),
d=|U|,  S=|H|,  h_k=i_k(H),  b=i_3(F).
```

For `u in U`, write `X_u=N_F(u)`, a subset of `V(H)`. The sets `X_u` are
pairwise disjoint: a common vertex in `X_u` and `X_v` would form the cycle
`w-u-x-v-w`.

## One-root-neighbor incidence bound

Let `B1` count independent triples of `F` containing exactly one vertex of
`U`. Fix an independent pair `{x,z}` in `H`. Each of `x,z` belongs to at most
one set `X_u`, so at most two root neighbors fail to extend `{x,z}`. Hence at
least `d-2` root neighbors extend it. Counting these pair-root incidences gives

```text
B1 >= (d-2)h_2.                                    (1)
```

Every independent triple of `H` contains three independent pairs, while each
independent pair extends to at most `S-2` triples. Therefore

```text
3h_3 <= (S-2)h_2.                                  (2)
```

Since `b>=h_3+B1`, multiply by `S-2` and use (1)--(2):

```text
(S-2)b
 >= (S-2)h_3+(S-2)(d-2)h_2
 >= [S-2+3(d-2)]h_3.                               (3)
```

For `d>=2`, `S>=3`, and supported `b>0`, the denominator in (3) is positive,
so

```text
y=h_3/b <= (S-2)/[S-2+3(d-2)].                     (4)
```

This improves the earlier `d-3` cap. Because both retained terminal-row
branches have already-certified nonpositive `y` slopes, (4) may replace any
larger `y` cap without reversing an inequality.

## Literal and symbolic replay

The verifier checks the exact slack identity

```text
(S-2)b-[S-2+3(d-2)]h_3
 =(S-2)(b-h_3-B1)
  +(S-2)(B1-(d-2)h_2)
  +(d-2)((S-2)h_2-3h_3).
```

It then reconstructs `B1` as pair-root incidences for all 467 marked atlas
forest cells through order 7 and all 11,005 marked nonisomorphic-tree cells
through order 12. The latter replay covers 300,177 independent `H`-pairs and
297,058 compatible pair-root incidences. The minimum slack in (1) is zero, so
the incidence constant is sharp.

Pins before this note was added:

```text
prove_terminal_q3_m1_forest_j3_pair_exclusion_cap_independent_agent.py
  DECD67FD64234509F51591DDE1D4C1E7FE9548047F83D7F8DCAFA7992ADE3643
terminal_q3_m1_forest_j3_pair_exclusion_cap_independent_20260829.json
  34724EA94874B104DC789277A1E7F97091FA2AA31D056F99242AD18F4B400CEA
```
