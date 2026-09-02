# Rank-eight Delta3 e=1 old-root near=2 theorem

Date: 2026-08-25

Status: **proved with an independent exact adjacency-list/include-exclude
tree-DP replay**.  This is a rank-3 proof, not an inference from the separate
Delta2 theorem.  It closes one old-root orbit of the subdivided-claw (`e=1`)
family and does not prove arbitrary leaf extension or Problem 993.

## Theorem

Let `T` be a subdivided claw of source order at least 23.  Choose an arm with
at least three vertices and root `T` at its third vertex, so two vertices of
that arm lie between the center and the root.  Extend any one of the three
arms by one new leaf.  Then the `Delta3` coefficient of the rank-eight
terminal residual at the old root increases strictly.

Order the two arms not containing the root and write the source arm lengths as

```text
(tail+3, short+1, short+difference+1),
```

where all three parameters are nonnegative.  The source order is

```text
n = tail + 2*short + difference + 6,
```

so `n>=23` is precisely

```text
tail + 2*short + difference >= 17.              (1)
```

Root-arm, shorter-other-arm, and longer-other-arm extension cover every arm
choice.  Equal other-arm lengths give a harmless symmetric duplication.

## Exact no-gap certificate

For each extension orbit, (1) is partitioned without gaps or overlaps into
99 integer Newton cells:

1. `tail>=17`;
2. fixed `tail=0..16` and
   `short>=ceil((17-tail)/2)`;
3. fixed smaller `tail,short` and
   `difference>=17-tail-2*short`.

The count is `1 + 17 + 81 = 99`.  Exact Delta3 integer forward differences
with conservative degree bound 26 in each active coordinate immediately
certify 80 cells per extension.  The remaining 19 have positive sampled
values and origins but a mixed initial Newton basis: ten univariate rays,
eight bivariate cells, and the `tail>=17` trivariate cell.

Every mixed cell is replaced by an exact disjoint refinement:

- Each obstructed difference ray is a finite positive prefix followed by a
  shifted degree-26 Newton tail with nonnegative coefficients and positive
  origin.
- Each obstructed bivariate cell is split into
  `short>=5,difference>=0` and fixed-short strips below 5.  The bulk tensor is
  coefficientwise nonnegative; the strips use finite prefixes and shifted
  Newton tails.
- The trivariate cell is split into

  ```text
  short>=5, difference>=0;
  short=0..4, difference>=5;
  short=0..4, difference=0..4.
  ```

  Per extension this yields one `27^3` tensor, five `27^2` tensors, and
  twenty-five 27-coefficient rays.

The complete rank-3 producer certifies:

| exact item | count |
|---|---:|
| extension orbits | 3 |
| original cells | 297 |
| immediate coefficientwise cells | 240 |
| original mixed cells replaced | 57 |
| original coefficients profiled | 102,789 |
| refined bivariate bulk tensors | 24 |
| refined trivariate regions | 93 |
| refined tensor coefficients | 89,505 |
| shifted rays | 90 |
| shifted-ray coefficients | 2,430 |
| literal finite-prefix values | 180 |
| negative coefficients in proving regions | 0 |

Every proving-region origin and literal prefix value is positive.  The
minimum sampled increment across the three original partitions is
`222586516076953488096`.

## Independent replay

The dedicated Delta3 audit imports neither the Delta2 certificate nor any
Delta2 conclusion.  It also imports none of the producer, refinement-helper,
or subdivided-claw path-polynomial code.  It builds each claw as a fresh
adjacency list, places the old root at arm distance three, and computes the
core and root-deletion independence polynomials by generic include/exclude
forest DP truncated through rank eight.  The only shared mathematical
definition is the canonical terminal residual in
`verify_rank8_q8_terminal_reduction.py`.

The audit independently matched all 297 rank-3 original ordered coefficient
digests, all 24 bivariate bulk tensors, all 93 trivariate-region digests, all
90 shifted rays, and all 180 literal prefix values.  It rebuilt the
threshold-17 and refinement partitions from their inequalities and verified
that each of the 57 mixed cells is replaced exactly once.

Audit status:

```text
PASS_INDEPENDENT_GENERIC_TREE_DP_DELTA3_E1_OLD_ROOT_NEAR2_COMPLETE
```

## Exact evidence

```text
probe_rank8_delta23_e1_old_root_near2_profile_agent_20260825.py
  76212A9D7E32F5E87B966AA82C5C66BE6A0D5450FCBEBB535B4386BCA1519186
rank8_delta23_e1_old_root_near2_profile_exact_agent_20260825.json
  3D1412EEDCDB356B17328FEA59357816B8ADAACFF240EA592869690B492ADC8F

rank8_e1_old_root_refinement_machinery_agent_20260825.py
  2771F20D90E1F7BC6016FA20FA375548413BD3EB7B88454510C3919D254804AE

prove_rank8_delta3_e1_old_root_near2_complete_agent_20260825.py
  7B253BC2C5420DF8501AFBDE18D82DDB1D1F070F5AFF5297303A1EDED3D522A8
rank8_delta3_e1_old_root_near2_complete_exact_agent_20260825.json
  2985B3459E40621A41033FA8CA53C24C01BBAA5E2A5891997040369187DB8B49

audit_rank8_delta3_e1_old_root_near2_complete_agent_20260825.py
  27032D6E909A31A6712A5073753465D0A823E5C0C44CB7AE45AD35BF3C84F1EA
rank8_delta3_e1_old_root_near2_complete_independent_audit_agent_20260825.json
  4C6F900F3F335AD10020C1A235133C5DEE0658A60DF204290EBF9C90597993F9
```

## Boundary

This theorem closes `Delta3` only for the `e=1` subdivided-claw old-root
orbit with `near=2`.  Other root distances, arbitrary trees, the general
`Delta2/3` inserted-new-leaf gates, full `Q8/PGC`, forest independence-
sequence unimodality, and Erdős Problem 993 remain open.
