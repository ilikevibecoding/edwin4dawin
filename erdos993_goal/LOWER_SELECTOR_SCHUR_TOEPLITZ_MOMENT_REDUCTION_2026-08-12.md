# Schur--Cohn rank-two displacement and Toeplitz moment reduction

Date: 2026-08-12

## Result

The lower-selector target-disk Schur form has an exact rank-two path
displacement and an exact congruence to a Toeplitz moment matrix.  The latter
exposes a fixed two-dimensional positive subspace in all 769 nonterminal
cells of the exact audit, proving the exterior-root-count bound without an
LDL calculation.

The two scalar moment inequalities behind this positive plane remain to be
proved uniformly.  This is a sharper all-order target than positivity of a
large family of Schur minors.  It also identifies a limitation: the two raw
path-controllability Gramians are both full rank, so the rank-two displacement
alone does not give the desired inertia bound.

## 1. Universal rank-two displacement

Let

```text
p(w)=q(Rw)=c_0 w^m+c_1 w^(m-1)+...+c_m,              (1)
```

where `R^2=A=(s_D-1)(s_D+beta-1)`.  Form the lower triangular coefficient
matrices

```text
U_(ij)=c_(i-j),
V_(ij)=c_(m-i+j),                    i>=j,            (2)
```

with zero entries above the diagonal.  The Schur--Cohn form is

```text
H=U^T U-V^T V.                                        (3)
```

Let `J` be the upper shift and put

```text
u_i=c_(m-1-i),       v_i=c_(i+1),       0<=i<m.       (4)
```

Direct telescoping gives

```text
H-JHJ^T=uu^T-vv^T.                                   (5)
```

Since `J^m=0`, define the path-controllability matrices

```text
C_u=[u,Ju,...,J^(m-1)u],
C_v=[v,Jv,...,J^(m-1)v].                              (6)
```

Then (5) sums to

```text
H=C_u C_u^T-C_v C_v^T.                               (7)
```

This is the desired difference of two finite path moment Gramians with
rank-two displacement.

However,

```text
det C_u=(-1)^(m(m-1)/2)c_0^m,
det C_v=(-1)^(m(m-1)/2)c_m^m.                        (8)
```

Both endpoint coefficients of the corrected Duran polynomial are nonzero,
so both Gramians in (7) have full rank.  Thus (7) does not by itself supply
a rank-`m-2` positive part; a nontrivial cancellation/congruence is essential.

## 2. Toeplitz quotient congruence

Use the second full-rank Gram in (7) and put

```text
T=C_v^(-1)C_u.                                        (9)
```

Then

```text
H=C_v(TT^T-I)C_v^T.                                  (10)
```

The matrix `T` is lower triangular Toeplitz.  If its first column is
`h_0,...,h_(m-1)`, then

```text
sum_(j>=0) h_j z^j
 == (c_0+c_1z+...+c_mz^m)
    /(c_m+c_(m-1)z+...+c_0z^m)        mod z^m.        (11)
```

Equivalently, the `h_j` satisfy the triangular recurrence

```text
c_m h_j+sum_(ell=1)^j c_(m-ell)h_(j-ell)=c_j.        (12)
```

Thus (10) is a concrete moment form built only from the top/bottom
coefficient quotient of the actual path Duran polynomial.

## 3. A fixed positive two-plane

Restrict `TT^T-I` to its final two coordinate directions.  Its matrix is

```text
M_2 = [ E-1    C ]
      [ C      F-1 ],                                 (13)

E=sum_(j=0)^(m-2) h_j^2,
F=sum_(j=0)^(m-1) h_j^2,
C=sum_(j=0)^(m-2) h_j h_(j+1).                       (14)
```

Therefore the two scalar inequalities

```text
E>1,
(E-1)(F-1)-C^2>0                                    (15)
```

give a positive two-plane for (10).  By congruence, the Schur--Cohn form
`H` then has at least two positive eigenvalues and hence at most `m-2`
negative eigenvalues.  The latter is exactly the bound of at most `m-2`
roots outside the target disk.

An exact 770-cell replay proves (15) in every nonterminal cell.  The only
exception is `(d,r,row_s)=(5,0,5)`, whose first margin is already trivial
because `G2=-9`.  This replaces hundreds of varying natural-order Schur
minor sign patterns by the same two moment inequalities in every degree.

The lower-row symbolic certificates are consistent with this reduction.  In
the cubic families, the determinant in (15) contains the same strictly
positive factor produced by the direct `q(-T)>0` product certificate.  Thus
(15) is not a generic consequence of the already-proved central value
`q(L)>0`; it retains genuinely new first-margin content.

## 4. What remains

There are now two separate all-order tasks:

1. Prove (15) directly from the path allocation formula for the coefficients
   `c_j` and the quotient recurrence (12).  This proves the Schur exterior
   index bound.
2. Prove that this exterior index equals the negative-ray Sturm index.  The
   latter excludes nonnegative or nonreal exterior roots and completes M1.

Several simpler replacements were tested and fail: a fixed coordinate
two-plane in the original Schur basis, a half-plane cone for the individual
selector allocations on the target circle, and a direct Cayley
parity--Hurwitz application.  The quotient congruence (10)--(15) is the first
uniform positive plane surviving the complete audit.

## 5. Replays

`verify_lower_selector_schur_ranktwo_displacement.py` proves (5)--(8)
symbolically through generic degree seven and checks 432 corrected path
cells.  It reports

```text
PASS_EXACT_SCHUR_RANKTWO_DISPLACEMENT_AND_FULLRANK_GRAM_OBSTRUCTION.
```

`audit_lower_selector_schur_toeplitz_moment_plane.py` constructs
(9)--(15) and checks all 770 corrected cells exactly.  It reports

```text
PASS_EXACT_770_CELL_SCHUR_TOEPLITZ_MOMENT_POSITIVE_PLANE.
```

The matrix identities are all-order algebra.  Positivity of (15) is still
finite evidence until a path-allocation proof is supplied.
