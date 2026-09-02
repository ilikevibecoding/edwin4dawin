# Rank-eight Delta3 e=1 old-root near=0 theorem

Date: 2026-08-25

Status: **proved with an independent exact generic-tree-DP replay**.  This is
a complete all-order theorem for one old-root orbit of the subdivided-claw
(`e=1`) family, not a proof of arbitrary leaf extension or Problem 993.

## Theorem

Let `T` be a subdivided claw of order at least 23.  Root `T` at the first
vertex of any arm adjacent to the center.  Extend any one of the three arms by
one new leaf.  Then the `Delta3` coefficient of the rank-eight terminal
residual at the old root increases strictly.

Order the two arms not containing the root and write the three source arm
lengths as

```text
(tail+1, short+1, short+difference+1),
```

where the old root is at distance one on the first arm.  The source-order
condition is exactly

```text
tail + 2*short + difference >= 19.                 (1)
```

The three extension orbits are: extend the root arm, extend the shorter other
arm, and extend the longer other arm.

## Original exact partition

The 2026-08-20 proof attempt partitioned (1), without gaps or overlaps, into
120 integer Newton cells for each extension orbit:

1. `tail>=19`;
2. fixed `tail<19` and `short>=ceil((19-tail)/2)`;
3. fixed smaller `tail,short` and
   `difference>=19-tail-2*short`.

Exactly 101 cells per orbit already had positive Newton origin and no negative
Newton coefficient.  The remaining 19 cells per orbit consisted of ten
univariate rays, eight bivariate cells, and the single trivariate `tail>=19`
cell.  Their sampled increments were positive, but their original Newton
bases were mixed.

## Refinement of all 19 obstructed cells

Every obstructed univariate difference ray is split into a finite positive
prefix and a shifted infinite tail.  The required absolute tail shifts are at
most 5.  All 27 exact forward differences of every shifted tail are
nonnegative and the origin is positive.  This closes ten cells in each orbit.

For each of the eight fixed-tail bivariate cells, split at `short=5`:

```text
short>=5, difference>=0;
each fixed short below 5, difference>=0.
```

The bivariate bulk has a nonnegative `27 x 27` Newton tensor.  Each remaining
fixed-short difference ray is again a finite positive prefix plus a shifted
nonnegative Newton tail.  This closes all eight bivariate cells in each orbit.

Finally, split the trivariate cell as

```text
short>=5, difference>=0;
short=0..4, difference>=5;
short=0..4, difference=0..4.
```

This is a no-gap partition.  Per extension it has one `27^3` tensor, five
`27^2` tensors, and twenty-five `27`-coefficient rays.  Across the three
extension orbits there are 93 regions and 72,009 exact coefficients: zero
negative.  Every region has a positive sampled origin, so nonnegativity of all
forward differences gives strict positivity on the full integer orthant.

Thus the cell accounting per extension is

| source | cells |
|---|---:|
| original coefficientwise cells | 101 |
| refined univariate cells | 10 |
| refined bivariate cells | 8 |
| refined trivariate cell | 1 |
| **total closed** | **120 of 120** |

## Independent replay

The independent audit imports none of the 2026-08-25 producer modules.  It
constructs every subdivided claw as an adjacency list, recomputes its core and
old-root deletion independence polynomials with a generic include/exclude
forest DP through rank eight, evaluates the canonical terminal residual, and
rebuilds the multidimensional forward differences.  It matched:

- all 30 univariate certificates and their literal finite prefixes;
- all 24 bivariate bulk tensors and 60 fixed-short ray certificates;
- all 93 trivariate partition tensors and their ordered coefficient digests.

The 101 original cells remain pinned to the prior independent e=1 package
audit.  The final audit status is
`PASS_INDEPENDENT_GENERIC_TREE_DP_DELTA3_E1_OLD_ROOT_NEAR0_COMPLETE`.

## Exact evidence

```text
prove_rank8_delta3_e1_old_root_near0_univariate_refinement_agent_20260825.py
  5AEF4E1B84BA5CFDF4089B95EB91784C07EA3EA9B33C892C54B0043961D7D91C
rank8_delta3_e1_old_root_near0_univariate_refinement_exact_agent_20260825.json
  0B1D9CD86342ADF42B20CFDD9C4BD430CDAF8313B92E04932B6855E9D7333720

prove_rank8_delta3_e1_old_root_near0_bivariate_refinement_agent_20260825.py
  DEA9F19F7E287D0D2C7F294B971BD7A619EEDAE63BC3D2FC78EF7AFE668FA3CF
rank8_delta3_e1_old_root_near0_bivariate_refinement_exact_agent_20260825.json
  F9882287EA8FC1C53092A74F73FA85FACEC1404C5D54BE49F25FD2433702250C

probe_rank8_delta3_e1_old_root_near0_trivariate_partition_agent_20260825.py
  E36870C886CA7EED1D80BD124AE2623B67592E7A74BB8996520C84D362FB0CA3
rank8_delta3_e1_old_root_near0_trivariate_partition_probe_agent_20260825.json
  1682DE8796B348A077D6CC1BA3570AB139B84BD43A6B7938B80571065A498E55

seal_rank8_delta3_e1_old_root_near0_trivariate_partition_agent_20260825.py
  35EBEDB859E38F2C0AD821A6B409F739B590D6806DE0651E477561A37A9829B0
rank8_delta3_e1_old_root_near0_trivariate_partition_exact_agent_20260825.json
  4433216055285ACCE541C2256F5A8EB549336A6B8FD2A6ACF38794856BC3D97A

assemble_rank8_delta3_e1_old_root_near0_complete_agent_20260825.py
  9CAD7220DA0EDA8C77E44552AB3661E23AF26C4129F812F32E32E6395BD99F58
rank8_delta3_e1_old_root_near0_complete_exact_agent_20260825.json
  AA4661167937F5D5FA484132C0D3739449D9AB261685534BE6FA181C9218618B

audit_rank8_delta3_e1_old_root_near0_complete_agent_20260825.py
  6339AE10FACF1C16DDC7F0D5E3C9A4DCC05228C76131A903769B9B64F640C1E8
rank8_delta3_e1_old_root_near0_complete_independent_audit_agent_20260825.json
  B286E8EACF9008DD5AEB193FEE264004F2FFC0CF3C8B0E9066EF281712CDEE77
```

## Boundary

This theorem closes `Delta3` only for the `e=1` subdivided-claw old-root
orbit with the root adjacent to the center (`near=0`).  Old roots farther down
an arm, arbitrary trees, the `Delta2/3` inserted-leaf gates, full `Q8/PGC`,
forest independence-sequence unimodality, and Erdős Problem 993 remain open.
