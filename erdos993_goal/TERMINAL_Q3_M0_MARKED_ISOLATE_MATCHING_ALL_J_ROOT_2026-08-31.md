# Terminal `q3` Newton `m=0`: matching remainder, all targets

Date: 2026-08-31

Let the marked root be isolated, let the terminal leaf be mandatory, and let
the no-isolate remainder be `R=h K2`.  For every supported `h>=j>=3`, the
Newton coefficient of degree `m=0` is strictly positive.

The matching rows are

```text
f_k=2^k C(h,k),
z_k=h 2^(k-2) C(h-1,k-2).
```

After substitution into the exact retained-row terminal coefficient and
division by `b=f_j>0`, exact simplification gives

```text
Delta/b = 2h^3(h-1)(j-2) K(h,j) / [3(h-j+1)],

K=4h^4+2h^3j+10h^3+12h^2j+26h^2
  -5hj+23h+3j+3.
```

Set `h=j+x` and `j=3+y`.  The resulting `K` has 15 strictly positive
monomial coefficients in `(x,y)`, with minimum coefficient `4`.  Every other
factor is positive on the supported cone.  This is an all-order factorization,
not a finite extrapolation.

Replay:

```powershell
python .\prove_terminal_q3_m0_marked_isolate_matching_all_j_root.py
```

Required marker:

```text
PASS_EXACT_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_MATCHING_ROOT
```

The verifier also directly checks all 44,551 literal cells with `h<=300` as
an implementation guard.  Nonmatching remainders at `j>=4`, nonisolated
marked roots, the complete terminal payment, and Erdős Problem #993 remain
outside this theorem.
