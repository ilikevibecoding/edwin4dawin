# Positive endpoint randomization for the coherent selector

## 1. Statement

Let

```text
P_M(v)=sum_k binom(2M-k-1,k)v^k=det(I+vC_(M-1))
```

and let `G_(M,s)(t)` be the gamma polynomial of the fixed diagonal
slice of `P_M`.  Put

```text
Q_(N,s,u)(t)
 =G_(N,s)(t)+2uG_(N-1,s)(t)+u^2G_(N-2,s)(t).       (1)
```

For every `u>0`, (1) is exactly a positive expectation of four gamma
polynomials which are individually negative-rooted.  The representing
four path matrices are positive definite endpoint perturbations; this is
valid for arbitrarily large `u`, not just `u<1`.

This does not by itself prove that (1) is negative-rooted: positive sums of
real-rooted polynomials need not be real-rooted.  It reduces the remaining
claim to a concrete four-leaf common-interlacing/interlacing-family lemma.

## 2. Endpoint determinant

Put `m=N-1`, let `E_1,E_m` denote the two endpoint diagonal matrix units,
and, for `r_1,r_2>-1`, define

```text
D(r_1,r_2)=I+r_1E_1+r_2E_m,
L_(r_1,r_2)(v)=det(D(r_1,r_2)+vC_m).                (2)
```

Multiaffinity of a determinant in its diagonal entries, together with the
two endpoint principal minors of a path, gives

```text
L_(r_1,r_2)(v)
 =P_N(v)+(r_1+r_2)P_(N-1)(v)+r_1r_2P_(N-2)(v).     (3)
```

Since `D(r_1,r_2)>0`, congruence gives

```text
L_(r_1,r_2)(v)
 =det(D) det(I+v D^(-1/2) C_m D^(-1/2)).           (4)
```

The matrix in the second determinant is positive definite.  Thus every
`L_(r_1,r_2)` has only negative roots.

For a negative-rooted polynomial `L(v)=sum ell_k v^k`, define

```text
J_(L,s)(t)
 = gamma of sum_k ell_k ell_(s-k) z^k
 = [U^s]L(aU)L(bU),  a+b=1, ab=t.                  (5)
```

The standard stable elementary-symmetric-symbol/Schur--Szego argument for
path slices applies to every negative-rooted `L`, not only to `P_M`.
Consequently every `J_(L_(r_1,r_2),s)` is negative-rooted.

## 3. Exact covariance identity

Choose any `b` with `0<b<1` and put `a=u/b`.  Let `R` be the two-point
random variable

```text
R=a   with probability b/(a+b),
R=-b  with probability a/(a+b).                    (6)
```

Then

```text
E R=0,        E R^2=ab=u,        R>-1.             (7)
```

For example, `b=1/2` gives support `{2u,-1/2}` with probabilities
`{1/(4u+1),4u/(4u+1)}`.  Let `R_1,R_2` be independent copies of `R` and
write

```text
L_(R_1,R_2)(v)=sum_k ell_k(R_1,R_2)v^k.
```

From (3),

```text
ell_k=p_(N,k)+(R_1+R_2)p_(N-1,k)+R_1R_2p_(N-2,k).
```

Independence and (7) give, for every `i,j`,

```text
E[ell_i ell_j]
 =p_(N,i)p_(N,j)
  +2u p_(N-1,i)p_(N-1,j)
  +u^2p_(N-2,i)p_(N-2,j).                          (8)
```

Indeed, all three mixed terms vanish, while

```text
E(R_1+R_2)^2=2u,
E(R_1R_2)^2=u^2.
```

Taking `j=s-i`, forming the palindromic slice, and using linearity of the
gamma transform proves the all-order identity

```text
Q_(N,s,u)(t)
 = E J_(L_(R_1,R_2),s)(t).                         (9)
```

Thus (9) is a four-leaf positive mixture of individually negative-rooted
polynomials arising from positive definite matrices.

## 4. One endpoint can be averaged rigorously

The four-leaf formulation can be reduced further.  Condition on `R_1=r`
and write

```text
A_r(v)=P_N(v)+rP_(N-1)(v),
B_r(v)=P_(N-1)(v)+rP_(N-2)(v).                     (10)
```

Then (3) is `L_(r,R_2)=A_r+R_2B_r`, so the first two moments of `R_2`
give

```text
E_(R_2) J_(L_(r,R_2),s)
 =J_(A_r,s)+uJ_(B_r,s)=:K_r(t).                    (11)
```

Every `K_r` in the support of (6) is negative-rooted.  Indeed,
`A_r` is the determinant of the positive endpoint-perturbed path pencil
in (2), while `B_r` is its principal minor obtained by deleting the
opposite endpoint.  After the positive congruence in (4), strict Cauchy
interlacing gives `B_r` in proper position with `A_r`.

The mixed-slice stability-preserver argument then supplies a common
interlacer for the two palindromic diagonal slices of `A_r` and `B_r`:
the mixed slice

```text
sum_i [v^i]B_r(v) [v^(s-i)]A_r(v) z^i
```

interlaces the self-slice of `A_r`, and its reciprocal interlaces the
self-slice of `B_r`.  Palindromicity converts the latter statement to the
same mixed common interlacer.  Hence their positive sum in (11), and its
gamma polynomial `K_r`, are negative-rooted.

Consequently (9) sharpens to

```text
Q_(N,s,u)(t)=E_(R_1) K_(R_1)(t),                  (12)
```

where the expectation now has only two leaves and both leaves have an
all-order real-rootedness proof.

There is a cleaner boundary version.  Let `b` tend to `1` in (6).  The
two-point law becomes

```text
R=u   with probability 1/(u+1),
R=-1  with probability u/(u+1).                    (13)
```

The endpoint matrix at `R=-1` is positive semidefinite rather than positive
definite.  All root statements follow by taking the limit `b` upward to
`1`.  Formula (12) becomes the exact two-polynomial identity

```text
Q_(N,s,u)(t)={K_u(t)+uK_(-1)(t)}/{u+1}.             (14)
```

Thus the sharp remaining target is compatibility of `K_u` and `K_(-1)`.
This version has no auxiliary `1/2` and turns the original selector into
one prescribed convex combination of two already-proved negative-rooted
polynomials.

## 5. Exact remaining lemma

It is sufficient to prove either of the following statements for the two
conditional leaves in (12):

1. the two conditional polynomials `K_u` and `K_(-1)` in (14) have
   a common interlacer; or
2. their particular convex combination in (14), with weights
   `1/(u+1)` and `u/(u+1)`, is real-rooted.

The first statement is stronger than necessary.  It cannot be inferred
merely from the fact that the two conditional leaves are negative-rooted.
The useful new point is that both come from the same path determinant,
after one independent rank-one endpoint perturbation has already been
averaged without losing real-rootedness.

## 6. A rigorous obstruction to the strongest stable lift

One might try to prove that `Q_(N,s,u)(t)` is real stable jointly in
`(t,u)`.  This is false already at `(N,s)=(5,2)`.  Here

```text
G_(5,2)=21+22t,
G_(4,2)=10+16t,
G_(3,2)=3+10t,
```

so

```text
Q(t,u)=21+20u+3u^2 + t(22+32u+10u^2).              (15)
```

Restrict (15) to the real base point `(t,u)=(2,2)` in the strictly
positive direction `(2,4)`:

```text
Q(2+2lambda,2+4lambda)
 =320lambda^3+944lambda^2+956lambda+325.            (16)
```

The discriminant of (16) is

```text
-145424384<0.                                       (17)
```

Therefore (16) has a nonreal conjugate pair.  A real stable polynomial has
a real-rooted restriction along every positive direction through a real
base point, so (15)--(17) rule out joint real stability of `Q(t,u)`.
This obstruction does not affect the desired vertical statement: for each
fixed real `u`, (15) is linear in `t`.

## 7. Replay

`verify_correlated_endpoint_positive_randomization.py` checks (3), (8),
and (9)--(11) exactly over a finite transcription range, and checks the exact
cubic and discriminant in (16)--(17).  Equations (2)--(14) are the
all-order reduction; the finite replay is not a proof of the remaining
interlacing-family lemma.
