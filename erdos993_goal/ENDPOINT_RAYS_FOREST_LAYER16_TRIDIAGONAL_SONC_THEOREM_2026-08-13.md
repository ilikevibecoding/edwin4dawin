# Endpoint tridiagonal SONC certificate extends through layer sixteen

Date: 2026-08-13

## Exact fixed-layer theorem

Retain the endpoint rays `F,G` of Section 105.  At

```text
s=16,       N=37+q,       q,c,u>=0,
```

the full-even-block tridiagonal construction of
`ENDPOINT_DISCRIMINANT_TRIDIAGONAL_SONC_REDUCTION_2026-08-13.md`
certifies the discriminant of `F+cG` as nonnegative, and strictly positive
in the parameter interior.

The direct exact FLINT replay gives a degree-eight pencil discriminant with
34,875 nonzero coefficients.  Its 5,182 negative coefficients occur only in
the consecutive odd blocks

```text
c^9, c^11, c^13.
```

Use the adjacent full even blocks `c^8,c^10,c^12,c^14` as the diagonal
polynomials `A_0,A_1,A_2,A_3`, and the negatives of the three odd blocks as
`N_0,N_1,N_2`.  For

```text
K_(-1)=1,
K_0=A_0,
K_j=A_j K_(j-1) - (N_(j-1)^2/4) K_(j-2),
```

the exact nonpositive-coefficient counts of `K_0,K_1,K_2,K_3` are

```text
0, 0, 0, 0.
```

Every nonzero coefficient of every leading continuant is therefore strictly
positive.  Sylvester's criterion makes the tridiagonal Gram matrix positive
definite for `q,u>0`; coefficientwise limits cover its nonnegative boundary.

Combined with the previously proved positivity of the `E+cF` discriminant at
fixed layers only when separately checked, this note closes the new
`F+cG` tridiagonal obstruction at layer sixteen.  It does **not** assert a
new all-order endpoint theorem by itself.

## Structural conclusion and remaining gap

The computation supports the continuant as a robust Gram certificate, but
does not turn it into a subdiscriminant identity.  The matrix `Q` is assembled
from signed `c`-coefficient blocks of one scalar discriminant.  Without an
explicit congruence from `Q` to a Bezout, Hermite, Jacobi, or subresultant
matrix, positivity of the scalar discriminant does not imply positivity of
the leading continuants.  Thus the recurrence remains a sufficient
certificate whose coefficientwise positivity still needs an all-`s`
identity or induction.

There is no counterexample at `s=16`; the first possible failure is `s>=17`.

## Exact replay

Run

```text
python probe_endpoint_rays_forest_s16plus_tridiagonal_sonc.py --start 16 --stop 16
```

The script constructs the path rows and gamma transform directly in
`QQ[t,c,q,u]`, computes the discriminant exactly, audits its signed blocks,
and computes every continuant in `QQ[q,u]`.  Its recorded mathematical output
is in `endpoint_rays_forest_s16_tridiagonal_sonc_exact_20260813.json`.

This is an exact finite theorem at `s=16`, not an inference about uncomputed
orders.
