# Rank-seven terminal-broom `Delta3` theorem and conditional `Delta1`--`Delta2` certificates from order 25

Date: 2026-08-20

Status: **`Delta3` PROVED EXACTLY FOR EVERY ROOTED TREE CORE OF ORDER
`n>=25`; `Delta1` AND `Delta2` CERTIFIED CONDITIONAL ON ROOTED `C7` IN
ORDERS 25--38 AND UNCONDITIONAL FROM ORDER 39.**

## Theorem

For the exact rank-seven terminal-broom residual `R_t(A,q)`, every rooted
tree core `A` of order at least 25 satisfies unconditionally

```text
Delta^3 R_1(A,q)>=0.
```

The exact boxes also prove `Delta1,Delta2>=0` wherever the rooted-cross
inequality `C7(A,q)>=0` is available.  That dependency is universal from
order 39 and on the separately certified cells in orders 25--38, but the
remaining middle-band rooted-`C7` cells are still open.

## `Delta1` and `Delta2`

The certified large-order construction is rerun with the sole order-map
change `n=25/T`.  It keeps the sharp rank-`(3,4)` and rank-`(4,5)` ratio
boxes, the exact `D4`/`D5` defect intervals, the rank-six defect interval,
the literal rooted-cross lower endpoint, the path coefficient floor, and
the separate `|A-N[q]|<=17` and `>=18` root-mass cases.

Separate exact concavity in `h5`, `h6`, and `c7` remains coefficientwise
valid at this cutoff.  All sixteen rational Bernstein branches pass:

```text
Delta1: 2 root-size cases x 2 D6 endpoints x 2 h6 endpoints = 8 PASS
Delta2: 2 root-size cases x 2 D6 endpoints x 2 h6 endpoints = 8 PASS.
```

The same inventory deliberately preserves two loose boxes for `Delta0`;
they are not used in this theorem and are not hidden by its PASS status.

The lower `h6` endpoint in these sixteen branches is

```text
d=s-D6/2,
```

which is exactly the rooted-`C7` input.  A separate audit replacing it by
the universal half-retention endpoint `d=1/2` produces a negative Bernstein
coefficient already in the small-`J`, lower-`D6`, `Delta1` box.  Thus the
rooted-`C7` dependency may not be silently deleted.

## `Delta3`

For `Delta3`, the proof retains both the full `D4` interval and the full
interior `D5` interval.  Seven of the eight root/`D6` endpoint boxes pass
directly.  The only loose-box failure is

```text
lower D6, s=h5/c5=1, d=h6/c6=1/2.
```

It is impossible for a rooted tree: `s=1` means `i4(A-N[q])=0`, which
forces `i5(A-N[q])=0` and hence `d=1`.  The quantitative replacement uses

```text
5 i5(A-N[q]) <= (|A-N[q]|-4)i4(A-N[q])
               <= (n-6)i4(A-N[q]).
```

The repaired certificate still retains full `D5`.  Its cleared numerator
has degrees `(40,19,9,8,5,2)`, 1,328,400 exact rational Bernstein
coefficients, and minimum zero.

## Replay

Run

```powershell
python .\verify_rank7_terminal_broom_delta123_cutoff25.py
```

Expected marker:

```text
PASS_EXACT_RANK7_DELTA3_AND_CONDITIONAL_DELTA12_N_AT_LEAST_25
```

The assembled report is
`rank7_terminal_broom_delta123_cutoff25_exact_20260820.json`, SHA-256
`DDE9C843D0D0ED33FAE283AB4D59AAC156045301F14C9655214BAE107F4A8456`.
Every source, branch log, loose-box record, concavity replay, and repair log
is hashed inside it.

## Scope

Together with the separate `Delta4`--`Delta6` cutoff-25 theorem and the
universal high-Newton theorem, the unconditional middle-band obligations
are now `Delta0`, `Delta1`, `Delta2`, with the latter two already reduced to
the precise remaining rooted-`C7` cells.  This theorem does not claim the
connected-tree `Q7` reserve or the final forest theorem.
