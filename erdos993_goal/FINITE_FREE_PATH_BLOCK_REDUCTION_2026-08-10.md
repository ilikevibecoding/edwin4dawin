# Finite-free reduction of the codimension-two path bridge

This note records an exact reduction found while attacking the separator
inequality (76.6).  It does **not** prove (76.6): the vertical polynomial
`z F_(n,m,s-1)` is no longer singled out.  Instead it reduces the weaker but
central conclusion needed from (76.6), namely codimension-two positive
compatibility, to one explicit hypergeometric interlacing lemma independent of
the second path.

Put

```text
q_(n,i)=binom(n-i,i),
F_(n,m,s)(z)=sum_(i=0)^s q_(n,i)q_(m,s-i)z^i.
```

For a degree-`s` polynomial written as

```text
p(x)=sum_i (-1)^i binom(s,i) p_i x^i,
```

write `p box_s r` for the normalized finite multiplicative convolution with
coefficient `(-1)^i binom(s,i)p_i r_i`.  Define the path block

```text
B_(n,s)(x)
 =sum_(i=0)^s (-1)^i s!/(s-i)! binom(n-i,i)(x/4)^i.       (1)
```

Its reciprocal, normalized to constant coefficient one, is

```text
R_(n,s)(y)
 = _2F_2(-s,n-s+1;
          (n-2s+1)/2,(n-2s+2)/2; y).                    (2)
```

Equivalently, if `a=(n-2s+1)/2`, then

```text
R_(n,s)(y)=_2F_2(-s,s+2a; a,a+1/2; y).                 (3)
```

Coefficient comparison gives the exact factorization

```text
F_(n,m,s)(-x)/q_(m,s) = B_(n,s) box_s R_(m,s).          (4)
```

There is also a classical-block factorization

```text
R_(n,s)
 = _1F_1(-s;a;x) box_s
   _2F_1(-s,s+2a;a+1/2;x).                             (5)
```

The factors in (5) are respectively a Laguerre polynomial and a symmetric
Jacobi (Gegenbauer) polynomial.  In the forest reserve `n>=4s+9`, `a>=s+5`,
so both lie strictly inside their positive-rooted classical ranges.

## Conditional all-order theorem

Assume the following one-parameter block lemma:

```text
B_(n,s) and B_(n-4,s) strictly alternate
for every s>=2 and n>=4s+9.                            (6)
```

Finite multiplicative convolution preserves real-rootedness and interlacing
when the convolving polynomial has roots of one sign.  Applying this to (4)
shows, for every admissible second path `m`, that

```text
F_(n,m,s) and F_(n-4,m,s) are positively compatible.  (7)
```

Taking first `m=n` and then `m=n-4` proves that the direct codimension-two
mixed slice is compatible with both diagonal endpoint slices.  Thus (6)
supplies the positive-compatibility conclusion sought in Sections 75--76
without proving the stronger separator inequality (76.6).

This distinction matters.  Positive compatibility does not choose the
oriented alternating order required by the final unsigned nested root chain;
the separate orientation data/reduction remains necessary.

## Exact status of the block lemma

The block lemma is considerably smaller than (76.6): it is independent of
`m`, and (2)--(5) expose only classical Laguerre and Gegenbauer factors.  The
shift `n -> n-4` is exactly `a -> a-2` in (3), so the remaining analytic task is

```text
_2F_2(-s,s+2a;a,a+1/2;x)
    versus
_2F_2(-s,s+2a-4;a-2,a-3/2;x),   a>=s+5.              (8)
```

Individual Laguerre and Jacobi parameter-shift interlacings do not by
themselves prove (8): chaining two same-orientation interlacings loses the
cross-gap inequality, exactly as in the original codimension-two problem.
That transitivity gap must not be hidden.

There is also a concrete random-matrix model which may be the most useful
route to (6).  For odd `n=2M-1`, let

```text
C_(M-1)=tridiag(1,2,1),
```

so `q_n(v)=det(I+v C_(M-1))`.  If `X` is an `s` by `(M-1)` standard real
Gaussian matrix, Cauchy--Binet and the Gaussian determinant moment give

```text
B_(n,s)(x)
 = E det(I_s-(x/4) X C_(M-1) X^T).                 (9)
```

Indeed, the expected `i`th elementary symmetric function of
`X C X^T` is

```text
binom(s,i) i! e_i(C)=s!/(s-i)! e_i(C).
```

Thus the remaining block lemma is a precise expected-characteristic-polynomial
interlacing statement for the codimension-two principal compression
`C_(M-3) subset C_(M-1)`.  Ordinary Cauchy interlacing gives only
two-interlacing before the Gaussian/Laguerre transform; the forest reserve is
exactly the extra room in which that transform empirically upgrades it to
ordinary interlacing.

Exact rational root isolation verifies (6) for all `2<=s<=12` and forest
excess `0,1,5,17` (44 cases).  Independent high-precision exploration also
found strict alternation through `s=30` and excess `0,1,5,20,100,1000`, but
that larger computation is evidence only and is not part of the exact replay.

The replay `prove_finite_free_path_block_reduction.py` checks (2), (4), and
(5) coefficientwise over the rationals, certifies the 44 block interlacings by
disjoint rational isolating intervals, and certifies the 88 induced mixed-slice
interlacings for `m=n,n-4`.  It writes
`finite_free_path_block_exact_20260810.json`.
