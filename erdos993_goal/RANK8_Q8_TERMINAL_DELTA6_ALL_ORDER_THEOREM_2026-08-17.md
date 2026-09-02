# Rank-eight terminal-broom `Delta^6` all-order theorem

Date: 2026-08-17

Status: **PROVED FOR EVERY ROOTED TREE CORE.**  The exact analytic certificate
starts at order 18 and an exact WROM census closes orders 1 through 17.  This
proves one Newton coefficient, not the complete terminal residual or `Q8`.

## Theorem

For the rank-eight terminal-broom residual `R_t` attached to every rooted tree
core `A`,

```text
Delta^6 R_1 >= 0.
```

Consequently every coefficient `Delta^6` through `Delta^15` is now proved
all-order.

## Root-capacity reduction

Write `c_j=i_j(A)` and `h_j=i_j(A-q)`.  The independent root box is invalid:
at its unrealizable corner `h6=0,h7=c7`,

```text
Delta^6 R_1=-126c7^3(n+1)<0.
```

Retain the exact extension capacity and parameterize

```text
7h7 <= (n-7)h6,
h6=S c6,
h7=E(n-7)S c6/7,       0<=S,E<=1.
```

The exact `E` curvature is

```text
-36S^2c6^2c7(n-7)^2(n+1)/7 <= 0.
```

The `S` curvature is `-2c6^2c7 G/7`.  Substituting the sharp path-minimal
bound `c3>=C(n-2,3)`, the three degree-two Bernstein coefficients of `G` in
`E` are

```text
28(6n^3-35n^2+101n-106),
(208n^3-937n^2+4510n-4137)/2,
58n^3-191n^2+2312n-287.
```

After `n=m+8`, every power coefficient of all three polynomials is positive.
Thus the capacity expression is separately concave for `n>=8`, and the only
nonzero root endpoints are `S=1`, `E in {0,1}`.

At either endpoint it decreases in `c8`; extension counting sends

```text
c8=(n-7)c7/8.
```

The resulting `c7` curvature is

```text
-8c6(192c3+10n^3+476n^2-35n+1495)<0.
```

The rank-six defect interval therefore reduces to

```text
c7=(12c6^2/c5-kc6)/14,       k in {1,7}.
```

The `k=7` endpoint is guaranteed nonnegative from `n>=18`, making 18 the
smallest cutoff certified by this four-branch relaxed-cone reduction.

## Preserved shortcut obstruction

The next `D5` endpoint shortcut is false.  At the feasible path `P18` jet

```text
(c3,c4,c5,c6)=(560,1365,2002,1716),
```

on branch `(E,k)=(0,1)`, exact differentiation gives

```text
-d^2/dc6^2 Delta^6 = -11496615135896/343 < 0.
```

Hence the branch is locally convex there.  This is a counterexample to the
concavity method, not to `Delta^6>=0`; the certificate below retains the full
interior `D5` interval.

## Exact analytic certificate for `n>=18`

Normalize `c3=1` and map the complete remaining `D4,D5` cone to `[0,1]^5`
with coordinates `(T,W,A,U,V)`, using `n=18/T`, the sharp tree ratio
intervals, the full `D4` interval, and

```text
(2+x5)/12 <= D5 <= 1/6+x5/2.
```

For each `(E,k) in {0,1} x {1,7}`, exact denominator clearing produces a
Bernstein tensor of degrees

```text
(45,20,9,8,5)
```

with 521,640 coefficients.  Every coefficient is nonnegative without
subdivision; every exact minimum is zero at index `(0,0,0,0,0)`.  Thus the
analytic certificate checks 2,086,560 exact rational coefficients.  All
source and cube-map denominators are positive at actual points `n>=18`; the
reported zero boundary corresponds only to the excluded limit `T=0`.

## Exact finite complement

The finite checker streams every canonical WROM free tree of orders 1 through
17 and checks every possible root.  Exact rooted-tree dynamic programming
computes the required independence coefficients through degree nine.  The
checker evaluates `R_t` at `t=1,...,7` and takes six forward differences.

```text
free trees:          81,137
rooted cores:     1,324,073
active roots:     1,321,301
negative values:          0
```

Every active value is strictly positive; the smallest is `14,634,504` at
order eight.  Full per-order minima appear in
`rank8_terminal_delta6_finite_n1_n17_exact_20260817.json`.

## Replay and scope

Run

```powershell
python .\replay_rank8_q8_terminal_delta6_all_order.py
```

Expected marker:

```text
RANK8_Q8_TERMINAL_DELTA6_ALL_ORDER_REPLAY_PASS
```

Use `--rebuild-analytic` to recompute all four Bernstein tensors rather than
validate their exact reports and hashes.

This theorem does not prove `Delta^0` through `Delta^5`, the full residual, or
the all-tree `Q8` theorem.  The standalone `Q8` target range remains
`alpha>=14`.
