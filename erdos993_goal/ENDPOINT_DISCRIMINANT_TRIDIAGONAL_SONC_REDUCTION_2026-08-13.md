# Tridiagonal SONC reduction for all endpoint discriminant blocks

Date: 2026-08-13

## Exact algebraic reduction

Let `Delta(c;q,u)` be either endpoint-pencil discriminant after its forced
power of `t` is removed, and split every coefficient block into positive and
negative coefficient parts:

```text
Delta(c)=R(c)+sum_(j=0)^r A_j(q,u)c^(2j)
                   -sum_(j=0)^(r-1) N_j(q,u)c^(2j+1),       (1)
```

where `R` is coefficientwise nonnegative and contains all unused positive
terms, while every `A_j,N_j` is coefficientwise nonnegative.  Put

```text
x=(1,c,c^2,...,c^r)^T
```

and form the symmetric tridiagonal matrix

```text
Q=
[ A_0    -N_0/2                         ]
[ -N_0/2  A_1    -N_1/2                ]
[          ...      ...       ...       ]
[                 -N_(r-1)/2  A_r       ].          (2)
```

Then the identity

```text
Delta(c)=R(c)+x^TQx                                (3)
```

is immediate.  Consequently positive semidefiniteness of `Q(q,u)` for
`q,u>=0` proves `Delta(c)>=0` for every `c>=0`; positive definiteness in the
interior gives the noncollision condition required by the endpoint
homotopy.

For a tridiagonal matrix, Sylvester's criterion reduces this to the scalar
continuant recurrence

```text
K_(-1)=1,
K_0=A_0,
K_j=A_j K_(j-1)-(N_(j-1)^2/4)K_(j-2).              (4)
```

Thus an exact sufficient all-order target is:

> Choose the even blocks `A_j` (or coefficientwise-positive sub-blocks of
> them) so that every cleared continuant `4^j K_j` has nonnegative
> coefficients in `(q,u)`, with a strictly positive constant/interior
> certificate.

This is a tridiagonal sum-of-nonnegative-circuits certificate.  It handles
overlapping negative odd blocks without spending the same even block twice.
Independent pairwise AM--GM inequalities do not do that.

## Relation to the closed layers

Layer nine has one negative odd block and (2) is `2 by 2`; its determinant
is exactly the proved margin `4D_4D_6-N_5^2` after clearing the factor four.
Layer ten is the same `2 by 2` situation with
`4D_6D_8-N_7^2`.

At layer eleven, `Disc(F+cG)` has negative coefficient parts in the `c^5`
and `c^7` blocks.  Taking the tail diagonal `D_4,D_6,D_8` gives the exact
three-by-three targets

```text
4D_4D_6-N_5^2,
4D_4D_6D_8-D_4N_7^2-D_8N_5^2.                     (5)
```

Both are coefficientwise strictly positive in the exact symbolic replay:
they contain respectively 2,057 and 4,525 positive coefficients and no
zero or negative displayed coefficient.  The unused positive portions of
the odd blocks remain in `R`.  Hence (3)--(5) also prove the layer-eleven
`F+cG` discriminant positive.  Its `E+cF` discriminant is already
coefficientwise positive (5,265 terms).  With the same endpoint homotopy,
both pencils are therefore negative-rooted for all `N=27+q` and
`c,q,u>=0`.

## Status

Equations (1)--(4) are an all-order reduction, but coefficientwise
positivity of the continuants has not been proved for arbitrary layer.
The exact layer-eleven computation is a theorem for that layer, not evidence
for every order.  Starting at higher layers, several negative odd blocks are
expected, making the continuant formulation the appropriate uniform target.

