# Rank-eight Delta2 e=1 old-root near=1 theorem

Date: 2026-08-25

Status: **proved with an independent exact adjacency-list/tree-DP replay**.
This closes one old-root orbit of the subdivided-claw (`e=1`) family.  It is
not a proof of arbitrary leaf extension, the full rank-eight reduction, or
Erdos Problem 993.

## Theorem

Let `T` be a subdivided claw of source order at least 23.  Choose an arm with
at least two vertices and root `T` at its second vertex, so exactly one vertex
of that arm lies between the center and the root.  Extend any one of the three
arms by one new leaf.  Then the `Delta2` coefficient of the rank-eight
terminal residual at the old root increases strictly.

Order the two arms not containing the root.  The source arm lengths are

```text
(tail+2, short+1, short+difference+1),
```

where `tail,short,difference >= 0`.  The old root is at distance two on the
first arm.  Since the source order is

```text
n = tail + 2*short + difference + 5,
```

the condition `n>=23` is exactly

```text
tail + 2*short + difference >= 18.              (1)
```

The three extension orbits are: extend the root arm, extend the shorter other
arm, and extend the longer other arm.  Equality of the other arm lengths
causes harmless symmetry, and the three labels still cover every arm choice.

## Exact no-gap certificate

For each extension orbit, (1) is partitioned without gaps or overlaps into
109 integer Newton cells:

1. `tail>=18`;
2. fixed `tail=0..17` and
   `short>=ceil((18-tail)/2)`;
3. fixed smaller `tail,short` and
   `difference>=18-tail-2*short`.

The count is `1 + 18 + 90 = 109`.  Exact integer forward differences, using
the conservative degree bound 27 in each active coordinate, immediately
certify 90 cells per extension.  The other 19 cells have positive sampled
values and positive origins but mixed coefficients in that initial basis:
ten univariate rays, eight bivariate cells, and the one `tail>=18`
trivariate cell.

All 19 are replaced by exact no-gap refinements:

- Every obstructed difference ray is a finite positive prefix followed by a
  shifted degree-27 Newton tail with nonnegative coefficients and positive
  origin.  The largest additional shift is 4 and the largest absolute tail
  lower bound is 5.
- Every obstructed bivariate cell is split into `short>=5,difference>=0`
  and the finitely many fixed-short strips below 5.  The bulk tensor is
  coefficientwise nonnegative; every strip uses the same finite-prefix plus
  shifted-tail argument.
- The trivariate cell is split into

  ```text
  short>=5, difference>=0;
  short=0..4, difference>=5;
  short=0..4, difference=0..4.
  ```

  This is a disjoint exhaustive partition.  Per extension it produces one
  `28^3` tensor, five `28^2` tensors, and twenty-five 28-coefficient rays.

The complete producer certifies:

| exact item | count |
|---|---:|
| extension orbits | 3 |
| original cells | 327 |
| immediate coefficientwise cells | 270 |
| original mixed cells replaced | 57 |
| original coefficients profiled | 115,752 |
| refined bivariate bulk tensors | 24 |
| refined trivariate regions | 93 |
| refined tensor coefficients | 98,532 |
| shifted rays | 90 |
| shifted-ray coefficients | 2,520 |
| literal finite-prefix values | 180 |
| negative coefficients in proving regions | 0 |

Every proving-region origin and every literal finite-prefix value is strictly
positive.  The minimum sampled increment across the three original
partitions is `167354156124999571728`.

## Independent replay

The audit imports none of the producer, path-polynomial, or refinement code.
It constructs each subdivided claw as an adjacency list, places the old root
at distance two on the first arm, and recomputes both the core and old-root
deletion independence polynomials with a generic include/exclude forest DP
truncated through rank eight.  It shares only the canonical terminal-residual
definition in `verify_rank8_q8_terminal_reduction.py`.

The independent engine rebuilt and matched all 327 original ordered
coefficient digests, all 24 bivariate bulk tensors, all 93 trivariate-region
digests, all 90 shifted Newton rays, and all 180 literal prefix values.  It
also reconstructed the threshold-18 partition and each refinement partition
from their inequalities and verified that the 57 mixed original cells are
covered exactly by the 30 univariate, 24 bivariate, and three trivariate
replacement families.

Audit status:

```text
PASS_INDEPENDENT_GENERIC_TREE_DP_DELTA2_E1_OLD_ROOT_NEAR1_COMPLETE
```

## Exact evidence

```text
probe_rank8_delta23_e1_old_root_near1_profile_agent_20260825.py
  CEF8FCFA0E5B8F8117A55FB50780A5F802A4993A8516CAD5B4987D24D708540E
rank8_delta23_e1_old_root_near1_profile_exact_agent_20260825.json
  D4E2D83701881E723D799E9592094ADA6EB97DF8AB4E5E4D5EC85DBEBC24AA12

prove_rank8_delta2_e1_old_root_near1_complete_agent_20260825.py
  3791C6278E4D14A5D6BB46EA506789101DD778C644C77F0B91A94175FBF7C6E1
rank8_delta2_e1_old_root_near1_complete_exact_agent_20260825.json
  744FA3670F7573592E1C30171ED4E5BF8472B99ED2F688C8E11B9FF8EE666F9F

audit_rank8_delta2_e1_old_root_near1_complete_agent_20260825.py
  6956D28C2653F8E34F26BC8160968F5BCD5C83D3EA040FEE3E9B79B588694ECC
rank8_delta2_e1_old_root_near1_complete_independent_audit_agent_20260825.json
  65BB63C3B89438C5E37B37E945718E2EB6C335A76BE17EAE50AE5CAE1463DC12
```

## Boundary

This theorem closes `Delta2` only for the `e=1` subdivided-claw old-root
orbit with `near=1`.  Other old-root distances, arbitrary trees, the general
`Delta2/3` inserted-new-leaf gates, full `Q8/PGC`, forest independence-
sequence unimodality, and Erdos Problem 993 remain open.
