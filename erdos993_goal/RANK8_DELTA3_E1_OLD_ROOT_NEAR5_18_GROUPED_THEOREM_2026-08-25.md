# Rank-eight Delta3 e=1 old-root grouped theorem (`near=5..18`)

Date: 2026-08-25

Status: **proved with an independent exact include/exclude tree-message replay
and literal adjacency-list/full-forest-DP checks throughout the grouped
routing**.  This is one finite-band theorem, not fourteen inferred copies and
not a proof of Erdős Problem 993.

## Theorem

Let `T` be a subdivided claw of source order at least 23, rooted on one arm.
Suppose the number of vertices strictly between the center and old root is any
integer `near` from 5 through 18.  Extend any one of the three arms by one new
leaf.  Then the `Delta3` coefficient of the rank-eight terminal residual at
the old root increases strictly.

Order the two arms not containing the root and write the source arm lengths as

```text
(near+tail+1, short+1, short+difference+1),
```

with nonnegative `tail,short,difference`.  The old root is at distance
`near+1` from the center, and

```text
n = near + tail + 2*short + difference + 4.
```

Thus source order at least 23 is exactly

```text
tail + 2*short + difference >= 19-near.        (1)
```

The root-arm, shorter-other-arm, and longer-other-arm labels cover all three
extension choices.  Equal other arms only introduce symmetry.

## One grouped finite routing

The proof first partitions all nonnegative triples into branch-stable cells:

- `tail>=6`, or fixed `tail=0..5`;
- `short>=6,difference>=0`, or fixed `short=s` in `0..5` and either
  `difference>=6-s` or fixed `difference=0..5-s`.

This is a disjoint exhaustive `7*28=196`-cell base partition.  For each of the
fourteen finite `near` values, the proof intersects every base cell with (1)
by one generic weighted-cone recursion.  If the cell minimum does not yet
satisfy (1), the first active coordinate is divided into:

1. the shifted ray whose minimum weight suffices; and
2. each smaller exact prefix value, followed recursively by the remaining
   active coordinates.

The weights are `tail=1`, `short=2`, `difference=1`.  This construction is
pairwise disjoint and exhaustive by induction on the active-coordinate list.
A redundant exact audit also checks multiplicity zero or one at all 9,261
points in the cube `0..20` for every `near`, totaling 129,654 boundary points.

Every active path-count branch is polynomial.  The largest rank-weighted
coordinate degree among the 26 exact Delta3 residual monomials is 26, so 27
samples in each active coordinate give the complete Newton tensor.

Across the entire grouped band and all three extension orbits, the producer
certifies:

| exact item | count |
|---|---:|
| root distances | 14 |
| extension orbits | 42 |
| routed regions | 5,793 |
| dimension-0 regions | 2,832 |
| dimension-1 regions | 2,415 |
| dimension-2 regions | 504 |
| dimension-3 regions | 42 |
| exact Newton coefficients | 1,262,139 |
| positive coefficients | 349,857 |
| zero coefficients | 912,282 |
| negative coefficients | 0 |
| bounded coverage points | 129,654 |

Every region origin and every sampled increment is strictly positive.  The
minimum sampled increment in the whole grouped certificate is
`222786060655254994690`, at `near=17` in the shorter-other-arm orbit.

## Independent replay

The audit imports no producer, refinement, closed path-polynomial, or prior
near-distance conclusion.  It uses the already hash-pinned independent
include/exclude tree-message machinery, rebuilds the branch partition and
weighted-cone routing from scratch, and regenerates every exact integer
forward-difference tensor.

It matched all 5,793 stored region keys, all 1,262,139 ordered coefficient
digests, every minimum, and all 129,654 bounded coverage multiplicities.  At
every unique tensor corner of every routing region it also rebuilt the
subdivided claw as a literal adjacency list and ran full generic
include/exclude forest DP through rank eight, supplying 8,754 literal
increment checks and 11,672 literal core/root-deletion profile checks.

Audit status:

```text
PASS_INDEPENDENT_TREE_DP_DELTA3_E1_OLD_ROOT_NEAR5_18
```

## Exact evidence

```text
prove_rank8_delta3_e1_old_root_near5_18_grouped_agent_20260825.py
  9B17B28E683714325B6D6D2907F9FA4069BB7CF36AD03BCC51B2A30BAB4B2488
rank8_delta3_e1_old_root_near5_18_grouped_exact_agent_20260825.json
  DB26C61571FE388D7FFA6DC756100648A3EE086133E8C428126633F1C253F75C

audit_rank8_delta3_e1_old_root_near5_18_grouped_agent_20260825.py
  5F0C0E107165AC72EF48CC83B69BC77233D5B52F16BC5FB9C989795A9D1F7EA3
rank8_delta3_e1_old_root_near5_18_grouped_independent_audit_agent_20260825.json
  A3B15AD8B9F21630D765E11591A95C1A9D5E22FD210FE7560AB06F6674FCD2AA
```

## Boundary

This theorem closes only the Delta3 `e=1` subdivided-claw old-root
arm-extension band `near=5..18`, for all source orders at least 23 and all
three arm-extension orbits.  Its combination with separate `near=0..4` and
`near>=19` packages is coverage bookkeeping, not an imported step of this
proof.  Other root families, arbitrary trees, inserted-new-leaf gates, full
`Q8/PGC`, forest independence-sequence unimodality, and Erdős Problem 993
remain outside this theorem.
