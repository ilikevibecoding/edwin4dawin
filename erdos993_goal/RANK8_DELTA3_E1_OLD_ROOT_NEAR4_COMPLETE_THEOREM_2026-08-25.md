# Rank-eight Delta3 e=1 old-root near=4 theorem

Date: 2026-08-25

Status: **proved with an independent exact literal adjacency-list/include-
exclude tree-DP replay**.  This closes one Delta3 arm-extension increment
orbit of the subdivided-claw (`e=1`) family.  It does not prove an all-root-
distance increment theorem and does not prove Problem 993.

## Coverage bookkeeping and lane selection

Independent exact packages had already sealed the Delta3 old-root increment
gates at `near=0,1,2,3`.  Thus `near=4` was the nearest unsealed distance in
that ledger.  None of their coefficient or positivity conclusions is used in
the proof below.

## Theorem

Let `T` be a subdivided claw of source order at least 23.  Choose an arm with
at least five vertices and root `T` at its fifth vertex, leaving four vertices
between the center and root.  Extend any one of the three arms by one new
leaf.  Then the `Delta3` coefficient of the rank-eight terminal residual at
the old root increases strictly.

Order the two arms not containing the root.  Write the source arm lengths as

```text
(tail+5, short+1, short+difference+1),
```

with nonnegative parameters.  Since

```text
n = tail + 2*short + difference + 8,
```

the source-order condition is precisely

```text
tail + 2*short + difference >= 15.              (1)
```

The root-arm, shorter-other-arm, and longer-other-arm labels cover all three
extension choices; equality of the other arms only introduces symmetry.

## Exact no-gap certificate

For each extension orbit, (1) is partitioned into 80 disjoint exhaustive
integer Newton cells:

1. `tail>=15`;
2. fixed `tail=0..14` and
   `short>=ceil((15-tail)/2)`;
3. fixed smaller `tail,short` and
   `difference>=15-tail-2*short`.

The count is `1 + 15 + 64 = 80`.  Exact Delta3 forward differences with
conservative degree bound 26 in every active coordinate immediately certify
61 cells per extension.  The remaining 19 have positive sampled values and
origins but a mixed initial basis: ten univariate rays, eight bivariate cells,
and the `tail>=15` trivariate cell.

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
| original cells | 240 |
| immediate coefficientwise cells | 183 |
| original mixed cells replaced | 57 |
| original coefficients profiled | 97,038 |
| refined bivariate bulk tensors | 24 |
| refined trivariate regions | 93 |
| refined tensor coefficients | 89,505 |
| shifted rays | 90 |
| shifted-ray coefficients | 2,430 |
| literal finite-prefix values | 180 |
| negative coefficients in proving regions | 0 |

Every proving-region origin and literal prefix value is positive.  The
minimum sampled increment across the three original partitions is
`222880563772384029024`.

## Independent replay

The audit-only machinery imports no producer, refinement, or path-polynomial
module.  It builds each claw as a literal adjacency list, places the old root
at arm distance five, and computes the core and root-deletion independence
polynomials through rank eight by generic include/exclude forest DP.  The only
shared mathematical definition is the canonical terminal residual in
`verify_rank8_q8_terminal_reduction.py`.

The independent audit matched all 240 original ordered coefficient digests,
all 24 bivariate bulk tensors, all 93 trivariate-region digests, all 90
shifted rays, and all 180 literal prefix values.  It rebuilt the threshold-15
and refinement partitions from their inequalities and verified that each of
the 57 mixed cells is replaced exactly once.

Audit status:

```text
PASS_INDEPENDENT_GENERIC_TREE_DP_DELTA3_E1_OLD_ROOT_NEAR4_COMPLETE
```

## Exact evidence

```text
probe_rank8_delta3_e1_old_root_near4_profile_agent_20260825.py
  7C0F32EBBAEC09107943E2D13584528EBAA50ED3C7B84DB2386068794706F263
rank8_delta3_e1_old_root_near4_profile_exact_agent_20260825.json
  CEA8BB96DF3F4B3BA4631697A6C872823AF34B805B6AC9A8E0484FC742BE725E

rank8_e1_old_root_refinement_machinery_agent_20260825.py
  2771F20D90E1F7BC6016FA20FA375548413BD3EB7B88454510C3919D254804AE
prove_rank8_delta3_e1_old_root_near4_complete_agent_20260825.py
  137C432F6D9443BCF3899BD51C209626E218576006768AFBA2CF13451B5FB670
rank8_delta3_e1_old_root_near4_complete_exact_agent_20260825.json
  E69F15296143D84C1D2B85086751628B9EEC05504055B9947389EC2CBC385878

literal_tree_dp_audit_rank8_e1_old_root_machinery_agent_20260825.py
  3285637D2B4E95D8C4CB5510F3E5161BEEA2FDE5869EF79265378AA709FC9140
audit_rank8_delta3_e1_old_root_near4_complete_agent_20260825.py
  0F3114B4DD6DE74BA0FA4BDDA7967E271D3CBBAF6E704506D2E9DF7495C75290
rank8_delta3_e1_old_root_near4_complete_independent_audit_agent_20260825.json
  C9CB32024AFF56A7D483BCD52824540A3729E13DB18701E9AC1E2171CC87E6E6
```

## Boundary

This theorem closes `Delta3` only for the `e=1` subdivided-claw old-root
arm-extension increment orbit with `near=4`.  Root distances are unbounded;
an all-distance transfer or finite-cutoff argument is still required.  Other
root families, arbitrary trees, inserted-new-leaf gates, full `Q8/PGC`,
forest independence-sequence unimodality, and Erdős Problem 993 remain open.
