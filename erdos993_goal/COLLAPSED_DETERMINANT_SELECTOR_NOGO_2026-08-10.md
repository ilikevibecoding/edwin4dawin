# Collapsed determinant selector: an all-order no-go theorem

Date: 2026-08-10

## Result

The exact hard-group differential operator cannot be obtained from the
`2N`-dimensional spectral determinant of Section 91 by polarizing the
identity direction and then invoking a generic stable
constant-coefficient contraction.  The unique polarized selector is not
real stable for **any** `M>=d>=4`, so in particular it fails everywhere in
the proposed cone `M=2N`, `2d-N>=5`.

This does not disprove stability of `G_(N,d)`.  It rules out a precise proof
route: the direct Lieb--Sokal/Borcea--Branden contraction of the collapsed
spectral determinant with four independent endpoint markers.  A successful
determinant proof must retain additional path/row-column structure, or use a
non-generic theorem after the identity derivatives have acted.

## 1. The exact selector is forced

Write the identity on the two `N`-blocks as a sum of `M=2N` rank-one
coordinate projectors, with marker variables `x_1,...,x_M`.  The determinant
parent is multiaffine in these markers, so

```text
(sum_j D_(x_j))^k = k! e_k(D_(x_1),...,D_(x_M)).
```

Let `(a_1,b_1)` and `(a_2,b_2)` mark the two matched endpoint directions.
The exact operator

```text
S^(d-4)(S^2-D_(a_1)D_(b_1))(S^2-D_(a_2)D_(b_2))
```

therefore has the unique coordinate-polarized symbol

```text
P_(M,d)
 = d! e_d(x)
   -(d-2)! e_(d-2)(x)(a_1 b_1+a_2 b_2)
   +(d-4)! e_(d-4)(x)a_1b_1a_2b_2.                 (1)
```

Scaling either endpoint direction only makes an invertible positive scaling
of the corresponding marker and cannot repair nonstability.

## 2. An exact Rayleigh obstruction in every order

Diagonalize the symmetric ordinary block, `x_1=...=x_M=x`.  With falling
factorials

```text
A=(M)_d,   B=(M)_(d-2),   C=(M)_(d-4),
```

equation (1), apart from the harmless factor `x^(d-4)`, becomes

```text
f=A x^4-Bx^2(a_1b_1+a_2b_2)+C a_1b_1a_2b_2.        (2)
```

For a real multiaffine stable polynomial every Rayleigh difference is
nonnegative at every real specialization.  Direct differentiation gives

```text
Delta_(a_1,b_1)
 =(A x^4-Bx^2 t)(B x^2-Ct),       t=a_2b_2.          (3)
```

At `x=1`, the two zeros in `t` are

```text
A/B=(M-d+2)(M-d+1),
B/C=(M-d+4)(M-d+3).                                  (4)
```

The first is strictly smaller than the second for every `M>=d>=4`.
Choose `b_2=1` and choose `a_2=t` strictly between the values in (4).
Then the first factor in (3) is negative and the second is positive, so

```text
Delta_(a_1,b_1)<0.
```

Hence `P_(M,d)` is not real stable in every admissible order.  This is an
all-order symbolic obstruction, not a finite scan.

The obstruction also explains the difference from the raw selector of
Section 99.  In the raw coordinate model the marked endpoints remain part
of the ordinary deletion set, producing the positive weights `24,22,21`.
After spectral/Laguerre collapse the identity directions and the four
endpoint directions are independent, and the forced selector is (1), whose
falling-factorial gaps violate the Rayleigh inequality.

## 3. Independent PSD-bridge obstruction

The one-direction quadrature construction in Section 91 has

```text
B(alpha,beta)=alpha I+beta K,
K=[[0,uv*],[vu*,0]],       ||u||^2=||v||^2=N.
```

At a block-diagonal determinant, odd powers of the off-diagonal direction
vanish and

```text
D_B^2=alpha^2 S^2-2 beta^2 D_(uu*)D_(vv*).
```

Matching `S^2-D_(uu*)D_(vv*)` up to a positive scalar forces
`alpha^2=2 beta^2`.  But `K` has nonzero eigenvalues `+N,-N`, so positivity
of `B` requires `alpha>=|beta|N`, hence `alpha^2>=N^2 beta^2`.  These two
requirements are incompatible for `N>=2`.  In particular the exact choice
`I+K/sqrt(2)` has inertia `(2N-1,1,0)`.

Thus neither the direct stable selector nor the literal single PSD bridge
can close the determinant route on the collapsed `2N`-block.

## 4. Exact replay

`prove_collapsed_determinant_selector_nogo.py` verifies the symbolic
Rayleigh identity, records exact rational witnesses for all
`4<=M<=40, 4<=d<=M`, and checks the bridge inequalities for `2<=N<=40`.
It writes `collapsed_determinant_selector_nogo_exact_20260810.json`.

The finite range is only a replay.  Equations (3)--(4) and the two bridge
eigenvalues are the all-order proofs.
