# Rank-eight terminal-broom `Delta^7` theorem from order 39

Date: 2026-08-17

Status: **PROVED FOR EVERY ROOTED TREE CORE OF ORDER `n>=39`.**  This
closes the large-order `Delta^7` coefficient while retaining the full
interior `D5` variable.  It does not cover core orders below 39, prove the
entire terminal residual, or prove the all-tree `Q8` theorem.

## Theorem

For the exact rank-eight terminal-broom residual `R_t` attached to any rooted
tree core `A` of order `n>=39`,

```text
Delta^7 R_1 >= 0.
```

Together with the previous `Delta^8` theorem and the earlier high-coefficient
package, every coefficient `Delta^7` through `Delta^15` is now proved for
`n>=39`.

## Dependency and counterexample audit

Write `c_j=i_j(A)`, `h_j=i_j(A-q)`.  The proof uses only the following
previously established inputs.

1. The exact Newton-coefficient identity produced by
   `verify_rank8_q8_terminal_reduction.py`.
2. The extension capacity

   ```text
   7h7 <= (n-7)h6
   ```

   and the ordinary extension ceiling `8c8<=(n-7)c7`.
3. The proved rank-six defect interval for `c7`.
4. The exact rank-seven large-order coefficient cone

   ```text
   3/(n-3) <= w=c2/c3 <= 3(n-1)/((n-3)(n-4)),
   8w/(6-w) <= x=c3/c4 <= 4w/(3(1-w)),

   (2+x)/10 <= D4 <= 1559/3575,
   (2+x5)/12 <= D5 <= 1/6+x5/2,
   ```

   valid here for `n>=39`, where `x5=c4/c5`.

No independent box for `(h6,h7)` is used.  That box contains the unrealizable
negative corner `h6=0,h7=c7`, where the coefficient is `-126c7^3`.

No `D5` concavity is used.  The path `P18` is an exact feasible obstruction to
that shortcut: on the branch `(E,k)=(0,1)`,

```text
-d^2/dc6^2 Delta^7 = -112776889827360/2401 < 0.
```

This is a counterexample to the proposed concavity reduction, not to
`Delta^7>=0` or `Q8`.

## Exact endpoint reduction

Parameterize the capacity triangle by

```text
h6=S c6,
h7=E(n-7)S c6/7,       0<=S,E<=1.
```

The exact capacity-reduction replay proves separate concavity in `S` and `E`.
The zero `S=0` edge and endpoint reductions leave only

```text
(S,E)=(1,0),(1,1).
```

At either endpoint the coefficient decreases in `c8`, so set

```text
c8=(n-7)c7/8.
```

The result is concave in `c7`, with curvature

```text
d^2/dc7^2 Delta^7=-32c6(49n^2+246n+561)<0.
```

The rank-six defect interval therefore leaves its two endpoints

```text
c7=(12c6^2/c5-kc6)/14,       k in {1,7}.
```

The `k=7` endpoint is nonnegative for `n>=18`, hence throughout the theorem
range.  There are exactly four remaining branches `(E,k)`.

## Full-interior `D5` certificate

Normalize `c3=1` and map the complete remaining cone to the unit cube by

```text
n=39/T,
w=w_low+(w_high-w_low)W,
x=x_low+(x_high-x_low)A,
D4=(2+x)/10+(1559/3575-(2+x)/10)U,
D5=(2+x5)/12+(1/6+x5/2-(2+x5)/12)V.
```

Thus `(T,W,A,U,V)` lies in `[0,1]^5`.  In particular, both `D4` and the full
interior `D5` interval remain live; neither is replaced by an unjustified
endpoint argument.

For every branch `(E,k) in {0,1} x {1,7}`, exact rational denominator
clearing gives a numerator tensor of Bernstein degrees

```text
(44,20,9,8,5),
```

containing 510,300 coefficients.  All coefficients are nonnegative on the
unsplit cube.  The exact minimum is zero at index `(0,0,0,0,0)` in every
branch.  Hence all four branch numerators are nonnegative.  In total the
certificate checks 2,041,200 exact rational coefficients, with no numerical
tolerance and no subdivision.

Before the cube map, the four source denominators factor as positive constants
times

```text
x^11 (n-2)^2 (n-1)^2.
```

The cube-map denominators are also strictly positive at every actual point
`n>=39`; the only zero Bernstein boundary is the excluded limit `T=0`
(`n=infinity`).  Thus denominator clearing does not hide a sign reversal.

## Replay and artifacts

The compact replay validates the capacity reduction, source/report hashes,
all four branch keys, degree shapes, coefficient counts, and exact minima:

```powershell
python .\replay_rank8_q8_terminal_delta7_large.py
```

Its final marker is

```text
RANK8_Q8_TERMINAL_DELTA7_LARGE_REPLAY_PASS
```

To recompute all 2,041,200 Bernstein coefficients rather than validate the
stored exact reports, run

```powershell
python .\replay_rank8_q8_terminal_delta7_large.py --rebuild
```

The four branch reports and their expected hashes are recorded in
`rank8_q8_terminal_delta7_d5_branches_exact_20260817.json`.

## Scope guard

This package proves one coefficient theorem:

```text
Delta^7 R_1>=0 for rooted tree cores of order n>=39.
```

It does not certify `n<39`, does not by itself prove the lower coefficients
`Delta^0` through `Delta^6`, and does not turn the rank-eight prefix range
`alpha>=13` into a proved `Q8` theorem.  For the standalone `Q8` target the
relevant alpha range remains `alpha>=14`.
