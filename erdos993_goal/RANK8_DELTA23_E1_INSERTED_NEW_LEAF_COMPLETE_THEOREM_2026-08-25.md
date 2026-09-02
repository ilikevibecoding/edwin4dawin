# Rank-eight Delta2/Delta3 e=1 inserted-new-leaf theorem

Date: 2026-08-25

Status: **proved with a new digest-bearing exact producer and an independent
literal adjacency-list/include-exclude tree-DP replay**.

## Theorem

Let `T` be a subdivided claw of source order at least 23.  Extend any one of
its three arms by one new endpoint leaf and root the extended tree at that
inserted leaf.  Then both the `Delta2` and `Delta3` coefficients of the
rank-eight terminal residual at the new root are strictly positive.

Order the source arm lengths and write them as

```text
(A+1, A+B+1, A+B+C+1),
```

where `A,B,C>=0`.  The source order condition is exactly

```text
3*A + 2*B + C >= 19.                            (1)
```

Each of the three arm-extension labels is retained even when equal source arm
lengths introduce symmetry.

## Exact no-gap certificate

For each rank and extension arm, (1) is partitioned into 45 disjoint cells:

```text
A>=7;
A=0..6 and B>=ceil((19-3*A)/2);
A=0..6, smaller fixed B, and C>=19-3*A-2*B.
```

The dimension counts per rank/extension case are 37 rays, seven
two-dimensional cells, and one three-dimensional bulk cell.  The partition
is algebraically exhaustive, and a redundant audit verifies membership
multiplicity zero or one at all `21^3=9,261` points of the bounded cube.

The exact canonical residual has 22 integer monomials at Delta2 and 26 at
Delta3.  Their maximum rank-weighted coordinate degrees are respectively 27
and 26, so widths 28 and 27 give complete Newton tensors.

| rank | extension orbits | cells | exact coefficients | negative | zero | positive |
|---:|---:|---:|---:|---:|---:|---:|
| Delta2 | 3 | 135 | 85,428 | 0 | 63,531 | 21,897 |
| Delta3 | 3 | 135 | 77,355 | 0 | 57,270 | 20,085 |
| **combined** | **6** | **270** | **162,783** | **0** | **120,801** | **41,982** |

Every region origin and every sampled terminal value is strictly positive.
The new producer also matches every aggregate count in the historical
2026-08-20 all-order report, while adding an ordered coefficient digest for
every cell.

## Independent literal replay

The audit imports neither producer nor closed path-polynomial code.  It
freshly extracts both canonical integer evaluators and derives a generic
include/exclude message recurrence for paths.  For every one of the 270
rank/extension cells it rebuilds the routing key, every sampled terminal
value, and every exact multidimensional integer forward difference.

All 162,783 ordered coefficient digests and all minima matched.  At both
rank-specific tensor corners of every cell and extension arm, the audit also
builds the extended subdivided claw as a literal adjacency list and runs a
generic include/exclude forest DP for:

- the full extended-tree independence profile; and
- the profile after deleting the inserted root, which recovers the source
  claw.

This supplies 540 literal core/new-root-deletion profile checks and 540
literal Delta2/Delta3 terminal-value checks.

Audit status:

```text
PASS_INDEPENDENT_LITERAL_TREE_DP_DELTA23_E1_INSERTED_NEW_LEAF_COMPLETE
```

## Exact evidence

```text
prove_rank8_delta23_e1_inserted_new_leaf_complete_agent_20260825.py
  517FD645FCECEFAB1AE40811EF337797B5402B8375E42C51A7942A0819C165CD
rank8_delta23_e1_inserted_new_leaf_complete_exact_agent_20260825.json
  930B8F2E985B07B54B5AFB7422DF0510AAE2DF6D11E88418527B0111D1368CD0

audit_rank8_delta23_e1_inserted_new_leaf_complete_agent_20260825.py
  C1D5EA228D583C43AC74339C80D93D8EC93C23D3C6ADDE3614CD950A83991E67
rank8_delta23_e1_inserted_new_leaf_complete_independent_audit_agent_20260825.json
  B2B97CBC67021A53FF422A8CEC877E4CA832D21C01754AAF4016C2015565C3F5
```

## Boundary

This theorem closes only the Delta2/Delta3 rank-eight terminal-residual gate
at the inserted endpoint leaf for `e=1` subdivided-claw sources of order at
least 23.  It does not itself cover old roots, arbitrary trees, full
`Q8/PGC`, forest independence-sequence unimodality, or Erdős Problem 993.
