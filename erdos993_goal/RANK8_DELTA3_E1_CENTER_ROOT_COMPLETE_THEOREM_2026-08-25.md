# Rank-eight Delta3 e=1 center-root theorem

Date: 2026-08-25

Status: **proved with an independent exact include/exclude tree-message replay
and literal adjacency-list/full-forest-DP checks**.

## Theorem

Let `T` be a subdivided claw of source order at least 23, rooted at its center.
Extend any one of its three arms by one new leaf.  Then the `Delta3`
coefficient of the rank-eight terminal residual at the old center root
increases strictly.

Order the source arm lengths and write them as

```text
(base+1,
 base+middle_gap+1,
 base+middle_gap+long_gap+1),
```

where all parameters are nonnegative.  Since

```text
n = 3*base + 2*middle_gap + long_gap + 4,
```

the source-order condition is exactly

```text
3*base + 2*middle_gap + long_gap >= 19.         (1)
```

The shortest-, middle-, and longest-arm extension labels cover every arm;
equal arm lengths only introduce symmetry.

## Exact finite routing

The proof first puts every active path count on a stable polynomial branch:

- `base>=6`; or
- fixed `base=0..5` and `middle_gap>=6-base`; or
- fixed smaller `middle_gap` and
  `long_gap>=6-base-middle_gap`; or
- all smaller parameters fixed.

This is an 84-cell disjoint exhaustive base partition.  It is intersected
with (1) by the same generic shifted-ray/fixed-prefix recursion, now with
weights `base=3`, `middle_gap=2`, `long_gap=1`.  The resulting exact routing
has 45 regions per extension: one trivariate, seven bivariate, and 37
univariate regions.

Every active-coordinate degree is at most 26, so 27 exact samples give the
complete Newton tensor.  The producer certifies:

| exact item | count |
|---|---:|
| extension orbits | 3 |
| routed regions | 135 |
| exact Newton coefficients | 77,355 |
| positive coefficients | 18,375 |
| zero coefficients | 58,980 |
| negative coefficients | 0 |
| bounded coverage points | 9,261 |

Every origin and sampled increment is strictly positive.  The minimum sampled
increment is `260168039694155676902`, in the shortest-arm extension orbit.

## Independent replay

The audit imports no producer or closed path formula.  It independently
rebuilds the branch partition and weighted order-cone routing, recomputes all
77,355 ordered coefficients with generic include/exclude tree messages, and
matches every stored digest and minimum.

At both tensor corners of every region it also constructs the center-rooted
subdivided claw as a literal adjacency list and runs full generic
include/exclude forest DP through rank eight.  All 270 literal increment and
360 literal core/root-deletion profile comparisons match.  The independently
rebuilt routing also has multiplicity exactly zero or one on all 9,261 points
of the cube `0..20`.

Audit status:

```text
PASS_INDEPENDENT_TREE_DP_DELTA3_E1_CENTER_ROOT_COMPLETE
```

## Exact evidence

```text
prove_rank8_delta3_e1_center_root_complete_agent_20260825.py
  9E6F77D3C5683C2E435CE69F2A57CBA8A32BF2D7AEBDB12E5545197EFA0FBD46
rank8_delta3_e1_center_root_complete_exact_agent_20260825.json
  A67E9AF18DAE82E5C54AEBA35F823B8CAF36B84D4883147447F12B8356A0E090

audit_rank8_delta3_e1_center_root_complete_agent_20260825.py
  176246CAE3F20EE719D16FBD19DAA1507DFF087C390CA8CE2254C55D94A4C66B
rank8_delta3_e1_center_root_complete_independent_audit_agent_20260825.json
  F480EC24F2C74C72939422E4DAA96D27C23A459DB8E0AF8768FC44F051AB9501
```

## Boundary

This theorem closes only the Delta3 `e=1` subdivided-claw strict
arm-extension gate at the old center root.  It does not cover
inserted-new-leaf roots, arbitrary trees, full `Q8/PGC`, forest
independence-sequence unimodality, or Erdős Problem 993.
