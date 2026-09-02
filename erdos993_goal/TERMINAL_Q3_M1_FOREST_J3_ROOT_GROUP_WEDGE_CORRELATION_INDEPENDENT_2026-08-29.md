# Forest `m=1,j=3`: root-group wedge correlation

Date: 2026-08-29

Status: **PASS independent exact all-order auxiliary lemma.** This closes the
specific relaxation gap linking large wedge count to concentrated
root-neighbor child groups. It does not alone prove the terminal row, `m=0`,
or Erdos Problem 993.

## Setup

Let `G` be a forest without isolated components, of order `N+1`, with
`h+1` components. Mark `w`, put `d=deg(w)`, and enumerate its neighbors
`u_1,...,u_d`. Define

```text
r_i=deg(u_i)-1,
R=sum_i r_i,
Q=sum_i C(r_i,2),
W=sum_v C(deg(v),2),
L=N-2h-d-R.
```

Also put `H=G-N[w]` and `S=|H|`. In the tail application
`h>=1,d>=2,S>=5`, and the disjoint root-neighbor child sets give
`R<=S-2`.

## Wedge count forces group concentration

The root contributes `C(d,2)`. The root-neighbor groups contribute

```text
sum_i C(r_i+1,2)=R+Q.                               (1)
```

If `t` is the remaining child count in the marked component, convex
concentration bounds all farther and other-component wedges by

```text
C(t+1,2)+C(L-t+1,2) <= C(L+1,2),                  (2)
```

because the difference is `t(L-t)>=0`. Thus

```text
Q >= W-C(d,2)-R-C(L+1,2).                          (3)
```

Unlike an uncorrelated endpoint relaxation, (3) says that a large `W` must
come with concentrated child groups.

## Exact rank-four correction

The independent four-sets of `F=G-w` that use exactly one root neighbor have
the path-floor sum `sum_i P_3(S-r_i)`. For each `r_i`, exact expansion gives

```text
P_3(S-r_i)
 =P_3(S)-r_i C(S-3,2)
  +C(r_i,2)(3S-r_i-10)/3.                          (4)
```

Since `r_i<=R`, summing (4) yields the correction

```text
Q(3S-R-10)/3.                                      (5)
```

For the classes using two root neighbors, put `q=r_i+r_j`. The exact identity

```text
P_2(S-q)=P_2(S)-q(S-2)+C(q,2)                     (6)
```

and

```text
sum_(i<j) C(r_i+r_j,2)=(d-2)Q+C(R,2)              (7)
```

give the second correction `(d-2)Q+C(R,2)`.

The total coefficient of `Q` in (5),(7) is nonnegative on the stated domain:

```text
(3S-R-10)/3+d-2 >= (2S-8)/3 >=0.                  (8)
```

Consequently `Q` may be replaced by the lower bound (3), with the inequality
direction preserved. This is the correlated reserve used in the final
middle-cone certificate.

## Replay and pins

The verifier checks (2), (4), and (6) symbolically, then reconstructs `Q`,
`W`, and both root classes literally. It covers 216 marked no-isolate atlas
cells, all 11,005 marked nonisomorphic-tree cells through order 12 for the
wedge identity, and 5,349 marked cells from 479 disconnected two-tree forests;
2,092 of the latter exercise the full `S>=5` class correction. Minimum wedge
slack is zero.

```text
prove_terminal_q3_m1_forest_j3_root_group_wedge_correlation_independent_agent.py
  E29E8723C55B1896C737450353B1EB914B20221D755002DA1C90AF9A6F1D7D55
terminal_q3_m1_forest_j3_root_group_wedge_correlation_independent_20260829.json
  B43F79F29ECA9B499126731FE3940D14681D5C37A5598768A9C1B31FC858EF7F
```
