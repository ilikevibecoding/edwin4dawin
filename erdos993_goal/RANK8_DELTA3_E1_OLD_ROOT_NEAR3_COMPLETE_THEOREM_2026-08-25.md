# Rank-eight Delta3 e=1 old-root near=3 theorem

Date: 2026-08-25

Status: **proved with an independent exact literal adjacency-list/include-
exclude tree-DP replay**.  This closes one Delta3 arm-extension increment
orbit of the subdivided-claw (`e=1`) family.  It does not enlarge the separate
all-root Delta2 value theorem and does not prove Problem 993.

## Coverage audit and lane selection

The 2026-08-20 Delta2 theorem proves the value statement
`Delta^2 R_1(A,q)>0` for every rooted `e=1` core of order at least 23.  Its
scope includes every center or arm-root distance, but it does **not** assert
strict monotonicity under an arm extension.  Separate increment packages
exist for Delta2 `near=1,2`.

For Delta3 arm-extension increments, `near=0,1,2` were already sealed with
independent exact audits.  Thus `near=3` is the nearest genuinely unsealed
Delta3 root-distance gate and is the scope proved here.

## Theorem

Let `T` be a subdivided claw of source order at least 23.  Choose an arm with
at least four vertices and root `T` at its fourth vertex, leaving three
vertices between the center and root.  Extend any one of the three arms by one
new leaf.  Then the `Delta3` coefficient of the rank-eight terminal residual
at the old root increases strictly.

Order the two arms not containing the root.  Write the source arm lengths as

```text
(tail+4, short+1, short+difference+1),
```

with nonnegative parameters.  Since

```text
n = tail + 2*short + difference + 7,
```

the source-order condition is precisely

```text
tail + 2*short + difference >= 16.              (1)
```

The root-arm, shorter-other-arm, and longer-other-arm labels cover all three
extension choices; equality of the other arms only introduces symmetry.

## Exact no-gap certificate

For each extension orbit, (1) is partitioned into 89 disjoint exhaustive
integer Newton cells:

1. `tail>=16`;
2. fixed `tail=0..15` and
   `short>=ceil((16-tail)/2)`;
3. fixed smaller `tail,short` and
   `difference>=16-tail-2*short`.

The count is `1 + 16 + 72 = 89`.  Exact Delta3 forward differences with
conservative degree bound 26 in every active coordinate immediately certify
70 cells per extension.  The remaining 19 have positive sampled values and
origins but a mixed initial basis: ten univariate rays, eight bivariate cells,
and the `tail>=16` trivariate cell.

Every mixed cell is replaced by a no-gap exact refinement:

- a finite positive prefix plus shifted nonnegative degree-26 Newton tail for
  each obstructed difference ray;
- `short>=5,difference>=0` plus fixed-short strips below 5 for each bivariate
  cell;
- the trivariate partition

  ```text
  short>=5, difference>=0;
  short=0..4, difference>=5;
  short=0..4, difference=0..4.
  ```

Per extension the last split gives one `27^3` tensor, five `27^2` tensors,
and twenty-five 27-coefficient rays.

The complete producer certifies:

| exact item | count |
|---|---:|
| extension orbits | 3 |
| original cells | 267 |
| immediate coefficientwise cells | 210 |
| original mixed cells replaced | 57 |
| original coefficients profiled | 99,873 |
| refined bivariate bulk tensors | 24 |
| refined trivariate regions | 93 |
| refined tensor coefficients | 89,505 |
| shifted rays | 90 |
| shifted-ray coefficients | 2,430 |
| literal finite-prefix values | 180 |
| negative coefficients in proving regions | 0 |

Every proving-region origin and literal prefix value is positive.  The
minimum sampled increment across the three original partitions is
`222940907899820640730`.

## Independent replay

The audit-only machinery imports no producer, refinement, or path-polynomial
module.  It builds each claw as an adjacency list, places the old root at arm
distance four, and computes the core and root-deletion independence
polynomials through rank eight by generic include/exclude forest DP.  The
only shared mathematical definition is the canonical terminal residual in
`verify_rank8_q8_terminal_reduction.py`.

The independent audit matched all 267 original ordered coefficient digests,
all 24 bivariate bulk tensors, all 93 trivariate-region digests, all 90
shifted rays, and all 180 literal prefix values.  It rebuilt the threshold-16
and refinement partitions from their inequalities and verified that each of
the 57 mixed cells is replaced exactly once.

Audit status:

```text
PASS_INDEPENDENT_GENERIC_TREE_DP_DELTA3_E1_OLD_ROOT_NEAR3_COMPLETE
```

## Exact evidence

```text
probe_rank8_delta3_e1_old_root_near3_profile_agent_20260825.py
  ECF00D595CAFA2A7247F45A96422117B9396BC6A0E2DE6C0355F0EBE220BC3E2
rank8_delta3_e1_old_root_near3_profile_exact_agent_20260825.json
  22AE6393597B55CAB42AB902315E7FFF3744AF97F58A09ECB01B6BB9BF3FA313

rank8_e1_old_root_refinement_machinery_agent_20260825.py
  2771F20D90E1F7BC6016FA20FA375548413BD3EB7B88454510C3919D254804AE
prove_rank8_delta3_e1_old_root_near3_complete_agent_20260825.py
  ADEBDC982C101BC9076464E5B86E83D8DD0DB01A0FA81C914D714C0786B3AAD3
rank8_delta3_e1_old_root_near3_complete_exact_agent_20260825.json
  4645E5CC3DD9BCED94B7A91DCC71A093E97558A0D7A9DDAB3A865B3A19A6125C

literal_tree_dp_audit_rank8_e1_old_root_machinery_agent_20260825.py
  3285637D2B4E95D8C4CB5510F3E5161BEEA2FDE5869EF79265378AA709FC9140
audit_rank8_delta3_e1_old_root_near3_complete_agent_20260825.py
  9DF294F19C3967B625F8275B01278A705D6243A5CBB305DF7992F82ECEA61A85
rank8_delta3_e1_old_root_near3_complete_independent_audit_agent_20260825.json
  9B84888691E652D7FB0A2E4E687CB513CF6B46D27699119610BC2374B6B7110F
```

## Boundary

This theorem closes `Delta3` only for the `e=1` subdivided-claw old-root
arm-extension increment orbit with `near=3`.  Other unsealed root distances,
arbitrary trees, general inserted-new-leaf gates, full `Q8/PGC`, forest
independence-sequence unimodality, and Erdős Problem 993 remain open.
