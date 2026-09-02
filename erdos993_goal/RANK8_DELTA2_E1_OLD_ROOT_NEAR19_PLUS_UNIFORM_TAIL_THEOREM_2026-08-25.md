# Rank-eight Delta2 e=1 old-root uniform tail theorem (`near>=19`)

Date: 2026-08-25

Status: **proved with an independent exact include/exclude tree-message replay
and literal adjacency-list/full-forest-DP checks in every routing region**.

## Theorem

Let `T` be a subdivided claw rooted on one arm.  Suppose at least nineteen
vertices lie strictly between the claw center and the old root (`near>=19`).
Extend any one of the three arms by one new leaf.  Then the `Delta2`
coefficient of the rank-eight terminal residual at the old root increases
strictly.

Order the two arms not containing the root and write the source arm lengths as

```text
(near+tail+1, short+1, short+difference+1),
```

where all four parameters are nonnegative and `near>=19`.  The source order is

```text
n = near + tail + 2*short + difference + 4,
```

so `near>=19` makes `n>=23` automatic.  The root-arm,
shorter-other-arm, and longer-other-arm labels cover every extension choice.

## Uniform finite transfer certificate

The path independence polynomial obeys the include/exclude transfer

```text
I(P_m;x) = I(P_(m-1);x) + x I(P_(m-2);x).
```

At rank `r`, its coefficient is `C(m-r+1,r)`.  All small path-order branches
are isolated by the following pairwise-disjoint exhaustive partition:

- `near>=19` in every region;
- `tail>=6`, or fixed `tail=0..5`;
- `short>=6,difference>=0`, or fixed `short=s` in `0..5` and either
  `difference>=6-s` or fixed `difference=0..5-s`.

Per extension this gives one dimension-4 region, 12 dimension-3 regions, 57
dimension-2 regions, and 126 dimension-1 regions: 196 total.  The maximum
rank-weighted coordinate degree of the 22 exact Delta2 residual monomials is
27, so 28 samples in each active coordinate give the complete Newton tensor.
The exact coefficient count per extension is

```text
28^4 + 12*28^3 + 57*28^2 + 126*28 = 926,296.
```

Across all three extension orbits, the producer certifies:

| exact item | count |
|---|---:|
| extension orbits | 3 |
| routed regions | 588 |
| exact Newton coefficients | 2,778,888 |
| positive coefficients | 259,038 |
| zero coefficients | 2,519,850 |
| negative coefficients | 0 |

Every origin and sampled increment is positive.  The minimum sampled
increment is `167829980069555488412`, shared by the two other-arm extension
orbits.

## Independent replay and no-gap ledger

The audit imports no producer refinement or closed path-polynomial formula.
It freshly extracts the canonical 22-term Delta2 evaluator, derives generic
include/exclude path messages, reconstructs every routing key, and replays
all 2,778,888 exact integer forward-difference coefficients.  Every stored
ordered digest and minimum matched.

At both opposite tensor corners of every one of the 196 regions, it also
constructs the subdivided claw as a literal adjacency list and runs a generic
include/exclude forest DP through rank eight.  This supplies 1,176 literal
increment checks and 1,568 literal core/root-deletion profile checks.

The independently rebuilt coverage ledger is exactly

```text
near: near>=19;
tail: {0,1,2,3,4,5} disjoint union {tail>=6};
short/difference:
  {short>=6,difference>=0}
  disjoint union over s=0..5 of
  {short=s,difference=0..5-s} and {short=s,difference>=6-s}.
```

Audit status:

```text
PASS_INDEPENDENT_LITERAL_TREE_DP_DELTA2_E1_OLD_ROOT_NEAR19_PLUS
```

## Exact evidence

```text
prove_rank8_delta2_e1_old_root_near19_uniform_tail_agent_20260825.py
  2A12B84716FB01C36423B383C4A93F12C4F900346420F4A4BD0C8EA965F6E633
rank8_delta2_e1_old_root_near19_uniform_tail_exact_agent_20260825.json
  D384FCC3B463CF9158CC0AC3912F88028D5968BEB664DDE5AAD2F9B772451D5F

audit_rank8_delta2_e1_old_root_near19_uniform_tail_agent_20260825.py
  240F3F03F61EE5957768A47611A64F6A0A900882C05FDE45DC3E8B1612084517
rank8_delta2_e1_old_root_near19_uniform_tail_independent_audit_agent_20260825.json
  D892691E1A27824F637C0F5E77AAEDEAF79AB92BB3BF74A708F6F7CF715FB698
```

## Boundary

This theorem closes only the Delta2 `e=1` subdivided-claw old-root
arm-extension tail `near>=19`.  It does not cover finite distances, center
roots, inserted-new-leaf roots, arbitrary trees, full `Q8/PGC`, forest
independence-sequence unimodality, or Erdős Problem 993.
