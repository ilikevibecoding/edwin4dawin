# Rank-eight low/low complementary slack regions

## Result

Two large complementary regions of the pending rank-eight low/low Bernstein
auxiliaries are now exact theorems.

1. With the early slacks `a0,a2,b0,b2` zero, all four auxiliaries are
   nonnegative for arbitrary suffix slacks `a3,...,a7,b3,...,b7>=0`.
2. With `a3=a4=b3=b4=0`, all four auxiliaries are nonnegative for arbitrary
   `a0,a2,a5,a6,a7,b0,b2,b5,b6,b7>=0`.

Thus the only remaining low/low slack join is to add suffix indices 4 and 3 to
the already simultaneous full-early/suffix-5 region.

## Exact suffix-3 theorem

The suffix-only theorem is a complete 90-cell outer-coefficient proof in
`(a3,b3)`.  It checks 154,383,729 exact coefficients:

```text
curvature middle    25,803,654   minimum 4
curvature far       25,803,232   minimum 1
strong middle       51,388,660   minimum 4
strong far          51,388,183   minimum 1
negative                     0
```

Its independent audit checks the complete cell-key universe, aggregates, and
the underlying 18 zero-slack AM-GM blocks.  It is explicitly a structural
audit rather than a second 154-million-coefficient engine.

## Exact full-early/suffix-5 theorem

The full early core has 54, 84, and 159 exact AM-GM allocations in its three
nontrivial target rows.  Substituting every allocation through the new suffix
variables overpays some cells, so the proof uses exact directional masks.  The
selected masks are:

```text
target                       left blocks   right blocks
curvature middle                       0              0
curvature far                          0             51
strong middle                         75              0
strong far                            76             68
```

For every allocation, the left terminal is lifted through `a5` precisely when
its left mask bit is selected, and similarly for `b5`.  The resulting outer
support is `0<=deg(a5)<=13`, `0<=deg(b5)<=12`.  A fail-closed 182-cell verifier
checks the complete grid.  The origin is the immutable full-early-core AM-GM
certificate; the other 181 genuinely lifted cells contain:

```text
curvature middle    14,499,930   minimum 4
curvature far       14,483,905   minimum 1
strong middle       27,932,675   minimum 4
strong far          27,927,005   minimum 1
total               84,843,515
negative                     0
```

The independent audit checks all hashes, the 182-cell key universe, every row
invariant, recomputed aggregates, mask bounds against the base allocations,
the hash-referenced origin, and five fresh representative cells.  It does not
claim to be a second full recomputation of all 84,843,515 coefficients.

## Sealed artifacts

```text
probe_rank8_low_low_both_suffix3_cell_flint.py
C23BD62E1D56BFBD81FC7B27D00C6EB255DEC3C57940A7BD9C6BB81CA1D92243

verify_rank8_low_low_both_suffix3_a3_b3_cells.py
2CDBACD7E10C15BB0FE847EA295DA267E5F48DCBE41434376F402746B21FAAC3

rank8_low_low_both_suffix3_a3_b3_cells_exact_20260821.json
0D3D1EA8951F355B33EE5EC0563FC06BF20BEE54652D8F50BF88E1130161452F

audit_rank8_low_low_both_suffix3_a3_b3_cells.py
B28B363776561A4577A150D45B03E6B3AC8408C694115E69C5E77A165D69C26B

rank8_low_low_both_suffix3_a3_b3_cells_independent_audit_exact_20260821.json
B0367B8755A78882FFD3090F23292B81A8A1B35DE6F37AE9C08B92E92B07BB5D

probe_rank8_low_low_full_early_suffix5_a5_b5_cell_flint.py
17B3712D2B8801A527AACA41B7F2AA5BD02B7BEB2B04FA560FF5BA2FB6B71364

verify_rank8_low_low_full_early_suffix5_a5_b5_cells.py
FEEA2BFD2E516D9BED17A7131648FFAA186629E96AF2159EAB06E306BC29793F

rank8_low_low_full_early_suffix5_a5_b5_cells_exact_20260821.json
8993846F0A260DBEF8091D3617AF8EAAACED67AD274ADA8EA9C181B45D102F7F

audit_rank8_low_low_full_early_suffix5_cells.py
746CC764CD18E35F2886F0C6708E5A7743F5EBDE1E75E91287B6D8179F1212B0

rank8_low_low_full_early_suffix5_audit_20260821.json
A4BCF6A78B23F84E7B07FAAED3C67C400111BC21F9B03D5C33ACEC92A7586AD4
```

## Scope

These are exact all-variable cone theorems on the stated faces, not numerical
value scans.  They do not yet prove the simultaneous presence of the early
core with `a3,a4,b3,b4`; that final join remains necessary before the full
low/low cone can be assembled.
