# Conditional endpoint selector: a fixed mixed-slice interlacer reduction

## 1. Setup

Write

```text
P=P_N,       C=P_(N-1),       D=P_(N-2),
```

and let

```text
F_s(A,B)(z)=sum_i [v^i]A(v)[v^(s-i)]B(v) z^i.
```

For a palindromic binary slice, write `J_s(A,B)(t)` for the gamma
polynomial of the symmetrized mixed slice

```text
{F_s(A,B)(z)+F_s(B,A)(z)}/2.                       (1)
```

Fix `u>0` and define

```text
U=J_s(P,P)+uJ_s(C,C),
X=J_s(P,C)+uJ_s(C,D),
Y=J_s(C,C)+uJ_s(D,D),                              (2)
K_r=U+2rX+r^2Y.                                    (3)
```

The positive endpoint randomization reduction gives the desired coherent
selector as

```text
Q_(N,s,u)={K_u+uK_(-1)}/{u+1}.                     (4)
```

Thus it is enough to prove that `K_u` and `K_(-1)` are positively
compatible.

## 2. One fixed candidate works for every endpoint parameter

The exact candidate is `X` in (2).  The sharp remaining lemma is

> **Vector mixed-slice lemma.**  For every `r>=-1` and `c>=0`, after
> retaining the common gamma degree and all forced zero roots,
>
> ```text
> X+cK_r                                                   (5)
> ```
>
> is negative-rooted.

If (5) holds, `X` is one common interlacer for both polynomials in (4),
and hence every positive combination of them, including (4), is
negative-rooted.

This is stronger than the two-leaf lemma because the same `X` works for
the entire path endpoint family `r>=-1`.

## 3. Raw directed mixed slices

Before gamma symmetrization define

```text
R=F_s(P,C)+uF_s(C,D),
R*=F_s(C,P)+uF_s(D,C)=z^sR(1/z),                   (6)
L_r=F_s(P+rC,P+rC)+uF_s(C+rD,C+rD).                (7)
```

Then `L_r` is palindromic, its gamma polynomial is `K_r`, and the gamma
polynomial of `(R+R*)/2` is `X`.

The nested path Jacobi matrices give

```text
C proper-position P,       D proper-position C.    (8)
```

For either pair `(A,B)=(P,C)` or `(C,D)`, the finite
stability-preserver symbol

```text
T_(B,s)((z+w)^m)
 =w^(m-s)e_s(z,...,z,beta_1w,...,beta_lw)          (9)
```

shows that `F_s(A,B)` is a mixed interlacer of the two diagonal
slices.  Formulae (6)--(7) show that the needed theorem is precisely the
direct-sum version of this statement:

```text
(P,C) direct-sum sqrt(u)(C,D).                      (10)
```

The tempting stronger assertion that these mixed interlacings have one
global proper-position orientation is false.  Already at
`(N,s,r,u)=(5,2,-1,1)`,

```text
R=31z^2+72z+13,       L_(-1)=8z,
W(R,L_(-1))=8(31z^2-13),                             (11)
```

so the Wronskian changes sign.  The two component Wronskians also change
sign: they are `4(21z^2-10)` and `4(10z^2-3)`.  Therefore an all-order
proof cannot assert coefficientwise or pointwise common orientation of
the raw summands.

The correct remaining closure is weaker: `R+cL_r` and `R*+cL_r` should be
real-rooted for every `c>=0` at the common degree ceiling, followed by a
palindromic symmetrization argument proving the same for
`(R+R*)/2+cL_r`.  This is positive compatibility, not full Obreschkoff
proper position.  An Andreief/Cauchy--Binet proof must therefore establish
the common-gap inequalities directly rather than a globally signed
Wronskian.

## 4. Exact cautions

The stronger bivariate-stability route is false.  Already at
`(N,s,u)=(5,2,1/10)`, restriction along

```text
t=-3+lambda,       r=-3+lambda
```

gives

```text
17lambda^3-(213/2)lambda^2+(2359/10)lambda-931/5,
```

whose discriminant is `-494324299/2000`.  Thus (5) cannot be obtained by
simply asserting joint stability in `(t,r)`.

Nor does the matrix

```text
M(t)=[[U,X],[X,Y]]                                  (12)
```

have the simplest negative-spectrum adjugate representation.  At
`(N,s,u)=(6,6,1)`,

```text
det M
 =t^2(442668t^4+440884t^3-129925t^2-49008t-2304)/4,
```

and the quartic factor has a positive root.  A proof therefore needs the
mixed-slice proper-position structure, not an ordinary positive resolvent
for (11).

The symmetrized cross polynomial between `K_u` and `K_(-1)` is also not a
universal equal-degree interlacer.  For example at `(N,s,u)=(6,6,1/10)`
its two nonzero roots and those of `K_u` are ordered

```text
cross_1 < K_(u),1 < K_(u),2 < cross_2,
```

so the labels do not alternate.  This is why the fixed candidate `X` in
(2), rather than the parameter-dependent cross polynomial, is the correct
frontier.

## 5. Exact finite audit

`verify_conditional_endpoint_common_interlacer_reduction.py` checks all
identities (2)--(7), retains forced zeros at the common gamma ceiling, and
uses exact integer polynomials with certified FLINT complex-root boxes to
audit the common-gap criterion for `X` and `K_r` through a finite range.
The replay is evidence only.  The direct-sum positive-compatibility and
palindromic-symmetrization theorem in Section 3 is still required for an
all-order proof.
