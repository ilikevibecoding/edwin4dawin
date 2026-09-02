# Rank-eight terminal Delta2: every bridge-interior-rooted e=2 double claw

## Theorem

For every degree-surplus-two double claw `(A,q)` of order `n>=23`, when `q`
is any internal vertex of the unique path joining the two degree-three branch
vertices,

`Delta^2 R_1(A,q)>0`.

## Exact exhaustive partition

Each unordered pendant-arm pair is classified by the 28 states
`(1,...,6,L)` with `L=X+7`.  Side reversal makes the two arm-pair states an
unordered pair, giving `C(29,2)=406` side-pair reports.

For a fixed bridge root, the numbers of intervening bridge vertices on its two
sides are each classified as `0,...,5,L`, where `L=X+6`.  The exact sweep
covered 19,306 resulting gap patterns.  Of these, 4,352 cannot reach order 23
and are empty; the other 15,030 symbolic cells were coefficientwise positive.

The independent audit reconstructed the complete no-gap state universe,
rehashed all 406 child reports, and rebuilt all 15,030 constant terms directly
from literal double-claw and root-deletion independence polynomials.  Its
smallest coefficient was

`1/121927680000 > 0`.

## Immutable evidence

- complete producer report
  `rank8_delta2_e2_bridge_all_arm_pairs_all_root_positions_exact_root_20260823.json`  
  SHA-256 `2D4CB3907B77C38859F081C8BF894839E4CD2E73C10A5BF8858C2AD5E45A1B91`
- independent audit source
  `audit_rank8_delta2_e2_bridge_all_arm_pairs_all_root_positions_root.py`  
  SHA-256 `DAF8DF5EFDF4C7C44ADD33831536864D15B769E08C2CCFE369674951EF42050F`
- independent audit report
  `rank8_delta2_e2_bridge_all_arm_pairs_all_root_positions_independent_audit_exact_root_20260823.json`  
  SHA-256 `A2F43E5CFBAF5594DE62FE252FAE1F1A28F198181355077D741DE40B848A1BFE`

This theorem credits bridge-interior roots at `e=2`, `Delta2` only.  Branch
and pendant roots are separate packages.
