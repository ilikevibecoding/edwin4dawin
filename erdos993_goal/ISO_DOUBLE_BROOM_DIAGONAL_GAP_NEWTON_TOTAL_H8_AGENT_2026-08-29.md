# Double-broom diagonal gap: exact Newton total `i+j=8`

Date: 2026-08-29

Status: **exact all-path-order, all-rank fixed-total theorem.**  Together with
the frozen lower collars, this proves the connected double-broom terminal
Newton collar `i+j<=8`.

The exact four-carrier decomposition and universal diagonal calculus from
the `h<=5` note apply to all unordered pairs

```text
(0,8), (1,7), (2,6), (3,5), (4,4).
```

All `474` parity/weight operator layers reduce, after division by the positive
central binomial coefficient, to rational functions whose numerators and
denominators have nonnegative coefficients in the carrier exponents `m,b`;
the denominators have positive constant term.  The fixed `n=2,3` terminal
bases (`125` cells) and fixed `n=4,5` gaps (`135` cells) are exhausted on
their full polynomial support.  Hence the result holds for every path order
and rank, not by finite extrapolation.

Replay:

```powershell
python .\prove_iso_double_broom_diagonal_gap_fixed_total_agent.py --total 8
```

```text
marker:
PASS_EXACT_ALL_PATH_ORDER_DOUBLE_BROOM_DIAGONAL_GAP_NEWTON_TOTAL_H_8

source SHA256:
FA84F3309552009ABB02B3AD3FCF6E5F0A5F484CC694D7BD412B8BF5117E6ED6

report SHA256:
6AECB017782077390A6651896585A58846A2177AEA449C456CC9D6FF6648FB4D

value-stream SHA256:
5B77084EA566BDD18FFA5D882C572B5E1735125853E8FD09E5FBFB3974DAA2B4
```

This report proves only total `i+j=8`; a uniform all-total proof remains open.
