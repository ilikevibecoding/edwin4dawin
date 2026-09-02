# Aligned endpoint Jacobi three-ray reduction

## 1. Endpoint translation

Let

```text
P=P_N, C=P_(N-1), D=P_(N-2),
A_r=P+rC, B_r=C+rD,
```

and let `J_s` be the symmetric bilinear gamma slice used in the conditional
endpoint reduction.  Translate the endpoint square by writing

```text
x=a+1, y=b+1,                 x,y>=0.
```

The path continuant recurrence gives

```text
V=P-C=vS_(N-1), W=C-D=vS_(N-2),
S_M=2P_M-vP_(M-1).                                  (1)
```

Moreover `S_M/2` is the determinant of the positive path Jacobi matrix with
one endpoint diagonal changed from `2` to `3/2`.  Thus both `(C,V)` and
`(D,W)`, after removing their common forced factor `v`, are aligned
endpoint-Jacobi pairs.

Now

```text
A_a=V+xC, A_b=V+yC, B_a=W+xD, B_b=W+yD.             (2)
```

For fixed `u>0`, define the three endpoint rays

```text
E=J_s(C,C)+uJ_s(D,D),
F=J_s(C,V)+uJ_s(D,W),
G=J_s(V,V)+uJ_s(W,W).                               (3)
```

Bilinearity gives the all-order identity

```text
B(a,b)=J_s(A_a,A_b)+uJ_s(B_a,B_b)
      =G+(x+y)F+xyE.                                (4)
```

## 2. Exact closure criterion

It is enough to prove that `F` is positively compatible with both `E` and
`G`, with the common gamma degree and forced zero roots retained.  Indeed,
`E,F,G` then are pairwise positively compatible (`E,G` may equivalently be
included as the third pair).  For same-degree real-rooted polynomials with
positive leading coefficients, pairwise positive compatibility is equivalent
to a common interlacer.  Therefore every nonnegative combination of the
three is real-rooted.  Equation (4) has coefficients

```text
1, x+y, xy >=0,
```

so it is negative-rooted for every `a,b>=-1`.  The boundary is obtained by
coefficientwise limit from `x,y>0`.

This reduces the entire two-parameter endpoint square to two one-parameter
pencils:

```text
E+cF and F+cG,              c>=0.                   (5)
```

The middle ray `F` is the aligned mixed slice of the two nested endpoint
Jacobi pairs in (1); (5) is the precise all-order aligned direct-sum
mixed-slice lemma still needed.

## 3. Why the raw deletion arms do not immediately finish gamma symmetry

Before reciprocal symmetrization, deletion of a common principal endpoint
produces the natural directed separator

```text
Z=z{F_(s-1)(B_a,A_b)+uF_(s-1)(C_a,B_b)},
C_a=P_(N-2)+aP_(N-3).                               (6)
```

Finite exact and numerical tests support that `Z` interlaces the directed
sum.  Its reciprocal is the corresponding deletion on the other factor.
However, replacing these two arms by `Z+Z*` is invalid.  At

```text
(N,s,a,b,u)=(5,2,-1,-9/10,1/1000),
```

the palindromic target and symmetrized separator have ascending coefficients

```text
H=(11007/10000,6506/625,11007/10000),
Z+Z*=(1001/5000,0,1001/5000).
```

The discriminant of `H+1000(Z+Z*)` is

```text
-809897637549/5000000 < 0.                           (7)
```

Thus any successful two-arm proof must retain the two reciprocal separators
and establish their cross-gap inequalities; their sum is not itself a
separator.

## 4. Exact replay and status

`verify_aligned_endpoint_three_ray_reduction.py` checks (1)--(4) exactly,
certifies pairwise common gaps for `E,F,G` through `N<=25`, all layers, and
`u in {1/1000,1,1000}`, and verifies (7) exactly.  The algebraic reduction is
all-order; the root audit is evidence only and does not prove (5).

## 5. Leaf geometry and the unique bad cross

Split the three rays into their two aligned Jacobi blocks:

```text
E=E_1+uE_2, E_1=J_s(C,C), E_2=J_s(D,D),
F=F_1+uF_2, F_1=J_s(C,V), F_2=J_s(D,W),
G=G_1+uG_2, G_1=J_s(V,V), G_2=J_s(W,W).             (8)
```

The `F/G` side has a particularly clean leaf geometry: all six pairs among
`F_1,F_2,G_1,G_2` satisfy the common-gap criterion in the complete exact
audit through `N<=25`.  Hence, once these six relations are proved from the
aligned path symbols, the interval Helly theorem gives one interlacer for all
four leaves.  It follows at once that

```text
F+cG=F_1+uF_2+cG_1+cuG_2
```

is negative-rooted for every `u,c>=0`.

The `E/F` side isolates one and only one cross obstruction.  Three of its
four cross relations hold in the same audit:

```text
(E_1,F_1), (E_1,F_2), (E_2,F_2).
```

The remaining leaf pair `(E_2,F_1)=(J_s(D,D),J_s(C,V))` fails beginning at
`(N,s)=(5,4)` and in 370 audited cells.  Nevertheless the equal-coupling
pencil

```text
(E_1+uE_2)+c(F_1+uF_2)                              (9)
```

is real-rooted in every certified cell.  Thus `u` cannot be separated into
four arbitrary leaf weights: the aligned equal-`u` coupling repairs exactly
the bad `(E_2,F_1)` cross.  After the `F/G` four-leaf lemma, (9) is the sole
endpoint-Jacobi obligation.

Joint stability of the diagonal self-slice in `(t,x)` cannot replace this
obligation.  At `(N,s,u)=(5,2,1/100)`, the restriction

```text
(t,x)=(-6,8)+lambda(2,5)
```

is

```text
805 lambda^3 +(8639/20)lambda^2
 -(96593/20)lambda -139328/25,
```

with discriminant

```text
-4862854658107221643/800000<0.                     (10)
```

So an endpoint polarization proof based on joint real stability is false.
