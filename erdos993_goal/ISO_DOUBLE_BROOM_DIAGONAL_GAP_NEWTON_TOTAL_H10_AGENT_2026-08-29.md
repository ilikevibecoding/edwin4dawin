# Double-broom diagonal gap: exact Newton total `i+j=10`

Date: 2026-08-29

Status: **exact all-path-order, all-rank fixed-total theorem.**  With the
frozen lower totals, the connected double-broom terminal Newton collar is now
proved through `i+j<=10`.

The fixed-total replay verifies the universal four-carrier identity and every
diagonal carrier-monomial layer for

```text
(0,10), (1,9), (2,8), (3,7), (4,6), (5,5).
```

All `664` normalized parity/weight certificates have numerators and
denominators with nonnegative coefficients in the universal carrier
exponents, and positive denominator constant terms.  The replay exhausts the
fixed `n=2,3` terminal bases (`174` cells) and `n=4,5` gaps (`186` cells) on
their full support.

```powershell
python .\prove_iso_double_broom_diagonal_gap_fixed_total_agent.py --total 10
```

```text
marker:
PASS_EXACT_ALL_PATH_ORDER_DOUBLE_BROOM_DIAGONAL_GAP_NEWTON_TOTAL_H_10

source SHA256:
FA84F3309552009ABB02B3AD3FCF6E5F0A5F484CC694D7BD412B8BF5117E6ED6

report SHA256:
E40291EF4DA81CF5A4DAB4910E263145A888CF328C0027CC07D30BEC3897F867

value-stream SHA256:
C1BBED0C486BD69F53A22E07F1A55CB2D22EFDCC4CE21E02840E0B9D03C10A30
```

This is an exact fixed-total theorem only; no untested total is promoted.
