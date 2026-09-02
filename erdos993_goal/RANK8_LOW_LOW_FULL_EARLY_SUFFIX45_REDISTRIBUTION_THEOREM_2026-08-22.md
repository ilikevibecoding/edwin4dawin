# Rank-eight low/low full-early suffix-4/5 redistribution theorem

## Result

All four pending low/low Bernstein auxiliaries are nonnegative for

```text
h,ta,tb,a0,a2,a4,a5,a6,a7,b0,b2,b4,b5,b6,b7 >= 0,
```

with `a3=b3=0`.  This closes the simultaneous suffix-4/suffix-5 join over
the full early core.  It is an exact all-variable cone theorem, not a scan of
numeric parameter values.

## Quadratic redistribution reduction

Set

```text
U=a4+a5,  a4=(1-x)U,  a5=xU,  0<=x<=1,
W=b4+b5,  b4=(1-y)W,  b5=yW,  0<=y<=1.
```

At fixed `U,W`, cumulative ratios 0 through 4 see the whole corresponding
total, while ratio 5 alone sees `xU` or `yW`.  Each factor-row coefficient is
therefore affine in its own redistribution coordinate.  The margin,
derivative, curvature, and strong auxiliaries consequently have bidegree at
most `(2,2)` in `(x,y)`.

For a quadratic in power basis, twice its three Bernstein coefficients are
obtained with the integer weight rows

```text
(2,0,0),  (2,1,0),  (2,2,2).
```

The tensor transform therefore returns four times each bivariate Bernstein
coefficient.  Its `(0,0)` corner is four times the sealed suffix-4 face, and
its `(2,2)` corner is four times the sealed suffix-5 face.  The exact verifier
checks the remaining seven tensor positions:

```text
(0,1), (0,2), (1,0), (1,1), (1,2), (2,0), (2,1).
```

The same directional AM-GM masks used on both coordinate faces depend only on
the totals `U,W`, not on `x,y`.  Every tensor row therefore subtracts exactly
four times the corresponding nonnegative payment.  The independent symbolic
audit verifies the bidegree, Bernstein reconstruction, and payment scaling.

## Complete coefficient grid

A suffix-4/5 total occurs in at most six ratios.  Curvature has total-slack
support at most `(12,12)`, and the additional left capacity ratio raises only
the strong left bound to 13.  The complete common grid is consequently

```text
0<=deg(U)<=13,  0<=deg(W)<=12.
```

An independent support audit also checks every selected payment mask and
confirms that no payment exceeds these bounds.  Across the 181 non-origin
cells, the seven new Bernstein positions contain

```text
curvature middle    101,364,984   minimum 16
curvature far       101,317,459   minimum  4
strong middle       195,049,603   minimum 16
strong far          195,030,713   minimum  4
total               592,762,759
negative                      0
```

The origin is supplied by either immutable coordinate-face theorem, since the
redistribution coordinates disappear when `U=W=0`.  The independent final
audit verifies all 182 cell keys, all seven position keys in every cell, every
row invariant, all aggregates and extrema, the origin reference, the two
corner hashes, the identity/support audits, and byte-for-byte equality between
the checkpoint rows and final report rows.

## Sealed artifacts

```text
probe_rank8_low_low_full_early_suffix45_redistribution_bernstein_cell.py
54631D4D2721F9208DC42C5BB1024FA7E6D199DEC5CF0FD52D173837BFC23159

verify_rank8_low_low_suffix45_redistribution_identity.py
FC954DCB651571B845274DFEE67FBF9B5D787B73652A6017FC23B07487C1F3A5

rank8_low_low_suffix45_redistribution_identity_exact_20260822.json
DC5AC4905E04E14B4D628F90AD238809D4B58943A40404183FCCCD8366D4ECDD

audit_rank8_low_low_suffix45_redistribution_support.py
61E663284E68AC03493A8586F6CA9B4DCB2D54F25B45DC25EB727DB2D9825D50

rank8_low_low_suffix45_redistribution_support_audit_20260822.json
21A8442A699F9A5CAC95F95D64DB330A09B6CE7BD31F4E3FE865D2AF7222B38E

verify_rank8_low_low_full_early_suffix45_redistribution_cells.py
16C323A355CDA03BF5466694897FF6036DDE1D1AD2DF5DC2913A873C9A53FE45

rank8_low_low_full_early_suffix45_redistribution_exact_20260822.json
846145E70AD06754450951C233E92C249770BBBCD02A1061C8AD78A122E13183

audit_rank8_low_low_full_early_suffix45_redistribution.py
A1BF5852F0CDE4D736D03E3E3A4ADB73AB052A40DCA5345C7D4F4C38267044B6

rank8_low_low_full_early_suffix45_redistribution_audit_20260822.json
784C9F6343FC4058E4A60BF5BD5742B5A1A67766A7CC1EF926BC5FCA58684ABE
```

## Remaining low/low join

The only remaining adjusted-gap slack in the low/low cone is suffix index 3.
It must be joined to this theorem; the separate suffix-only theorem does not by
itself prove the mixed full-early/suffix-3 coefficients.
