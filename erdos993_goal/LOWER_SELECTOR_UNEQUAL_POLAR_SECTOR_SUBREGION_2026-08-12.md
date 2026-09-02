# Unequal polar identity and candidate lower low-depth region

Date: 2026-08-12

**Correction (2026-08-13):** the exact polar identity and parameter cutoff
below remain valid, but the claimed sector proof used Laguerre's theorem with
the polar points inside the same half-plane as the base roots.  Preservation
requires the polar points outside that circular region.  The exact special-
Meixner counterexample is in
`ONE_POLAR_STRIP_LAGUERRE_DOMAIN_AUDIT_AND_SECOND_POLAR_COUNTEREXAMPLE_2026-08-13.md`.
Accordingly this file is a reduction/candidate subregion, not an all-order
proof of its first Durán margin.

## Candidate theorem and exact parameter reduction

Let `q_D` be the corrected lower-selector Durán coefficient polynomial after
removing its forced source zero.  Use

```text
d>=5, 0<=r<=d-5, N=d+r, r<s<=N+r,
a=max(0,s-N+1), P=d+s, p=P-2a,
m=deg Gamma_hat, n=floor(p/2), beta=(p mod 2)-1/2,
x=n-m+1, A=x(x+beta), B=P-a-m+1.
```

Assume the already-proved selector root pattern: the source has two roots
above one and `m-2` negative roots.  The former argument attempted to prove
the first Durán margin whenever

```text
                         sqrt(A)>m-1.                 (1)
```

Except for the separately direct terminal cell `(d,r,s)=(5,0,5)`, condition
(1) is exactly the following explicit lower-row range:

```text
s<=d-5; or
d even and s=d-3; or
d odd  and s=d-4.                                    (2)
```

Thus (2) is the exact candidate low-depth region for a replacement analytic
argument.  It is not removed from the first-margin problem by the invalid
polar-preservation step.  Its complement is still an unbounded high-depth
wedge, not a finite exceptional strip.

## 1. Unequal outliers are two polar derivatives

For a base parameter `B>0`, define the normalized Pochhammer transform

```text
P_B[sum c_j q^j](z)=sum c_j (z)_j^fall/(B)_j^rise
```

and put

```text
M_m(d;z)=P_B[(4q-d)^m](z).
```

The half-angle theorem proved for `M_m` says that, for

```text
z=rho exp(2 i psi), 0<psi<pi/2, rho>m-1,
```

every `d`-zero of `M_m(d;z)` lies in

```text
Im(exp(-i psi)d)>0.                                  (3)
```

The original proof needs only `B>0` and `rho>m-1`: the Jacobi parameter is
`rho-m>-1`, and the two no-crossing margins are

```text
B(rho-D)+2D rho>0,
rho{B(rho-D)+3D rho+rho^2}>0, 0<=D<=m-1.
```

There is no symmetry requirement on the two positive source parameters.
For the normalized polar operator

```text
Pi_a^(j) f=f-(d-a)f'/j,
```

direct differentiation gives the all-degree identity

```text
Pi_(-v)^(m-1) Pi_(-u)^m M_m
 =M_m-(2d+u+v)M_m'/m
     +(d+u)(d+v)M_m''/[m(m-1)]
 =16 P_B[(q+u/4)(q+v/4)(4q-d)^(m-2)].               (4)
```

Both polar points `-u,-v` lie strictly in the half-plane (3), because

```text
Im(exp(-i psi)(-u))=u sin(psi)>0
```

and likewise for `v`.  This is precisely why the old invocation of
Laguerre's polar-derivative theorem fails: preservation follows when the
polar point is outside the circular region containing the roots, not inside
it.  Identity (4) remains exact, but it supplies no sector preservation.

For arbitrary positive benign parameters `d_1,...,d_(m-2)`, the transform

```text
Phi_z(d_1,...,d_(m-2))
 =P_B[(q+u/4)(q+v/4) product_j(4q-d_j)](z)           (5)
```

is symmetric and multiaffine in the `d_j`, and its diagonal is (4).
Grace--Walsh--Szegő could lift a valid diagonal nonvanishing theorem to (5),
but the required diagonal theorem is not established by (4).  Consequently
the asserted circle exclusion remains open.

## 2. Real residual roots obey the same radius

The Pochhammer zero-count theorem supplies `m-2` negative roots of `q_D`;
select the most negative ones.  The reflected positive-endpoint variation
theorem bounds any remaining negative root of `q_D` in magnitude by `m-1`.
The all-stage negative-axis barrier bounds any positive residual root by

```text
                         (B-3)/4.                    (6)
```

The withdrawn unequal-sector step was intended to bound a nonreal residual
pair by `m-1`.  Conditional on a valid replacement for that step,

```text
|z_residual|<sqrt(A)
```

follows from

```text
A>(m-1)^2,       16A>(B-3)^2.                       (7)
```

For lower-selector parameters, the first inequality in (7) implies the
second.  These exact inequalities identify the region where a replacement
sector theorem would prove `G_2<A`; they do not themselves prove it.

## 3. Exact lower-row simplification

The leading `t^2G_(N-2,s)` term gives

```text
deg Gamma=floor(s/2)+2                               (8)
```

throughout the lower range.  Indeed `s<=N+r<=2N-6` for `d>=6`, so the path
slice `G_(N-2,s)` is nonzero at its top gamma degree.  The sole failure of
that support inequality is `(d,r,s)=(5,0,5)`, where the actual degree is
three instead of four and the corrected core is already direct.

Using (8), forced-zero removal gives the cancellations

```text
m=floor(s/2)+2-a,
x=floor((d+s)/2)-floor(s/2)-1,
B=d+ceil(s/2)-1.                                    (9)
```

Write `d=2D+delta`, `s=2k+sigma`.  In the unforced region `a=0`, the four
parity classes reduce (1) to

```text
(delta,sigma)=(0,0): k<=D-3,
(delta,sigma)=(0,1): k<=D-2,
(delta,sigma)=(1,0): k<=D-2,
(delta,sigma)=(1,1): k<=D-2.                        (10)
```

This is exactly (2).  At the next integer `k`, the square margin changes
strictly to the unsafe side.  In the forced region, write
`s=d+r-1+a`, `1<=a<=r+1`.  Then

```text
m-1>=floor(d/2)>sqrt(A),                            (11)
```

so no forced row satisfies (1), apart from the exceptional terminal degree
drop already noted.

It remains to verify the real barrier in (7).  At the largest safe `k` in
the four classes, the exact values of

```text
16A-(B-3)^2
```

are respectively

```text
7D^2+2D-25,
7D^2+6D-17,
7D^2+6D-17,
7D^2+16D-16.                                        (12)
```

They are strictly positive in the admissible ranges `D>=3,3,2,2`, and the
left side only increases as `s` decreases.  This proves the parameter
implication in (7) symbolically, not the missing sector assertion.

## 4. Replay and exact scope

`prove_unequal_outlier_polar_sector_subregion.py` verifies the general
successive-polar calculus identity, checks the Pochhammer identity in eight
exact rational ranks, checks all four parity cutoffs and the four positive
barrier margins, independently reconstructs the selector degree through
`d=20`, and exhausts the lower parameter diamond through `d=50`.

The finite sweep contains 54,050 corrected cells of degree at least two.
Exactly 17,297 satisfy (1), and all 17,297 also satisfy the real barrier;
36,753 lie in the unbounded complementary wedge.  These counts are a
transcription audit.  Equations (4) and (8)--(12) are exact identities and
parameter reductions; they are not an all-order proof of the subregion.

The script reports

```text
PASS_EXACT_UNEQUAL_POLAR_IDENTITY_AND_PARAMETER_REDUCTION_ONLY.
```
