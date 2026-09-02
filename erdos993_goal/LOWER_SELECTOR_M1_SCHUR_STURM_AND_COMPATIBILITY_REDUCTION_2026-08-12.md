# Schur--Sturm reduction for the lower first margin

Date: 2026-08-12

## Result

The remaining generic lower-selector first margin has a clean root-free
form.  Put

```text
A=(s_D-1)(s_D+beta-1),       R=sqrt(A).               (1)
```

It is sufficient to prove that the Schur--Cohn count of roots of the
corrected Duran polynomial `q` outside `|z|=R` equals the Sturm count of its
negative roots in `(-infinity,-R)`, and that this common count is at most
`m-2`.  Both statements pass an exact 770-cell audit.  No numerical roots
are used in this replay.

There is also a precise obstruction to a proposed shortcut: compatibility
of the two endpoint-conditioned leaves, considered only as a fiberwise
property, does not imply the diagonal Duran product bound.  An exact coherent
quadratic family has trivially compatible negative-rooted leaves for every
positive parameter, but its diagonal is the already-certified degree-four
M1 counterexample.  An endpoint proof must use additional path-determinant
relations, not compatibility alone.

## 1. Why the two indices imply M1

The Pochhammer zero-count theorem supplies at least `m-2` negative roots of
`q`.  Select the `m-2` most negative roots for the Duran deflation and let
the product of the two residual roots be `G2`.

Suppose that

```text
(a) q has no root on |z|=R;
(b) every root outside |z|=R is negative real;
(c) at most m-2 roots lie outside |z|=R.              (2)
```

Every exterior negative root is more negative than every interior negative
root, so the selected `m-2` roots include all exterior roots.  The two
residual roots therefore lie strictly inside the disk.  Hence

```text
G2 <= |G2| < R^2=A,                                  (3)
```

which is exactly `M1>0`.

## 2. Rational Schur--Cohn form

Write

```text
q(z)=sum_(j=0)^m a_j z^(m-j).                         (4)
```

Apply the usual Schur--Cohn form to `q(Rz)`.  Its coefficient matrices are
the lower triangular Toeplitz matrices

```text
U_(ij)=a_(i-j) R^(m-i+j),
V_(ij)=a_(m-i+j) R^(i-j),       i>=j,                 (5)
```

with zero entries for `i<j`.  The Hermitian form

```text
H=U^T U-V^T V                                         (6)
```

has one negative eigenvalue for every root outside the circle and one
positive eigenvalue for every root inside it.

Although (5) contains `R`, a diagonal congruence makes the form rational.
Let `D_ii=R^(i mod 2)` and `K=D^(-1)HD^(-1)`.  If
`e_ij=(i mod 2)+(j mod 2)`, then

```text
K_ij=sum_(h=max(i,j))^(m-1) {
 a_(h-i)a_(h-j) A^((2m-2h+i+j-e_ij)/2)
-a_(m-h+i)a_(m-h+j) A^((2h-i-j-e_ij)/2)}.            (7)
```

Every exponent in (7) is a nonnegative integer.  Thus `K` is an exact
rational symmetric matrix, and its negative inertia is the exterior-disk
index.  In the replay all leading principal minors are nonzero, so this
inertia is obtained exactly from sign changes of

```text
1, det K[1], det K[2], ..., det K[m].                 (8)
```

## 3. Exact negative-ray index

Over the exact quadratic field `Q(R)`, form

```text
f(x)=q(-Rx).                                          (9)
```

The Sturm count of roots of `f` in `(1,infinity)` is exactly the number of
negative roots of `q` in `(-infinity,-R)`.  Equality between this Sturm count
and the negative inertia in (8) proves (2a)--(2b).  The additional inequality
that the common count is at most `m-2` proves (2c).

The exact replay covers the same corrected normalization and the same 770
cells as the prior Duran audit:

```text
5<=d<=14,
0<=r<=d-5,
r<row_s<=d+2r,
p'=P-2a, alpha'=a, N_D=P-a.                           (10)
```

It finds

```text
Schur exterior index = negative-ray Sturm index       (all 770 cells),
common index <=m-2                                    (769 cells). (11)
```

The sole exception to the second line is `(d,r,row_s)=(5,0,5)`, whose
residual product is already `G2=-9`, making M1 immediate.  Thus (7)--(11)
give an independent exact root-free proof of every finite audited M1 case.
They are evidence for, not a proof of, the all-order index theorem.

## 4. Compatibility alone is insufficient

Consider the coherent quadratic family

```text
Q(t,u)=(t+1/100)(t+1/1000)(t+1+2u)^2.                (12)
```

For every `u>0`, all four roots of the `t`-fiber are negative.  If both
conditional leaves are chosen equal to this fiber, then they trivially have
a common interlacer and satisfy the endpoint mixture identity

```text
Q={K_u+u K_(-1)}/{u+1}.                              (13)
```

However, on the selector diagonal `u=-t`,

```text
Q(t,-t)=(t+1/100)(t+1/1000)(1-t)^2.                  (14)
```

At the corrected normalization `(P,alpha,m)=(9,0,4)`, its monic Duran
polynomial is

```text
z^4+(4953/2)z^3+447527z^2-1121286z+1181250.          (15)
```

Exact Sturm counts put its only real roots in

```text
(-2281,-2280), (-199,-198).                           (16)
```

After these two negative roots are removed,

```text
G2>1181250/(2281*199)>3/2=A,                         (17)
```

so M1 fails.  This does not refute compatibility of the actual path leaves;
it proves that the formal properties "two compatible negative-rooted leaves"
and (13) are not by themselves enough.  A successful use of the actual
endpoint randomization must retain its determinant/principal-minor identities
through the diagonal and the Duran transform.

## 5. Replays

`audit_lower_selector_m1_schur_sturm_indices.py` verifies (7)--(11) and
writes `lower_selector_m1_schur_sturm_indices_exact_20260812.json`.  It
reports

```text
PASS_EXACT_770_CELL_SCHUR_STURM_DISK_INDEX_AUDIT.
```

`verify_endpoint_compatibility_not_sufficient_for_m1.py` verifies
(12)--(17) and writes
`endpoint_compatibility_not_sufficient_for_m1_exact_20260812.json`.  It
reports

```text
PASS_EXACT_ENDPOINT_COMPATIBILITY_ALONE_NOT_SUFFICIENT_FOR_M1.
```
