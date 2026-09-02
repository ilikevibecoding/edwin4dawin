# Rank-eight terminal-broom `Delta^7` all-order theorem

Date: 2026-08-17

Status: **PROVED FOR EVERY ROOTED TREE CORE.**  The analytic certificate now
starts at order 18, and an exact WROM census closes orders 1 through 17.  This
proves one Newton coefficient, not the complete terminal residual or the
all-tree `Q8` theorem.

## Theorem

For the exact rank-eight terminal-broom residual `R_t` attached to every
rooted tree core `A`,

```text
Delta^7 R_1 >= 0.
```

Together with the previous coefficient packages, every coefficient
`Delta^7` through `Delta^15` is now proved all-order.

## Sharp analytic cutoff for the capacity reduction

Write `c_j=i_j(A)` and `h_j=i_j(A-q)`.  The exact capacity reduction gives

```text
7h7 <= (n-7)h6,
h6=S c6,
h7=E(n-7)S c6/7,
```

and reduces the root variables to `S=1`, `E in {0,1}`.  Monotonicity in `c8`
and concavity in `c7` then give

```text
c8=(n-7)c7/8,
c7=(12c6^2/c5-kc6)/14,       k in {1,7}.
```

The `k=7` endpoint is guaranteed nonnegative precisely from the available
selected-degree bound at `n>=18`:

```text
6c6/c5 >= n-15+10/n >= 7/2.
```

Thus order 18 is the smallest cutoff certified by this exact four-branch
relaxed-cone reduction.  Nothing below 18 is inferred from a formally
infeasible negative endpoint; the entire lower range is checked directly.

## Exact full-`D5` certificate for `n>=18`

Normalize `c3=1`.  The sharp tree ratios and the proved `D4,D5` defect cone
are mapped to `[0,1]^5` by

```text
n=18/T,
w=w_low+(w_high-w_low)W,
x=x_low+(x_high-x_low)A,
D4=(2+x)/10+(1559/3575-(2+x)/10)U,
D5=(2+x5)/12+(1/6+x5/2-(2+x5)/12)V.
```

Both `D4` and the complete interior `D5` interval remain live.  This is
essential: the feasible path `P18` disproves the tempting `D5`-concavity
shortcut on one branch, although it is not a counterexample to `Delta^7`.

For each `(E,k) in {0,1} x {1,7}`, exact rational clearing produces a
Bernstein tensor of degrees

```text
(44,20,9,8,5)
```

with 510,300 coefficients.  Every coefficient is nonnegative on the unsplit
cube, and every branch has exact minimum zero at index `(0,0,0,0,0)`.  The
large-order certificate therefore checks 2,041,200 exact coefficients with
no tolerance and no subdivision.

The source denominators are positive constants times

```text
x^11(n-2)^2(n-1)^2,
```

and all cube-map denominators are positive at actual points `n>=18`; the
zero at `T=0` is only the excluded infinite-order boundary.

## Exact finite complement `1<=n<=17`

The finite checker streams the canonical WROM free-tree generator, asserts
the classical number of free trees at every order, and checks every possible
root vertex.  A rooted-tree dynamic program computes the independence
polynomials of `A` and `A-q` through degree nine using exact `i128`
arithmetic.  It evaluates the exact residual at `t=1,...,8` and takes seven
successive forward differences, yielding `Delta^7 R_1` directly.

The exhaustive totals are

```text
free trees:          81,137
rooted cores:     1,324,073
active roots:     1,321,301
negative values:          0
```

Here an active root has `c7>0` and `h6>0`.  Inactive cases give the expected
zero.  Every active value is strictly positive; the smallest is

```text
27,685,704
```

at order eight.  The per-order minima and counts are recorded in
`rank8_terminal_delta7_finite_n1_n17_exact_20260817.json`.

## Replay

The all-order replay checks the capacity reduction, all four order-18 branch
reports and hashes, recompiles and reruns the complete WROM census, and checks
the combined manifest:

```powershell
python .\replay_rank8_q8_terminal_delta7_all_order.py
```

Expected final marker:

```text
RANK8_Q8_TERMINAL_DELTA7_ALL_ORDER_REPLAY_PASS
```

To recompute all four analytic Bernstein tensors as well, use

```powershell
python .\replay_rank8_q8_terminal_delta7_all_order.py --rebuild-analytic
```

The combined artifact inventory is
`rank8_q8_terminal_delta7_all_order_manifest_20260817.json`.

## Scope guard

The proved statement is exactly

```text
Delta^7 R_1>=0 for every rooted tree core.
```

It does not prove `Delta^0` through `Delta^6`, the whole residual, or `Q8`.
The standalone `Q8` candidate range remains `alpha>=14`; the Problem #993
rank-eight prefix begins at `alpha(G)>=13` and still requires the established
coupled boundary treatment at `alpha=13,14`.
