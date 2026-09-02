# Rooted-forest reserve theorem at rank j=3

Date: 2026-08-28

Status: **proved for every finite rooted forest.**

Let `F` be a forest with one distinguished root in each component, let
`H=F-roots`, and write

```text
f_k=i_k(F),  h_k=i_k(H),  K_2=2f_2-s_2(F).
```

Then

```text
(8h_2+K_2)f_3 >= 6h_3 f_2.                          (1)
```

This is the `j=3` case of the rooted reserve candidate.

## Analytic core

First suppose no rooted component is isolated.  Put

```text
M=number of nonroots=number of edges,
c=number of components,  N=M+c,
P=sum_v C(deg_F(v),2).
```

Exact inclusion-exclusion gives

```text
f_2=C(N,2)-M,
f_3=C(N,3)-M(N-2)+P,
K_2=N(c-1)+2P.                                       (2)
```

Every nontrivial tree component satisfies
`sum_v C(deg(v),2)>=|V|-2`, so

```text
P>=M-c.                                               (3)
```

If `D` is the total root degree, then `D>=c` and

```text
h_2=C(M,2)-(M-D)=C(M-1,2)+D-1
    >=C(M-1,2)+c-1.                                   (4)
```

Finally, downsampling independent triples of the `M`-vertex forest `H`
to pairs gives

```text
3h_3<=(M-2)h_2.                                      (5)
```

It is therefore enough to prove

```text
(8h_2+K_2)f_3 >= 2(M-2)h_2 f_2.                     (6)
```

The left minus right in (6) increases with `P`.  Once the coefficient of
`h_2` is nonnegative, it also increases with `h_2`.

For `c>=2`, substitute the lower bounds (3)--(4), then shift
`M=3+r`, `c=2+u`.  The `h_2` coefficient becomes

```text
[r^3+6r^2u+9ru^2+39ru+5r+4u^3+45u^2+65u+6]/3,
```

and the full sufficient margin has 21 strictly positive coefficients in
`r,u`.  Thus every multicomponent case is closed.

For `c=1`, the same coefficient and sufficient margin factor as

```text
(M-12)(M-2)(M-1)/3,

(M-2)(M-1)^2(M^2-12M+18)/6.
```

Both are nonnegative for `M>=12` (the second is strictly positive).

## Exact finite residue

The only analytic residue is a connected rooted tree with `M<=11`, hence
`|F|<=12`.  Adjoining one new leaf to the distinguished root turns it into
an augmented tree of order at most 13.  The independently frozen exact
rooted-forest census enumerates every unlabeled augmented tree through order
14 and every choice of the augmenting vertex: 72,144 rooted cells and
424,204 reserve checks, with no failure.  This rigorously closes the finite
residue.

The separately proved isolated-root preservation theorem then restores any
number of isolated distinguished-root components, proving (1) for every
rooted forest.

## Scope

This closes only `j=3` of the rooted reserve.  The `j=4,5` cases, complete
terminal-support preservation, the all-tree higher-rank envelope, and Erdos
Problem 993 remain open here.

Correction: this version uses the sharp consequence
`h_2>=C(M-1,2)+c-1`.  The earlier draft's `+c` bound was off by one and is
superseded.
