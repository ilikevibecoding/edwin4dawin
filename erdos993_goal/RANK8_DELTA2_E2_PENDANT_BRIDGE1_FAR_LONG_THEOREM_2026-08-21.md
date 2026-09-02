# Rank-eight Delta2 for pendant-rooted double claws with bridge one and two long far arms

## Theorem

Let `A` be any degree-surplus-two tree, hence a double claw.  Root `A` at an
arbitrary vertex of a selected pendant arm.  If

```text
central bridge length = 1,
both far-arm lengths >= 7,
|A| >= 23,
```

then the terminal-broom rank-eight coefficient satisfies

```text
Delta2 R_1(A,q) > 0.
```

The selected arm and root position are arbitrary, and the paired arm at the
selected branch is an arbitrary positive length.

## Exact state partition

The paired arm is split into `1,...,6,>=7`.  The root-to-branch near segment
and the root-to-leaf tail segment are independently split into
`0,...,6,>=7`.  This gives

```text
7 * 8 * 8 = 448
```

state patterns.  The two far arms are written as `C+7,D+7`.  Exact symmetric
expansion retains their sum `SR=C+D` and product `PR=CD`.

A separate 448-cell calculation proves that the exact Delta2 polynomial has
degree zero in `PR` in every state.  Thus the sum-only compression used by the
primary proof is an identity, not a boundary specialization.  Across those
448 product-retained cells the calculation checks 112,014 coefficients, with
zero negative coefficients and maximum product degree zero.

After product cancellation, the primary 448 cells are coefficientwise
positive on their nonnegative coordinate orthants.  The global minimum
coefficient is

```text
1 / 121927680000.
```

When the base state has order below 23, the order deficit `d` is covered by
the exact union of shifted coordinate orthants: among `k` nonnegative offset
coordinates with sum at least `d`, one is at least `ceil(d/k)`.  Thirty-five
cells require such a shift.  The independent audit reconstructs the complete
state/shift key universe and all 448 literal tree-DP constants.

## Sealed artifacts

```text
run_rank8_delta2_e2_pendant_fixed_bridge_far_long_root_side_arbitrary_cells.py
4926057DC1A4AB503694B9D19457D89E1B3FA125DA0DD656A5286563CF0BE597

rank8_delta2_e2_pendant_bridge1_far_long_root_side_arbitrary_cells_exact_20260820.json
D977391D855001F3E6128E27985F1DC9DDA6D6102CEF29BD90AFADAA67D78669

probe_rank8_delta2_e2_pendant_bridge1_far_product_cell.py
4701B984506EB66711B59DB320781F61BE018D1C47A1054D7DC5E69C26F7B594

verify_rank8_delta2_e2_pendant_bridge1_far_product_cancellation.py
D19788510C73E8416A2BE067EE43066861C74F89DC5268CE367CC9EAF85691EF

rank8_delta2_e2_pendant_bridge1_far_product_cancellation_exact_20260821.json
F8395D64F76AABE7BF742944F597C2CDE199B6D57BF66F9EA617961621EA038F

audit_rank8_delta2_e2_pendant_bridge1_far_long_root_side_arbitrary.py
79C76B76F451A968F2CEFBA34A934A635A29259FA7040CF3FC2C449702C6114C

rank8_delta2_e2_pendant_bridge1_far_long_root_side_arbitrary_independent_audit_exact_20260821.json
6664B9D08C7C7BE3DE5EFD3FAD0F6700A44190272AD9813B07CC5FD9972489BE
```

## Scope guard

This theorem closes bridge length one only when both far arms have length at
least seven.  Bridge lengths `2,...,7`, bridge one with at least one short far
arm, non-pendant root types, the other pending residual ranks, and connected
`Q8` remain outside its scope.
