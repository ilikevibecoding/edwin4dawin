# A diagonal moving-root crossing closes the signed selector

The codimension-two positive compatibility obtained from Sections 79 and
81 is already enough to close the selector theorem.  The missing signed
diagonal pencil and the stronger root chain (62.4) are not needed.

Put

```text
d=floor(s/2),
G_0=G_(N,s),       G_1=G_(N-1,s),       G_2=G_(N-2,s),
Gamma(t)=G_0(t)-2tG_1(t)+t^2G_2(t).                 (1)
```

Throughout the forest cone `N>=2s+5`, all three `G_j` have degree `d`,
strictly positive leading and constant coefficients, and `d` simple
negative roots.

## 1. The three unsigned rows have a common strict interlacer

Section 75 gives strict positive compatibility for the two adjacent pairs

```text
(G_0,G_1),       (G_1,G_2).                        (2)
```

Here strictness follows from the strict mixed-slice interlacers before the
palindromic gamma substitution.  Every positive pairwise pencil is simple
and negative-rooted.

For the remaining pair, set `n=2N-1`.  The forest inequality is exactly

```text
n>=4s+9.                                           (3)
```

Section 81 proves

```text
B_(n,s) prec B_(n-4,s).                            (4)
```

The direction through the endpoint propagation is important.  Normalize
all constant coefficients to one and put

```text
P=B_(n,s),       Q=B_(n-4,s),
P^vee=R_(n,s),  Q^vee=R_(n-4,s),
X=P box_s P^vee,       Y=Q box_s Q^vee,
K=Q box_s P^vee,       K*=P box_s Q^vee.           (5)
```

Thus `X` and `Y` are the two diagonal slices evaluated at `-x`, up to
positive constants, while `K,K*` are the reciprocal mixed slices.  Section
81 fixes the direction as `P prec Q`.  Fixed-factor convolution preserves
that direction, so

```text
X prec K,       K* prec Y.                         (6)
```

The diagonal polynomials are self-reciprocal and `K*` is the normalized
reciprocal of `K`.  If the positive roots of the first relation are

```text
x_1<k_1<x_2<k_2<...<x_s<k_s,
```

reciprocal reversal reads

```text
k*_1<x_1<k*_2<x_2<...<k*_s<x_s.
```

Hence `K* prec X`.  Reversing the second relation in (6) similarly gives
`Y prec K`.  The full direction-explicit bracket is therefore

```text
K* prec X prec K,       K* prec Y prec K.          (7)
```

In particular, for every `1<=i<s`, the same root `k_i` lies in both open
gaps

```text
(x_i,x_(i+1)) and (y_i,y_(i+1)).                   (8)
```

Thus `k_1,...,k_(s-1)`, not an unoriented same-degree alternation claim, is
an explicit strict common degree-`s-1` interlacer of the two diagonal
slices.  Therefore every positive combination of `X,Y` has `s` simple
positive roots.  After `x=-z` it is a palindromic polynomial with simple
negative roots.  Reciprocal pairing in

```text
A(z)=(1+z)^s H(z/(1+z)^2)
```

then makes `H` simple and negative-rooted as well (for odd `s`, the
unpaired simple root `z=-1` is the displayed factor).  Consequently

```text
G_0+cG_2
```

is simple and negative-rooted for every `c>0`.  This is the strict
codimension-two positive compatibility asserted conditionally in Section
79 and now supplied by (4).  Notice that no simultaneous signed diagonal
comparison is used here.

Thus all three pairs in `{G_0,G_1,G_2}` are strictly positively compatible.
For completeness, the standard common-interlacer implication is especially
simple in this three-polynomial setting.  For each root gap index, strict
pairwise compatibility says that the corresponding three open gap
intervals intersect pairwise.  Intervals on the real line have Helly number
two, so their total intersection is nonempty.  Choosing one point in every
total intersection produces a degree-`d-1` strict common interlacer.

It follows that every nonzero nonnegative linear combination of the three
polynomials is real-rooted.  If all three weights are positive, the common
interlacer signs put one zero in every required open interval; degree count
then makes all of those zeros simple.  Since all coefficients are positive,
all zeros are strictly negative.

There is also a closure argument which removes any dependence on a strict
version of the finite-convolution preserver.  Ordinary pairwise positive
compatibility gives a possibly non-strict common interlacer.  Perturb the
three negative root sets by arbitrarily small amounts so that the common gap
inequalities are strict; this is possible directly from their common closed
gap intervals.  Apply the argument below to each perturbed triple and let the
perturbation tend to zero.  The associated selector polynomials retain degree
`d+2`, have uniformly bounded roots because the limiting leading coefficient
is positive, and their `d` negative roots cannot converge to zero because the
limiting selector has constant term `G_0(0)>0`.  Thus the unperturbed selector
still has `d` negative roots counted with multiplicity.  The two distinct
positive roots in Section 3 then exhaust its degree.  Consequently strictness
is convenient for the branch labeling and the finite replay, but is not a
hidden hypothesis of the selector conclusion.

## 2. Move the compatible pencil until each root crosses the diagonal

For `u>=0`, define

```text
Q_u(t)=G_0(t)+2uG_1(t)+u^2G_2(t).                  (9)
```

At `u=0`, this is `G_0`.  For `u>0`, the preceding common strict interlacer
shows that `Q_u` has `d` simple negative roots.  Write them continuously in
increasing order as

```text
lambda_1(u)<...<lambda_d(u)<0.                     (10)
```

The roots are continuous because the coefficients of (9) are continuous
and no collision occurs.  Moreover,

```text
u^(-2)Q_u(t)
 =G_2(t)+2u^(-1)G_1(t)+u^(-2)G_0(t) -> G_2(t)     (11)
```

coefficientwise as `u` tends to infinity.  The degree and limiting leading
coefficient do not drop.  Hence the ordered roots in (10) converge to the
ordered simple roots of `G_2`; in particular, every `lambda_i(u)` is bounded
for large `u`.

Now set

```text
f_i(u)=lambda_i(u)+u.                              (12)
```

At zero, `f_i(0)=lambda_i(0)<0`.  By boundedness in (11), `f_i(u)>0` for all
sufficiently large `u`.  The intermediate value theorem therefore gives a
number `u_i>0` with

```text
lambda_i(u_i)=-u_i.                                (13)
```

The `u_i` are distinct: equality `u_i=u_j` for `i!=j` would make the simple
polynomial `Q_(u_i)` have the repeated root `-u_i`.

Finally, direct substitution in (1) and (9) gives

```text
Gamma(-u)=Q_u(-u).                                 (14)
```

Equations (13)--(14) therefore produce the `d` distinct negative roots

```text
-u_1,...,-u_d
```

of the selector polynomial `Gamma`.

## 3. The two positive roots and degree exhaustion

Section 80 proves the strict unsigned Turan inequality

```text
G_1(t)^2-G_0(t)G_2(t)>0,       t>0.                (15)
```

The fixed-point argument of Section 67 now applies without any remaining
hypothesis.  The ratio `G_1/G_2` has a fixed point `t_*>1`, and at that point

```text
Gamma(t_*)
 =G_0(t_*)-G_1(t_*)^2/G_2(t_*)<0.                 (16)
```

Section 63 gives `Gamma(1)>0`, while the leading coefficient of `Gamma` is
the positive leading coefficient of `G_2`.  Hence `Gamma` has one root in
`(1,t_*)` and another in `(t_*,infinity)`.

The term `t^2G_2` makes

```text
deg Gamma=d+2.                                     (17)
```

The `d` distinct negative roots from Section 2 and the two distinct roots
greater than one from (16) exhaust this degree.  Thus the signed selector
has exactly two roots in `(1,infinity)` and all its other roots are negative,
counted with multiplicity, in every forest parameter.  They are simple when
the strict-preservation form used in Sections 1--2 is invoked; simplicity is
not needed downstream.

This completes the selector obligation from Section 62.  It does not prove,
and does not require, the stronger signed diagonal pencils
`G_0-cG_2` or the componentwise codimension-two cross-gap.

## 4. The layers `s=0,1`

The moving-root proof starts at `s=2`, where `d>=1`.  The two lower layers
are direct.

For `s=0`, every `G_(M,0)=1`, so

```text
Gamma_(N,0)(t)=(1-t)^2.                            (18)
```

There are no negative roots and the two roots in `[1,infinity)` coincide at
the allowed endpoint `1`.

For `s=1`, one has `G_(M,1)=2M-2`, and therefore

```text
Gamma_(N,1)(t)
 =2{(N-1)-2(N-2)t+(N-3)t^2}
 =2(N-3)(t-1)(t-(N-1)/(N-3)).                     (19)
```

Again there are no required negative roots; the two positive roots are `1`
and `(N-1)/(N-3)>1`.

## 5. Exact replay

`prove_selector_diagonal_crossing.py` checks 104 direction-explicit endpoint
comparisons, 26 reciprocal mixed-slice identities, 26 same-mixed-root gap
interlacers, exact triple common-interlacer gaps, the identity (14), 78
representative simple negative pencils (9), both boundary layers, and the
full selector root count on 26 exact forest cases through `s=14`.  It writes
`selector_diagonal_crossing_exact_20260810.json` and reports

```text
PASS_EXACT_SELECTOR_DIAGONAL_CROSSING_REPLAY.
```

The finite replay is transcription evidence.  The all-order proof is the
strict common-interlacer argument, coefficientwise limit (11), and the
crossing identity (14), combined with Sections 63, 67, 75, 79, 80, and 81.
