# Positive spectral directions preserve the diagonal gamma slice

Date: 2026-08-13

## Theorem

Let

```text
P_lambda(z)=product_(i=1)^n (1+lambda_i z),
lambda_i>0,
```

and let `A_s(z,w)` be the total-degree-`s` homogeneous part of
`P_lambda(z)P_lambda(w)`.  Write its palindromic gamma expansion as

```text
A_s(z,w)=sum_k g_k (zw)^k(z+w)^(s-2k),
G_s(t)=sum_k g_k t^k.                                  (1)
```

For every vector `delta=(delta_1,...,delta_n)` with `delta_i>=0`, put
`D_delta=sum_i delta_i partial_(lambda_i)`.  Then

```text
G_s+c D_delta G_s
```

is negative-rooted for every `c>=0`.  More generally, for any two
nonnegative directions `delta,eta`, every positive pencil

```text
D_delta G_s+c D_eta G_s,       c>=0,                  (2)
```

is negative-rooted.  Thus all positive spectral directional derivatives of
one diagonal slice form a compatible family.

## Proof

Put

```text
F(z,w)=P_lambda(z)P_lambda(w),
L_delta(z)=sum_i delta_i z/(1+lambda_i z).             (3)
```

If `Im z>0`, each fractional-linear map

```text
z -> z/(1+lambda_i z)
```

maps the open upper half-plane into itself.  Hence `L_delta(z)` is either
zero (when `delta=0`) or has positive imaginary part.  Direct
differentiation gives

```text
D_delta F=F{L_delta(z)+L_delta(w)}.                    (4)
```

The product `F` is stable.  When `z,w` lie in the open upper half-plane,
the brace in (4) also has positive imaginary part, so `D_delta F` is stable.
Likewise

```text
F+cD_delta F=F{1+cL_delta(z)+cL_delta(w)}              (5)
```

is stable, and

```text
D_delta F+cD_eta F=D_(delta+c eta)F                    (6)
```

is stable.  Every polynomial in (4)--(6) has nonnegative coefficients.
The nonnegative homogeneous-component theorem for real stable polynomials
therefore shows that each fixed total-degree component is stable.  Since
homogeneous extraction and `D_delta` commute, these components are exactly

```text
D_delta A_s,
A_s+cD_delta A_s,
D_delta A_s+cD_eta A_s.                               (7)
```

Each polynomial in (7) is symmetric in `z,w`.  Its dehomogenization is a
palindromic polynomial with only nonpositive real roots.  Reciprocal roots
pair under `t=z/(1+z)^2`; therefore its gamma polynomial has only
nonpositive real roots.  Applying this linear gamma transform to (7) gives
the theorem.  Endpoint zeros and degree drops follow by continuity.

## Consequence for the endpoint/Jacobi route

For the endpoint family used here, the Jacobi matrix has the congruence form
`J_c=D_c J D_c`, where `D_c` scales one endpoint coordinate by `sqrt(c)`.
It has the same eigenvalues as

```text
J^(1/2)D_c^2J^(1/2)=J+(c-1)J^(1/2)ee^T J^(1/2),
```

an affine positive-semidefinite rank-one perturbation.  Its ordered
eigenvalues therefore have nonnegative derivatives (Hellmann--Feynman at
simple spectra and continuity at collisions).  The theorem proves, in all
orders, that the parameter derivative of each *individual* diagonal
endpoint block is negative-rooted and compatible with that block.  In the
notation of the endpoint reduction, the only remaining issue in

```text
K_c=J_s(A_c,A_c)+uJ_s(B_c,B_c)
```

is compatibility across the two nested blocks after their derivatives are
added.  Individual-block root motion is no longer an assumption or finite
observation.

## Replay

`verify_spectral_directional_derivative_stability.py` checks the algebraic
identity (4), homogeneous/gamma differentiation, and exact real-rootedness
and positive-pencil instances over a rational test family.  The replay is
supporting evidence; the proof above is all-order.
