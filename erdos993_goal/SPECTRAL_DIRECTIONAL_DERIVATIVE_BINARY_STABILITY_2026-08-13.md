# Spectral directional derivatives of diagonal gamma slices are stable

## 1. All-order lemma

Let

```text
P_lambda(z)=product_(i=1)^m (1+lambda_i z),
lambda_i>0,
```

and let `delta_i>=0`.  Write `D_delta` for the directional derivative in
the spectral variables.  Then

```text
D_delta{P_lambda(z)P_lambda(w)}
 =P_lambda(z)P_lambda(w){L(z)+L(w)},                (1)

L(z)=sum_i delta_i z/(1+lambda_i z).               (2)
```

Every map `z/(1+lambda_i z)` sends the open upper half-plane into itself,
since

```text
Im{z/(1+lambda_i z)}=Im(z)/|1+lambda_i z|^2>0.
```

Consequently `L(z)+L(w)` cannot vanish when both `z,w` lie in the upper
half-plane.  Formula (1) is therefore a stable bivariate polynomial.  More
strongly, for every `a>=0`,

```text
P_lambda(z)P_lambda(w)+aD_delta{P_lambda(z)P_lambda(w)}
 =P_lambda(z)P_lambda(w){1+aL(z)+aL(w)}             (3)
```

is stable by the same imaginary-part argument.

Homogeneous-component extraction preserves real stability for polynomials
with nonnegative coefficients.  Hence the fixed-total-degree binary forms

```text
A_s(z,w)=[total degree s]P_lambda(z)P_lambda(w),
B_s(z,w)=[total degree s]D_delta{P_lambda(z)P_lambda(w)}
```

and every pencil `A_s+aB_s`, `a>=0`, are stable.

Both forms are symmetric in `z,w`.  Dehomogenization at `w=1` therefore
gives palindromic polynomials with only nonpositive real roots.  Reciprocal
pairing under

```text
t=z/(1+z)^2
```

shows that their gamma polynomials are negative-rooted.  Thus:

> For every positive spectrum and every nonnegative spectral direction, the
> gamma polynomial of the fixed-grade directional derivative is
> negative-rooted and positively compatible with the original diagonal
> gamma slice.

This is an all-order stability proof, not a finite inference.

## 2. Application to the endpoint parameter

Let `C_m=tridiag(1,2,1)` and scale one endpoint by

```text
D_c=diag(1,...,1,sqrt(c)),       c>0.
```

The endpoint determinant is the characteristic determinant of
`J_c=D_c C_m D_c`.  It has the same nonzero spectrum as

```text
C_m^(1/2)D_c^2C_m^(1/2)
 =C_m+(c-1)aa^T,
a=C_m^(1/2)e_m.                                  (4)
```

This is an affine positive-semidefinite rank-one motion.  By the
Hellmann--Feynman formula, every spectral velocity is nonnegative.  The same
representation holds for the opposite-endpoint principal-minor block.

For the endpoint notation

```text
A_c=C+cV,       B_c=D+cW,
K_c=J_s(A_c,A_c)+uJ_s(B_c,B_c),
```

the lemma proves separately that

```text
partial_c J_s(A_c,A_c),
partial_c J_s(B_c,B_c)                             (5)
```

are negative-rooted in all orders.  It also proves positive compatibility
of each derivative in (5) with its own diagonal block.

Since

```text
(1/2)partial_c K_c=F+cG,
```

the only derivative issue left is cross-block compatibility: prove that the
two polynomials in (5), one from the full Jacobi matrix and one from its
opposite principal minor, have a common interlacer after the fixed positive
weight `u` is applied.  In the six-leaf vertical decomposition, this removes
all within-block stability questions and isolates the principal-minor cross.

The lemma does not claim that the roots of `K_c` are monotone without the
forest reserve.  That stronger statement has the exact out-of-cone failure
recorded in `ENDPOINT_RAYS_FOREST_LOW_LAYERS_THEOREM_2026-08-13.md`.

## 3. Replay

`prove_spectral_directional_derivative_binary_stability.py` verifies 2,860
directional coefficient identities, 2,860 derivative gamma root systems,
and 8,580 positive base/derivative pencils over rational spectra and
directions.  It writes
`spectral_directional_derivative_binary_stability_exact_20260813.json` and
reports `PASS_EXACT_SPECTRAL_DIRECTIONAL_DERIVATIVE_STABILITY_REPLAY`.
The replay checks transcription; equations (1)--(5) are the all-order proof.
