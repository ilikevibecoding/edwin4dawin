# Rank-eight Delta2: pendant roots, bridge one, all arm lengths

Date: 2026-08-23

Status: **PASS in the stated all-order scope.**

## Theorem

For every order `n>=23`, every degree-surplus-two double claw whose central
bridge has length one, and every root on a pendant arm,

```text
Delta2 R_1(A,q) > 0.
```

The selected-arm length and root position, paired-arm length, and both
far-arm lengths are arbitrary positive integers.

## Exact no-gap partition

Each far arm is split into `1,...,6,>=7`, and branch symmetry orders the two
states.  This gives 28 unordered far-state pairs.

- The `>=7,>=7` pair is the previously sealed bridge-one far-long theorem.
- The other 27 pairs are the new exact package.

For every new far pair, the paired arm is split into `1,...,6,>=7`, while the
selected near and tail lengths are independently split into
`0,...,6,>=7`.  Thus the new package checks

```text
27 * 7 * 8 * 8 = 12,096
```

state patterns.  Of these, 4,674 fixed patterns are empty below the order-23
threshold.  The remaining domain is covered by 7,517 shifted symbolic cells,
all with strictly positive constants and zero negative coefficients.

The independent audit reconstructs the full 28-state far-pair universe, every
paired/near/tail key, every empty-state decision, every shifted-orthant cover,
and all 7,517 new literal tree-DP constants.  The global coefficient minimum
in the new cells is

```text
1 / 121927680000.
```

## Scope guard

This closes bridge one for pendant roots at `Delta2`.  Bridges `2,...,7` with
a short far arm, non-pendant root types, the other connected residual
families, the forest lift, rank-eight PGC, and Problem 993 remain separate.

## Frozen hashes

```text
New fixed-bridge/far-pair primary source
  run_rank8_delta2_e2_pendant_fixed_bridge_far_pair_root_side_arbitrary_cells_root.py
  5C0B2046275275074C893DAA875D6A34D37FE7DB85C5DE25CBD1491E7E3FABD2

New 27-pair batch verifier
  verify_rank8_delta2_e2_pendant_short_bridge_all_far_pairs_root.py
  E917CD91D6394F38AE4226F60D9378E4EBA665BBB564E510498E0FD5E65E59C0
New 27-pair batch report
  rank8_delta2_e2_pendant_short_bridges_all_far_pairs_exact_root.json
  AC9E46B598CFAEFED825B06BC96E41819A03F931A890912B37F86D78EBA6D881

Existing long-long independent audit report
  rank8_delta2_e2_pendant_bridge1_far_long_root_side_arbitrary_independent_audit_exact_20260821.json
  6664B9D08C7C7BE3DE5EFD3FAD0F6700A44190272AD9813B07CC5FD9972489BE

Aggregate independent audit source
  audit_rank8_delta2_e2_pendant_bridge1_all_arm_lengths_root.py
  7652F4D17CD612955327B3B5463B09BF4F982830B301463A3A7C063D55D2A9F0
Aggregate independent audit report
  rank8_delta2_e2_pendant_bridge1_all_arm_lengths_independent_audit_exact_root_20260823.json
  3A5FE5545E995BAB123BE708CA0E8015DAACF1EEEF501901CD8666F1A9F0B2A5
```
