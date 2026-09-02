# Rank-eight Delta2 e=1 old-root near=2 theorem

Date: 2026-08-25

Status: **proved with an independent exact adjacency-list/include-exclude
tree-DP replay**.  This closes one old-root orbit of the subdivided-claw
(`e=1`) family; it does not prove arbitrary leaf extension or Problem 993.

## Theorem

Let `T` be a subdivided claw of source order at least 23.  Choose an arm with
at least three vertices and root `T` at its third vertex, so two vertices of
that arm lie between the center and the root.  Extend any one of the three
arms by one new leaf.  Then the `Delta2` coefficient of the rank-eight
terminal residual at the old root increases strictly.

Order the two arms not containing the root.  Write the source arm lengths as

```text
(tail+3, short+1, short+difference+1),
```

with `tail,short,difference >= 0`.  The source order is

```text
n = tail + 2*short + difference + 6,
```

so `n>=23` is exactly

```text
tail + 2*short + difference >= 17.              (1)
```

The root-arm, shorter-other-arm, and longer-other-arm extension labels cover
all three choices.  When the other arms are equal, their labels are symmetric
but the coverage remains exhaustive.

## Exact no-gap certificate

For each extension orbit, (1) is partitioned without gaps or overlaps into
99 integer Newton cells:

1. `tail>=17`;
2. fixed `tail=0..16` and
   `short>=ceil((17-tail)/2)`;
3. fixed smaller `tail,short` and
   `difference>=17-tail-2*short`.

The count is `1 + 17 + 81 = 99`.  Exact integer forward differences with the
conservative per-axis degree bound 27 immediately certify 80 cells per
extension.  The remaining 19 have positive sampled values and origins but a
mixed initial Newton basis: ten univariate rays, eight bivariate cells, and
the `tail>=17` trivariate cell.

Each mixed cell is replaced by a disjoint exhaustive refinement:

- Every obstructed difference ray is a finite positive prefix followed by a
  shifted degree-27 Newton tail with nonnegative coefficients and positive
  origin.  The largest additional shift is 4 and the largest absolute tail
  lower bound is 5.
- Every obstructed bivariate cell is split into
  `short>=5,difference>=0` and the fixed-short strips below 5.  The bulk is
  coefficientwise nonnegative; each strip uses the finite-prefix/shifted-tail
  proof.
- The trivariate cell is split into

  ```text
  short>=5, difference>=0;
  short=0..4, difference>=5;
  short=0..4, difference=0..4.
  ```

  Per extension this gives one `28^3` tensor, five `28^2` tensors, and
  twenty-five 28-coefficient rays.

The complete producer certifies:

| exact item | count |
|---|---:|
| extension orbits | 3 |
| original cells | 297 |
| immediate coefficientwise cells | 240 |
| original mixed cells replaced | 57 |
| original coefficients profiled | 112,644 |
| refined bivariate bulk tensors | 24 |
| refined trivariate regions | 93 |
| refined tensor coefficients | 98,532 |
| shifted rays | 90 |
| shifted-ray coefficients | 2,520 |
| literal finite-prefix values | 180 |
| negative coefficients in proving regions | 0 |

Every proving-region origin and every literal prefix value is positive.  The
minimum sampled increment across the three original partitions is
`165672494206274572772`.

## Independent replay

The audit imports none of the producer, the general refinement helper, or the
subdivided-claw path-polynomial routines.  It builds every claw as a fresh
adjacency list, places the old root at arm distance three, and recomputes the
core and root-deletion independence polynomials by a generic include/exclude
forest DP truncated through rank eight.  It shares only the canonical
terminal-residual definition in `verify_rank8_q8_terminal_reduction.py`.

The audit independently matched all 297 original ordered coefficient
digests, all 24 bivariate bulk tensors, all 93 trivariate-region digests, all
90 shifted rays, and all 180 literal prefix values.  It rebuilt the
threshold-17 and refinement partitions from their inequalities and verified
that every one of the 57 mixed cells is replaced exactly once.

Audit status:

```text
PASS_INDEPENDENT_GENERIC_TREE_DP_DELTA2_E1_OLD_ROOT_NEAR2_COMPLETE
```

## Exact evidence

```text
probe_rank8_delta23_e1_old_root_near2_profile_agent_20260825.py
  76212A9D7E32F5E87B966AA82C5C66BE6A0D5450FCBEBB535B4386BCA1519186
rank8_delta23_e1_old_root_near2_profile_exact_agent_20260825.json
  3D1412EEDCDB356B17328FEA59357816B8ADAACFF240EA592869690B492ADC8F

rank8_e1_old_root_refinement_machinery_agent_20260825.py
  2771F20D90E1F7BC6016FA20FA375548413BD3EB7B88454510C3919D254804AE

prove_rank8_delta2_e1_old_root_near2_complete_agent_20260825.py
  810DFBB92AFE9E8EF438EB8C878155D8929F79CC71858144944431EAFD845F6D
rank8_delta2_e1_old_root_near2_complete_exact_agent_20260825.json
  3EA6C013BFFA1BD91DAB4471B710482AE92F3B0737C021E9280D9DF16DDD009D

audit_rank8_delta2_e1_old_root_near2_complete_agent_20260825.py
  C0396DC46506200B57369356A5CBDE3958A921A05539C89AE8CE8B761D9E2CB5
rank8_delta2_e1_old_root_near2_complete_independent_audit_agent_20260825.json
  68F2A137EE7BF9253F4B964C52E3E7A45D683960D3C631997A9170D549D770FE
```

## Boundary

This theorem closes `Delta2` only for the `e=1` subdivided-claw old-root
orbit with `near=2`.  Other root distances, arbitrary trees, the general
`Delta2/3` inserted-new-leaf gates, full `Q8/PGC`, forest independence-
sequence unimodality, and Erdős Problem 993 remain open.
