# Double-broom diagonal gap: exact Newton total `i+j=9`

Date: 2026-08-29

Status: **exact all-path-order, all-rank fixed-total theorem.**  Combined with
the frozen lower totals, this proves the connected double-broom terminal
Newton collar `i+j<=9`.

The universal four-carrier operator proof is certified for

```text
(0,9), (1,8), (2,7), (3,6), (4,5).
```

Every one of the `514` parity/weight layers has an explicit rational value
whose numerator and denominator have nonnegative coefficients in the
universal carrier exponents `m,b`, with positive denominator constant term.
The replay also exhausts all supported diagonals of the fixed `n=2,3`
terminal bases (`135` cells) and fixed `n=4,5` path-Pascal gaps (`145`
cells).  Thus the theorem is exact for every path order and rank; it is not a
finite-order extrapolation.

Replay:

```powershell
python .\prove_iso_double_broom_diagonal_gap_fixed_total_agent.py --total 9
```

```text
marker:
PASS_EXACT_ALL_PATH_ORDER_DOUBLE_BROOM_DIAGONAL_GAP_NEWTON_TOTAL_H_9

source SHA256:
FA84F3309552009ABB02B3AD3FCF6E5F0A5F484CC694D7BD412B8BF5117E6ED6

report SHA256:
C6D27AE491891D5AF828074DDA5919E8204E29B1E9EF8AC52F995FD8ECFD268D

value-stream SHA256:
DC568661606F5F11E0AB8BD92B1EE72E28D5DD75EE0FFB306061355D3B9E965C
```

This report proves only total `i+j=9`.  A uniform Lucas/power-sum recurrence
proof, or an exact obstruction at a later total, remains required.
